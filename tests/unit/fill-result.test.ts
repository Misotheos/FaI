import { describe, expect, it } from 'vitest';
import { createFillResult, mergeFillResults } from '../../src/integrations/univen/fill-result';

describe('fill result', () => {
  it('creates a result summary with filled, skipped, warnings and errors', () => {
    const result = createFillResult({
      filled: ['reference', 'salePrice'],
      skipped: ['street'],
      warnings: [{ field: 'city', message: 'Campo sem informação' }],
      errors: [{ field: 'state', message: 'Campo ausente' }]
    });

    expect(result.success).toBe(false);
    expect(result.filled).toEqual(['reference', 'salePrice']);
    expect(result.skipped).toEqual(['street']);
    expect(result.warnings).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
  });

  it('merges two distinct fill results', () => {
    const resultA = createFillResult({ filled: ['reference'] });
    const resultB = createFillResult({ filled: ['salePrice'], warnings: [{ field: 'city', message: 'Aviso' }] });

    const combined = mergeFillResults(resultA, resultB);

    expect(combined.filled).toEqual(['reference', 'salePrice']);
    expect(combined.warnings).toHaveLength(1);
    expect(combined.success).toBe(true);
  });
});
