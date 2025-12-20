// SPDX-FileCopyrightText: 2025 Contributors to the CitrineOS Project
//
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from 'react';
import { message } from 'antd';
import { instanceToPlain } from 'class-transformer';
import { exportToCSV, flattenForExport } from '../utils/export';

/**
 * Custom hook for table data export functionality
 * @param dataSource The table data source to export
 * @param resourceName Name of the resource being exported (e.g., 'charging-stations')
 * @returns Export handler function
 */
export function useTableExport<T extends Record<string, any>>(
  dataSource: readonly T[] | undefined,
  resourceName: string,
) {
  const handleExport = useCallback(() => {
    const data = dataSource || [];

    if (data.length === 0) {
      message.warning('No data to export');
      return;
    }

    // Convert class instances to plain objects and flatten nested data
    const plainData = data.map((item) => instanceToPlain(item));
    const flattenedData = flattenForExport(plainData);

    // Generate filename with current date
    const filename = `${resourceName}-${new Date().toISOString().split('T')[0]}`;

    // Export to CSV
    exportToCSV(flattenedData, filename);

    message.success(
      `Exported ${data.length} ${resourceName.replace(/-/g, ' ')}`,
    );
  }, [dataSource, resourceName]);

  return handleExport;
}
