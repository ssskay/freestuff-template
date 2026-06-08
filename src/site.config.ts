/**
 * Single source of school-specific configuration.
 *
 * Everything that another school would need to change to fork this site lives
 * here: branding, the category taxonomy, eligibility options, the curated
 * homepage collections, and the scenario filters. Pages and the data layer read
 * from this module rather than hardcoding values inline.
 */

import type { Resource } from './lib/catalog';

/** School / site branding. The single place a fork edits to rebrand. */
export const SITE = {
  school: 'Dartmouth',
  name: 'Free Stuff @ Dartmouth',
  tagline: 'Your complete catalog of free perks',
  url: 'https://freestuff-dartmouth.vercel.app',
  /** Public repo — used for the "fork this" + "report an issue" links. */
  github: 'https://github.com/ssskay/freestuff-dartmouth-v2',
} as const;

/** Allowed resource categories. Mirrors the DB category constraint. */
export const CATEGORIES = [
  'software',
  'news',
  'library',
  'outdoor',
  'money',
  'health',
  'career',
  'campus-life',
  'alumni-only',
  'tuck',
  'transportation',
  'off-campus',
] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * Student-facing display labels for category slugs. Decouples the human label
 * from the storage slug so jargon ("tuck", "money") reads clearly without a
 * data migration. Falls back to a de-hyphenated slug for unknown values.
 */
export const CATEGORY_LABELS: Record<Category, string> = {
  software: 'Software & Apps',
  news: 'News & Media',
  library: 'Library & Research',
  outdoor: 'Outdoor & Adventure',
  money: 'Funding & Discounts',
  health: 'Health & Wellness',
  career: 'Career',
  'campus-life': 'Arts & Campus Life',
  'alumni-only': 'Alumni',
  tuck: 'Tuck (Business School)',
  transportation: 'Transportation',
  'off-campus': 'Around Town',
};

export function categoryLabel(slug: string): string {
  return (CATEGORY_LABELS as Record<string, string>)[slug] ?? slug.replace(/-/g, ' ');
}

/** Who a resource can be available to. */
export const ELIGIBILITY = ['student', 'faculty', 'staff', 'alumni', 'public'] as const;
export type Eligibility = (typeof ELIGIBILITY)[number];

/**
 * Issue types a user can report. Single source of truth shared by the client,
 * the data layer, and the DB CHECK constraint.
 */
export const ISSUE_TYPES = [
  'broken-link',
  'wrong-info',
  'outdated',
  'eligibility',
  'other',
] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

/** Predicate over a resource, used for collection and scenario membership. */
type ResourceMatcher = (r: Pick<Resource, 'id' | 'name' | 'category'>) => boolean;

const nameIncludes =
  (...names: string[]): ResourceMatcher =>
  (r) =>
    names.some((n) => r.name.includes(n));

const idIncludes =
  (...keywords: string[]): ResourceMatcher =>
  (r) =>
    keywords.some((kw) => r.id?.includes(kw));

const inCategory =
  (...cats: string[]): ResourceMatcher =>
  (r) =>
    cats.includes(r.category);

const anyOf =
  (...matchers: ResourceMatcher[]): ResourceMatcher =>
  (r) =>
    matchers.some((m) => m(r));

/**
 * Curated homepage collections. Membership is computed server-side over the
 * normalized catalog (where `id` is the stable slug), then serialized to the
 * client so filtering matches by membership rather than re-deriving by category.
 */
