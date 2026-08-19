import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { extractReference } from '../../src/parsers/reference.extractor';

describe('reference extractor', () => {
  it.each([
    ['<span>Referência:</span><span>LM134</span>', 'LM134', 'label_value'],
    ['<p>Ref.: PN657</p>', 'PN657', 'label_value'],
    ['<table><tr><td>Código do imóvel</td><td>AP-2034</td></tr></table>', 'AP-2034', 'label_value'],
    ['<span>Cód. imóvel:</span><span>FZ0012</span>', 'FZ0012', 'label_value'],
    ['<span>Referência:</span><span>ABC/987</span>', 'ABC/987', 'label_value'],
    ['<span>Ref:</span><span>XPTO-33A</span>', 'XPTO-33A', 'label_value'],
    ['<span>Código do imóvel:</span><span>2026-145</span>', '2026-145', 'label_value']
  ])('extracts %s as %s', (html, value, source) => {
    const extraction = extractReference(new JSDOM(`<html><body>${html}</body></html>`).window.document);
    expect(extraction.value).toBe(value);
    expect(extraction.source).toBe(source);
  });

  it('uses data attributes and description as generic fallbacks', () => {
    const data = extractReference(new JSDOM('<html><body><div data-reference="A.204"></div></body></html>').window.document);
    expect(data.value).toBe('A.204');
    expect(data.source).toBe('data_attribute');

    const description = extractReference(new JSDOM('<html><body><p class="description">Código do anúncio: MA2359</p></body></html>').window.document);
    expect(description.value).toBe('MA2359');
    expect(description.source).toBe('description');
  });

  it.each(['41820-680', 'R$ 1.590.000', '71 99999-9999', '136 m²', 'https://example.com/anuncio'])('rejects unsafe candidate %s', (value) => {
    const extraction = extractReference(new JSDOM(`<html><body><span>Referência:</span><span>${value}</span></body></html>`).window.document);
    expect(extraction.value).toBeUndefined();
  });

  it('keeps a public numeric external id out of reference', () => {
    const document = new JSDOM('<html><body><p>Código do anúncio: 1484682875</p></body></html>').window.document;
    const extraction = extractReference(document, '1484682875');
    expect(extraction.value).toBeUndefined();
  });
});