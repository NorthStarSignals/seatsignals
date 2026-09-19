import * as Sentry from '@sentry/nextjs';

// No-op if DSN isn't set — keeps local dev + previews quiet.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    // Don't fire events from browsers running ad blockers / privacy tools —
    // those show up as noise in our error feed.
    ignoreErrors: [
      'Non-Error promise rejection captured',
      /ResizeObserver loop/,
      /Network request failed/,
    ],
  });
}
