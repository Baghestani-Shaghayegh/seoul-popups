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

/** og:* content is HTML-escaped; a title stored raw shows up as &#8220; in the
 *  app. Decode here so what lands in the queue is what a human would read. */
function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    )
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

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

/**
 * Places that mean "not our app". A Korean retailer's newsroom happily covers
 * its Paris and Busan stores, and a candidate scoring on 팝업 + a date can look
 * perfect while being 9,000 km away — the queue surfaced exactly that
 * (어뮤즈 @ Galeries Lafayette, Paris). Reject only when a non-Seoul place is
 * named AND no Seoul-area place is, so "서울 강남점과 부산점" still passes.
 */
// Foreign cities are unambiguous. Korean ones are NOT: 경기 is also 경기 침체
// (recession), 광주 is inside 광주요 (a ceramics brand that runs pop-ups), 대구
// is also cod, 부산 is inside 부산물 (by-product). Matching those bare produced
// false rejects, so domestic places must carry a branch suffix (부산점) to
// count. 두바이 is dropped entirely — 두바이 초콜릿 is a Seoul food trend, not a
// location.
const NON_SEOUL =
  /파리|도쿄|오사카|뉴욕|런던|상하이|홍콩|싱가포르|타이베이|방콕|밀라노|부산점|대구점|대전점|광주점|인천점|수원점|제주점|천안점|경기점/;
const SEOUL_HINT =
  /서울|성수|홍대|강남|신사|압구정|청담|여의도|명동|연남|합정|잠실|가로수길|용산|한남|삼성동|코엑스|을지로|종로|익선|동대문|DDP|이태원|망원|문래|서촌|북촌|성북|건대|뚝섬|왕십리|상수|도산|본점/;

/** "오는 8월 5일(수)까지" — end only. */
const END_ONLY =
  /(?:오는\s*)?(\d{1,2})\s*월\s*(\d{1,2})\s*일\s*(?:\([월화수목금토일]\))?\s*까지/;

/** Korean weekday markers, Monday-first to match Date.getUTCDay() offset by 1. */
const KO_DOW = ['월', '화', '수', '목', '금', '토', '일'];

function koDayOf(y: number, m: number, d: number): string {
  return KO_DOW[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7];
}

/**
 * Sources write the weekday next to the date — "7월 30일(금)". Since the year is
 * usually inferred rather than stated, that marker is a free checksum on the
 * inference, and it caught a real bad row: "7월 30일(금)" resolved to 2026-07-30,
 * which is a 목. Wrong year, silently written. Mismatch now voids the dates
 * (never a wrong date) while keeping the evidence and a note for review.
 */
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
    const marks = [...m[0].matchAll(/\(([월화수목금토일])\)/g)].map(
      (x) => x[1],
    );
    const startBad = marks[0] && koDayOf(sy, sm, sd) !== marks[0];
    const endBad =
      marks.length > 1 && koDayOf(ey, em, ed) !== marks[marks.length - 1];
    if (startBad || endBad) {
      notes.push('weekday_mismatch_year_unreliable');
      return { start: null, end: null, evidence: m[0].trim(), notes };
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
      const mark = e[0].match(/\(([월화수목금토일])\)/)?.[1];
      const notes = ['end_only_no_start_stated', 'year_inferred_from_article'];
      if (mark && koDayOf(articleYear, em, ed) !== mark) {
        notes.push('weekday_mismatch_year_unreliable');
        return { start: null, end: null, evidence: e[0].trim(), notes };
      }
      return {
        start: null,
        end: `${articleYear}-${String(em).padStart(2, '0')}-${String(ed).padStart(2, '0')}`,
        evidence: e[0].trim(),
        notes,
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
        if (!best || alias.length > best.len)
          best = { id: v.id, len: alias.length };
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
      const summary = decodeEntities(meta(html, 'og:description') ?? '');
      const ogTitle = decodeEntities(meta(html, 'og:title') ?? c.title);
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

      // LCDC's event anchors carry no text, so scan-sources stored the raw URL
      // as the title. og:title is the real name and we already have it here.
      const cleanTitle = ogTitle
        .replace(
          /\s*[|–—-]\s*[^|–—-]{0,40}(뉴스룸|newsroom|LCDC|SEOUL)\s*$/i,
          '',
        )
        .trim();
      const betterTitle =
        cleanTitle.length > 3 && !/^https?:\/\//.test(cleanTitle)
          ? cleanTitle
          : c.title;

      const notes = ['scope:og_metadata', ...(dates?.notes ?? [])];
      if (!dates) notes.push('no_date_pattern_matched');
      if (!venueId) notes.push('venue_unmatched');
      if (tier !== 1) notes.push('image_skipped_non_tier1');

      const foreign = scope.match(NON_SEOUL);
      const outsideSeoul = !!foreign && !SEOUL_HINT.test(scope);
      if (outsideSeoul) notes.push(`outside_seoul:${foreign[0]}`);

      await supabase
        .from('popup_candidates')
        .update({
          title: betterTitle.slice(0, 300),
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
      line.title = betterTitle.slice(0, 48);
      if (outsideSeoul) line.flagged = `likely outside Seoul (${foreign![0]})`;
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
