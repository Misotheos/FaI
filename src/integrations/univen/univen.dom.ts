type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export function getField(selector: string): FieldElement | null {
  const element = document.querySelector(selector) as FieldElement | null;
  return element ?? null;
}

export function emitFieldEvents(element: HTMLElement): void {
  const events = ['input', 'change', 'blur'];
  const eventFactory = element.ownerDocument.defaultView?.Event ?? Event;

  for (const eventName of events) {
    element.dispatchEvent(new eventFactory(eventName, { bubbles: true }));
  }
}

export function setFieldValue(field: FieldElement | null, value: string): void {
  if (!field) {
    return;
  }

  field.value = value;
  emitFieldEvents(field);
}

export function setNumberValue(selector: string, value: number): void {
  const field = getField(selector) as HTMLInputElement | null;
  if (!field) {
    return;
  }

  field.value = String(value);
  emitFieldEvents(field);
}

export function setMoneyValue(selector: string, value: number): void {
  const field = getField(selector) as HTMLInputElement | null;
  if (!field) {
    return;
  }

  field.value = String(value);
  emitFieldEvents(field);
}

export function setSelectValue(selector: string, value: string): void {
  const field = getField(selector) as HTMLSelectElement | null;
  if (!field) {
    return;
  }

  field.value = value;
  emitFieldEvents(field);
}
