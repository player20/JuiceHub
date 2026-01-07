// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { ILogObj, Logger } from 'tslog';
import { DataSource } from 'typeorm';

/**
 * Transaction Reconciliation Service
 *
 * Purpose: Automatically detect and fix transaction sync issues between chargers and server.
 * Runs every 5 minutes to ensure data integrity without manual intervention.
 *
 * Handles:
 * 1. Orphaned MeterValues (charger sent data but no transaction exists)
 * 2. Stale transactions (active for >24 hours with no activity)
 * 3. Missing StartTransaction (charger charging but no transaction record)
 * 4. Duplicate transactions (charger firmware bugs)
 *
 * Scales to 1000+ chargers with no human intervention.
 */
export class TransactionReconciliationService {
  private logger: Logger<ILogObj>;
  private dataSource: DataSource;
  private reconciliationIntervalMinutes: number = 5;
  private staleTransactionTimeoutHours: number = 24;
  private orphanedMeterValuesWindowHours: number = 2;

  constructor(dataSource: DataSource, logger: Logger<ILogObj>) {
    this.dataSource = dataSource;
    this.logger = logger;
  }

  /**
   * Start the reconciliation service (runs in background)
   */
  async start(): Promise<void> {
    this.logger.info('[TransactionReconciliation] Starting service...');

    // Run immediately on startup
    await this.reconcileAll();

    // Then run every N minutes
    setInterval(async () => {
      try {
        await this.reconcileAll();
      } catch (error) {
        this.logger.error('[TransactionReconciliation] Error during reconciliation:', error);
      }
    }, this.reconciliationIntervalMinutes * 60 * 1000);

    this.logger.info(`[TransactionReconciliation] Service started (runs every ${this.reconciliationIntervalMinutes} minutes)`);
  }

  /**
   * Main reconciliation logic - runs all checks
   */
  private async reconcileAll(): Promise<void> {
    this.logger.info('[TransactionReconciliation] Starting reconciliation cycle...');

    const startTime = Date.now();
    const results = {
      orphanedMeterValuesFixed: 0,
      staleTransactionsEnded: 0,
      missingTransactionsCreated: 0,
      duplicateTransactionsResolved: 0,
    };

    try {
      // 1. Fix orphaned MeterValues (highest priority - data loss prevention)
      results.orphanedMeterValuesFixed = await this.fixOrphanedMeterValues();

      // 2. End stale transactions (prevents blocking new sessions)
      results.staleTransactionsEnded = await this.endStaleTransactions();

      // 3. Create missing transactions (handles charger firmware bugs)
      results.missingTransactionsCreated = await this.createMissingTransactions();

      // 4. Resolve duplicate transactions (cleanup)
      results.duplicateTransactionsResolved = await this.resolveDuplicateTransactions();

      const duration = Date.now() - startTime;
      this.logger.info('[TransactionReconciliation] Reconciliation complete', {
        duration: `${duration}ms`,
        ...results,
      });

      // Alert if significant issues found
      if (results.orphanedMeterValuesFixed > 10 || results.missingTransactionsCreated > 5) {
        this.logger.warn('[TransactionReconciliation] ALERT: High number of sync issues detected', results);
        // TODO: Send notification (Slack, email, etc.)
      }
    } catch (error) {
      this.logger.error('[TransactionReconciliation] Reconciliation failed:', error);
      throw error;
    }
  }

