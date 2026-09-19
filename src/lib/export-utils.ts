/**
 * Export utilities for CSV, JSON, and clipboard operations
 */

export function toCSV(data: Record<string, unknown>[], columns?: string[]): string {
  if (data.length === 0) return '';
  const keys = columns || Object.keys(data[0]);
  const header = keys.map(k => `"${k}"`).join(',');
  const rows = data.map(row =>
    keys.map(k => {
      const val = row[k];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string') return `"${val.replace(/"/g, '""')}"`;
      return String(val);
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

export function downloadCSV(data: Record<string, unknown>[], filename: string, columns?: string[]) {
  const csv = toCSV(data, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJSON(data: unknown, filename: string) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function formatDateForExport(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
}
