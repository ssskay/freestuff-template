# Catalog quality guidelines

The catalog's one asset is **trust**: every entry is genuinely free, verified, and
listed with no agenda. These rules keep it that way. They are enforced by
`tests/free-bar.test.ts` (CI) and surfaced by `agents/audit_free.py` (weekly review).

## The free bar

**A listing earns a spot only if a student can get the core benefit without paying money.**

Non-monetary conditions are still free — just state them:
- must be a student / show ID / use a school login
- reserve ahead, limited hours, limited quantity
- "free at the point of use, funded by a mandatory fee" (e.g. the health fee) — allowed, but say so plainly

### What qualifies

- ✅ **Free** — no payment, ever.
- ✅ **Free allotment** — money or credit given *to* you (print quota, grants, stipends). Free, even though it's denominated in dollars: you receive it, you don't pay it.
- ✅ **Free slice of a paid thing** — only if the copy **leads with the free part** and **names the paid part**. (Grant cabins free for undergrads; Adobe free in the labs; library on-site use free.)

### What does NOT qualify

- ❌ **Requires payment to obtain the benefit** — a paid membership, dues, a per-use rental fee as the actual offer. *(Removed: CMU Explorers Club, $20/year.)*
- ❌ **A discount on a paid product** — "$35/year instead of $90." A discount is not free; it's marketing, and marketing is an agenda. *(Removed: Zipcar CMU rate.)* If a discount program ever belongs anywhere, it's a separate, clearly-labeled surface — never mixed into the free catalog.

## The honesty rule

If any money is involved, state the exact condition in plain words, and never let
the **name** or **description** imply "free" when payment is required.

`annual_value` = the value of what the student receives **free**. It must not be `0`
next to a stated price — that was the Explorers Club bug (`annual_value: 0` beside a
"$20/year membership"). Set it to the genuine free value, or remove the entry.

## How it's checked

- **`npm test`** runs `tests/free-bar.test.ts` — fails the build on pay-to-obtain
  and "discount, not free" phrasing, and on the `annual_value: 0`-beside-a-price lie.
- **`python3 agents/audit_free.py`** prints a grouped report: `LETHAL` (fix now) vs
  `REVIEW` (a price is mentioned — confirm the free part is real). Run it after any
  catalog edit and as part of the weekly verifier pass.

Disclosed paid *upgrades* will show up under `REVIEW`; that's expected. The test only
blocks the unambiguous cases, so honest "free-in-labs, paid-take-home" entries pass.
