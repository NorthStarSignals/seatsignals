import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
  cost: number;
}

interface Recipe {
  id: string;
  name: string;
  category: 'appetizer' | 'entree' | 'dessert' | 'drink' | 'side' | 'sauce';
  ingredients: Ingredient[];
  prep_time_min: number;
  cook_time_min: number;
  yield_servings: number;
  food_cost: number;
  sell_price: number;
  margin_pct: number;
  allergens: string[];
  dietary_tags: string[];
  instructions: string;
  image_url: string;
  is_active: boolean;
}

const mockRecipes: Recipe[] = [
  {
    id: 'r1',
    name: 'Truffle Parmesan Fries',
    category: 'appetizer',
    ingredients: [
      { name: 'Russet Potatoes', quantity: 2, unit: 'lbs', cost: 1.20 },
      { name: 'Truffle Oil', quantity: 1, unit: 'tbsp', cost: 1.50 },
      { name: 'Parmesan Cheese', quantity: 0.25, unit: 'cup', cost: 0.90 },
      { name: 'Fryer Oil', quantity: 2, unit: 'cups', cost: 0.40 },
      { name: 'Sea Salt', quantity: 1, unit: 'tsp', cost: 0.05 },
    ],
    prep_time_min: 15,
    cook_time_min: 8,
    yield_servings: 4,
    food_cost: 4.05,
    sell_price: 14.00,
    margin_pct: 71.1,
    allergens: ['dairy'],
    dietary_tags: ['vegetarian', 'gf'],
    instructions: 'Cut potatoes into 1/4 inch strips. Soak in cold water 30 min. Pat dry and fry at 325F for 5 min, then 375F for 3 min until golden. Toss with truffle oil, parmesan, and salt.',
    image_url: '/images/recipes/truffle-fries.jpg',
    is_active: true,
  },
  {
    id: 'r2',
    name: 'Pan-Seared Salmon',
    category: 'entree',
    ingredients: [
      { name: 'Atlantic Salmon Fillet', quantity: 8, unit: 'oz', cost: 5.50 },
      { name: 'Lemon', quantity: 1, unit: 'each', cost: 0.30 },
      { name: 'Butter', quantity: 2, unit: 'tbsp', cost: 0.40 },
      { name: 'Capers', quantity: 1, unit: 'tbsp', cost: 0.25 },
      { name: 'Asparagus', quantity: 6, unit: 'spears', cost: 1.20 },
      { name: 'Olive Oil', quantity: 1, unit: 'tbsp', cost: 0.15 },
    ],
    prep_time_min: 10,
    cook_time_min: 12,
    yield_servings: 1,
    food_cost: 7.80,
    sell_price: 28.00,
    margin_pct: 72.1,
    allergens: ['fish', 'dairy'],
    dietary_tags: ['gf', 'keto'],
    instructions: 'Season salmon with salt and pepper. Heat olive oil in cast iron skillet over high heat. Sear skin-side down 4 min. Flip, add butter and capers, baste 3 min. Serve over grilled asparagus with lemon.',
    image_url: '/images/recipes/pan-seared-salmon.jpg',
    is_active: true,
  },
  {
    id: 'r3',
    name: 'Classic Caesar Salad',
    category: 'appetizer',
    ingredients: [
      { name: 'Romaine Hearts', quantity: 2, unit: 'heads', cost: 1.50 },
      { name: 'Caesar Dressing', quantity: 3, unit: 'oz', cost: 0.60 },
      { name: 'Croutons', quantity: 0.5, unit: 'cup', cost: 0.30 },
      { name: 'Parmesan Shaved', quantity: 1, unit: 'oz', cost: 0.75 },
      { name: 'Anchovy Fillets', quantity: 2, unit: 'each', cost: 0.40 },
    ],
    prep_time_min: 10,
    cook_time_min: 0,
    yield_servings: 2,
    food_cost: 3.55,
    sell_price: 13.00,
    margin_pct: 72.7,
    allergens: ['gluten', 'dairy', 'eggs', 'fish'],
    dietary_tags: [],
    instructions: 'Wash and chop romaine. Toss with caesar dressing. Top with croutons, shaved parmesan, and anchovy fillets. Finish with fresh cracked pepper.',
    image_url: '/images/recipes/caesar-salad.jpg',
    is_active: true,
  },
  {
    id: 'r4',
    name: 'Grilled Ribeye Steak',
    category: 'entree',
    ingredients: [
      { name: 'Ribeye Steak 14oz', quantity: 1, unit: 'each', cost: 12.00 },
      { name: 'Compound Butter', quantity: 1, unit: 'oz', cost: 0.50 },
      { name: 'Garlic', quantity: 3, unit: 'cloves', cost: 0.10 },
      { name: 'Rosemary', quantity: 2, unit: 'sprigs', cost: 0.15 },
      { name: 'Mashed Potatoes', quantity: 6, unit: 'oz', cost: 0.80 },
    ],
    prep_time_min: 5,
    cook_time_min: 14,
    yield_servings: 1,
    food_cost: 13.55,
    sell_price: 42.00,
    margin_pct: 67.7,
    allergens: ['dairy'],
    dietary_tags: ['gf', 'keto'],
    instructions: 'Bring steak to room temperature. Season generously with salt and pepper. Grill over high heat 4 min per side for medium-rare. Rest 5 min, top with compound butter, garlic, and rosemary.',
    image_url: '/images/recipes/grilled-ribeye.jpg',
    is_active: true,
  },
  {
    id: 'r5',
    name: 'Chocolate Lava Cake',
    category: 'dessert',
    ingredients: [
      { name: 'Dark Chocolate 70%', quantity: 4, unit: 'oz', cost: 1.80 },
      { name: 'Butter', quantity: 3, unit: 'tbsp', cost: 0.60 },
      { name: 'Eggs', quantity: 2, unit: 'each', cost: 0.50 },
      { name: 'Sugar', quantity: 0.25, unit: 'cup', cost: 0.10 },
      { name: 'Flour', quantity: 2, unit: 'tbsp', cost: 0.05 },
      { name: 'Vanilla Extract', quantity: 1, unit: 'tsp', cost: 0.20 },
    ],
    prep_time_min: 15,
    cook_time_min: 12,
    yield_servings: 2,
    food_cost: 3.25,
    sell_price: 12.00,
    margin_pct: 72.9,
    allergens: ['gluten', 'dairy', 'eggs'],
    dietary_tags: ['vegetarian'],
    instructions: 'Melt chocolate and butter together. Whisk eggs with sugar until thick. Fold in chocolate mixture, flour, and vanilla. Pour into buttered ramekins. Bake at 425F for 12 min. Invert onto plate and serve immediately.',
    image_url: '/images/recipes/chocolate-lava-cake.jpg',
    is_active: true,
  },
  {
    id: 'r6',
    name: 'Spicy Shrimp Tacos',
    category: 'entree',
    ingredients: [
      { name: 'Shrimp 16/20', quantity: 6, unit: 'each', cost: 3.00 },
      { name: 'Corn Tortillas', quantity: 3, unit: 'each', cost: 0.30 },
      { name: 'Chipotle Mayo', quantity: 2, unit: 'tbsp', cost: 0.40 },
      { name: 'Cabbage Slaw', quantity: 0.5, unit: 'cup', cost: 0.25 },
      { name: 'Avocado', quantity: 0.5, unit: 'each', cost: 0.75 },
      { name: 'Lime', quantity: 1, unit: 'each', cost: 0.15 },
    ],
    prep_time_min: 15,
    cook_time_min: 6,
    yield_servings: 1,
    food_cost: 4.85,
    sell_price: 16.00,
    margin_pct: 69.7,
    allergens: ['shellfish', 'eggs'],
    dietary_tags: ['gf'],
    instructions: 'Season shrimp with chili powder and cumin. Sear in hot pan 2 min per side. Warm tortillas. Assemble with cabbage slaw, chipotle mayo, avocado slices, and lime squeeze.',
    image_url: '/images/recipes/shrimp-tacos.jpg',
    is_active: true,
  },
  {
    id: 'r7',
    name: 'Classic Margarita',
    category: 'drink',
    ingredients: [
      { name: 'Tequila Blanco', quantity: 2, unit: 'oz', cost: 1.50 },
      { name: 'Triple Sec', quantity: 1, unit: 'oz', cost: 0.60 },
      { name: 'Fresh Lime Juice', quantity: 1, unit: 'oz', cost: 0.25 },
      { name: 'Simple Syrup', quantity: 0.5, unit: 'oz', cost: 0.05 },
      { name: 'Tajin Rim Salt', quantity: 1, unit: 'tsp', cost: 0.05 },
    ],
    prep_time_min: 3,
    cook_time_min: 0,
    yield_servings: 1,
    food_cost: 2.45,
    sell_price: 14.00,
    margin_pct: 82.5,
    allergens: [],
    dietary_tags: ['vegan', 'gf'],
    instructions: 'Rim glass with tajin salt. Shake tequila, triple sec, lime juice, and simple syrup with ice. Strain into glass over fresh ice. Garnish with lime wheel.',
    image_url: '/images/recipes/margarita.jpg',
    is_active: true,
  },
  {
    id: 'r8',
    name: 'Garlic Bread',
    category: 'side',
    ingredients: [
      { name: 'French Baguette', quantity: 0.5, unit: 'each', cost: 0.75 },
      { name: 'Butter', quantity: 3, unit: 'tbsp', cost: 0.60 },
      { name: 'Garlic', quantity: 4, unit: 'cloves', cost: 0.15 },
      { name: 'Parsley', quantity: 1, unit: 'tbsp', cost: 0.10 },
      { name: 'Mozzarella', quantity: 2, unit: 'oz', cost: 0.50 },
    ],
    prep_time_min: 5,
    cook_time_min: 8,
    yield_servings: 4,
    food_cost: 2.10,
    sell_price: 8.00,
    margin_pct: 73.8,
    allergens: ['gluten', 'dairy'],
    dietary_tags: ['vegetarian'],
    instructions: 'Split baguette lengthwise. Mix softened butter with minced garlic and parsley. Spread on bread halves. Top with mozzarella. Broil until golden and bubbly.',
    image_url: '/images/recipes/garlic-bread.jpg',
    is_active: true,
  },
  {
    id: 'r9',
    name: 'Thai Peanut Noodles',
    category: 'entree',
    ingredients: [
      { name: 'Rice Noodles', quantity: 8, unit: 'oz', cost: 1.00 },
      { name: 'Peanut Butter', quantity: 3, unit: 'tbsp', cost: 0.45 },
      { name: 'Soy Sauce', quantity: 2, unit: 'tbsp', cost: 0.15 },
      { name: 'Sesame Oil', quantity: 1, unit: 'tbsp', cost: 0.20 },
      { name: 'Chicken Breast', quantity: 6, unit: 'oz', cost: 1.80 },
      { name: 'Bean Sprouts', quantity: 0.5, unit: 'cup', cost: 0.30 },
      { name: 'Scallions', quantity: 3, unit: 'each', cost: 0.15 },
      { name: 'Peanuts Crushed', quantity: 2, unit: 'tbsp', cost: 0.35 },
    ],
    prep_time_min: 15,
    cook_time_min: 10,
    yield_servings: 2,
    food_cost: 4.40,
    sell_price: 18.00,
    margin_pct: 75.6,
    allergens: ['nuts', 'soy', 'sesame'],
    dietary_tags: ['gf'],
    instructions: 'Cook rice noodles according to package. Grill sliced chicken. Whisk peanut butter, soy sauce, sesame oil, lime juice, and sriracha. Toss noodles with sauce, top with chicken, bean sprouts, scallions, and crushed peanuts.',
    image_url: '/images/recipes/thai-peanut-noodles.jpg',
    is_active: true,
  },
  {
    id: 'r10',
    name: 'Tiramisu',
    category: 'dessert',
    ingredients: [
      { name: 'Mascarpone', quantity: 8, unit: 'oz', cost: 3.00 },
      { name: 'Ladyfingers', quantity: 12, unit: 'each', cost: 1.20 },
      { name: 'Espresso', quantity: 1, unit: 'cup', cost: 0.50 },
      { name: 'Eggs', quantity: 3, unit: 'each', cost: 0.75 },
      { name: 'Sugar', quantity: 0.5, unit: 'cup', cost: 0.15 },
      { name: 'Cocoa Powder', quantity: 2, unit: 'tbsp', cost: 0.20 },
    ],
    prep_time_min: 30,
    cook_time_min: 0,
    yield_servings: 6,
    food_cost: 5.80,
    sell_price: 11.00,
    margin_pct: 47.3,
    allergens: ['gluten', 'dairy', 'eggs'],
    dietary_tags: ['vegetarian'],
    instructions: 'Whisk egg yolks with sugar until pale. Fold in mascarpone. Whip egg whites to stiff peaks and fold in. Dip ladyfingers in espresso. Layer mascarpone cream and ladyfingers. Refrigerate 4 hours. Dust with cocoa powder before serving.',
    image_url: '/images/recipes/tiramisu.jpg',
    is_active: true,
  },
  {
    id: 'r11',
    name: 'BBQ Pulled Pork Sandwich',
    category: 'entree',
    ingredients: [
      { name: 'Pork Shoulder', quantity: 8, unit: 'oz', cost: 2.40 },
      { name: 'BBQ Sauce', quantity: 3, unit: 'oz', cost: 0.45 },
      { name: 'Brioche Bun', quantity: 1, unit: 'each', cost: 0.60 },
      { name: 'Coleslaw', quantity: 0.5, unit: 'cup', cost: 0.35 },
      { name: 'Pickles', quantity: 3, unit: 'slices', cost: 0.10 },
    ],
    prep_time_min: 20,
    cook_time_min: 480,
    yield_servings: 1,
    food_cost: 3.90,
    sell_price: 17.00,
    margin_pct: 77.1,
    allergens: ['gluten', 'eggs'],
    dietary_tags: [],
    instructions: 'Slow-cook pork shoulder with dry rub at 225F for 8 hours. Pull apart with forks. Toss with BBQ sauce. Toast brioche bun. Layer pulled pork, coleslaw, and pickles.',
    image_url: '/images/recipes/bbq-pulled-pork.jpg',
    is_active: true,
  },
  {
    id: 'r12',
    name: 'Mango Habanero Wings',
    category: 'appetizer',
    ingredients: [
      { name: 'Chicken Wings', quantity: 2, unit: 'lbs', cost: 3.60 },
      { name: 'Mango Puree', quantity: 0.5, unit: 'cup', cost: 0.80 },
      { name: 'Habanero Peppers', quantity: 2, unit: 'each', cost: 0.30 },
      { name: 'Honey', quantity: 2, unit: 'tbsp', cost: 0.40 },
      { name: 'Fryer Oil', quantity: 3, unit: 'cups', cost: 0.60 },
    ],
    prep_time_min: 10,
    cook_time_min: 15,
    yield_servings: 4,
    food_cost: 5.70,
    sell_price: 16.00,
    margin_pct: 64.4,
    allergens: [],
    dietary_tags: ['gf', 'keto'],
    instructions: 'Fry wings at 375F for 12-15 min until crispy. Blend mango puree with habanero, honey, and lime juice. Toss wings in sauce. Serve with ranch dipping sauce and celery.',
    image_url: '/images/recipes/mango-habanero-wings.jpg',
    is_active: true,
  },
  {
    id: 'r13',
    name: 'Mushroom Risotto',
    category: 'entree',
    ingredients: [
      { name: 'Arborio Rice', quantity: 1, unit: 'cup', cost: 0.80 },
      { name: 'Mixed Mushrooms', quantity: 8, unit: 'oz', cost: 3.50 },
      { name: 'White Wine', quantity: 0.5, unit: 'cup', cost: 1.00 },
      { name: 'Vegetable Stock', quantity: 4, unit: 'cups', cost: 0.60 },
      { name: 'Parmesan', quantity: 2, unit: 'oz', cost: 1.50 },
      { name: 'Butter', quantity: 2, unit: 'tbsp', cost: 0.40 },
      { name: 'Shallots', quantity: 2, unit: 'each', cost: 0.30 },
    ],
    prep_time_min: 10,
    cook_time_min: 25,
    yield_servings: 2,
    food_cost: 8.10,
    sell_price: 22.00,
    margin_pct: 63.2,
    allergens: ['dairy'],
    dietary_tags: ['vegetarian', 'gf'],
    instructions: 'Saute shallots in butter. Toast rice 2 min. Deglaze with wine. Add warm stock one ladle at a time, stirring constantly. Fold in sauteed mushrooms, parmesan, and butter. Season and serve immediately.',
    image_url: '/images/recipes/mushroom-risotto.jpg',
    is_active: true,
  },
  {
    id: 'r14',
    name: 'House Chimichurri',
    category: 'sauce',
    ingredients: [
      { name: 'Fresh Parsley', quantity: 2, unit: 'cups', cost: 0.80 },
      { name: 'Fresh Oregano', quantity: 0.5, unit: 'cup', cost: 0.40 },
      { name: 'Garlic', quantity: 6, unit: 'cloves', cost: 0.20 },
      { name: 'Red Wine Vinegar', quantity: 0.25, unit: 'cup', cost: 0.30 },
      { name: 'Olive Oil', quantity: 0.5, unit: 'cup', cost: 1.00 },
      { name: 'Red Pepper Flakes', quantity: 1, unit: 'tsp', cost: 0.05 },
    ],
    prep_time_min: 10,
    cook_time_min: 0,
    yield_servings: 16,
    food_cost: 2.75,
    sell_price: 4.00,
    margin_pct: 31.3,
    allergens: [],
    dietary_tags: ['vegan', 'gf', 'keto'],
    instructions: 'Finely chop parsley, oregano, and garlic. Combine with red wine vinegar, olive oil, and red pepper flakes. Season with salt. Let sit 30 min before serving. Keeps 5 days refrigerated.',
    image_url: '/images/recipes/chimichurri.jpg',
    is_active: true,
  },
  {
    id: 'r15',
    name: 'Lobster Mac & Cheese',
    category: 'entree',
    ingredients: [
      { name: 'Lobster Tail', quantity: 4, unit: 'oz', cost: 8.00 },
      { name: 'Cavatappi Pasta', quantity: 8, unit: 'oz', cost: 0.60 },
      { name: 'Gruyere Cheese', quantity: 3, unit: 'oz', cost: 2.00 },
      { name: 'Cheddar Cheese', quantity: 2, unit: 'oz', cost: 0.80 },
      { name: 'Heavy Cream', quantity: 1, unit: 'cup', cost: 0.90 },
      { name: 'Panko Breadcrumbs', quantity: 0.25, unit: 'cup', cost: 0.15 },
      { name: 'Butter', quantity: 2, unit: 'tbsp', cost: 0.40 },
    ],
    prep_time_min: 15,
    cook_time_min: 25,
    yield_servings: 2,
    food_cost: 12.85,
    sell_price: 32.00,
    margin_pct: 59.8,
    allergens: ['gluten', 'dairy', 'shellfish'],
    dietary_tags: [],
    instructions: 'Cook pasta al dente. Make cheese sauce with cream, gruyere, and cheddar. Poach lobster tail, chop into chunks. Fold pasta, cheese sauce, and lobster together. Top with buttered panko and broil until golden.',
    image_url: '/images/recipes/lobster-mac.jpg',
    is_active: true,
  },
  {
    id: 'r16',
    name: 'Vegan Buddha Bowl',
    category: 'entree',
    ingredients: [
      { name: 'Quinoa', quantity: 0.5, unit: 'cup', cost: 0.60 },
      { name: 'Roasted Chickpeas', quantity: 0.5, unit: 'cup', cost: 0.30 },
      { name: 'Sweet Potato', quantity: 1, unit: 'each', cost: 0.80 },
      { name: 'Avocado', quantity: 0.5, unit: 'each', cost: 0.75 },
      { name: 'Kale', quantity: 2, unit: 'cups', cost: 0.50 },
      { name: 'Tahini Dressing', quantity: 2, unit: 'tbsp', cost: 0.35 },
    ],
    prep_time_min: 15,
    cook_time_min: 25,
    yield_servings: 1,
    food_cost: 3.30,
    sell_price: 16.00,
    margin_pct: 79.4,
    allergens: ['sesame'],
    dietary_tags: ['vegan', 'gf', 'halal'],
    instructions: 'Cook quinoa. Roast cubed sweet potato and chickpeas with spices at 400F for 25 min. Massage kale with olive oil. Assemble bowl with quinoa base, roasted vegetables, avocado, and drizzle with tahini dressing.',
    image_url: '/images/recipes/buddha-bowl.jpg',
    is_active: true,
  },
  {
    id: 'r17',
    name: 'Espresso Martini',
    category: 'drink',
    ingredients: [
      { name: 'Vodka', quantity: 1.5, unit: 'oz', cost: 1.00 },
      { name: 'Kahlua', quantity: 1, unit: 'oz', cost: 0.80 },
      { name: 'Fresh Espresso', quantity: 1, unit: 'oz', cost: 0.50 },
      { name: 'Simple Syrup', quantity: 0.5, unit: 'oz', cost: 0.05 },
    ],
    prep_time_min: 3,
    cook_time_min: 0,
    yield_servings: 1,
    food_cost: 2.35,
    sell_price: 15.00,
    margin_pct: 84.3,
    allergens: [],
    dietary_tags: ['vegan', 'gf'],
    instructions: 'Shake vodka, kahlua, fresh espresso, and simple syrup vigorously with ice for 15 seconds. Double strain into chilled coupe glass. Garnish with three coffee beans.',
    image_url: '/images/recipes/espresso-martini.jpg',
    is_active: true,
  },
  {
    id: 'r18',
    name: 'Sesame Crusted Tuna',
    category: 'appetizer',
    ingredients: [
      { name: 'Ahi Tuna', quantity: 6, unit: 'oz', cost: 6.00 },
      { name: 'Sesame Seeds', quantity: 3, unit: 'tbsp', cost: 0.30 },
      { name: 'Soy Sauce', quantity: 2, unit: 'tbsp', cost: 0.15 },
      { name: 'Wasabi', quantity: 1, unit: 'tsp', cost: 0.20 },
      { name: 'Pickled Ginger', quantity: 1, unit: 'oz', cost: 0.25 },
      { name: 'Seaweed Salad', quantity: 2, unit: 'oz', cost: 0.80 },
    ],
    prep_time_min: 10,
    cook_time_min: 2,
    yield_servings: 2,
    food_cost: 7.70,
    sell_price: 18.00,
    margin_pct: 57.2,
    allergens: ['fish', 'soy', 'sesame'],
    dietary_tags: ['gf', 'keto'],
    instructions: 'Coat tuna in sesame seeds on all sides. Sear in very hot pan 30 sec per side for rare. Slice thin. Serve with soy dipping sauce, wasabi, pickled ginger, and seaweed salad.',
    image_url: '/images/recipes/sesame-tuna.jpg',
    is_active: true,
  },
];

