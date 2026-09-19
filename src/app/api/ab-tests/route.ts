import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/* ------------------------------------------------------------------ */
/*  Statistical significance (z-test for proportions)                  */
/* ------------------------------------------------------------------ */

function calcRate(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function zTestSignificance(
  x1: number,
  n1: number,
  x2: number,
  n2: number
): { z: number; significant: boolean; confidence: number } {
  if (n1 === 0 || n2 === 0) {
    return { z: 0, significant: false, confidence: 0 };
  }

  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const p = (x1 + x2) / (n1 + n2);

  if (p === 0 || p === 1) {
    return { z: 0, significant: false, confidence: 0 };
  }

  const z = (p1 - p2) / Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  const absZ = Math.abs(z);

  // Approximate confidence from z-score
  let confidence = 0;
  if (absZ >= 2.576) confidence = 99;
  else if (absZ >= 2.326) confidence = 98;
  else if (absZ >= 2.054) confidence = 96;
  else if (absZ >= 1.96) confidence = 95;
  else if (absZ >= 1.645) confidence = 90;
  else if (absZ >= 1.282) confidence = 80;
  else confidence = Math.round(absZ / 1.96 * 95);

  return { z, significant: absZ > 1.96, confidence };
}

function enrichTest(test: Record<string, unknown>) {
  const totalSentA = (test.total_sent_a as number) || 0;
  const totalSentB = (test.total_sent_b as number) || 0;
  const openedA = (test.opened_a as number) || 0;
  const openedB = (test.opened_b as number) || 0;
  const clickedA = (test.clicked_a as number) || 0;
  const clickedB = (test.clicked_b as number) || 0;
  const convertedA = (test.converted_a as number) || 0;
  const convertedB = (test.converted_b as number) || 0;

  const openSig = zTestSignificance(openedA, totalSentA, openedB, totalSentB);
  const clickSig = zTestSignificance(clickedA, totalSentA, clickedB, totalSentB);
  const convSig = zTestSignificance(convertedA, totalSentA, convertedB, totalSentB);

  return {
    ...test,
    open_rate_a: calcRate(openedA, totalSentA),
    open_rate_b: calcRate(openedB, totalSentB),
    click_rate_a: calcRate(clickedA, totalSentA),
    click_rate_b: calcRate(clickedB, totalSentB),
    conversion_rate_a: calcRate(convertedA, totalSentA),
    conversion_rate_b: calcRate(convertedB, totalSentB),
    significance: {
      opens: openSig,
      clicks: clickSig,
      conversions: convSig,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Auth helper                                                        */
/* ------------------------------------------------------------------ */

async function getRestaurantId(userId: string) {
  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();
  return restaurant?.restaurant_id ?? null;
}

/* ------------------------------------------------------------------ */
/*  GET – list A/B tests                                               */
/* ------------------------------------------------------------------ */

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const restaurantId = await getRestaurantId(userId);
  if (!restaurantId) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const supabase = createServerSupabase();
  const { data: tests, error } = await supabase
    .from('ab_tests')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('AB tests fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 });
  }

  const enriched = (tests || []).map(enrichTest);

  return NextResponse.json({ tests: enriched });
}

/* ------------------------------------------------------------------ */
/*  POST – create A/B test                                             */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const restaurantId = await getRestaurantId(userId);
  if (!restaurantId) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await req.json();
  const {
    name,
    sequence_type,
    variant_a_message,
    variant_a_subject,
    variant_b_message,
    variant_b_subject,
    split_pct,
  } = body;

  if (!name || !sequence_type || !variant_a_message || !variant_b_message) {
    return NextResponse.json(
      { error: 'Missing required fields: name, sequence_type, variant_a_message, variant_b_message' },
      { status: 400 }
    );
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('ab_tests')
    .insert({
      restaurant_id: restaurantId,
      name,
      sequence_type,
      variant_a_message,
      variant_a_subject: variant_a_subject || null,
      variant_b_message,
      variant_b_subject: variant_b_subject || null,
      split_pct: split_pct ?? 50,
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    console.error('AB test insert error:', error);
    return NextResponse.json({ error: 'Failed to create test' }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

/* ------------------------------------------------------------------ */
/*  PUT – update A/B test                                              */
/* ------------------------------------------------------------------ */

export async function PUT(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const restaurantId = await getRestaurantId(userId);
  if (!restaurantId) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing test id' }, { status: 400 });
  }

  // If starting the test, set started_at
  if (updates.status === 'running' && !updates.started_at) {
    updates.started_at = new Date().toISOString();
  }

  // If stopping the test, set ended_at
  if (updates.status === 'completed' && !updates.ended_at) {
    updates.ended_at = new Date().toISOString();
  }

  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('ab_tests')
    .update(updates)
    .eq('id', id)
    .eq('restaurant_id', restaurantId)
    .select()
    .single();

  if (error) {
    console.error('AB test update error:', error);
    return NextResponse.json({ error: 'Failed to update test' }, { status: 500 });
  }

  return NextResponse.json(enrichTest(data));
}

/* ------------------------------------------------------------------ */
/*  DELETE – remove A/B test                                           */
/* ------------------------------------------------------------------ */

export async function DELETE(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const restaurantId = await getRestaurantId(userId);
  if (!restaurantId) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing test id' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { error } = await supabase
    .from('ab_tests')
    .delete()
    .eq('id', id)
    .eq('restaurant_id', restaurantId);

  if (error) {
    console.error('AB test delete error:', error);
    return NextResponse.json({ error: 'Failed to delete test' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
