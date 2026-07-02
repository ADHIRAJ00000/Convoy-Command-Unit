'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ConvoySimulator } from '@/components/ConvoySimulator';
import { api } from '@/lib/api';
import type { Convoy } from '@/types/convoy';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/events', label: 'Events' },
  { href: '/pilot-vehicle', label: 'Pilot Vehicle' },
  { href: '/mobile', label: 'Mobile View' },
];

const EventsPageContent = () => {
  const pathname = usePathname();
  const { data: apiConvoys, isLoading, error } = useSWR<Convoy[]>('/api/convoys', api.getConvoys, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  });

  const convoys = apiConvoys ?? [];

  const [selectedConvoyId, setSelectedConvoyId] = useState<string | null>(null);

  useEffect(() => {
    if (!convoys.length) return;
    setSelectedConvoyId((current) => current ?? convoys[0].id);
  }, [convoys]);

  return (
    <div className="min-h-screen bg-slateDepth text-textNeutral">
      {/* Top Navigation Bar */}
      <nav className="border-b border-panelNight/40 bg-panelNight/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amberCommand text-black font-bold text-lg">
              🦅
            </div>
            <div>
              <h1 className="text-lg font-bold text-amberCommand">HawkRoute</h1>
              <p className="text-[10px] uppercase tracking-wider text-textNeutral/60">Convoy Command</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-4 py-2 text-sm transition-all ${pathname === link.href
                    ? 'bg-amberCommand text-black font-semibold'
                    : 'text-textNeutral/70 hover:bg-panelNight hover:text-textNeutral'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-panelNight/40 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs">Commander</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Page Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amberCommand/20 text-2xl">
              🎯
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-textNeutral/60">AICC · Event Lab</p>
              <h1 className="text-3xl font-bold text-textNeutral">Convoy Real-Time Simulator</h1>
            </div>
          </div>
          <p className="text-base text-textNeutral/70 ml-[60px]">
            Test convoy behavior under various terrain conditions. Simulate rain, road blocks, congestion,
            and landslides to observe real-time route performance before deploying to live operations.
          </p>
        </header>

        {/* Loading State */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-amberCommand border-t-transparent mb-4" />
            <p className="text-textNeutral/60">Loading convoy data...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-4 opacity-20">⚠️</div>
            <p className="text-lg text-red-300">Unable to reach the convoy server</p>
            <p className="text-sm text-textNeutral/40 mt-2">Check that the backend is running, then refresh this page</p>
          </div>
        ) : convoys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-4 opacity-20">🚫</div>
            <p className="text-lg text-textNeutral/60">No convoys available</p>
            <p className="text-sm text-textNeutral/40 mt-2">Create a convoy from the dashboard to begin simulation</p>
          </div>
        ) : (
          <ConvoySimulator
            convoys={convoys}
            selectedConvoyId={selectedConvoyId}
            onConvoyChange={setSelectedConvoyId}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-panelNight/40 bg-panelNight/40 px-6 py-4 mt-12">
        <div className="mx-auto max-w-7xl flex items-center justify-between text-xs text-textNeutral/50">
          <p>HawkRoute AICC © 2025 · Convoy Command & Control System</p>
          <p>Simulation Engine v2.0 · Real-Time Terrain Analysis Active</p>
        </div>
      </footer>
    </div>
  );
};

const EventsPage = () => (
  <ProtectedRoute>
    <EventsPageContent />
  </ProtectedRoute>
);

export default EventsPage;
