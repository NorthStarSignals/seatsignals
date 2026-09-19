import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const COST_PER_MESSAGE: Record<string, number> = {
  sms: 0.01,
  email: 0.001,
  both: 0.0055, // average of sms + email
};

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;

  // Fetch all sequence definitions for this restaurant
  const { data: definitions } = await supabase
    .from('sequence_definitions')
    .select('id, type, name, channel')
    .eq('restaurant_id', rid);

  const allDefs = definitions || [];

  // Fetch all sequences (messages) for this restaurant
  const { data: sequences } = await supabase
    .from('sequences')
    .select('sequence_id, customer_id, type, sent_at, opened, clicked, converted')
    .eq('restaurant_id', rid);

  const allSequences = sequences || [];

  // Fetch visits for revenue attribution (visits within 7 days of a conversion)
  const { data: visits } = await supabase
    .from('visits')
    .select('customer_id, timestamp, spend_amount')
    .eq('restaurant_id', rid);

  const allVisits = visits || [];

  // Group sequences by type
  const sequencesByType: Record<string, typeof allSequences> = {};
  for (const seq of allSequences) {
    const t = seq.type;
    if (!sequencesByType[t]) sequencesByType[t] = [];
    sequencesByType[t].push(seq);
  }

  // Build campaign stats
  const campaigns = allDefs.map((def) => {
    const typeSequences = sequencesByType[def.type] || [];
    const sent = typeSequences.length;
    const opened = typeSequences.filter((s) => s.opened).length;
    const clicked = typeSequences.filter((s) => s.clicked).length;
    const converted = typeSequences.filter((s) => s.converted).length;

    const open_rate = sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0;
    const click_rate = sent > 0 ? Math.round((clicked / sent) * 1000) / 10 : 0;
    const conversion_rate = sent > 0 ? Math.round((converted / sent) * 1000) / 10 : 0;

    // Revenue attribution: for converted sequences, find visits within 7 days of conversion
    let revenue = 0;
    const convertedSequences = typeSequences.filter((s) => s.converted);
    for (const seq of convertedSequences) {
      const sentDate = new Date(seq.sent_at);
      const windowEnd = new Date(sentDate.getTime() + 7 * 24 * 60 * 60 * 1000);

      const attributedVisits = allVisits.filter(
        (v) =>
          v.customer_id === seq.customer_id &&
          new Date(v.timestamp) >= sentDate &&
          new Date(v.timestamp) <= windowEnd
      );

      for (const visit of attributedVisits) {
        revenue += visit.spend_amount || 0;
      }
    }

    revenue = Math.round(revenue * 100) / 100;

    const costRate = COST_PER_MESSAGE[def.channel] || 0.005;
    const cost = Math.round(sent * costRate * 100) / 100;
    const roi = cost > 0 ? Math.round(((revenue - cost) / cost) * 100 * 10) / 10 : 0;

    return {
      id: def.id,
      name: def.name,
      type: def.type,
      channel: def.channel,
      sent,
      opened,
      clicked,
      converted,
      open_rate,
      click_rate,
      conversion_rate,
      revenue,
      cost,
      roi,
    };
  });

  // Totals
  const total_sent = campaigns.reduce((sum, c) => sum + c.sent, 0);
  const total_converted = campaigns.reduce((sum, c) => sum + c.converted, 0);
  const total_revenue = Math.round(campaigns.reduce((sum, c) => sum + c.revenue, 0) * 100) / 100;
  const total_cost = Math.round(campaigns.reduce((sum, c) => sum + c.cost, 0) * 100) / 100;
  const overall_roi =
    total_cost > 0
      ? Math.round(((total_revenue - total_cost) / total_cost) * 100 * 10) / 10
      : 0;

  return NextResponse.json({
    campaigns,
    totals: {
      total_sent,
      total_converted,
      total_revenue,
      total_cost,
      overall_roi,
    },
  });
}
