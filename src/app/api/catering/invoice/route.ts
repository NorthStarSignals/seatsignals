import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { generateInvoicePDF } from '@/lib/generate-invoice';
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
    client_name,
    client_company,
    client_address,
    line_items,
    tax_rate = 0,
    notes,
    payment_terms,
    due_date,
    customer_id,
  } = body as {
    client_name: string;
    client_company?: string;
    client_address?: string;
    line_items: Array<{ description: string; quantity: number; unit_price: number }>;
    tax_rate?: number;
    notes?: string;
    payment_terms?: string;
    due_date: string;
    customer_id?: string;
  };

  if (!client_name || !line_items || line_items.length === 0 || !due_date) {
    return NextResponse.json(
      { error: 'client_name, line_items, and due_date are required' },
      { status: 400 }
    );
  }

  // Calculate totals
  const subtotal = line_items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const tax_amount = subtotal * (tax_rate / 100);
  const total = subtotal + tax_amount;

  // Generate invoice number: INV-YYYYMMDD-XXXX
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  const invoice_number = `INV-${dateStr}-${rand}`;

  const invoiceDate = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const dueDateFormatted = new Date(due_date + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Store invoice record
  const { data: invoice, error: insertError } = await supabase
    .from('catering_invoices')
    .insert({
      restaurant_id: restaurant.restaurant_id,
      customer_id: customer_id || null,
      invoice_number,
      client_name,
      client_company: client_company || null,
      client_address: client_address || null,
      line_items,
      subtotal,
      tax_rate,
      tax_amount,
      total,
      notes: notes || null,
      payment_terms: payment_terms || null,
      due_date,
      status: 'draft',
    })
    .select()
    .single();

  if (insertError) {
    console.error('Failed to store invoice:', insertError);
    return NextResponse.json({ error: 'Failed to store invoice' }, { status: 500 });
  }

  // Generate the PDF
  const doc = generateInvoicePDF({
    restaurant_name: restaurant.name,
    restaurant_address: restaurant.address,
    logo_url: restaurant.logo_url,
    client_name,
    client_company,
    client_address,
    invoice_number,
    date: invoiceDate,
    due_date: dueDateFormatted,
    line_items,
    tax_rate,
    notes,
    payment_terms,
  });

  const pdfBase64 = doc.output('datauristring');

  return NextResponse.json({
    invoice,
    pdf: pdfBase64,
  });
}

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

  const { data: invoices } = await supabase
    .from('catering_invoices')
    .select('*')
    .eq('restaurant_id', restaurant.restaurant_id)
    .order('created_at', { ascending: false });

  // Calculate summary stats
  const allInvoices = invoices || [];
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const total_outstanding = allInvoices
    .filter((inv) => inv.status === 'sent' || inv.status === 'draft')
    .reduce((sum: number, inv) => sum + (inv.total || 0), 0);

  const total_paid_this_month = allInvoices
    .filter((inv) => inv.status === 'paid' && inv.paid_at && inv.paid_at >= startOfMonth)
    .reduce((sum: number, inv) => sum + (inv.total || 0), 0);

  const overdue_count = allInvoices.filter(
    (inv) =>
      (inv.status === 'sent' || inv.status === 'draft') &&
      inv.due_date &&
      new Date(inv.due_date) < now
  ).length;

  return NextResponse.json({
    invoices: allInvoices,
    stats: {
      total_outstanding,
      total_paid_this_month,
      overdue_count,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await req.json();
  const { invoice_id, status } = body as { invoice_id: string; status: string };

  if (!invoice_id || !status) {
    return NextResponse.json({ error: 'invoice_id and status are required' }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { status };
  if (status === 'paid') {
    updateData.paid_at = new Date().toISOString();
  }

  const { data: updated, error } = await supabase
    .from('catering_invoices')
    .update(updateData)
    .eq('invoice_id', invoice_id)
    .eq('restaurant_id', restaurant.restaurant_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }

  return NextResponse.json({ invoice: updated });
}
