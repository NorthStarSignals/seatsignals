import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

interface MarketingEvent {
  id: string;
  title: string;
  type: 'email' | 'sms' | 'social' | 'event' | 'promo' | 'holiday';
  date: string;
  time: string;
  channel: string;
  description: string;
  status: 'scheduled' | 'draft' | 'sent' | 'live';
  audience_size: number;
  created_by: string;
}

function generateMockEvents(): MarketingEvent[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const events: MarketingEvent[] = [
    { id: 'evt-001', title: 'Weekly Newsletter', type: 'email', date: `${year}-${String(month + 1).padStart(2, '0')}-01`, time: '09:00', channel: 'Email', description: 'Weekly roundup of specials and news', status: 'sent', audience_size: 2450, created_by: 'Malik' },
    { id: 'evt-002', title: 'Instagram Reel - Chef Feature', type: 'social', date: `${year}-${String(month + 1).padStart(2, '0')}-02`, time: '12:00', channel: 'Instagram', description: 'Behind-the-scenes chef interview reel', status: 'sent', audience_size: 5200, created_by: 'Malik' },
    { id: 'evt-003', title: 'Happy Hour SMS Blast', type: 'sms', date: `${year}-${String(month + 1).padStart(2, '0')}-03`, time: '15:00', channel: 'SMS', description: 'Friday happy hour reminder to VIP list', status: 'sent', audience_size: 890, created_by: 'Malik' },
    { id: 'evt-004', title: 'New Menu Launch Email', type: 'email', date: `${year}-${String(month + 1).padStart(2, '0')}-05`, time: '10:00', channel: 'Email', description: 'Announce spring menu items to full subscriber list', status: 'sent', audience_size: 3100, created_by: 'Malik' },
    { id: 'evt-005', title: 'Facebook Event - Wine Tasting', type: 'event', date: `${year}-${String(month + 1).padStart(2, '0')}-07`, time: '18:00', channel: 'Facebook', description: 'Wine tasting event promotion and RSVP page', status: 'live', audience_size: 1200, created_by: 'Malik' },
    { id: 'evt-006', title: 'Loyalty Members 2x Points', type: 'promo', date: `${year}-${String(month + 1).padStart(2, '0')}-08`, time: '00:00', channel: 'In-App', description: 'Double points weekend for loyalty members', status: 'sent', audience_size: 1750, created_by: 'Malik' },
    { id: 'evt-007', title: 'TikTok Recipe Video', type: 'social', date: `${year}-${String(month + 1).padStart(2, '0')}-09`, time: '14:00', channel: 'TikTok', description: 'Quick recipe tutorial for signature dish', status: 'sent', audience_size: 8500, created_by: 'Malik' },
    { id: 'evt-008', title: 'Weekend Brunch Promo SMS', type: 'sms', date: `${year}-${String(month + 1).padStart(2, '0')}-10`, time: '08:00', channel: 'SMS', description: 'Saturday brunch special offer', status: 'sent', audience_size: 920, created_by: 'Malik' },
    { id: 'evt-009', title: 'Weekly Newsletter', type: 'email', date: `${year}-${String(month + 1).padStart(2, '0')}-08`, time: '09:00', channel: 'Email', description: 'Weekly specials and upcoming events', status: 'sent', audience_size: 2480, created_by: 'Malik' },
    { id: 'evt-010', title: 'Google Business Post', type: 'social', date: `${year}-${String(month + 1).padStart(2, '0')}-11`, time: '10:00', channel: 'Google', description: 'Update Google Business with new photos and hours', status: 'sent', audience_size: 3400, created_by: 'Malik' },
    { id: 'evt-011', title: 'Mothers Day Promo', type: 'holiday', date: `${year}-${String(month + 1).padStart(2, '0')}-12`, time: '09:00', channel: 'Email + SMS', description: 'Special prix fixe menu for Mothers Day weekend', status: 'scheduled', audience_size: 3200, created_by: 'Malik' },
    { id: 'evt-012', title: 'Flash Deal - 20% Off Appetizers', type: 'promo', date: `${year}-${String(month + 1).padStart(2, '0')}-14`, time: '11:00', channel: 'In-App', description: 'Midweek flash deal to boost traffic', status: 'scheduled', audience_size: 1500, created_by: 'Malik' },
    { id: 'evt-013', title: 'Weekly Newsletter', type: 'email', date: `${year}-${String(month + 1).padStart(2, '0')}-15`, time: '09:00', channel: 'Email', description: 'Weekly roundup with event highlights', status: 'scheduled', audience_size: 2500, created_by: 'Malik' },
    { id: 'evt-014', title: 'Instagram Story - Daily Special', type: 'social', date: `${year}-${String(month + 1).padStart(2, '0')}-16`, time: '11:30', channel: 'Instagram', description: 'Daily special photo story series', status: 'draft', audience_size: 4800, created_by: 'Malik' },
    { id: 'evt-015', title: 'VIP Early Access SMS', type: 'sms', date: `${year}-${String(month + 1).padStart(2, '0')}-17`, time: '10:00', channel: 'SMS', description: 'Early access to summer menu for VIP customers', status: 'scheduled', audience_size: 650, created_by: 'Malik' },
    { id: 'evt-016', title: 'Live Music Night Event', type: 'event', date: `${year}-${String(month + 1).padStart(2, '0')}-19`, time: '19:00', channel: 'All Channels', description: 'Live jazz night with special cocktail menu', status: 'scheduled', audience_size: 2800, created_by: 'Malik' },
    { id: 'evt-017', title: 'Memorial Day Weekend Promo', type: 'holiday', date: `${year}-${String(month + 1).padStart(2, '0')}-21`, time: '08:00', channel: 'Email + SMS', description: 'BBQ special menu and outdoor seating promo', status: 'draft', audience_size: 3500, created_by: 'Malik' },
    { id: 'evt-018', title: 'Referral Program Email', type: 'email', date: `${year}-${String(month + 1).padStart(2, '0')}-22`, time: '10:00', channel: 'Email', description: 'Remind customers about refer-a-friend rewards', status: 'draft', audience_size: 2200, created_by: 'Malik' },
    { id: 'evt-019', title: 'Twitter Poll - Next Special', type: 'social', date: `${year}-${String(month + 1).padStart(2, '0')}-23`, time: '13:00', channel: 'Twitter', description: 'Let followers vote on next weekly special', status: 'draft', audience_size: 1900, created_by: 'Malik' },
    { id: 'evt-020', title: 'End of Month SMS Reminder', type: 'sms', date: `${year}-${String(month + 1).padStart(2, '0')}-25`, time: '16:00', channel: 'SMS', description: 'Last chance to redeem monthly loyalty rewards', status: 'draft', audience_size: 780, created_by: 'Malik' },
    { id: 'evt-021', title: 'Weekly Newsletter', type: 'email', date: `${year}-${String(month + 1).padStart(2, '0')}-22`, time: '09:00', channel: 'Email', description: 'Weekly recap and upcoming events', status: 'draft', audience_size: 2520, created_by: 'Malik' },
    { id: 'evt-022', title: 'Catering Spotlight Email', type: 'email', date: `${year}-${String(month + 1).padStart(2, '0')}-26`, time: '10:00', channel: 'Email', description: 'Highlight catering packages for corporate events', status: 'draft', audience_size: 1800, created_by: 'Malik' },
    { id: 'evt-023', title: 'Father Day Early Bird', type: 'holiday', date: `${year}-${String(month + 1).padStart(2, '0')}-28`, time: '09:00', channel: 'Email + SMS', description: 'Early bird reservations for Fathers Day', status: 'draft', audience_size: 3000, created_by: 'Malik' },
  ];

  return events;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const events = generateMockEvents();

  const sentCount = events.filter(e => e.status === 'sent').length;
  const scheduledCount = events.filter(e => e.status === 'scheduled').length;
  const upcomingCount = events.filter(e => e.status === 'scheduled' || e.status === 'draft').length;

  return NextResponse.json({
    events,
    stats: {
      scheduled_this_month: scheduledCount,
      sent_this_month: sentCount,
      engagement_rate: 24.7,
      upcoming_count: upcomingCount,
    },
  });
}

export async function POST(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const newEvent: MarketingEvent = {
    id: `evt-${Date.now()}`,
    title: body.title,
    type: body.type,
    date: body.date,
    time: body.time || '09:00',
    channel: body.channel || '',
    description: body.description || '',
    status: body.status || 'draft',
    audience_size: body.audience_size || 0,
    created_by: 'Malik',
  };

  return NextResponse.json({ event: newEvent }, { status: 201 });
}

export async function PUT(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  if (!body.id) return NextResponse.json({ error: 'Missing event id' }, { status: 400 });

  return NextResponse.json({ event: body });
}

export async function DELETE(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing event id' }, { status: 400 });

  return NextResponse.json({ deleted: id });
}
