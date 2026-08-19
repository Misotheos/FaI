import { describe, expect, it, vi } from 'vitest';
import type { CaptureRecord } from '../../src/domain/capture/capture.types';
import type { ReverseGeocoder } from '../../src/application/location/reverse-geocoder';
import { processKeptCapture } from '../../src/application/capture/process-kept-capture';

const keptCapture: CaptureRecord = {
  id: 'https://example.com/imovel/123',
  status: 'kept',
  capturedAt: '2026-08-18T00:00:00.000Z',
  updatedAt: '2026-08-18T00:00:00.000Z',
  source: { url: 'https://example.com/imovel/123', portal: 'generic' },
  property: {
    source: {
      url: 'https://example.com/imovel/123',
      portal: 'generic',
      capturedAt: '2026-08-18T00:00:00.000Z'
    },
    location: { latitude: -12.98, longitude: -38.45, rawLocationText: 'Salvador, BA' }
  }
};

describe('process kept capture', () => {
  it('resolves location and persists only the final Property', async () => {
    const reverseGeocoder: ReverseGeocoder = {
      reverse: vi.fn(async () => ({ neighborhood: 'Centro', city: 'Salvador', state: 'BA' }))
    };
    const persist = vi.fn(async (property) => property);

    const property = await processKeptCapture(keptCapture, reverseGeocoder, persist);

    expect(reverseGeocoder.reverse).toHaveBeenCalledWith(-12.98, -38.45);
    expect(property.location?.neighborhood).toBe('Centro');
    expect(persist).toHaveBeenCalledWith(property);
  });

  it('blocks discarded captures before geocoding or persistence', async () => {
    const reverseGeocoder: ReverseGeocoder = { reverse: vi.fn(async () => ({})) };
    const persist = vi.fn(async (property) => property);

    await expect(processKeptCapture({ ...keptCapture, status: 'discarded' }, reverseGeocoder, persist))
      .rejects.toThrow('Somente imóveis mantidos podem ser processados.');

    expect(reverseGeocoder.reverse).not.toHaveBeenCalled();
    expect(persist).not.toHaveBeenCalled();
  });

  it('persists a kept candidate without external geocoding when no coordinates exist', async () => {
    const reverseGeocoder: ReverseGeocoder = {
      reverse: vi.fn(async () => ({}))
    };
    const persist = vi.fn(async (property) => property);

    const property = await processKeptCapture({
      ...keptCapture,
      property: {
        ...keptCapture.property,
        location: { rawLocationText: 'Salvador, BA' }
      }
    }, reverseGeocoder, persist);

    expect(property.location?.locationSource).toBe('olx_text');
    expect(reverseGeocoder.reverse).not.toHaveBeenCalled();
    expect(persist).toHaveBeenCalledWith(property);
  });
});