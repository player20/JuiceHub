// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Converts an array of objects to CSV format
 * @param data Array of objects to convert
 * @param filename Name of the file to download (without extension)
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Get all unique keys from all objects (in case some objects have different keys)
  const allKeys = Array.from(new Set(data.flatMap((obj) => Object.keys(obj))));

  // Create CSV header
  const header = allKeys.join(',');

  // Create CSV rows
  const rows = data.map((obj) =>
    allKeys
      .map((key) => {
        const value = obj[key];
        // Handle null/undefined
        if (value === null || value === undefined) {
          return '';
        }
        // Handle objects and arrays by stringifying
        if (typeof value === 'object') {
          return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
        }
        // Handle strings that might contain commas, quotes, or newlines
        const stringValue = String(value);
        if (
          stringValue.includes(',') ||
          stringValue.includes('"') ||
          stringValue.includes('\n')
        ) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(','),
  );

  // Combine header and rows
  const csv = [header, ...rows].join('\n');

  // Create blob and download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object to prevent memory leaks
  URL.revokeObjectURL(url);
}

/**
 * Flattens nested objects for better CSV export
 * @param data Array of objects with potentially nested data
 * @param maxDepth Maximum depth to flatten (default: 2)
 */
export function flattenForExport<T extends Record<string, any>>(
  data: T[],
  maxDepth: number = 2,
): Record<string, any>[] {
  return data.map((item) => flattenObject(item, '', maxDepth));
}

function flattenObject(
  obj: any,
  prefix: string = '',
  maxDepth: number,
  currentDepth: number = 0,
): Record<string, any> {
  const flattened: Record<string, any> = {};

  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    // Handle Date objects
    if (value instanceof Date) {
      flattened[newKey] = value.toISOString();
      continue;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      // Convert arrays to JSON string
      flattened[newKey] = JSON.stringify(value);
      continue;
    }

    // Handle nested objects
    if (value && typeof value === 'object' && currentDepth < maxDepth) {
      // Recursively flatten nested objects
      Object.assign(
        flattened,
        flattenObject(value, newKey, maxDepth, currentDepth + 1),
      );
    } else {
      flattened[newKey] = value;
    }
  }

  return flattened;
}
