import type { CaptureRecord, CaptureStatus } from '../domain/capture/capture.types';
import type { PropertyCandidate } from '../domain/property/property-candidate.types';

const STORAGE_KEY = 'fatima_capture_tray';

function storage(): typeof chrome.storage.local | undefined {
  return globalThis.chrome?.storage?.local;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    ['nocache', 'utm_source', 'utm_medium', 'utm_campaign', 'lis'].forEach((key) => parsed.searchParams.delete(key));
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url.trim();
  }
}

function captureId(property: PropertyCandidate): string {
  const url = property.source?.url ? normalizeUrl(property.source.url) : '';
  return url || property.reference || `capture-${Date.now()}`;
}

async function readRecords(): Promise<Record<string, CaptureRecord>> {
  const currentStorage = storage();
  if (!currentStorage) {
    return {};
  }

  return new Promise((resolve) => {
    currentStorage.get(STORAGE_KEY, (items) => {
      resolve((items?.[STORAGE_KEY] as Record<string, CaptureRecord>) ?? {});
    });
  });
}

async function writeRecords(records: Record<string, CaptureRecord>): Promise<void> {
  const currentStorage = storage();
  if (!currentStorage) {
    return;
  }

  await new Promise<void>((resolve) => {
    currentStorage.set({ [STORAGE_KEY]: records }, () => resolve());
  });
}

export async function saveCapture(property: PropertyCandidate): Promise<CaptureRecord> {
  const records = await readRecords();
  const id = captureId(property);
  const previous = records[id];
  const now = new Date().toISOString();
  const record: CaptureRecord = {
    id,
    status: previous?.status === 'discarded' ? 'discarded' : previous?.status ?? 'new',
    capturedAt: previous?.capturedAt ?? property.source?.capturedAt ?? now,
    updatedAt: now,
    source: {
      url: property.source?.url ?? '',
      portal: property.source?.portal
    },
    property,
    discardedAt: previous?.discardedAt,
    discardReason: previous?.discardReason
  };

  await writeRecords({ ...records, [id]: record });
  return record;
}

export async function getCaptures(status?: CaptureStatus): Promise<CaptureRecord[]> {
  const records = Object.values(await readRecords());
  return status ? records.filter((record) => record.status === status) : records;
}

export async function updateCaptureStatus(id: string, status: CaptureStatus, discardReason?: string): Promise<CaptureRecord | undefined> {
  const records = await readRecords();
  const record = records[id];
  if (!record) {
    return undefined;
  }

  const updated: CaptureRecord = {
    ...record,
    status,
    updatedAt: new Date().toISOString(),
    discardedAt: status === 'discarded' ? new Date().toISOString() : undefined,
    discardReason: status === 'discarded' ? discardReason : undefined
  };
  await writeRecords({ ...records, [id]: updated });
  return updated;
}

export async function deleteCaptures(ids: string[]): Promise<void> {
  const records = await readRecords();
  const next = { ...records };
  ids.forEach((id) => delete next[id]);
  await writeRecords(next);
}