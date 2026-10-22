/** Fills one `{key}` of a copy template. A function replacer keeps `$&`-style sequences in a user's name literal. */
export function fill(template: string, key: string, value: string | number): string {
  return template.replace(`{${key}}`, () => String(value));
}
