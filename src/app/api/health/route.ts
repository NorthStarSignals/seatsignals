import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

/**
 * GET /api/health
 *
 * Lightweight ops endpoint. Pings Supabase, confirms core env vars are set,
 * reports which integrations are configured. Does NOT require auth — returns
 * only non-sensitive presence booleans (never values).
 *
 * Useful for: uptime monitors, Gunner pre-call sanity check, CI smoke tests.
 */
export async function GET() {
  const env = {
    clerk: !!process.env.CLERK_SECRET_KEY,
    supabase: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    stripe: !!process.env.STRIPE_SECRET_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    apify: !!process.env.APIFY_API_TOKEN,
    square_sandbox: !!process.env.SQUARE_APPLICATION_ID,
    square_prod: !!process.env.SQUARE_APPLICATION_ID_PROD,
    sentry: !!(process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN),
    cron_secret: !!process.env.CRON_SECRET,
  };

  // Supabase ping
  let supabaseOk = false;
  let supabaseErr: string | null = null;
  try {
    const s = createServerSupabase();
    const { error } = await s.from('restaurants').select('restaurant_id', { count: 'exact', head: true });
    if (error) throw new Error(error.message);
    supabaseOk = true;
  } catch (e) {
    supabaseErr = e instanceof Error ? e.message : 'unknown';
  }

  const squareEnv = (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase();
  const missingCritical = Object.entries(env)
    .filter(([k, v]) => !v && ['clerk', 'supabase', 'stripe'].includes(k))
    .map(([k]) => k);

  const status = supabaseOk && missingCritical.length === 0 ? 'ok' : 'degraded';

  return NextResponse.json(
    {
      status,
      service: 'seatsignals',
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'unknown',
      square_environment: squareEnv,
      supabase_ok: supabaseOk,
      supabase_error: supabaseErr,
      env,
      missing_critical: missingCritical,
      timestamp: new Date().toISOString(),
    },
    { status: status === 'ok' ? 200 : 503 }
  );
}
