import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

export async function resolveTenant(): Promise<
  | { supabase: SupabaseClient; restaurantId: string; userId: string }
  | NextResponse
> {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabase();
  const { data: restaurant, error } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (error || !restaurant) {
    return NextResponse.json({ error: 'No restaurant found for this user' }, { status: 404 });
  }

  return { supabase, restaurantId: restaurant.restaurant_id, userId };
}

// ---------------------------------------------------------------------------
// Case transform: frontend uses camelCase, DB uses snake_case.
// These helpers auto-map in both directions so components stay readable.
// ---------------------------------------------------------------------------

const snakeCache = new Map<string, string>();

function toSnake(key: string): string {
  const cached = snakeCache.get(key);
  if (cached) return cached;
  const out = key.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
  snakeCache.set(key, out);
  return out;
}

// toCamel removed — camelCase conversion no longer needed since API returns raw DB rows

function objToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k in obj) {
    out[toSnake(k)] = obj[k];
  }
  return out;
}

// (objToCamel removed — API returns raw snake_case now, input still accepts camelCase via toSnake in pickFields)

// (rowsToCamel was here — removed, API returns raw snake_case rows now)

// ---------------------------------------------------------------------------
// CRUD router builders
// ---------------------------------------------------------------------------

function getId(request: Request): string | null {
  const url = new URL(request.url);
  return url.searchParams.get('id');
}

/**
 * Filter an incoming (camelCase) payload against allowed DB columns (snake_case).
 * Converts the payload to snake_case and drops unknown fields.
 */
function pickFields(body: unknown, allowed: readonly string[]): Record<string, unknown> {
  if (!body || typeof body !== 'object') return {};
  const snakeInput = objToSnake(body as Record<string, unknown>);
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in snakeInput) out[key] = snakeInput[key];
  }
  return out;
}

export function crudGet(table: string, orderBy?: { column: string; ascending?: boolean }) {
  return async function GET() {
    const ctx = await resolveTenant();
    if (ctx instanceof NextResponse) return ctx;

    let query = ctx.supabase.from(table).select('*').eq('restaurant_id', ctx.restaurantId);
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data || []);
  };
}

export function crudPost(table: string, allowedFields: readonly string[]) {
  return async function POST(request: Request) {
    const ctx = await resolveTenant();
    if (ctx instanceof NextResponse) return ctx;

    const body = await request.json().catch(() => null);
    const fields = pickFields(body, allowedFields);

    const { data, error } = await ctx.supabase
      .from(table)
      .insert({ ...fields, restaurant_id: ctx.restaurantId })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  };
}

export function crudPatch(
  table: string,
  allowedFields: readonly string[],
  idColumn = 'id'
) {
  return async function PATCH(request: Request) {
    const ctx = await resolveTenant();
    if (ctx instanceof NextResponse) return ctx;

    const id = getId(request);
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const body = await request.json().catch(() => null);
    const fields = pickFields(body, allowedFields);

    const { data, error } = await ctx.supabase
      .from(table)
      .update(fields)
      .eq(idColumn, id)
      .eq('restaurant_id', ctx.restaurantId)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(data);
  };
}

export function crudDelete(table: string, idColumn = 'id') {
  return async function DELETE(request: Request) {
    const ctx = await resolveTenant();
    if (ctx instanceof NextResponse) return ctx;

    const id = getId(request);
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await ctx.supabase
      .from(table)
      .delete()
      .eq(idColumn, id)
      .eq('restaurant_id', ctx.restaurantId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  };
}
