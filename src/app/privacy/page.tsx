import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy · SeatSignals',
  description: 'How SeatSignals collects, uses, and protects your data.',
};

const LAST_UPDATED = 'April 21, 2026';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-seat-black text-white">
      <header className="border-b border-zinc-800 py-4 px-6">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Seat<span className="text-seat-red">Signals</span>
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8 text-zinc-300 leading-relaxed">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-zinc-500 mt-2">Last updated: {LAST_UPDATED}</p>
        </div>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">What we collect</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong className="text-white">Account data:</strong> email, name, restaurant info you provide.</li>
            <li><strong className="text-white">Integration data:</strong> data pulled from Square, Klaviyo, Yelp, Google, and other services you connect — orders, menu items, customers, reviews, SMS numbers.</li>
            <li><strong className="text-white">Usage data:</strong> pages viewed, features used, API calls, IP addresses, browser type.</li>
            <li><strong className="text-white">Payment data:</strong> processed by Stripe; we only store the last 4 digits and billing address.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">How we use it</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide the Service: render analytics, run automations, sync integrations.</li>
            <li>Improve the product: understand which features matter and fix bugs.</li>
            <li>Communicate: service updates, billing notices, and (if you opted in) product news.</li>
            <li>Comply with law and enforce our Terms.</li>
          </ul>
          <p className="mt-3">
            We do not sell your data. We do not train AI models on your Customer Data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">Who we share with</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong className="text-white">Infrastructure:</strong> Vercel (hosting), Supabase (database), Clerk (auth), Stripe (billing).</li>
            <li><strong className="text-white">AI providers:</strong> Anthropic, for features you explicitly use (e.g., review response generation).</li>
            <li><strong className="text-white">Integrations you connect:</strong> Square, Klaviyo, Twilio, Apify (review scraping). Data flows both ways only as you authorize.</li>
            <li><strong className="text-white">Legal:</strong> when required by subpoena, court order, or to investigate fraud.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">Your rights</h2>
          <p>
            You can view, export, or delete your data from Settings → Privacy. EU and California residents
            have additional rights under GDPR and CCPA — email <a href="mailto:hello@seatsignals.app" className="text-seat-red hover:underline">hello@seatsignals.app</a> to
            exercise them. We respond within 30 days.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">Cookies</h2>
          <p>
            We use essential cookies to keep you signed in, remember preferences, and measure aggregate
            usage. We don&apos;t use third-party advertising cookies. A cookie banner on first visit lets
            you review what&apos;s set.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">Security</h2>
          <p>
            Data in transit is TLS-encrypted. Data at rest is encrypted via our infrastructure providers.
            Integration tokens (Square, Klaviyo, Twilio) are stored encrypted and only accessible to your
            restaurant&apos;s workspace. We apply the principle of least privilege internally.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">Retention</h2>
          <p>
            We keep Customer Data for as long as your account is active. On cancellation, we delete it
            within 30 days unless legally required to keep it (e.g., tax records).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">Children</h2>
          <p>
            The Service isn&apos;t directed at children under 16. We don&apos;t knowingly collect their data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">Changes</h2>
          <p>
            We&apos;ll notify you of material changes via email or in-app banner before they take effect.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">Contact</h2>
          <p>
            Questions: <a href="mailto:hello@seatsignals.app" className="text-seat-red hover:underline">hello@seatsignals.app</a>
          </p>
        </section>

        <section className="pt-8 border-t border-zinc-800">
          <Link href="/terms" className="text-seat-red hover:underline">Terms of Service →</Link>
        </section>
      </main>
    </div>
  );
}