  /**
   * Fix orphaned MeterValues by linking them to transactions
   *
   * Handles case where charger sends MeterValues with non-zero transactionId
   * but transaction doesn't exist in database (e.g., StartTransaction message lost)
   */
  private async fixOrphanedMeterValues(): Promise<number> {
    try {
      // Find MeterValues with transactionId != "0" but no transactionDatabaseId
      const orphanedMeterValues = await this.dataSource.query(`
        SELECT
          mv.id,
          mv."transactionId",
          mv."connectorId",
          mv.timestamp,
          c."stationId"
        FROM "MeterValues" mv
        JOIN "Connectors" c ON c."connectorId" = mv."connectorId"
        WHERE mv."transactionDatabaseId" IS NULL
          AND mv."transactionId" != '0'
          AND mv.timestamp > NOW() - INTERVAL '${this.orphanedMeterValuesWindowHours} hours'
        ORDER BY mv.timestamp ASC
        LIMIT 1000
      `);

      if (orphanedMeterValues.length === 0) {
        return 0;
      }

      this.logger.warn(`[TransactionReconciliation] Found ${orphanedMeterValues.length} orphaned MeterValues`);

      let fixedCount = 0;

      // Group by stationId + transactionId
      const groups = this.groupMeterValuesByTransaction(orphanedMeterValues);

      for (const [key, meterValues] of groups.entries()) {
        const [stationId, transactionId] = key.split('|');

        // Try to find existing transaction
        let transaction = await this.dataSource.query(`
          SELECT id, "isActive"
          FROM "Transactions"
          WHERE "stationId" = $1
            AND "transactionId" = $2
          LIMIT 1
        `, [stationId, transactionId]);

        // If no transaction exists, create one retroactively
        if (!transaction || transaction.length === 0) {
          this.logger.info(`[TransactionReconciliation] Creating missing transaction for ${stationId}, transactionId=${transactionId}`);

          const firstMeterValue = meterValues[0];
          const connectorId = firstMeterValue.connectorId;

          // Create transaction with timestamp from first MeterValue
          const result = await this.dataSource.query(`
            INSERT INTO "Transactions" (
              "stationId",
              "transactionId",
              "connectorId",
              "isActive",
              "startTime",
              "createdAt",
              "updatedAt",
              "authorization"
            ) VALUES (
              $1, $2, $3, true, $4, $4, NOW(),
              '{"idToken": "AutoRecovered", "type": "reconciliation"}'::jsonb
            )
            RETURNING id
          `, [stationId, transactionId, connectorId, firstMeterValue.timestamp]);

          transaction = [{ id: result[0].id, isActive: true }];
          this.logger.info(`[TransactionReconciliation] Created transaction ${transaction[0].id} for ${stationId}`);
        }

        // Link MeterValues to transaction
        const transactionDatabaseId = transaction[0].id;
        const meterValueIds = meterValues.map(mv => mv.id);

        await this.dataSource.query(`
          UPDATE "MeterValues"
          SET "transactionDatabaseId" = $1
          WHERE id = ANY($2::int[])
        `, [transactionDatabaseId, meterValueIds]);

        fixedCount += meterValueIds.length;
        this.logger.info(`[TransactionReconciliation] Linked ${meterValueIds.length} MeterValues to transaction ${transactionDatabaseId}`);
      }

      return fixedCount;
    } catch (error) {
      this.logger.error('[TransactionReconciliation] Error fixing orphaned MeterValues:', error);
      return 0;
    }
  }

  /**
   * End stale transactions that have been active for too long
   *
   * Prevents old transactions from blocking new charging sessions
   */
  private async endStaleTransactions(): Promise<number> {
    try {
      // Find active transactions with no recent MeterValues
      const staleTransactions = await this.dataSource.query(`
        SELECT
          t.id,
          t."stationId",
          t."transactionId",
          t."startTime",
          MAX(mv.timestamp) as last_meter_value
        FROM "Transactions" t
        LEFT JOIN "MeterValues" mv ON mv."transactionDatabaseId" = t.id
        WHERE t."isActive" = true
          AND t."startTime" < NOW() - INTERVAL '${this.staleTransactionTimeoutHours} hours'
        GROUP BY t.id, t."stationId", t."transactionId", t."startTime"
        HAVING MAX(mv.timestamp) IS NULL
          OR MAX(mv.timestamp) < NOW() - INTERVAL '${this.staleTransactionTimeoutHours} hours'
      `);

      if (staleTransactions.length === 0) {
        return 0;
      }

      this.logger.warn(`[TransactionReconciliation] Found ${staleTransactions.length} stale transactions`);

      for (const transaction of staleTransactions) {
        this.logger.info(`[TransactionReconciliation] Ending stale transaction ${transaction.id} (${transaction.stationId}, transactionId=${transaction.transactionId})`);

        await this.dataSource.query(`
          UPDATE "Transactions"
          SET
            "isActive" = false,
            "endTime" = NOW(),
            "endReason" = 'Auto-ended by reconciliation service (no activity for ${this.staleTransactionTimeoutHours}h)',
            "updatedAt" = NOW()
          WHERE id = $1
        `, [transaction.id]);
      }

      return staleTransactions.length;
    } catch (error) {
      this.logger.error('[TransactionReconciliation] Error ending stale transactions:', error);
      return 0;
    }
  }

