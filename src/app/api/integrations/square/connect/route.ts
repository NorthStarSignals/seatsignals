import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { buildAuthorizeUrl } from '@/lib/square';
import crypto from 'crypto';

/**
 * GET /api/integrations/square/connect
 *
 * Starts the Square OAuth flow. Generates a CSRF state token, stashes it in
 * an httpOnly cookie, and redirects the merchant to Square's authorize page.
 * Clerk must have a session — we can't attach the connection to a restaurant
 * otherwise.
 */
export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const state = crypto.randomBytes(24).toString('base64url');

  // httpOnly, sameSite=lax so the cookie survives the Square → us redirect
  cookies().set('square_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60, // 10 min — OAuth dance should take seconds
  });

  const url = buildAuthorizeUrl({ state });
  return NextResponse.redirect(url);
}
