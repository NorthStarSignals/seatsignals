'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { QrCode, Download, FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MetricCard } from '@/components/ui/metric-card';
import { formatDate } from '@/lib/utils';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

interface QRCapture {
  customer_id: string;
  first_name: string;
  email: string;
  first_seen: string;
}

interface CaptureStats {
  thisWeek: number;
  thisMonth: number;
  total: number;
}

type QRSize = 'small' | 'medium' | 'large';

const SIZE_MAP: Record<QRSize, number> = {
  small: 200,
  medium: 300,
  large: 400,
};

export default function QRCodesPage() {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [restaurantId, setRestaurantId] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [size, setSize] = useState<QRSize>('medium');
  const [showName, setShowName] = useState(true);
  const [captures, setCaptures] = useState<QRCapture[]>([]);
  const [stats, setStats] = useState<CaptureStats>({ thisWeek: 0, thisMonth: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const captureUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/capture/${restaurantId}`
    : '';

  const generateQR = useCallback(async () => {
    if (!restaurantId) return;
    const url = `${window.location.origin}/capture/${restaurantId}`;
    try {
      const dataUrl = await QRCode.toDataURL(url, {
        width: SIZE_MAP[size],
        margin: 2,
        color: { dark: '#09090B', light: '#FFFFFF' },
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  }, [restaurantId, size]);

  // Fetch restaurant info and QR captures
  useEffect(() => {
    async function loadData() {
      try {
        const resRestaurant = await fetch('/api/restaurant');
        if (resRestaurant.ok) {
          const data = await resRestaurant.json();
          setRestaurantId(data.restaurant_id);
          setRestaurantName(data.name || '');
        }

        const resCustomers = await fetch('/api/customers?source=qr');
        if (resCustomers.ok) {
          const data = await resCustomers.json();
          const qrCustomers: QRCapture[] = (data.customers || [])
            .filter((c: Record<string, unknown>) => c.source === 'qr')
            .slice(0, 20);
          setCaptures(qrCustomers);

          // Calculate stats
          const now = new Date();
          const weekAgo = new Date(now);
          weekAgo.setDate(weekAgo.getDate() - 7);
          const monthAgo = new Date(now);
          monthAgo.setMonth(monthAgo.getMonth() - 1);

          const allQr = (data.customers || []).filter((c: Record<string, unknown>) => c.source === 'qr');
          const thisWeek = allQr.filter((c: QRCapture) => new Date(c.first_seen) >= weekAgo).length;
          const thisMonth = allQr.filter((c: QRCapture) => new Date(c.first_seen) >= monthAgo).length;

          setStats({ thisWeek, thisMonth, total: allQr.length });
        }
      } catch (err) {
        console.error('Failed to load QR data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Regenerate QR when params change
  useEffect(() => {
    if (restaurantId) generateQR();
  }, [restaurantId, size, generateQR]);

  const downloadPNG = () => {
    if (!qrDataUrl) return;

    // Create a canvas with optional restaurant name
    const canvas = document.createElement('canvas');
    const px = SIZE_MAP[size];
    const padding = 40;
    const textHeight = showName && restaurantName ? 50 : 0;
    canvas.width = px + padding * 2;
    canvas.height = px + padding * 2 + textHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw QR
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, padding, padding, px, px);

      // Draw restaurant name
      if (showName && restaurantName) {
        ctx.fillStyle = '#09090B';
        ctx.font = `bold ${Math.max(16, px / 12)}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(restaurantName, canvas.width / 2, px + padding + 35);
      }

      const link = document.createElement('a');
      link.download = `qr-code-${restaurantName || restaurantId}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = qrDataUrl;
  };

  const downloadPDF = () => {
    if (!qrDataUrl) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [100, 140] });

    // White background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 100, 140, 'F');

    // Border
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.roundedRect(3, 3, 94, 134, 4, 4);

    // Restaurant name at top
    if (restaurantName) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(9, 9, 11);
      doc.text(restaurantName, 50, 18, { align: 'center' });
    }

    // QR code
    const qrSize = 60;
    const qrX = (100 - qrSize) / 2;
    const qrY = restaurantName ? 25 : 15;
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    // "Scan to join" text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128);
    doc.text('Scan to get exclusive offers', 50, qrY + qrSize + 10, { align: 'center' });

    // Fold line indicator
    doc.setDrawColor(229, 231, 235);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(5, 105, 95, 105);

    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text('fold here', 50, 109, { align: 'center' });

    // Back panel text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(9, 9, 11);
    doc.text('Get exclusive offers!', 50, 120, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(107, 114, 128);
    doc.text('Scan the QR code on the other side', 50, 126, { align: 'center' });
    doc.text('to join our rewards program.', 50, 131, { align: 'center' });

    doc.save(`tent-card-${restaurantName || restaurantId}.pdf`);
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-seat-card rounded w-48" />
          <div className="h-64 bg-seat-card rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg bg-seat-red/10 flex items-center justify-center">
            <QrCode size={18} className="text-seat-red" />
          </div>
          <h1 className="text-xl font-bold text-white">QR Codes</h1>
        </div>
        <p className="text-sm text-zinc-500 ml-12">
          Generate and manage customer capture codes
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          title="This Week"
          value={stats.thisWeek}
          icon={<Users size={16} />}
        />
        <MetricCard
          title="This Month"
          value={stats.thisMonth}
          icon={<Users size={16} />}
        />
        <MetricCard
          title="Total QR Captures"
          value={stats.total}
          icon={<QrCode size={16} />}
        />
      </div>

      {/* QR Generator */}
      <div className="bg-seat-card border border-seat-border rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Your QR Code</h2>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* QR Preview */}
          <div className="flex-shrink-0 flex flex-col items-center">
            <div className="bg-white rounded-xl p-4 inline-block">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  width={SIZE_MAP[size]}
                  height={SIZE_MAP[size]}
                  className="block"
                />
              ) : (
                <div
                  className="bg-gray-100 flex items-center justify-center"
                  style={{ width: SIZE_MAP[size], height: SIZE_MAP[size] }}
                >
                  <QrCode size={48} className="text-gray-300" />
                </div>
              )}
              {showName && restaurantName && (
                <p className="text-center text-sm font-semibold text-gray-900 mt-2">
                  {restaurantName}
                </p>
              )}
            </div>

            {captureUrl && (
              <p className="text-xs text-zinc-600 mt-2 text-center break-all max-w-[300px]">
                {captureUrl}
              </p>
            )}
          </div>

          {/* Controls */}
          <div className="flex-1 space-y-5">
            {/* Size selector */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Size</label>
              <div className="flex gap-2">
                {(['small', 'medium', 'large'] as QRSize[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      size === s
                        ? 'bg-seat-red text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Show restaurant name toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowName(!showName)}
                className={`w-10 h-5 rounded-full transition-colors relative ${
                  showName ? 'bg-seat-red' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    showName ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
              <span className="text-sm text-zinc-400">Show restaurant name below QR</span>
            </div>

            {/* Download buttons */}
            <div className="flex gap-3 pt-2">
              <Button onClick={downloadPNG} variant="primary" size="md">
                <Download size={14} />
                Download PNG
              </Button>
              <Button onClick={downloadPDF} variant="secondary" size="md">
                <FileText size={14} />
                Download as PDF
              </Button>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Recent QR Captures */}
      <div className="bg-seat-card border border-seat-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-seat-border">
          <h2 className="text-sm font-semibold text-white">Recent QR Captures</h2>
        </div>

        {captures.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <QrCode size={32} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No QR captures yet</p>
            <p className="text-xs text-zinc-600 mt-1">
              Print your QR code and place it on tables to start capturing customers
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-seat-border">
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">
                    Email
                  </th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">
                    Date
                  </th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-5 py-3">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody>
                {captures.map((capture) => {
                  const date = new Date(capture.first_seen);
                  return (
                    <tr key={capture.customer_id} className="border-b border-seat-border/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-3 text-sm text-white">
                        {capture.first_name || '-'}
                      </td>
                      <td className="px-5 py-3 text-sm text-zinc-400">
                        {capture.email}
                      </td>
                      <td className="px-5 py-3 text-sm text-zinc-400">
                        {formatDate(capture.first_seen)}
                      </td>
                      <td className="px-5 py-3 text-sm text-zinc-400">
                        {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
