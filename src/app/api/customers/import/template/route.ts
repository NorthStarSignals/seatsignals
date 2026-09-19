import { NextResponse } from 'next/server';

export async function GET() {
  const csv = `first_name,email,phone,birthday,company,job_title
John,john@example.com,555-123-4567,1990-05-15,Acme Corp,Manager
Jane,jane@example.com,555-987-6543,1985-12-20,Tech Inc,Director`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="customer-import-template.csv"',
    },
  });
}
