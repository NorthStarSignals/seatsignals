import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/api-helpers';
import { listLocations } from '@/lib/square';

/**
 * POST /api/integrations/square/seed-demo-orders?count=20
 *
 * Seeds a fake restaurant into the connected Square sandbox:
 *   1. Creates a small catalog of 10 items (upsert — safe to re-run)
 *   2. Creates `count` completed orders referencing those items
 *
 * Uses SQUARE_SANDBOX_PAT because OAuth only granted read scopes. Dead code
 * once a real merchant is using SeatSignals; leave it here for demo/QA.
 *
 * All timestamps come from Square (created at request time) — we can't
 * back-date orders via CreateOrder. Sparkline will show today only.
 */

const DEMO_MENU = [
  { name: 'Filet Mignon', price_cents: 4800, category: 'Entree' },
  { name: 'Grilled Salmon', price_cents: 2800, category: 'Entree' },
  { name: 'Lobster Linguine', price_cents: 4200, category: 'Entree' },
  { name: 'Chicken Parmesan', price_cents: 2400, category: 'Entree' },
  { name: 'Caesar Salad', price_cents: 1400, category: 'Appetizer' },
  { name: 'Bruschetta', price_cents: 1200, category: 'Appetizer' },
  { name: 'Truffle Fries', price_cents: 1200, category: 'Side' },
  { name: 'Chocolate Lava Cake', price_cents: 1400, category: 'Dessert' },
  { name: 'Tiramisu', price_cents: 1200, category: 'Dessert' },
  { name: 'House Wine (glass)', price_cents: 1400, category: 'Drink' },
];

function squareBase(): string {
  const env = (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase();
  return env === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';
}

async function squareFetch<T>(
  pat: string,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${squareBase()}${path}`, {
    ...init,
    headers: {
      'Square-Version': '2024-10-17',
      Authorization: `Bearer ${pat}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`${path} ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.json() as Promise<T>;
}

/** Upsert the demo catalog into Square via BatchUpsert, returning variation ids + prices. */
async function seedCatalog(
  pat: string
): Promise<Array<{ id: string; name: string; price_cents: number }>> {
  // Build BatchUpsert objects. Each item gets a single FIXED_PRICING variation.
  // `#temp` prefixes become the server-generated id on return.
  const objects = DEMO_MENU.flatMap((m, i) => [
    {
      type: 'ITEM',
      id: `#item-${i}`,
      present_at_all_locations: true,
      item_data: {
        name: m.name,
        description: `${m.category} · seeded demo item`,
        variations: [
          {
            type: 'ITEM_VARIATION',
            id: `#var-${i}`,
            present_at_all_locations: true,
            item_variation_data: {
              item_id: `#item-${i}`,
              name: 'Regular',
              pricing_type: 'FIXED_PRICING',
              price_money: { amount: m.price_cents, currency: 'USD' },
            },
          },
        ],
      },
    },
  ]);

  const body = {
    idempotency_key: `seat-catalog-seed-${Date.now()}`,
    batches: [{ objects }],
  };

  const resp = await squareFetch<{
    objects?: Array<{
      id: string;
      type: string;
      item_variation_data?: { price_money?: { amount: number }; name?: string; item_id?: string };
      item_data?: { name?: string };
    }>;
  }>(pat, '/v2/catalog/batch-upsert', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  // Build lookup: item_id -> item name
  const itemNameById = new Map<string, string>();
  for (const o of resp.objects || []) {
    if (o.type === 'ITEM' && o.item_data?.name) itemNameById.set(o.id, o.item_data.name);
  }

  const out: Array<{ id: string; name: string; price_cents: number }> = [];
  for (const o of resp.objects || []) {
    if (o.type !== 'ITEM_VARIATION') continue;
    const parentName = o.item_variation_data?.item_id
      ? itemNameById.get(o.item_variation_data.item_id) || 'Item'
      : 'Item';
    out.push({
      id: o.id,
      name: parentName,
      price_cents: o.item_variation_data?.price_money?.amount ?? 0,
    });
  }
  return out;
}

export async function POST(request: Request) {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;

  const pat = process.env.SQUARE_SANDBOX_PAT?.trim();
  if (!pat) {
    return NextResponse.json({ error: 'SQUARE_SANDBOX_PAT is not set' }, { status: 500 });
  }

  const url = new URL(request.url);
  const countParam = parseInt(url.searchParams.get('count') || '20', 10);
  const count = Math.min(Math.max(1, isNaN(countParam) ? 20 : countParam), 50);

  // Location
  const locations = await listLocations(pat);
  const active = locations.find((l) => l.status !== 'INACTIVE');
  if (!active) {
    return NextResponse.json({ error: 'No active locations found' }, { status: 400 });
  }

  // Seed catalog (idempotency_key makes this safe-ish to re-run but creates new items each call — ok for demo)
  let variations;
  try {
    variations = await seedCatalog(pat);
  } catch (e) {
    return NextResponse.json(
      { error: `Catalog seed failed: ${e instanceof Error ? e.message : e}` },
      { status: 500 }
    );
  }
  if (variations.length === 0) {
    return NextResponse.json({ error: 'No variations created' }, { status: 500 });
  }

  // Create orders
  const results: Array<{ orderId?: string; paymentId?: string; total_cents?: number; error?: string }> = [];
  const rand = (n: number) => Math.floor(Math.random() * n);

  for (let i = 0; i < count; i++) {
    try {
      const numLines = 1 + rand(4);
      const lineItems: Array<Record<string, unknown>> = [];
      for (let j = 0; j < numLines; j++) {
        const pick = variations[rand(variations.length)];
        const qty = 1 + rand(3);
        lineItems.push({
          quantity: String(qty),
          catalog_object_id: pick.id,
        });
      }

      const orderBody = await squareFetch<{
        order: { id: string; total_money?: { amount: number } };
      }>(pat, '/v2/orders', {
        method: 'POST',
        body: JSON.stringify({
          idempotency_key: `seat-order-${ctx.restaurantId}-${Date.now()}-${i}`,
          order: {
            location_id: active.id,
            line_items: lineItems,
            state: 'OPEN',
          },
        }),
      });
      const orderId = orderBody.order.id;
      const orderTotal = orderBody.order.total_money?.amount ?? 0;

      const payBody = await squareFetch<{ payment: { id: string } }>(pat, '/v2/payments', {
        method: 'POST',
        body: JSON.stringify({
          idempotency_key: `seat-pay-${ctx.restaurantId}-${Date.now()}-${i}`,
          source_id: 'cnon:card-nonce-ok',
          amount_money: { amount: orderTotal, currency: 'USD' },
          tip_money: { amount: Math.round(orderTotal * 0.18), currency: 'USD' },
          order_id: orderId,
          location_id: active.id,
          autocomplete: true,
        }),
      });

      results.push({ orderId, paymentId: payBody.payment.id, total_cents: orderTotal });
      await new Promise((r) => setTimeout(r, 120));
    } catch (e) {
      results.push({ error: e instanceof Error ? e.message : 'unknown' });
    }
  }

  const successful = results.filter((r) => r.paymentId).length;
  const totalRevenueCents = results
    .filter((r) => r.paymentId)
    .reduce((s, r) => s + (r.total_cents || 0), 0);

  return NextResponse.json({
    location_id: active.id,
    catalog_seeded_items: variations.length,
    orders_requested: count,
    orders_created: results.filter((r) => r.orderId).length,
    orders_paid: successful,
    total_revenue_cents: totalRevenueCents,
    sample_errors: results.filter((r) => r.error).slice(0, 3).map((r) => r.error),
  });
}
