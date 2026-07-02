import { notFound } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { normalizeConvoy } from '@/lib/convoyAdapter';
import MapContainer from '@/components/Map/MapContainer';

const BACKEND_BASE = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050';

async function getConvoy(id: string) {
  try {
    const response = await fetch(`${BACKEND_BASE}/api/convoys/${id}`, { cache: 'no-store' });
    if (!response.ok) return null;
    const payload = await response.json();
    if (!payload.success) return null;
    return normalizeConvoy(payload.data);
  } catch (error) {
    console.error('Failed to fetch convoy detail from backend', error);
    return null;
  }
}

export default async function ConvoyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const convoy = await getConvoy(id);

  if (!convoy) {
    notFound();
  }

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col gap-6 bg-slateDepth px-6 py-8 text-textNeutral">
        <div>
          <p className="text-xs uppercase text-textNeutral/60">Convoy detail</p>
          <h1 className="text-3xl font-semibold">{convoy.name}</h1>
          <p className="text-sm text-textNeutral/70">
            Route {convoy.assignedRoute?.name ?? 'unassigned'} · Priority {convoy.priority}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-panelNight/40 bg-panelNight/70 p-4 text-sm">
            <h2 className="text-lg font-semibold">Mission briefing</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs uppercase text-textNeutral/50">Origin</dt>
                <dd className="text-textNeutral">{convoy.origin.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-textNeutral/50">Destination</dt>
                <dd className="text-textNeutral">{convoy.destination.name}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-textNeutral/50">Vehicles</dt>
                <dd>{convoy.vehicleCount}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase text-textNeutral/50">Speed</dt>
                <dd>{convoy.speedKmph} km/h</dd>
              </div>
            </dl>
            <div className="mt-6">
              <h3 className="text-xs uppercase text-textNeutral/50">Checkpoints</h3>
              <ul className="mt-2 space-y-2">
                {convoy.assignedRoute?.checkpoints.map((checkpoint) => (
                  <li key={checkpoint.id} className="rounded-xl border border-panelNight/40 bg-slateDepth/70 px-3 py-2">
                    <p className="text-sm font-semibold">{checkpoint.name}</p>
                    <p className="text-xs text-textNeutral/60">ETA {new Date(checkpoint.eta).toLocaleTimeString()}</p>
                  </li>
                ))}
              </ul>
            </div>
          </section>
          <section className="h-[420px] rounded-2xl border border-panelNight/40 bg-panelNight/80">
            <MapContainer convoys={[convoy]} selectedConvoy={convoy} />
          </section>
        </div>
      </div>
    </ProtectedRoute>
  );
}
