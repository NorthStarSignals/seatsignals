import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

// ── Training Programs ─────────────────────────────────────────────

interface TrainingProgram {
  id: string;
  name: string;
  category: string;
  duration_hours: number;
  required: boolean;
  pass_score: number;
}

const PROGRAMS: TrainingProgram[] = [
  { id: 'food-safety', name: 'Food Safety', category: 'Compliance', duration_hours: 8, required: true, pass_score: 80 },
  { id: 'alcohol-service', name: 'Alcohol Service (TIPS)', category: 'Compliance', duration_hours: 6, required: true, pass_score: 75 },
  { id: 'customer-service', name: 'Customer Service', category: 'Service', duration_hours: 4, required: true, pass_score: 70 },
  { id: 'pos-system', name: 'POS System', category: 'Operations', duration_hours: 3, required: true, pass_score: 85 },
  { id: 'fire-safety', name: 'Fire Safety', category: 'Compliance', duration_hours: 2, required: true, pass_score: 80 },
  { id: 'allergen-awareness', name: 'Allergen Awareness', category: 'Compliance', duration_hours: 3, required: true, pass_score: 80 },
  { id: 'leadership', name: 'Leadership', category: 'Development', duration_hours: 12, required: false, pass_score: 70 },
  { id: 'wine-knowledge', name: 'Wine Knowledge', category: 'Service', duration_hours: 6, required: false, pass_score: 65 },
];

// ── Employee Training Records ─────────────────────────────────────

type TrainingStatus = 'not_started' | 'in_progress' | 'completed' | 'expired';

interface TrainingRecord {
  id: string;
  employee_name: string;
  role: string;
  program_id: string;
  status: TrainingStatus;
  score: number | null;
  completed_date: string | null;
  expiry_date: string | null;
}

function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return () => {
    hash = (hash * 1664525 + 1013904223) | 0;
    return (hash >>> 0) / 4294967296;
  };
}

const EMPLOYEES = [
  { name: 'Maria Santos', role: 'Server' },
  { name: 'James Chen', role: 'Server' },
  { name: 'Ashley Williams', role: 'Bartender' },
  { name: 'David Kim', role: 'Host' },
  { name: 'Sarah Johnson', role: 'Manager' },
  { name: 'Marcus Brown', role: 'Line Cook' },
  { name: 'Emily Davis', role: 'Server' },
  { name: 'Carlos Rivera', role: 'Sous Chef' },
  { name: 'Rachel Green', role: 'Bartender' },
  { name: 'Tom Wilson', role: 'Busser' },
];

function generateRecords(): TrainingRecord[] {
  const records: TrainingRecord[] = [];
  const now = new Date();

  for (const emp of EMPLOYEES) {
    for (const prog of PROGRAMS) {
      const rand = seededRandom(`${emp.name}-${prog.id}`);
      const r = rand();

      let status: TrainingStatus;
      let score: number | null = null;
      let completed_date: string | null = null;
      let expiry_date: string | null = null;

      if (r < 0.45) {
        status = 'completed';
        score = Math.round(prog.pass_score + rand() * (100 - prog.pass_score));
        const daysAgo = Math.round(rand() * 300) + 30;
        const completedAt = new Date(now.getTime() - daysAgo * 86400000);
        completed_date = completedAt.toISOString().split('T')[0];
        const expiresAt = new Date(completedAt.getTime() + 365 * 86400000);
        expiry_date = expiresAt.toISOString().split('T')[0];
      } else if (r < 0.55) {
        status = 'expired';
        score = Math.round(prog.pass_score + rand() * (100 - prog.pass_score));
        const daysAgo = Math.round(rand() * 200) + 400;
        const completedAt = new Date(now.getTime() - daysAgo * 86400000);
        completed_date = completedAt.toISOString().split('T')[0];
        const expiresAt = new Date(completedAt.getTime() + 365 * 86400000);
        expiry_date = expiresAt.toISOString().split('T')[0];
      } else if (r < 0.75) {
        status = 'in_progress';
        score = Math.round(rand() * prog.pass_score * 0.6);
      } else {
        status = 'not_started';
      }

      records.push({
        id: `${emp.name.toLowerCase().replace(/\s/g, '-')}-${prog.id}`,
        employee_name: emp.name,
        role: emp.role,
        program_id: prog.id,
        status,
        score,
        completed_date,
        expiry_date,
      });
    }
  }

  return records;
}

function computeStats(records: TrainingRecord[]) {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000);

  const total_programs = PROGRAMS.length;
  const completedCount = records.filter((r) => r.status === 'completed').length;
  const totalPossible = records.length;
  const completion_rate = Math.round((completedCount / totalPossible) * 100);

  const expiring_soon = records.filter((r) => {
    if (r.status !== 'completed' || !r.expiry_date) return false;
    const exp = new Date(r.expiry_date);
    return exp > now && exp <= thirtyDaysFromNow;
  }).length;

  const overdue_count = records.filter((r) => r.status === 'expired').length;

  return { total_programs, completion_rate, expiring_soon, overdue_count };
}

// ── Handlers ──────────────────────────────────────────────────────

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const records = generateRecords();
  const stats = computeStats(records);

  return NextResponse.json({
    programs: PROGRAMS,
    records,
    stats,
    employees: EMPLOYEES,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { employee_name, program_id } = body;

  if (!employee_name || !program_id) {
    return NextResponse.json({ error: 'employee_name and program_id required' }, { status: 400 });
  }

  const program = PROGRAMS.find((p) => p.id === program_id);
  if (!program) {
    return NextResponse.json({ error: 'Invalid program_id' }, { status: 400 });
  }

  const record: TrainingRecord = {
    id: `${employee_name.toLowerCase().replace(/\s/g, '-')}-${program_id}-${Date.now()}`,
    employee_name,
    role: EMPLOYEES.find((e) => e.name === employee_name)?.role || 'Staff',
    program_id,
    status: 'not_started',
    score: null,
    completed_date: null,
    expiry_date: null,
  };

  return NextResponse.json({ success: true, record });
}

export async function PUT(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { record_id, status, score } = body;

  if (!record_id || !status) {
    return NextResponse.json({ error: 'record_id and status required' }, { status: 400 });
  }

  const validStatuses: TrainingStatus[] = ['not_started', 'in_progress', 'completed', 'expired'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    updated: {
      record_id,
      status,
      score: score ?? null,
      completed_date: status === 'completed' ? new Date().toISOString().split('T')[0] : null,
    },
  });
}
