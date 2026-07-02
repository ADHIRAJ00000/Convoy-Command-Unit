import type { Route } from './route';

export type Priority = 'ALPHA' | 'BRAVO' | 'CHARLIE' | 'DELTA';
export type ConvoyStatus = 'PLANNED' | 'EN_ROUTE' | 'AT_CHECKPOINT' | 'COMPLETED' | 'DELAYED' | 'CANCELLED';
export type UnitType = 'ARMY' | 'AIRFORCE' | 'NAVY' | 'PARAMILITARY' | 'LOGISTICS' | 'MEDICAL';

export type MergeSuggestion = {
  withConvoyId: string;
  payloadSavingsTons: number;
  confidence: number; // 0-1
};

export type Convoy = {
  id: string;
  name: string;
  origin: { lat: number; lng: number; name?: string };
  destination: { lat: number; lng: number; name?: string };
  currentPosition?: { lat: number; lng: number; name?: string };
  assignedRoute?: Route; // optional until optimized
  speedKmph: number;
  priority: Priority;
  vehicleCount: number;
  unitType?: UnitType;
  status: ConvoyStatus;
  lastUpdated: string; // ISO timestamp
  etaHours?: number;
  mergeSuggestion?: MergeSuggestion;
};