function getStats(recipes: Recipe[]) {
  const total_recipes = recipes.length;
  const active_count = recipes.filter(r => r.is_active).length;
  const avg_food_cost_pct = recipes.length > 0
    ? Math.round(recipes.reduce((sum, r) => sum + (100 - r.margin_pct), 0) / recipes.length * 10) / 10
    : 0;

  const allergenCounts: Record<string, number> = {};
  const dietaryCounts: Record<string, number> = {};

  for (const r of recipes) {
    for (const a of r.allergens) {
      allergenCounts[a] = (allergenCounts[a] || 0) + 1;
    }
    for (const d of r.dietary_tags) {
      dietaryCounts[d] = (dietaryCounts[d] || 0) + 1;
    }
  }

  return {
    total_recipes,
    active_count,
    avg_food_cost_pct,
    allergen_summary: allergenCounts,
    dietary_breakdown: dietaryCounts,
  };
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

  const stats = getStats(mockRecipes);

  return NextResponse.json({
    recipes: mockRecipes,
    stats,
  });
}

export async function POST(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { name, category, ingredients, prep_time_min, cook_time_min, yield_servings, sell_price, allergens, dietary_tags, instructions } = body;

  if (!name || !category) {
    return NextResponse.json({ error: 'Missing required fields: name, category' }, { status: 400 });
  }

  const food_cost = (ingredients || []).reduce((sum: number, i: Ingredient) => sum + i.cost, 0);
  const margin_pct = sell_price > 0 ? Math.round((1 - food_cost / sell_price) * 1000) / 10 : 0;

  const newRecipe: Recipe = {
    id: `r_${Date.now()}`,
    name,
    category,
    ingredients: ingredients || [],
    prep_time_min: prep_time_min || 0,
    cook_time_min: cook_time_min || 0,
    yield_servings: yield_servings || 1,
    food_cost,
    sell_price: sell_price || 0,
    margin_pct,
    allergens: allergens || [],
    dietary_tags: dietary_tags || [],
    instructions: instructions || '',
    image_url: '',
    is_active: true,
  };

  return NextResponse.json({ recipe: newRecipe }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: 'Missing recipe id' }, { status: 400 });
  }

  const recipe = mockRecipes.find(r => r.id === id);
  if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });

  const updated = { ...recipe, ...body };
  if (body.ingredients) {
    updated.food_cost = body.ingredients.reduce((sum: number, i: Ingredient) => sum + i.cost, 0);
    if (updated.sell_price > 0) {
      updated.margin_pct = Math.round((1 - updated.food_cost / updated.sell_price) * 1000) / 10;
    }
  }

  return NextResponse.json({ recipe: updated });
}
