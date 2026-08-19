import type { PropertyInput } from '../domain/property/property.types';
import type { PropertyCandidate } from '../domain/property/property-candidate.types';
import { isValidLocationValue } from '../domain/location/location.validation';
import { normalizeProperty } from '../domain/property/property.normalizer';
import { extractReference } from './reference.extractor';

type RecordValue = Record<string, unknown>;
const BRAZILIAN_STATES = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF',
  'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS',
  'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]);

function asRecord(value: unknown): RecordValue | undefined {
  return value && typeof value === 'object' ? value as RecordValue : undefined;
}

function structuredListingData(document: Document): RecordValue | undefined {
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const parsed = JSON.parse(script.textContent ?? '') as unknown;
      const candidates = Array.isArray(parsed) ? parsed : [parsed];

      for (const candidate of candidates) {
        const record = asRecord(candidate);
        const graph = record?.['@graph'];
        const graphItems = Array.isArray(graph) ? graph : [];
        const records = [record, ...graphItems.map(asRecord)];
        const listing = records.find((item) => item?.offers || item?.address || item?.description || item?.geo);
        if (listing) {
          return listing;
        }
      }
    } catch {
      continue;
    }
  }

  return undefined;
}

function finiteCoordinate(value: unknown, minimum: number, maximum: number): number | undefined {
  const number = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : undefined;
}

