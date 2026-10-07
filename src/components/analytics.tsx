'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;
const CONSENT_KEY = 'seat_cookie_consent_v1';

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function accepted(): boolean {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return !!raw && JSON.parse(raw)?.choice === 'accept';
  } catch {
    return false;
  }
}

/**
 * Google Analytics 4 and Microsoft Clarity for SeatSignals.
 *
 * Loads only when BOTH are true:
 *   1. the visitor chose "Accept all" in the cookie banner, and
 *   2. the route is a public page, never the authenticated /dashboard app,
 *      so tenant data is not sent to GA or Clarity.
 *
 * The cookie banner dispatches `seat-consent-changed` on choice, so tracking
 * starts the moment someone accepts, with no reload. Renders nothing when the
 * IDs are unset (for example before the Vercel env vars are added).
 */
export function Analytics() {
  const pathname = usePathname();
  const [consented, setConsented] = useState(false);
  const firstRender = useRef(true);

  useEffect(() => {
    setConsented(accepted());
    const onChange = () => setConsented(accepted());
    window.addEventListener('seat-consent-changed', onChange);
    return () => window.removeEventListener('seat-consent-changed', onChange);
  }, []);

  const isPublic = !pathname?.startsWith('/dashboard');

  // GA4 sends the first page_view from the config script below. This sends one
  // on each later client-side navigation between public pages, and never fires
  // on the dashboard.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (consented && isPublic && GA_ID && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', { page_path: pathname });
    }
  }, [pathname, consented, isPublic]);

  if (!consented || !isPublic) return null;

  return (
    <>
      {GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`}
          </Script>
        </>
      )}
      {CLARITY_ID && (
        <Script id="clarity-init" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`}
        </Script>
      )}
    </>
  );
}
