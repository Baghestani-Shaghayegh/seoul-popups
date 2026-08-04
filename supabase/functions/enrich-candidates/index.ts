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
/** A pop-up announced more than this long ago has almost certainly ended; the
 *  longest run in our own catalogue is well under it. Generous on purpose —
 *  this drops archive articles, it is not a freshness policy. */
const MAX_ARTICLE_AGE_DAYS = 120;

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
 * The article's own text, which is where the run dates actually are.
 *
 * The first cut read the whole page and every Shinsegae article came back with
 * the same range — it was matching a *related article* teaser in the "latest
 * news" block. The response was to read og:title + og:description instead,
 * which removed the teasers but also removed the dates: measured across the 21
 * live candidates, the run date is in og:description on 5 pages and in the
 * article body on 15, with 10 having it ONLY in the body. Those were
 * unreachable by construction.
 *
 * Scoping to the article's container keeps the teasers out (they sit outside
 * it) while reaching the text that states the run. Verified on
 * summer-shinsegae-twl-popup: 4 date matches page-wide, 2 inside the container,
 * both the real one.
 */
const ARTICLE_CONTAINERS = [
  'post-body',
  'post-contents',
  'entry-content',
  'article-body',
  'post-content',
];

/** Inner HTML of the first matching <div>, honouring nested divs. */
function sliceContainer(html: string, cls: string): string | null {
  const m = html.match(
    new RegExp(`<div[^>]*class=["'][^"']*\\b${cls}\\b[^"']*["'][^>]*>`, 'i'),
  );
  if (!m || m.index === undefined) return null;
  const from = m.index + m[0].length;
  const tag = /<(\/?)div\b/gi;
  tag.lastIndex = from;
  let depth = 1;
  let t: RegExpExecArray | null;
  while ((t = tag.exec(html)) !== null) {
    depth += t[1] ? -1 : 1;
    if (depth === 0) return html.slice(from, t.index);
  }
  // Unbalanced markup: treat as not found rather than swallow the rest of the
  // page, which would put the teaser block back in scope.
  return null;
}

function articleText(html: string): string | null {
  for (const cls of ARTICLE_CONTAINERS) {
    const inner = sliceContainer(html, cls);
    if (inner && inner.length > 200) {
      return decodeEntities(inner.replace(/<[^>]+>/g, ' '));
    }
  }
  return null;
}

/**
 * The article's own publication date, used as the year for runs that omit one.
 *
 * `article:published_time` and `og:updated_time` are absent on ALL 21 pages in
 * the live queue, so the old `?? new Date().getFullYear()` fallback fired every
 * single time. Nine of those articles predate 2026 — three are from 2021 — so
 * the fallback was silently stamping five-year-old runs with the current year.
 * The date is in the markup as `<span class="date">2026.07.21</span>`; read it,
 * and return null when nothing resolves so the caller declines rather than
 * guesses.
 */
function articleDate(html: string): string | null {
  for (const raw of [
    meta(html, 'article:published_time'),
    meta(html, 'og:updated_time'),
    html.match(/<time[^>]+datetime=["']([^"']+)["']/i)?.[1] ?? null,
  ]) {
    if (!raw) continue;
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const vis = html.match(
    /class=["'][^"']*\bdate\b[^"']*["'][^>]*>\s*(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})/i,
  );
  if (vis) {
    return `${vis[1]}-${vis[2].padStart(2, '0')}-${vis[3].padStart(2, '0')}`;
  }
  return null;
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
 * published date, and roll the end forward a year only if it would otherwise
 * precede the start (a Dec->Jan run). With no article date the year is
 * unresolvable, so we decline rather than fall back to the current year —
 * that fallback is what stamped 2021 runs with 2026.
 */
function toDates(text: string, articleYear: number | null): DateResult | null {
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
      // The run states no year, so it can only come from the article. With no
      // article date there is nothing to infer from — keep the evidence and
      // decline. Defaulting to the current year is what stamped 2021 runs 2026.
      if (articleYear === null) {
        return {
          start: null,
          end: null,
          evidence: m[0].trim(),
          notes: ['article_year_unresolved'],
        };
      }
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
      if (articleYear === null) {
        return {
          start: null,
          end: null,
          evidence: e[0].trim(),
          notes: ['end_only_no_start_stated', 'article_year_unresolved'],
        };
      }
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

      // Scope is the article's own container, falling back to og:* when the
      // page uses a layout we don't recognise (see ARTICLE_CONTAINERS).
      const summary = decodeEntities(meta(html, 'og:description') ?? '');
      const ogTitle = decodeEntities(meta(html, 'og:title') ?? c.title);
      const body = articleText(html);
      const scope = `${ogTitle} ${body ?? summary}`;

      const published = articleDate(html);
      const articleYear = published ? Number(published.slice(0, 4)) : null;

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

      const notes = [
        body ? 'scope:article_body' : 'scope:og_metadata_fallback',
        ...(dates?.notes ?? []),
      ];
      if (!dates) notes.push('no_date_pattern_matched');
      if (!venueId) notes.push('venue_unmatched');
      if (tier !== 1) notes.push('image_skipped_non_tier1');
      notes.push(
        published ? `article_date:${published}` : 'article_date_unresolved',
      );

      const foreign = scope.match(NON_SEOUL);
      const outsideSeoul = !!foreign && !SEOUL_HINT.test(scope);
      if (outsideSeoul) notes.push(`outside_seoul:${foreign[0]}`);

      // An archive article describes a run that finished years ago. The
      // newsroom tag pages carry the full back-catalogue with no cut-off, so
      // 9 of the 21 live candidates predate 2026 and three are from 2021.
      // Reject them here, where the publication date is actually known —
      // scan-sources only sees the listing page and cannot tell.
      const ageDays = published
        ? Math.floor((Date.now() - Date.parse(published)) / 86_400_000)
        : null;
      const stale = ageDays !== null && ageDays > MAX_ARTICLE_AGE_DAYS;
      if (stale) notes.push(`stale_article:${ageDays}d`);

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
          ...(stale
            ? {
                status: 'rejected',
                rejected_reason: `article published ${published} — ${ageDays}d old, older than the ${MAX_ARTICLE_AGE_DAYS}d cut-off`,
              }
            : {}),
        })
        .eq('id', c.id);

      line.status = stale ? 'rejected_stale' : 'ok';
      line.published = published;
      line.scope = body ? 'article_body' : 'og_metadata_fallback';
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