  /**
   * Create missing transactions for active charging sessions
   *
   * Handles case where charger is charging but never sent StartTransaction
   * (firmware bug where charger goes directly from Available → Charging)
   */
  private async createMissingTransactions(): Promise<number> {
    try {
      // Find MeterValues from last hour with transactionId="0" (orphaned)
      // grouped by connector - indicates charging session without transaction
      const orphanedSessions = await this.dataSource.query(`
        SELECT
          c."stationId",
          mv."connectorId",
          MIN(mv.timestamp) as first_meter_value,
          MAX(mv.timestamp) as last_meter_value,
          COUNT(*) as meter_value_count
        FROM "MeterValues" mv
        JOIN "Connectors" c ON c."connectorId" = mv."connectorId"
        WHERE mv."transactionId" = '0'
          AND mv.timestamp > NOW() - INTERVAL '1 hour'
          AND mv."transactionDatabaseId" IS NULL
        GROUP BY c."stationId", mv."connectorId"
        HAVING COUNT(*) >= 3  -- At least 3 MeterValues to confirm it's a real session
      `);

      if (orphanedSessions.length === 0) {
        return 0;
      }

      this.logger.warn(`[TransactionReconciliation] Found ${orphanedSessions.length} active sessions without transactions`);

      let createdCount = 0;

      for (const session of orphanedSessions) {
        // Check if there's already an active transaction for this connector
        const existingTransaction = await this.dataSource.query(`
          SELECT id
          FROM "Transactions"
          WHERE "stationId" = $1
            AND "connectorId" = $2
            AND "isActive" = true
          LIMIT 1
        `, [session.stationId, session.connectorId]);

        if (existingTransaction && existingTransaction.length > 0) {
          // Transaction exists, just need to link MeterValues
          continue;
        }

        // Create new transaction
        this.logger.info(`[TransactionReconciliation] Creating transaction for orphaned session: ${session.stationId}, connector ${session.connectorId}`);

        const result = await this.dataSource.query(`
          INSERT INTO "Transactions" (
            "stationId",
            "transactionId",
            "connectorId",
            "isActive",
            "startTime",
            "createdAt",
            "updatedAt",
            "authorization"
          )
          SELECT
            $1,
            COALESCE(MAX(CAST("transactionId" AS INTEGER)) + 1, 1)::text,
            $2,
            true,
            $3,
            $3,
            NOW(),
            '{"idToken": "AutoRecovered", "type": "reconciliation_missing_start"}'::jsonb
          FROM "Transactions"
          WHERE "stationId" = $1
          RETURNING id, "transactionId"
        `, [session.stationId, session.connectorId, session.first_meter_value]);

        const newTransaction = result[0];
        this.logger.info(`[TransactionReconciliation] Created transaction ${newTransaction.id} with transactionId=${newTransaction.transactionId}`);

        // Note: MeterValues with transactionId="0" will remain orphaned
        // They can't be linked because they don't have the correct transactionId
        // This is expected - we're creating the transaction for FUTURE MeterValues

        createdCount++;
      }

      return createdCount;
    } catch (error) {
      this.logger.error('[TransactionReconciliation] Error creating missing transactions:', error);
      return 0;
    }
  }

