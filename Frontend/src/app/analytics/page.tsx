'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AnalyticsPanel from '@/components/AnalyticsPanel';
import { api } from '@/lib/api';
import type { Convoy } from '@/types/convoy';
import type { OperationEvent } from '@/types/event';
import type { RouteSegment } from '@/types/route';

const fetchConvoys = () => api.getConvoys();

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/events', label: 'Events' },
  { href: '/pilot-vehicle', label: 'Pilot Vehicle' },
  { href: '/mobile', label: 'Mobile View' },
];

const getSegmentBadge = (segment: RouteSegment) => {
  if (segment.status === 'BLOCKED') return 'bg-red-500/20 text-red-200 border-red-500/40';
  if (segment.status === 'HIGH_RISK') return 'bg-amberCommand/10 text-amberCommand border-amberCommand/40';
  return 'bg-emerald-400/10 text-emerald-200 border-emerald-400/40';
};

const AnalyticsPage = () => {
  const pathname = usePathname();
  const { data: convoys = [] } = useSWR<Convoy[]>('/api/convoys', fetchConvoys, { refreshInterval: 20000 });
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});

  const mockEvents: OperationEvent[] = convoys
    .flatMap((convoy) =>
      convoy.assignedRoute?.checkpoints.map((checkpoint) => {
        const severity: OperationEvent['payload']['severity'] = checkpoint.status === 'CLEARED' ? 'LOW' : 'MEDIUM';
        return {
          id: `${convoy.id}-${checkpoint.id}`,
          convoyId: convoy.id,
          type: 'CHECKPOINT' as OperationEvent['type'],
          triggeredAt: checkpoint.loggedAt ?? checkpoint.eta,
          payload: {
            severity,
            notes: checkpoint.name,
          },
        } satisfies OperationEvent;
      }) ?? [],
    )
    .slice(0, 6);

  const highRiskConvoys = useMemo(() => {
    return convoys
      .map((convoy) => {
        const segments = convoy.assignedRoute?.segments ?? [];
        return {
          convoy,
          score: convoy.assignedRoute?.riskScore ?? 0,
          blockedSegments: segments.filter((segment) => segment.status === 'BLOCKED'),
        };
      })
      .filter((entry) => entry.score > 55 || entry.blockedSegments.length > 0);
  }, [convoys]);

  const blockedSegments = useMemo(() => {
    return convoys.flatMap((convoy) => {
      const segments = convoy.assignedRoute?.segments ?? [];
      return segments
        .filter((segment) => segment.status !== 'CLEAR')
        .map((segment) => ({ ...segment, convoyName: convoy.name }));
    });
  }, [convoys]);

  const awaitingAck = highRiskConvoys.filter((entry) => !acknowledged[entry.convoy.id]).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slateDepth via-slateDepth to-panelNight/50 text-textNeutral">
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-amberCommand/20 bg-gradient-to-br from-panelNight/60 to-panelNight/40 px-8 py-6 shadow-lg backdrop-blur-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-amberCommand/80">AICC · Command Intelligence</p>
            <h1 className="mt-1 text-3xl font-bold text-textNeutral">Analytics & Insights</h1>
            <p className="mt-2 text-sm text-textNeutral/70">
              Real-time fleet analytics, conflict resolution, and readiness monitoring for strategic decision-making.
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full border px-5 py-2 transition-all duration-200 ${pathname === link.href
                    ? 'border-amberCommand bg-amberCommand/10 text-amberCommand shadow-lg shadow-amberCommand/20'
                    : 'border-panelNight/40 text-textNeutral/70 hover:border-amberCommand/40 hover:bg-panelNight/30 hover:text-textNeutral'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </header>

        {/* Analytics Panel */}
        <section className="rounded-3xl border border-panelNight/40 bg-gradient-to-br from-panelNight/50 to-panelNight/30 p-6 shadow-xl backdrop-blur-sm">
          <AnalyticsPanel convoys={convoys} events={mockEvents} />
        </section>

        {/* Conflicts Overview */}
        <section className="grid gap-4 rounded-3xl border border-red-500/20 bg-gradient-to-br from-panelNight/60 to-panelNight/40 p-6 shadow-xl backdrop-blur-sm md:grid-cols-3">
          <div className="group rounded-2xl border border-panelNight/40 bg-gradient-to-br from-panelNight/80 to-slateDepth/70 p-5 transition-all duration-300 hover:border-amberCommand/30 hover:shadow-lg">
            <p className="text-xs uppercase tracking-wider text-textNeutral/50">Active conflicts</p>
            <p className="mt-3 text-4xl font-bold text-amberCommand">{highRiskConvoys.length}</p>
            <p className="mt-2 text-sm text-textNeutral/60">Convoys over risk threshold or facing blocked roads.</p>
          </div>
          <div className="group rounded-2xl border border-panelNight/40 bg-gradient-to-br from-panelNight/80 to-slateDepth/70 p-5 transition-all duration-300 hover:border-oliveAux/30 hover:shadow-lg">
            <p className="text-xs uppercase tracking-wider text-textNeutral/50">Awaiting acknowledgement</p>
            <p className="mt-3 text-4xl font-bold text-oliveAux">{awaitingAck}</p>
            <p className="mt-2 text-sm text-textNeutral/60">Conflicts not yet logged back to HQ.</p>
          </div>
          <div className="group rounded-2xl border border-panelNight/40 bg-gradient-to-br from-panelNight/80 to-slateDepth/70 p-5 transition-all duration-300 hover:border-red-400/30 hover:shadow-lg">
            <p className="text-xs uppercase tracking-wider text-textNeutral/50">Blocked segments</p>
            <p className="mt-3 text-4xl font-bold text-red-300">{blockedSegments.length}</p>
            <p className="mt-2 text-sm text-textNeutral/60">Corridors requiring clearance or reroute.</p>
          </div>
        </section>

        {/* Additional Analytics Cards */}
        <section className="grid gap-4 rounded-3xl border border-panelNight/40 bg-gradient-to-br from-panelNight/40 to-panelNight/20 p-6 shadow-xl backdrop-blur-sm md:grid-cols-3">
          {[
            {
              label: 'Road-space utilisation',
              detail: 'Highlights which corridors are saturated, recommending staggered launches to avoid choke points.',
              icon: '🛣️',
            },
            {
              label: 'Weather impact score',
              detail: 'Blends IMD feeds with convoy ETAs to flag missions likely to be delayed by fog, rain, or snowfall.',
              icon: '⛈️',
            },
            {
              label: 'Fuel savings tracker',
              detail: 'Estimates litres saved through load consolidation and backhaul pairing suggestions.',
              icon: '⛽',
            },
          ].map((item) => (
            <div
              key={item.label}
              className="group rounded-2xl border border-panelNight/50 bg-gradient-to-br from-slateDepth/90 to-slateDepth/70 p-5 text-sm transition-all duration-300 hover:border-amberCommand/30 hover:shadow-lg"
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{item.icon}</span>
                <p className="text-xs uppercase tracking-wider text-textNeutral/50">{item.label}</p>
              </div>
              <p className="mt-3 text-textNeutral/80">{item.detail}</p>
            </div>
          ))}
        </section>

        {/* Convoy Conflict Queue */}
        <section className="rounded-3xl border border-panelNight/40 bg-gradient-to-br from-panelNight/70 to-panelNight/50 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-textNeutral/50">Convoy conflict queue</p>
              <h2 className="mt-1 text-2xl font-semibold text-textNeutral">Prioritize by severity, then acknowledge</h2>
            </div>
            <button
              type="button"
              className="rounded-full border border-amberCommand/40 bg-amberCommand/5 px-5 py-2 text-sm text-amberCommand transition-all duration-200 hover:bg-amberCommand/10 hover:shadow-lg"
              onClick={() => setAcknowledged({})}
            >
              Reset acknowledgements
            </button>
          </div>

          <div className="mt-6 space-y-4">
            {highRiskConvoys.length === 0 && (
              <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center text-sm text-emerald-300">
                ✅ No conflicts flagged. Continue monitoring.
              </p>
            )}
            {highRiskConvoys.map(({ convoy, score, blockedSegments: segments }) => (
              <div
                key={convoy.id}
                className="rounded-2xl border border-panelNight/50 bg-gradient-to-br from-slateDepth/80 to-slateDepth/60 p-5 shadow-md transition-all duration-300 hover:border-amberCommand/30 hover:shadow-xl"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-textNeutral/50">{convoy.priority} priority</p>
                    <h3 className="mt-1 text-xl font-semibold text-textNeutral">{convoy.name}</h3>
                    <p className="mt-1 text-sm text-textNeutral/70">
                      Route risk score {score.toFixed(0)} · {segments.length} blocked segments · Status {convoy.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <button
                      type="button"
                      className={`rounded-full px-5 py-2 font-semibold transition-all duration-200 ${acknowledged[convoy.id]
                          ? 'bg-emerald-500/20 text-emerald-300 shadow-lg shadow-emerald-500/10'
                          : 'bg-amberCommand text-black shadow-lg shadow-amberCommand/20 hover:bg-amberCommand/90'
                        }`}
                      onClick={() => setAcknowledged((prev) => ({ ...prev, [convoy.id]: true }))}
                    >
                      {acknowledged[convoy.id] ? '✓ Acknowledged' : 'Acknowledge'}
                    </button>
                    <Link
                      href={`/dashboard?convoy=${convoy.id}`}
                      className="rounded-full border border-panelNight/40 bg-panelNight/30 px-5 py-2 text-textNeutral transition-all duration-200 hover:border-amberCommand/40 hover:bg-panelNight/50"
                    >
                      Open in dashboard
                    </Link>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-panelNight/40 bg-panelNight/60 p-4 text-sm">
                    <p className="text-xs uppercase tracking-wider text-textNeutral/50">Merge advisory</p>
                    <p className="mt-2 text-textNeutral">
                      {convoy.mergeSuggestion
                        ? `Merge with ${convoy.mergeSuggestion.withConvoyId} to save ${convoy.mergeSuggestion.payloadSavingsTons}t payload.`
                        : 'No merge recommendation available.'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-panelNight/40 bg-panelNight/60 p-4 text-sm">
                    <p className="text-xs uppercase tracking-wider text-textNeutral/50">Next checkpoint</p>
                    <p className="mt-2 text-textNeutral">
                      {convoy.assignedRoute?.checkpoints?.[0]?.name ?? '—'} · ETA{' '}
                      {convoy.assignedRoute?.checkpoints?.[0]?.eta ?? '—'}
                    </p>
                  </div>
                </div>
                {segments.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wider text-textNeutral/50">Blocked segments</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {segments.map((segment) => (
                        <span
                          key={segment.id}
                          className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-200 ${getSegmentBadge(
                            segment,
                          )}`}
                        >
                          {segment.id} · {segment.terrain}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Segment Watchlist */}
        <section className="rounded-3xl border border-panelNight/40 bg-gradient-to-br from-panelNight/60 to-panelNight/40 p-6 shadow-xl backdrop-blur-sm">
          <p className="text-xs uppercase tracking-wider text-textNeutral/50">Segment watchlist</p>
          <h2 className="mt-1 text-2xl font-semibold text-textNeutral">Critical corridor monitoring</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {blockedSegments.slice(0, 6).map((segment) => (
              <div
                key={`${segment.convoyName}-${segment.id}`}
                className="group rounded-2xl border border-panelNight/50 bg-gradient-to-br from-panelNight/80 to-slateDepth/70 p-5 text-sm transition-all duration-300 hover:border-red-400/30 hover:shadow-lg"
              >
                <p className="text-xs text-textNeutral/60">{segment.convoyName}</p>
                <p className="mt-2 text-lg font-semibold text-textNeutral">Segment {segment.id}</p>
                <p className="mt-1 text-textNeutral/70">
                  Terrain {segment.terrain} · Difficulty {segment.difficulty}
                </p>
                <p className={`mt-2 text-xs font-medium ${getSegmentBadge(segment).split(' ')[1]}`}>
                  Status {segment.status}
                </p>
                <button
                  type="button"
                  className="mt-4 text-xs text-amberCommand underline transition-all duration-200 hover:text-amberCommand/80"
                >
                  Share with engineering battalion
                </button>
              </div>
            ))}
            {blockedSegments.length === 0 && (
              <p className="col-span-full rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center text-sm text-emerald-300">
                ✅ No segments on watchlist.
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AnalyticsPage;
