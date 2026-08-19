export interface FillResultWarning {
  field: string;
  message: string;
}

export interface FillResultError {
  field: string;
  message: string;
}

export interface FillResult {
  success: boolean;
  filled: string[];
  skipped: string[];
  warnings: FillResultWarning[];
  errors: FillResultError[];
}

export function createFillResult(input: Partial<FillResult> = {}): FillResult {
  const filled = input.filled ?? [];
  const skipped = input.skipped ?? [];
  const warnings = input.warnings ?? [];
  const errors = input.errors ?? [];

  return {
    success: errors.length === 0,
    filled,
    skipped,
    warnings,
    errors
  };
}

export function mergeFillResults(...results: FillResult[]): FillResult {
  const merged = results.reduce<FillResult>(
    (accumulator, current) => ({
      success: accumulator.success && current.success,
      filled: [...accumulator.filled, ...current.filled],
      skipped: [...accumulator.skipped, ...current.skipped],
      warnings: [...accumulator.warnings, ...current.warnings],
      errors: [...accumulator.errors, ...current.errors]
    }),
    createFillResult()
  );

  return {
    ...merged,
    success: merged.errors.length === 0
  };
}
