'use client';

import { useState, useEffect, useCallback } from 'react';
import { Mail, Eye, RefreshCw, Send, Clock, Settings } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DigestPreviewPage() {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/digest/preview');
      if (res.ok) {
        const data = await res.json();
        setHtml(data.html);
      }
    } catch {
      console.error('Failed to load digest preview');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPreview(); }, [fetchPreview]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mail size={24} className="text-seat-red" />
            Email Digest Preview
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Preview how your daily/weekly digest email looks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchPreview}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
          <button
            onClick={() => toast.success('Digest sent to your email')}
            className="flex items-center gap-2 px-4 py-2 bg-seat-red text-white rounded-lg text-sm font-medium hover:bg-seat-red/90 transition-colors"
          >
            <Send size={14} />
            Send Test
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('desktop')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'desktop' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Desktop
          </button>
          <button
            onClick={() => setViewMode('mobile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              viewMode === 'mobile' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Mobile
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            Sent daily at 8:00 AM
          </span>
          <span className="flex items-center gap-1">
            <Settings size={12} />
            Configure in Settings
          </span>
        </div>
      </div>

      {/* Preview */}
      <div className="flex justify-center">
        <div
          className={`bg-gray-200 rounded-xl p-4 shadow-inner transition-all ${
            viewMode === 'mobile' ? 'w-[375px]' : 'w-full max-w-[700px]'
          }`}
        >
          {loading ? (
            <div className="h-[600px] bg-white rounded-lg animate-pulse flex items-center justify-center text-gray-400">
              Loading preview...
            </div>
          ) : html ? (
            <div className="bg-white rounded-lg overflow-hidden shadow-sm">
              <iframe
                srcDoc={html}
                className="w-full border-0"
                style={{ height: viewMode === 'mobile' ? '800px' : '700px' }}
                title="Email Preview"
              />
            </div>
          ) : (
            <div className="h-[400px] bg-white rounded-lg flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Eye size={32} className="mx-auto mb-2 opacity-50" />
                <p>No preview available</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
