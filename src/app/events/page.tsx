'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PublicEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  end_time: string;
  type: string;
  capacity: number;
  spots_left: number;
  price: number;
  image_placeholder: string;
}

function generateEvents(): PublicEvent[] {
  const types = [
    { title: 'Wine Tasting Evening', type: 'wine', desc: 'Explore curated selections from California and French vineyards with our sommelier.' },
    { title: 'Live Jazz Night', type: 'music', desc: 'Enjoy live jazz performances while dining on our special prix fixe menu.' },
    { title: 'Cooking Class: Pasta Making', type: 'class', desc: 'Learn to make fresh pasta from scratch with Chef Robert.' },
    { title: 'Sunday Brunch Buffet', type: 'brunch', desc: 'Unlimited brunch featuring mimosas, eggs benedict, and seasonal specials.' },
    { title: 'Beer & Burger Festival', type: 'festival', desc: 'Craft beer pairings with our gourmet burger collection.' },
    { title: 'Charity Dinner Gala', type: 'charity', desc: 'A 5-course dinner supporting local food banks. All proceeds donated.' },
    { title: 'Kids Pizza Party', type: 'family', desc: 'Kids make their own pizzas! Includes drinks and dessert.' },
    { title: 'Whiskey & Cigar Night', type: 'spirits', desc: 'Premium whiskey tasting paired with fine cigars on the patio.' },
  ];

  const events: PublicEvent[] = [];
  for (let i = 0; i < types.length; i++) {
    const date = new Date();
    date.setDate(date.getDate() + 3 + i * 4);
    const t = types[i];
    events.push({
      id: `pe-${i}`,
      title: t.title,
      description: t.desc,
      date: date.toISOString().split('T')[0],
      time: i % 2 === 0 ? '7:00 PM' : '6:30 PM',
      end_time: i % 2 === 0 ? '10:00 PM' : '9:30 PM',
      type: t.type,
      capacity: 30 + i * 10,
      spots_left: 5 + Math.floor(Math.random() * 15),
      price: [0, 45, 65, 35, 28, 150, 15, 85][i],
      image_placeholder: ['🍷', '🎵', '🍝', '🥞', '🍔', '🌟', '🍕', '🥃'][i],
    });
  }
  return events;
}

export default function PublicEventsPage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<PublicEvent | null>(null);

  const fetchEvents = useCallback(() => {
    setTimeout(() => {
      setEvents(generateEvents());
      setLoading(false);
    }, 300);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 rounded w-64" />
            <div className="grid grid-cols-2 gap-6">{[1,2,3,4].map(i => <div key={i} className="h-64 bg-gray-100 rounded-xl" />)}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Upcoming Events</h1>
            <p className="text-sm text-gray-500">Join us for special dining experiences</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft size={16} className="text-gray-600" /></button>
            <span className="text-sm font-medium text-gray-700 px-2">
              {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight size={16} className="text-gray-600" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map(event => (
            <div key={event.id}
              onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
              className={cn(
                'bg-white border rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg',
                selectedEvent?.id === event.id ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-gray-200'
              )}>
              {/* Image placeholder */}
              <div className="h-32 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-4xl">
                {event.image_placeholder}
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <h3 className="text-base font-semibold text-gray-900">{event.title}</h3>
                  {event.price > 0 ? (
                    <span className="text-sm font-bold text-rose-600">${event.price}</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">FREE</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{event.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(event.date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {event.time}</span>
                  <span className="flex items-center gap-1"><Users size={12} /> {event.spots_left} spots left</span>
                </div>

                {selectedEvent?.id === event.id && (
                  <div className="pt-3 border-t border-gray-100 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <MapPin size={12} /> Main Dining Room
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock size={12} /> {event.time} – {event.end_time}
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${((event.capacity - event.spots_left) / event.capacity) * 100}%` }} />
                    </div>
                    <p className="text-[10px] text-gray-400">{event.capacity - event.spots_left} of {event.capacity} spots filled</p>
                    <button className="w-full py-2.5 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors">
                      Reserve Your Spot
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-xs text-gray-400">Powered by SeatSignals</p>
        </div>
      </main>
    </div>
  );
}
