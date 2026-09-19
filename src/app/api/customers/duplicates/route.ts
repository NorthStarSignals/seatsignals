import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { Customer } from '@/lib/types';

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

  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('last_seen', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!customers || customers.length === 0) {
    return NextResponse.json({ duplicate_sets: [] });
  }

  const duplicateSets: Array<{ match_type: string; customers: Customer[] }> = [];
  const usedIds = new Set<string>();

  // Find exact email matches
  const emailMap = new Map<string, Customer[]>();
  for (const c of customers) {
    if (!c.email) continue;
    const key = c.email.toLowerCase().trim();
    if (!key) continue;
    if (!emailMap.has(key)) emailMap.set(key, []);
    emailMap.get(key)!.push(c as Customer);
  }
  Array.from(emailMap.values()).forEach((group: Customer[]) => {
    if (group.length > 1 && duplicateSets.length < 20) {
      duplicateSets.push({ match_type: 'email', customers: group });
      group.forEach((c: Customer) => usedIds.add(c.customer_id));
    }
  });

  // Find exact phone matches (skip if already grouped)
  const phoneMap = new Map<string, Customer[]>();
  for (const c of customers) {
    if (!c.phone || usedIds.has(c.customer_id)) continue;
    const key = c.phone.replace(/\D/g, '');
    if (!key) continue;
    if (!phoneMap.has(key)) phoneMap.set(key, []);
    phoneMap.get(key)!.push(c as Customer);
  }
  Array.from(phoneMap.values()).forEach((group: Customer[]) => {
    if (group.length > 1 && duplicateSets.length < 20) {
      duplicateSets.push({ match_type: 'phone', customers: group });
      group.forEach((c: Customer) => usedIds.add(c.customer_id));
    }
  });

  // Find similar first_name matches (case insensitive, skip already grouped)
  const nameMap = new Map<string, Customer[]>();
  for (const c of customers) {
    if (!c.first_name || usedIds.has(c.customer_id)) continue;
    const key = c.first_name.toLowerCase().trim();
    if (!key) continue;
    if (!nameMap.has(key)) nameMap.set(key, []);
    nameMap.get(key)!.push(c as Customer);
  }
  Array.from(nameMap.values()).forEach((group: Customer[]) => {
    if (group.length > 1 && duplicateSets.length < 20) {
      duplicateSets.push({ match_type: 'name', customers: group });
      group.forEach((c: Customer) => usedIds.add(c.customer_id));
    }
  });

  return NextResponse.json({ duplicate_sets: duplicateSets.slice(0, 20) });
}