export const CURATED_COLLECTIONS: Array<{ key: string; label: string; match: ResourceMatcher }> = [
  {
    key: 'ai-tools',
    label: 'AI & Tech Tools',
    match: anyOf(
      nameIncludes('Claude for Education', 'GitHub', 'Slack', 'Atlassian'),
      idIncludes('claude', 'github', 'slack', 'atlassian')
    ),
  },
  {
    key: 'creative',
    label: 'For Creatives',
    match: anyOf(
      nameIncludes('Adobe', 'Canva', 'Sibelius', 'Woodworking', 'Ceramics', 'Music Practice'),
      (r) => r.category === 'campus-life' && (r.name.includes('Hop') || r.name.includes('Art'))
    ),
  },
  {
    key: 'data',
    label: 'Data & Analytics',
    match: nameIncludes(
      'MATLAB',
      'Stata',
      'SPSS',
      'SAS',
      'JMP',
      'Python',
      'Jupyter',
      'RStudio',
      'Bloomberg',
      'WRDS',
      'Qualtrics'
    ),
  },
  {
    key: 'research',
    label: 'Research & Writing',
    match: anyOf(
      nameIncludes('Overleaf', 'JSTOR', "O'Reilly", 'Web of Science', 'Scopus', 'ProQuest', 'PsycINFO'),
      inCategory('library')
    ),
  },
  {
    key: 'outdoor',
    label: 'Outdoor & Adventure',
    match: anyOf(inCategory('outdoor'), nameIncludes('Climbing', 'Recreation')),
  },
  {
    key: 'career',
    label: 'Career & Professional',
    match: anyOf(inCategory('career'), nameIncludes('LinkedIn Learning', 'DocuSign')),
  },
];

/**
 * Scenario filters. Each scenario page renders its own hero/copy but pulls its
 * resource set from here so the membership rules live in one place.
 */
export const SCENARIOS: Record<string, { match: ResourceMatcher }> = {
  'grad-school': {
    match: nameIncludes(
      'JSTOR',
      'ProQuest',
      'Interlibrary',
      "O'Reilly",
      'Counseling',
      'Web of Science',
      'Scopus',
      'Rauner',
      'Overleaf'
    ),
  },
  'job-hunt': {
    match: anyOf(
      inCategory('career'),
      nameIncludes('Bloomberg', 'News Access', 'Python', 'MATLAB', 'Printing Credit')
    ),
  },
  'data-analysis': {
    match: nameIncludes(
      'Bloomberg',
      'MATLAB',
      'SPSS',
      'SAS',
      'JMP',
      'WRDS',
      'Qualtrics',
      'Statista',
      'Python',
      'Jupyter',
      'RStudio',
      'Mathematica'
    ),
  },
  creative: {
    match: nameIncludes(
      'Adobe',
      'Canva',
      'Hopkins',
      'Hood',
      'Woodwork',
      'Ceramic',
      'Sibelius',
      'Music'
    ),
  },
  adventure: {
    match: anyOf(
      inCategory('outdoor'),
      nameIncludes('DOC', 'Ledyard', 'Rental', 'Climb', 'Recreation')
    ),
  },
  'save-money': {
    match: nameIncludes(
      'Printing',
      'Clothing',
      'News',
      'Gym',
      'Alumni Gym',
      'Athletic',
      'Hopkins',
      'Film',
      'Programming Board'
    ),
  },
};

/** Metadata for the scenarios hub page. */
export const SCENARIO_CARDS = [
  { slug: 'grad-school', icon: '📚', title: 'Applying to grad school?', blurb: 'Research databases, writing tools, and support for the most important proposal of your life.' },
  { slug: 'job-hunt', icon: '💼', title: 'Job hunting?', blurb: 'Bloomberg Terminal, career coaching for life, news subscriptions, and technical skills.' },
  { slug: 'data-analysis', icon: '📊', title: 'Running data analysis?', blurb: 'MATLAB, SPSS, SAS, JMP Pro, WRDS, Qualtrics, and a $25k Bloomberg Terminal.' },
  { slug: 'creative', icon: '🎨', title: 'Building a portfolio?', blurb: 'Adobe Creative Cloud, Canva Pro, Hopkins Center studios, and Hood Museum access.' },
  { slug: 'adventure', icon: '🏔️', title: 'Planning an adventure?', blurb: 'DOC cabins, free outdoor gear rentals, Ledyard Canoe Club, and DOC Trips.' },
  { slug: 'save-money', icon: '💰', title: 'Tight on cash?', blurb: 'Printing credit, free winter clothing, NYT/WSJ, free film screenings, and gym access.' },
] as const;
