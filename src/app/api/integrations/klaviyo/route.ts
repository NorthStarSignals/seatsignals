import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/api-helpers';
import { getAccount } from '@/lib/klaviyo';

/**
 * GET    /api/integrations/klaviyo          — status
 * POST   /api/integrations/klaviyo          — connect (body: { api_key })
 * DELETE /api/integrations/klaviyo          — disconnect
 *
 * API key stored in integration_connections.access_token, indexed by
 * (restaurant_id, provider='klaviyo').
 */

export async function GET() {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { data } = await ctx.supabase
    .from('integration_connections')
    .select('external_account_id, external_account_name, metadata, connected_at, last_synced_at, status, last_error')
    .eq('restaurant_id', ctx.restaurantId)
    .eq('provider', 'klaviyo')
    .maybeSingle();

  return NextResponse.json({ connection: data || null });
}

export async function POST(request: Request) {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;

  let apiKey: string;
  try {
    const body = await request.json();
    apiKey = String(body.api_key || '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!apiKey) {
    return NextResponse.json({ error: 'api_key required' }, { status: 400 });
  }
  if (!apiKey.startsWith('pk_')) {
    return NextResponse.json(
      { error: 'Invalid Klaviyo private API key (should start with "pk_")' },
      { status: 400 }
    );
  }

  // Validate against Klaviyo
  let account;
  try {
    account = await getAccount(apiKey);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to validate key' },
      { status: 400 }
    );
  }

  const { error } = await ctx.supabase
    .from('integration_connections')
    .upsert(
      {
        restaurant_id: ctx.restaurantId,
        provider: 'klaviyo',
        access_token: apiKey,
        external_account_id: account.id,
        external_account_name: account.contact_information?.organization_name || 'Klaviyo',
        metadata: { test_account: account.test_account, public_api_key: account.public_api_key },
        connected_at: new Date().toISOString(),
        status: 'active',
        last_error: null,
      },
      { onConflict: 'restaurant_id,provider' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    success: true,
    account: {
      id: account.id,
      name: account.contact_information?.organization_name,
      test_account: account.test_account,
    },
  });
}

export async function DELETE() {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { error } = await ctx.supabase
    .from('integration_connections')
    .delete()
    .eq('restaurant_id', ctx.restaurantId)
    .eq('provider', 'klaviyo');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
