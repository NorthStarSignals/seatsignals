import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

type Platform = 'instagram' | 'facebook' | 'twitter' | 'tiktok';
type PostStatus = 'draft' | 'scheduled' | 'published';

interface SocialPost {
  id: string;
  restaurant_id: string;
  platform: Platform;
  content: string;
  image_url: string | null;
  hashtags: string[];
  status: PostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  created_at: string;
  updated_at: string;
}

function generateMockPosts(restaurantName: string): SocialPost[] {
  const now = new Date();
  const rid = 'mock-restaurant-id';

  const posts: SocialPost[] = [
    {
      id: 'sp-001',
      restaurant_id: rid,
      platform: 'instagram',
      content: `Fresh ingredients, bold flavors. Our new spring menu is here and it\'s everything you\'ve been craving. Come taste what\'s new at ${restaurantName}! 🌿`,
      image_url: '/images/spring-menu.jpg',
      hashtags: ['#SpringMenu', '#FreshFlavors', '#FoodieLife', '#LocalEats', '#RestaurantLife'],
      status: 'published',
      scheduled_at: null,
      published_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      likes: 234,
      comments: 18,
      shares: 12,
      reach: 3420,
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'sp-002',
      restaurant_id: rid,
      platform: 'facebook',
      content: `Happy Hour just got happier! Join us every weekday from 4-6 PM for half-price appetizers and $5 craft cocktails. Bring a friend, bring the whole crew. ${restaurantName} is the place to be after work.`,
      image_url: '/images/happy-hour.jpg',
      hashtags: ['#HappyHour', '#CraftCocktails', '#AfterWork'],
      status: 'published',
      scheduled_at: null,
      published_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      likes: 156,
      comments: 23,
      shares: 45,
      reach: 5210,
      created_at: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'sp-003',
      restaurant_id: rid,
      platform: 'twitter',
      content: `Weekend brunch lineup is STACKED. Truffle eggs benedict, lemon ricotta pancakes, bottomless mimosas. Need we say more? Reserve now.`,
      image_url: null,
      hashtags: ['#BrunchGoals', '#WeekendVibes'],
      status: 'published',
      scheduled_at: null,
      published_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      likes: 89,
      comments: 7,
      shares: 31,
      reach: 2180,
      created_at: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'sp-004',
      restaurant_id: rid,
      platform: 'tiktok',
      content: `POV: You walk into ${restaurantName} and the chef is preparing your meal right in front of you. The sizzle, the flames, the plating perfection. This is dinner theater. 🔥`,
      image_url: '/images/chef-cooking.mp4',
      hashtags: ['#ChefLife', '#FoodTok', '#RestaurantVibes', '#CookingVideo', '#FYP'],
      status: 'published',
      scheduled_at: null,
      published_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      likes: 1240,
      comments: 56,
      shares: 189,
      reach: 18500,
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'sp-005',
      restaurant_id: rid,
      platform: 'instagram',
      content: `Behind the scenes: Our pastry chef hand-rolling fresh pasta for tonight\'s special. Every strand made with love. Limited availability - call to reserve your plate.`,
      image_url: '/images/pasta-making.jpg',
      hashtags: ['#HandmadePasta', '#BehindTheScenes', '#ChefAtWork', '#FreshPasta', '#FoodArt'],
      status: 'published',
      scheduled_at: null,
      published_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      likes: 412,
      comments: 34,
      shares: 28,
      reach: 5890,
      created_at: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'sp-006',
      restaurant_id: rid,
      platform: 'facebook',
      content: `We\'re thrilled to announce our new Private Dining Room is now open for bookings! Perfect for birthdays, corporate events, and celebrations of all kinds. Seats up to 20 guests with a customizable prix fixe menu. DM us or call to inquire.`,
      image_url: '/images/private-dining.jpg',
      hashtags: ['#PrivateDining', '#EventSpace', '#Celebrations'],
      status: 'published',
      scheduled_at: null,
      published_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      likes: 198,
      comments: 42,
      shares: 67,
      reach: 7340,
      created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'sp-007',
      restaurant_id: rid,
      platform: 'instagram',
      content: `This week\'s special: Pan-seared Chilean sea bass with saffron risotto and roasted broccolini. Available Thursday through Sunday. Tag someone who needs this in their life.`,
      image_url: '/images/sea-bass.jpg',
      hashtags: ['#WeeklySpecial', '#SeaBass', '#FineDining', '#FoodPhotography', '#InstaFood'],
      status: 'scheduled',
      scheduled_at: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
      published_at: null,
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0,
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'sp-008',
      restaurant_id: rid,
      platform: 'twitter',
      content: `Live music Friday nights are BACK. This week: jazz trio from 7-10 PM. Great food, great drinks, great vibes. No cover charge.`,
      image_url: null,
      hashtags: ['#LiveMusic', '#FridayNight', '#JazzNight'],
      status: 'scheduled',
      scheduled_at: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      published_at: null,
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'sp-009',
      restaurant_id: rid,
      platform: 'tiktok',
      content: `Wait for it... Our signature dessert reveal. The chocolate lava cake that broke the internet last month is getting a summer twist. Coming soon.`,
      image_url: '/images/dessert-reveal.mp4',
      hashtags: ['#DessertReveal', '#ChocolateLavaCake', '#FoodTok', '#Viral', '#FYP'],
      status: 'scheduled',
      scheduled_at: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      published_at: null,
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'sp-010',
      restaurant_id: rid,
      platform: 'facebook',
      content: `Mother\'s Day is coming up! Treat Mom to a special 4-course dinner with complimentary champagne toast. Reservations filling up fast.`,
      image_url: '/images/mothers-day.jpg',
      hashtags: ['#MothersDay', '#SpecialDinner', '#TreatMom'],
      status: 'draft',
      scheduled_at: null,
      published_at: null,
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'sp-011',
      restaurant_id: rid,
      platform: 'instagram',
      content: `Our team is everything. Shoutout to our incredible kitchen crew who make magic happen every single night. We couldn\'t do it without you.`,
      image_url: '/images/team-photo.jpg',
      hashtags: ['#TeamAppreciation', '#KitchenCrew', '#RestaurantFamily', '#BehindTheScenes'],
      status: 'draft',
      scheduled_at: null,
      published_at: null,
      likes: 0,
      comments: 0,
      shares: 0,
      reach: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    },
    {
      id: 'sp-012',
      restaurant_id: rid,
      platform: 'twitter',
      content: `Quick poll: Should we add a spicy margarita to the menu? 🌶️ Reply YES or NO.`,
      image_url: null,
      hashtags: ['#MenuPoll', '#SpicyMargarita'],
      status: 'published',
      scheduled_at: null,
      published_at: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      likes: 67,
      comments: 94,
      shares: 8,
      reach: 1890,
      created_at: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  return posts;
}

// In-memory store (resets on server restart)
let postsCache: SocialPost[] | null = null;

export async function GET(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  if (!postsCache) {
    postsCache = generateMockPosts(restaurant.name);
  }

  const url = new URL(req.url);
  const platformFilter = url.searchParams.get('platform') as Platform | null;
  const statusFilter = url.searchParams.get('status') as PostStatus | null;

  let filtered = postsCache;

  if (platformFilter) {
    filtered = filtered.filter(p => p.platform === platformFilter);
  }
  if (statusFilter) {
    filtered = filtered.filter(p => p.status === statusFilter);
  }

  // Sort: scheduled first (by date asc), then published (by date desc), then drafts
  const sorted = [...filtered].sort((a, b) => {
    const statusOrder: Record<PostStatus, number> = { scheduled: 0, draft: 1, published: 2 };
    const orderDiff = statusOrder[a.status] - statusOrder[b.status];
    if (orderDiff !== 0) return orderDiff;

    if (a.status === 'scheduled' && a.scheduled_at && b.scheduled_at) {
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Engagement stats
  const published = postsCache.filter(p => p.status === 'published');
  const totalEngagement = published.reduce((s, p) => s + p.likes + p.comments + p.shares, 0);
  const avgEngagementRate = published.length > 0
    ? +((totalEngagement / published.reduce((s, p) => s + (p.reach || 1), 0)) * 100).toFixed(1)
    : 0;

  // Best platform by avg engagement rate
  const platformStats: Record<string, { engagement: number; reach: number; count: number }> = {};
  for (const p of published) {
    if (!platformStats[p.platform]) {
      platformStats[p.platform] = { engagement: 0, reach: 0, count: 0 };
    }
    platformStats[p.platform].engagement += p.likes + p.comments + p.shares;
    platformStats[p.platform].reach += p.reach;
    platformStats[p.platform].count += 1;
  }

  let bestPlatform = 'N/A';
  let bestRate = 0;
  const platformKeys = Object.keys(platformStats);
  for (let i = 0; i < platformKeys.length; i++) {
    const key = platformKeys[i];
    const stats = platformStats[key];
    const rate = stats.reach > 0 ? (stats.engagement / stats.reach) * 100 : 0;
    if (rate > bestRate) {
      bestRate = rate;
      bestPlatform = key;
    }
  }

  const scheduledCount = postsCache.filter(p => p.status === 'scheduled').length;

  return NextResponse.json({
    posts: sorted,
    stats: {
      totalPosts: postsCache.length,
      publishedPosts: published.length,
      scheduledPosts: scheduledCount,
      avgEngagementRate,
      bestPlatform,
      platformStats,
    },
  });
}

export async function POST(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  if (!postsCache) {
    postsCache = generateMockPosts(restaurant.name);
  }

  const body = await req.json();
  const { content, platform, image_url, scheduled_at, hashtags, status } = body;

  if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  if (!platform) return NextResponse.json({ error: 'Platform is required' }, { status: 400 });

  const validPlatforms: Platform[] = ['instagram', 'facebook', 'twitter', 'tiktok'];
  if (!validPlatforms.includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  const validStatuses: PostStatus[] = ['draft', 'scheduled'];
  const postStatus: PostStatus = validStatuses.includes(status) ? status : 'draft';

  if (postStatus === 'scheduled' && !scheduled_at) {
    return NextResponse.json({ error: 'Scheduled posts require scheduled_at' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const newPost: SocialPost = {
    id: `sp-${Date.now()}`,
    restaurant_id: restaurant.restaurant_id,
    platform,
    content,
    image_url: image_url || null,
    hashtags: hashtags || [],
    status: postStatus,
    scheduled_at: scheduled_at || null,
    published_at: null,
    likes: 0,
    comments: 0,
    shares: 0,
    reach: 0,
    created_at: now,
    updated_at: now,
  };

  postsCache.push(newPost);

  return NextResponse.json({ post: newPost });
}

export async function PUT(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  if (!postsCache) {
    postsCache = generateMockPosts(restaurant.name);
  }

  const body = await req.json();
  const { id, content, platform, image_url, scheduled_at, hashtags, status } = body;

  if (!id) return NextResponse.json({ error: 'Post id is required' }, { status: 400 });

  const postIndex = postsCache.findIndex(p => p.id === id);
  if (postIndex === -1) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  const post = postsCache[postIndex];

  if (post.status === 'published') {
    return NextResponse.json({ error: 'Cannot edit published posts' }, { status: 400 });
  }

  if (content !== undefined) post.content = content;
  if (platform !== undefined) post.platform = platform;
  if (image_url !== undefined) post.image_url = image_url;
  if (scheduled_at !== undefined) post.scheduled_at = scheduled_at;
  if (hashtags !== undefined) post.hashtags = hashtags;
  if (status !== undefined && (status === 'draft' || status === 'scheduled')) {
    post.status = status;
  }
  post.updated_at = new Date().toISOString();

  postsCache[postIndex] = post;

  return NextResponse.json({ post });
}

export async function DELETE(req: NextRequest) {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  if (!postsCache) {
    postsCache = generateMockPosts(restaurant.name);
  }

  const body = await req.json();
  const { id } = body;

  if (!id) return NextResponse.json({ error: 'Post id is required' }, { status: 400 });

  const postIndex = postsCache.findIndex(p => p.id === id);
  if (postIndex === -1) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  const post = postsCache[postIndex];
  if (post.status === 'published') {
    return NextResponse.json({ error: 'Cannot delete published posts' }, { status: 400 });
  }

  postsCache.splice(postIndex, 1);

  return NextResponse.json({ success: true });
}
