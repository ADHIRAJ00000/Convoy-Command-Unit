'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { ConvoySimulator } from '@/components/ConvoySimulator';
import { api } from '@/lib/api';
import type { Convoy } from '@/types/convoy';

// Hardcoded demo convoys as fallback (same as dashboard)
const DEMO_CONVOYS: Convoy[] = [
  {
    id: '1',
    name: 'ALPHA-HAWK-01',
    origin: { lat: 34.08, lng: 74.79, name: 'Srinagar' },
    destination: { lat: 34.16, lng: 77.58, name: 'Leh' },
    speedKmph: 45,
    priority: 'ALPHA',
    vehicleCount: 25,
    status: 'EN_ROUTE',
    lastUpdated: new Date().toISOString(),
    etaHours: 12,
    assignedRoute: {
      id: 'route-1',
      name: 'Srinagar-Leh Highway',
      polyline: [[74.79, 34.08], [75.46, 34.27], [75.63, 34.24], [77.58, 34.16]],
      etaHours: 12,
      distanceKm: 434,
      riskScore: 45,
      segments: [
        {
          id: 'seg-1-0',
          coordinates: [[74.79, 34.08], [75.46, 34.27]],
          terrain: 'MOUNTAIN',
          difficulty: 'HIGH',
          recommendedSpeedKmph: 35,
          riskLevel: 0.6,
          status: 'CLEAR',
        },
      ],
      checkpoints: [
        {
          id: 'cp-1',
          name: 'Zoji La Pass',
          status: 'PENDING',
          eta: new Date(Date.now() + 4 * 3600000).toISOString(),
        },
        {
          id: 'cp-2',
          name: 'Drass',
          status: 'PENDING',
          eta: new Date(Date.now() + 6 * 3600000).toISOString(),
        },
        {
          id: 'cp-3',
          name: 'Kargil',
          status: 'PENDING',
          eta: new Date(Date.now() + 9 * 3600000).toISOString(),
        },
      ],
    },
  },
  {
    id: '2',
    name: 'BRAVO-SUPPLY-12',
    origin: { lat: 27.31, lng: 88.6, name: 'Gangtok' },
    destination: { lat: 27.39, lng: 88.84, name: 'Nathu La' },
    speedKmph: 40,
    priority: 'BRAVO',
    vehicleCount: 18,
    status: 'EN_ROUTE',
    lastUpdated: new Date().toISOString(),
    etaHours: 3,
    assignedRoute: {
      id: 'route-2',
      name: 'Gangtok-Nathu La Route',
      polyline: [[88.6, 27.31], [88.72, 27.35], [88.84, 27.39]],
      etaHours: 3,
      distanceKm: 56,
      riskScore: 52,
      segments: [
        {
          id: 'seg-2-0',
          coordinates: [[88.6, 27.31], [88.84, 27.39]],
          terrain: 'MOUNTAIN',
          difficulty: 'HIGH',
          recommendedSpeedKmph: 30,
          riskLevel: 0.7,
          status: 'CLEAR',
        },
      ],
      checkpoints: [
        {
          id: 'cp-2',
          name: 'Nathu La Border',
          status: 'PENDING',
          eta: new Date(Date.now() + 3 * 3600000).toISOString(),
        },
      ],
    },
  },
  {
    id: '3',
    name: 'CHARLIE-MED-08',
    origin: { lat: 26.19, lng: 91.75, name: 'Tezpur' },
    destination: { lat: 27.58, lng: 91.92, name: 'Tawang' },
    speedKmph: 50,
    priority: 'CHARLIE',
    vehicleCount: 12,
    status: 'PLANNED',
    lastUpdated: new Date().toISOString(),
    etaHours: 8,
    assignedRoute: {
      id: 'route-3',
      name: 'Tezpur-Tawang Highway',
      polyline: [[91.75, 26.19], [91.82, 26.89], [92.07, 27.35], [91.92, 27.58]],
      etaHours: 8,
      distanceKm: 350,
      riskScore: 28,
      segments: [
        {
          id: 'seg-3-0',
          coordinates: [[91.75, 26.19], [91.92, 27.58]],
          terrain: 'MOUNTAIN',
          difficulty: 'MEDIUM',
          recommendedSpeedKmph: 60,
          riskLevel: 0.3,
          status: 'CLEAR',
        },
      ],
      checkpoints: [
        {
          id: 'cp-3',
          name: 'Sela Pass',
          status: 'PENDING',
          eta: new Date(Date.now() + 6 * 3600000).toISOString(),
        },
      ],
    },
  },
];

const fetchConvoys = async () => {
  try {
    return await api.getConvoys();
  } catch (error) {
    console.error('Failed to fetch convoys from API, using demo data:', error);
    return DEMO_CONVOYS;
  }
};

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/events', label: 'Events' },
  { href: '/pilot-vehicle', label: 'Pilot Vehicle' },
  { href: '/mobile', label: 'Mobile View' },
];

const EventsPage = () => {
  const pathname = usePathname();
  const { data: apiConvoys, isLoading } = useSWR<Convoy[]>('/api/convoys', fetchConvoys, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  });

  // Use API data if available, otherwise use demo data
  const convoys = apiConvoys || DEMO_CONVOYS;

  const [selectedConvoyId, setSelectedConvoyId] = useState<string | null>(
    convoys.length > 0 ? convoys[0].id : null
  );

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

export default EventsPage;
