import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

interface LineItem {
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_name: string;
  items: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'submitted' | 'approved' | 'received' | 'cancelled';
  order_date: string;
  expected_delivery: string;
  notes: string;
  created_by: string;
}

function calcSubtotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unit_cost, 0);
}

function makePO(
  id: string,
  num: string,
  vendor: string,
  items: LineItem[],
  status: PurchaseOrder['status'],
  orderDate: string,
  delivery: string,
  notes: string,
  createdBy: string
): PurchaseOrder {
  const subtotal = calcSubtotal(items);
  const tax = Math.round(subtotal * 0.08 * 100) / 100;
  return {
    id,
    po_number: num,
    vendor_name: vendor,
    items,
    subtotal,
    tax,
    total: Math.round((subtotal + tax) * 100) / 100,
    status,
    order_date: orderDate,
    expected_delivery: delivery,
    notes,
    created_by: createdBy,
  };
}

const mockPurchaseOrders: PurchaseOrder[] = [
  makePO('po1', 'PO-2026-001', 'Fresh Fields Farm', [
    { name: 'Organic Mixed Greens', quantity: 20, unit: 'lb', unit_cost: 4.50 },
    { name: 'Roma Tomatoes', quantity: 30, unit: 'lb', unit_cost: 2.75 },
    { name: 'Fresh Basil', quantity: 10, unit: 'bunch', unit_cost: 3.00 },
  ], 'received', '2026-03-25', '2026-03-27', 'Weekly produce restock', 'Malik Alexander'),
  makePO('po2', 'PO-2026-002', 'Heritage Meats Co.', [
    { name: 'Angus Ribeye Steak', quantity: 40, unit: 'lb', unit_cost: 18.50 },
    { name: 'Ground Chuck 80/20', quantity: 50, unit: 'lb', unit_cost: 6.25 },
    { name: 'Pork Tenderloin', quantity: 25, unit: 'lb', unit_cost: 8.75 },
  ], 'received', '2026-03-26', '2026-03-28', 'Weekend dinner rush prep', 'Malik Alexander'),
  makePO('po3', 'PO-2026-003', 'Atlantic Catch Seafood', [
    { name: 'Fresh Atlantic Salmon', quantity: 30, unit: 'lb', unit_cost: 14.00 },
    { name: 'Jumbo Shrimp 16/20', quantity: 20, unit: 'lb', unit_cost: 12.50 },
    { name: 'Sea Scallops', quantity: 15, unit: 'lb', unit_cost: 22.00 },
  ], 'approved', '2026-03-28', '2026-03-30', 'Seafood special menu items', 'Malik Alexander'),
  makePO('po4', 'PO-2026-004', 'Peachtree Beverage Dist.', [
    { name: 'House Red Wine (case)', quantity: 5, unit: 'case', unit_cost: 85.00 },
    { name: 'House White Wine (case)', quantity: 4, unit: 'case', unit_cost: 72.00 },
    { name: 'Craft IPA (keg)', quantity: 3, unit: 'keg', unit_cost: 165.00 },
    { name: 'Sparkling Water (case)', quantity: 10, unit: 'case', unit_cost: 18.00 },
  ], 'received', '2026-03-29', '2026-04-01', 'Bar restock for April', 'Malik Alexander'),
  makePO('po5', 'PO-2026-005', 'Pantry Staples Inc.', [
    { name: 'All-Purpose Flour', quantity: 100, unit: 'lb', unit_cost: 0.85 },
    { name: 'Extra Virgin Olive Oil', quantity: 10, unit: 'gal', unit_cost: 28.00 },
    { name: 'Arborio Rice', quantity: 40, unit: 'lb', unit_cost: 3.50 },
    { name: 'Kosher Salt', quantity: 25, unit: 'lb', unit_cost: 1.20 },
  ], 'approved', '2026-03-31', '2026-04-03', 'Monthly dry goods replenishment', 'Malik Alexander'),
  makePO('po6', 'PO-2026-006', 'Southern Dairy Collective', [
    { name: 'Heavy Cream', quantity: 15, unit: 'qt', unit_cost: 5.50 },
    { name: 'Unsalted Butter', quantity: 20, unit: 'lb', unit_cost: 4.25 },
    { name: 'Parmesan Wedge', quantity: 10, unit: 'lb', unit_cost: 16.00 },
    { name: 'Fresh Mozzarella', quantity: 12, unit: 'lb', unit_cost: 9.50 },
  ], 'submitted', '2026-04-01', '2026-04-03', 'Dairy restock - pasta night prep', 'Malik Alexander'),
  makePO('po7', 'PO-2026-007', 'Fresh Fields Farm', [
    { name: 'Sweet Potatoes', quantity: 40, unit: 'lb', unit_cost: 1.80 },
    { name: 'Butternut Squash', quantity: 25, unit: 'lb', unit_cost: 2.10 },
    { name: 'Red Onions', quantity: 20, unit: 'lb', unit_cost: 1.25 },
    { name: 'Garlic Heads', quantity: 30, unit: 'each', unit_cost: 0.75 },
  ], 'submitted', '2026-04-02', '2026-04-04', 'Spring menu produce order', 'Malik Alexander'),
  makePO('po8', 'PO-2026-008', 'Artisan Coffee Roasters', [
    { name: 'Ethiopian Single Origin', quantity: 10, unit: 'lb', unit_cost: 18.00 },
    { name: 'House Espresso Blend', quantity: 15, unit: 'lb', unit_cost: 14.50 },
    { name: 'Decaf Colombian', quantity: 5, unit: 'lb', unit_cost: 16.00 },
  ], 'approved', '2026-04-03', '2026-04-05', 'Coffee program restock', 'Malik Alexander'),
  makePO('po9', 'PO-2026-009', 'CleanPro Restaurant Supply', [
    { name: 'Nitrile Gloves (case)', quantity: 4, unit: 'case', unit_cost: 32.00 },
    { name: 'Sanitizer Concentrate', quantity: 6, unit: 'gal', unit_cost: 22.00 },
    { name: 'Bar Towels (pack)', quantity: 10, unit: 'pack', unit_cost: 15.00 },
  ], 'received', '2026-04-01', '2026-04-03', 'Cleaning supplies reorder', 'Malik Alexander'),
  makePO('po10', 'PO-2026-010', 'Heritage Meats Co.', [
    { name: 'Lamb Rack', quantity: 15, unit: 'lb', unit_cost: 24.00 },
    { name: 'Duck Breast', quantity: 20, unit: 'lb', unit_cost: 16.50 },
  ], 'draft', '2026-04-05', '2026-04-08', 'Special tasting menu proteins', 'Malik Alexander'),
  makePO('po11', 'PO-2026-011', 'Green Valley Organics', [
    { name: 'Microgreen Mix', quantity: 8, unit: 'lb', unit_cost: 28.00 },
    { name: 'Edible Flowers', quantity: 5, unit: 'pack', unit_cost: 12.00 },
    { name: 'Fresh Thyme', quantity: 10, unit: 'bunch', unit_cost: 2.50 },
    { name: 'Rosemary', quantity: 10, unit: 'bunch', unit_cost: 2.50 },
  ], 'draft', '2026-04-06', '2026-04-09', 'Garnish and herb order', 'Malik Alexander'),
  makePO('po12', 'PO-2026-012', 'Sunrise Bakery Supply', [
    { name: 'Belgian Dark Chocolate', quantity: 15, unit: 'lb', unit_cost: 12.00 },
    { name: 'Vanilla Extract (pure)', quantity: 4, unit: 'qt', unit_cost: 35.00 },
    { name: 'Almond Flour', quantity: 20, unit: 'lb', unit_cost: 8.50 },
  ], 'submitted', '2026-04-04', '2026-04-07', 'Pastry program ingredients', 'Malik Alexander'),
  makePO('po13', 'PO-2026-013', 'Atlantic Catch Seafood', [
    { name: 'Oysters (dozen)', quantity: 10, unit: 'dozen', unit_cost: 18.00 },
    { name: 'Lobster Tails', quantity: 12, unit: 'each', unit_cost: 22.00 },
    { name: 'Mahi Mahi Fillet', quantity: 20, unit: 'lb', unit_cost: 11.00 },
  ], 'draft', '2026-04-07', '2026-04-10', 'Weekend seafood feature prep', 'Malik Alexander'),
  makePO('po14', 'PO-2026-014', 'Peachtree Beverage Dist.', [
    { name: 'Prosecco (case)', quantity: 6, unit: 'case', unit_cost: 95.00 },
    { name: 'Tonic Water (case)', quantity: 8, unit: 'case', unit_cost: 24.00 },
    { name: 'Fresh Citrus Juice (gal)', quantity: 5, unit: 'gal', unit_cost: 16.00 },
  ], 'cancelled', '2026-03-20', '2026-03-24', 'Cancelled - vendor out of stock on prosecco', 'Malik Alexander'),
];

