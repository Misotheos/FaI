# Assistente de Captação Fátima

Extensão inicial para capturar imóveis e preparar o preenchimento em portais.

## Objetivo

O projeto visa capturar anúncios, normalizar os dados em um modelo central e permitir revisão antes do preenchimento em integrações como o Univen.

## Arquitetura inicial

- domínio independente do Univen
- normalização e validação do imóvel
- integração específica por portal
- armazenamento local via `chrome.storage.local`
- UI mínima com conteúdo e ações simples

## Como instalar

1. Instale as dependências com `npm install`.
2. Execute `npm run build`.
3. Carregue a pasta `dist` como extensão no Chrome.

## Como testar

- `npm run test`
- `npm run typecheck`
- `npm run build`

## Limitações

Esta é a primeira versão do MVP e ainda não implementa automação de login, IA, banco remoto ou preenchimento automático final.
