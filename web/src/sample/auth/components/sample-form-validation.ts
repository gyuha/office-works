export function focusFirstInvalidSampleField<TFieldName extends string>(
  fieldNames: readonly TFieldName[],
  errors: Partial<Record<TFieldName, unknown>>,
  setFocus: (fieldName: TFieldName) => void
) {
  for (const fieldName of fieldNames) {
    if (errors[fieldName]) {
      setFocus(fieldName);
      return;
    }
  }
}
