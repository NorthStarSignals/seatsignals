import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

/**
 * Daily/Weekly Digest Email Preview
 * Generates an HTML email preview with key metrics
 */

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Customers
  const { data: allCustomers } = await supabase
    .from('customers')
    .select('customer_id, first_name, visit_count, total_spend, first_seen, last_visit')
    .eq('restaurant_id', rid);

  const customers = allCustomers || [];
  const newToday = customers.filter(c => c.first_seen && new Date(c.first_seen) >= yesterday);
  const activeThisWeek = customers.filter(c => c.last_visit && new Date(c.last_visit) >= sevenDaysAgo);
  const totalRevenue = customers.reduce((s, c) => s + (c.total_spend || 0), 0);

  // Reviews
  const { data: recentReviews } = await supabase
    .from('cortex_review_sentiment')
    .select('author, rating, sentiment_label, summary, analyzed_at')
    .eq('restaurant_id', rid)
    .gte('analyzed_at', yesterday.toISOString())
    .order('analyzed_at', { ascending: false })
    .limit(5);

  // Build HTML preview
  const html = buildDigestHTML({
    restaurantName: restaurant.name,
    date: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    totalCustomers: customers.length,
    newCustomers: newToday.length,
    activeThisWeek: activeThisWeek.length,
    totalRevenue,
    recentReviews: recentReviews || [],
  });

  return NextResponse.json({ html });
}

interface DigestData {
  restaurantName: string;
  date: string;
  totalCustomers: number;
  newCustomers: number;
  activeThisWeek: number;
  totalRevenue: number;
  recentReviews: Array<{
    author: string;
    rating: number;
    sentiment_label: string;
    summary: string;
  }>;
}

function buildDigestHTML(data: DigestData): string {
  const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

  const reviewRows = data.recentReviews.map(r => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333">${r.author}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#f59e0b">${stars(r.rating)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;color:#666">${r.summary || ''}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff">
    <!-- Header -->
    <tr>
      <td style="background:#09090B;padding:24px 32px;text-align:center">
        <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700">
          Seat<span style="color:#E11D48">Signals</span>
        </h1>
        <p style="margin:4px 0 0;color:#a1a1aa;font-size:11px;letter-spacing:1px">DAILY DIGEST</p>
      </td>
    </tr>

    <!-- Date -->
    <tr>
      <td style="padding:20px 32px 8px;text-align:center">
        <p style="margin:0;color:#666;font-size:13px">${data.restaurantName} — ${data.date}</p>
      </td>
    </tr>

    <!-- Metrics -->
    <tr>
      <td style="padding:16px 32px">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="25%" style="text-align:center;padding:12px">
              <p style="margin:0;font-size:24px;font-weight:700;color:#09090B">${data.totalCustomers}</p>
              <p style="margin:4px 0 0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px">Total Customers</p>
            </td>
            <td width="25%" style="text-align:center;padding:12px">
              <p style="margin:0;font-size:24px;font-weight:700;color:#22c55e">+${data.newCustomers}</p>
              <p style="margin:4px 0 0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px">New Today</p>
            </td>
            <td width="25%" style="text-align:center;padding:12px">
              <p style="margin:0;font-size:24px;font-weight:700;color:#3b82f6">${data.activeThisWeek}</p>
              <p style="margin:4px 0 0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px">Active 7d</p>
            </td>
            <td width="25%" style="text-align:center;padding:12px">
              <p style="margin:0;font-size:24px;font-weight:700;color:#09090B">$${data.totalRevenue.toLocaleString()}</p>
              <p style="margin:4px 0 0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.5px">Total Revenue</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Divider -->
    <tr><td style="padding:0 32px"><hr style="border:none;border-top:1px solid #eee;margin:0"></td></tr>

    <!-- Recent Reviews -->
    ${data.recentReviews.length > 0 ? `
    <tr>
      <td style="padding:20px 32px">
        <h2 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#09090B">Recent Reviews</h2>
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden">
          <tr style="background:#f9f9f9">
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#999;text-transform:uppercase">Author</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#999;text-transform:uppercase">Rating</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;color:#999;text-transform:uppercase">Summary</th>
          </tr>
          ${reviewRows}
        </table>
      </td>
    </tr>
    ` : ''}

    <!-- CTA -->
    <tr>
      <td style="padding:20px 32px;text-align:center">
        <a href="#" style="display:inline-block;padding:12px 28px;background:#E11D48;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">
          Open Dashboard →
        </a>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:20px 32px;text-align:center;border-top:1px solid #eee">
        <p style="margin:0;font-size:11px;color:#999">
          You're receiving this because you enabled daily digests in SeatSignals.
        </p>
        <p style="margin:4px 0 0;font-size:11px;color:#ccc">
          <a href="#" style="color:#999">Unsubscribe</a> · <a href="#" style="color:#999">Settings</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
