import { describe, it, expect } from 'vitest';
import { oklchToHex } from '../../scripts/lib/oklch-to-hex.mts';

describe('oklchToHex', () => {
  it('converts Dartmouth green oklch to its documented sRGB hex', () => {
    // CONCERN: tokens.css comments that oklch(39% 0.11 155) is the wide-gamut
    // form of #00693E, but that is incorrect. The standard Ottosson matrix
    // converts oklch(39% 0.11 155) → #005529. The real #00693E Dartmouth green
    // is oklch(45.8% 0.109 157.1). tokens.css needs to be corrected.
    // Expected updated from #00693e to #005529 to match the correct math.
    expect(oklchToHex('oklch(39% 0.11 155)').toLowerCase()).toBe('#005529');
  });

  it('clamps out-of-gamut values to valid #rrggbb', () => {
    const hex = oklchToHex('oklch(50% 0.37 30)'); // beyond sRGB
    expect(hex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('parses percent and unitless lightness equivalently', () => {
    expect(oklchToHex('oklch(0.39 0.11 155)').toLowerCase()).toBe(
      oklchToHex('oklch(39% 0.11 155)').toLowerCase()
    );
  });
});
