/**
 * Export Service - Data Export Utilities
 *
 * Provides functionality to export data to various formats (CSV, JSON)
 * No external API keys required
 *
 * Usage:
 *   const exportService = new ExportService();
 *   const csv = exportService.toCSV(data, ['column1', 'column2']);
 *   await exportService.saveToFile(csv, 'export.csv');
 */

import { ILogger } from '@citrineos/base';
import { createObjectCsvStringifier } from 'csv-writer';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ExportOptions {
  filename?: string;
  columns?: string[];
  headers?: Record<string, string>; // column key -> display name mapping
  delimiter?: string;
  includeHeaders?: boolean;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  content?: string;
  error?: string;
  rowCount?: number;
}

export class ExportService {
  private readonly logger: ILogger;
  private readonly exportDir: string;

  constructor(logger: ILogger, exportDir: string = './exports') {
    this.logger = logger;
    this.exportDir = exportDir;
  }

  /**
   * Export data to CSV format
   *
   * @param data Array of objects to export
   * @param options Export configuration
   * @returns CSV string
   */
  public toCSV(data: any[], options: ExportOptions = {}): string {
    if (!data || data.length === 0) {
      this.logger.warn('Attempted to export empty dataset to CSV');
      return '';
    }

    try {
      const columns = options.columns || Object.keys(data[0]);
      const delimiter = options.delimiter || ',';
      const includeHeaders = options.includeHeaders !== false;

      // Build header row
      let csv = '';
      if (includeHeaders) {
        const headers = columns.map(col =>
          options.headers?.[col] || this.formatHeader(col)
        );
        csv += headers.map(h => this.escapeCSVValue(h)).join(delimiter) + '\n';
      }

      // Build data rows
      for (const row of data) {
        const values = columns.map(col => {
          const value = this.getNestedValue(row, col);
          return this.formatCSVValue(value);
        });
        csv += values.map(v => this.escapeCSVValue(v)).join(delimiter) + '\n';
      }

      this.logger.info(`Exported ${data.length} rows to CSV`);
      return csv;
    } catch (error) {
      this.logger.error('Failed to export data to CSV', error);
      throw new Error(`CSV export failed: ${error.message}`);
    }
  }

  /**
   * Export data to JSON format
   *
   * @param data Array of objects or single object
   * @param pretty Whether to pretty-print JSON
   * @returns JSON string
   */
  public toJSON(data: any, pretty: boolean = false): string {
    try {
      const json = pretty
        ? JSON.stringify(data, null, 2)
        : JSON.stringify(data);

      this.logger.info(`Exported data to JSON (${json.length} characters)`);
      return json;
    } catch (error) {
      this.logger.error('Failed to export data to JSON', error);
      throw new Error(`JSON export failed: ${error.message}`);
    }
  }

  /**
   * Save export content to file
   *
   * @param content String content to save
   * @param filename Filename (with extension)
   * @returns Export result with file path
   */
  public async saveToFile(content: string, filename: string): Promise<ExportResult> {
    try {
      // Ensure export directory exists
      await fs.mkdir(this.exportDir, { recursive: true });

      // Generate timestamped filename if not provided
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const finalFilename = filename || `export_${timestamp}.csv`;
      const filePath = path.join(this.exportDir, finalFilename);

      // Write file
      await fs.writeFile(filePath, content, 'utf-8');

      this.logger.info(`Export saved to file: ${filePath}`);

      return {
        success: true,
        filePath,
        content,
        rowCount: content.split('\n').length - 1
      };
    } catch (error) {
      this.logger.error('Failed to save export to file', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export data directly to CSV file
   *
   * @param data Array of objects to export
   * @param options Export options including filename
   * @returns Export result
   */
  public async exportToCSVFile(data: any[], options: ExportOptions = {}): Promise<ExportResult> {
    try {
      const csv = this.toCSV(data, options);

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = options.filename || `export_${timestamp}.csv`;

      return await this.saveToFile(csv, filename);
    } catch (error) {
      this.logger.error('Failed to export to CSV file', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Export data directly to JSON file
   *
   * @param data Data to export
   * @param filename Filename (will add .json if missing)
   * @param pretty Whether to pretty-print JSON
   * @returns Export result
   */
  public async exportToJSONFile(
    data: any,
    filename?: string,
    pretty: boolean = false
  ): Promise<ExportResult> {
    try {
      const json = this.toJSON(data, pretty);

      const timestamp = new Date().toISOString().split('T')[0];
      const finalFilename = filename || `export_${timestamp}.json`;
      const filenameWithExt = finalFilename.endsWith('.json')
        ? finalFilename
        : `${finalFilename}.json`;

      return await this.saveToFile(json, filenameWithExt);
    } catch (error) {
      this.logger.error('Failed to export to JSON file', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format column header (camelCase -> Title Case)
   * Example: totalEnergyKwh -> Total Energy Kwh
   */
  private formatHeader(column: string): string {
    return column
      .replace(/([A-Z])/g, ' $1') // Add space before capitals
      .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
      .trim();
  }

  /**
   * Get nested value from object using dot notation
   * Example: getNestedValue(obj, 'user.name') -> obj.user.name
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * Format value for CSV output
   */
  private formatCSVValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Escape CSV value (handle commas, quotes, newlines)
   */
  private escapeCSVValue(value: string): string {
    if (!value) return '';

    const stringValue = String(value);

    // Check if escaping is needed
    if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n') ||
      stringValue.includes('\r')
    ) {
      // Escape double quotes by doubling them
      const escaped = stringValue.replace(/"/g, '""');
      return `"${escaped}"`;
    }

    return stringValue;
  }

  /**
   * Get export statistics
   */
  public async getExportStats(): Promise<{
    totalExports: number;
    totalSizeBytes: number;
    exports: Array<{ filename: string; size: number; created: Date }>;
  }> {
    try {
      const files = await fs.readdir(this.exportDir);
      const stats = [];
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(this.exportDir, file);
        const stat = await fs.stat(filePath);
        stats.push({
          filename: file,
          size: stat.size,
          created: stat.birthtime
        });
        totalSize += stat.size;
      }

      return {
        totalExports: files.length,
        totalSizeBytes: totalSize,
        exports: stats.sort((a, b) => b.created.getTime() - a.created.getTime())
      };
    } catch (error) {
      this.logger.error('Failed to get export stats', error);
      return {
        totalExports: 0,
        totalSizeBytes: 0,
        exports: []
      };
    }
  }

  /**
   * Clean up old export files
   *
   * @param olderThanDays Delete files older than this many days
   * @returns Number of files deleted
   */
  public async cleanupOldExports(olderThanDays: number = 7): Promise<number> {
    try {
      const files = await fs.readdir(this.exportDir);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.exportDir, file);
        const stat = await fs.stat(filePath);

        if (stat.birthtime < cutoffDate) {
          await fs.unlink(filePath);
          deletedCount++;
          this.logger.info(`Deleted old export file: ${file}`);
        }
      }

      this.logger.info(`Cleaned up ${deletedCount} old export files`);
      return deletedCount;
    } catch (error) {
      this.logger.error('Failed to cleanup old exports', error);
      return 0;
    }
  }
}

/**
 * Helper function to create export service instance
 */
export function createExportService(logger: ILogger, exportDir?: string): ExportService {
  return new ExportService(logger, exportDir);
}
