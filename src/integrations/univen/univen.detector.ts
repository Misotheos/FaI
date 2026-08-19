export function isUnivenPage(): boolean {
  const hostname = globalThis.location?.hostname ?? '';
  return hostname === 'univenweb.com.br' || hostname.endsWith('.univenweb.com.br');
}

export function isUnivenImovelCadastroPage(): boolean {
  const href = globalThis.location?.href ?? '';
  return isUnivenPage() && href.includes('cadastro-imovel');
}
