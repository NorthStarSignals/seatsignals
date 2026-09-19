import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  // Marketing / public-facing site
  '/',
  '/pricing',
  '/terms',
  '/privacy',
  '/changelog',

  // Auth flows
  '/sign-in(.*)',
  '/sign-up(.*)',

  // Public customer-facing pages (slug-based, no auth required)
  '/capture/(.*)',
  '/corporate/(.*)',
  '/events/(.*)',
  '/feedback/(.*)',
  '/gift-cards/(.*)',
  '/loyalty/(.*)',
  '/menu/(.*)',
  '/reservation/(.*)',
  '/survey/(.*)',
  '/wall/(.*)',
  '/wifi/(.*)',

  // Sentry tunnel (client beacons proxy through here)
  '/monitoring(.*)',

  // Public API endpoints
  '/api/health',
  '/api/webhooks/(.*)',
  '/api/capture(.*)',
  '/api/feedback(.*)',
  '/api/reservation(.*)',
  '/api/survey(.*)',
  // Cron jobs — auth via CRON_SECRET bearer token
  '/api/cron/(.*)',
  // Billing webhook — auth via Stripe signature
  '/api/billing/webhook',
]);

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
