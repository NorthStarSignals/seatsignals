import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  phone: string;
  hire_date: string;
  status: 'active' | 'inactive' | 'on_leave';
  hourly_rate: number;
  certifications: string[];
  emergency_contact: string;
  emergency_phone: string;
}

function generateEmployees(): Employee[] {
  const staff: Omit<Employee, 'id'>[] = [
    { name: 'Amanda Foster', role: 'General Manager', department: 'Management', email: 'amanda@restaurant.com', phone: '(555) 100-0001', hire_date: '2022-03-15', status: 'active', hourly_rate: 32, certifications: ['ServSafe Manager', 'TIPS'], emergency_contact: 'John Foster', emergency_phone: '(555) 200-0001' },
    { name: 'Robert Garcia', role: 'Executive Chef', department: 'Kitchen', email: 'robert@restaurant.com', phone: '(555) 100-0002', hire_date: '2022-05-01', status: 'active', hourly_rate: 30, certifications: ['ServSafe Manager', 'Culinary Degree'], emergency_contact: 'Maria Garcia', emergency_phone: '(555) 200-0002' },
    { name: 'Mike Brown', role: 'Sous Chef', department: 'Kitchen', email: 'mike@restaurant.com', phone: '(555) 100-0003', hire_date: '2023-01-10', status: 'active', hourly_rate: 22, certifications: ['ServSafe', 'Food Handler'], emergency_contact: 'Lisa Brown', emergency_phone: '(555) 200-0003' },
    { name: 'Jessica Taylor', role: 'Line Cook', department: 'Kitchen', email: 'jessica@restaurant.com', phone: '(555) 100-0004', hire_date: '2023-06-20', status: 'active', hourly_rate: 18, certifications: ['Food Handler'], emergency_contact: 'Tom Taylor', emergency_phone: '(555) 200-0004' },
    { name: 'Sarah Chen', role: 'Server', department: 'Front of House', email: 'sarah@restaurant.com', phone: '(555) 100-0005', hire_date: '2023-03-01', status: 'active', hourly_rate: 7.25, certifications: ['TIPS', 'Food Handler'], emergency_contact: 'Wei Chen', emergency_phone: '(555) 200-0005' },
    { name: 'David Kim', role: 'Server', department: 'Front of House', email: 'david@restaurant.com', phone: '(555) 100-0006', hire_date: '2023-09-15', status: 'active', hourly_rate: 7.25, certifications: ['TIPS'], emergency_contact: 'Jin Kim', emergency_phone: '(555) 200-0006' },
    { name: 'Ashley Williams', role: 'Server', department: 'Front of House', email: 'ashley@restaurant.com', phone: '(555) 100-0007', hire_date: '2024-01-05', status: 'active', hourly_rate: 7.25, certifications: ['Food Handler'], emergency_contact: 'Mark Williams', emergency_phone: '(555) 200-0007' },
    { name: 'Marcus Johnson', role: 'Bartender', department: 'Bar', email: 'marcus@restaurant.com', phone: '(555) 100-0008', hire_date: '2023-04-12', status: 'active', hourly_rate: 9.50, certifications: ['TIPS', 'Mixology Cert'], emergency_contact: 'Keisha Johnson', emergency_phone: '(555) 200-0008' },
    { name: 'Nicole Lee', role: 'Bartender', department: 'Bar', email: 'nicole@restaurant.com', phone: '(555) 100-0009', hire_date: '2023-07-20', status: 'active', hourly_rate: 9.50, certifications: ['TIPS'], emergency_contact: 'Daniel Lee', emergency_phone: '(555) 200-0009' },
    { name: 'Emily Rodriguez', role: 'Host', department: 'Front of House', email: 'emily@restaurant.com', phone: '(555) 100-0010', hire_date: '2023-11-01', status: 'active', hourly_rate: 14, certifications: [], emergency_contact: 'Carlos Rodriguez', emergency_phone: '(555) 200-0010' },
    { name: 'Chris Martinez', role: 'Dishwasher', department: 'Kitchen', email: 'chris@restaurant.com', phone: '(555) 100-0011', hire_date: '2024-02-15', status: 'active', hourly_rate: 15, certifications: ['Food Handler'], emergency_contact: 'Rosa Martinez', emergency_phone: '(555) 200-0011' },
    { name: 'James Wilson', role: 'Expo', department: 'Kitchen', email: 'james@restaurant.com', phone: '(555) 100-0012', hire_date: '2024-03-01', status: 'active', hourly_rate: 16, certifications: ['Food Handler'], emergency_contact: 'Patricia Wilson', emergency_phone: '(555) 200-0012' },
    { name: 'Tyler Reed', role: 'Line Cook', department: 'Kitchen', email: 'tyler@restaurant.com', phone: '(555) 100-0013', hire_date: '2024-06-10', status: 'on_leave', hourly_rate: 17, certifications: ['Food Handler'], emergency_contact: 'Sandra Reed', emergency_phone: '(555) 200-0013' },
    { name: 'Olivia Scott', role: 'Server', department: 'Front of House', email: 'olivia@restaurant.com', phone: '(555) 100-0014', hire_date: '2025-01-15', status: 'inactive', hourly_rate: 7.25, certifications: [], emergency_contact: 'Paul Scott', emergency_phone: '(555) 200-0014' },
  ];

  return staff.map((s, i) => ({ id: `emp-${i + 1}`, ...s }));
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const employees = generateEmployees();
  const active = employees.filter(e => e.status === 'active').length;
  const departments = Array.from(new Set(employees.map(e => e.department)));

  const byDept = departments.map(dept => ({
    department: dept,
    count: employees.filter(e => e.department === dept).length,
    active: employees.filter(e => e.department === dept && e.status === 'active').length,
  }));

  const certExpiring = employees.filter(e => e.certifications.length > 0).length;

  return NextResponse.json({
    employees,
    by_department: byDept,
    stats: {
      total: employees.length,
      active,
      on_leave: employees.filter(e => e.status === 'on_leave').length,
      inactive: employees.filter(e => e.status === 'inactive').length,
      departments: departments.length,
      avg_tenure_months: 18,
      certified: certExpiring,
    },
  });
}
