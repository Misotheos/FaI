import type { Property } from './domain/property/property.types';
import { fillPropertyIntoUniven } from './integrations/univen/univen.adapter';
import { isUnivenImovelCadastroPage, isUnivenPage } from './integrations/univen/univen.detector';
import { parsePropertyFromDocument } from './parsers/generic.parser';
import { saveCapture } from './storage/capture-tray-storage';
import { getProperties } from './storage/property-storage';

const FILL_BUTTON_ID = 'fatia-univen-fill-button';
const CAPTURE_BUTTON_ID = 'fatima-generic-capture-button';

function isFillPropertyMessage(message: unknown): message is { type: 'fill-property'; property: Property } {
  return !!message
    && typeof message === 'object'
    && (message as { type?: unknown }).type === 'fill-property'
    && !!(message as { property?: unknown }).property;
}

export function ensureUnivenFillButton(): boolean {
  if (!globalThis.document || !isUnivenImovelCadastroPage()) {
    return false;
  }

  if (document.getElementById(FILL_BUTTON_ID)) {
    return false;
  }

  const button = document.createElement('button');
  button.id = FILL_BUTTON_ID;
  button.type = 'button';
  button.textContent = 'Preencher último imóvel';
  button.style.position = 'fixed';
  button.style.right = '16px';
  button.style.bottom = '16px';
  button.style.zIndex = '2147483647';
  button.style.padding = '10px 16px';
  button.style.borderRadius = '8px';
  button.style.background = '#1e40af';
  button.style.color = '#fff';
  button.style.border = 'none';
  button.style.cursor = 'pointer';
  button.style.boxShadow = '0 8px 18px rgba(15, 23, 42, 0.25)';

  button.addEventListener('click', async () => {
    try {
      const properties = await getProperties();
      const property = properties.at(-1);
      if (property) {
        fillPropertyIntoUniven(property);
      }
    } catch (error) {
      console.warn('Não foi possível carregar o imóvel salvo.', error);
    }
  });

  document.body?.appendChild(button);
  return true;
}

export function ensureGenericCaptureButton(): boolean {
  if (!globalThis.document || isUnivenPage()) {
    return false;
  }

  if (document.getElementById(CAPTURE_BUTTON_ID)) {
    return false;
  }

  const button = document.createElement('button');
  button.id = CAPTURE_BUTTON_ID;
  button.type = 'button';
  button.textContent = 'Capturar imóvel';
  button.style.position = 'fixed';
  button.style.right = '16px';
  button.style.bottom = '16px';
  button.style.zIndex = '2147483647';
  button.style.padding = '10px 16px';
  button.style.borderRadius = '8px';
  button.style.background = '#166534';
  button.style.color = '#fff';
  button.style.border = 'none';
  button.style.cursor = 'pointer';
  button.style.boxShadow = '0 8px 18px rgba(15, 23, 42, 0.25)';

  button.addEventListener('click', () => {
    const property = parsePropertyFromDocument(document, globalThis.location?.href ?? '');
    void saveCapture(property).catch((error: unknown) => {
      console.warn('Não foi possível salvar o imóvel capturado.', error);
    });
  });

  document.body?.appendChild(button);
  return true;
}

function registerUnivenMessageListener(): void {
  const onMessage = globalThis.chrome?.runtime?.onMessage;
  if (!onMessage) {
    return;
  }

  onMessage.addListener((message, _sender, sendResponse) => {
    if (!isFillPropertyMessage(message) || !isUnivenImovelCadastroPage()) {
      return;
    }

    fillPropertyIntoUniven(message.property);
    sendResponse({ ok: true });
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureUnivenFillButton, { once: true });
    document.addEventListener('DOMContentLoaded', ensureGenericCaptureButton, { once: true });
  } else {
    ensureUnivenFillButton();
    ensureGenericCaptureButton();
  }
}

registerUnivenMessageListener();

console.info('Content script initialized');
