'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

const PRESET_AMOUNTS = [25, 50, 75, 100, 150, 200];

type DeliveryOption = 'now' | 'scheduled';

interface RestaurantInfo {
  restaurant_id: string;
  name: string;
  logo_url?: string;
}

function generateGiftCardCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segments = Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  );
  return segments.join('-');
}

export default function GiftCardPurchasePage() {
  const params = useParams();
  const slug = params.slug as string;

  // Restaurant data
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Form state
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('now');
  const [scheduledDate, setScheduledDate] = useState('');

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [giftCardCode, setGiftCardCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Animation refs
  const formRef = useRef<HTMLFormElement>(null);

  const finalAmount = isCustom ? parseFloat(customAmount) || 0 : (selectedAmount ?? 0);

  useEffect(() => {
    fetch(`/api/capture/restaurant?id=${slug}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        if (data.name) {
          setRestaurant({ restaurant_id: slug, name: data.name, logo_url: data.logo_url });
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName || !recipientEmail || !senderName || finalAmount < 5) return;
    if (deliveryOption === 'scheduled' && !scheduledDate) return;

    setSubmitting(true);
    setError('');

    try {
      // Simulate API call for gift card purchase
      await new Promise(resolve => setTimeout(resolve, 1500));
      const code = generateGiftCardCode();
      setGiftCardCode(code);
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(giftCardCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  // --- Loading ---
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-gray-200 border-t-rose-600 rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // --- Not Found ---
  if (notFound) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4 font-sans">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Restaurant not found</h1>
          <p className="text-gray-500 text-sm">This gift card link doesn&apos;t seem to be valid. Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  // --- Success ---
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center p-4 font-sans">
        <div
          className="max-w-lg w-full animate-[fadeInUp_0.5s_ease-out]"
          style={{ animation: 'fadeInUp 0.5s ease-out' }}
        >
          {/* Success icon */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-emerald-50 flex items-center justify-center">
              <svg
                className="w-10 h-10 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                style={{ animation: 'drawCheck 0.5s ease-out 0.3s both' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Gift Card Purchased!</h1>
            <p className="text-gray-500">
              {deliveryOption === 'now'
                ? `A gift card has been sent to ${recipientEmail}`
                : `A gift card will be delivered to ${recipientEmail} on ${new Date(scheduledDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
            </p>
          </div>

          {/* Gift card preview */}
          <div className="relative mx-auto mb-8 rounded-2xl overflow-hidden shadow-xl" style={{ maxWidth: 440 }}>
            <div className="bg-gradient-to-br from-rose-600 via-rose-500 to-pink-500 p-8 text-white">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <p className="text-xs uppercase tracking-widest text-rose-200 mb-1">Digital Gift Card</p>
                  <p className="text-lg font-semibold">{restaurant?.name}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                </div>
              </div>
              <div className="mb-6">
                <p className="text-4xl font-bold">${finalAmount.toFixed(2)}</p>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-rose-200 mb-0.5">For</p>
                  <p className="font-medium">{recipientName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-rose-200 mb-0.5">From</p>
                  <p className="font-medium">{senderName}</p>
                </div>
              </div>
            </div>
            {message && (
              <div className="bg-white px-8 py-5 border-t border-rose-100">
                <p className="text-sm text-gray-500 mb-1">Personal Message</p>
                <p className="text-gray-800 italic">&ldquo;{message}&rdquo;</p>
              </div>
            )}
          </div>

          {/* Gift card code */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center mb-6 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-3">Gift Card Code</p>
            <div className="flex items-center justify-center gap-3">
              <code className="text-2xl font-mono font-bold tracking-wider text-gray-900">{giftCardCode}</code>
              <button
                onClick={handleCopyCode}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy code"
              >
                {copied ? (
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400">
            Save this code for your records. The recipient will also receive it via email.
          </p>
        </div>

        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes drawCheck {
            from { stroke-dashoffset: 30; stroke-dasharray: 30; }
            to { stroke-dashoffset: 0; stroke-dasharray: 30; }
          }
        `}</style>
      </div>
    );
  }

  // --- Main Form ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 font-sans">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          {restaurant?.logo_url ? (
            <img src={restaurant.logo_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
          )}
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{restaurant?.name}</h1>
            <p className="text-xs text-gray-400">Digital Gift Cards</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Form Column */}
          <div className="lg:col-span-3">
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Send a Gift Card</h2>
              <p className="text-gray-500">Choose an amount and personalize your gift.</p>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
              {/* Amount Selection */}
              <section>
                <label className="block text-sm font-medium text-gray-700 mb-3">Select Amount</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                  {PRESET_AMOUNTS.map(amount => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => {
                        setSelectedAmount(amount);
                        setIsCustom(false);
                        setCustomAmount('');
                      }}
                      className={`
                        relative py-3 px-2 rounded-xl text-sm font-semibold transition-all duration-200
                        ${!isCustom && selectedAmount === amount
                          ? 'bg-rose-600 text-white shadow-lg shadow-rose-200 scale-[1.02]'
                          : 'bg-white text-gray-700 border border-gray-200 hover:border-rose-300 hover:shadow-sm'
                        }
                      `}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>

                {/* Custom amount */}
                <div
                  className={`
                    flex items-center gap-2 rounded-xl border px-4 py-3 transition-all duration-200
                    ${isCustom
                      ? 'border-rose-400 ring-2 ring-rose-100 bg-white'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                    }
                  `}
                  onClick={() => setIsCustom(true)}
                >
                  <span className="text-gray-400 font-medium">$</span>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    step="0.01"
                    placeholder="Custom amount (min $5)"
                    value={customAmount}
                    onChange={e => {
                      setCustomAmount(e.target.value);
                      setIsCustom(true);
                      setSelectedAmount(null);
                    }}
                    onFocus={() => setIsCustom(true)}
                    className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
                  />
                </div>
              </section>

              {/* Recipient Details */}
              <section>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Recipient Details</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="Recipient name"
                    value={recipientName}
                    onChange={e => setRecipientName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder-gray-400 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Recipient email"
                    value={recipientEmail}
                    onChange={e => setRecipientEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder-gray-400 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                  />
                </div>
              </section>

              {/* Sender */}
              <section>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Your Name</h3>
                <input
                  type="text"
                  required
                  placeholder="Your name"
                  value={senderName}
                  onChange={e => setSenderName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder-gray-400 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                />
              </section>

              {/* Personal Message */}
              <section>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Personal Message <span className="text-gray-400 font-normal">(optional)</span>
                </h3>
                <textarea
                  rows={3}
                  maxLength={200}
                  placeholder="Add a personal note..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder-gray-400 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/200</p>
              </section>

              {/* Delivery Option */}
              <section>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Delivery</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setDeliveryOption('now');
                      setScheduledDate('');
                    }}
                    className={`
                      flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200
                      ${deliveryOption === 'now'
                        ? 'border-rose-400 bg-rose-50/50 ring-2 ring-rose-100'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                      }
                    `}
                  >
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                      ${deliveryOption === 'now' ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-400'}
                    `}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Send now</p>
                      <p className="text-xs text-gray-400">Deliver immediately</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryOption('scheduled')}
                    className={`
                      flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200
                      ${deliveryOption === 'scheduled'
                        ? 'border-rose-400 bg-rose-50/50 ring-2 ring-rose-100'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                      }
                    `}
                  >
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                      ${deliveryOption === 'scheduled' ? 'bg-rose-100 text-rose-600' : 'bg-gray-100 text-gray-400'}
                    `}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Schedule</p>
                      <p className="text-xs text-gray-400">Pick a date</p>
                    </div>
                  </button>
                </div>

                {deliveryOption === 'scheduled' && (
                  <div className="mt-3 animate-[slideDown_0.2s_ease-out]">
                    <input
                      type="date"
                      required
                      min={todayStr}
                      value={scheduledDate}
                      onChange={e => setScheduledDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                    />
                  </div>
                )}
              </section>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || finalAmount < 5 || !recipientName || !recipientEmail || !senderName || (deliveryOption === 'scheduled' && !scheduledDate)}
                className="w-full py-4 rounded-xl bg-rose-600 text-white font-semibold text-sm shadow-lg shadow-rose-200 hover:bg-rose-700 hover:shadow-xl hover:shadow-rose-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Purchase Gift Card {finalAmount >= 5 && `- $${finalAmount.toFixed(2)}`}
                  </>
                )}
              </button>

              <p className="text-xs text-gray-400 text-center">
                Gift cards are non-refundable. By purchasing, you agree to the terms of service.
              </p>
            </form>
          </div>

          {/* Preview Column */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-24">
              <p className="text-sm font-medium text-gray-700 mb-3">Preview</p>

              {/* Card preview */}
              <div className="rounded-2xl overflow-hidden shadow-xl transition-all duration-300 hover:shadow-2xl">
                <div className="bg-gradient-to-br from-rose-600 via-rose-500 to-pink-500 p-6 sm:p-8 text-white">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-rose-200 mb-1">Digital Gift Card</p>
                      <p className="text-base font-semibold">{restaurant?.name}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                    </div>
                  </div>

                  <div className="mb-6">
                    <p className="text-3xl sm:text-4xl font-bold transition-all duration-300">
                      {finalAmount >= 5 ? `$${finalAmount.toFixed(2)}` : '$0.00'}
                    </p>
                  </div>

                  <div className="flex items-end justify-between text-sm">
                    <div>
                      <p className="text-[10px] text-rose-200 mb-0.5">For</p>
                      <p className="font-medium truncate max-w-[120px]">
                        {recipientName || 'Recipient'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-rose-200 mb-0.5">From</p>
                      <p className="font-medium truncate max-w-[120px]">
                        {senderName || 'Sender'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Message area */}
                <div className="bg-white px-6 sm:px-8 py-5 min-h-[60px]">
                  {message ? (
                    <>
                      <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Personal Message</p>
                      <p className="text-sm text-gray-700 italic leading-relaxed">&ldquo;{message}&rdquo;</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-300 italic">Your message will appear here...</p>
                  )}
                </div>
              </div>

              {/* Delivery info */}
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span>
                  {deliveryOption === 'now'
                    ? 'Delivered instantly via email'
                    : scheduledDate
                      ? `Scheduled for ${new Date(scheduledDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                      : 'Choose a delivery date'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
          <p className="text-xs text-gray-400">Powered by SeatSignals</p>
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span className="text-xs text-gray-400">Secure checkout</span>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
