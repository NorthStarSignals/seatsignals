import { auth } from '@clerk/nextjs/server';
import { createServerSupabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const sampleReviews = [
  { rating: 5, author: 'Sarah M.', text: 'Absolutely incredible experience! The brisket was perfectly smoked and fell apart with just a fork. Our server Jake was attentive and friendly. Will definitely be back!' },
  { rating: 4, author: 'Mike T.', text: 'Really solid food. The pulled pork sandwich was great and the sides were generous. Only reason for 4 stars is we had to wait 20 minutes for a table on a Tuesday. But worth it.' },
  { rating: 3, author: 'Jennifer L.', text: 'Food was okay but nothing special. Brisket was a bit dry and the mac and cheese tasted like it came from a box. Service was fine though.' },
  { rating: 2, author: 'David R.', text: 'Disappointed. Ordered the ribs which were overcooked. Waited 40 minutes for food. Server seemed overwhelmed. Expected better based on the hype.' },
  { rating: 5, author: 'Amy K.', text: 'Best BBQ in Dallas hands down! We ordered the family platter and everything was perfect. The cornbread alone is worth the trip. Kids loved it too.' },
  { rating: 1, author: 'Robert H.', text: 'Terrible experience. Found a hair in my coleslaw and when I told the manager he just shrugged. Never coming back.' },
  { rating: 4, author: 'Lisa P.', text: 'Great atmosphere and the food is consistently good. Love the outdoor patio. The banana pudding dessert is a must-try. Parking can be tricky on weekends.' },
  { rating: 5, author: 'Chris W.', text: 'Had our company lunch here and everyone raved about it. The catering menu is great value and they delivered right on time. Already planning to order again next month.' },
];

export async function POST() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServerSupabase();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('restaurant_id, name, cuisine_type, brand_voice')
    .eq('clerk_user_id', userId)
    .single();

  if (!restaurant) return NextResponse.json({ error: 'No restaurant' }, { status: 404 });

  // Pick 3-5 random reviews
  const count = Math.floor(Math.random() * 3) + 3;
  const shuffled = [...sampleReviews].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  const anthropic = new Anthropic();

  for (const review of selected) {
    // Generate AI response
    let responseText = '';
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        system: `You are writing a Google review response on behalf of ${restaurant.name}, a ${restaurant.cuisine_type} restaurant. Their brand voice is: ${restaurant.brand_voice || 'friendly and professional'}. Write a response that is warm, specific to the review content, and matches the brand tone. Keep it under 100 words. Do not use em dashes, semicolons, or lists of three parallel items. No generic phrases like "We appreciate your feedback." Reference something specific the reviewer mentioned.`,
        messages: [
          { role: 'user', content: `Review (${review.rating} stars): ${review.text}` },
        ],
      });

      const textBlock = message.content.find(b => b.type === 'text');
      responseText = textBlock ? textBlock.text : '';
    } catch {
      responseText = `Thank you for your review! We're glad you visited ${restaurant.name}.`;
    }

    const isPositive = review.rating >= 4;
    const responseStatus = isPositive ? 'posted' : 'pending_approval';

    await supabase.from('reviews').insert({
      restaurant_id: restaurant.restaurant_id,
      platform: 'google',
      author: review.author,
      rating: review.rating,
      text: review.text,
      response_text: responseText,
      response_status: responseStatus,
      responded_at: isPositive ? new Date().toISOString() : null,
    });
  }

  return NextResponse.json({ success: true, count: selected.length });
}
