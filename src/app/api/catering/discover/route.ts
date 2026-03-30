import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';

const MOCK_BUSINESSES = [
  { company_name: 'TechCorp Solutions', contact_name: 'Amanda Chen', contact_email: 'amanda@techcorp.com', company_size: 85, distance_miles: 0.8 },
  { company_name: 'Sterling Financial Group', contact_name: 'Brian Foster', contact_email: 'bfoster@sterlingfg.com', company_size: 120, distance_miles: 1.2 },
  { company_name: 'Meridian Marketing', contact_name: 'Jessica Park', contact_email: 'jpark@meridianmkt.com', company_size: 65, distance_miles: 1.5 },
  { company_name: 'Atlas Engineering', contact_name: 'Carlos Rivera', contact_email: 'crivera@atlaseng.com', company_size: 200, distance_miles: 1.8 },
  { company_name: 'Pinnacle Law Partners', contact_name: 'Diana Wells', contact_email: 'dwells@pinnaclelaw.com', company_size: 55, distance_miles: 2.1 },
  { company_name: 'Horizon Healthcare', contact_name: 'Kevin Zhang', contact_email: 'kzhang@horizonhc.com', company_size: 150, distance_miles: 2.4 },
  { company_name: 'Summit Property Management', contact_name: 'Rachel Thompson', contact_email: 'rthompson@summitpm.com', company_size: 70, distance_miles: 2.7 },
  { company_name: 'BlueWave Digital', contact_name: 'Tyler Morrison', contact_email: 'tyler@bluewavedigital.com', company_size: 90, distance_miles: 0.5 },
];

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  // Check existing leads to avoid duplicates
  const { data: existing } = await supabase
    .from('catering_leads')
    .select('company_name')
    .eq('restaurant_id', restaurant.restaurant_id);

  const existingNames = new Set((existing || []).map(e => e.company_name));
  const newBusinesses = MOCK_BUSINESSES.filter(b => !existingNames.has(b.company_name));

  if (newBusinesses.length === 0) {
    return NextResponse.json({ success: true, discovered: 0, message: 'All nearby businesses already in pipeline' });
  }

  const leads = newBusinesses.map(b => ({
    restaurant_id: restaurant.restaurant_id,
    company_name: b.company_name,
    contact_name: b.contact_name,
    contact_email: b.contact_email,
    company_size: b.company_size,
    distance_miles: b.distance_miles,
    sequence_status: 'discovered',
  }));

  await supabase.from('catering_leads').insert(leads);

  return NextResponse.json({ success: true, discovered: leads.length });
}
