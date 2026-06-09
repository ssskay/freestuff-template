import type { APIRoute } from 'astro';
import { SITE } from '../site.config';

// Generated so the sitemap line tracks SITE.url (a hardcoded public/robots.txt
// drifted to the old .vercel.app host and misdirected crawlers). AI crawlers
// (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) are intentionally allowed
// via "*" — being cited in AI answers is the goal, not blocked.
export const GET: APIRoute = () => {
  const body = `User-agent: *
Allow: /

Sitemap: ${SITE.url}/sitemap-index.xml
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
