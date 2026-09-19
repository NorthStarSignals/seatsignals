'use client';

import { useState } from 'react';
import { Star, Send, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const categories = [
    { label: 'Food Quality', emoji: '🍽️' },
    { label: 'Service', emoji: '👋' },
    { label: 'Ambiance', emoji: '✨' },
    { label: 'Value', emoji: '💰' },
    { label: 'Cleanliness', emoji: '🧹' },
  ];
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  const toggleCat = (label: string) => {
    setSelectedCats(prev =>
      prev.includes(label) ? prev.filter(c => c !== label) : [...prev, label]
    );
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    // Simulated submit
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSubmitted(true);
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600">Your feedback helps us improve. We appreciate you taking the time to share your experience.</p>
          <div className="flex justify-center mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={24} className={i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">How was your experience?</h1>
          <p className="text-sm text-gray-500 mt-1">We&apos;d love to hear your feedback</p>
        </div>

        {/* Star Rating */}
        <div className="flex justify-center gap-2 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <button key={i}
              onMouseEnter={() => setHoverRating(i + 1)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(i + 1)}
              className="transition-transform hover:scale-110">
              <Star size={40} className={cn(
                'transition-colors',
                (hoverRating || rating) > i ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
              )} />
            </button>
          ))}
        </div>

        {rating > 0 && (
          <div className="text-center text-sm text-gray-500 mb-6">
            {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
          </div>
        )}

        {/* Categories */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">What stood out? (optional)</p>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button key={cat.label} onClick={() => toggleCat(cat.label)}
                className={cn(
                  'px-3 py-2 rounded-full text-sm border transition-all',
                  selectedCats.includes(cat.label)
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                )}>
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Feedback Text */}
        <div className="mb-6">
          <label className="text-sm font-medium text-gray-700 mb-1 block">Tell us more (optional)</label>
          <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
            placeholder="What did you enjoy? What could we improve?"
            rows={4}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-rose-500 resize-none" />
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Name (optional)</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-rose-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Email (optional)</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-rose-500" />
          </div>
        </div>

        <button onClick={handleSubmit} disabled={rating === 0 || submitting}
          className="w-full flex items-center justify-center gap-2 py-3 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors">
          <Send size={16} />
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by SeatSignals
        </p>
      </div>
    </div>
  );
}
