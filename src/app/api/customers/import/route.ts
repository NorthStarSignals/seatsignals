import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

function getRestaurant(supabase: ReturnType<typeof createServerSupabase>, userId: string) {
  return supabase.from('restaurants').select('restaurant_id').eq('clerk_user_id', userId).single();
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

const COLUMN_MAP: Record<string, string> = {
  first_name: 'first_name',
  firstname: 'first_name',
  'first name': 'first_name',
  name: 'first_name',
  email: 'email',
  'email address': 'email',
  phone: 'phone',
  'phone number': 'phone',
  birthday: 'birthday',
  'date of birth': 'birthday',
  dob: 'birthday',
  source: 'source',
  company: 'company',
  'company name': 'company',
  job_title: 'job_title',
  jobtitle: 'job_title',
  'job title': 'job_title',
  title: 'job_title',
};

function mapColumns(headers: string[]): Record<number, string> {
  const mapping: Record<number, string> = {};
  headers.forEach((header, index) => {
    const normalized = header.toLowerCase().replace(/[_\-]/g, ' ').trim();
    // Try exact match first
    if (COLUMN_MAP[normalized]) {
      mapping[index] = COLUMN_MAP[normalized];
    } else {
      // Try with underscores
      const withUnderscores = normalized.replace(/\s+/g, '_');
      if (COLUMN_MAP[withUnderscores]) {
        mapping[index] = COLUMN_MAP[withUnderscores];
      }
    }
  });
  return mapping;
}

export async function POST(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await getRestaurant(supabase, userId);
  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must have a header row and at least one data row' }, { status: 400 });
    }

    const headers = parseCSVLine(lines[0]);
    const columnMapping = mapColumns(headers);

    // Check we have at least first_name or email
    const mappedFields = Object.values(columnMapping);
    if (!mappedFields.includes('first_name') && !mappedFields.includes('email')) {
      return NextResponse.json(
        { error: 'CSV must contain at least a name or email column' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    let imported = 0;
    let skipped = 0;
    const errors: Array<{ row: number; message: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};

        Object.entries(columnMapping).forEach(([colIndex, field]) => {
          const val = values[Number(colIndex)];
          if (val !== undefined && val !== '') {
            row[field] = val;
          }
        });

        if (!row.first_name && !row.email) {
          errors.push({ row: i + 1, message: 'Missing both name and email' });
          continue;
        }

        // Check for existing customer by email
        if (row.email) {
          const { data: existing } = await supabase
            .from('customers')
            .select('customer_id')
            .eq('restaurant_id', restaurant.restaurant_id)
            .eq('email', row.email)
            .single();

          if (existing) {
            // Update existing customer with any new fields
            const updateFields: Record<string, string> = {};
            if (row.first_name) updateFields.first_name = row.first_name;
            if (row.phone) updateFields.phone = row.phone;
            if (row.birthday) updateFields.birthday = row.birthday;
            if (row.company) updateFields.company = row.company;
            if (row.job_title) updateFields.job_title = row.job_title;

            if (Object.keys(updateFields).length > 0) {
              await supabase
                .from('customers')
                .update(updateFields)
                .eq('customer_id', existing.customer_id);
            }

            skipped++;
            continue;
          }
        }

        // Create new customer
        const { error: insertError } = await supabase.from('customers').insert({
          restaurant_id: restaurant.restaurant_id,
          first_name: row.first_name || row.email?.split('@')[0] || 'Unknown',
          email: row.email || null,
          phone: row.phone || null,
          birthday: row.birthday || null,
          source: 'manual',
          company: row.company || null,
          job_title: row.job_title || null,
          first_seen: now,
          last_seen: now,
          visit_count: 0,
          total_spend: 0,
        });

        if (insertError) {
          errors.push({ row: i + 1, message: insertError.message });
        } else {
          imported++;
        }
      } catch {
        errors.push({ row: i + 1, message: 'Failed to parse row' });
      }
    }

    return NextResponse.json({ imported, skipped, errors });
  } catch {
    return NextResponse.json({ error: 'Failed to process CSV file' }, { status: 500 });
  }
}
