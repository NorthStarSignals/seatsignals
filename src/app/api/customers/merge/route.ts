import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { primary_id, duplicate_ids } = body as { primary_id: string; duplicate_ids: string[] };

  if (!primary_id || !duplicate_ids?.length) {
    return NextResponse.json({ error: 'primary_id and duplicate_ids required' }, { status: 400 });
  }

  const allIds = [primary_id, ...duplicate_ids];

  // 1. Verify all customer IDs belong to this restaurant
  const { data: customers, error: fetchErr } = await supabase
    .from('customers')
    .select('*')
    .eq('restaurant_id', restaurant.restaurant_id)
    .in('customer_id', allIds);

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!customers || customers.length !== allIds.length) {
    return NextResponse.json({ error: 'Some customer IDs not found or do not belong to this restaurant' }, { status: 400 });
  }

  const primary = customers.find((c) => c.customer_id === primary_id)!;
  const duplicates = customers.filter((c) => c.customer_id !== primary_id);

  try {
    for (const dup of duplicates) {
      // 2. Reassign visits, sequences, birthday_events to primary
      await supabase
        .from('visits')
        .update({ customer_id: primary_id })
        .eq('customer_id', dup.customer_id);

      await supabase
        .from('sequences')
        .update({ customer_id: primary_id })
        .eq('customer_id', dup.customer_id);

      await supabase
        .from('birthday_events')
        .update({ customer_id: primary_id })
        .eq('customer_id', dup.customer_id);

      // Move tags (ignore conflicts due to UNIQUE constraint)
      await supabase
        .from('customer_tags')
        .update({ customer_id: primary_id })
        .eq('customer_id', dup.customer_id);

      // 3. Merge fields: fill in blanks on primary from duplicate
      const mergeFields: Record<string, unknown> = {};
      const fieldsToCopy = [
        'phone', 'email', 'birthday', 'company', 'job_title',
        'linkedin_url', 'instagram_handle', 'twitter_handle',
      ] as const;

      for (const field of fieldsToCopy) {
        if (!primary[field] && dup[field]) {
          mergeFields[field] = dup[field];
          (primary as Record<string, unknown>)[field] = dup[field];
        }
      }

      // Merge enrichment data
      if (!primary.enrichment_data && dup.enrichment_data) {
        mergeFields.enrichment_data = dup.enrichment_data;
        mergeFields.enriched_at = dup.enriched_at;
      }

      // 4. Add visit_count and total_spend
      mergeFields.visit_count = (primary.visit_count || 0) + (dup.visit_count || 0);
      mergeFields.total_spend = (primary.total_spend || 0) + (dup.total_spend || 0);
      primary.visit_count = mergeFields.visit_count as number;
      primary.total_spend = mergeFields.total_spend as number;

      // 5. Update first_seen to earliest, last_seen to latest
      const primaryFirst = new Date(primary.first_seen);
      const dupFirst = new Date(dup.first_seen);
      const primaryLast = new Date(primary.last_seen);
      const dupLast = new Date(dup.last_seen);

      if (dupFirst < primaryFirst) {
        mergeFields.first_seen = dup.first_seen;
        primary.first_seen = dup.first_seen;
      }
      if (dupLast > primaryLast) {
        mergeFields.last_seen = dup.last_seen;
        primary.last_seen = dup.last_seen;
      }

      // Apply merged fields to primary
      if (Object.keys(mergeFields).length > 0) {
        await supabase
          .from('customers')
          .update(mergeFields)
          .eq('customer_id', primary_id);
      }

      // 6. Delete duplicate record
      await supabase
        .from('customers')
        .delete()
        .eq('customer_id', dup.customer_id);
    }

    return NextResponse.json({
      merged: true,
      primary_id,
      duplicates_removed: duplicates.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Merge failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
