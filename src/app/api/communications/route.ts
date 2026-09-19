import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

type Channel = 'email' | 'sms' | 'in_app' | 'social' | 'review';
type Direction = 'inbound' | 'outbound';
type Status = 'sent' | 'delivered' | 'read' | 'replied' | 'failed';

interface Communication {
  id: string;
  customer_name: string;
  customer_email: string;
  channel: Channel;
  direction: Direction;
  subject: string;
  preview_text: string;
  full_text: string;
  status: Status;
  created_at: string;
  tags: string[];
}

function generateMockCommunications(): Communication[] {
  const now = new Date();
  const communications: Communication[] = [
    {
      id: 'comm-001',
      customer_name: 'Sarah Mitchell',
      customer_email: 'sarah.mitchell@gmail.com',
      channel: 'email',
      direction: 'inbound',
      subject: 'Reservation for Anniversary Dinner',
      preview_text: 'Hi, I would like to book a table for 4 this Saturday...',
      full_text: 'Hi, I would like to book a table for 4 this Saturday evening for our wedding anniversary. We celebrated here last year and loved it. Could we get the corner booth by the window? Also, is it possible to arrange a small cake? Thank you!',
      status: 'read',
      created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      tags: ['reservation', 'vip', 'anniversary'],
    },
    {
      id: 'comm-002',
      customer_name: 'Sarah Mitchell',
      customer_email: 'sarah.mitchell@gmail.com',
      channel: 'email',
      direction: 'outbound',
      subject: 'Re: Reservation for Anniversary Dinner',
      preview_text: 'Happy Anniversary, Sarah! We have reserved the corner booth...',
      full_text: 'Happy Anniversary, Sarah! We have reserved the corner booth by the window for 4 guests this Saturday at 7:30 PM. We will have a complimentary anniversary cake ready for you. Looking forward to making your evening special!',
      status: 'delivered',
      created_at: new Date(now.getTime() - 1.5 * 60 * 60 * 1000).toISOString(),
      tags: ['reservation', 'vip'],
    },
    {
      id: 'comm-003',
      customer_name: 'Marcus Johnson',
      customer_email: 'marcus.j@outlook.com',
      channel: 'sms',
      direction: 'outbound',
      subject: 'Loyalty Reward Notification',
      preview_text: 'Congrats Marcus! You have earned a free appetizer...',
      full_text: 'Congrats Marcus! You have earned a free appetizer with your next visit. Your loyalty points balance: 2,450. Redeem anytime by showing this message to your server. See you soon!',
      status: 'delivered',
      created_at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
      tags: ['loyalty', 'reward'],
    },
    {
      id: 'comm-004',
      customer_name: 'Emily Chen',
      customer_email: 'echen@yahoo.com',
      channel: 'review',
      direction: 'inbound',
      subject: 'Google Review - 5 Stars',
      preview_text: 'Absolutely incredible dining experience! The lobster bisque was...',
      full_text: 'Absolutely incredible dining experience! The lobster bisque was the best I have ever had. Our server James was attentive without being intrusive. The ambiance is perfect for date night. We will definitely be back. Highly recommend the chef\'s tasting menu!',
      status: 'read',
      created_at: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      tags: ['review', 'positive', '5-star'],
    },
    {
      id: 'comm-005',
      customer_name: 'Emily Chen',
      customer_email: 'echen@yahoo.com',
      channel: 'review',
      direction: 'outbound',
      subject: 'Re: Google Review - 5 Stars',
      preview_text: 'Thank you so much, Emily! We are thrilled you enjoyed...',
      full_text: 'Thank you so much, Emily! We are thrilled you enjoyed the lobster bisque and the chef\'s tasting menu. James will be delighted to hear your kind words. We look forward to welcoming you back soon!',
      status: 'sent',
      created_at: new Date(now.getTime() - 4.5 * 60 * 60 * 1000).toISOString(),
      tags: ['review', 'response'],
    },
    {
      id: 'comm-006',
      customer_name: 'David Park',
      customer_email: 'dpark@techcorp.io',
      channel: 'email',
      direction: 'inbound',
      subject: 'Corporate Event Inquiry',
      preview_text: 'We are looking to host a team dinner for 30 people...',
      full_text: 'We are looking to host a team dinner for 30 people next month. Can you accommodate a private dining experience? We would need a prix fixe menu with vegetarian and gluten-free options. Budget is around $150 per person including drinks. Please send over available dates and menu options.',
      status: 'read',
      created_at: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      tags: ['corporate', 'event', 'high-value'],
    },
    {
      id: 'comm-007',
      customer_name: 'Lisa Torres',
      customer_email: 'lisa.torres@gmail.com',
      channel: 'social',
      direction: 'inbound',
      subject: 'Instagram DM',
      preview_text: 'Love your new spring menu! Is the truffle pasta available...',
      full_text: 'Love your new spring menu! Is the truffle pasta available for takeout? Also, do you have any upcoming wine tasting events? My friends and I have been wanting to try one!',
      status: 'replied',
      created_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      tags: ['social', 'menu-inquiry'],
    },
    {
      id: 'comm-008',
      customer_name: 'Lisa Torres',
      customer_email: 'lisa.torres@gmail.com',
      channel: 'social',
      direction: 'outbound',
      subject: 'Re: Instagram DM',
      preview_text: 'Thanks for the love, Lisa! Yes, the truffle pasta is available...',
      full_text: 'Thanks for the love, Lisa! Yes, the truffle pasta is available for takeout. Our next wine tasting is April 19th - link in bio to reserve spots. Bring your friends, it is going to be a great evening!',
      status: 'delivered',
      created_at: new Date(now.getTime() - 5.5 * 60 * 60 * 1000).toISOString(),
      tags: ['social', 'event-promo'],
    },
    {
      id: 'comm-009',
      customer_name: 'Robert Kim',
      customer_email: 'r.kim@email.com',
      channel: 'sms',
      direction: 'inbound',
      subject: 'SMS Reply',
      preview_text: 'Can I change my reservation from 7pm to 8pm tonight?',
      full_text: 'Can I change my reservation from 7pm to 8pm tonight? Party of 6, name is Kim.',
      status: 'replied',
      created_at: new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString(),
      tags: ['reservation', 'modification'],
    },
    {
      id: 'comm-010',
      customer_name: 'Robert Kim',
      customer_email: 'r.kim@email.com',
      channel: 'sms',
      direction: 'outbound',
      subject: 'Re: Reservation Change',
      preview_text: 'Done! Your reservation is updated to 8pm for 6 guests...',
      full_text: 'Done! Your reservation is updated to 8pm for 6 guests tonight. See you then, Robert!',
      status: 'delivered',
      created_at: new Date(now.getTime() - 9.5 * 60 * 60 * 1000).toISOString(),
      tags: ['reservation', 'confirmed'],
    },
    {
      id: 'comm-011',
      customer_name: 'Angela Wright',
      customer_email: 'angela.w@proton.me',
      channel: 'in_app',
      direction: 'outbound',
      subject: 'Happy Birthday, Angela!',
      preview_text: 'Wishing you a wonderful birthday! Enjoy a complimentary dessert...',
      full_text: 'Wishing you a wonderful birthday! Enjoy a complimentary dessert on us during your next visit this month. Just show this notification to your server. We hope to see you soon!',
      status: 'delivered',
      created_at: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      tags: ['birthday', 'promotion'],
    },
    {
      id: 'comm-012',
      customer_name: 'James Wilson',
      customer_email: 'jwilson@gmail.com',
      channel: 'review',
      direction: 'inbound',
      subject: 'Yelp Review - 3 Stars',
      preview_text: 'Food was good but the wait time was too long. We waited 40 minutes...',
      full_text: 'Food was good but the wait time was too long. We waited 40 minutes past our reservation time to be seated. Once seated, service was fine and the steak was cooked perfectly. Just need to work on the front-of-house timing.',
      status: 'read',
      created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['review', 'mixed', 'wait-time'],
    },
    {
      id: 'comm-013',
      customer_name: 'James Wilson',
      customer_email: 'jwilson@gmail.com',
      channel: 'review',
      direction: 'outbound',
      subject: 'Re: Yelp Review - 3 Stars',
      preview_text: 'James, thank you for your honest feedback. We sincerely apologize...',
      full_text: 'James, thank you for your honest feedback. We sincerely apologize for the wait. We have since adjusted our reservation spacing during peak hours to prevent this. We would love to make it up to you - please reach out for a complimentary appetizer on your next visit.',
      status: 'sent',
      created_at: new Date(now.getTime() - 22 * 60 * 60 * 1000).toISOString(),
      tags: ['review', 'response', 'recovery'],
    },
    {
      id: 'comm-014',
      customer_name: 'Priya Sharma',
      customer_email: 'priya.s@hotmail.com',
      channel: 'email',
      direction: 'outbound',
      subject: 'Your Feedback Matters',
      preview_text: 'Hi Priya, we noticed you dined with us last week...',
      full_text: 'Hi Priya, we noticed you dined with us last week and wanted to check in. How was your experience? Your feedback helps us improve. As a thank you for sharing your thoughts, enjoy 10% off your next visit with code FEEDBACK10.',
      status: 'delivered',
      created_at: new Date(now.getTime() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['feedback', 'follow-up', 'discount'],
    },
    {
      id: 'comm-015',
      customer_name: 'Priya Sharma',
      customer_email: 'priya.s@hotmail.com',
      channel: 'email',
      direction: 'inbound',
      subject: 'Re: Your Feedback Matters',
      preview_text: 'Everything was great! The lamb chops were amazing. Only suggestion...',
      full_text: 'Everything was great! The lamb chops were amazing. Only suggestion would be to add more vegetarian appetizer options. My husband is vegetarian and the choices were limited. But overall a wonderful evening, thank you!',
      status: 'read',
      created_at: new Date(now.getTime() - 1.2 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['feedback', 'menu-suggestion'],
    },
    {
      id: 'comm-016',
      customer_name: 'Tom Bradley',
      customer_email: 'tom.b@icloud.com',
      channel: 'sms',
      direction: 'outbound',
      subject: 'Reservation Reminder',
      preview_text: 'Reminder: Your table for 2 is confirmed for tomorrow at 7:30 PM...',
      full_text: 'Reminder: Your table for 2 is confirmed for tomorrow at 7:30 PM. Reply C to confirm or X to cancel. We look forward to seeing you!',
      status: 'delivered',
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['reservation', 'reminder'],
    },
    {
      id: 'comm-017',
      customer_name: 'Tom Bradley',
      customer_email: 'tom.b@icloud.com',
      channel: 'sms',
      direction: 'inbound',
      subject: 'SMS Reply',
      preview_text: 'C',
      full_text: 'C',
      status: 'read',
      created_at: new Date(now.getTime() - 1.9 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['reservation', 'confirmed'],
    },
    {
      id: 'comm-018',
      customer_name: 'Nina Petrova',
      customer_email: 'nina.p@email.com',
      channel: 'in_app',
      direction: 'outbound',
      subject: 'New Spring Menu Launch',
      preview_text: 'Exciting news! Our spring menu is here featuring fresh...',
      full_text: 'Exciting news! Our spring menu is here featuring fresh seasonal ingredients from local farms. Highlights include pan-seared halibut, spring pea risotto, and strawberry basil sorbet. Reserve your table today and be among the first to try it!',
      status: 'delivered',
      created_at: new Date(now.getTime() - 2.5 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['menu', 'seasonal', 'promotion'],
    },
    {
      id: 'comm-019',
      customer_name: 'Carlos Mendez',
      customer_email: 'cmendez@gmail.com',
      channel: 'social',
      direction: 'inbound',
      subject: 'Facebook Message',
      preview_text: 'Do you offer catering for weddings? Looking for a caterer...',
      full_text: 'Do you offer catering for weddings? Looking for a caterer for our September wedding, approximately 120 guests. We love your food and it would be amazing to have it at our reception!',
      status: 'read',
      created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['catering', 'wedding', 'high-value'],
    },
    {
      id: 'comm-020',
      customer_name: 'Carlos Mendez',
      customer_email: 'cmendez@gmail.com',
      channel: 'email',
      direction: 'outbound',
      subject: 'Wedding Catering - Carlos Mendez',
      preview_text: 'Carlos, congratulations on your upcoming wedding! We would love...',
      full_text: 'Carlos, congratulations on your upcoming wedding! We would love to cater your September reception. I have attached our wedding catering menu and pricing for 120 guests. Let us set up a tasting session at your convenience. Our catering coordinator Maria will follow up this week.',
      status: 'delivered',
      created_at: new Date(now.getTime() - 2.8 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['catering', 'wedding', 'follow-up'],
    },
    {
      id: 'comm-021',
      customer_name: 'Rachel Green',
      customer_email: 'rgreen@live.com',
      channel: 'email',
      direction: 'inbound',
      subject: 'Allergy Information Request',
      preview_text: 'My daughter has a severe nut allergy. Can you provide...',
      full_text: 'My daughter has a severe nut allergy. Can you provide a list of dishes that are nut-free? We are planning to visit this weekend and want to ensure it is safe for her. She is also dairy-free. Thank you for your help!',
      status: 'replied',
      created_at: new Date(now.getTime() - 3.5 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['allergy', 'dietary', 'safety'],
    },
    {
      id: 'comm-022',
      customer_name: 'Rachel Green',
      customer_email: 'rgreen@live.com',
      channel: 'email',
      direction: 'outbound',
      subject: 'Re: Allergy Information Request',
      preview_text: 'Rachel, your daughter\'s safety is our top priority...',
      full_text: 'Rachel, your daughter\'s safety is our top priority. I have attached our complete allergen guide. We have 12 dishes that are both nut-free and dairy-free. Our chef can also modify several others. Please let our host know upon arrival and we will ensure the kitchen takes all necessary precautions.',
      status: 'delivered',
      created_at: new Date(now.getTime() - 3.2 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['allergy', 'dietary', 'response'],
    },
    {
      id: 'comm-023',
      customer_name: 'Mike Thompson',
      customer_email: 'mike.t@work.com',
      channel: 'in_app',
      direction: 'outbound',
      subject: 'We Miss You!',
      preview_text: 'It has been a while since your last visit. Come back and enjoy...',
      full_text: 'It has been a while since your last visit, Mike! Come back and enjoy 15% off your next meal with code MISSYOU15. Valid for the next 2 weeks. We have some exciting new dishes we think you will love!',
      status: 'read',
      created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['win-back', 'discount', 're-engagement'],
    },
    {
      id: 'comm-024',
      customer_name: 'Sophie Laurent',
      customer_email: 'sophie.l@email.com',
      channel: 'review',
      direction: 'inbound',
      subject: 'Google Review - 4 Stars',
      preview_text: 'Beautiful restaurant with great cocktails. The mushroom risotto...',
      full_text: 'Beautiful restaurant with great cocktails. The mushroom risotto was divine. Only reason for 4 stars instead of 5 is the noise level on Friday night made conversation difficult. Would love to see some acoustic improvements. Will definitely return on a weeknight!',
      status: 'read',
      created_at: new Date(now.getTime() - 4.5 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['review', 'positive', '4-star', 'noise'],
    },
    {
      id: 'comm-025',
      customer_name: 'Derek Hayes',
      customer_email: 'dhayes@email.com',
      channel: 'sms',
      direction: 'outbound',
      subject: 'Weekend Special',
      preview_text: 'This weekend only: 3-course prix fixe for $65 including wine pairing...',
      full_text: 'This weekend only: 3-course prix fixe for $65 including wine pairing! Limited availability. Reply BOOK to reserve your spot or visit our website. Hope to see you there, Derek!',
      status: 'failed',
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['promotion', 'weekend-special'],
    },
    {
      id: 'comm-026',
      customer_name: 'Amanda Foster',
      customer_email: 'afoster@gmail.com',
      channel: 'email',
      direction: 'inbound',
      subject: 'Gift Card Purchase',
      preview_text: 'I would like to purchase a $200 gift card for my parents...',
      full_text: 'I would like to purchase a $200 gift card for my parents\' 40th anniversary. Can I get a physical card mailed to their address? I would also love to add a personalized message. Is there a way to do that online or do I need to call?',
      status: 'read',
      created_at: new Date(now.getTime() - 5.5 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['gift-card', 'sales'],
    },
    {
      id: 'comm-027',
      customer_name: 'Kevin O\'Brien',
      customer_email: 'kobrien@email.com',
      channel: 'social',
      direction: 'inbound',
      subject: 'Twitter Mention',
      preview_text: 'Just had the best brunch at @OurRestaurant! The eggs benedict...',
      full_text: 'Just had the best brunch at @OurRestaurant! The eggs benedict was perfection and the bottomless mimosas did not disappoint. Already planning our next visit. 10/10 recommend!',
      status: 'read',
      created_at: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['social', 'mention', 'positive'],
    },
    {
      id: 'comm-028',
      customer_name: 'Kevin O\'Brien',
      customer_email: 'kobrien@email.com',
      channel: 'social',
      direction: 'outbound',
      subject: 'Re: Twitter Mention',
      preview_text: 'So glad you loved it, Kevin! The brunch crew will be thrilled...',
      full_text: 'So glad you loved it, Kevin! The brunch crew will be thrilled to hear this. Next time you visit, ask for the off-menu lavender latte - you will not be disappointed!',
      status: 'sent',
      created_at: new Date(now.getTime() - 5.8 * 24 * 60 * 60 * 1000).toISOString(),
      tags: ['social', 'response', 'engagement'],
    },
  ];

  return communications;
}

export async function GET(request: NextRequest) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const channelFilter = searchParams.get('channel');
  const directionFilter = searchParams.get('direction');
  const statusFilter = searchParams.get('status');

  let communications = generateMockCommunications();

  if (channelFilter) {
    communications = communications.filter((c) => c.channel === channelFilter);
  }
  if (directionFilter) {
    communications = communications.filter((c) => c.direction === directionFilter);
  }
  if (statusFilter) {
    communications = communications.filter((c) => c.status === statusFilter);
  }

  const allComms = generateMockCommunications();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = allComms.filter((c) => new Date(c.created_at) >= oneWeekAgo);
  const replied = allComms.filter((c) => c.direction === 'inbound').length;
  const responses = allComms.filter(
    (c) => c.direction === 'outbound' && c.tags.includes('response')
  ).length;
  const unread = allComms.filter(
    (c) => c.direction === 'inbound' && c.status !== 'read' && c.status !== 'replied'
  ).length;

  const stats = {
    total_this_week: thisWeek.length,
    response_rate: replied > 0 ? Math.round((responses / replied) * 100) : 0,
    avg_response_time_hrs: 2.4,
    unread_count: unread,
  };

  return NextResponse.json({
    communications,
    stats,
    total: communications.length,
  });
}