function pageCoordinates(document: Document, structured?: RecordValue): { latitude?: number; longitude?: number } {
  const geo = structured?.geo && typeof structured.geo === 'object' ? structured.geo as RecordValue : undefined;
  const element = document.querySelector('[data-latitude][data-longitude], [data-lat][data-lng]');
  const latitude = finiteCoordinate(geo?.latitude ?? element?.getAttribute('data-latitude') ?? element?.getAttribute('data-lat'), -90, 90);
  const longitude = finiteCoordinate(geo?.longitude ?? element?.getAttribute('data-longitude') ?? element?.getAttribute('data-lng'), -180, 180);

  return { latitude, longitude };
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function externalIdFromPage(document: Document, url: string, structured?: RecordValue): string | undefined {
  const identifier = structured?.identifier;
  const structuredId = typeof identifier === 'string' ? identifier : asRecord(identifier)?.value;
  const metaId = document.querySelector(
    'meta[property="product:retailer_item_id"], meta[name="product:id"], meta[name="listing-id"], meta[name="property-id"]'
  )?.getAttribute('content');
  const dataId = document.querySelector('[data-property-id], [data-ad-id], [data-listing-id]');
  const dataValue = dataId?.getAttribute('data-property-id')
    ?? dataId?.getAttribute('data-ad-id')
    ?? dataId?.getAttribute('data-listing-id');

  return stringValue(structured?.sku)
    ?? stringValue(structured?.productID)
    ?? stringValue(structuredId)
    ?? stringValue(metaId)
    ?? stringValue(dataValue)
    ?? url.match(/\/(\d{5,})(?:[/?#]|$)/)?.[1];
}

function validState(value: string | undefined): string | undefined {
  const state = value?.trim().toUpperCase();
  return state && BRAZILIAN_STATES.has(state) ? state : undefined;
}

function titleCase(value: string): string {
  return value.toLocaleLowerCase('pt-BR').replace(/(^|\s)\p{L}/gu, (letter) => letter.toLocaleUpperCase('pt-BR'));
}

function validLocationValue(value: string | undefined): string | undefined {
  return isValidLocationValue(value) ? value : undefined;
}

function textFromSelectors(document: Document, selectors: string[]): string | undefined {
  const ElementCtor = document.defaultView?.Element ?? globalThis.Element;

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (!element || !(element instanceof (ElementCtor ?? Element))) {
      continue;
    }

    const value = element.textContent?.trim() ?? '';
    if (value.length > 0) {
      return value;
    }

    if ('value' in element && typeof element.value === 'string' && element.value.trim().length > 0) {
      return element.value.trim();
    }
  }

  return undefined;
}

function locationTextFromPage(document: Document): string | undefined {
  const attribute = document.querySelector('[data-location-text]')?.getAttribute('data-location-text');
  return stringValue(attribute) ?? textFromSelectors(document, ['[data-testid="ad-location"]']);
}

function portalLocation(document: Document): PropertyInput['location'] | undefined {
  const value = textFromSelectors(document, ['.localizacao']);
  const match = value?.match(/^(.+?)\s*-\s*(.+?)\/([A-Z]{2})$/i);
  if (!match) {
    return undefined;
  }

  return {
    neighborhood: validLocationValue(titleCase(match[1].trim())),
    city: validLocationValue(titleCase(match[2].trim())),
    state: validState(match[3])
  };
}

function detailValue(document: Document, pattern: RegExp): string | undefined {
  for (const element of document.querySelectorAll('.detalhes .detalhe')) {
    const value = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (pattern.test(value)) {
      return value;
    }
  }

  return undefined;
}

function approximateLocation(document: Document, url: string): PropertyInput['location'] {
  const hostnameState = new URL(url).hostname.split('.')[0]?.toUpperCase();
  const fallbackState = hostnameState && BRAZILIAN_STATES.has(hostnameState) ? hostnameState : undefined;
  const leafLines = [...document.querySelectorAll('body *')]
    .filter((element) => element.children.length === 0)
    .map((element) => element.textContent?.trim() ?? '')
    .filter((value, index, values) => value.length > 0
      && value.toLowerCase() !== 'exibir no mapa'
      && value.toLowerCase() !== 'localização'
      && values.indexOf(value) === index);
  const locationIndex = leafLines.findIndex((value) => /\d{5}-?\d{3}$/.test(value) && value.includes(','));
  const locationLine = locationIndex >= 0 ? leafLines[locationIndex] : undefined;
  const locationMatch = locationLine?.match(/^(.+?),\s*([^,|]+?)(?:\s*[|,])\s*(\d{5}-?\d{3})$/);

  if (locationMatch) {
    const previousLine = leafLines[locationIndex - 1];
    const candidateState = locationMatch[2].trim().toUpperCase();
    const neighborhood = previousLine
      && !['menu', 'localização'].includes(previousLine.toLowerCase())
      && !/simular|consórcio|consorcio|exibir|agora/i.test(previousLine)
      ? previousLine
      : undefined;

    return {
      neighborhood: validLocationValue(neighborhood),
      city: validLocationValue(locationMatch[1].trim()),
      state: BRAZILIAN_STATES.has(candidateState) ? candidateState : fallbackState,
      cep: locationMatch[3]
    };
  }

  const allElements = [...document.querySelectorAll('body *')];
  const locationCandidate = allElements.find((element) => /,\s*[A-Z]{2}\s*[,|]\s*\d{5}-?\d{3}/.test(element.textContent ?? ''));
  const locationCandidateText = locationCandidate?.textContent?.match(/([^,|\n]+),\s*([A-Z]{2})\s*[,|]\s*(\d{5}-?\d{3})/);

  if (locationCandidateText) {
    const previousSibling = locationCandidate?.previousElementSibling?.textContent?.trim();
    const neighborhood = previousSibling && !/menu|localização|simular|consórcio|consorcio|exibir|agora/i.test(previousSibling)
      ? previousSibling
      : undefined;

    return {
      neighborhood: validLocationValue(neighborhood),
      city: validLocationValue(locationCandidateText[1].trim()),
      state: validState(locationCandidateText[2]) ?? fallbackState,
      cep: locationCandidateText[3]
    };
  }

  const locationElement = document.querySelector('[data-testid="ad-location"]')
    ?? [...document.querySelectorAll('h1, h2, h3, h4, [role="heading"]')]
      .find((element) => element.textContent?.trim().toLowerCase() === 'localização')
      ?.parentElement;
  if (!locationElement) {
    return undefined;
  }

  const lines = [...locationElement.querySelectorAll('span, p, div, button')]
    .flatMap((element) => (element.textContent ?? '').split(/\n|\r/).map((value) => value.trim()))
    .filter((value, index, values) => value.length > 0
      && value.toLowerCase() !== 'exibir no mapa'
      && values.indexOf(value) === index
      && value.toLowerCase() !== 'localização');
  const values = lines.length > 0 ? lines : (locationElement.textContent ?? '')
    .split(/\n|\r/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value.toLowerCase() !== 'exibir no mapa');
  const neighborhood = validLocationValue(values[0]);
  const locationParts = values.find((value) => /\b[A-Z]{2}\b/.test(value));
  const match = locationParts?.match(/^(.+?),\s*([A-Z]{2})(?:,\s*(\d{5}-?\d{3}))?$/);

  if (!neighborhood && !match) {
    return undefined;
  }

  return {
    neighborhood,
    city: validLocationValue(match?.[1]?.trim()),
    state: match?.[2] && BRAZILIAN_STATES.has(match[2]) ? match[2] : fallbackState,
    cep: match?.[3]
  };
}

export function parsePropertyFromDocument(document: Document, url: string): PropertyCandidate {
  const structured = structuredListingData(document);
  const offers = Array.isArray(structured?.offers) ? asRecord(structured.offers[0]) : asRecord(structured?.offers);
  const address = asRecord(structured?.address);
  const addressText = stringValue(structured?.address);
  const approximate = approximateLocation(document, url);
  const addressTextParts = addressText?.match(/^(.+?)\s*[-,]\s*([A-Z]{2})$/);
  const portal = portalLocation(document);
  const coordinates = pageCoordinates(document, structured);
  const locationText = validLocationValue(locationTextFromPage(document));
  const locationSource = coordinates.latitude !== undefined && coordinates.longitude !== undefined
    ? 'coordinates'
    : locationText
      ? 'olx_text'
      : undefined;

  const raw: PropertyCandidate = {
    source: {
      url,
      portal: portal ? 'corretora-fatima' : 'generic',
      capturedAt: new Date().toISOString(),
      externalId: externalIdFromPage(document, url, structured)
    },
    reference: extractReference(document, externalIdFromPage(document, url, structured)).value,
    price: {
      sale: textFromSelectors(document, ['.valor-imovel h4', '.price', '[data-price]', '[data-testid="ad-price"]', 'input[name="price"]'])
        ?? stringValue(offers?.price)
    },
    details: {
      bedrooms: textFromSelectors(document, ['input[name="bedrooms"]', '#bedrooms', '.bedrooms']) ?? detailValue(document, /dormit/),
      bathrooms: textFromSelectors(document, ['input[name="bathrooms"]', '#bathrooms', '.bathrooms']) ?? detailValue(document, /banheiro/),
      parkingSpaces: textFromSelectors(document, ['input[name="parkingSpaces"]', '#parkingSpaces', '.parkingSpaces']) ?? detailValue(document, /vaga/),
      usableArea: textFromSelectors(document, ['.area', '#area', '[data-area]']) ?? detailValue(document, /m²|m2/i)
    },
    location: {
      street: textFromSelectors(document, ['.street', '#street', '[data-street]', '[itemprop="streetAddress"]'])
        ?? stringValue(address?.streetAddress),
      neighborhood: portal?.neighborhood
        ?? approximate?.neighborhood
        ?? validLocationValue(textFromSelectors(document, ['.neighborhood', '#neighborhood', '[data-neighborhood]'])),
      city: portal?.city
        ?? approximate?.city
        ?? validLocationValue(textFromSelectors(document, ['.city', '#city', '[data-city]']))
        ?? stringValue(address?.addressLocality)
        ?? addressTextParts?.[1]?.trim(),
      state: portal?.state
        ?? approximate?.state
        ?? validState(textFromSelectors(document, ['.state', '#state', '[data-state]']))
        ?? validState(stringValue(address?.addressRegion))
        ?? validState(addressTextParts?.[2]),
      cep: approximate?.cep
        ?? textFromSelectors(document, ['.cep', '#cep', '[data-cep]', '[itemprop="postalCode"]'])
        ?? stringValue(address?.postalCode),
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      rawLocationText: locationText,
      locationSource
    },
    advertisement: {
      description: textFromSelectors(document, ['#texto-descricao', '.description', '#description', '[data-testid="ad-description"]', 'textarea', '[data-description]'])
        ?? stringValue(structured?.description)
    }
  };

  return normalizeProperty(raw);
}
