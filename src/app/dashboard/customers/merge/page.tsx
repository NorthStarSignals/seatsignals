'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Combine,
  Search,
  ArrowRight,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface DuplicateGroup {
  primary: { id: string; name: string; email: string; visits: number; spend: number };
  duplicates: Array<{ id: string; name: string; email: string; visits: number; spend: number; similarity: number }>;
}

export default function MergeCustomersPage() {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [merging, setMerging] = useState<string | null>(null);

  const fetchDuplicates = useCallback(async () => {
    try {
      const res = await fetch('/api/customers/duplicates');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDuplicates(); }, [fetchDuplicates]);

  const mergeCustomers = async (primaryId: string, duplicateId: string) => {
    setMerging(duplicateId);
    try {
      const res = await fetch('/api/customers/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primary_id: primaryId, duplicate_id: duplicateId }),
      });
      if (res.ok) {
        toast.success('Customers merged');
        setGroups(prev =>
          prev.map(g => ({
            ...g,
            duplicates: g.duplicates.filter(d => d.id !== duplicateId),
          })).filter(g => g.duplicates.length > 0)
        );
      } else {
        toast.error('Failed to merge');
      }
    } catch {
      toast.error('Error merging');
    } finally {
      setMerging(null);
    }
  };

  const filtered = searchQuery
    ? groups.filter(g =>
      g.primary.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.primary.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : groups;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-64 bg-zinc-800 rounded animate-pulse" />
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-zinc-800/50 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <Combine className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Merge Duplicates</h1>
          <p className="text-sm text-zinc-500">{groups.length} potential duplicate groups found</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="w-full pl-10 pr-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-seat-red"
        />
      </div>

      {/* Info */}
      {groups.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
          <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">
            Review each pair carefully before merging. The primary record will be kept and the duplicate&apos;s data will be consolidated.
          </p>
        </div>
      )}

      {/* Duplicate Groups */}
      <div className="space-y-4">
        {filtered.map((group, gi) => (
          <div key={gi} className="bg-seat-card border border-seat-border rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-zinc-500 font-medium">Primary Record</span>
            </div>

            {/* Primary */}
            <div className="flex items-center gap-4 p-3 bg-green-500/5 border border-green-500/20 rounded-lg mb-3">
              <Check size={16} className="text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{group.primary.name}</p>
                <p className="text-[10px] text-zinc-500">{group.primary.email}</p>
              </div>
              <div className="text-right text-xs">
                <p className="text-zinc-300">{group.primary.visits} visits</p>
                <p className="text-zinc-400">{formatCurrency(group.primary.spend)}</p>
              </div>
            </div>

            {/* Duplicates */}
            {group.duplicates.map(dup => (
              <div key={dup.id} className="flex items-center gap-4 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg mb-2">
                <ArrowRight size={14} className="text-zinc-600 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-zinc-300">{dup.name}</p>
                    <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded">
                      {dup.similarity}% match
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500">{dup.email}</p>
                </div>
                <div className="text-right text-xs mr-2">
                  <p className="text-zinc-400">{dup.visits} visits</p>
                  <p className="text-zinc-500">{formatCurrency(dup.spend)}</p>
                </div>
                <button
                  onClick={() => mergeCustomers(group.primary.id, dup.id)}
                  disabled={merging === dup.id}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    merging === dup.id
                      ? 'bg-zinc-700 text-zinc-500'
                      : 'bg-seat-red text-white hover:bg-seat-red/90'
                  )}
                >
                  {merging === dup.id ? 'Merging...' : 'Merge'}
                </button>
              </div>
            ))}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <Check size={48} className="mx-auto text-green-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-1">No Duplicates Found</h3>
            <p className="text-sm text-zinc-400">Your customer database looks clean</p>
          </div>
        )}
      </div>
    </div>
  );
}
