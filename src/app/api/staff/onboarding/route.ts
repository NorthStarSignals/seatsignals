import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

interface OnboardingTask {
  id: string;
  category: string;
  task: string;
  required: boolean;
  estimated_time: string;
}

interface EmployeeOnboarding {
  id: string;
  employee_name: string;
  role: string;
  start_date: string;
  status: 'not_started' | 'in_progress' | 'completed';
  tasks: (OnboardingTask & { completed: boolean; completed_date: string | null })[];
  progress: number;
}

const ONBOARDING_TASKS: OnboardingTask[] = [
  { id: 't1', category: 'Documentation', task: 'Submit W-4 and I-9 forms', required: true, estimated_time: '15 min' },
  { id: 't2', category: 'Documentation', task: 'Sign employee handbook acknowledgment', required: true, estimated_time: '30 min' },
  { id: 't3', category: 'Documentation', task: 'Set up direct deposit', required: false, estimated_time: '10 min' },
  { id: 't4', category: 'Documentation', task: 'Emergency contact information', required: true, estimated_time: '5 min' },
  { id: 't5', category: 'Training', task: 'Food safety certification (ServSafe)', required: true, estimated_time: '8 hrs' },
  { id: 't6', category: 'Training', task: 'Alcohol service training (TIPS)', required: false, estimated_time: '4 hrs' },
  { id: 't7', category: 'Training', task: 'POS system training', required: true, estimated_time: '2 hrs' },
  { id: 't8', category: 'Training', task: 'Menu knowledge quiz', required: true, estimated_time: '1 hr' },
  { id: 't9', category: 'Training', task: 'Allergen awareness training', required: true, estimated_time: '1 hr' },
  { id: 't10', category: 'Orientation', task: 'Kitchen and facility tour', required: true, estimated_time: '30 min' },
  { id: 't11', category: 'Orientation', task: 'Meet the team introductions', required: false, estimated_time: '30 min' },
  { id: 't12', category: 'Orientation', task: 'Review schedule and shift policies', required: true, estimated_time: '15 min' },
  { id: 't13', category: 'Orientation', task: 'Uniform and grooming standards', required: true, estimated_time: '10 min' },
  { id: 't14', category: 'Shadow Shifts', task: 'Shadow shift 1 with mentor', required: true, estimated_time: '6 hrs' },
  { id: 't15', category: 'Shadow Shifts', task: 'Shadow shift 2 with mentor', required: true, estimated_time: '6 hrs' },
  { id: 't16', category: 'Shadow Shifts', task: 'Solo shift with manager oversight', required: true, estimated_time: '6 hrs' },
];

function generateOnboardings(): EmployeeOnboarding[] {
  const newHires = [
    { name: 'Jordan Rivera', role: 'Server', start: '2026-04-06', completedCount: 12 },
    { name: 'Taylor Singh', role: 'Line Cook', start: '2026-04-01', completedCount: 16 },
    { name: 'Morgan Hayes', role: 'Bartender', start: '2026-04-08', completedCount: 4 },
    { name: 'Casey Park', role: 'Host', start: '2026-04-10', completedCount: 0 },
  ];

  return newHires.map((hire, idx) => {
    const tasks = ONBOARDING_TASKS.map((task, i) => ({
      ...task,
      completed: i < hire.completedCount,
      completed_date: i < hire.completedCount ? new Date(Date.now() - (hire.completedCount - i) * 86400000).toISOString() : null,
    }));
    const completed = tasks.filter(t => t.completed).length;
    const progress = Math.round((completed / tasks.length) * 100);

    return {
      id: `ob-${idx}`,
      employee_name: hire.name,
      role: hire.role,
      start_date: hire.start,
      status: progress === 100 ? 'completed' as const : progress > 0 ? 'in_progress' as const : 'not_started' as const,
      tasks,
      progress,
    };
  });
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const onboardings = generateOnboardings();
  const active = onboardings.filter(o => o.status !== 'completed').length;
  const avgProgress = onboardings.length > 0 ? Math.round(onboardings.reduce((s, o) => s + o.progress, 0) / onboardings.length) : 0;

  return NextResponse.json({
    onboardings,
    template_tasks: ONBOARDING_TASKS,
    stats: {
      total_new_hires: onboardings.length,
      active_onboarding: active,
      completed: onboardings.filter(o => o.status === 'completed').length,
      avg_progress: avgProgress,
    },
  });
}

export async function PUT(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  return NextResponse.json({ ...body, updated: true });
}
