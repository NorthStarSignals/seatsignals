'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

function StarRating({
  value,
  onChange,
  size = 'lg',
}: {
  value: number;
  onChange: (v: number) => void;
  size?: 'lg' | 'sm';
}) {
  const [hover, setHover] = useState(0);
  const starSize = size === 'lg' ? 'w-10 h-10' : 'w-7 h-7';

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className={`${starSize} transition-transform hover:scale-110 active:scale-95`}
        >
          <svg
            viewBox="0 0 24 24"
            fill={star <= (hover || value) ? '#E11D48' : 'none'}
            stroke={star <= (hover || value) ? '#E11D48' : '#D1D5DB'}
            strokeWidth={1.5}
            className="w-full h-full"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function SurveyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const restaurantId = params.restaurantId as string;
  const customerId = searchParams.get('customer_id');
  const visitId = searchParams.get('visit_id');

  const [restaurantName, setRestaurantName] = useState('');
  const [overallRating, setOverallRating] = useState(0);
  const [foodRating, setFoodRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [ambianceRating, setAmbianceRating] = useState(0);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch restaurant name for display
    fetch(`/api/restaurants/${restaurantId}/public`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.name) setRestaurantName(data.name);
      })
      .catch(() => {});
  }, [restaurantId]);

  const handleSubmit = async () => {
    if (overallRating === 0) {
      setError('Please provide an overall rating.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/surveys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurantId,
          customer_id: customerId || undefined,
          visit_id: visitId || undefined,
          overall_rating: overallRating,
          food_rating: foodRating || undefined,
          service_rating: serviceRating || undefined,
          ambiance_rating: ambianceRating || undefined,
          would_recommend: wouldRecommend,
          feedback_text: feedbackText || undefined,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🙏</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h1>
          <p className="text-gray-600">Your feedback helps us improve.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 py-8 sm:py-12">
        {/* Restaurant name */}
        {restaurantName && (
          <p className="text-sm font-medium text-rose-600 text-center mb-1 tracking-wide uppercase">
            {restaurantName}
          </p>
        )}

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-8">
          How was your visit?
        </h1>

        {/* Overall Rating */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Overall Experience
          </label>
          <div className="flex justify-center">
            <StarRating value={overallRating} onChange={setOverallRating} size="lg" />
          </div>
        </div>

        <div className="border-t border-gray-100 my-6" />

        {/* Food Rating */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Food Quality
          </label>
          <div className="flex justify-center">
            <StarRating value={foodRating} onChange={setFoodRating} size="sm" />
          </div>
        </div>

        {/* Service Rating */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Service
          </label>
          <div className="flex justify-center">
            <StarRating value={serviceRating} onChange={setServiceRating} size="sm" />
          </div>
        </div>

        {/* Ambiance Rating */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Ambiance
          </label>
          <div className="flex justify-center">
            <StarRating value={ambianceRating} onChange={setAmbianceRating} size="sm" />
          </div>
        </div>

        <div className="border-t border-gray-100 my-6" />

        {/* Would Recommend */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-3 text-center">
            Would you recommend us?
          </label>
          <div className="flex justify-center gap-4">
            <button
              type="button"
              onClick={() => setWouldRecommend(true)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                wouldRecommend === true
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className="text-xl">👍</span> Yes
            </button>
            <button
              type="button"
              onClick={() => setWouldRecommend(false)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                wouldRecommend === false
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              }`}
            >
              <span className="text-xl">👎</span> No
            </button>
          </div>
        </div>

        <div className="border-t border-gray-100 my-6" />

        {/* Feedback Text */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-600 mb-2">
            Any other feedback?
          </label>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={4}
            placeholder="Tell us more about your experience..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 text-sm text-red-600 text-center bg-red-50 rounded-lg px-4 py-2">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-rose-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-rose-700 active:bg-rose-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>

        <p className="text-xs text-gray-400 text-center mt-4">
          Powered by SeatSignals
        </p>
      </div>
    </div>
  );
}
