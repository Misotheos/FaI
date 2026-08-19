import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ensureUnivenFillButton } from '../../src/content';
import type { Property } from '../../src/domain/property/property.types';
import { deleteProperties, getProperties, saveProperty } from '../../src/storage/property-storage';

describe('property storage', () => {
  beforeEach(() => {
    const store = new Map<string, unknown>();

    const storageMock = {
      set: vi.fn(async (data: Record<string, unknown>, callback?: () => void) => {
        Object.entries(data).forEach(([key, value]) => store.set(key, value));
        callback?.();
      }),
      get: vi.fn(async (keys?: string | string[] | Record<string, unknown> | null, callback?: (items: Record<string, unknown>) => void) => {
        const selected = typeof keys === 'string'
          ? { [keys]: store.get(keys) }
          : Array.isArray(keys)
            ? Object.fromEntries(keys.map((key) => [key, store.get(key)]))
            : typeof keys === 'object' && keys !== null
              ? Object.fromEntries(Object.keys(keys).map((key) => [key, store.get(key)]))
              : Object.fromEntries([...store.entries()]);

        callback?.(selected);
        return selected;
      })
    } as unknown as typeof chrome.storage.local;

    const chromeMock = {
      storage: {
        local: storageMock,
        sync: {} as typeof chrome.storage.sync,
        managed: {} as typeof chrome.storage.managed,
        session: {} as typeof chrome.storage.session,
        onChanged: {} as typeof chrome.storage.onChanged,
        AccessLevel: { TRUSTED_CONTEXTS: 'trusted_contexts', TRUSTED_AND_UNTRUSTED_CONTEXTS: 'trusted_and_untrusted_contexts' }
      }
    } as unknown as typeof chrome;

    (globalThis as typeof globalThis & { chrome?: typeof chrome }).chrome = chromeMock;
  });

  it('saves a property and returns it from storage', async () => {
    const property: Property = {
      source: {
        url: 'https://example.com/imovel/123',
        portal: 'site',
        capturedAt: '2026-08-18T00:00:00.000Z'
      },
      reference: 'REF-001',
      price: { sale: 1250000 },
      location: {
        street: 'Rua Teste',
        neighborhood: 'Centro',
        city: 'Salvador',
        state: 'BA'
      }
    };

    await saveProperty(property);
    const stored = await getProperties();

    expect(stored).toHaveLength(1);
    expect(stored[0]?.reference).toBe('REF-001');
    expect(stored[0]?.source?.url).toBe('https://example.com/imovel/123');
  });

  it('deduplicates repeated captures from the same URL', async () => {
    const property: Property = {
      source: {
        url: 'https://example.com/imovel/123',
        portal: 'site',
        capturedAt: '2026-08-18T00:00:00.000Z'
      },
      reference: 'REF-001',
      location: { street: 'Rua Teste' }
    };

    await saveProperty(property);
    await saveProperty({ ...property, reference: undefined });

    const stored = await getProperties();
    expect(stored).toHaveLength(1);
    expect(stored[0]?.source?.url).toBe(property.source.url);
  });

  it('deletes selected processed properties without touching the capture tray', async () => {
    const first: Property = {
      source: { url: 'https://example.com/imovel/1', capturedAt: '2026-08-18T00:00:00.000Z' },
      reference: 'REF-001'
    };
    const second: Property = {
      source: { url: 'https://example.com/imovel/2', capturedAt: '2026-08-18T00:00:00.000Z' },
      reference: 'REF-002'
    };

    await saveProperty(first);
    await saveProperty(second);
    const captureTray = { capture: { id: 'capture-1' } };
    const storage = (globalThis as typeof globalThis & { chrome: typeof chrome }).chrome.storage.local;
    await storage.set({ fatima_capture_tray: captureTray });

    await deleteProperties([first.source.url]);

    expect((await getProperties()).map((property) => property.reference)).toEqual(['REF-002']);
    const remaining = await new Promise<Record<string, unknown>>((resolve) => {
      (storage.get as unknown as (key: string, callback: (items: Record<string, unknown>) => void) => void)('fatima_capture_tray', resolve);
    });
    expect(remaining.fatima_capture_tray).toEqual(captureTray);
  });

  it('saves the property when the Univen fill button is clicked', async () => {
    const previousLocation = globalThis.location;
    const previousDocument = globalThis.document;

    const { JSDOM } = await import('jsdom');
    const dom = new JSDOM(`
      <html>
        <body>
          <input id="imovel_inf_referencia" />
          <input id="imovel_inf_valvenda" />
          <input id="imovel_inf_endereco" />
          <input id="imovel_inf_bairro" />
          <input id="imovel_inf_cidade" />
          <input id="imovel_inf_uf" />
          <input id="imovel_det_dormitorios" />
          <input id="imovel_det_suite" />
          <input id="imovel_det_banheiros" />
          <input id="imovel_det_garagens" />
          <textarea id="imovel_int_anunciointernet"></textarea>
        </body>
      </html>
    `);

    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: new URL('https://www.univenweb.com.br/#cadastro-imovel')
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: dom.window.document
    });

    ensureUnivenFillButton();
    const button = document.getElementById('fatia-univen-fill-button');
    await saveProperty({
      source: {
        url: 'https://example.com/imovel/123',
        portal: 'site',
        capturedAt: '2026-08-18T00:00:00.000Z'
      },
      reference: 'REF-001',
      price: { sale: 1250000 },
      location: { street: 'Rua Teste' }
    });

    button?.click();

    await Promise.resolve();
    await Promise.resolve();

    const stored = await getProperties();
    expect(stored).toHaveLength(1);
    expect((document.querySelector('#imovel_inf_referencia') as HTMLInputElement).value).toBe('REF-001');

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: previousDocument
    });
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: previousLocation
    });
  });
});
