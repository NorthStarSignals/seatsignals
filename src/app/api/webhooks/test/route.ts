import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { dispatchTestWebhook } from '@/lib/webhook-dispatcher';

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await req.json();
  const { webhook_id } = body;

  if (!webhook_id) {
    return NextResponse.json({ error: 'webhook_id is required' }, { status: 400 });
  }

  // Verify ownership
  const { data: webhook } = await supabase
    .from('webhooks')
    .select('restaurant_id')
    .eq('id', webhook_id)
    .single();

  if (!webhook || webhook.restaurant_id !== restaurant.restaurant_id) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  try {
    const result = await dispatchTestWebhook(webhook_id);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
