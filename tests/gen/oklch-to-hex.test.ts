import { describe, it, expect } from 'vitest';
import { oklchToHex } from '../../scripts/lib/oklch-to-hex.mts';

describe('oklchToHex', () => {
  it('converts an oklch() string to its exact sRGB hex', () => {
    // The Ottosson matrix maps oklch(39% 0.11 155) -> #005529, which differs from
    // the #00693E annotation in tokens.css; the two values do not round-trip.
    // Whether to change tokens.css is a separate, out-of-scope design decision.
    expect(oklchToHex('oklch(39% 0.11 155)').toLowerCase()).toBe('#005529');
  });

  it('clamps out-of-gamut values to a valid in-gamut #rrggbb', () => {
    // oklch(50% 0.37 30) is far outside sRGB; channels clamp before gamma encoding.
    expect(oklchToHex('oklch(50% 0.37 30)').toLowerCase()).toBe('#f40000');
  });

  it('parses percent and unitless lightness equivalently', () => {
    expect(oklchToHex('oklch(0.39 0.11 155)').toLowerCase()).toBe(
      oklchToHex('oklch(39% 0.11 155)').toLowerCase()
    );
  });

  it('throws on non-oklch input', () => {
    expect(() => oklchToHex('rgb(0, 85, 41)')).toThrow();
  });
});
