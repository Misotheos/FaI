export interface ReferenceExtraction {
  value?: string;
  source?: 'structured_data' | 'label_value' | 'description' | 'metadata' | 'data_attribute';
  confidence?: number;
}

const LABELS = new Map([
  ['referencia', 1],
  ['ref', 1],
  ['codigo do imovel', 1],
  ['codigo imovel', 1],
  ['cod imovel', 1],
  ['cod do imovel', 1],
  ['codigo da propriedade', 1],
  ['referencia do imovel', 1],
  ['id do imovel', 1],
  ['codigo do anuncio imobiliario', 1],
  ['codigo do anuncio', 0.8],
  ['codigo', 0.5]
]);

function normalizeLabel(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR').replace(/[.:]/g, ' ').replace(/\s+/g, ' ').trim();
}

function validValue(value: string | undefined, confidence: number, externalId?: string): string | undefined {
  const candidate = value?.trim();
  if (!candidate || candidate.length > 40 || /^https?:\/\//i.test(candidate)) return undefined;
  if (!/^[A-Za-z0-9][A-Za-z0-9./_-]*$/u.test(candidate)) return undefined;
  if (/^\d{5}-?\d{3}$/.test(candidate) || (/^[\d\s().+-]+$/.test(candidate) && candidate.replace(/\D/g, '').length >= 10)) return undefined;
  if (/^\d{1,3}\s*m[²2]$/i.test(candidate) || /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(candidate)) return undefined;
  if (confidence < 1 && /^\d+$/.test(candidate)) return undefined;
  if (externalId && candidate === externalId) return undefined;
  return candidate;
}

function result(value: string | undefined, source: ReferenceExtraction['source'], confidence: number, externalId?: string): ReferenceExtraction {
  const valid = validValue(value, confidence, externalId);
  return valid ? { value: valid, source, confidence } : {};
}

function structuredReference(document: Document, externalId?: string): ReferenceExtraction {
  for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const parsed = JSON.parse(script.textContent ?? '') as unknown;
      const records = Array.isArray(parsed) ? parsed : [parsed];
      for (const record of records) {
        if (!record || typeof record !== 'object') continue;
        const data = record as Record<string, unknown>;
        for (const key of ['reference', 'propertyReference', 'propertyCode', 'realEstateReference']) {
          const extraction = result(typeof data[key] === 'string' ? data[key] : undefined, 'structured_data', 1, externalId);
          if (extraction.value) return extraction;
        }
      }
    } catch {
      continue;
    }
  }
  return {};
}

function labelValue(document: Document, externalId?: string): ReferenceExtraction {
  const elements = [...document.querySelectorAll('body *')];
  for (const element of elements) {
    if (element.children.length > 0) continue;
    if (element.closest('#texto-descricao, .description, [data-description]')) continue;
    const normalizedText = normalizeLabel(element.textContent?.trim() ?? '');
    const inlineLabel = [...LABELS.entries()]
      .sort(([left], [right]) => right.length - left.length)
      .find(([label]) => normalizedText.startsWith(`${label} `));
    if (inlineLabel) {
      const rawText = element.textContent?.trim() ?? '';
      const inlineValue = rawText.match(/:\s*(\S+)\s*$/)?.[1] ?? rawText.split(/\s+/).at(-1);
      const inlineExtraction = result(inlineValue, 'label_value', inlineLabel[1], externalId);
      if (inlineExtraction.value) return inlineExtraction;
    }

    const label = normalizedText;
    const confidence = LABELS.get(label);
    if (!confidence) continue;

    const siblingValues = [element.nextElementSibling, element.previousElementSibling]
      .map((sibling) => sibling?.textContent?.trim())
      .concat([...element.parentElement?.querySelectorAll('input') ?? []].map((input) => input.value));
    for (const value of siblingValues) {
      const extraction = result(value, 'label_value', confidence, externalId);
      if (extraction.value) return extraction;
    }

    const inline = (element.parentElement?.textContent ?? '').replace(element.textContent?.trim() ?? '', '').replace(/^\s*[:-]\s*/, '').trim();
    const extraction = result(inline, 'label_value', confidence, externalId);
    if (extraction.value) return extraction;
  }
  return {};
}

function metadataOrData(document: Document, externalId?: string): ReferenceExtraction {
  const meta = document.querySelector('meta[name="reference"], meta[name="property-reference"], meta[name="property-code"]')?.getAttribute('content');
  const metaResult = result(meta ?? undefined, 'metadata', 1, externalId);
  if (metaResult.value) return metaResult;

  const data = document.querySelector('[data-reference], [data-property-reference], [data-property-code]');
  const dataValue = data?.getAttribute('data-reference') ?? data?.getAttribute('data-property-reference') ?? data?.getAttribute('data-property-code');
  return result(dataValue ?? undefined, 'data_attribute', 1, externalId);
}

function descriptionReference(document: Document, externalId?: string): ReferenceExtraction {
  const text = [...document.querySelectorAll('#texto-descricao, .description, [data-description], meta[name="description"]')]
    .map((element) => element.getAttribute('content') ?? element.textContent ?? '').join('\n');
  const match = text.match(/(?:refer[eê]ncia(?:\s+do\s+im[oó]vel)?|c[oó]digo\s+do\s+an[uú]ncio(?:\s+imobili[aá]rio)?|c[oó]digo\s+do\s+im[oó]vel)\s*:\s*([A-Za-z0-9][A-Za-z0-9./_-]*)/i);
  return result(match?.[1], 'description', 0.9, externalId);
}

export function extractReference(document: Document, externalId?: string): ReferenceExtraction {
  return structuredReference(document, externalId).value
    ? structuredReference(document, externalId)
    : metadataOrData(document, externalId).value
      ? metadataOrData(document, externalId)
      : labelValue(document, externalId).value
        ? labelValue(document, externalId)
        : descriptionReference(document, externalId);
}