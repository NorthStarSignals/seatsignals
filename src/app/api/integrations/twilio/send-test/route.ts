import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/api-helpers';
import { sendSms } from '@/lib/twilio';

/**
 * POST /api/integrations/twilio/send-test  body: { from, to, body? }
 *
 * Sends a single test SMS using the connected Twilio account. Used by the
 * "Send test message" button on the integrations panel.
 */
export async function POST(request: Request) {
  const ctx = await resolveTenant();
  if (ctx instanceof NextResponse) return ctx;

  let from: string, to: string, body: string;
  try {
    const b = await request.json();
    from = String(b.from || '').trim();
    to = String(b.to || '').trim();
    body = String(b.body || 'Test message from SeatSignals 🎉').slice(0, 160);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!from || !to) {
    return NextResponse.json({ error: 'from and to required' }, { status: 400 });
  }

  const { data: conn } = await ctx.supabase
    .from('integration_connections')
    .select('external_account_id, access_token')
    .eq('restaurant_id', ctx.restaurantId)
    .eq('provider', 'twilio')
    .single();

  if (!conn || !conn.access_token || !conn.external_account_id) {
    return NextResponse.json({ error: 'Twilio not connected' }, { status: 400 });
  }

  try {
    const msg = await sendSms({
      accountSid: conn.external_account_id,
      authToken: conn.access_token,
      from,
      to,
      body,
    });
    return NextResponse.json({ success: true, sid: msg.sid, status: msg.status });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'send failed' },
      { status: 502 }
    );
  }
}
