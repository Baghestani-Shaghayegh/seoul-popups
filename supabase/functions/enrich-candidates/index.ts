import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Second pass of the discovery pipeline: opens each queued candidate's detail
// page and fills in what can be established MECHANICALLY.
//
// Deliberately no LLM. Everything written here is either copied verbatim from
// the page (dates, og:image) or inherited from a human-verified `venues` row
// (pin, subway, hours). Nothing is inferred, so nothing can be hallucinated —
// which matters because the two automated dates this project actually checked
// were both wrong (one off by a month, one a permanent store).
//
// A parsed date is only ever written alongside `date_evidence`, the verbatim
// substring it came from, so a human can check the parse at a glance.
//
// SECURITY: no caller input. It only fetches URLs already queued in
// popup_candidates by scan-sources, which itself only reads popup_sources.
// og:image is accepted from TIER-1 sources only — a venue's own press asset,
// never an aggregator's crop (see the ingest-image denylist).

const UA =
  'SeoulPopupsBot/1.0 (+https://github.com/Baghestani-Shaghayegh/seoul-popups; popup detail enrichment)';
const MAX_PER_RUN = 12;
const FETCH_TIMEOUT_MS = 12_000;
const POLITE_DELAY_MS = 2_000;

interface Candidate {
  id: string;
  url: string;
  title: string;
  source_id: string;
}

