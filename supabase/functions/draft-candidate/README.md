# `draft-candidate` — candidate → draft pop-up, photo included

One call turns a reviewed candidate into a draft **and takes ownership of its
photo**. Replaces "call `draft_from_candidate`, then remember to run
`ingest-image`".

```sh
curl -X POST "$EXPO_PUBLIC_SUPABASE_URL/functions/v1/draft-candidate" \
  -H "Authorization: Bearer <anon-key>" -H "Content-Type: application/json" \
  -d '{"candidate_id":"…","name":"…","tagline":"…","description":"…",
       "category":"Lifestyle","start_date":"2026-07-30"}'
```

```json
{ "popup_id": "615e2ef5-…", "image": "mirrored",
  "image_url": "https://…/popup-images/615e2ef5-….png", "published": false }
```

## What comes from where

| Field | Source |
|---|---|
| name, tagline, description, category | **You.** CONTENT.md §3 wants our own words, not translated brand copy |
| dates | The candidate's extract; override with `start_date` / `end_date` when the source phrased them in a form we don't parse |
| pin, subway, hours, neighbourhood | The human-verified `venues` row — never guessed |
| photo | The venue's own `og:image`, downloaded into our bucket |

## Why the photo is mirrored *here*

Not during enrichment: at that point a candidate is a maybe, and most get
rejected — downloading every one would store third-party images for content we
never publish. Not on a separate schedule either: that leaves a window where a
row hot-links someone else's CDN, which is what migration 010 and the
aggregator denylist exist to prevent. This is the moment we decide to use it.

An aggregator host is refused outright and the row falls back to the house
card. A failed download does **not** undo the draft — a pop-up with no photo is
a valid row.

## Guards (all in `draft_from_candidate`, so both entry points share them)

- **Idempotent** — a second call returns `already drafted as popup <id>` rather
  than creating an orphaned duplicate
- Refuses a candidate with **no venue** (the pin would have to be guessed) or
  **no dates**
- Venue must have pin + subway + neighbourhood, and sit inside the Seoul box
- name / tagline / description must be non-empty

Everything lands `published = false`. A human still checks it.
