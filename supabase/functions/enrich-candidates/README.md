# `enrich-candidates` — detail pass

Second stage of the discovery pipeline. `scan-sources` queues links; this opens
each one and fills in what can be established **mechanically**. Runs Tue + Fri
07:30 KST, 30 min after the scan.

## What it fills in

| Field | Where from |
|---|---|
| `extracted_start` / `extracted_end` | Korean date phrasings in `og:description` |
| `date_evidence` | the **verbatim substring** the dates came from |
| `venue_id` | alias match against the human-verified `venues` table |
| `og_image_url` | `og:image`, **tier-1 sources only** |
| `excerpt` | `og:description` |

No LLM. Everything is copied verbatim or inherited from a verified `venues`
row, so nothing here can be hallucinated.

## Two rules that are load-bearing

**1. Only `og:*` metadata is read — never the page body.** The first version
parsed the whole page and every Shinsegae article returned the identical range
`2026-07-31 → 2026-08-13`. It was matching a *related-article teaser* in the
page's "latest news" block. `og:description` is authored per article and cannot
contain a neighbouring pop-up's dates.

**2. A parsed date is always written beside its evidence.** `date_evidence`
holds the exact source string (`오는 8월 5일(수)까지`), so the parse is checkable
at a glance instead of trusted. This project has shipped two wrong dates; the
evidence column is why a third gets caught in review.

## What it deliberately does NOT parse

- `이달 8일부터 21일까지` ("this month") and `내달` ("next month") — the
  Shinsegae newsroom publishes **no date metadata at all**, so the month is
  unresolvable. Guessing it is precisely the Evangelion failure.
- Day-only ranges (`12일부터 14일까지`).
- Anything with no recognisable pattern.

All are left null with a note in `extract_notes`. Low recall on dates is the
correct trade: a missing date costs a human 30 seconds, a wrong one sends a
tourist across Seoul to a closed shop.

## Triage

```sql
select * from public.candidate_review;    -- dated candidates first
select * from public.coverage_health;     -- which neighbourhoods run dry
```

Turn a reviewed candidate into a draft in one call — location, subway and hours
come from the verified venue, so no pin is ever guessed:

```sql
select public.draft_from_candidate(
  '<candidate-id>', 'Name', 'One-line hook', 'Our own description.', 'Food'
);
-- pass p_start / p_end when the source states dates in a form we don't parse
```

It refuses (rather than inventing) when the candidate has **no venue** or
**no dates** — both verified: neither guard created a row.

## Adding a venue

Venue rows are what make location trustworthy. Verify once, and every future
pop-up there inherits a correct pin and exit instead of a guess — the direct
fix for the 5-of-9 estimated exits and the four pop-ups sharing one pin.

Note Galleria is **two buildings** with different addresses *and* different
subway exits; they are separate rows on purpose.

## Source viability — check before adding

A source is only useful if its detail pages expose **per-article** `og:title`
and `og:description`. Verify before seeding:

```sh
curl -sL "<a detail page URL>" | grep -oE '<meta[^>]*og:(title|description)[^>]*>'
```

**LCDC Seoul was disabled on 2026-08-03** for failing this: every event page
returns the site-wide `og:title` of "LCDC SEOUL", so 12 queued rows were
indistinguishable, and no per-event dates were exposed either. Getting real
names would mean parsing the page body — the exact thing that produced six
identical date ranges. Re-enable only if they publish per-event metadata.

## Geography gate

A Korean retailer's newsroom covers its Paris and Incheon stores too, and those
score just as well on 팝업 + a date. A candidate is auto-rejected when it names
a non-Seoul place AND no Seoul-area place — so "서울 강남점과 부산점" survives,
while a Galeries Lafayette popup in Paris does not. Both real cases; both were
sitting in the queue.

## Known ceiling: dates

The Shinsegae newsroom publishes **no date metadata at all** — no
`article:published_time`, no JSON-LD, no `<time>`. So `이달`/`내달` ("this
month"/"next month") and day-only ranges are unresolvable, and roughly two
thirds of candidates arrive with no dates.

This is not a parser bug to fix. Reading the run off the page is the
irreducible human step — about 10 seconds, with the source already linked in
the queue. Better than a wrong date, which sends a visitor across Seoul to a
closed shop.
