'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Check,
  Minus,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface DataTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchKeys?: string[];
  searchPlaceholder?: string;
  pageSize?: number;
  pageSizeOptions?: number[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  loading?: boolean;
  bulkActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: (selectedRows: T[]) => void;
    variant?: 'default' | 'danger';
  }>;
  rowKey: keyof T | ((row: T) => string);
  exportable?: boolean;
  exportFilename?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], obj as unknown);
}

function getRowId<T>(row: T, rowKey: keyof T | ((row: T) => string)): string {
  if (typeof rowKey === 'function') return rowKey(row);
  return String(row[rowKey]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  searchable = false,
  searchKeys = [],
  searchPlaceholder = 'Search...',
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  onRowClick,
  emptyMessage = 'No data found.',
  emptyIcon,
  loading = false,
  bulkActions,
  rowKey,
  exportable = false,
  exportFilename = 'export',
}: DataTableProps<T>) {
  // ---- State ----
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---- Debounced search ----
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  // Reset page when data or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data, pageSize]);

  // ---- Filtered data ----
  const filteredData = useMemo(() => {
    if (!debouncedSearch || searchKeys.length === 0) return data;
    const lower = debouncedSearch.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((key) => {
        const val = getNestedValue(row, key);
        return val != null && String(val).toLowerCase().includes(lower);
      }),
    );
  }, [data, debouncedSearch, searchKeys]);

  // ---- Sorted data ----
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      const aVal = getNestedValue(a, sortKey);
      const bVal = getNestedValue(b, sortKey);
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [filteredData, sortKey, sortDir]);

  // ---- Pagination ----
  const totalRows = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalRows);
  const pageData = sortedData.slice(startIdx, endIdx);

  // ---- Selection helpers ----
  const pageIds = useMemo(
    () => pageData.map((row) => getRowId(row, rowKey)),
    [pageData, rowKey],
  );

  const allPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected =
    pageIds.some((id) => selectedIds.has(id)) && !allPageSelected;

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [allPageSelected, pageIds]);

  const toggleSelectRow = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    [],
  );

  const selectedRows = useMemo(
    () => data.filter((row) => selectedIds.has(getRowId(row, rowKey))),
    [data, selectedIds, rowKey],
  );

  // ---- Sort handler ----
  const handleSort = useCallback(
    (key: string) => {
      if (sortKey === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortKey(key);
        setSortDir('asc');
      }
      setCurrentPage(1);
    },
    [sortKey],
  );

  // ---- CSV Export ----
  const handleExport = useCallback(() => {
    const headers = columns.map((c) => c.label);
    const rows = sortedData.map((row) =>
      columns.map((col) => {
        const val = getNestedValue(row, col.key);
        if (val == null) return '';
        const str = String(val);
        // Escape CSV values that contain commas, quotes, or newlines
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }),
    );
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportFilename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [columns, sortedData, exportFilename]);

  // ---- Alignment class ----
  const alignClass = (align?: 'left' | 'center' | 'right') => {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  };

  // ---- Skeleton loading rows ----
  const skeletonRows = 5;

  const hasBulk = bulkActions && bulkActions.length > 0;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="w-full">
      {/* Top bar: search + export + bulk actions */}
      <div className="flex flex-col gap-3 mb-4">
        {/* Search & export row */}
        {(searchable || exportable) && (
          <div className="flex items-center gap-3">
            {searchable && (
              <div className="relative flex-1 max-w-md">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-seat-red"
                />
              </div>
            )}
            {exportable && (
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 rounded-lg transition-colors"
              >
                <Download size={14} />
                Export CSV
              </button>
            )}
          </div>
        )}

        {/* Bulk action bar */}
        {hasBulk && selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-seat-red/10 border border-seat-red/20 rounded-lg px-4 py-2.5">
            <span className="text-sm text-zinc-300">
              {selectedIds.size} selected
            </span>
            <div className="flex items-center gap-2 ml-auto">
              {bulkActions!.map((action, i) => (
                <button
                  key={i}
                  onClick={() => action.onClick(selectedRows)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    action.variant === 'danger'
                      ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {action.icon}
                  {action.label}
                </button>
              ))}
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-zinc-500 hover:text-zinc-300 ml-2 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table wrapper */}
      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* Header */}
            <thead>
              <tr className="bg-zinc-800/50">
                {hasBulk && (
                  <th className="w-10 px-4 py-3">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center w-4 h-4 rounded border border-zinc-600 transition-colors hover:border-zinc-400"
                      style={{
                        backgroundColor: allPageSelected
                          ? '#E11D48'
                          : somePageSelected
                            ? '#E11D48'
                            : 'transparent',
                        borderColor: allPageSelected || somePageSelected
                          ? '#E11D48'
                          : undefined,
                      }}
                    >
                      {allPageSelected && (
                        <Check size={12} className="text-white" />
                      )}
                      {somePageSelected && (
                        <Minus size={12} className="text-white" />
                      )}
                    </button>
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500 ${alignClass(col.align)}`}
                    style={col.width ? { width: col.width } : undefined}
                  >
                    {col.sortable ? (
                      <button
                        onClick={() => handleSort(col.key)}
                        className="inline-flex items-center gap-1 hover:text-zinc-300 transition-colors"
                      >
                        {col.label}
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? (
                            <ArrowUp size={14} />
                          ) : (
                            <ArrowDown size={14} />
                          )
                        ) : (
                          <ArrowUpDown size={14} className="opacity-40" />
                        )}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {loading ? (
                // Skeleton loading rows
                Array.from({ length: skeletonRows }).map((_, ri) => (
                  <tr
                    key={`skel-${ri}`}
                    className="border-b border-zinc-800/50"
                  >
                    {hasBulk && (
                      <td className="px-4 py-3">
                        <div className="w-4 h-4 bg-zinc-800 rounded animate-pulse" />
                      </td>
                    )}
                    {columns.map((col, ci) => (
                      <td key={ci} className="px-4 py-3">
                        <div
                          className="h-4 bg-zinc-800 rounded animate-pulse"
                          style={{
                            width: `${50 + ((ri + ci) % 4) * 15}%`,
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pageData.length === 0 ? (
                // Empty state
                <tr>
                  <td
                    colSpan={columns.length + (hasBulk ? 1 : 0)}
                    className="px-4 py-12 text-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      {emptyIcon && (
                        <div className="text-zinc-600">{emptyIcon}</div>
                      )}
                      <p className="text-zinc-400">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                // Data rows
                pageData.map((row) => {
                  const id = getRowId(row, rowKey);
                  const isSelected = selectedIds.has(id);
                  return (
                    <tr
                      key={id}
                      onClick={
                        onRowClick ? () => onRowClick(row) : undefined
                      }
                      className={`border-b border-zinc-800/50 transition-colors ${
                        onRowClick ? 'cursor-pointer' : ''
                      } ${
                        isSelected
                          ? 'bg-seat-red/5 border-l-2 border-l-seat-red'
                          : 'hover:bg-zinc-800/30'
                      }`}
                    >
                      {hasBulk && (
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectRow(id);
                            }}
                            className="flex items-center justify-center w-4 h-4 rounded border border-zinc-600 transition-colors hover:border-zinc-400"
                            style={{
                              backgroundColor: isSelected
                                ? '#E11D48'
                                : 'transparent',
                              borderColor: isSelected
                                ? '#E11D48'
                                : undefined,
                            }}
                          >
                            {isSelected && (
                              <Check size={12} className="text-white" />
                            )}
                          </button>
                        </td>
                      )}
                      {columns.map((col) => {
                        const val = getNestedValue(row, col.key);
                        return (
                          <td
                            key={col.key}
                            className={`px-4 py-3 text-zinc-300 ${alignClass(col.align)}`}
                            style={
                              col.width ? { width: col.width } : undefined
                            }
                          >
                            {col.render ? col.render(val, row) : ((val as React.ReactNode) ?? '--')}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        {!loading && totalRows > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-t border-zinc-800/50">
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">
                Showing {startIdx + 1}-{endIdx} of {totalRows}
              </span>
              <div className="flex items-center gap-1.5">
                <label
                  htmlFor="dt-page-size"
                  className="text-xs text-zinc-500"
                >
                  Rows:
                </label>
                <select
                  id="dt-page-size"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-seat-red"
                >
                  {pageSizeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs text-zinc-500 px-2">
                {safePage} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={safePage >= totalPages}
                className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
