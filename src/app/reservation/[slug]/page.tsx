'use client';

import { useState } from 'react';

const timeSlots = [
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM',
  '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM',
];

export default function PublicReservationPage({ params }: { params: { slug: string } }) {
  const [step, setStep] = useState<'select' | 'details' | 'confirm'>('select');
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reservation Confirmed!</h1>
          <p className="text-gray-600 mb-6">We&apos;ve sent a confirmation to {email}</p>
          <div className="bg-gray-50 rounded-xl p-6 text-left space-y-2">
            <p className="text-sm text-gray-500">Restaurant</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">{params.slug.replace(/-/g, ' ')}</p>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="text-sm font-medium text-gray-900">{date}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Time</p>
                <p className="text-sm font-medium text-gray-900">{time}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Party</p>
                <p className="text-sm font-medium text-gray-900">{partySize} guests</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-6">Powered by SeatSignals</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-lg mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 capitalize">{params.slug.replace(/-/g, ' ')}</h1>
          <p className="text-gray-500 mt-1">Make a reservation</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {['Select', 'Details', 'Confirm'].map((label, i) => {
            const stepIdx = ['select', 'details', 'confirm'].indexOf(step);
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i <= stepIdx ? 'bg-rose-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {i + 1}
                </div>
                <span className={`text-sm ${i <= stepIdx ? 'text-gray-900' : 'text-gray-400'}`}>{label}</span>
                {i < 2 && <div className={`w-8 h-px ${i < stepIdx ? 'bg-rose-600' : 'bg-gray-200'}`} />}
              </div>
            );
          })}
        </div>

        {step === 'select' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Party Size</label>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                  <button key={n} onClick={() => setPartySize(n)}
                    className={`w-12 h-12 rounded-lg text-sm font-medium border transition ${
                      partySize === n ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-gray-700 border-gray-300 hover:border-rose-300'
                    }`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-rose-500 focus:border-transparent" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map(t => (
                  <button key={t} onClick={() => setTime(t)}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition ${
                      time === t ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-gray-700 border-gray-300 hover:border-rose-300'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep('details')} disabled={!date || !time}
              className="w-full py-3 bg-rose-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-700 transition">
              Continue
            </button>
          </div>
        )}

        {step === 'details' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="John Smith"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-rose-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="john@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-rose-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 123-4567"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-rose-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Allergies, celebrations, seating preferences..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-rose-500" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('select')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
                Back
              </button>
              <button onClick={() => setStep('confirm')} disabled={!name || !email || !phone}
                className="flex-1 py-3 bg-rose-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-rose-700 transition">
                Review
              </button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Reservation Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500">Date</p><p className="text-sm font-medium text-gray-900">{date}</p></div>
                <div><p className="text-xs text-gray-500">Time</p><p className="text-sm font-medium text-gray-900">{time}</p></div>
                <div><p className="text-xs text-gray-500">Party Size</p><p className="text-sm font-medium text-gray-900">{partySize} guests</p></div>
                <div><p className="text-xs text-gray-500">Name</p><p className="text-sm font-medium text-gray-900">{name}</p></div>
                <div><p className="text-xs text-gray-500">Email</p><p className="text-sm font-medium text-gray-900">{email}</p></div>
                <div><p className="text-xs text-gray-500">Phone</p><p className="text-sm font-medium text-gray-900">{phone}</p></div>
              </div>
              {notes && (
                <div><p className="text-xs text-gray-500">Notes</p><p className="text-sm text-gray-700">{notes}</p></div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('details')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50">
                Back
              </button>
              <button onClick={handleSubmit}
                className="flex-1 py-3 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700 transition">
                Confirm Reservation
              </button>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-8">Powered by SeatSignals</p>
      </div>
    </div>
  );
}
