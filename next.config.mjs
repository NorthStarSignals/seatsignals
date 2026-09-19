import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {};

// Wrap with Sentry — if SENTRY_DSN is unset, the wrapper is a no-op at runtime.
// We pass `silent: true` so missing sentry-cli credentials in local dev don't fail the build.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG || 'north-star',
  project: process.env.SENTRY_PROJECT || 'seatsignals',
  silent: true,
  widenClientFileUpload: true,
  reactComponentAnnotation: { enabled: false },
  tunnelRoute: '/monitoring',
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: false,
});
