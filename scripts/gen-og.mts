/**
 * Generate public/og.png (1200x630) from SITE.name and the brand color in
 * public/tokens.css. On-demand only (`npm run og`); not part of the deploy build.
 * Run via tsx so it can import the TS config.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { SITE } from '../src/site.config.ts';
import { oklchToHex } from './lib/oklch-to-hex.mts';

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!)
  );
}

/** Read --color-accent from tokens.css and normalise to an sRGB hex. */
export function accentHexFromTokens(css: string): string {
  const m = css.match(/--color-accent:\s*([^;]+);/);
  if (!m) throw new Error('--color-accent not found in tokens.css');
  const val = m[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/!important/i, '').trim();
  return val.startsWith('oklch') ? oklchToHex(val) : val;
}

export function renderOgSvg(opts: { name: string; accentHex: string }): string {
  const name = escapeXml(opts.name);
  // Tagline: hardcoded to SITE.tagline value verbatim; switch to `SITE.tagline` in the multi-school phase (deferred at N=1 per the plan)
  const tagline = 'Your complete catalog of free perks';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${opts.accentHex}"/>
  <rect x="0" y="0" width="1200" height="12" fill="#ffffff" opacity="0.25"/>
  <!-- TODO(multi-school): long names overflow at font-size 84; add textLength/auto-scale when a school name is long -->
  <text x="80" y="330" font-family="Georgia, 'Times New Roman', serif" font-size="84" font-weight="700" fill="#ffffff">${name}</text>
  <text x="80" y="410" font-family="Georgia, 'Times New Roman', serif" font-size="36" fill="#ffffff" opacity="0.85">${tagline}</text>
</svg>`;
}

async function main(): Promise<void> {
  const tokensPath = fileURLToPath(new URL('../public/tokens.css', import.meta.url));
  const outPath = fileURLToPath(new URL('../public/og.png', import.meta.url));
  const accentHex = accentHexFromTokens(readFileSync(tokensPath, 'utf8'));
  const svg = renderOgSvg({ name: SITE.name, accentHex });
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`og — wrote ${outPath} (${SITE.name}, ${accentHex})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((err) => { console.error(err); process.exitCode = 1; });
