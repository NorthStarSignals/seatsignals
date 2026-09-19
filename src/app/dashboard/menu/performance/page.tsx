'use client';

import { useState } from 'react';
import { MetricCard } from '@/components/ui/metric-card';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import {
  UtensilsCrossed,
  TrendingUp,
  DollarSign,
  Star,
  AlertTriangle,
  Pencil,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import { useCrudList } from '@/hooks/use-local-storage-state';
import {
  EditModal,
  FieldLabel,
  TextInput,
  PrimaryButton,
  GhostButton,
} from '@/components/dashboard/edit-modal';

interface MenuItemPerf {
  id: string;
  name: string;
  category: string;
  price: number;
  target_price: number;
  orders: number;
  revenue: number;
  food_cost: number;
  profit_margin: number;
  rating: number;
  trend: 'up' | 'down' | 'stable';
  quadrant: 'star' | 'puzzle' | 'plow' | 'dog';
}

const INITIAL: MenuItemPerf[] = [
  { id: 'p1', name: 'Filet Mignon', category: 'Entrées', price: 48, target_price: 50, orders: 185, revenue: 8880, food_cost: 28, profit_margin: 72, rating: 4.8, trend: 'up', quadrant: 'star' },
  { id: 'p2', name: 'Grilled Salmon', category: 'Entrées', price: 32, target_price: 34, orders: 210, revenue: 6720, food_cost: 32, profit_margin: 68, rating: 4.6, trend: 'up', quadrant: 'star' },
  { id: 'p3', name: 'Lobster Linguine', category: 'Entrées', price: 42, target_price: 44, orders: 145, revenue: 6090, food_cost: 38, profit_margin: 62, rating: 4.7, trend: 'stable', quadrant: 'star' },
  { id: 'p4', name: 'Crispy Calamari', category: 'Appetizers', price: 14, target_price: 15, orders: 320, revenue: 4480, food_cost: 22, profit_margin: 78, rating: 4.5, trend: 'up', quadrant: 'plow' },
  { id: 'p5', name: 'Chocolate Lava Cake', category: 'Desserts', price: 14, target_price: 14, orders: 280, revenue: 3920, food_cost: 18, profit_margin: 82, rating: 4.9, trend: 'up', quadrant: 'star' },
  { id: 'p6', name: 'Mushroom Risotto', category: 'Entrées', price: 26, target_price: 28, orders: 95, revenue: 2470, food_cost: 24, profit_margin: 76, rating: 4.3, trend: 'down', quadrant: 'puzzle' },
  { id: 'p7', name: 'Pan-Seared Duck', category: 'Entrées', price: 38, target_price: 40, orders: 68, revenue: 2584, food_cost: 35, profit_margin: 65, rating: 4.4, trend: 'down', quadrant: 'puzzle' },
  { id: 'p8', name: 'Burrata & Tomato', category: 'Appetizers', price: 16, target_price: 16, orders: 155, revenue: 2480, food_cost: 30, profit_margin: 70, rating: 4.2, trend: 'stable', quadrant: 'plow' },
  { id: 'p9', name: 'Tuna Tartare', category: 'Appetizers', price: 18, target_price: 19, orders: 130, revenue: 2340, food_cost: 40, profit_margin: 60, rating: 4.6, trend: 'stable', quadrant: 'puzzle' },
  { id: 'p10', name: 'Caesar Salad', category: 'Salads', price: 14, target_price: 14, orders: 190, revenue: 2660, food_cost: 15, profit_margin: 85, rating: 4.0, trend: 'stable', quadrant: 'plow' },
  { id: 'p11', name: 'French Onion Soup', category: 'Appetizers', price: 12, target_price: 13, orders: 85, revenue: 1020, food_cost: 20, profit_margin: 80, rating: 4.1, trend: 'down', quadrant: 'dog' },
  { id: 'p12', name: 'Impossible Burger', category: 'Entrées', price: 19, target_price: 22, orders: 55, revenue: 1045, food_cost: 42, profit_margin: 58, rating: 3.8, trend: 'down', quadrant: 'dog' },
  { id: 'p13', name: 'Crème Brûlée', category: 'Desserts', price: 12, target_price: 13, orders: 140, revenue: 1680, food_cost: 16, profit_margin: 84, rating: 4.5, trend: 'stable', quadrant: 'plow' },
  { id: 'p14', name: 'Tiramisu', category: 'Desserts', price: 13, target_price: 14, orders: 110, revenue: 1430, food_cost: 19, profit_margin: 81, rating: 4.3, trend: 'stable', quadrant: 'plow' },
  { id: 'p15', name: 'Kale & Quinoa', category: 'Salads', price: 16, target_price: 17, orders: 45, revenue: 720, food_cost: 25, profit_margin: 75, rating: 3.9, trend: 'down', quadrant: 'dog' },
];

const QUADRANT_COLORS: Record<string, { bg: string; text: string; label: string; description: string }> = {
  star: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Stars', description: 'High popularity + high margin' },
  plow: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Plowhorses', description: 'High popularity, lower margin' },
  puzzle: { bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Puzzles', description: 'Low popularity, high margin' },
  dog: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Dogs', description: 'Low popularity + low margin' },
};

const SCATTER_COLORS: Record<string, string> = { star: '#22C55E', plow: '#3B82F6', puzzle: '#F59E0B', dog: '#EF4444' };

type Draft = { id: string; name: string; price: string; target_price: string };

export default function MenuPerformancePage() {
  const { items, update } = useCrudList<MenuItemPerf>('seatsignals_menu_perf', INITIAL);
  const [filterCat, setFilterCat] = useState('All');
  const [sortBy, setSortBy] = useState<'revenue' | 'orders' | 'profit_margin'>('revenue');
  const [editing, setEditing] = useState<Draft | null>(null);

  const categories = ['All', ...Array.from(new Set(items.map(i => i.category)))];
  const filtered = filterCat === 'All' ? items : items.filter(i => i.category === filterCat);
  const sorted = [...filtered].sort((a, b) => b[sortBy] - a[sortBy]);

  const totalRevenue = items.reduce((s, i) => s + i.revenue, 0);
  const totalOrders = items.reduce((s, i) => s + i.orders, 0);
  const avgMargin = items.length ? Math.round(items.reduce((s, i) => s + i.profit_margin, 0) / items.length) : 0;
  const topItem = items.length ? [...items].sort((a, b) => b.revenue - a.revenue)[0] : null;

  const revenueByCategory = Array.from(
    items.reduce((map, item) => {
      map.set(item.category, (map.get(item.category) || 0) + item.revenue);
      return map;
    }, new Map<string, number>())
  ).map(([category, revenue]) => ({ category, revenue }));

  const scatterData = items.map(i => ({
    x: i.orders,
    y: i.profit_margin,
    z: i.revenue,
    name: i.name,
    quadrant: i.quadrant,
  }));

  const openEdit = (it: MenuItemPerf) => setEditing({ id: it.id, name: it.name, price: String(it.price), target_price: String(it.target_price) });

  const save = () => {
    if (!editing) return;
    update(editing.id, { price: parseFloat(editing.price) || 0, target_price: parseFloat(editing.target_price) || 0 });
    toast.success('Pricing updated');
    setEditing(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-seat-red/10 flex items-center justify-center">
          <UtensilsCrossed className="w-5 h-5 text-seat-red" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Menu Performance</h1>
          <p className="text-sm text-zinc-500">Menu engineering matrix and item analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard title="Total Revenue" value={formatCurrency(totalRevenue)} icon={<DollarSign size={18} />} />
        <MetricCard title="Total Orders" value={totalOrders.toLocaleString()} icon={<UtensilsCrossed size={18} />} />
        <MetricCard title="Avg Margin" value={`${avgMargin}%`} icon={<TrendingUp size={18} />} />
        <MetricCard title="Top Item" value={topItem?.name || '—'} icon={<Star size={18} />} />
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Menu Engineering Matrix</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {Object.entries(QUADRANT_COLORS).map(([key, q]) => (
            <div key={key} className={cn('rounded-lg p-3', q.bg)}>
              <p className={cn('text-sm font-semibold', q.text)}>{q.label}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{q.description}</p>
              <p className={cn('text-lg font-bold mt-1', q.text)}>
                {items.filter(i => i.quadrant === key).length} items
              </p>
            </div>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
            <XAxis type="number" dataKey="x" name="Orders" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }}
              label={{ value: 'Popularity (Orders)', position: 'insideBottom', offset: -5, fill: '#71717A', fontSize: 11 }} />
            <YAxis type="number" dataKey="y" name="Margin" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }}
              label={{ value: 'Profit Margin %', angle: -90, position: 'insideLeft', fill: '#71717A', fontSize: 11 }} />
            <ZAxis type="number" dataKey="z" range={[50, 400]} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => [value, name === 'x' ? 'Orders' : name === 'y' ? 'Margin %' : 'Revenue']}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(label: any) => {
                const item = scatterData.find(d => d.x === label);
                return item ? item.name : label;
              }}
            />
            <Scatter data={scatterData}>
              {scatterData.map((entry, idx) => (
                <Cell key={idx} fill={SCATTER_COLORS[entry.quadrant]} fillOpacity={0.8} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Revenue by Category</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={revenueByCategory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
            <XAxis dataKey="category" stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} />
            <YAxis stroke="#52525B" tick={{ fill: '#71717A', fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1C1C21', border: '1px solid #27272A', borderRadius: 8 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => [formatCurrency(value), 'Revenue']}
            />
            <Bar dataKey="revenue" fill="#E11D48" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-seat-card border border-seat-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Item Details</h3>
          <div className="flex gap-2">
            {categories.map(cat => (
              <button key={cat} onClick={() => setFilterCat(cat)}
                className={cn('px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  filterCat === cat ? 'bg-seat-red text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white')}>
                {cat}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2 mb-3">
          {(['revenue', 'orders', 'profit_margin'] as const).map(s => (
            <button key={s} onClick={() => setSortBy(s)}
              className={cn('text-[10px] px-2 py-1 rounded transition-colors',
                sortBy === s ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-white')}>
              Sort: {s === 'profit_margin' ? 'Margin' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] text-zinc-500 uppercase border-b border-seat-border">
                <th className="text-left py-2 px-2">Item</th>
                <th className="text-left py-2 px-2">Category</th>
                <th className="text-right py-2 px-2">Price</th>
                <th className="text-right py-2 px-2">Target</th>
                <th className="text-right py-2 px-2">Orders</th>
                <th className="text-right py-2 px-2">Revenue</th>
                <th className="text-right py-2 px-2">Margin</th>
                <th className="text-right py-2 px-2">Rating</th>
                <th className="text-center py-2 px-2">Class</th>
                <th className="text-right py-2 px-2">Edit</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(item => {
                const q = QUADRANT_COLORS[item.quadrant];
                return (
                  <tr key={item.id} className="border-b border-seat-border/30 hover:bg-zinc-800/30">
                    <td className="py-2.5 px-2">
                      <span className="text-white font-medium">{item.name}</span>
                      {item.food_cost > 35 && (
                        <AlertTriangle size={10} className="inline ml-1 text-amber-400" />
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-zinc-400">{item.category}</td>
                    <td className="py-2.5 px-2 text-right text-white">{formatCurrency(item.price)}</td>
                    <td className="py-2.5 px-2 text-right text-zinc-400">{formatCurrency(item.target_price)}</td>
                    <td className="py-2.5 px-2 text-right text-white">{item.orders}</td>
                    <td className="py-2.5 px-2 text-right text-white font-medium">{formatCurrency(item.revenue)}</td>
                    <td className={cn('py-2.5 px-2 text-right font-medium',
                      item.profit_margin >= 75 ? 'text-green-400' : item.profit_margin >= 65 ? 'text-amber-400' : 'text-red-400')}>
                      {item.profit_margin}%
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <span className="flex items-center justify-end gap-0.5">
                        {item.rating} <Star size={10} className="text-amber-400 fill-amber-400" />
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', q.bg, q.text)}>
                        {q.label.slice(0, -1)}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right">
                      <button onClick={() => openEdit(item)} className="text-zinc-500 hover:text-white">
                        <Pencil size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <EditModal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit ${editing?.name || ''}`}
        footer={
          <>
            <GhostButton onClick={() => setEditing(null)}>Cancel</GhostButton>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div>
              <FieldLabel>Current Price ($)</FieldLabel>
              <TextInput type="number" value={editing.price} onChange={(v) => setEditing({ ...editing, price: v })} />
            </div>
            <div>
              <FieldLabel>Target Price ($)</FieldLabel>
              <TextInput type="number" value={editing.target_price} onChange={(v) => setEditing({ ...editing, target_price: v })} />
            </div>
          </div>
        )}
      </EditModal>
    </div>
  );
}
