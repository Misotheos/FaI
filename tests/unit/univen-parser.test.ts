import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { parseUnivenProperty } from '../../src/integrations/univen/univen.parser';

describe('Univen parser', () => {
  it('extracts the core property and location values from the Univen cadastro page', () => {
    const html = readFileSync(new URL('../fixtures/univen/sanitized.html', import.meta.url), 'utf8');
    const dom = new JSDOM(html);

    const property = parseUnivenProperty(dom.window.document, 'https://www.univenweb.com.br/#cadastro-imovel');

    expect(property.source?.url).toBe('https://www.univenweb.com.br/#cadastro-imovel');
    expect(property.reference).toBe('REF-001');
    expect(property.type).toBe('Apartamento');
    expect(property.price?.sale).toBe(1250000);
    expect(property.location?.cep).toBe('01234-567');
    expect(property.location?.street).toBe('Rua Teste');
    expect(property.location?.number).toBe('123');
    expect(property.location?.neighborhood).toBe('Centro');
    expect(property.location?.city).toBe('Salvador');
    expect(property.location?.state).toBe('BA');
    expect(property.details?.bedrooms).toBe(3);
    expect(property.details?.suites).toBe(2);
    expect(property.details?.bathrooms).toBe(2);
    expect(property.details?.parkingSpaces).toBe(1);
    expect(property.details?.usableArea).toBe(75);
    expect(property.details?.totalArea).toBe(90);
    expect(property.advertisement?.description).toBe('Anuncio publico');
  });
});
