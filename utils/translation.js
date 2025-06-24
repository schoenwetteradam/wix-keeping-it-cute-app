export function toPlainString(value) {
  if (value && typeof value === 'object') {
    if (typeof value.value === 'string') return value.value;
    if (typeof value.text === 'string') return value.text;
    if (typeof value.formatted === 'string') return value.formatted;
    // fall back to first string property if any
    const prop = Object.values(value).find(v => typeof v === 'string');
    if (prop) return prop;
    return '';
  }
  return value == null ? '' : value;
}