interface Venue {
  id: string;
  name: string;
  aliases: string[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function meta(html: string, prop: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`,
    'i',
  );
  const m = html.match(re);
  if (m) return m[1];
  const re2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`,
    'i',
  );
  return html.match(re2)?.[1] ?? null;
}

/**
 * Korean run phrasings, most specific first. Returns the verbatim match plus
 * the numbers, never a date — parsing happens in `toDates` where the year rule
 * is explicit.
 */
const RANGE_PATTERNS: RegExp[] = [
  // 2026년 7월 30일 ~ 8월 9일  /  2026.07.30 ~ 08.09
  /(\d{4})\s*[년.\-/]\s*(\d{1,2})\s*[월.\-/]\s*(\d{1,2})\s*일?\s*(?:\([월화수목금토일]\))?\s*[~\-–—부터]+\s*(?:(\d{4})\s*[년.\-/]\s*)?(\d{1,2})\s*[월.\-/]\s*(\d{1,2})\s*일?/,
  // 7월 30일부터 8월 9일까지
  /(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*(?:\([월화수목금토일]\))?\s*(?:부터|~|-|–|—)\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*(?:까지)?/,
];

/** "오는 8월 5일(수)까지" — end only. */
const END_ONLY = /(?:오는\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*(?:\([월화수목금토일]\))?\s*까지/;

interface DateResult {
  start: string | null;
  end: string | null;
  evidence: string;
  notes: string[];
}

/**
 * Year rule: a Korean run almost never spans a year boundary, and the source
 * usually omits the year entirely. We take the year from the article's own
 * published date when present, else the current year, and roll the end forward
 * a year only if it would otherwise precede the start (a Dec->Jan run).
 * Anything we cannot resolve this way is left null with a note — never guessed.
 */
function toDates(text: string, articleYear: number): DateResult | null {
  for (const re of RANGE_PATTERNS) {
    const m = text.match(re);
    if (!m) continue;
    const notes: string[] = [];
    let sy: number, sm: number, sd: number, em: number, ed: number, ey: number;

    if (m.length >= 7) {
      sy = Number(m[1]);
      sm = Number(m[2]);
      sd = Number(m[3]);
      ey = m[4] ? Number(m[4]) : sy;
      em = Number(m[5]);
      ed = Number(m[6]);
    } else {
      sy = articleYear;
      sm = Number(m[1]);
      sd = Number(m[2]);
      em = Number(m[3]);
      ed = Number(m[4]);
      ey = sy;
      notes.push('year_inferred_from_article');
    }
    if (em < sm) {
      ey = sy + 1;
      notes.push('end_rolled_to_next_year');
    }
    const iso = (y: number, mo: number, d: number) =>
      `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (sm < 1 || sm > 12 || em < 1 || em > 12 || sd > 31 || ed > 31) {
      return null;
    }
    return {
      start: iso(sy, sm, sd),
      end: iso(ey, em, ed),
      evidence: m[0].trim(),
      notes,
    };
  }

  const e = text.match(END_ONLY);
  if (e) {
    const em = Number(e[1]);
    const ed = Number(e[2]);
    if (em >= 1 && em <= 12 && ed <= 31) {
      return {
        start: null,
        end: `${articleYear}-${String(em).padStart(2, '0')}-${String(ed).padStart(2, '0')}`,
        evidence: e[0].trim(),
        notes: ['end_only_no_start_stated', 'year_inferred_from_article'],
      };
    }
  }
  return null;
}

function matchVenue(text: string, venues: Venue[]): string | null {
  const hay = text.toLowerCase();
  let best: { id: string; len: number } | null = null;
  for (const v of venues) {
    for (const a of [v.name, ...(v.aliases ?? [])]) {
      const alias = a.toLowerCase().trim();
      if (alias.length >= 2 && hay.includes(alias)) {
        if (!best || alias.length > best.len) best = { id: v.id, len: alias.length };
      }
    }
  }
  return best?.id ?? null;
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: venueRows } = await supabase
    .from('venues')
    .select('id, name, aliases');
  const venues = (venueRows ?? []) as Venue[];

  // Tier-1 sources only may supply an og:image.
  const { data: srcRows } = await supabase
    .from('popup_sources')
    .select('id, tier');
  const tierById = new Map<string, number>(
    (srcRows ?? []).map((s) => [
      (s as { id: string }).id,
      (s as { tier: number }).tier,
    ]),
  );

  const { data: candRows } = await supabase
    .from('popup_candidates')
    .select('id, url, title, source_id')
    .eq('status', 'new')
    .is('detail_fetched_at', null)
    .order('score', { ascending: false })
    .limit(MAX_PER_RUN);
  const candidates = (candRows ?? []) as Candidate[];

  const results: Record<string, unknown>[] = [];

  for (const c of candidates) {
    const line: Record<string, unknown> = { title: c.title.slice(0, 48) };
    try {
      const res = await fetch(c.url, {
        headers: { 'User-Agent': UA },
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) {
        line.status = `http_${res.status}`;
        results.push(line);
        await supabase
          .from('popup_candidates')
          .update({ detail_fetched_at: new Date().toISOString() })
          .eq('id', c.id);
        await sleep(POLITE_DELAY_MS);
        continue;
      }

      const html = await res.text();

      // Dates and venue come from og:description + og:title ONLY, never the
      // page body. The first cut read the whole page and every Shinsegae
      // article returned the same range — it was matching a *related article*
      // teaser in the page's "latest news" block. og:* is authored per article
      // and cannot contain a neighbouring pop-up's dates.
      const summary = meta(html, 'og:description') ?? '';
      const ogTitle = meta(html, 'og:title') ?? c.title;
      const scope = `${ogTitle} ${summary}`;

      const published =
        meta(html, 'article:published_time') ??
        meta(html, 'og:updated_time') ??
        null;
      const articleYear = published
        ? new Date(published).getFullYear()
        : new Date().getFullYear();

      const dates = toDates(scope, articleYear);
      const venueId = matchVenue(scope, venues);

      const tier = tierById.get(c.source_id) ?? 3;
      const ogImage = tier === 1 ? meta(html, 'og:image') : null;

      const notes = ['scope:og_metadata', ...(dates?.notes ?? [])];
      if (!dates) notes.push('no_date_pattern_matched');
      if (!venueId) notes.push('venue_unmatched');
      if (tier !== 1) notes.push('image_skipped_non_tier1');

      await supabase
        .from('popup_candidates')
        .update({
          detail_fetched_at: new Date().toISOString(),
          venue_id: venueId,
          og_image_url: ogImage,
          extracted_start: dates?.start ?? null,
          extracted_end: dates?.end ?? null,
          date_evidence: dates?.evidence ?? null,
          extract_notes: notes,
          excerpt: summary.slice(0, 300),
        })
        .eq('id', c.id);

      line.status = 'ok';
      line.dates = dates ? `${dates.start ?? '?'} → ${dates.end}` : null;
      line.evidence = dates?.evidence ?? null;
      line.venue = venueId ? venues.find((v) => v.id === venueId)?.name : null;
      line.image = !!ogImage;
    } catch (e) {
      line.status = `error:${e}`;
    }
    results.push(line);
    await sleep(POLITE_DELAY_MS);
  }

  return new Response(
    JSON.stringify({ enriched: results.length, results }, null, 2),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
