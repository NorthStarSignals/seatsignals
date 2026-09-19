'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Upload, Download, FileSpreadsheet, Check, AlertTriangle, X } from 'lucide-react';

interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}

function parseCSVPreview(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parse = (line: string): string[] => {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          fields.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const headers = parse(lines[0]);
  const rows = lines.slice(1, 11).map(parse);
  return { headers, rows };
}

export default function ImportCustomersPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errorsExpanded, setErrorsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setResult(null);
    const text = await f.text();
    setPreview(parseCSVPreview(text));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile && droppedFile.name.endsWith('.csv')) {
        handleFile(droppedFile);
      }
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (selected) handleFile(selected);
    },
    [handleFile]
  );

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/customers/import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setResult(data);
    } catch (err) {
      setResult({
        imported: 0,
        skipped: 0,
        errors: [{ row: 0, message: err instanceof Error ? err.message : 'Import failed' }],
      });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch('/api/customers/export');
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Silently fail - could add toast here
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-seat-black p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Upload className="w-7 h-7 text-seat-red" />
              <h1 className="text-2xl font-bold text-white">Import Customers</h1>
            </div>
            <p className="text-zinc-400 mt-1 ml-10">
              Upload a CSV file to add customers in bulk
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export All
            </Button>
            <Link href="/dashboard/customers">
              <Button variant="ghost">Back to Customers</Button>
            </Link>
          </div>
        </div>

        {/* Upload Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-seat-red bg-seat-red/5'
              : file
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-zinc-700 bg-seat-card hover:border-zinc-500 hover:bg-zinc-800/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
          />
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <FileSpreadsheet className="w-12 h-12 text-emerald-400" />
              <div>
                <p className="text-white font-medium">{file.name}</p>
                <p className="text-zinc-400 text-sm">
                  {(file.size / 1024).toFixed(1)} KB
                  {preview && ` - ${preview.rows.length} row${preview.rows.length !== 1 ? 's' : ''} detected`}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  clearFile();
                }}
                className="text-zinc-400 hover:text-white text-sm flex items-center gap-1 mt-1"
              >
                <X className="w-3 h-3" />
                Remove file
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-12 h-12 text-zinc-500" />
              <div>
                <p className="text-white font-medium">Drag and drop your CSV file here</p>
                <p className="text-zinc-400 text-sm mt-1">or click to browse files</p>
              </div>
            </div>
          )}
        </div>

        {/* Download Template */}
        <div className="flex items-center justify-between bg-seat-card border border-seat-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-5 h-5 text-zinc-400" />
            <div>
              <p className="text-zinc-300 text-sm font-medium">Need a template?</p>
              <p className="text-zinc-500 text-xs">
                Download a sample CSV with the correct column format
              </p>
            </div>
          </div>
          <a href="/api/customers/import/template" download>
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>
          </a>
        </div>

        {/* Preview Table */}
        {preview && preview.rows.length > 0 && (
          <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-seat-border">
              <h2 className="text-white font-semibold">Preview</h2>
              <p className="text-zinc-400 text-sm mt-0.5">
                Showing first {preview.rows.length} row{preview.rows.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-seat-border">
                    {preview.headers.map((header, i) => (
                      <th
                        key={i}
                        className="px-4 py-3 text-left text-zinc-400 font-medium whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} className="border-b border-seat-border/50 last:border-0">
                      {preview.headers.map((_, j) => (
                        <td
                          key={j}
                          className="px-4 py-2.5 text-zinc-300 whitespace-nowrap max-w-[200px] truncate"
                        >
                          {row[j] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Import Button */}
        {file && !result && (
          <div className="flex justify-end">
            <Button onClick={handleImport} disabled={importing}>
              {importing ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Customers
                </>
              )}
            </Button>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Imported */}
              <div className="bg-seat-card border border-emerald-500/30 rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                    <Check className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-400">{result.imported}</p>
                    <p className="text-zinc-400 text-sm">Imported</p>
                  </div>
                </div>
              </div>

              {/* Skipped */}
              <div className="bg-seat-card border border-amber-500/30 rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-400">{result.skipped}</p>
                    <p className="text-zinc-400 text-sm">Skipped (duplicates)</p>
                  </div>
                </div>
              </div>

              {/* Errors */}
              <div className="bg-seat-card border border-red-500/30 rounded-xl p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <X className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">{result.errors.length}</p>
                    <p className="text-zinc-400 text-sm">Errors</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Details */}
            {result.errors.length > 0 && (
              <div className="bg-seat-card border border-red-500/20 rounded-xl overflow-hidden">
                <button
                  onClick={() => setErrorsExpanded(!errorsExpanded)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-zinc-800/50 transition-colors"
                >
                  <span className="text-red-400 font-medium text-sm">
                    {result.errors.length} error{result.errors.length !== 1 ? 's' : ''} occurred
                  </span>
                  <span className="text-zinc-500 text-sm">
                    {errorsExpanded ? 'Hide details' : 'Show details'}
                  </span>
                </button>
                {errorsExpanded && (
                  <div className="px-6 pb-4 space-y-2">
                    {result.errors.map((err, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 text-sm bg-red-500/5 rounded-lg px-4 py-2.5"
                      >
                        <span className="text-red-400 font-mono shrink-0">
                          {err.row > 0 ? `Row ${err.row}` : 'Error'}
                        </span>
                        <span className="text-zinc-400">{err.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions after import */}
            <div className="flex items-center gap-3 justify-end">
              <Button variant="secondary" onClick={clearFile}>
                Import Another File
              </Button>
              <Link href="/dashboard/customers">
                <Button>View Customers</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
