'use client';

import { useState } from 'react';
import { CreditCard, Smartphone, Receipt, CheckCircle2, Plus, Minus } from 'lucide-react';

const checkItems = [
  { id: 1, name: 'Truffle Pasta', qty: 2, price: 28.00 },
  { id: 2, name: 'Pan-Seared Sea Bass', qty: 1, price: 38.00 },
  { id: 3, name: 'Caesar Salad', qty: 2, price: 14.00 },
  { id: 4, name: 'Glass of Chardonnay', qty: 3, price: 14.00 },
  { id: 5, name: 'Tiramisu', qty: 2, price: 12.00 },
];

export default function TableSidePaymentPage() {
  const [tipPercent, setTipPercent] = useState(20);
  const [splitCount, setSplitCount] = useState(1);
  const [paid, setPaid] = useState(false);

  const subtotal = checkItems.reduce((s, i) => s + (i.qty * i.price), 0);
  const tax = subtotal * 0.0875;
  const tip = subtotal * (tipPercent / 100);
  const total = subtotal + tax + tip;
  const perPerson = total / splitCount;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Table-Side Payment</h1>
        <p className="text-seat-muted mt-1">Table 12 · Server: Marco S. · 5 guests</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-seat-card border border-seat-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-seat-red" />
            Check Detail
          </h3>
          <div className="space-y-2">
            {checkItems.map(item => (
              <div key={item.id} className="flex items-center justify-between py-3 border-b border-seat-border/50">
                <div className="flex items-center gap-3">
                  <span className="text-seat-muted text-sm">{item.qty}×</span>
                  <span className="text-white">{item.name}</span>
                </div>
                <span className="text-white font-medium">${(item.qty * item.price).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-seat-muted">Subtotal</span><span className="text-white">${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-seat-muted">Tax (8.75%)</span><span className="text-white">${tax.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-seat-muted">Tip ({tipPercent}%)</span><span className="text-white">${tip.toFixed(2)}</span></div>
            <div className="flex justify-between pt-3 border-t-2 border-seat-border">
              <span className="text-white font-bold text-lg">Total</span>
              <span className="text-white font-bold text-lg">${total.toFixed(2)}</span>
            </div>
            {splitCount > 1 && (
              <div className="flex justify-between text-seat-red font-bold pt-2">
                <span>Per person ({splitCount} ways)</span>
                <span>${perPerson.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-seat-card border border-seat-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Tip</h3>
            <div className="grid grid-cols-4 gap-2">
              {[15, 18, 20, 25].map(p => (
                <button
                  key={p}
                  onClick={() => setTipPercent(p)}
                  className={`py-3 rounded-lg border font-medium transition ${
                    tipPercent === p
                      ? 'bg-seat-red border-seat-red text-white'
                      : 'bg-seat-black border-seat-border text-white hover:border-seat-red'
                  }`}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          <div className="bg-seat-card border border-seat-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Split Check</h3>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSplitCount(Math.max(1, splitCount - 1))}
                className="w-12 h-12 bg-seat-black border border-seat-border rounded-lg text-white flex items-center justify-center hover:border-seat-red"
              >
                <Minus className="w-5 h-5" />
              </button>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">{splitCount}</div>
                <div className="text-xs text-seat-muted">{splitCount === 1 ? 'no split' : 'ways'}</div>
              </div>
              <button
                onClick={() => setSplitCount(Math.min(10, splitCount + 1))}
                className="w-12 h-12 bg-seat-black border border-seat-border rounded-lg text-white flex items-center justify-center hover:border-seat-red"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-seat-card border border-seat-border rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Payment Method</h3>
            <div className="space-y-2">
              <button className="w-full flex items-center gap-3 p-3 bg-seat-black border border-seat-border rounded-lg text-white hover:border-seat-red">
                <CreditCard className="w-5 h-5 text-seat-red" />
                <span>Tap to Pay</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 bg-seat-black border border-seat-border rounded-lg text-white hover:border-seat-red">
                <Smartphone className="w-5 h-5 text-seat-red" />
                <span>Apple / Google Pay</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 bg-seat-black border border-seat-border rounded-lg text-white hover:border-seat-red">
                <Receipt className="w-5 h-5 text-seat-red" />
                <span>Cash</span>
              </button>
            </div>
            <button
              onClick={() => setPaid(true)}
              className="w-full mt-4 bg-seat-red hover:bg-seat-red/90 text-white py-3 rounded-lg font-bold text-lg"
            >
              Charge ${perPerson.toFixed(2)}
            </button>
          </div>
        </div>
      </div>

      {paid && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setPaid(false)}>
          <div className="bg-seat-card border border-seat-border rounded-xl p-8 max-w-md text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Payment Approved</h3>
            <p className="text-seat-muted">${perPerson.toFixed(2)} charged successfully</p>
            <button className="mt-6 px-6 py-2 bg-seat-red text-white rounded-lg" onClick={() => setPaid(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
