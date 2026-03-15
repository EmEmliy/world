'use client';

import Link from 'next/link';
import { GAME_CONFIG } from '@/config/game';
import { PageTracker } from '@/components/game/page-tracker';

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-bg to-[#FFE4CC] px-6">
      <PageTracker page="landing" />
      
      <div className="text-center animate-fade-in">
        <div className="text-8xl mb-6 animate-float">🏝️</div>

        <h1 className="text-5xl md:text-6xl font-display font-bold text-text mb-4">
          {GAME_CONFIG.title}
        </h1>

        <p className="text-lg md:text-xl text-text/70 mb-10">
          {GAME_CONFIG.subtitle}
        </p>
      </div>

      <div className="animate-slide-up" style={{ animationDelay: '0.5s', animationFillMode: 'backwards' }}>
        <Link
          href="/island"
          className="inline-block bg-primary hover:bg-primary-dark text-white text-lg font-bold px-10 py-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
        >
          {GAME_CONFIG.cta} →
        </Link>
      </div>

      <p className="mt-16 text-sm text-text/40">
        {GAME_CONFIG.version} · 仅供体验
      </p>
    </main>
  );
}
