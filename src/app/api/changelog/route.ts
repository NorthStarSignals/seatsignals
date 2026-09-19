import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase';

export async function GET() {
  const supabase = createServerSupabase();

  const { data, error } = await supabase
    .from('changelog_entries')
    .select('*')
    .order('published_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
