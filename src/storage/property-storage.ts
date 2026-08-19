import type { Property } from '../domain/property/property.types';

const STORAGE_KEY = 'fatima_properties';

function getChromeStorage(): typeof chrome.storage.local | undefined {
  return globalThis.chrome?.storage?.local;
}

export function getPropertyStorageId(property: Property): string {
  return property.source.url || property.reference || `property-${Date.now()}`;
}

export async function saveProperty(property: Property): Promise<Property> {
  const storage = getChromeStorage();

  if (!storage) {
    return property;
  }

  const current = await new Promise<Record<string, unknown>>((resolve) => {
    storage.get(STORAGE_KEY, (items) => {
      resolve((items?.[STORAGE_KEY] as Record<string, unknown>) ?? {});
    });
  });

  const id = getPropertyStorageId(property);
  const duplicateKey = Object.entries(current).find(([key, value]) => {
    if (key === id || !value || typeof value !== 'object') {
      return false;
    }

    const storedProperty = value as Partial<Property>;
    return storedProperty.source?.url === property.source?.url;
  })?.[0];
  const next = {
    ...current,
    [id]: property
  };

  if (duplicateKey) {
    delete next[duplicateKey];
  }

  await new Promise<void>((resolve) => {
    storage.set({ [STORAGE_KEY]: next }, () => resolve());
  });

  return property;
}

export async function deleteProperties(ids: string[]): Promise<void> {
  const storage = getChromeStorage();
  if (!storage) {
    return;
  }

  const current = await new Promise<Record<string, unknown>>((resolve) => {
    storage.get(STORAGE_KEY, (items) => {
      resolve((items?.[STORAGE_KEY] as Record<string, unknown>) ?? {});
    });
  });
  const next = { ...current };
  ids.forEach((id) => delete next[id]);

  await new Promise<void>((resolve) => {
    storage.set({ [STORAGE_KEY]: next }, () => resolve());
  });
}

export async function getProperties(): Promise<Property[]> {
  const storage = getChromeStorage();

  if (!storage) {
    return [];
  }

  const items = await new Promise<Record<string, unknown>>((resolve) => {
    storage.get(STORAGE_KEY, (result) => {
      resolve((result?.[STORAGE_KEY] as Record<string, unknown>) ?? {});
    });
  });

  return Object.values(items).filter((value): value is Property => !!value && typeof value === 'object');
}
