import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { parsePropertyFromDocument } from '../../src/parsers/generic.parser';

describe('generic parser', () => {
  it('extracts core fields from common DOM patterns', () => {
    const dom = new JSDOM(`
      <html>
        <body>
          <main>
            <h1>Imóvel em Salvador</h1>
            <div class="price">R$ 1.250.000,00</div>
            <input name="bedrooms" value="3" />
            <input id="bathrooms" value="2" />
            <input id="parkingSpaces" value="1" />
            <div class="area">75 m²</div>
            <div class="street">Rua das Flores</div>
            <div class="neighborhood">Centro</div>
            <div class="city">Salvador</div>
            <div class="state">BA</div>
            <textarea class="description">Apartamento com varanda e garagem.</textarea>
          </main>
        </body>
      </html>
    `);

    const property = parsePropertyFromDocument(dom.window.document, 'https://example.com/imovel/123');

    expect(property.source?.url).toBe('https://example.com/imovel/123');
    expect(property.price?.sale).toBe(1250000);
    expect(property.details?.bedrooms).toBe(3);
    expect(property.details?.bathrooms).toBe(2);
    expect(property.details?.parkingSpaces).toBe(1);
    expect(property.details?.usableArea).toBe(75);
    expect(property.location?.street).toBe('Rua das Flores');
    expect(property.location?.neighborhood).toBe('Centro');
    expect(property.location?.city).toBe('Salvador');
    expect(property.location?.state).toBe('BA');
    expect(property.advertisement?.description).toContain('varanda');
  });

  it('extracts price and address from an OLX-like listing', () => {
    const dom = new JSDOM(`
      <html>
        <head>
          <script type="application/ld+json">
            {"@context":"https://schema.org","@type":"Product","name":"Apartamento em Salvador","offers":{"price":"350000","priceCurrency":"BRL"},"address":{"streetAddress":"Rua das Flores, 123","addressLocality":"Salvador","addressRegion":"BA"},"description":"Apartamento com varanda"}
          </script>
        </head>
        <body>
          <h1 data-testid="ad-title">Apartamento em Salvador</h1>
          <div data-testid="ad-price">R$ 350.000</div>
        </body>
      </html>
    `);

    const property = parsePropertyFromDocument(dom.window.document, 'https://www.olx.com.br/d/123');

    expect(property.price?.sale).toBe(350000);
    expect(property.location?.street).toBe('Rua das Flores, 123');
    expect(property.location?.city).toBe('Salvador');
    expect(property.location?.state).toBe('BA');
    expect(property.advertisement?.description).toBe('Apartamento com varanda');
  });

  it('uses the OLX visual location when structured address is unavailable', () => {
    const dom = new JSDOM(`
      <html>
        <head>
          <script type="application/ld+json">
            {"@type":"Product","offers":{"price":"830000"},"address":"Salvador - BA"}
          </script>
        </head>
        <body>
          <div data-testid="ad-location">Salvador, BA</div>
        </body>
      </html>
    `);

    const property = parsePropertyFromDocument(dom.window.document, 'https://www.olx.com.br/d/456');

    expect(property.location?.street).toBeUndefined();
    expect(property.location?.city).toBe('Salvador');
    expect(property.location?.state).toBe('BA');
  });

  it('parses the OLX location block into neighborhood, city, state, and CEP', () => {
    const dom = new JSDOM(`
      <html>
        <body>
          <div data-testid="ad-location">
            <span>Jardim Armação</span>
            <span>Salvador, BA, 41750240</span>
            <button>Exibir no mapa</button>
          </div>
        </body>
      </html>
    `);

    const property = parsePropertyFromDocument(dom.window.document, 'https://www.olx.com.br/d/789');

    expect(property.location?.neighborhood).toBe('Jardim Armação');
    expect(property.location?.city).toBe('Salvador');
    expect(property.location?.state).toBe('BA');
    expect(property.location?.cep).toBe('41750240');
  });

  it('finds an OLX location block by its visible heading', () => {
    const dom = new JSDOM(`
      <html>
        <body>
          <section>
            <h2>Localização</h2>
            <div>
              <div>Jardim Armação</div>
              <div>Salvador, BA, 41750240</div>
              <button>Exibir no mapa</button>
            </div>
          </section>
        </body>
      </html>
    `);

    const property = parsePropertyFromDocument(dom.window.document, 'https://www.olx.com.br/d/heading');

    expect(property.location?.neighborhood).toBe('Jardim Armação');
    expect(property.location?.city).toBe('Salvador');
    expect(property.location?.state).toBe('BA');
    expect(property.location?.cep).toBe('41750240');
  });

  it('ignores navigation text before an approximate location line', () => {
    const dom = new JSDOM(`
      <html>
        <body>
          <nav><button>Menu</button></nav>
          <main>
            <div>Jardim Armação</div>
            <div>Salvador, BA, 41750240</div>
          </main>
        </body>
      </html>
    `);

    const property = parsePropertyFromDocument(dom.window.document, 'https://www.olx.com.br/d/menu');

    expect(property.location?.neighborhood).toBe('Jardim Armação');
    expect(property.location?.city).toBe('Salvador');
  });

  it('does not treat OLX actions as location and infers UF from the listing host', () => {
    const dom = new JSDOM(`
      <html>
        <body>
          <div>Simular consórcio agora</div>
          <div>Salvador, Menu | 40295030</div>
        </body>
      </html>
    `);

    const property = parsePropertyFromDocument(propertyDocument(dom), 'https://ba.olx.com.br/imovel/123');

    expect(property.location?.neighborhood).toBeUndefined();
    expect(property.location?.city).toBe('Salvador');
    expect(property.location?.state).toBe('BA');
    expect(property.location?.cep).toBe('40295030');
  });

  it('prefers the approximate location over contaminated generic city selectors', () => {
    const dom = new JSDOM(`
      <html>
        <body>
          <div class="city">Salvador, Menu</div>
          <div>Salvador, BA | 40150122</div>
        </body>
      </html>
    `);

    const property = parsePropertyFromDocument(propertyDocument(dom), 'https://www.olx.com.br/imovel/456');

    expect(property.location?.city).toBe('Salvador');
    expect(property.location?.state).toBe('BA');
    expect(property.location?.cep).toBe('40150122');
  });

  it('extracts the OLX map location when it is nested in an unlabelled component', () => {
    const dom = new JSDOM(`
      <html>
        <body>
          <div class="map-summary">
            <span>Paralela</span>
            <a><span>Salvador, BA, 41730101</span></a>
          </div>
        </body>
      </html>
    `);

    const property = parsePropertyFromDocument(propertyDocument(dom), 'https://www.olx.com.br/imovel/789');

    expect(property.location?.neighborhood).toBe('Paralela');
    expect(property.location?.city).toBe('Salvador');
    expect(property.location?.state).toBe('BA');
    expect(property.location?.cep).toBe('41730101');
  });

  it('extracts fields from a corretora Fatima listing page', () => {
    const dom = new JSDOM(`
      <html>
        <body>
          <h1 class="titulo">Apartamento</h1>
          <h2 class="localizacao">ABRANTES - CAMAÇARI/BA</h2>
          <div class="valor-imovel"><h3>Venda</h3><h4>R$ 274.000,00</h4></div>
          <div class="referencia"><span>Referência: </span><span>PN920</span></div>
          <div class="detalhes">
            <div class="detalhe"><span>3</span><span> dormitórios</span></div>
            <div class="detalhe"><span>1<span> banheiro</span></span></div>
            <div class="detalhe"><span>1<span> vaga</span></span></div>
            <div class="detalhe"><span>60,00 m² útil</span></div>
          </div>
          <div id="texto-descricao" class="texto">Apartamento com área de lazer.</div>
        </body>
      </html>
    `);

    const property = parsePropertyFromDocument(dom.window.document, 'https://www.corretorafatima.com.br/comprar/ba/camacari/abrantes/apartamento/78623793');

    expect(property.reference).toBe('PN920');
    expect(property.price?.sale).toBe(274000);
    expect(property.location?.neighborhood).toBe('Abrantes');
    expect(property.location?.city).toBe('Camaçari');
    expect(property.location?.state).toBe('BA');
    expect(property.details?.bedrooms).toBe(3);
    expect(property.details?.bathrooms).toBe(1);
    expect(property.details?.parkingSpaces).toBe(1);
    expect(property.details?.usableArea).toBe(60);
    expect(property.advertisement?.description).toContain('área de lazer');
  });

  it('captures legitimate listing coordinates without geocoding them', () => {
    const dom = new JSDOM(`
      <html>
        <head>
          <script type="application/ld+json">
            {"@type":"Apartment","geo":{"latitude":-12.987654,"longitude":-38.456789},"address":{"addressLocality":"Salvador","addressRegion":"BA"}}
          </script>
        </head>
        <body>
          <div data-location-text="Bairro aproximado, Salvador - BA">Localização aproximada</div>
        </body>
      </html>
    `);

    const property = parsePropertyFromDocument(dom.window.document, 'https://example.com/imovel/coordinates');

    expect(property.location?.latitude).toBe(-12.987654);
    expect(property.location?.longitude).toBe(-38.456789);
    expect(property.location?.rawLocationText).toBe('Bairro aproximado, Salvador - BA');
    expect(property.location?.locationSource).toBe('coordinates');
    expect(property.location?.neighborhood).toBeUndefined();
  });

  it('keeps reference separate from a public external id and rejects interface location text', () => {
    const dom = new JSDOM(`
      <html>
        <head>
          <meta property="product:retailer_item_id" content="PUBLIC-123" />
        </head>
        <body>
          <div class="city">Salvador, Menu</div>
          <div data-testid="ad-location">Menu</div>
        </body>
      </html>
    `);

    const property = parsePropertyFromDocument(dom.window.document, 'https://example.com/anuncio/sem-referencia');

    expect(property.reference).toBeUndefined();
    expect(property.source?.externalId).toBe('PUBLIC-123');
    expect(property.location?.city).toBeUndefined();
    expect(property.location?.locationText).toBeUndefined();
  });

  it.each([
    ['Referência:', 'LM134'],
    ['Ref.', 'PN657'],
    ['Código do imóvel:', 'AP-2034'],
    ['Cód. imóvel:', 'FZ0012'],
    ['Referência:', 'ABC/987'],
    ['Ref:', 'XPTO-33A'],
    ['Código do imóvel:', '2026-145']
  ])('captures the generic broker reference format %s %s', (label, value) => {
    const dom = new JSDOM(`<html><body><div><span>${label}</span><span>${value}</span></div></body></html>`);
    const property = parsePropertyFromDocument(dom.window.document, 'https://example.com/imovel/1394856094');
    expect(property.reference).toBe(value);
    expect(property.source?.externalId).toBe('1394856094');
    expect(property.source?.url).toBe('https://example.com/imovel/1394856094');
  });

  it.each([
    ['Código', '1394856094'],
    ['Código', '40150-122'],
    ['Código', 'https://example.com/imovel/1394856094']
  ])('does not promote ambiguous or unsafe %s values to reference', (label, value) => {
    const dom = new JSDOM(`<html><body><div><span>${label}</span><span>${value}</span></div></body></html>`);
    const property = parsePropertyFromDocument(dom.window.document, 'https://example.com/imovel/1394856094');
    expect(property.reference).toBeUndefined();
  });
});

function propertyDocument(dom: JSDOM): Document {
  return dom.window.document;
}
