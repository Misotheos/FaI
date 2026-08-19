import { describe, expect, it } from 'vitest';
import { getAppName } from '../../src/main';

describe('smoke', () => {
  it('exposes the extension name', () => {
    expect(getAppName()).toBe('Assistente de Captação Fátima');
  });
});
