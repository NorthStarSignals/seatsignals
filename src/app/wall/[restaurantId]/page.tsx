'use client';

import { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { useParams } from 'next/navigation';

interface ReviewItem {
  author: string;
  rating: number;
  review_text: string;
  platform: string;
  sentiment_label: string;
  analyzed_at: string;
}

export default function FeedbackWallPage() {
  const params = useParams();
  const restaurantId = params.restaurantId as string;
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [restaurantName, setRestaurantName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchWall() {
      try {
        const res = await fetch(`/api/wall/${restaurantId}`);
        if (res.ok) {
          const data = await res.json();
          setReviews(data.reviews);
          setRestaurantName(data.restaurant_name);
        }
      } catch {
        console.error('Failed to load wall');
      } finally {
        setLoading(false);
      }
    }
    fetchWall();
  }, [restaurantId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header */}
      <div className="text-center py-12 px-4">
        <h1 className="text-3xl font-bold text-gray-900">{restaurantName}</h1>
        <p className="text-gray-500 mt-2">What our customers are saying</p>
        <div className="flex items-center justify-center gap-1 mt-3">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={20} className="text-amber-400 fill-amber-400" />
          ))}
          <span className="text-sm text-gray-600 ml-2">{reviews.length} reviews</span>
        </div>
      </div>

      {/* Masonry Grid */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {reviews.map((review, i) => (
            <div
              key={i}
              className="break-inside-avoid bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-orange-300 flex items-center justify-center text-white font-bold text-sm">
                  {review.author?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{review.author}</p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, j) => (
                      <Star
                        key={j}
                        size={12}
                        className={j < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}
                      />
                    ))}
                    <span className="text-[10px] text-gray-400 ml-1 capitalize">{review.platform}</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{review.review_text}</p>
              <p className="text-[10px] text-gray-400 mt-3">
                {new Date(review.analyzed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Powered by <span className="font-semibold text-gray-500">SeatSignals</span>
        </p>
      </div>
    </div>
  );
}
