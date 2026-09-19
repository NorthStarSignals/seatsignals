import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { generateProposalPDF } from '@/lib/generate-proposal';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();

  // Look up the restaurant for this user
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name, address, logo_url')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await req.json();
  const {
    lead_id,
    menu_items,
    event_date,
    headcount,
    notes,
    delivery_fee,
    tax_rate,
  } = body as {
    lead_id: string;
    menu_items: Array<{ name: string; description?: string; price_per_person: number }>;
    event_date?: string;
    headcount?: number;
    notes?: string;
    delivery_fee?: number;
    tax_rate?: number;
  };

  if (!lead_id || !menu_items || menu_items.length === 0) {
    return NextResponse.json({ error: 'lead_id and menu_items are required' }, { status: 400 });
  }

  // Look up the lead, ensuring it belongs to this restaurant
  const { data: lead } = await supabase
    .from('catering_leads')
    .select('*')
    .eq('lead_id', lead_id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .single();

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

  // Generate the PDF
  const doc = generateProposalPDF({
    restaurant_name: restaurant.name,
    restaurant_address: restaurant.address,
    logo_url: restaurant.logo_url,
    company_name: lead.company_name,
    contact_name: lead.contact_name,
    contact_email: lead.contact_email,
    event_date,
    headcount,
    menu_items,
    notes,
    delivery_fee,
    tax_rate,
  });

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
  const filename = `proposal-${lead.company_name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.pdf`;

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
