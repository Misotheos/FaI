import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import {
  emitFieldEvents,
  getField,
  setFieldValue,
  setMoneyValue,
  setNumberValue,
  setSelectValue
} from '../../src/integrations/univen/univen.dom';

describe('Univen DOM helpers', () => {
  it('fills inputs, selects and triggers the appropriate events', () => {
    const dom = new JSDOM(`
      <html>
        <body>
          <input id="field-text" type="text" />
          <textarea id="field-textarea"></textarea>
          <input id="field-number" type="number" />
          <input id="field-money" type="text" />
          <select id="field-select">
            <option value="">Selecione</option>
            <option value="ap">Apartamento</option>
            <option value="casa">Casa</option>
          </select>
        </body>
      </html>
    `);

    const { document } = dom.window;
    globalThis.document = document as unknown as Document;
    globalThis.window = dom.window as unknown as Window & typeof globalThis;

    const text = getField('#field-text');
    setFieldValue(text, 'Rua Teste');
    expect((text as HTMLInputElement).value).toBe('Rua Teste');

    const textarea = getField('#field-textarea');
    setFieldValue(textarea, 'Descrição do imóvel');
    expect((textarea as HTMLTextAreaElement).value).toBe('Descrição do imóvel');

    const numberInput = getField('#field-number');
    setNumberValue('#field-number', 75);
    expect((numberInput as HTMLInputElement).value).toBe('75');

    const moneyInput = getField('#field-money');
    setMoneyValue('#field-money', 1250000);
    expect((moneyInput as HTMLInputElement).value).toBe('1250000');

    const select = getField('#field-select');
    setSelectValue('#field-select', 'casa');
    expect((select as HTMLSelectElement).value).toBe('casa');

    const events = ['input', 'change', 'blur'];
    const fired: string[] = [];
    for (const eventName of events) {
      (select as HTMLSelectElement).addEventListener(eventName, () => {
        fired.push(eventName);
      });
    }

    emitFieldEvents(select as HTMLElement);
    expect(fired).toEqual(expect.arrayContaining(['input', 'change', 'blur']));
  });
});
