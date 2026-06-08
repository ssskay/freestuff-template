/**
 * Convert a CSS `oklch(L C H)` string to an sRGB `#rrggbb` hex.
 * L accepts `39%` or `0.39`; C is unitless; H is degrees.
 * Pure, dependency-free — implements the OKLab→linear-sRGB matrix (Björn Ottosson).
 */
export function oklchToHex(input: string): string {
  const m = input.trim().match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*\)$/i);
  if (!m) throw new Error(`Not an oklch() string: ${input}`);
  const L = m[1].endsWith('%') ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
  const C = parseFloat(m[2]);
  const Hdeg = parseFloat(m[3]);
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  // OKLab -> LMS (cube of l'm's')
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3, mm = m_ ** 3, s = s_ ** 3;

  // LMS -> linear sRGB
  const lr = +4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s;

  const toGamma = (x: number): number => {
    const c = Math.max(0, Math.min(1, x));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  };
  const hx = (x: number): string =>
    Math.round(toGamma(x) * 255).toString(16).padStart(2, '0');
  return `#${hx(lr)}${hx(lg)}${hx(lb)}`;
}
