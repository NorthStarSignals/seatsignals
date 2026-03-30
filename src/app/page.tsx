'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/dashboard');
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-white mb-4">
          Seat<span className="text-accent-blue">Signals</span>
        </h1>
        <p className="text-xl text-slate-400 mb-2">
          The Restaurant Revenue Operating System
        </p>
        <p className="text-slate-500 mb-8 max-w-lg mx-auto">
          Seven automated systems that capture customer data, drive repeat visits,
          manage your reputation, fill dead hours, and turn nearby offices into
          recurring catering clients.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/sign-up">
            <Button variant="cta" size="lg">Get Started</Button>
          </Link>
          <Link href="/sign-in">
            <Button variant="secondary" size="lg">Sign In</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
