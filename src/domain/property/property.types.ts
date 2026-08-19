import type { PropertyLocation } from '../location/location.types';

export type PropertyPurpose = 'sale' | 'rent' | 'seasonal' | 'exchange';

export type PropertyNumberInput = number | string | undefined;

export interface PropertyInput {
  id?: string;

  source?: {
    url?: string;
    portal?: string;
    capturedAt?: string;
    externalId?: string;
  };

  reference?: string;

  purpose?: PropertyPurpose;

  type?: string;

  price?: {
    sale?: PropertyNumberInput;
    rent?: PropertyNumberInput;
    condominium?: PropertyNumberInput;
    iptu?: PropertyNumberInput;
  };

  location?: PropertyLocation & {
    complement?: string;
  };

  building?: {
    development?: string;
    buildingName?: string;
  };

  details?: {
    bedrooms?: PropertyNumberInput;
    suites?: PropertyNumberInput;
    bathrooms?: PropertyNumberInput;
    parkingSpaces?: PropertyNumberInput;
    usableArea?: PropertyNumberInput;
    totalArea?: PropertyNumberInput;
    privateArea?: PropertyNumberInput;
    builtArea?: PropertyNumberInput;
    landArea?: PropertyNumberInput;
  };

  advertisement?: {
    description?: string;
  };

  internal?: {
    description?: string;
  };

  owner?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

export interface Property {
  id?: string;

  source: {
    url: string;
    portal?: string;
    capturedAt: string;
    externalId?: string;
  };

  reference?: string;

  purpose?: PropertyPurpose;

  type?: string;

  price?: {
    sale?: number;
    rent?: number;
    condominium?: number;
    iptu?: number;
  };

  location?: PropertyLocation & {
    complement?: string;
  };

  building?: {
    development?: string;
    buildingName?: string;
  };

  details?: {
    bedrooms?: number;
    suites?: number;
    bathrooms?: number;
    parkingSpaces?: number;
    usableArea?: number;
    totalArea?: number;
    privateArea?: number;
    builtArea?: number;
    landArea?: number;
  };

  advertisement?: {
    description?: string;
  };

  internal?: {
    description?: string;
  };

  owner?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}
