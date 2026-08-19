import type { Property } from '../../domain/property/property.types';
import { univenFields } from './univen.fields';
import { getField, setFieldValue, setNumberValue, setSelectValue } from './univen.dom';

export function fillPropertyIntoUniven(property: Property): boolean {
  const fields = [
    { selector: univenFields.reference, value: property.reference ?? '' },
    { selector: univenFields.salePrice, value: property.price?.sale ? String(property.price.sale) : '' },
    { selector: univenFields.street, value: property.location?.street ?? '' },
    { selector: univenFields.neighborhood, value: property.location?.neighborhood ?? '' },
    { selector: univenFields.city, value: property.location?.city ?? '' },
    { selector: univenFields.state, value: property.location?.state ?? '' },
    { selector: univenFields.bedrooms, value: property.details?.bedrooms ? String(property.details.bedrooms) : '' },
    { selector: univenFields.suites, value: property.details?.suites ? String(property.details.suites) : '' },
    { selector: univenFields.bathrooms, value: property.details?.bathrooms ? String(property.details.bathrooms) : '' },
    { selector: univenFields.parkingSpaces, value: property.details?.parkingSpaces ? String(property.details.parkingSpaces) : '' },
    { selector: univenFields.advertisementDescription, value: property.advertisement?.description ?? '' }
  ];

  for (const field of fields) {
    const element = getField(field.selector);
    if (!element) {
      continue;
    }

    const elementName = element.tagName.toLowerCase();

    if (elementName === 'select') {
      setSelectValue(field.selector, field.value);
      continue;
    }

    if (field.selector === univenFields.salePrice || field.selector === univenFields.bedrooms || field.selector === univenFields.suites || field.selector === univenFields.bathrooms || field.selector === univenFields.parkingSpaces) {
      setNumberValue(field.selector, Number(field.value || 0));
      continue;
    }

    setFieldValue(element, field.value);
  }

  return true;
}