  /**
   * Resolve duplicate transactions for the same connector
   *
   * Handles charger firmware bugs that send multiple StartTransaction messages
   */
  private async resolveDuplicateTransactions(): Promise<number> {
    try {
      // Find connectors with multiple active transactions
      const duplicates = await this.dataSource.query(`
        SELECT
          "stationId",
          "connectorId",
          COUNT(*) as active_count,
          ARRAY_AGG(id ORDER BY "startTime" ASC) as transaction_ids
        FROM "Transactions"
        WHERE "isActive" = true
        GROUP BY "stationId", "connectorId"
        HAVING COUNT(*) > 1
      `);

      if (duplicates.length === 0) {
        return 0;
      }

      this.logger.warn(`[TransactionReconciliation] Found ${duplicates.length} connectors with duplicate active transactions`);

      let resolvedCount = 0;

      for (const duplicate of duplicates) {
        const transactionIds = duplicate.transaction_ids;

        // Keep the most recent transaction, end the others
        const toKeep = transactionIds[transactionIds.length - 1];
        const toEnd = transactionIds.slice(0, -1);

        this.logger.info(`[TransactionReconciliation] Resolving duplicates for ${duplicate.stationId} connector ${duplicate.connectorId}: keeping ${toKeep}, ending [${toEnd.join(', ')}]`);

        await this.dataSource.query(`
          UPDATE "Transactions"
          SET
            "isActive" = false,
            "endTime" = NOW(),
            "endReason" = 'Auto-ended by reconciliation service (duplicate transaction)',
            "updatedAt" = NOW()
          WHERE id = ANY($1::int[])
        `, [toEnd]);

        resolvedCount += toEnd.length;
      }

      return resolvedCount;
    } catch (error) {
      this.logger.error('[TransactionReconciliation] Error resolving duplicate transactions:', error);
      return 0;
    }
  }

  /**
   * Helper: Group MeterValues by stationId + transactionId
   */
  private groupMeterValuesByTransaction(meterValues: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>();

    for (const mv of meterValues) {
      const key = `${mv.stationId}|${mv.transactionId}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(mv);
    }

    return groups;
  }

  /**
   * Get service statistics (for monitoring dashboard)
   */
  async getStatistics(): Promise<{
    orphanedMeterValuesCount: number;
    staleTransactionsCount: number;
    activeTransactionsCount: number;
    lastReconciliationTime: Date;
  }> {
    const orphanedCount = await this.dataSource.query(`
      SELECT COUNT(*) as count
      FROM "MeterValues"
      WHERE "transactionDatabaseId" IS NULL
        AND "transactionId" != '0'
        AND timestamp > NOW() - INTERVAL '${this.orphanedMeterValuesWindowHours} hours'
    `);

    const staleCount = await this.dataSource.query(`
      SELECT COUNT(*) as count
      FROM "Transactions" t
      LEFT JOIN "MeterValues" mv ON mv."transactionDatabaseId" = t.id
      WHERE t."isActive" = true
        AND t."startTime" < NOW() - INTERVAL '${this.staleTransactionTimeoutHours} hours'
      GROUP BY t.id
      HAVING MAX(mv.timestamp) IS NULL
        OR MAX(mv.timestamp) < NOW() - INTERVAL '${this.staleTransactionTimeoutHours} hours'
    `);

    const activeCount = await this.dataSource.query(`
      SELECT COUNT(*) as count
      FROM "Transactions"
      WHERE "isActive" = true
    `);

    return {
      orphanedMeterValuesCount: orphanedCount[0]?.count || 0,
      staleTransactionsCount: staleCount.length || 0,
      activeTransactionsCount: activeCount[0]?.count || 0,
      lastReconciliationTime: new Date(),
    };
  }
}
