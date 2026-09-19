import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/api-helpers';
import { getAccount, listPhoneNumbers } from '@/lib/twilio';

/**
 * GET    /api/integrations/twilio          — status + numbers
 * POST   /api/integrations/twilio          — connect (body: { account_sid, auth_token })
 * DELETE /api/integrations/twilio          — disconnect
 *
 * Credentials stored in integration_connections with access_token = auth_token
 * and external_account_id = account_sid. Listed phone numbers cached in
 * metadata so we can show a sender picker without re-hitting Twilio.
 */

export async function GET() {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { data } = await ctx.supabase
    .from('integration_connections')
    .select('external_account_id, external_account_name, metadata, connected_at, last_synced_at, status, last_error')
    .eq('restaurant_id', ctx.restaurantId)
    .eq('provider', 'twilio')
    .maybeSingle();

  return NextResponse.json({ connection: data || null });
}

export async function POST(request: Request) {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;

  let accountSid: string, authToken: string;
  try {
    const body = await request.json();
    accountSid = String(body.account_sid || '').trim();
    authToken = String(body.auth_token || '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!accountSid || !authToken) {
    return NextResponse.json({ error: 'account_sid and auth_token required' }, { status: 400 });
  }
  if (!accountSid.startsWith('AC') || accountSid.length < 20) {
    return NextResponse.json({ error: 'Account SID should start with "AC"' }, { status: 400 });
  }

  // Validate
  let account;
  let numbers;
  try {
    account = await getAccount(accountSid, authToken);
    numbers = await listPhoneNumbers(accountSid, authToken);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Invalid credentials' },
      { status: 400 }
    );
  }

  const { error } = await ctx.supabase
    .from('integration_connections')
    .upsert(
      {
        restaurant_id: ctx.restaurantId,
        provider: 'twilio',
        access_token: authToken,
        external_account_id: accountSid,
        external_account_name: account.friendly_name,
        metadata: {
          numbers: numbers.map((n) => ({
            sid: n.sid,
            phone_number: n.phone_number,
            friendly_name: n.friendly_name,
            sms: !!n.capabilities?.sms,
          })),
          account_status: account.status,
          account_type: account.type,
        },
        connected_at: new Date().toISOString(),
        status: 'active',
        last_error: null,
      },
      { onConflict: 'restaurant_id,provider' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    success: true,
    account: { sid: account.sid, name: account.friendly_name, type: account.type },
    numbers: numbers.length,
  });
}

export async function DELETE() {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;

  const { error } = await ctx.supabase
    .from('integration_connections')
    .delete()
    .eq('restaurant_id', ctx.restaurantId)
    .eq('provider', 'twilio');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
