const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

export function getLocalProductImage(value: string | null) {
  if (
    !value?.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    CONTROL_CHARACTER_PATTERN.test(value)
  ) {
    return null;
  }

  return value;
}
