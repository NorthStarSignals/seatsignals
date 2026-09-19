'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn, formatCurrency } from '@/lib/utils';
import {
  UtensilsCrossed,
  Plus,
  Minus,
  Trash2,
  Send,
  ShoppingCart,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string | null;
}

interface CategoryGroup {
  category: string;
  items: MenuItem[];
}

interface CartItem {
  menu_item_id: string;
  name: string;
  quantity: number;
  mods: string;
  price: number;
}

const TAX_RATE = 0.08;

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-zinc-800 rounded', className)} />;
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-seat-black p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <Skeleton className="h-8 w-72" />
        <div className="flex gap-3 mb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28" />
          ))}
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8 grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <div className="col-span-4">
            <Skeleton className="h-[600px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TableOrderPage() {
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [serverName, setServerName] = useState('');
  const [sending, setSending] = useState(false);

  const fetchMenu = useCallback(async () => {
    try {
      const res = await fetch('/api/table-order');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        if (data.categories?.length > 0 && !activeCategory) {
          setActiveCategory(data.categories[0].category);
        }
      }
    } catch {
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const addToCart = useCallback((item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menu_item_id === item.id);
      if (existing) {
        return prev.map(c =>
          c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menu_item_id: item.id, name: item.name, quantity: 1, mods: '', price: item.price }];
    });
    toast.success(`Added ${item.name}`);
  }, []);

  const updateQuantity = useCallback((menuItemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(c => c.menu_item_id === menuItemId ? { ...c, quantity: c.quantity + delta } : c)
        .filter(c => c.quantity > 0);
    });
  }, []);

  const updateMods = useCallback((menuItemId: string, mods: string) => {
    setCart(prev => prev.map(c => c.menu_item_id === menuItemId ? { ...c, mods } : c));
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setCart(prev => prev.filter(c => c.menu_item_id !== menuItemId));
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  const sendToKitchen = async () => {
    if (!tableNumber) { toast.error('Enter a table number'); return; }
    if (!serverName) { toast.error('Enter server name'); return; }
    if (cart.length === 0) { toast.error('Add items to the order'); return; }

    setSending(true);
    try {
      const res = await fetch('/api/table-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_number: parseInt(tableNumber, 10),
          server_name: serverName,
          items: cart,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Order ${data.order.order_id} sent to kitchen!`);
        setCart([]);
        setTableNumber('');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to submit order');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSending(false);
    }
  };

  const activeCategoryData = categories.find(c => c.category === activeCategory);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-seat-black p-4 lg:p-6">
      <div className="max-w-[1800px] mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-seat-red/10 flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-seat-red" />
            </div>
            <h1 className="text-2xl font-bold text-white">Table-Side Ordering</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <label className="text-[10px] uppercase text-zinc-500 mb-1">Table #</label>
              <input
                type="number"
                value={tableNumber}
                onChange={e => setTableNumber(e.target.value)}
                placeholder="--"
                className="w-20 bg-seat-card border border-seat-border rounded-lg px-3 py-2 text-white text-center text-lg font-bold focus:outline-none focus:border-seat-red"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-[10px] uppercase text-zinc-500 mb-1">Server</label>
              <input
                type="text"
                value={serverName}
                onChange={e => setServerName(e.target.value)}
                placeholder="Server name"
                className="w-40 bg-seat-card border border-seat-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-seat-red"
              />
            </div>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat.category}
              onClick={() => setActiveCategory(cat.category)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                activeCategory === cat.category
                  ? 'bg-seat-red text-white'
                  : 'bg-seat-card border border-seat-border text-zinc-400 hover:text-white hover:border-zinc-500'
              )}
            >
              {cat.category}
            </button>
          ))}
        </div>

        {/* Main layout: menu + cart */}
        <div className="grid grid-cols-12 gap-4 lg:gap-6">
          {/* Menu items grid */}
          <div className="col-span-12 lg:col-span-8">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {activeCategoryData?.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className="bg-seat-card border border-seat-border rounded-xl p-4 text-left hover:border-seat-red/50 hover:bg-seat-card/80 transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white leading-tight">{item.name}</h3>
                    <div className="w-7 h-7 rounded-full bg-seat-red/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                      <Plus className="w-4 h-4 text-seat-red" />
                    </div>
                  </div>
                  {item.description && (
                    <p className="text-xs text-zinc-500 mb-2 line-clamp-1">{item.description}</p>
                  )}
                  <p className="text-sm font-bold text-seat-red">{formatCurrency(item.price)}</p>
                </button>
              ))}
            </div>
            {!activeCategoryData?.items.length && (
              <div className="flex items-center justify-center h-64 text-zinc-500">
                No items in this category
              </div>
            )}
          </div>

          {/* Cart / current order */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-seat-card border border-seat-border rounded-xl p-4 sticky top-4">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="w-5 h-5 text-seat-red" />
                <h2 className="text-lg font-bold text-white">Current Order</h2>
                {cart.length > 0 && (
                  <span className="ml-auto bg-seat-red/10 text-seat-red text-xs font-bold px-2 py-0.5 rounded-full">
                    {cart.reduce((sum, c) => sum + c.quantity, 0)} items
                  </span>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Tap menu items to add</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                  {cart.map(item => (
                    <div
                      key={item.menu_item_id}
                      className="bg-seat-black/50 border border-seat-border rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{item.name}</p>
                          <p className="text-xs text-zinc-500">{formatCurrency(item.price)} each</p>
                        </div>
                        <button
                          onClick={() => removeItem(item.menu_item_id)}
                          className="text-zinc-500 hover:text-red-400 transition-colors ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => updateQuantity(item.menu_item_id, -1)}
                          className="w-7 h-7 rounded-md bg-seat-border flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-600 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-sm font-bold text-white w-6 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.menu_item_id, 1)}
                          className="w-7 h-7 rounded-md bg-seat-border flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-600 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <span className="ml-auto text-sm font-semibold text-white">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={item.mods}
                        onChange={e => updateMods(item.menu_item_id, e.target.value)}
                        placeholder="Mods (e.g. no onions, extra sauce)"
                        className="w-full bg-seat-black border border-seat-border rounded-md px-2 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Totals */}
              <div className="mt-4 pt-4 border-t border-seat-border space-y-2">
                <div className="flex justify-between text-sm text-zinc-400">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-zinc-400">
                  <span>Tax (8%)</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-white pt-1">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Send button */}
              <button
                onClick={sendToKitchen}
                disabled={sending || cart.length === 0}
                className={cn(
                  'mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-bold transition-all',
                  cart.length > 0
                    ? 'bg-seat-red text-white hover:bg-red-600 active:scale-[0.98]'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                )}
              >
                <Send className="w-4 h-4" />
                {sending ? 'Sending...' : 'Send to Kitchen'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
