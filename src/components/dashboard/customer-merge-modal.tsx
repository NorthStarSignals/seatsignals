'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Check, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface DuplicateSet {
  match_type: string;
  customers: Record<string, unknown>[];
}

interface CustomerMergeModalProps {
  duplicateSet: DuplicateSet;
  onMerge: () => void;
  onClose: () => void;
}

const DISPLAY_FIELDS = [
  { key: 'first_name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'visit_count', label: 'Visits' },
  { key: 'total_spend', label: 'Total Spend' },
  { key: 'first_seen', label: 'First Seen' },
  { key: 'last_seen', label: 'Last Seen' },
  { key: 'source', label: 'Source' },
  { key: 'company', label: 'Company' },
  { key: 'instagram_handle', label: 'Instagram' },
];

const MATCH_TYPE_LABELS: Record<string, string> = {
  email: 'Same Email',
  phone: 'Same Phone',
  name: 'Same Name',
};

export function CustomerMergeModal({ duplicateSet, onMerge, onClose }: CustomerMergeModalProps) {
  const [primaryId, setPrimaryId] = useState<string>(
    (duplicateSet.customers[0]?.customer_id as string) || ''
  );
  const [merging, setMerging] = useState(false);
  const [merged, setMerged] = useState(false);

  const handleMerge = async () => {
    const duplicateIds = duplicateSet.customers
      .filter((c) => c.customer_id !== primaryId)
      .map((c) => c.customer_id as string);

    if (duplicateIds.length === 0) return;

    setMerging(true);
    try {
      const res = await fetch('/api/customers/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_id: primaryId, duplicate_ids: duplicateIds }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Merge failed');
      }

      const data = await res.json();
      toast.success(`Merged ${data.duplicates_removed} duplicate(s)`);
      setMerged(true);
      setTimeout(() => {
        onMerge();
      }, 1200);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Merge failed');
    } finally {
      setMerging(false);
    }
  };

  // Find fields that differ between customers
  const differingFields = new Set<string>();
  for (const field of DISPLAY_FIELDS) {
    const values = duplicateSet.customers.map((c) => c[field.key]);
    const unique = new Set(values.map((v) => String(v ?? '')));
    if (unique.size > 1) differingFields.add(field.key);
  }

  if (merged) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md text-center">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-emerald-400" size={24} />
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">Merge Complete</h3>
          <p className="text-zinc-400 text-sm">Duplicate records have been merged successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-white font-semibold text-lg">Merge Duplicates</h3>
            <p className="text-zinc-400 text-sm mt-1">
              Match type: <span className="text-red-400">{MATCH_TYPE_LABELS[duplicateSet.match_type] || duplicateSet.match_type}</span>
              {' '}&mdash; Select the primary record to keep
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left p-3 text-zinc-400 font-medium">Field</th>
                {duplicateSet.customers.map((c) => (
                  <th key={c.customer_id as string} className="text-left p-3 text-zinc-400 font-medium">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="primary"
                        value={c.customer_id as string}
                        checked={primaryId === c.customer_id}
                        onChange={() => setPrimaryId(c.customer_id as string)}
                        className="accent-red-500"
                      />
                      <span className={primaryId === c.customer_id ? 'text-red-400' : ''}>
                        {primaryId === c.customer_id ? 'Primary' : 'Duplicate'}
                      </span>
                    </label>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DISPLAY_FIELDS.map((field) => (
                <tr key={field.key} className="border-b border-zinc-800/50">
                  <td className="p-3 text-zinc-400 font-medium">{field.label}</td>
                  {duplicateSet.customers.map((c) => {
                    const val = c[field.key];
                    const display = val != null && val !== '' ? String(val) : '--';
                    const isDiff = differingFields.has(field.key);
                    return (
                      <td
                        key={c.customer_id as string}
                        className={`p-3 ${
                          isDiff ? 'text-amber-300 bg-amber-500/5' : 'text-zinc-300'
                        } ${c.customer_id === primaryId ? 'bg-red-500/5' : ''}`}
                      >
                        {field.key === 'total_spend' && val != null
                          ? `$${Number(val).toFixed(2)}`
                          : display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-zinc-800">
          <p className="text-zinc-500 text-xs">
            Missing fields on the primary will be filled from duplicates. Visits and spend will be combined.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={merging}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleMerge} disabled={merging}>
              {merging ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-1" /> Merging...
                </>
              ) : (
                `Merge ${duplicateSet.customers.length} Records`
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
