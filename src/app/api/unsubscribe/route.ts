import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { addToDoNotContact, logConsent } from '@/lib/compliance';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');
  const restaurantId = request.nextUrl.searchParams.get('restaurant_id');

  if (!email || !restaurantId) {
    return new NextResponse(
      buildHtmlPage('Invalid Request', 'Missing required parameters.'),
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    );
  }

  const supabase = createServerSupabase();

  // Get restaurant name
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name')
    .eq('restaurant_id', restaurantId)
    .single();

  if (!restaurant) {
    return new NextResponse(
      buildHtmlPage('Not Found', 'Restaurant not found.'),
      { status: 404, headers: { 'Content-Type': 'text/html' } }
    );
  }

  // Find customer by email
  const { data: customer } = await supabase
    .from('customers')
    .select('customer_id')
    .eq('restaurant_id', restaurantId)
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  try {
    // Add to DNC list
    await addToDoNotContact({
      restaurantId,
      contactType: 'email',
      contactValue: email,
      reason: 'unsubscribed',
      customerId: customer?.customer_id,
      addedBy: 'system',
    });

    // Log consent changes
    await logConsent({
      restaurantId,
      customerId: customer?.customer_id,
      consentType: 'email_opt_in',
      consented: false,
      source: 'unsubscribe_link',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });

    await logConsent({
      restaurantId,
      customerId: customer?.customer_id,
      consentType: 'sms_opt_in',
      consented: false,
      source: 'unsubscribe_link',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });

    return new NextResponse(
      buildHtmlPage(
        'Unsubscribed',
        `You've been unsubscribed. You will no longer receive messages from ${restaurant.name}.`
      ),
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  } catch {
    return new NextResponse(
      buildHtmlPage('Error', 'Something went wrong. Please try again later.'),
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

function buildHtmlPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - SeatSignals</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: Inter, system-ui, -apple-system, sans-serif;
      background: #09090B;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #1C1C21;
      border: 1px solid #27272A;
      border-radius: 12px;
      padding: 48px;
      max-width: 480px;
      text-align: center;
    }
    h1 { font-size: 24px; margin-bottom: 16px; }
    p { color: #a1a1aa; font-size: 16px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}
