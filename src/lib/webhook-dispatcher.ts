import { createServerSupabase } from '@/lib/supabase';
import crypto from 'crypto';

export type WebhookEvent =
  | 'customer.created' | 'customer.updated'
  | 'review.received' | 'review.responded'
  | 'lead.created' | 'lead.converted'
  | 'order.placed' | 'order.completed'
  | 'visit.recorded'
  | 'birthday.upcoming' | 'birthday.redeemed'
  | 'survey.completed';

interface WebhookRecord {
  id: string;
  restaurant_id: string;
  name: string;
  url: string;
  events: string[];
  secret: string | null;
  active: boolean;
  failure_count: number;
}

function computeSignature(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

async function sendWebhook(
  webhook: WebhookRecord,
  event: WebhookEvent,
  payload: Record<string, unknown>,
  restaurantId: string
) {
  const supabase = createServerSupabase();
  const body = JSON.stringify({
    event,
    payload,
    timestamp: new Date().toISOString(),
    restaurant_id: restaurantId,
  });

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'SeatSignals-Webhook/1.0',
  };

  if (webhook.secret) {
    headers['X-SeatSignals-Signature'] = computeSignature(webhook.secret, body);
  }

  let responseStatus = 0;
  let responseBody = '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    responseStatus = res.status;
    responseBody = (await res.text()).slice(0, 500);
  } catch (err: unknown) {
    responseStatus = 0;
    responseBody = (err instanceof Error ? err.message : 'Request failed').slice(0, 500);
  }

  // Log the attempt
  await supabase.from('webhook_logs').insert({
    webhook_id: webhook.id,
    event,
    payload: { ...payload, restaurant_id: restaurantId },
    response_status: responseStatus,
    response_body: responseBody,
  });

  const isSuccess = responseStatus >= 200 && responseStatus < 300;

  if (isSuccess) {
    await supabase
      .from('webhooks')
      .update({
        last_triggered: new Date().toISOString(),
        last_status: responseStatus,
        failure_count: 0,
      })
      .eq('id', webhook.id);
  } else {
    const newFailureCount = webhook.failure_count + 1;
    await supabase
      .from('webhooks')
      .update({
        last_triggered: new Date().toISOString(),
        last_status: responseStatus,
        failure_count: newFailureCount,
        ...(newFailureCount > 10 ? { active: false } : {}),
      })
      .eq('id', webhook.id);
  }

  return { status: responseStatus, body: responseBody };
}

export async function dispatchWebhook(
  restaurantId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const supabase = createServerSupabase();

  const { data: webhooks } = await supabase
    .from('webhooks')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .eq('active', true)
    .contains('events', [event]);

  if (!webhooks || webhooks.length === 0) return;

  // Fire-and-forget parallel dispatch
  Promise.allSettled(
    webhooks.map((wh: WebhookRecord) => sendWebhook(wh, event, payload, restaurantId))
  );
}

export async function dispatchTestWebhook(webhookId: string) {
  const supabase = createServerSupabase();

  const { data: webhook } = await supabase
    .from('webhooks')
    .select('*')
    .eq('id', webhookId)
    .single();

  if (!webhook) throw new Error('Webhook not found');

  const testPayload = {
    test: true,
    message: 'This is a test webhook from SeatSignals',
    sample_customer: {
      name: 'Jane Doe',
      email: 'jane@example.com',
      visit_count: 5,
    },
  };

  const result = await sendWebhook(
    webhook as WebhookRecord,
    'customer.created',
    testPayload,
    webhook.restaurant_id
  );

  return {
    success: result.status >= 200 && result.status < 300,
    status_code: result.status,
    response_preview: result.body,
  };
}
