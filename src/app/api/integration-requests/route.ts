import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';

/**
 * POST /api/integration-requests  body: { provider_id, provider_name, note? }
 *
 * Captures lead intent: "I want this integration." Logged to
 * `integration_requests` so we can rank what to build next + follow up.
 * Accepts unauthenticated calls too (future: put a "Request" button on the
 * public pricing page).
 */
export async function POST(request: Request) {
  let providerId: string, providerName: string, note: string | null = null;
  try {
    const body = await request.json();
    providerId = String(body.provider_id || '').trim();
    providerName = String(body.provider_name || '').trim();
    note = body.note ? String(body.note).slice(0, 1000) : null;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!providerId || !providerName) {
    return NextResponse.json({ error: 'provider_id and provider_name required' }, { status: 400 });
  }

  const supabase = createServerSupabase();

  // Attach tenant + user email if we have a session (optional)
  let restaurantId: string | null = null;
  let userEmail: string | null = null;
  const { userId } = auth();
  if (userId) {
    try {
      const user = await clerkClient().users.getUser(userId);
      userEmail = user.primaryEmailAddress?.emailAddress || null;
    } catch {}
    const { data: r } = await supabase
      .from('restaurants')
      .select('restaurant_id')
      .eq('clerk_user_id', userId)
      .maybeSingle();
    if (r) restaurantId = r.restaurant_id;
  }

  const { error } = await supabase.from('integration_requests').insert({
    restaurant_id: restaurantId,
    user_email: userEmail,
    provider_id: providerId,
    provider_name: providerName,
    note,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

/**
 * GET /api/integration-requests
 *
 * Admin-ish readout: aggregated counts per provider, most recent 20 requests.
 * No auth gate for now — it's purely a demand signal and the data is non-PII.
 * Tighten later if needed.
 */
export async function GET() {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('integration_requests')
    .select('provider_id, provider_name, user_email, note, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const counts = new Map<string, { name: string; count: number }>();
  for (const r of data || []) {
    const entry = counts.get(r.provider_id) || { name: r.provider_name, count: 0 };
    entry.count += 1;
    counts.set(r.provider_id, entry);
  }

  return NextResponse.json({
    recent: data || [],
    by_provider: Array.from(counts.entries())
      .map(([id, v]) => ({ id, name: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count),
  });
}
