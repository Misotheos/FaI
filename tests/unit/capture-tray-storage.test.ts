import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteCaptures, getCaptures, saveCapture, updateCaptureStatus } from '../../src/storage/capture-tray-storage';

describe('capture tray storage', () => {
  beforeEach(() => {
    const store = new Map<string, unknown>();
    const local = {
      set: vi.fn(async (data: Record<string, unknown>, callback?: () => void) => {
        Object.entries(data).forEach(([key, value]) => store.set(key, value));
        callback?.();
      }),
      get: vi.fn(async (key: string, callback: (items: Record<string, unknown>) => void) => {
        const result = { [key]: store.get(key) };
        callback(result);
        return result;
      })
    } as unknown as typeof chrome.storage.local;

    (globalThis as typeof globalThis & { chrome?: typeof chrome }).chrome = {
      storage: { local }
    } as unknown as typeof chrome;
  });

  it('starts captures as new and deduplicates tracking query parameters', async () => {
    const first = await saveCapture({
      source: { url: 'https://example.com/imovel/123?utm_source=test', portal: 'generic', capturedAt: '2026-08-18T00:00:00.000Z' },
      price: { sale: '100000' }
    });
    await saveCapture({
      source: { url: 'https://example.com/imovel/123?utm_campaign=other', portal: 'generic', capturedAt: '2026-08-18T00:01:00.000Z' },
      price: { sale: '110000' }
    });

    expect(first.status).toBe('new');
    expect(await getCaptures()).toHaveLength(1);
    expect((await getCaptures())[0]?.property.price?.sale).toBe('110000');
  });

  it('keeps discarded records, supports undo, and deletes explicitly', async () => {
    const capture = await saveCapture({ source: { url: 'https://example.com/imovel/456' } });
    await updateCaptureStatus(capture.id, 'discarded', 'Sem interesse');

    expect((await getCaptures('discarded'))).toHaveLength(1);
    expect((await saveCapture({ source: { url: 'https://example.com/imovel/456' } })).status).toBe('discarded');

    await updateCaptureStatus(capture.id, 'new');
    expect((await getCaptures('new'))).toHaveLength(1);

    await deleteCaptures([capture.id]);
    expect(await getCaptures()).toHaveLength(0);
  });
});