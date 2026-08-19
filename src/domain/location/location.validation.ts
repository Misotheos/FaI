const INVALID_LOCATION_VALUES = new Set([
  'menu',
  'localização',
  'exibir no mapa',
  'compartilhar',
  'favoritar',
  'voltar',
  'próximo',
  'anterior',
  'simular',
  'consórcio',
  'consorcio',
  'entrar'
]);

export function isValidLocationValue(value: string | undefined): value is string {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLocaleLowerCase('pt-BR');
  return normalized.length > 0
    && !INVALID_LOCATION_VALUES.has(normalized)
    && !/(^|[\s,|])menu($|[\s,|])/i.test(normalized)
    && !/simular|consórcio|consorcio|exibir no mapa/i.test(normalized);
}