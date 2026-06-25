/** Build a case-insensitive RegExp that matches literal text (escapes `[]`, `.`, etc.). */
export function toLiteralRegExp(text: string, flags = 'i'): RegExp {
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(escaped, flags);
}