let purchaseOrders = [...mockPurchaseOrders];

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pendingDelivery = purchaseOrders.filter(po => po.status === 'approved' || po.status === 'submitted').length;
  const thisMonth = purchaseOrders.filter(po => po.order_date.startsWith('2026-04'));
  const totalThisMonth = thisMonth.reduce((sum, po) => sum + po.total, 0);
  const avgOrderValue = purchaseOrders.length > 0
    ? Math.round(purchaseOrders.reduce((sum, po) => sum + po.total, 0) / purchaseOrders.length * 100) / 100
    : 0;

  return NextResponse.json({
    purchase_orders: purchaseOrders,
    stats: {
      total_pos: purchaseOrders.length,
      pending_delivery: pendingDelivery,
      total_this_month: totalThisMonth,
      avg_order_value: avgOrderValue,
    },
  });
}

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { vendor_name, items, expected_delivery, notes, created_by } = body;

  if (!vendor_name) return NextResponse.json({ error: 'Vendor name is required' }, { status: 400 });
  if (!items || items.length === 0) return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 });

  const poNum = purchaseOrders.length + 1;
  const subtotal = calcSubtotal(items);
  const tax = Math.round(subtotal * 0.08 * 100) / 100;

  const newPO: PurchaseOrder = {
    id: `po${Date.now()}`,
    po_number: `PO-2026-${String(poNum).padStart(3, '0')}`,
    vendor_name,
    items,
    subtotal,
    tax,
    total: Math.round((subtotal + tax) * 100) / 100,
    status: 'draft',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery: expected_delivery || '',
    notes: notes || '',
    created_by: created_by || 'Staff',
  };

  purchaseOrders = [newPO, ...purchaseOrders];

  return NextResponse.json({ purchase_order: newPO });
}

export async function PUT(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, status } = body;

  if (!id) return NextResponse.json({ error: 'PO id is required' }, { status: 400 });

  const index = purchaseOrders.findIndex(po => po.id === id);
  if (index === -1) return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 });

  if (status) {
    purchaseOrders[index] = { ...purchaseOrders[index], status };
  }

  return NextResponse.json({ purchase_order: purchaseOrders[index] });
}
