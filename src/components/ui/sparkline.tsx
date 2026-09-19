'use client';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showDot?: boolean;
  fillGradient?: boolean;
  className?: string;
}

/**
 * Tiny inline SVG sparkline chart.
 * Draws a smooth cubic bezier curve through data points with optional
 * gradient fill and end-dot indicator.
 */
export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = '#E11D48', // seat-red
  showDot = true,
  fillGradient = true,
  className,
}: SparklineProps) {
  if (!data.length) return null;

  const padding = showDot ? 3 : 1;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Map data to x/y coordinates
  const points = data.map((v, i) => ({
    x: padding + (i / Math.max(data.length - 1, 1)) * chartW,
    y: padding + chartH - ((v - min) / range) * chartH,
  }));

  // Build smooth cubic bezier path
  function smoothPath(pts: { x: number; y: number }[]): string {
    if (pts.length < 2) return `M ${pts[0].x} ${pts[0].y}`;

    const parts: string[] = [`M ${pts[0].x} ${pts[0].y}`];

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];

      const tension = 0.3;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      parts.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`);
    }

    return parts.join(' ');
  }

  const linePath = smoothPath(points);
  const gradientId = `spark-grad-${Math.random().toString(36).slice(2, 8)}`;
  const lastPoint = points[points.length - 1];

  // Fill path: close at the bottom
  const fillPath = `${linePath} L ${lastPoint.x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {fillGradient && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {fillGradient && (
        <path d={fillPath} fill={`url(#${gradientId})`} />
      )}
      <path d={linePath} stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {showDot && (
        <circle cx={lastPoint.x} cy={lastPoint.y} r={2} fill={color} />
      )}
    </svg>
  );
}
