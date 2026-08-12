const DEV_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export function toDevanagari(n: number): string {
  return String(Math.round(n))
    .split('')
    .map(ch => (ch >= '0' && ch <= '9' ? DEV_DIGITS[Number(ch)] : ch))
    .join('');
}
