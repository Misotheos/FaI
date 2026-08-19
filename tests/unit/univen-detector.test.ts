import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { ensureGenericCaptureButton, ensureUnivenFillButton } from '../../src/content';
import { isUnivenPage, isUnivenImovelCadastroPage } from '../../src/integrations/univen/univen.detector';

describe('Univen detector', () => {
  it('detects actual Univen URLs and ignores other domains', () => {
    const originalLocation = globalThis.location;

    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: new URL('https://www.univenweb.com.br/#cadastro-imovel')
    });

    expect(isUnivenPage()).toBe(true);
    expect(isUnivenImovelCadastroPage()).toBe(true);

    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: new URL('https://example.com/imovel/123')
    });

    expect(isUnivenPage()).toBe(false);
    expect(isUnivenImovelCadastroPage()).toBe(false);

    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: originalLocation
    });
  });

  it('injects a fill button on the Univen cadastro page', () => {
    const originalLocation = globalThis.location;
    const originalDocument = globalThis.document;

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

    const inserted = ensureUnivenFillButton();
    const button = document.getElementById('fatia-univen-fill-button');

    expect(inserted).toBe(true);
    expect(button).not.toBeNull();
    expect(button?.textContent).toContain('Preencher último imóvel');

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: originalDocument
    });
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: originalLocation
    });
  });

  it('injects a capture button on non-Univen property pages', () => {
    const originalLocation = globalThis.location;
    const originalDocument = globalThis.document;
    const dom = new JSDOM('<html><body><div class="price">R$ 350.000,00</div></body></html>');

    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: new URL('https://example.com/imovel/123')
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: dom.window.document
    });

    const inserted = ensureGenericCaptureButton();
    const button = document.getElementById('fatima-generic-capture-button');

    expect(inserted).toBe(true);
    expect(button?.textContent).toContain('Capturar imóvel');

    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: originalDocument
    });
    Object.defineProperty(globalThis, 'location', {
      configurable: true,
      value: originalLocation
    });
  });
});
