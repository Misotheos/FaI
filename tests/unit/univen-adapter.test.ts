import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import type { Property } from '../../src/domain/property/property.types';
import { fillPropertyIntoUniven } from '../../src/integrations/univen/univen.adapter';

describe('Univen adapter', () => {
  it('fills the selected core property fields into the Univen form', () => {
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

    const { document } = dom.window;
    globalThis.document = document as unknown as Document;
    globalThis.window = dom.window as unknown as Window & typeof globalThis;

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
      },
      details: {
        bedrooms: 3,
        suites: 2,
        bathrooms: 2,
        parkingSpaces: 1
      },
      advertisement: {
        description: 'Apartamento em excelente localização.'
      }
    };

    const result = fillPropertyIntoUniven(property);

    expect(result).toBe(true);
    expect((document.querySelector('#imovel_inf_referencia') as HTMLInputElement).value).toBe('REF-001');
    expect((document.querySelector('#imovel_inf_valvenda') as HTMLInputElement).value).toBe('1250000');
    expect((document.querySelector('#imovel_inf_endereco') as HTMLInputElement).value).toBe('Rua Teste');
    expect((document.querySelector('#imovel_inf_bairro') as HTMLInputElement).value).toBe('Centro');
    expect((document.querySelector('#imovel_inf_cidade') as HTMLInputElement).value).toBe('Salvador');
    expect((document.querySelector('#imovel_inf_uf') as HTMLInputElement).value).toBe('BA');
    expect((document.querySelector('#imovel_det_dormitorios') as HTMLInputElement).value).toBe('3');
    expect((document.querySelector('#imovel_det_suite') as HTMLInputElement).value).toBe('2');
    expect((document.querySelector('#imovel_det_banheiros') as HTMLInputElement).value).toBe('2');
    expect((document.querySelector('#imovel_det_garagens') as HTMLInputElement).value).toBe('1');
    expect((document.querySelector('#imovel_int_anunciointernet') as HTMLTextAreaElement).value).toBe('Apartamento em excelente localização.');
  });
});
