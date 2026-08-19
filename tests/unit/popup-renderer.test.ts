import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it, vi } from 'vitest';
import { loadSavedProperties, renderCaptureTray, renderSavedProperties, requestFillProperty } from '../../src/ui/popup';

describe('popup renderer', () => {
  it('loads saved properties automatically when the popup script initializes', async () => {
    const dom = new JSDOM(`
      <html>
        <body>
          <div id="saved-items"></div>
        </body>
      </html>
    `, { url: 'https://extension.test/popup.html' });

    const { document } = dom.window;
    globalThis.document = document as unknown as Document;

    const localStorageMock = {
      get: vi.fn((...args: unknown[]) => {
        const callback = typeof args[args.length - 1] === 'function'
          ? (args[args.length - 1] as (items: Record<string, unknown>) => void)
          : undefined;

        const result = {
          fatima_properties: {
            'REF-001': {
              source: { url: 'https://example.com/imovel/123', portal: 'site', capturedAt: '2026-08-18T00:00:00.000Z' },
              reference: 'REF-001',
              price: { sale: 1250000 },
              location: { street: 'Rua Teste', neighborhood: 'Centro', city: 'Salvador', state: 'BA' }
            }
          }
        };

        callback?.(result);
        return Promise.resolve(result);
      })
    } as unknown as typeof chrome.storage.local;

    (globalThis as typeof globalThis & { chrome?: typeof chrome }).chrome = {
      storage: {
        local: localStorageMock
      }
    } as unknown as typeof chrome;

    const { initPopup } = await import('../../src/ui/popup');
    await initPopup();

    expect(document.getElementById('saved-items')?.textContent).toContain('REF-001');
  });

  it('loads saved properties from storage and renders them', async () => {
    const dom = new JSDOM(`
      <html>
        <body>
          <div id="saved-items"></div>
        </body>
      </html>
    `);

    const { document } = dom.window;
    globalThis.document = document as unknown as Document;

    const localStorageMock = {
      get: vi.fn((...args: unknown[]) => {
        const callback = typeof args[args.length - 1] === 'function'
          ? (args[args.length - 1] as (items: Record<string, unknown>) => void)
          : undefined;

        const result = {
          fatima_properties: {
            'REF-001': {
              source: { url: 'https://example.com/imovel/123', portal: 'site', capturedAt: '2026-08-18T00:00:00.000Z' },
              reference: 'REF-001',
              price: { sale: 1250000 },
              location: { street: 'Rua Teste', neighborhood: 'Centro', city: 'Salvador', state: 'BA' }
            }
          }
        };

        callback?.(result);
        return Promise.resolve(result);
      })
    } as unknown as typeof chrome.storage.local;

    (globalThis as typeof globalThis & { chrome?: typeof chrome }).chrome = {
      storage: {
        local: localStorageMock
      }
    } as typeof chrome;

    await loadSavedProperties();

    const list = document.getElementById('saved-items');
    expect(list?.textContent).toContain('REF-001');
    expect(list?.textContent).toContain('Rua Teste');
  });

  it('renders saved properties in the popup list', () => {
    const dom = new JSDOM(`
      <html>
        <body>
          <div id="saved-items"></div>
        </body>
      </html>
    `);

    const { document } = dom.window;
    globalThis.document = document as unknown as Document;

    renderSavedProperties([
      {
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
      }
    ]);

    const list = document.getElementById('saved-items');
    expect(list?.textContent).toContain('REF-001');
    expect(list?.textContent).toContain('Rua Teste');
  });

  it('renders approximate location details in the popup list', () => {
    const dom = new JSDOM(`
      <html>
        <body>
          <div id="saved-items"></div>
        </body>
      </html>
    `);

    const { document } = dom.window;
    globalThis.document = document as unknown as Document;

    renderSavedProperties([{
      source: {
        url: 'https://www.olx.com.br/d/789',
        portal: 'generic',
        capturedAt: '2026-08-18T00:00:00.000Z'
      },
      location: {
        neighborhood: 'Jardim Armação',
        city: 'Salvador',
        state: 'BA',
        cep: '41750240'
      }
    }]);

    const list = document.getElementById('saved-items');
    expect(list?.textContent).toContain('Jardim Armação');
    expect(list?.textContent).toContain('Salvador, BA');
    expect(list?.textContent).toContain('41750240');
  });

  it('renders captured text as text instead of HTML', () => {
    const dom = new JSDOM(`
      <html>
        <body>
          <div id="saved-items"></div>
        </body>
      </html>
    `, { url: 'https://extension.test/popup.html' });

    const { document } = dom.window;
    globalThis.document = document as unknown as Document;

    renderSavedProperties([
      {
        source: {
          url: 'https://example.com/imovel/123',
          portal: 'site',
          capturedAt: '2026-08-18T00:00:00.000Z'
        },
        reference: '<img src="invalid" onerror="alert(1)">',
        location: { street: '<script>alert(1)</script>' }
      }
    ]);

    const list = document.getElementById('saved-items');
    expect(list?.querySelector('img')).toBeNull();
    expect(list?.querySelector('script')).toBeNull();
    expect(list?.textContent).toContain('<img src="invalid" onerror="alert(1)">');
    expect(list?.textContent).toContain('<script>alert(1)</script>');
  });

  it('renders capture tray records with selection and original listing link', () => {
    const dom = new JSDOM('<html><body><div id="capture-items"></div></body></html>', {
      url: 'https://extension.test/popup.html'
    });

    globalThis.document = dom.window.document as unknown as Document;

    renderCaptureTray([{
      id: 'https://example.com/imovel/123',
      status: 'new',
      capturedAt: '2026-08-18T00:00:00.000Z',
      updatedAt: '2026-08-18T00:00:00.000Z',
      source: { url: 'https://example.com/imovel/123', portal: 'generic' },
      property: {
        source: { url: 'https://example.com/imovel/123', capturedAt: '2026-08-18T00:00:00.000Z' },
        reference: 'REF-123',
        price: { sale: '350000' },
        location: { rawLocationText: 'Salvador, BA' }
      }
    }]);

    const list = document.getElementById('capture-items');
    expect(list?.textContent).toContain('REF-123');
    expect(list?.textContent).toContain('Anúncio original');
    expect(list?.querySelector('input[type="checkbox"]')).not.toBeNull();
    expect((list?.querySelector('a') as HTMLAnchorElement).href).toBe('https://example.com/imovel/123');
  });

  it('omits missing placeholders and uses external id in the capture card', () => {
    const dom = new JSDOM('<html><body><div id="capture-items"></div></body></html>', {
      url: 'https://extension.test/popup.html'
    });

    globalThis.document = dom.window.document as unknown as Document;

    renderCaptureTray([{
      id: 'https://example.com/imovel/124',
      status: 'new',
      capturedAt: '2026-08-18T00:00:00.000Z',
      updatedAt: '2026-08-18T00:00:00.000Z',
      source: { url: 'https://example.com/imovel/124' },
      property: {
        source: { url: 'https://example.com/imovel/124', capturedAt: '2026-08-18T00:00:00.000Z', externalId: 'PUBLIC-124' },
        location: { city: 'Salvador', state: 'Menu', neighborhood: 'Menu' }
      }
    }]);

    const text = document.getElementById('capture-items')?.textContent ?? '';
    expect(text).toContain('Anúncio #PUBLIC-124');
    expect(text).not.toContain('Sem referência');
    expect(text).not.toContain('Endereço não informado');
    expect(text).not.toContain('Menu');
  });

  it('renders processed-property checkboxes and selection controls without affecting fill', () => {
    const dom = new JSDOM(`
      <html><body>
        <button id="processed-select-all"></button>
        <button id="processed-clear-selection"></button>
        <button id="processed-delete-selected"></button>
        <div id="saved-items"></div>
      </body></html>
    `, { url: 'https://extension.test/popup.html' });
    globalThis.document = dom.window.document as unknown as Document;

    renderSavedProperties([{
      source: { url: 'https://example.com/imovel/1', capturedAt: '2026-08-18T00:00:00.000Z' },
      reference: 'REF-001'
    }, {
      source: { url: 'https://example.com/imovel/2', capturedAt: '2026-08-18T00:00:00.000Z' },
      reference: 'REF-002'
    }]);

    expect(document.querySelectorAll('#saved-items input[type="checkbox"]')).toHaveLength(2);
    expect(document.getElementById('processed-select-all')).not.toBeNull();
    expect(document.getElementById('processed-clear-selection')).not.toBeNull();
    expect(document.getElementById('processed-delete-selected')).not.toBeNull();
    expect(document.querySelectorAll('#saved-items button')).toHaveLength(2);
  });

  it('renders the broker reference before processed-property details', () => {
    const dom = new JSDOM('<html><body><div id="saved-items"></div></body></html>', {
      url: 'https://extension.test/popup.html'
    });
    globalThis.document = dom.window.document as unknown as Document;

    renderSavedProperties([{
      source: {
        url: 'https://example.com/imovel/1394856094',
        capturedAt: '2026-08-18T00:00:00.000Z',
        externalId: '1394856094'
      },
      reference: 'LM134',
      price: { sale: 630000 }
    }]);

    const text = document.getElementById('saved-items')?.textContent ?? '';
    expect(text.indexOf('LM134')).toBeLessThan(text.indexOf('R$ 630.000'));
    expect(text).not.toContain('Anúncio #1394856094');
  });

  it('declares a popup page in the extension manifest', () => {
    const manifest = JSON.parse(readFileSync(new URL('../../manifest.json', import.meta.url), 'utf8'));
    expect(manifest.action.default_popup).toBe('popup.html');
  });

  it('sends the selected property to the active tab', async () => {
    const sendMessage = vi.fn((_tabId: number, _message: unknown, callback: (response: unknown) => void) => {
      callback({ ok: true });
    });
    const query = vi.fn((_queryInfo: unknown, callback: (tabs: chrome.tabs.Tab[]) => void) => {
      callback([{ id: 42 } as chrome.tabs.Tab]);
    });

    (globalThis as typeof globalThis & { chrome?: typeof chrome }).chrome = {
      tabs: { query, sendMessage }
    } as unknown as typeof chrome;

    const result = await requestFillProperty({
      source: {
        url: 'https://example.com/imovel/123',
        portal: 'site',
        capturedAt: '2026-08-18T00:00:00.000Z'
      },
      reference: 'REF-001'
    });

    expect(result).toBe(true);
    expect(sendMessage).toHaveBeenCalledWith(42, expect.objectContaining({ type: 'fill-property' }), expect.any(Function));
  });
});
