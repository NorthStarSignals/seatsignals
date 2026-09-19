'use client';

import { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileJson,
  Users,
  Receipt,
  Star,
  UtensilsCrossed,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

const EXPORT_TYPES = [
  { value: 'customers', label: 'Customers', description: 'All customer profiles with spend and visit data', icon: Users },
  { value: 'visits', label: 'Visits / Transactions', description: 'Transaction records with amounts and details', icon: Receipt },
  { value: 'reviews', label: 'Reviews', description: 'Customer reviews with ratings and sentiment', icon: Star },
  { value: 'menu', label: 'Menu Items', description: 'Full menu with pricing and food cost data', icon: UtensilsCrossed },
];

export default function ExportPage() {
  const [exportType, setExportType] = useState('customers');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: exportType,
          format,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Export failed');
        return;
      }

      if (format === 'csv') {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportType}_export_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('CSV downloaded');
      } else {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${json.filename}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`${json.count} records exported`);
      }
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <Download className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Data Export</h1>
          <p className="text-sm text-zinc-500">Export your restaurant data as CSV or JSON</p>
        </div>
      </div>

      {/* Export Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXPORT_TYPES.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.value} onClick={() => setExportType(t.value)}
              className={cn(
                'bg-seat-card border rounded-xl p-5 text-left transition-all',
                exportType === t.value
                  ? 'border-seat-red ring-1 ring-seat-red/20'
                  : 'border-seat-border hover:border-zinc-600'
              )}>
              <div className="flex items-center gap-3 mb-2">
                <Icon size={20} className={exportType === t.value ? 'text-seat-red' : 'text-zinc-400'} />
                <h3 className="text-sm font-semibold text-white">{t.label}</h3>
              </div>
              <p className="text-xs text-zinc-400">{t.description}</p>
            </button>
          );
        })}
      </div>

      {/* Options */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-5 space-y-5">
        <h3 className="text-sm font-semibold text-white">Export Options</h3>

        {/* Format */}
        <div>
          <label className="text-xs text-zinc-400 mb-2 block">Format</label>
          <div className="flex gap-3">
            <button onClick={() => setFormat('csv')}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
                format === 'csv' ? 'bg-seat-red/10 border-seat-red text-seat-red' : 'bg-zinc-800 border-zinc-700 text-zinc-400')}>
              <FileSpreadsheet size={16} /> CSV
            </button>
            <button onClick={() => setFormat('json')}
              className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border',
                format === 'json' ? 'bg-seat-red/10 border-seat-red text-seat-red' : 'bg-zinc-800 border-zinc-700 text-zinc-400')}>
              <FileJson size={16} /> JSON
            </button>
          </div>
        </div>

        {/* Date Range (for visits) */}
        {exportType === 'visits' && (
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Date Range (optional)</label>
            <div className="flex gap-3">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-seat-red" />
              <span className="text-zinc-500 self-center">to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white focus:outline-none focus:border-seat-red" />
            </div>
          </div>
        )}

        {/* Export Button */}
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-2 px-6 py-3 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 disabled:opacity-50 transition-colors">
          {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {exporting ? 'Exporting...' : `Export ${EXPORT_TYPES.find(t => t.value === exportType)?.label} as ${format.toUpperCase()}`}
        </button>
      </div>

      {/* Info */}
      <div className="bg-zinc-800/30 border border-zinc-800 rounded-xl p-4">
        <h4 className="text-xs font-semibold text-zinc-400 mb-2">Export Notes</h4>
        <ul className="text-xs text-zinc-500 space-y-1">
          <li>• Exports are limited to 5,000 records per file</li>
          <li>• CSV files can be opened in Excel, Google Sheets, or any spreadsheet app</li>
          <li>• JSON format is ideal for developer integrations and data migration</li>
          <li>• Date filters only apply to transaction exports</li>
        </ul>
      </div>
    </div>
  );
}
