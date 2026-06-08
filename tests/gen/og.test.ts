import { describe, it, expect } from 'vitest';
import { renderOgSvg } from '../../scripts/gen-og.mts';
import sharp from 'sharp';

describe('gen-og', () => {
  it('renders an SVG that includes the school name and a hex fill', () => {
    const svg = renderOgSvg({ name: 'Free Stuff @ Dartmouth', accentHex: '#00693e' });
    expect(svg).toContain('Free Stuff @ Dartmouth');
    expect(svg).toContain('#00693e');
    expect(svg).toContain('width="1200"');
    expect(svg).toContain('height="630"');
  });

  it('sharp rasterises the SVG to a 1200x630 PNG', async () => {
    const svg = renderOgSvg({ name: 'Free Stuff @ Dartmouth', accentHex: '#00693e' });
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    const meta = await sharp(png).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
  });
});
