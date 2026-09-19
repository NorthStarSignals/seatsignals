import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service · SeatSignals',
  description: 'The terms and conditions governing your use of SeatSignals.',
};

const LAST_UPDATED = 'April 21, 2026';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-seat-black text-white">
      <header className="border-b border-zinc-800 py-4 px-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Seat<span className="text-seat-red">Signals</span>
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8 text-zinc-300 leading-relaxed">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Terms of Service</h1>
          <p className="text-sm text-zinc-500 mt-2">Last updated: {LAST_UPDATED}</p>
        </div>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">1. Agreement</h2>
          <p>
            By creating an account or using SeatSignals (&quot;Service&quot;), you agree to these Terms.
            The Service is operated by North Star Holdings LLC (&quot;we&quot;, &quot;us&quot;). If you are using the Service
            on behalf of a business, you represent you have authority to bind that business.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">2. Service</h2>
          <p>
            SeatSignals provides a restaurant revenue operating system that aggregates data from third-party
            services (POS, review platforms, marketing tools), displays analytics, and enables automations. We
            may modify features from time to time. We strive for high availability but don&apos;t guarantee
            uninterrupted access.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">3. Subscriptions & billing</h2>
          <p>
            Paid plans renew monthly or annually as selected. Fees are charged in advance and are
            non-refundable except where required by law. You can cancel any time in Settings → Billing;
            cancellation takes effect at the end of the current period. We may change pricing with 30 days&apos;
            notice to existing subscribers.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">4. Your data</h2>
          <p>
            You retain all rights to data you submit or that we pull from integrations on your behalf
            (&quot;Customer Data&quot;). You grant us a limited license to process Customer Data solely to provide the
            Service. You are responsible for having rights to share Customer Data with us and for complying
            with applicable laws (including guest privacy and SMS/email consent regulations).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">5. Acceptable use</h2>
          <p>
            You agree not to: reverse engineer the Service; use it to send unsolicited messages that
            violate anti-spam laws (CAN-SPAM, TCPA, CASL, GDPR); upload malware; or use it for anything
            illegal. We can suspend accounts that violate these rules.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">6. Intellectual property</h2>
          <p>
            The Service, including its UI, code, and content we create, is owned by us or our licensors and
            protected by IP laws. You get a non-exclusive, non-transferable license to use the Service for
            your business while your subscription is active.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">7. Warranty disclaimer</h2>
          <p>
            The Service is provided &quot;as-is&quot; without warranty of any kind. We don&apos;t warrant that the
            Service is error-free, continuously available, or that analytics are perfectly accurate. You
            should verify critical business decisions against primary sources.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">8. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, our aggregate liability under these Terms will not
            exceed the fees you paid us in the 12 months preceding the claim. We are not liable for
            indirect, incidental, or consequential damages.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">9. Termination</h2>
          <p>
            You may terminate anytime by canceling your subscription. We may terminate or suspend for
            material breach of these Terms or nonpayment. On termination, your access ends and we will
            delete Customer Data within 30 days unless retention is legally required.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">10. Changes</h2>
          <p>
            We may update these Terms. Material changes will be notified by email or an in-app banner at
            least 14 days before they take effect. Continued use after that constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">11. Contact</h2>
          <p>
            Questions? Email <a href="mailto:hello@seatsignals.app" className="text-seat-red hover:underline">hello@seatsignals.app</a>.
          </p>
        </section>

        <section className="pt-8 border-t border-zinc-800">
          <Link href="/privacy" className="text-seat-red hover:underline">Privacy Policy →</Link>
        </section>
      </main>
    </div>
  );
}
