# Free Stuff @ Dartmouth

A complete, always-current catalog of free perks available to Dartmouth students and alumni.

**Live site:** [freestuff-dartmouth.vercel.app](https://freestuff-dartmouth.vercel.app) _(will be live after deployment)_

## The Thesis

Dartmouth students and alumni already pay for an enormous amount of stuff and don't use most of it. Tuition, fees, and alumni dues fund software licenses, news subscriptions, library databases, outdoor gear rentals, professional development resources, and lifelong perks — but the catalog of "what you actually get" is fragmented across dozens of pages, hard to discover, and goes stale fast.

This site is the catalog. The mission is a complete, public, always-current list of free perks available to Dartmouth students and alumni — with a working link, eligibility tag, and a "last verified" date on every entry.

## Features

- **78 verified resources** across software, news, library, outdoor, career, campus life, and more
- **Real-time search and filtering** by category and eligibility
- **Mobile-responsive** design
- **Always up-to-date** with agent-maintained verification (coming in v2)
- **Fork-friendly** architecture for other schools

## Tech Stack

- **Framework:** [Astro](https://astro.build) (static site generator)
- **Styling:** [Tailwind CSS](https://tailwindcss.com)
- **Hosting:** [Vercel](https://vercel.com) (free tier)
- **Data:** Single JSON file (`src/content/resources.json`)
- **Agent Runtime (v2):** GitHub Actions + Python + Claude Sonnet 4.5

## Quick Start

```bash
# Clone the repo
git clone https://github.com/sarakay/freestuff-dartmouth-v2.git
cd freestuff-dartmouth-v2

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Visit `http://localhost:4321` to see the site locally.

## Project Structure

```
freestuff-dartmouth-v2/
├── src/
│   ├── content/
│   │   └── resources.json          # Source of truth for all resources
│   ├── components/
│   │   └── ResourceCard.astro      # Individual resource card
│   ├── layouts/
│   │   └── BaseLayout.astro        # Base page layout
│   └── pages/
│       ├── index.astro             # Homepage with search/filter
│       └── about.astro             # About page
├── public/
│   └── favicon.svg                 # Site favicon
├── .cx/inbox/                      # Planning documents
│   ├── vision.md
│   ├── architecture.md
│   ├── agents.md
│   └── seed-resources.md
└── agents/                         # Agent code (v2, not yet implemented)
```

## Data Schema

Each resource in `src/content/resources.json` follows this schema:

```typescript
{
  id: string;                        // Unique slug
  name: string;                      // Display name
  category: string;                  // software | news | library | outdoor | money | health | career | campus-life | alumni-only | tuck
  description: string;               // 1-2 sentence description
  link: string;                      // URL to the perk
  eligibility: string[];             // Array of: student | alumni | faculty | staff | public
  source: string;                    // Where this perk was found
  last_verified: string;             // YYYY-MM-DD format
  status: string;                    // active | needs_verification | broken | removed
  notes: string | null;              // Optional caveats
  added_at: string;                  // YYYY-MM-DD format
  added_by: string;                  // human | agent
}
```

## How to Fork This for Your School

This project is designed to be easily forked for other universities. Here's how:

1. **Fork this repo** on GitHub
2. **Update `src/content/resources.json`** with your school's perks
3. **Customize branding:**
   - Update colors in `tailwind.config.mjs` (change `dartmouth-green` to your school's color)
   - Update site name in `src/layouts/BaseLayout.astro`
   - Replace `public/favicon.svg` with your school's icon
4. **Deploy to Vercel:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy
   vercel
   ```
5. **Optional:** Set up agent automation (see Phase 2 in `.cx/inbox/architecture.md`)

That's it! The entire site is static, no database or backend required.

## Contributing

Found a broken link or know about a perk that's missing?

1. **Report an issue:** [Open an issue](https://github.com/sarakay/freestuff-dartmouth-v2/issues) with the details
2. **Submit a PR:** Add the resource to `src/content/resources.json` and open a pull request

Please include:
- Resource name and description
- Working link
- Eligibility (student, alumni, faculty, staff)
- Source where you found it

## Roadmap

### v1 (Current)
- [x] Static site with 78 verified resources
- [x] Editorial redesign with refined typography
- [x] Search and filter functionality
- [x] Mobile-responsive design
- [x] Vercel deployment
- [ ] Initial launch and feedback

### v2 (Planned)
- [ ] Verifier agent (weekly link health checks)
- [ ] Discoverer agent (monthly new perk discovery)
- [ ] Drafter agent (URL → structured entry)
- [ ] GitHub Actions workflows for agent automation
- [ ] Cost monitoring and optimization

## Architecture Philosophy

1. **Static-first.** No database, no backend, no auth. The whole site is files in a git repo.
2. **Git as the audit log.** Every change to the catalog is a commit. Every agent-discovered addition is a PR.
3. **JSON as the source of truth.** A single `resources.json` file holds all entries.
4. **The agent doesn't deploy.** Agents propose changes; humans merge.
5. **Fork-friendly.** The architecture should make it trivial for other schools to copy and adapt.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contact

Built by Dartmouth folks, for Dartmouth folks. Questions or feedback? [Open an issue](https://github.com/sarakay/freestuff-dartmouth-v2/issues).

---

**Note:** Agent automation (Phase 2) is planned but not yet implemented. Current version (v1) is a static site with manually-verified resources.
