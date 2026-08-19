import type { PropertyCandidate } from '../property/property-candidate.types';

export type CaptureStatus = 'new' | 'selected' | 'kept' | 'discarded';

export interface CaptureRecord {
  id: string;
  status: CaptureStatus;
  capturedAt: string;
  updatedAt: string;
  source: {
    url: string;
    portal?: string;
  };
  property: PropertyCandidate;
  discardedAt?: string;
  discardReason?: string;
}