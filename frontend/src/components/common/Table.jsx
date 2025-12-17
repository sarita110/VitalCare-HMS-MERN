// src/components/common/Table.jsx - Updated
import React from "react";
import LoadingSpinner from "./LoadingSpinner";

const Table = ({
  columns,
  data,
  isLoading = false,
  error = null,
  emptyMessage = "No data available.",
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-600">
        Error loading data: {error}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">{emptyMessage}</div>
    );
  }

  // Improved function to get nested property value with better error handling
  const getCellValue = (row, columnKey) => {
    if (!row) return "";
    if (!columnKey) return "";

    try {
      const keys = columnKey.split(".");
      let value = row;
      for (const key of keys) {
        if (value === null || value === undefined) {
          return ""; // Return empty string instead of undefined
        }
        value = value[key];
      }
      return value === null || value === undefined ? "" : value;
    } catch (e) {
      console.warn(`Error accessing ${columnKey} in row`, row, e);
      return "";
    }
  };

  return (
    <div className="table-container align-middle inline-block min-w-full shadow overflow-hidden sm:rounded-lg border-b border-gray-200">
      <table className="table min-w-full divide-y divide-gray-200">
        <thead className="table-header bg-gray-50">
          <tr>
            {columns.map((column, idx) => (
              <th
                key={column.accessor || `column-${idx}`}
                scope="col"
                className="table-header-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {column.Header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="table-body bg-white divide-y divide-gray-200">
          {data.map((row, rowIndex) => (
            <tr
              key={row._id || rowIndex}
              className="table-row hover:bg-gray-50"
            >
              {columns.map((column, colIndex) => (
                <td
                  key={`${rowIndex}-${column.accessor || colIndex}`}
                  className="table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                >
                  {column.Cell
                    ? column.Cell({
                        value: getCellValue(row, column.accessor),
                        row: { original: row },
                      })
                    : String(getCellValue(row, column.accessor) || "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
