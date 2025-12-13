'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import useSWR from 'swr';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import MapContainer from '@/components/Map/MapContainer';
import NotificationToast, { type Toast } from '@/components/NotificationToast';
import OptimizerModal from '@/components/OptimizerModal';
import ConvoyList from '@/components/ConvoyList';
import { CheckpointTimeline } from '@/components/CheckpointTimeline';
import { api } from '@/lib/api';
import { socketService, subscribeToEvent } from '@/lib/socket';
import { fetchMapboxRoute } from '@/lib/routing';
import type { Convoy } from '@/types/convoy';
import type { OperationEvent } from '@/types/event';
import type { RouteAlternative } from '@/types/route';

// Hardcoded demo data as fallback
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

const DashboardPage = () => {
  const { data: apiConvoys, isLoading, mutate, error } = useSWR<Convoy[]>('/api/convoys', fetchConvoys, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  // Store convoys with real routes in state
  const [convoysWithRealRoutes, setConvoysWithRealRoutes] = useState<Convoy[]>([]);

  // Use convoys with real routes if available, otherwise use API/demo data
  const convoys = convoysWithRealRoutes.length > 0 ? convoysWithRealRoutes : (apiConvoys || DEMO_CONVOYS);

  const pathname = usePathname();
  const [selectedConvoy, setSelectedConvoy] = useState<Convoy | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [livePositions, setLivePositions] = useState<Record<string, [number, number]>>({});
  const [optimizerOpen, setOptimizerOpen] = useState(false);
  const [optimizerLoading, setOptimizerLoading] = useState(false);
  const [optimizerResult, setOptimizerResult] = useState<Awaited<ReturnType<typeof api.requestOptimizerRoute>> | null>(null);
  const [routeAlternatives, setRouteAlternatives] = useState<RouteAlternative[]>([]);
  const [activeAlternativeId, setActiveAlternativeId] = useState<string | null>(null);
  const [highContrast, setHighContrast] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [createConvoyOpen, setCreateConvoyOpen] = useState(false);
  const [routesLoaded, setRoutesLoaded] = useState(false);
  const [focusedCheckpoint, setFocusedCheckpoint] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const speedMultiplier = 1.0; // Backend simulation speed

  useEffect(() => {
    if (!convoys.length) return;
    setSelectedConvoy((current) => current ?? convoys[0]);
  }, [convoys]);

  useEffect(() => {
    // Reset optimizer choices when switching convoys
    setRouteAlternatives([]);
    setActiveAlternativeId(null);
  }, [selectedConvoy?.id]);

  // Fetch real routes for demo convoys on initial load
  useEffect(() => {
    const fetchRealRoutesForDemoConvoys = async () => {
      const sourceConvoys = apiConvoys || DEMO_CONVOYS;

      if (routesLoaded || !sourceConvoys.length) return;

      console.log('Fetching real routes for convoys...');

      const updatedConvoys = await Promise.all(
        sourceConvoys.map(async (convoy) => {
          // Check if convoy has only straight-line route (2-4 points suggests demo data)
          if (convoy.assignedRoute && convoy.assignedRoute.polyline.length <= 4) {
            console.log(`Fetching route for ${convoy.name}...`);

            const realRoute = await fetchMapboxRoute({
              origin: convoy.origin,
              destination: convoy.destination,
              profile: 'driving',
            });

            if (realRoute) {
              console.log(`✓ Real route fetched for ${convoy.name}: ${realRoute.distanceKm}km`);
              return {
                ...convoy,
                assignedRoute: realRoute,
                etaHours: realRoute.etaHours,
              };
            }
          }
          return convoy;
        })
      );

      setConvoysWithRealRoutes(updatedConvoys);
      setRoutesLoaded(true);
      console.log('All routes loaded successfully!');
    };

    // Only fetch routes once on initial load
    if (!routesLoaded) {
      fetchRealRoutesForDemoConvoys();
    }
  }, [apiConvoys, routesLoaded]);

  useEffect(() => {
    socketService.connect();
    setSocketConnected(socketService.isConnected());

    const unsubscribePosition = subscribeToEvent('convoy.position.update', (data) => {
      setLivePositions((prev) => ({
        ...prev,
        [data.convoyId]: [data.position.lat, data.position.lng],
      }));
    });

    const unsubscribeCheckpoint = subscribeToEvent('convoy.checkpoint.cleared', (data) => {
      mutate();
      setToasts((prev) => [
        ...prev,
        {
          id: `checkpoint-${data.checkpointId}-${Date.now()}`,
          title: 'Checkpoint cleared',
          description: `Checkpoint ${data.checkpointId} cleared`,
          tone: 'success',
        },
      ]);
    });

    const unsubscribeReroute = subscribeToEvent('convoy.reroute', (data) => {
      mutate();
      setToasts((prev) => [
        ...prev,
        {
          id: `reroute-${Date.now()}`,
          title: 'Convoy rerouted',
          description: `Route updated for convoy`,
          tone: 'info',
        },
      ]);
    });

    const unsubscribeEvent = subscribeToEvent('event.triggered', (data) => {
      setToasts((prev) => [
        ...prev,
        {
          id: `event-${Date.now()}`,
          title: `${data.event.type} detected`,
          description: `${data.affectedConvoys.length} convoys affected`,
          tone: data.event.severity === 'CRITICAL' ? 'error' : 'warning',
        },
      ]);
      mutate();
    });

    const unsubscribeRisk = subscribeToEvent('risk.alert', (data) => {
      setToasts((prev) => [
        ...prev,
        {
          id: `risk-${data.convoyId}-${Date.now()}`,
          title: 'High risk detected',
          description: data.message,
          tone: 'warning',
        },
      ]);
    });

    const unsubscribeOptimizer = subscribeToEvent('optimizer.result', (data) => {
      setToasts((prev) => [
        ...prev,
        {
          id: `optimizer-${Date.now()}`,
          title: 'Route optimization complete',
          description: `New route generated for convoy`,
          tone: 'success',
        },
      ]);
      mutate();
    });

    return () => {
      unsubscribePosition();
      unsubscribeCheckpoint();
      unsubscribeReroute();
      unsubscribeEvent();
      unsubscribeRisk();
      unsubscribeOptimizer();
      socketService.disconnect();
    };
  }, [mutate]);

  useEffect(() => {
    const highRiskConvoy = convoys.find((convoy) => convoy.assignedRoute?.riskScore && convoy.assignedRoute.riskScore > 50);
    if (highRiskConvoy) {
      const toastId = `risk-${highRiskConvoy.id}`;
      setToasts((prev) =>
        prev.some((toast) => toast.id === toastId)
          ? prev
          : [
            ...prev,
            {
              id: toastId,
              title: 'Conflict risk detected',
              description: `${highRiskConvoy.name} exceeds risk threshold. Consider reroute.`,
              tone: 'warning',
              actionLabel: 'Open details',
              onAction: () => setSelectedConvoy(highRiskConvoy),
            },
          ],
      );
    }
  }, [convoys]);

  const handleReroute = async (override?: { lat: number; lng: number }) => {
    if (!selectedConvoy) return;
    setOptimizerLoading(true);
    const loadingToastId = 'requesting-alternatives';

    try {
      // Show loading toast
      setToasts((prev) => [
        ...prev,
        {
          id: loadingToastId,
          title: 'Requesting optimizer routes...',
          description: 'Calling backend for safest/fastest alternatives',
          tone: 'info',
        },
      ]);

      const response = await api.requestOptimizerAlternatives({
        convoyId: selectedConvoy.id,
        destinationOverride: override,
      });

      const buildJitterWaypoints = (strategy?: string) => {
        const midLat = (selectedConvoy.origin.lat + (override?.lat ?? selectedConvoy.destination.lat)) / 2;
        const midLng = (selectedConvoy.origin.lng + (override?.lng ?? selectedConvoy.destination.lng)) / 2;
        const offsets = (() => {
          switch (strategy) {
            case 'SAFEST':
              return { lat: 0.25, lng: 0.35 };
            case 'BALANCED':
              return { lat: 0.18, lng: -0.25 };
            case 'FASTEST':
            default:
              return { lat: -0.12, lng: 0.18 };
          }
        })();

        return [
          { lat: midLat + offsets.lat, lng: midLng - offsets.lng },
          { lat: midLat - offsets.lat, lng: midLng + offsets.lng },
        ];
      };

      const ensureGeometry = async (alt: RouteAlternative) => {
        const hasPolyline = alt.route?.polyline && alt.route.polyline.length > 2;
        if (hasPolyline) return alt;

        try {
          // Fetch a real routed path with jittered waypoints to avoid straight lines
          const realRoute = await fetchMapboxRoute({
            origin: selectedConvoy.origin,
            destination: override || selectedConvoy.destination,
            waypoints: buildJitterWaypoints(alt.strategyName),
            profile: 'driving',
          });

          if (!realRoute) return alt;

          return {
            ...alt,
            route: {
              ...realRoute,
              riskScore: alt.route?.riskScore ?? realRoute.riskScore,
            },
          };
        } catch (e) {
          console.warn('Mapbox fallback failed, using straight line', e);
          return alt;
        }
      };

      const alternativesRaw = response.data?.alternatives ?? [];
      const alternatives = await Promise.all(alternativesRaw.map(ensureGeometry));
      if (!alternatives.length) {
        throw new Error('No route alternatives returned');
      }

      setRouteAlternatives(alternatives);

      const fastest = alternatives.find((alt) => alt.display?.isFastest) ?? alternatives[0];
      const newActiveId = fastest?.route?.id ?? fastest?.strategyName ?? null;
      setActiveAlternativeId(newActiveId);

      if (fastest?.route) {
        const updatedConvoy = {
          ...selectedConvoy,
          assignedRoute: fastest.route,
          etaHours: fastest.route.etaHours,
          lastUpdated: new Date().toISOString(),
        };

        setConvoysWithRealRoutes((prev) =>
          prev.map((c) => c.id === selectedConvoy.id ? updatedConvoy : c)
        );
        setSelectedConvoy(updatedConvoy);
        await mutate();
      }

      // Dismiss loading toast
      setToasts((prev) => prev.filter((toast) => toast.id !== loadingToastId));

      setToasts((prev) => [
        ...prev,
        {
          id: `alternatives-${Date.now()}`,
          title: 'Optimizer ready',
          description: `Showing ${alternatives.length} route options${fastest?.comparison?.delayMinutes !== undefined ? ` · ${Math.max(0, fastest.comparison.delayMinutes)} min delay vs fastest` : ''}`,
          tone: 'success',
        },
      ]);

      setOptimizerOpen(false);
    } catch (error) {
      // Dismiss any loading toasts
      setToasts((prev) => prev.filter((toast) => toast.id !== loadingToastId));

      setToasts((prev) => [
        ...prev,
        {
          id: `reroute-error-${Date.now()}`,
          title: 'Reroute failed',
          description: error instanceof Error ? error.message : 'Failed to calculate new route',
          tone: 'error',
        },
      ]);
    } finally {
      setOptimizerLoading(false);
    }
  };

  const applyAlternative = (alternative: RouteAlternative) => {
    if (!selectedConvoy || !alternative.route) return;
    const activeId = alternative.route.id ?? alternative.strategyName;
    setActiveAlternativeId(activeId ?? null);

    const updatedConvoy = {
      ...selectedConvoy,
      assignedRoute: alternative.route,
      etaHours: alternative.route.etaHours,
      lastUpdated: new Date().toISOString(),
    };

    setConvoysWithRealRoutes((prev) => prev.map((convoy) => (convoy.id === selectedConvoy.id ? updatedConvoy : convoy)));
    setSelectedConvoy(updatedConvoy);

    // Hide the alternatives overlay after applying one to let the map breathe
    setRouteAlternatives([]);

    setToasts((prev) => [
      ...prev,
      {
        id: `alt-apply-${Date.now()}`,
        title: `${alternative.strategyName || 'Route'} applied`,
        description: `ETA ${alternative.route.etaHours}h · ${(alternative.comparison?.delayMinutes ?? 0) >= 0 ? `${alternative.comparison?.delayMinutes ?? 0} min slower` : 'fastest'}`,
        tone: 'success',
      },
    ]);
  };

  const handleCreateConvoy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const origin = {
        lat: parseFloat(formData.get('originLat') as string),
        lng: parseFloat(formData.get('originLng') as string),
        name: formData.get('originName') as string || 'Origin',
      };

      const destination = {
        lat: parseFloat(formData.get('destLat') as string),
        lng: parseFloat(formData.get('destLng') as string),
        name: formData.get('destName') as string || 'Destination',
      };

      // Show loading toast
      setToasts((prev) => [
        ...prev,
        {
          id: 'fetching-route',
          title: 'Calculating route...',
          description: 'Fetching real road-based route from Mapbox',
          tone: 'info',
        },
      ]);

      // Fetch real route from Mapbox Directions API - try without waypoints first for cleaner path
      console.log('Fetching route for new convoy:', origin, destination);
      const realRoute = await fetchMapboxRoute({
        origin,
        destination,
        profile: 'driving',
      });

      // Dismiss loading toast
      setToasts((prev) => prev.filter((toast) => toast.id !== 'fetching-route'));

      if (!realRoute) {
        throw new Error('Failed to calculate route. Please check coordinates and try again.');
      }

      console.log('Route fetched:', {
        id: realRoute.id,
        polylineLength: realRoute.polyline.length,
        distance: realRoute.distanceKm,
        isFallback: realRoute.id.includes('fallback')
      });

      const newConvoy: Convoy = {
        id: `convoy-${Date.now()}`, // Generate temporary ID
        name: formData.get('name') as string,
        priority: formData.get('priority') as Convoy['priority'],
        vehicleCount: parseInt(formData.get('vehicleCount') as string),
        speedKmph: parseInt(formData.get('speedKmph') as string),
        unitType: formData.get('unitType') as Convoy['unitType'],
        origin,
        destination,
        currentPosition: origin, // Start at origin
        status: 'PLANNED' as Convoy['status'],
        assignedRoute: realRoute,
        etaHours: realRoute.etaHours,
        lastUpdated: new Date().toISOString(),
      };

      // Try to save to backend
      try {
        const response = await fetch('/api/convoys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newConvoy),
        });

        if (response.ok) {
          const createdConvoy = await response.json();
          // Update with backend-generated ID if available
          if (createdConvoy.id) {
            newConvoy.id = createdConvoy.id;
          }
        }
      } catch (apiError) {
        console.warn('Backend save failed, continuing with client-side convoy:', apiError);
      }

      // Close modal first for better UX
      setCreateConvoyOpen(false);

      // Add the new convoy to both local state and force refresh
      setConvoysWithRealRoutes((prev) => [...prev, newConvoy]);

      // Show success toast with route details
      const routeType = realRoute.id.includes('fallback') ? 'Direct route' : 'Road-based route';
      const pathInfo = realRoute.polyline.length > 10 ? 'real road path' : 'direct path';

      setToasts((prev) => [
        ...prev,
        {
          id: `convoy-created-${Date.now()}`,
          title: `Convoy created with ${routeType}`,
          description: `${newConvoy.name} - ${realRoute.distanceKm}km ${pathInfo}, ETA ${realRoute.etaHours}h, ${realRoute.checkpoints.length} checkpoints`,
          tone: 'success',
        },
      ]);

      // Try to refresh from backend
      mutate().catch(e => console.warn('Mutate failed:', e));

      // Select the newly created convoy
      setSelectedConvoy(newConvoy);

    } catch (error) {
      // Dismiss any loading toasts
      setToasts((prev) => prev.filter((toast) => toast.id !== 'fetching-route'));

      const errorMessage = error instanceof Error ? error.message : 'Failed to create convoy';

      setToasts((prev) => [
        ...prev,
        {
          id: `convoy-error-${Date.now()}`,
          title: 'Error creating convoy',
          description: errorMessage,
          tone: 'error',
        },
      ]);

      console.error('Create convoy error:', error);
    }
  };

  const handleViewCheckpointOnMap = (checkpoint: { lat: number; lng: number; name: string }) => {
    setFocusedCheckpoint(checkpoint);

    // Add a toast notification
    setToasts((prev) => [
      ...prev,
      {
        id: `checkpoint-view-${Date.now()}`,
        title: 'Viewing checkpoint on map',
        description: `Centered on ${checkpoint.name}`,
        tone: 'info',
      },
    ]);

    // Auto-clear the focused checkpoint after 10 seconds to allow normal map interaction
    setTimeout(() => {
      setFocusedCheckpoint(null);
    }, 10000);
  };

  const dismissToast = (id: string) => setToasts((prev) => prev.filter((toast) => toast.id !== id));

  const timelineItems = useMemo(() => {
    return (
      selectedConvoy?.assignedRoute?.checkpoints.map((checkpoint) => ({
        id: checkpoint.id,
        type: 'CHECKPOINT' as OperationEvent['type'],
        convoyId: selectedConvoy?.id,
        triggeredAt: checkpoint.loggedAt ?? checkpoint.eta,
        payload: { severity: checkpoint.status === 'CLEARED' ? 'LOW' : 'MEDIUM', notes: checkpoint.name },
      })) ?? []
    );
  }, [selectedConvoy]);

  const activeAlternative = useMemo(
    () =>
      routeAlternatives.find(
        (alt) => alt.route?.id === activeAlternativeId || alt.strategyName === activeAlternativeId,
      ) || routeAlternatives.find((alt) => alt.display?.isFastest),
    [activeAlternativeId, routeAlternatives],
  );

  const selectedConvoyForMap = useMemo(() => {
    if (!selectedConvoy) return null;
    if (activeAlternative?.route) {
      return { ...selectedConvoy, assignedRoute: activeAlternative.route };
    }
    return selectedConvoy;
  }, [activeAlternative, selectedConvoy]);

  const mapAlternatives = useMemo(
    () =>
      routeAlternatives.map((alt) => ({
        id: alt.route?.id ?? alt.strategyName,
        label: `${alt.strategyIcon ?? ''} ${alt.strategyName}`.trim(),
        route: alt.route,
        display: {
          primaryStroke: alt.display?.primaryStroke ?? alt.color ?? '#2563eb',
          secondaryStroke:
            alt.display?.secondaryStroke ?? alt.display?.primaryStroke ?? alt.color ?? '#93c5fd',
          isFastest: alt.display?.isFastest,
          isActive:
            activeAlternativeId
              ? alt.route?.id === activeAlternativeId || alt.strategyName === activeAlternativeId
              : alt.display?.isFastest,
        },
        comparison: alt.comparison,
      })),
    [activeAlternativeId, routeAlternatives],
  );

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/analytics', label: 'Analytics' },
    { href: '/events', label: 'Events' },
    { href: '/pilot-vehicle', label: 'Pilot Vehicle' },
    { href: '/mobile', label: 'Mobile View' },
  ];

  return (
    <div className="flex h-screen flex-col bg-slateDepth text-textNeutral">
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
            <div className="flex items-center gap-2 rounded-lg border border-panelNight/40 px-3 py-2 text-xs">
              <span className={`h-2 w-2 rounded-full ${socketConnected ? 'bg-emerald-400' : 'bg-red-500'}`} />
              <span>{socketConnected ? 'Connected' : 'Offline'}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-panelNight/40 px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs">Commander</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="hidden lg:block">
          <Sidebar
            convoys={convoys}
            loading={isLoading}
            selectedId={selectedConvoy?.id}
            onSelect={(convoy) => setSelectedConvoy(convoy)}
            onCreateConvoy={() => setCreateConvoyOpen(true)}
          />
        </div>

        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Dashboard Header */}
          <header className="border-b border-panelNight/40 bg-panelNight/40 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-textNeutral/60">AICC Command Center</p>
                <h2 className="text-2xl font-semibold text-textNeutral">Operational Dashboard</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCreateConvoyOpen(true)}
                  className="rounded-lg bg-amberCommand px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-amberCommand/90"
                >
                  + Create Convoy
                </button>
                <button
                  type="button"
                  onClick={() => setHighContrast((prev) => !prev)}
                  className="rounded-lg border border-amberCommand/40 px-4 py-2 text-xs hover:bg-amberCommand/10"
                >
                  {highContrast ? '◐ Standard' : '◑ High Contrast'}
                </button>
                <div className="rounded-lg border border-panelNight/40 px-4 py-2 text-center">
                  <p className="text-[10px] text-textNeutral/50">Speed</p>
                  <p className="text-sm text-amberCommand">{speedMultiplier.toFixed(1)}x</p>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content - Map and Convoy List */}
          <div className="flex flex-1 overflow-hidden">
            {/* Map Container (60% width) */}
            <div className="flex-[3] relative p-4">
              {/* Create Convoy Modal Overlay */}
              {createConvoyOpen && (
                <div
                  className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-4 overflow-y-auto"
                  onClick={() => setCreateConvoyOpen(false)}
                >
                  <div
                    className="w-full max-w-2xl rounded-xl border border-amberCommand/30 bg-panelNight/95 backdrop-blur-md shadow-2xl my-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="border-b border-panelNight/40 px-6 py-4 flex items-center justify-between sticky top-0 bg-panelNight/95 backdrop-blur-md rounded-t-xl z-10">
                      <h3 className="text-lg font-semibold text-amberCommand">Create New Convoy</h3>
                      <button
                        onClick={() => setCreateConvoyOpen(false)}
                        className="text-textNeutral/60 hover:text-textNeutral transition"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleCreateConvoy} className="p-6 space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
                      {/* ...existing form fields... */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs uppercase text-textNeutral/60 mb-2">Convoy Name</label>
                          <input
                            type="text"
                            name="name"
                            required
                            placeholder="e.g., DELTA-SUPPLY-15"
                            className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-2 text-sm text-textNeutral focus:border-amberCommand focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs uppercase text-textNeutral/60 mb-2">Priority</label>
                          <select
                            name="priority"
                            required
                            className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-2 text-sm text-textNeutral focus:border-amberCommand focus:outline-none"
                          >
                            <option value="ALPHA">ALPHA - Critical</option>
                            <option value="BRAVO">BRAVO - High</option>
                            <option value="CHARLIE">CHARLIE - Medium</option>
                            <option value="DELTA">DELTA - Low</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs uppercase text-textNeutral/60 mb-2">Unit Type</label>
                          <select
                            name="unitType"
                            required
                            className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-2 text-sm text-textNeutral focus:border-amberCommand focus:outline-none"
                          >
                            <option value="ARMY">Army</option>
                            <option value="SUPPLY">Supply</option>
                            <option value="MEDICAL">Medical</option>
                            <option value="FUEL">Fuel</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs uppercase text-textNeutral/60 mb-2">Vehicle Count</label>
                          <input
                            type="number"
                            name="vehicleCount"
                            required
                            min="1"
                            max="100"
                            defaultValue="20"
                            className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-2 text-sm text-textNeutral focus:border-amberCommand focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs uppercase text-textNeutral/60 mb-2">Origin (Latitude, Longitude)</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            name="originLat"
                            required
                            step="0.0001"
                            placeholder="Latitude"
                            className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-2 text-sm text-textNeutral focus:border-amberCommand focus:outline-none"
                          />
                          <input
                            type="number"
                            name="originLng"
                            required
                            step="0.0001"
                            placeholder="Longitude"
                            className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-2 text-sm text-textNeutral focus:border-amberCommand focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs uppercase text-textNeutral/60 mb-2">Destination (Latitude, Longitude)</label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            name="destLat"
                            required
                            step="0.0001"
                            placeholder="Latitude"
                            className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-2 text-sm text-textNeutral focus:border-amberCommand focus:outline-none"
                          />
                          <input
                            type="number"
                            name="destLng"
                            required
                            step="0.0001"
                            placeholder="Longitude"
                            className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-2 text-sm text-textNeutral focus:border-amberCommand focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs uppercase text-textNeutral/60 mb-2">Speed (km/h)</label>
                        <input
                          type="number"
                          name="speedKmph"
                          required
                          min="10"
                          max="100"
                          defaultValue="45"
                          className="w-full rounded-lg border border-panelNight/40 bg-slateDepth px-4 py-2 text-sm text-textNeutral focus:border-amberCommand focus:outline-none"
                        />
                      </div>

                      <div className="flex gap-3 pt-4">
                        <button
                          type="submit"
                          className="flex-1 rounded-lg bg-amberCommand px-6 py-3 text-sm font-semibold text-black transition hover:bg-amberCommand/90"
                        >
                          Create Convoy
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreateConvoyOpen(false)}
                          className="rounded-lg border border-panelNight/40 px-6 py-3 text-sm text-textNeutral hover:bg-panelNight/40"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <MapContainer
                convoys={convoys}
                selectedConvoy={selectedConvoyForMap ?? undefined}
                livePositions={livePositions}
                highContrast={highContrast}
                alternatives={mapAlternatives}
                focusCheckpoint={focusedCheckpoint}
                onRouteClick={(segmentId) =>
                  setToasts((prev) => [
                    ...prev,
                    {
                      id: `segment-${segmentId}`,
                      title: 'Segment inspected',
                      description: `Segment ${segmentId} clicked`,
                    },
                  ])
                }
              />

              {routeAlternatives.length > 0 && (
                <div className="pointer-events-auto absolute left-8 bottom-8 z-20 w-[360px] space-y-2">
                  <div className="flex items-center justify-between text-xs text-textNeutral/70">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-textNeutral/50">Optimizer Routes</p>
                      <p className="text-sm text-textNeutral">Select fastest vs safest</p>
                    </div>
                    <span className="rounded-full bg-amberCommand/20 px-2 py-1 text-[11px] text-amberCommand">
                      {routeAlternatives.length} options
                    </span>
                  </div>

                  {routeAlternatives.map((alt) => {
                    const delay = alt.comparison?.delayMinutes ?? 0;
                    const isActive = activeAlternativeId
                      ? alt.route?.id === activeAlternativeId || alt.strategyName === activeAlternativeId
                      : alt.display?.isFastest;
                    const badgeColor = alt.display?.primaryStroke ?? alt.color ?? '#22c55e';
                    return (
                      <button
                        key={alt.route?.id ?? alt.strategyName}
                        onClick={() => applyAlternative(alt)}
                        className={`w-full rounded-xl border px-3 py-3 text-left transition ${isActive
                            ? 'border-amberCommand bg-amberCommand/10 shadow-lg shadow-amberCommand/20'
                            : 'border-panelNight/50 bg-panelNight/70 hover:border-amberCommand/60 hover:bg-panelNight/80'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase text-textNeutral/60">
                              {alt.strategyIcon ? `${alt.strategyIcon} ` : ''}{alt.strategyName}
                              {alt.display?.isFastest ? ' · Fastest' : ''}
                            </p>
                            <p className="text-sm font-semibold text-textNeutral">
                              ETA {alt.route?.etaHours}h · {alt.route?.distanceKm} km
                            </p>
                            <p className="text-[11px] text-textNeutral/70">
                              {delay === 0 ? 'Fastest option' : `${Math.abs(delay)} min ${delay > 0 ? 'slower' : 'faster'} vs fastest`}
                            </p>
                          </div>
                          <span
                            className="rounded-full px-3 py-1 text-[11px] font-semibold text-black"
                            style={{ backgroundColor: badgeColor, color: '#0f172a' }}
                          >
                            {alt.priority ?? 'ROUTE'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Convoy List Panel (40% width) */}
            <div className="flex-[2] border-l border-panelNight/40 bg-panelNight/20 overflow-hidden flex flex-col p-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-amberCommand">Active Convoys</h3>
                <p className="text-xs text-textNeutral/60">Click on a convoy to view on map</p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="h-10 w-10 animate-spin rounded-full border-3 border-amberCommand border-t-transparent" />
                  </div>
                ) : convoys.length > 0 ? (
                  convoys.map((convoy, idx) => (
                    <div
                      key={convoy.id}
                      onClick={() => setSelectedConvoy(convoy)}
                      className={`rounded-xl border p-4 cursor-pointer transition-all ${selectedConvoy?.id === convoy.id
                          ? 'border-amberCommand bg-amberCommand/10 shadow-lg shadow-amberCommand/20'
                          : 'border-panelNight/40 bg-panelNight/60 hover:border-amberCommand/60 hover:bg-panelNight/80'
                        }`}
                    >
                      {/* Convoy Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-amberCommand/20 text-amberCommand font-bold text-sm">
                            #{idx + 1}
                          </span>
                          <div>
                            <h4 className="text-base font-semibold text-textNeutral">{convoy.name}</h4>
                            <p className="text-xs text-textNeutral/60">
                              {convoy.origin.name} → {convoy.destination.name}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`rounded px-2 py-1 text-[10px] font-semibold ${convoy.priority === 'ALPHA'
                              ? 'bg-red-500/20 text-red-400'
                              : convoy.priority === 'BRAVO'
                                ? 'bg-orange-500/20 text-orange-400'
                                : convoy.priority === 'CHARLIE'
                                  ? 'bg-yellow-500/20 text-yellow-400'
                                  : 'bg-blue-500/20 text-blue-400'
                            }`}
                        >
                          {convoy.priority}
                        </span>
                      </div>

                      {/* Convoy Stats */}
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="rounded-lg bg-slateDepth/50 p-2">
                          <p className="text-[9px] uppercase text-textNeutral/50">Status</p>
                          <p className="text-xs font-semibold text-emerald-400">{convoy.status}</p>
                        </div>
                        <div className="rounded-lg bg-slateDepth/50 p-2">
                          <p className="text-[9px] uppercase text-textNeutral/50">Vehicles</p>
                          <p className="text-xs font-semibold text-textNeutral">{convoy.vehicleCount}</p>
                        </div>
                        <div className="rounded-lg bg-slateDepth/50 p-2">
                          <p className="text-[9px] uppercase text-textNeutral/50">ETA</p>
                          <p className="text-xs font-semibold text-amberCommand">{convoy.etaHours}h</p>
                        </div>
                      </div>

                      {/* Route Details */}
                      <div className="rounded-lg bg-slateDepth/30 p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-textNeutral/60">Distance</span>
                          <span className="font-semibold text-textNeutral">
                            {convoy.assignedRoute?.distanceKm ?? 0} km
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-textNeutral/60">Speed</span>
                          <span className="font-semibold text-textNeutral">{convoy.speedKmph} km/h</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-textNeutral/60">Risk Score</span>
                          <div className="flex items-center gap-2 flex-1 max-w-[120px]">
                            <div className="flex-1 h-1.5 rounded-full bg-slateDepth">
                              <div
                                className={`h-full rounded-full ${(convoy.assignedRoute?.riskScore ?? 0) > 60
                                    ? 'bg-red-500'
                                    : (convoy.assignedRoute?.riskScore ?? 0) > 40
                                      ? 'bg-yellow-500'
                                      : 'bg-emerald-500'
                                  }`}
                                style={{ width: `${convoy.assignedRoute?.riskScore ?? 0}%` }}
                              />
                            </div>
                            <span className="font-semibold text-textNeutral w-6 text-right">
                              {convoy.assignedRoute?.riskScore ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Checkpoints */}
                      {convoy.assignedRoute?.checkpoints && convoy.assignedRoute.checkpoints.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-panelNight/40">
                          <p className="text-[9px] uppercase text-textNeutral/50 mb-2">Checkpoints</p>
                          <div className="space-y-1">
                            {convoy.assignedRoute.checkpoints.slice(0, 2).map((checkpoint) => (
                              <div key={checkpoint.id} className="flex items-center justify-between text-xs">
                                <span className="text-textNeutral/70">{checkpoint.name}</span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[9px] ${checkpoint.status === 'CLEARED'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-yellow-500/20 text-yellow-400'
                                    }`}
                                >
                                  {checkpoint.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* View Details Button */}
                      {selectedConvoy?.id === convoy.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOptimizerOpen(true);
                          }}
                          className="w-full mt-3 rounded-lg bg-amberCommand px-4 py-2 text-xs font-semibold text-black transition hover:bg-amberCommand/90"
                        >
                          Request Reroute
                        </button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="text-6xl mb-4 opacity-20">📦</div>
                    <p className="text-sm text-textNeutral/50">No convoys available</p>
                    <p className="text-xs text-textNeutral/40 mt-1">Create a new convoy to get started</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Timeline - Enhanced with Checkpoint Timeline */}
          <footer className="border-t border-panelNight/40 bg-panelNight/60 px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] uppercase text-textNeutral/50">Live Checkpoint Timeline</p>
                {selectedConvoy && (
                  <p className="text-xs text-textNeutral/70 mt-0.5">
                    Tracking: <span className="font-semibold text-amberCommand">{selectedConvoy.name}</span> · {selectedConvoy.origin.name} → {selectedConvoy.destination.name}
                  </p>
                )}
              </div>
              {selectedConvoy && (
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-textNeutral/60">Cleared</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-textNeutral/60">Pending</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="text-textNeutral/60">Delayed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-textNeutral/60">Blocked</span>
                  </div>
                </div>
              )}
            </div>
            <CheckpointTimeline convoy={selectedConvoy} onViewOnMap={handleViewCheckpointOnMap} />
          </footer>
        </main>
      </div>

      <NotificationToast toasts={toasts} onDismiss={dismissToast} />
      <OptimizerModal
        open={optimizerOpen}
        isLoading={optimizerLoading}
        result={optimizerResult ?? undefined}
        onClose={() => setOptimizerOpen(false)}
        onSubmit={handleReroute}
      />
    </div>
  );
};

export default DashboardPage;
