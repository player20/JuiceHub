/**
 * E2E Test: OCPP Message Flow
 *
 * Tests the complete OCPP 2.0.1 message flow for a charging session.
 *
 * Steps:
 * 1. BootNotification - Charger connects to CitrineOS
 * 2. StatusNotification - Charger reports availability
 * 3. Authorize - User authorization
 * 4. TransactionEvent (Started) - Start charging session
 * 5. MeterValues - Real-time power/energy data
 * 6. TransactionEvent (Updated) - Session progress
 * 7. TransactionEvent (Ended) - Complete charging session
 * 8. Verify data persisted to database
 */

import WebSocket from 'ws';
import { Pool } from 'pg';

describe('OCPP Message Flow E2E', () => {
  let ws: WebSocket;
  let db: Pool;
  const stationId = `TEST-STATION-${Date.now()}`;
  const ocppServerUrl = process.env.OCPP_SERVER_URL || 'ws://localhost:8081';
  const dbConnectionString = process.env.DATABASE_URL || 'postgresql://citrine:citrine@localhost:5432/citrine';

  beforeAll(async () => {
    // Setup database connection
    db = new Pool({ connectionString: dbConnectionString });

    // Wait for database to be ready
    await db.query('SELECT 1');
  });

  afterAll(async () => {
    await db.end();
  });

  beforeEach(() => {
    // Reset connection before each test
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  afterEach(() => {
    if (ws) {
      ws.close();
    }
  });

  test('Complete OCPP 2.0.1 charging session flow', async () => {
    // Step 1: Connect and send BootNotification
    const bootNotificationResponse = await sendOCPPMessage({
      action: 'BootNotification',
      payload: {
        chargingStation: {
          model: 'ChargePoint Home Flex',
          vendorName: 'ChargePoint',
          serialNumber: `CP-HF-${Date.now()}`,
          firmwareVersion: '1.2.3',
        },
        reason: 'PowerUp',
      },
    });

    expect(bootNotificationResponse).toBeDefined();
    expect(bootNotificationResponse.status).toBe('Accepted');
    expect(bootNotificationResponse.interval).toBeGreaterThan(0);

    // Wait for boot notification to be persisted
    await waitFor(1000);

    // Verify boot notification in database
    const bootResult = await db.query(
      'SELECT * FROM "Boot" WHERE "stationId" = $1 ORDER BY "createdAt" DESC LIMIT 1',
      [stationId]
    );
    expect(bootResult.rows.length).toBe(1);
    expect(bootResult.rows[0].status).toBe('Accepted');

    // Step 2: Send StatusNotification (Available)
    const statusResponse = await sendOCPPMessage({
      action: 'StatusNotification',
      payload: {
        timestamp: new Date().toISOString(),
        connectorStatus: 'Available',
        evseId: 1,
        connectorId: 1,
      },
    });

    expect(statusResponse).toBeDefined();

    // Verify status in database
    const statusResult = await db.query(
      'SELECT * FROM "StatusNotification" WHERE "stationId" = $1 AND "evseId" = 1 ORDER BY "createdAt" DESC LIMIT 1',
      [stationId]
    );
    expect(statusResult.rows.length).toBe(1);
    expect(statusResult.rows[0].connectorStatus).toBe('Available');

    // Step 3: Authorize
    const authorizeResponse = await sendOCPPMessage({
      action: 'Authorize',
      payload: {
        idToken: {
          idToken: 'GUEST-001',
          type: 'ISO14443',
        },
      },
    });

    expect(authorizeResponse).toBeDefined();
    expect(authorizeResponse.idTokenInfo.status).toBe('Accepted');

    // Step 4: Start Transaction (TransactionEvent Started)
    const transactionId = `TXN-${Date.now()}`;
    const startResponse = await sendOCPPMessage({
      action: 'TransactionEvent',
      payload: {
        eventType: 'Started',
        timestamp: new Date().toISOString(),
        triggerReason: 'Authorized',
        seqNo: 0,
        transactionInfo: {
          transactionId: transactionId,
        },
        evse: {
          id: 1,
          connectorId: 1,
        },
        idToken: {
          idToken: 'GUEST-001',
          type: 'ISO14443',
        },
        meterValue: [
          {
            timestamp: new Date().toISOString(),
            sampledValue: [
              {
                value: 0,
                context: 'Transaction.Begin',
                measurand: 'Energy.Active.Import.Register',
                unitOfMeasure: { unit: 'Wh' },
              },
            ],
          },
        ],
      },
    });

    expect(startResponse).toBeDefined();

    // Verify transaction started in database
    await waitFor(1000);
    const txnResult = await db.query(
      'SELECT * FROM "Transaction" WHERE "transactionId" = $1',
      [transactionId]
    );
    expect(txnResult.rows.length).toBe(1);
    expect(txnResult.rows[0].isActive).toBe(true);

    // Step 5: Send MeterValues (simulating 5 minutes of charging)
    const meterValuesSequence = [
      { time: 1, power: 7400, energy: 123, voltage: 240, current: 30.8 },
      { time: 2, power: 7400, energy: 246, voltage: 240, current: 30.8 },
      { time: 3, power: 7350, energy: 369, voltage: 239, current: 30.7 },
      { time: 4, power: 7400, energy: 492, voltage: 240, current: 30.8 },
      { time: 5, power: 7400, energy: 616, voltage: 240, current: 30.8 },
    ];

    for (const sample of meterValuesSequence) {
      const meterResponse = await sendOCPPMessage({
        action: 'MeterValues',
        payload: {
          evseId: 1,
          meterValue: [
            {
              timestamp: new Date(Date.now() + sample.time * 60000).toISOString(),
              sampledValue: [
                {
                  value: sample.power,
                  context: 'Sample.Periodic',
                  measurand: 'Power.Active.Import',
                  unitOfMeasure: { unit: 'W' },
                },
                {
                  value: sample.energy,
                  context: 'Sample.Periodic',
                  measurand: 'Energy.Active.Import.Register',
                  unitOfMeasure: { unit: 'Wh' },
                },
                {
                  value: sample.voltage,
                  context: 'Sample.Periodic',
                  measurand: 'Voltage',
                  unitOfMeasure: { unit: 'V' },
                },
                {
                  value: sample.current,
                  context: 'Sample.Periodic',
                  measurand: 'Current.Import',
                  unitOfMeasure: { unit: 'A' },
                },
              ],
            },
          ],
        },
      });

      expect(meterResponse).toBeDefined();
      await waitFor(500); // Small delay between meter values
    }

    // Verify meter values in database
    const meterResult = await db.query(
      'SELECT * FROM "MeterValue" WHERE "transactionId" = $1',
      [transactionId]
    );
    expect(meterResult.rows.length).toBeGreaterThan(0);

    // Step 6: TransactionEvent Updated (optional, showing charging progress)
    const updateResponse = await sendOCPPMessage({
      action: 'TransactionEvent',
      payload: {
        eventType: 'Updated',
        timestamp: new Date().toISOString(),
        triggerReason: 'MeterValuePeriodic',
        seqNo: 5,
        transactionInfo: {
          transactionId: transactionId,
        },
        evse: {
          id: 1,
          connectorId: 1,
        },
        meterValue: [
          {
            timestamp: new Date().toISOString(),
            sampledValue: [
              {
                value: 616,
                context: 'Sample.Periodic',
                measurand: 'Energy.Active.Import.Register',
                unitOfMeasure: { unit: 'Wh' },
              },
            ],
          },
        ],
      },
    });

    expect(updateResponse).toBeDefined();

    // Step 7: End Transaction (TransactionEvent Ended)
    const stopResponse = await sendOCPPMessage({
      action: 'TransactionEvent',
      payload: {
        eventType: 'Ended',
        timestamp: new Date().toISOString(),
        triggerReason: 'StopAuthorized',
        seqNo: 6,
        transactionInfo: {
          transactionId: transactionId,
          stoppedReason: 'Local',
        },
        evse: {
          id: 1,
          connectorId: 1,
        },
        idToken: {
          idToken: 'GUEST-001',
          type: 'ISO14443',
        },
        meterValue: [
          {
            timestamp: new Date().toISOString(),
            sampledValue: [
              {
                value: 616,
                context: 'Transaction.End',
                measurand: 'Energy.Active.Import.Register',
                unitOfMeasure: { unit: 'Wh' },
              },
            ],
          },
        ],
      },
    });

    expect(stopResponse).toBeDefined();

    // Step 8: Verify transaction ended in database
    await waitFor(2000);
    const finalTxnResult = await db.query(
      'SELECT * FROM "Transaction" WHERE "transactionId" = $1',
      [transactionId]
    );
    expect(finalTxnResult.rows.length).toBe(1);
    expect(finalTxnResult.rows[0].isActive).toBe(false);

    // Verify JuiceNet extension calculations (if enabled)
    const calcResult = await db.query(
      'SELECT * FROM "ChargingSessionMetrics" WHERE "transactionId" = $1',
      [transactionId]
    );

    if (calcResult.rows.length > 0) {
      const metrics = calcResult.rows[0];
      expect(metrics.totalEnergyKwh).toBeCloseTo(0.616, 3); // 616 Wh = 0.616 kWh
      expect(metrics.averagePowerKw).toBeCloseTo(7.4, 1);
      expect(metrics.durationMinutes).toBeGreaterThanOrEqual(5);

      // Verify cost calculation (assuming $0.32/kWh)
      if (metrics.costTotal) {
        expect(metrics.costTotal).toBeGreaterThan(0);
        expect(metrics.costTotal).toBeCloseTo(0.616 * 0.32, 2);
      }

      // Verify miles added calculation (assuming 3 miles/kWh)
      if (metrics.milesAdded) {
        expect(metrics.milesAdded).toBeCloseTo(0.616 * 3, 1);
      }

      // Verify CO2 saved calculation
      if (metrics.co2SavedKg) {
        expect(metrics.co2SavedKg).toBeGreaterThan(0);
      }
    }

    // Send final StatusNotification (Available again)
    await sendOCPPMessage({
      action: 'StatusNotification',
      payload: {
        timestamp: new Date().toISOString(),
        connectorStatus: 'Available',
        evseId: 1,
        connectorId: 1,
      },
    });
  });

  test('OCPP error handling - Invalid message', async () => {
    // Try to send invalid OCPP message
    await expect(async () => {
      await sendOCPPMessage({
        action: 'TransactionEvent',
        payload: {
          // Missing required fields
          eventType: 'Started',
        },
      });
    }).rejects.toThrow();
  });

  test('OCPP authorization failure', async () => {
    // Connect and boot
    await sendOCPPMessage({
      action: 'BootNotification',
      payload: {
        chargingStation: {
          model: 'Test Charger',
          vendorName: 'Test',
          serialNumber: `TEST-${Date.now()}`,
        },
        reason: 'PowerUp',
      },
    });

    // Try to authorize with invalid token
    const authorizeResponse = await sendOCPPMessage({
      action: 'Authorize',
      payload: {
        idToken: {
          idToken: 'INVALID-TOKEN',
          type: 'ISO14443',
        },
      },
    });

    expect(authorizeResponse).toBeDefined();
    expect(authorizeResponse.idTokenInfo.status).not.toBe('Accepted');
  });

  // Helper Functions

  async function sendOCPPMessage(message: { action: string; payload: any }): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        // Create new WebSocket connection
        ws = new WebSocket(`${ocppServerUrl}/${stationId}`, ['ocpp2.0.1']);

        ws.on('open', () => {
          sendMessage();
        });

        ws.on('error', (error) => {
          reject(error);
        });
      } else {
        sendMessage();
      }

      function sendMessage() {
        const messageId = generateMessageId();
        const ocppMessage = [2, messageId, message.action, message.payload];

        ws!.send(JSON.stringify(ocppMessage));

        // Listen for response
        const responseHandler = (data: WebSocket.Data) => {
          try {
            const response = JSON.parse(data.toString());

            // OCPP response format: [3, messageId, payload]
            if (response[0] === 3 && response[1] === messageId) {
              ws!.off('message', responseHandler);
              resolve(response[2]); // Return payload
            }
          } catch (error) {
            reject(error);
          }
        };

        ws!.on('message', responseHandler);

        // Timeout after 10 seconds
        setTimeout(() => {
          ws!.off('message', responseHandler);
          reject(new Error('OCPP message timeout'));
        }, 10000);
      }
    });
  }

  function generateMessageId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  function waitFor(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
});
