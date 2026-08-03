# `scan-sources` — twice-weekly discovery scan

Finds links that **might** be new pop-ups and queues them for a human. Runs
Tue + Fri 07:00 KST.

## What it does and doesn't

**Does:** fetch each enabled source's index page, keep the anchors matching that
source's `link_pattern`, and queue any URL it hasn't seen before with a
neighborhood guess, any literal date strings found, and a triage score.

**Doesn't:** write to `popups`, parse a date into a date column, fetch detail
pages, download images, or decide anything is true. Every candidate still goes
through the CONTENT.md §3.5 draft → validate → publish gate.

That split isn't caution for its own sake. Both aggregator dates this project
actually verified were wrong — Evangelion off by a month, Pompompurin listed
with an "ends Oct 26" that doesn't exist because it's a permanent store. The
scan automates the cheap, safe half (discovery); verification stays the moat.

## Run it by hand

```sh
curl -X POST "$EXPO_PUBLIC_SUPABASE_URL/functions/v1/scan-sources" \
  -H "Authorization: Bearer <anon-key>"
```

Returns a **per-source** breakdown, never just a total:

```json
{ "source": "Shinsegae Newsroom — 팝업 tag", "links_matched": 16,
  "new_candidates": 1, "status": "ok" }
```

## Triage

```sql
select * from public.candidate_queue limit 30;   -- official sources first, best score first
select * from public.scan_health;                -- one row per source
```

Accept or reject as you go, so the same rejected item doesn't come back:

```sql
update public.popup_candidates
   set status = 'rejected', rejected_reason = 'trade fair, not a pop-up'
 where id = '…';
```

Populate `popups.aliases` (Korean name, romanization, IP name) while you triage.
Name matching across Korean/English/romanized forms is the weakest part of the
dedupe, and hand-written aliases are what will eventually fix it.

## Reading health — the one thing to get right

**`last_link_count` is the breakage signal, not `new_candidates`.**

A healthy source in a quiet week matches many links and yields **zero** new
candidates. A source whose `link_pattern` broke matches **zero links**. Those
look identical if you only watch new-candidate counts, which is how a scraper
quietly dies for a month. `scan_health` surfaces it as
`ZERO_LINKS_suspect_breakage`.

`scan_runs` is the heartbeat: no row in 8 days means the job didn't run at all.
A job that never ran cannot alarm about itself, so something external has to
notice — worth adding to the daily `notify-ending-soon` function.

## Traps already hit (don't re-introduce)

- **pg_net's default timeout is 5 s**; this scan takes ~20 s. The first schedule
  died on every run — and `net.http_post` only *enqueues*, so **pg_cron recorded
  it as succeeded**. Always pass `timeout_milliseconds`, and check delivery in
  `net._http_response`, never `cron.job_run_details`.
- **Auth uses the anon key on purpose.** The function takes no caller input and
  is idempotent, so the anon key (which ships in the app) grants nothing new.
  It also sidesteps `current_setting('app.service_role_key', true)` returning
  NULL and silently sending a bare `Bearer `.
- **Newness** is "`first_seen_at` falls inside this run", not
  `first_seen_at == last_seen_at` — the upsert writes `last_seen_at` from the
  client and `first_seen_at` from the DB default, so they're never byte-equal.
- **A URL can appear in two sources in one run** (our two Shinsegae tags
  overlap). `unique(url)` stores it once, so it must be *counted* once.

## Adding a source

Adding a source is data, not code:

```sql
insert into public.popup_sources (display_name, url, tier, link_pattern)
values ('Venue name', 'https://…', 1, '/event/detail');
```

Derive `link_pattern` first — fetch the page and look at what the detail links
actually look like:

```sh
curl -sL "<url>" | grep -oE 'href="[^"]+"' | sed 's/href="//;s/"$//' \
  | sed -E 's#[0-9]+#<N>#g' | sort | uniq -c | sort -rn | head
```

Without a pattern you get the site's nav and footer. With one you get its
articles. It is the single thing that makes heuristic extraction viable.

**Check the source is server-rendered first.** Korean department-store sites are
often SPAs that return an empty shell to a plain fetch. At probe time Starfield
COEX, thehyundai.com and insideseoul.app all returned <2 KB of text and are
unusable this way; Shinsegae Newsroom (33 KB), Hyundai (66 KB), LCDC (64 KB),
Musinsa (30 KB), Galleria (18 KB) and AK Plaza (15 KB) were fine. Project Rent
is a parked domain.

**Aggregators (tier 3) are deliberately not seeded.** They carry the ToS risk
and can only ever tell you to go look somewhere else — migration 008 blocks
their links from reaching a user regardless.
