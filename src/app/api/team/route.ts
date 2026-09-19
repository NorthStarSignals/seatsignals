import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { hasPermission, getRoleLevel, type Role } from '@/lib/roles';

async function getRestaurantAndRole(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  // First get the restaurant the user owns
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (restaurant) {
    return { restaurantId: restaurant.restaurant_id, role: 'owner' as Role };
  }

  // Otherwise check if they're a team member
  const { data: member } = await supabase
    .from('team_members')
    .select('restaurant_id, role')
    .eq('clerk_user_id', userId)
    .eq('active', true)
    .single();

  if (member) {
    return { restaurantId: member.restaurant_id, role: member.role as Role };
  }

  return null;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const ctx = await getRestaurantAndRole(supabase, userId);
  if (!ctx) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  if (!hasPermission(ctx.role, 'team.manage')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('restaurant_id', ctx.restaurantId)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ members: data, currentRole: ctx.role });
}

export async function POST(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const ctx = await getRestaurantAndRole(supabase, userId);
  if (!ctx) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  if (!hasPermission(ctx.role, 'team.manage')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await request.json();
  const { email, name, role } = body;

  if (!email || !role) {
    return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
  }

  // Can't assign a role equal to or higher than your own
  if (getRoleLevel(role as Role) >= getRoleLevel(ctx.role)) {
    return NextResponse.json({ error: 'Cannot assign a role equal to or higher than your own' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('team_members')
    .insert({
      restaurant_id: ctx.restaurantId,
      email,
      name: name || null,
      role,
      invited_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'This email has already been invited' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const ctx = await getRestaurantAndRole(supabase, userId);
  if (!ctx) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  if (!hasPermission(ctx.role, 'team.manage')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const body = await request.json();
  const { id, role } = body;

  if (!id || !role) {
    return NextResponse.json({ error: 'Member id and role are required' }, { status: 400 });
  }

  // Get the member being updated
  const { data: member } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .single();

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  // Can't change own role
  if (member.clerk_user_id === userId) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 403 });
  }

  // Can't set role equal to or higher than own
  if (getRoleLevel(role as Role) >= getRoleLevel(ctx.role)) {
    return NextResponse.json({ error: 'Cannot assign a role equal to or higher than your own' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('team_members')
    .update({ role })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const ctx = await getRestaurantAndRole(supabase, userId);
  if (!ctx) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  if (!hasPermission(ctx.role, 'team.manage')) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Member id is required' }, { status: 400 });

  // Get the member being removed
  const { data: member } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', id)
    .eq('restaurant_id', ctx.restaurantId)
    .single();

  if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

  // Can't remove self
  if (member.clerk_user_id === userId) {
    return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 403 });
  }

  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
