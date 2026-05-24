export const SELECT_ALL_VALUE = '__all__';
export const SELECT_NONE_VALUE = '__none__';

export function optionalFilterValue(value: string): string | undefined {
  return value === SELECT_ALL_VALUE ? undefined : value;
}

export function nullableSelectValue(value?: string | null): string {
  return value ?? SELECT_NONE_VALUE;
}

export function nullableSelectResult(value: string): string | null {
  return value === SELECT_NONE_VALUE ? null : value;
}
