import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

interface ChecklistItem {
  id: string;
  category: string;
  item: string;
  status: 'pass' | 'fail' | 'na' | 'pending';
  notes: string;
  priority: 'critical' | 'major' | 'minor';
  last_checked: string | null;
}

function generateChecklist(): ChecklistItem[] {
  const categories: { category: string; items: { item: string; priority: 'critical' | 'major' | 'minor' }[] }[] = [
    {
      category: 'Food Temperature',
      items: [
        { item: 'Cold holding at 41°F or below', priority: 'critical' },
        { item: 'Hot holding at 135°F or above', priority: 'critical' },
        { item: 'Proper cooling procedures (135°F to 70°F in 2hrs)', priority: 'critical' },
        { item: 'Proper reheating to 165°F', priority: 'critical' },
        { item: 'Thermometers available and calibrated', priority: 'major' },
      ],
    },
    {
      category: 'Personal Hygiene',
      items: [
        { item: 'Proper hand washing observed', priority: 'critical' },
        { item: 'Gloves used properly and changed', priority: 'critical' },
        { item: 'No bare hand contact with RTE foods', priority: 'critical' },
        { item: 'Clean uniforms/aprons', priority: 'minor' },
        { item: 'Hair restraints in use', priority: 'major' },
        { item: 'No eating/drinking in prep areas', priority: 'major' },
      ],
    },
    {
      category: 'Cross-Contamination',
      items: [
        { item: 'Raw meats stored below cooked/RTE foods', priority: 'critical' },
        { item: 'Separate cutting boards by food type', priority: 'major' },
        { item: 'Proper sanitizer concentration', priority: 'critical' },
        { item: 'Clean and sanitized food contact surfaces', priority: 'critical' },
      ],
    },
    {
      category: 'Storage & Labeling',
      items: [
        { item: 'All food items properly labeled and dated', priority: 'major' },
        { item: 'FIFO rotation followed', priority: 'major' },
        { item: 'Food stored 6 inches off floor', priority: 'minor' },
        { item: 'No expired products', priority: 'major' },
        { item: 'Chemicals stored separately from food', priority: 'critical' },
      ],
    },
    {
      category: 'Facility & Equipment',
      items: [
        { item: 'Floors, walls, ceiling clean and in good repair', priority: 'minor' },
        { item: 'Adequate ventilation', priority: 'minor' },
        { item: 'Proper lighting in all areas', priority: 'minor' },
        { item: 'Restrooms clean with supplies', priority: 'major' },
        { item: 'Pest control measures in place', priority: 'major' },
        { item: 'Grease trap maintained', priority: 'minor' },
        { item: 'Walk-in cooler/freezer functioning properly', priority: 'critical' },
      ],
    },
    {
      category: 'Documentation',
      items: [
        { item: 'Food handler certificates on file', priority: 'major' },
        { item: 'Temperature logs maintained daily', priority: 'major' },
        { item: 'Health permits displayed', priority: 'major' },
        { item: 'Allergen information available', priority: 'major' },
      ],
    },
  ];

  const items: ChecklistItem[] = [];
  let id = 1;
  const statuses: ('pass' | 'fail' | 'pending')[] = ['pass', 'pass', 'pass', 'pass', 'pass', 'fail', 'pending'];

  for (const cat of categories) {
    for (const item of cat.items) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      items.push({
        id: `hi-${id++}`,
        category: cat.category,
        item: item.item,
        status,
        notes: status === 'fail' ? 'Needs immediate attention' : '',
        priority: item.priority,
        last_checked: status !== 'pending' ? new Date(Date.now() - Math.random() * 7 * 86400000).toISOString() : null,
      });
    }
  }

  return items;
}

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const checklist = generateChecklist();
  const passed = checklist.filter(i => i.status === 'pass').length;
  const failed = checklist.filter(i => i.status === 'fail').length;
  const pending = checklist.filter(i => i.status === 'pending').length;
  const criticalFails = checklist.filter(i => i.status === 'fail' && i.priority === 'critical').length;
  const score = checklist.length > 0 ? Math.round((passed / (checklist.length - checklist.filter(i => i.status === 'na').length)) * 100) : 0;

  const categories = Array.from(new Set(checklist.map(i => i.category)));
  const by_category = categories.map(cat => {
    const items = checklist.filter(i => i.category === cat);
    return {
      category: cat,
      total: items.length,
      passed: items.filter(i => i.status === 'pass').length,
      failed: items.filter(i => i.status === 'fail').length,
      pending: items.filter(i => i.status === 'pending').length,
    };
  });

  return NextResponse.json({
    checklist,
    by_category,
    stats: {
      total_items: checklist.length,
      passed,
      failed,
      pending,
      critical_fails: criticalFails,
      score,
      last_inspection: '2026-02-15',
      next_inspection: '2026-05-15',
    },
  });
}

export async function PUT(request: Request) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  return NextResponse.json({ ...body, updated: true, last_checked: new Date().toISOString() });
}
