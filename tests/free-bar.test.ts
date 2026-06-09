import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const resources = JSON.parse(
  readFileSync(join(__dirname, '../src/content/resources.json'), 'utf-8')
) as any[];

// The "free" bar (see docs/quality-guidelines.md): a listing earns a spot only
// if a student can get the core benefit WITHOUT paying money. Disclosing a paid
// *upgrade* is fine; charging to obtain the benefit is not. These patterns catch
// the unambiguous "pay-to-get-it" / "this is a discount" cases — the exact class
// that put a $20/year club and a discounted Zipcar rate in a free catalog.
const PAY_TO_OBTAIN: { rx: RegExp; why: string }[] = [
  { rx: /(membership|subscription|dues|to join|enroll)\b[^.]{0,50}\$\s?\d/i, why: 'paid membership/subscription to obtain it' },
  { rx: /\$\s?\d[\d.,]*\s*\/\s*(year|yr|month|mo)\b[^.]{0,50}(membership|subscription|dues|to join)/i, why: 'recurring fee to obtain it' },
  { rx: /\bdiscounted\s+\$\s?\d/i, why: 'a discounted price (a discount is not free)' },
  { rx: /\bdiscount,\s*not free\b/i, why: 'self-described as a discount, not free' },
];

const blob = (r: any) =>
  [r.name, r.description, r.notes, ...(Array.isArray(r.eligibility) ? r.eligibility : [])]
    .filter(Boolean)
    .join('  ');

describe('every listing clears the free bar', () => {
  it('no entry requires payment to obtain the benefit', () => {
    const violations: string[] = [];
    for (const r of resources) {
      const text = blob(r);
      for (const { rx, why } of PAY_TO_OBTAIN) {
        const m = text.match(rx);
        if (m) violations.push(`${r.id}: ${why} — "${m[0].trim()}"`);
      }
    }
    expect(violations, `not-free entries:\n  ${violations.join('\n  ')}`).toEqual([]);
  });

  it('annual_value never claims 0 while the text states a required price', () => {
    // The Explorers-Club bug: annual_value: 0 next to a "$20/year membership".
    const lies: string[] = [];
    for (const r of resources) {
      if (r.annual_value !== 0) continue;
      if (/(membership|subscription|dues)\b[^.]{0,50}\$\s?\d/i.test(blob(r)))
        lies.push(`${r.id}: annual_value 0 but text names a paid membership`);
    }
    expect(lies, lies.join('\n')).toEqual([]);
  });
});

// The free bar applies to MARKETING PROSE too, not just catalog entries. Removing
// a not-free entry once left scenario copy still promoting it as "free or cheap" —
// a trust violation the JSON-only scan never saw. Scan the rendered page/config
// copy for phrases that conflate "free" with "actually costs money".
function astroFiles(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...astroFiles(p));
    else if (e.name.endsWith('.astro')) out.push(p);
  }
  return out;
}

const PROSE_FILES = [
  ...astroFiles(join(__dirname, '../src/pages')),
  join(__dirname, '../src/site.config.ts'),
];

// Unambiguous "free but not really" tells. Plain "discount"/"$" are allowed in
// prose (a page may honestly describe a paid upgrade), so they are NOT gated here.
const BAD_PROSE = [/free or cheap/i, /free or discounted/i, /free-ish/i, /free\(ish\)/i];

describe('no copy conflates free with cheap/discounted', () => {
  it('no scenario/page/config prose says "free or cheap" and similar', () => {
    const hits: string[] = [];
    for (const f of PROSE_FILES) {
      const text = readFileSync(f, 'utf-8');
      for (const rx of BAD_PROSE) {
        const m = text.match(rx);
        if (m) hits.push(`${relative(join(__dirname, '..'), f)}: "${m[0]}"`);
      }
    }
    expect(hits, `trust-violating prose:\n  ${hits.join('\n  ')}`).toEqual([]);
  });

  it('no catalog entry text says "free or cheap" and similar', () => {
    const hits: string[] = [];
    for (const r of resources) {
      const text = blob(r);
      for (const rx of BAD_PROSE) {
        const m = text.match(rx);
        if (m) hits.push(`${r.id}: "${m[0]}"`);
      }
    }
    expect(hits, `trust-violating entry copy:\n  ${hits.join('\n  ')}`).toEqual([]);
  });
});
