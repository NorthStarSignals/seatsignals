'use client';

import { useState } from 'react';
import { ChefHat, Calculator, Users } from 'lucide-react';

const recipes = [
  {
    id: 'pasta',
    name: 'Truffle Pasta',
    yield: 4,
    sellPrice: 28,
    ingredients: [
      { name: 'Fresh pasta', qty: 1, unit: 'lb', costPerUnit: 6.50 },
      { name: 'Truffle oil', qty: 2, unit: 'tbsp', costPerUnit: 1.25 },
      { name: 'Parmesan', qty: 0.5, unit: 'cup', costPerUnit: 3.20 },
      { name: 'Heavy cream', qty: 1, unit: 'cup', costPerUnit: 1.80 },
      { name: 'Butter', qty: 4, unit: 'tbsp', costPerUnit: 0.45 },
      { name: 'Black truffle', qty: 0.25, unit: 'oz', costPerUnit: 18.00 },
    ],
  },
  {
    id: 'seabass',
    name: 'Pan-Seared Sea Bass',
    yield: 2,
    sellPrice: 38,
    ingredients: [
      { name: 'Sea bass fillet', qty: 12, unit: 'oz', costPerUnit: 1.80 },
      { name: 'Lemon', qty: 1, unit: 'whole', costPerUnit: 0.75 },
      { name: 'Olive oil', qty: 3, unit: 'tbsp', costPerUnit: 0.30 },
      { name: 'Capers', qty: 2, unit: 'tbsp', costPerUnit: 0.85 },
      { name: 'White wine', qty: 0.5, unit: 'cup', costPerUnit: 2.10 },
    ],
  },
];

export default function RecipeScalingPage() {
  const [selected, setSelected] = useState(recipes[0]);
  const [targetYield, setTargetYield] = useState(selected.yield);

  const factor = targetYield / selected.yield;
  const totalCost = selected.ingredients.reduce((s, i) => s + (i.qty * i.costPerUnit * factor), 0);
  const totalRevenue = (selected.sellPrice / selected.yield) * targetYield;
  const margin = ((totalRevenue - totalCost) / totalRevenue) * 100;
  const costPerServing = totalCost / targetYield;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Recipe Scaling Calculator</h1>
        <p className="text-seat-muted mt-1">Scale recipes precisely for any party size while tracking cost and margin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-seat-card border border-seat-border rounded-xl p-6 lg:col-span-1">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-seat-red" />
            Select Recipe
          </h3>
          <div className="space-y-2">
            {recipes.map(r => (
              <button
                key={r.id}
                onClick={() => { setSelected(r); setTargetYield(r.yield); }}
                className={`w-full text-left p-3 rounded-lg border transition ${
                  selected.id === r.id
                    ? 'bg-seat-red/10 border-seat-red'
                    : 'bg-seat-black border-seat-border hover:border-seat-red/50'
                }`}
              >
                <div className="text-white font-medium">{r.name}</div>
                <div className="text-xs text-seat-muted">Base yield: {r.yield} servings · ${r.sellPrice}</div>
              </button>
            ))}
          </div>

          <div className="mt-6">
            <label className="text-sm text-seat-muted mb-2 block flex items-center gap-2">
              <Users className="w-4 h-4" /> Target Servings
            </label>
            <input
              type="number"
              value={targetYield}
              onChange={(e) => setTargetYield(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-seat-black border border-seat-border rounded-lg px-4 py-2 text-white text-2xl font-bold"
            />
            <div className="text-xs text-seat-muted mt-2">Scaling factor: {factor.toFixed(2)}×</div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="bg-seat-black border border-seat-border rounded-lg p-3">
              <div className="text-xs text-seat-muted">Total Cost</div>
              <div className="text-lg font-bold text-white">${totalCost.toFixed(2)}</div>
            </div>
            <div className="bg-seat-black border border-seat-border rounded-lg p-3">
              <div className="text-xs text-seat-muted">Per Serving</div>
              <div className="text-lg font-bold text-white">${costPerServing.toFixed(2)}</div>
            </div>
            <div className="bg-seat-black border border-seat-border rounded-lg p-3">
              <div className="text-xs text-seat-muted">Revenue</div>
              <div className="text-lg font-bold text-white">${totalRevenue.toFixed(2)}</div>
            </div>
            <div className="bg-seat-black border border-seat-border rounded-lg p-3">
              <div className="text-xs text-seat-muted">Margin</div>
              <div className="text-lg font-bold text-green-500">{margin.toFixed(0)}%</div>
            </div>
          </div>
        </div>

        <div className="bg-seat-card border border-seat-border rounded-xl p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-seat-red" />
            Scaled Ingredients
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-seat-border text-seat-muted">
                  <th className="text-left py-3 px-2">Ingredient</th>
                  <th className="text-right py-3 px-2">Base Qty</th>
                  <th className="text-right py-3 px-2">Scaled Qty</th>
                  <th className="text-right py-3 px-2">Unit Cost</th>
                  <th className="text-right py-3 px-2">Total Cost</th>
                </tr>
              </thead>
              <tbody>
                {selected.ingredients.map((ing, i) => {
                  const scaledQty = ing.qty * factor;
                  const cost = scaledQty * ing.costPerUnit;
                  return (
                    <tr key={i} className="border-b border-seat-border/50">
                      <td className="py-3 px-2 text-white">{ing.name}</td>
                      <td className="py-3 px-2 text-right text-seat-muted">{ing.qty} {ing.unit}</td>
                      <td className="py-3 px-2 text-right text-white font-medium">{scaledQty.toFixed(2)} {ing.unit}</td>
                      <td className="py-3 px-2 text-right text-seat-muted">${ing.costPerUnit.toFixed(2)}</td>
                      <td className="py-3 px-2 text-right text-white">${cost.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-seat-border">
                  <td colSpan={4} className="py-3 px-2 text-right text-seat-muted font-medium">Total Cost</td>
                  <td className="py-3 px-2 text-right text-white font-bold">${totalCost.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
            {[2, 4, 8, 12, 24, 50].map(n => (
              <button
                key={n}
                onClick={() => setTargetYield(n)}
                className="px-3 py-2 bg-seat-black border border-seat-border hover:border-seat-red text-white rounded-lg text-sm"
              >
                Scale to {n}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
