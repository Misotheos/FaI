import type { Property } from '../domain/property/property.types';
import type { CaptureRecord, CaptureStatus } from '../domain/capture/capture.types';
import type { ReverseGeocoder } from '../application/location/reverse-geocoder';
import { processKeptCapture } from '../application/capture/process-kept-capture';
import { isValidLocationValue } from '../domain/location/location.validation';
import { deleteCaptures, getCaptures, updateCaptureStatus } from '../storage/capture-tray-storage';
import { deleteProperties, getPropertyStorageId } from '../storage/property-storage';

const STORAGE_KEY = 'fatima_properties';
const selectedCaptureIds = new Set<string>();
const selectedProcessedIds = new Set<string>();
const unavailableReverseGeocoder: ReverseGeocoder = {
  reverse: async () => ({
    warnings: ['Geocodificação reversa ainda não configurada.']
  })
};

export async function initPopup(): Promise<Property[]> {
  if (typeof document === 'undefined') {
    return [];
  }

  const properties = await loadSavedProperties();
  await loadCaptureTray();
  return properties;
}

export async function loadCaptureTray(status?: CaptureStatus): Promise<CaptureRecord[]> {
  const captures = await getCaptures(status);
  renderCaptureTray(captures, status);
  return captures;
}

export function renderCaptureTray(captures: CaptureRecord[], status?: CaptureStatus): void {
  const target = document.getElementById('capture-items');
  if (!target) {
    return;
  }

  target.replaceChildren();
  const visibleIds = new Set(captures.map((capture) => capture.id));
  selectedCaptureIds.forEach((id) => {
    if (!visibleIds.has(id)) {
      selectedCaptureIds.delete(id);
    }
  });

  if (captures.length === 0) {
    target.textContent = 'Nenhuma captura nesta categoria.';
    return;
  }

  captures.forEach((capture) => {
    const item = document.createElement('div');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedCaptureIds.has(capture.id);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedCaptureIds.add(capture.id);
      } else {
        selectedCaptureIds.delete(capture.id);
      }
      void updateCaptureStatus(capture.id, checkbox.checked ? 'selected' : 'new');
    });

    const label = document.createElement('strong');
    const externalId = capture.property.source?.externalId;
    label.textContent = capture.property.reference ?? (externalId ? `Anúncio #${externalId}` : '');
    const details = document.createElement('span');
    const location = capture.property.location;
    details.textContent = [
      capture.property.price?.sale ? `R$ ${capture.property.price.sale.toLocaleString('pt-BR')}` : undefined,
      isValidLocationValue(location?.neighborhood) ? location.neighborhood : undefined,
      [
        isValidLocationValue(location?.city) ? location.city : undefined,
        isValidLocationValue(location?.state) ? location.state : undefined
      ].filter(Boolean).join(', ') || undefined,
      location?.cep
    ].filter(Boolean).join(' | ');

    const original = document.createElement('a');
    original.href = capture.source.url;
    original.target = '_blank';
    original.rel = 'noreferrer';
    original.textContent = 'Anúncio original';

    item.append(checkbox);
    if (label.textContent) item.append(label);
    if (details.textContent) item.append(document.createElement('br'), details);
    item.append(document.createElement('br'), original);

    if (capture.status === 'discarded') {
      const undo = document.createElement('button');
      undo.type = 'button';
      undo.textContent = 'Desfazer descarte';
      undo.addEventListener('click', () => {
        void updateCaptureStatus(capture.id, 'new').then(() => loadCaptureTray(status));
      });
      item.append(document.createElement('br'), undo);
    }

    target.appendChild(item);
    target.appendChild(document.createElement('hr'));
  });
}

export async function updateSelectedCaptures(status: 'kept' | 'discarded'): Promise<void> {
  const ids = [...selectedCaptureIds];
  if (status === 'kept') {
    for (const id of ids) {
      const keptCapture = await updateCaptureStatus(id, 'kept');
      if (keptCapture) {
        await processKeptCapture(keptCapture, unavailableReverseGeocoder);
      }
    }
  } else {
    await Promise.all(ids.map((id) => updateCaptureStatus(id, status)));
  }
  selectedCaptureIds.clear();
  await loadCaptureTray(getCaptureFilter());
}

export async function deleteSelectedCaptures(): Promise<void> {
  await deleteCaptures([...selectedCaptureIds]);
  selectedCaptureIds.clear();
  await loadCaptureTray(getCaptureFilter());
}

function getCaptureFilter(): CaptureStatus | undefined {
  const filter = document.getElementById('capture-filter') as HTMLSelectElement | null;
  return filter?.value && filter.value !== 'all' ? filter.value as CaptureStatus : undefined;
}

export async function loadSavedProperties(): Promise<Property[]> {
  const storage = globalThis.chrome?.storage?.local;
  if (!storage) {
    renderSavedProperties([]);
    return [];
  }

  const items = await new Promise<Record<string, unknown>>((resolve) => {
    storage.get(STORAGE_KEY, (result) => {
      resolve((result?.[STORAGE_KEY] as Record<string, unknown>) ?? {});
    });
  });

  const properties = Object.values(items).filter((value): value is Property => !!value && typeof value === 'object');
  renderSavedProperties(properties);
  return properties;
}

