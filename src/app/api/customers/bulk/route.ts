import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

async function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  const { data } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();
  return data;
}

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const restaurant = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const rid = restaurant.restaurant_id;
  const { action, customer_ids, data: actionData } = await request.json();

  if (!customer_ids || customer_ids.length === 0) {
    return NextResponse.json({ error: 'No customers selected' }, { status: 400 });
  }

  let affected = 0;

  switch (action) {
    case 'add_tag': {
      // Add tag to all selected customers
      const tag = actionData?.tag;
      if (!tag) return NextResponse.json({ error: 'Tag required' }, { status: 400 });
      for (const cid of customer_ids) {
        const { data: customer } = await supabase
          .from('customers')
          .select('tags')
          .eq('customer_id', cid)
          .eq('restaurant_id', rid)
          .single();
        if (customer) {
          const tags = customer.tags || [];
          if (!tags.includes(tag)) {
            await supabase.from('customers').update({ tags: [...tags, tag] }).eq('customer_id', cid).eq('restaurant_id', rid);
            affected++;
          }
        }
      }
      break;
    }
    case 'remove_tag': {
      const tag = actionData?.tag;
      if (!tag) return NextResponse.json({ error: 'Tag required' }, { status: 400 });
      for (const cid of customer_ids) {
        const { data: customer } = await supabase
          .from('customers')
          .select('tags')
          .eq('customer_id', cid)
          .eq('restaurant_id', rid)
          .single();
        if (customer && customer.tags?.includes(tag)) {
          await supabase.from('customers').update({ tags: customer.tags.filter((t: string) => t !== tag) }).eq('customer_id', cid).eq('restaurant_id', rid);
          affected++;
        }
      }
      break;
    }
    case 'update_source': {
      const source = actionData?.source;
      if (!source) return NextResponse.json({ error: 'Source required' }, { status: 400 });
      const { count } = await supabase
        .from('customers')
        .update({ source })
        .in('customer_id', customer_ids)
        .eq('restaurant_id', rid);
      affected = count || customer_ids.length;
      break;
    }
    case 'export': {
      const { data: customers } = await supabase
        .from('customers')
        .select('first_name, last_name, email, phone, total_spend, visit_count, source, tags')
        .in('customer_id', customer_ids)
        .eq('restaurant_id', rid);
      return NextResponse.json({ customers: customers || [], count: customers?.length || 0 });
    }
    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    action,
    affected,
    total_selected: customer_ids.length,
  });
}
