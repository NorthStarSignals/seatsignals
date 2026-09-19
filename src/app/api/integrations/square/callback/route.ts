import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { createServerSupabase } from '@/lib/supabase';
import { exchangeCodeForToken } from '@/lib/square';

/**
 * GET /api/integrations/square/callback?code=...&state=...
 *
 * Square redirects here after the merchant authorizes. We verify the CSRF
 * state cookie, exchange the code for a token, and persist the connection
 * on the tenant's row.
 *
 * On success → redirects to /dashboard/settings/integrations?connected=square
 * On failure → redirects with ?error=<code>
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  const settingsUrl = new URL('/dashboard/settings/integrations', url.origin);

  // Merchant declined / Square error
  if (errorParam) {
    settingsUrl.searchParams.set('error', errorParam);
    return NextResponse.redirect(settingsUrl);
  }

  if (!code || !state) {
    settingsUrl.searchParams.set('error', 'missing_params');
    return NextResponse.redirect(settingsUrl);
  }

  const cookieStore = cookies();
  const storedState = cookieStore.get('square_oauth_state')?.value;
  cookieStore.delete('square_oauth_state');
  if (!storedState || storedState !== state) {
    settingsUrl.searchParams.set('error', 'state_mismatch');
    return NextResponse.redirect(settingsUrl);
  }

  const { userId } = auth();
  if (!userId) {
    settingsUrl.searchParams.set('error', 'not_signed_in');
    return NextResponse.redirect(settingsUrl);
  }

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();
  if (!restaurant) {
    settingsUrl.searchParams.set('error', 'no_restaurant');
    return NextResponse.redirect(settingsUrl);
  }

  let token;
  try {
    token = await exchangeCodeForToken(code);
  } catch (e) {
    settingsUrl.searchParams.set('error', 'exchange_failed');
    settingsUrl.searchParams.set(
      'detail',
      encodeURIComponent(e instanceof Error ? e.message : 'unknown')
    );
    return NextResponse.redirect(settingsUrl);
  }

  const environment = (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase();

  // Upsert connection (one per restaurant+provider thanks to the unique constraint)
  const { error: upsertErr } = await supabase
    .from('pos_connections')
    .upsert(
      {
        restaurant_id: restaurant.restaurant_id,
        provider: 'square',
        merchant_id: token.merchant_id,
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_expires_at: token.expires_at,
        scopes: token.scope || null,
        environment,
        connected_at: new Date().toISOString(),
        status: 'active',
        last_error: null,
      },
      { onConflict: 'restaurant_id,provider' }
    );

  if (upsertErr) {
    settingsUrl.searchParams.set('error', 'persist_failed');
    settingsUrl.searchParams.set('detail', encodeURIComponent(upsertErr.message));
    return NextResponse.redirect(settingsUrl);
  }

  settingsUrl.searchParams.set('connected', 'square');
  return NextResponse.redirect(settingsUrl);
}