export async function requestFillProperty(property: Property): Promise<boolean> {
  try {
    const tabs = globalThis.chrome?.tabs;
    if (!tabs) {
      return false;
    }

    const activeTabs = await new Promise<chrome.tabs.Tab[]>((resolve, reject) => {
      try {
        tabs.query({ active: true, currentWindow: true }, (result) => resolve(result));
      } catch (error) {
        reject(error);
      }
    });
    const tabId = activeTabs[0]?.id;
    if (tabId === undefined) {
      return false;
    }

    return await new Promise<boolean>((resolve, reject) => {
      try {
        tabs.sendMessage(tabId, { type: 'fill-property', property }, (response) => resolve(response?.ok === true));
      } catch (error) {
        reject(error);
      }
    });
  } catch (error) {
    console.warn('Não foi possível enviar o imóvel para a aba ativa.', error);
    return false;
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void initPopup();
    });
  } else {
    void initPopup();
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('capture-select-all')?.addEventListener('click', async () => {
      const captures = await getCaptures(getCaptureFilter());
      captures.forEach((capture) => selectedCaptureIds.add(capture.id));
      await Promise.all(captures.map((capture) => updateCaptureStatus(capture.id, 'selected')));
      renderCaptureTray(captures, getCaptureFilter());
    });
    document.getElementById('capture-clear-selection')?.addEventListener('click', async () => {
      await Promise.all([...selectedCaptureIds].map((id) => updateCaptureStatus(id, 'new')));
      selectedCaptureIds.clear();
      void loadCaptureTray(getCaptureFilter());
    });
    document.getElementById('capture-keep-selected')?.addEventListener('click', () => {
      void updateSelectedCaptures('kept');
    });
    document.getElementById('capture-discard-selected')?.addEventListener('click', () => {
      void updateSelectedCaptures('discarded');
    });
    document.getElementById('capture-delete-selected')?.addEventListener('click', () => {
      void deleteSelectedCaptures();
    });
    document.getElementById('capture-filter')?.addEventListener('change', () => {
      void loadCaptureTray(getCaptureFilter());
    });
  });
}

export function renderSavedProperties(properties: Property[]): void {
  const target = document.getElementById('saved-items');
  if (!target) {
    return;
  }

  if (properties.length === 0) {
    target.innerHTML = '<p>Nenhum imóvel salvo.</p>';
    const deleteButton = document.getElementById('processed-delete-selected') as HTMLButtonElement | null;
    if (deleteButton) deleteButton.disabled = true;
    return;
  }

  target.replaceChildren();

  for (const id of ['processed-select-all', 'processed-clear-selection', 'processed-delete-selected']) {
    const control = document.getElementById(id);
    control?.replaceWith(control.cloneNode(true));
  }

  const deleteButton = document.getElementById('processed-delete-selected') as HTMLButtonElement | null;
  if (deleteButton) deleteButton.disabled = selectedProcessedIds.size === 0;
  document.getElementById('processed-select-all')?.addEventListener('click', () => {
    properties.forEach((property) => selectedProcessedIds.add(getPropertyStorageId(property)));
    renderSavedProperties(properties);
  });
  document.getElementById('processed-clear-selection')?.addEventListener('click', () => {
    selectedProcessedIds.clear();
    renderSavedProperties(properties);
  });
  document.getElementById('processed-delete-selected')?.addEventListener('click', async () => {
    if (selectedProcessedIds.size === 0 || !globalThis.confirm?.('Excluir os imóveis processados selecionados?')) {
      return;
    }
    await deleteProperties([...selectedProcessedIds]);
    selectedProcessedIds.clear();
    await loadSavedProperties();
  });

  properties.forEach((property, index) => {
    const propertyId = getPropertyStorageId(property);
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedProcessedIds.has(propertyId);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedProcessedIds.add(propertyId);
      } else {
        selectedProcessedIds.delete(propertyId);
      }
      if (deleteButton) deleteButton.disabled = selectedProcessedIds.size === 0;
    });
    const reference = property.reference ?? (property.source.externalId ? `Anúncio #${property.source.externalId}` : undefined);
    const street = property.location?.street;
    const neighborhood = property.location?.neighborhood;
    const cityState = [
      isValidLocationValue(property.location?.city) ? property.location.city : undefined,
      isValidLocationValue(property.location?.state) ? property.location.state : undefined
    ].filter(Boolean).join(', ');
    const cep = property.location?.cep;
    const price = property.price?.sale ? `R$ ${property.price.sale.toLocaleString('pt-BR')}` : undefined;

    const item = document.createElement('div');
    const referenceElement = document.createElement('strong');
    referenceElement.textContent = reference ?? '';
    const streetElement = document.createElement('span');
    streetElement.textContent = street ?? '';
    const locationElement = document.createElement('span');
    locationElement.textContent = [
      isValidLocationValue(neighborhood) ? neighborhood : undefined,
      isValidLocationValue(cityState) ? cityState : undefined,
      cep
    ].filter(Boolean).join(' | ');
    const priceElement = document.createElement('small');
    priceElement.textContent = price ?? '';
    const fillButton = document.createElement('button');
    fillButton.type = 'button';
    fillButton.textContent = 'Preencher';
    fillButton.addEventListener('click', () => {
      void requestFillProperty(property);
    });

    item.append(checkbox);
    if (reference) item.append(referenceElement);
    if (street) item.append(document.createElement('br'), streetElement);
    if (locationElement.textContent) {
      item.append(document.createElement('br'), locationElement);
    }
    if (price) item.append(document.createElement('br'), priceElement);
    item.append(document.createElement('br'), fillButton);
    target.appendChild(item);

    if (index < properties.length - 1) {
      target.appendChild(document.createElement('hr'));
    }
  });
}
