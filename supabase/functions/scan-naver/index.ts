import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Daily discovery scan against NAVER API HUB's 지역(local) corpus.
//
// WHAT THIS IS: it notices that a pop-up MIGHT exist and queues the brand's own
// link for enrich-candidates to read. Same contract as scan-sources — it never
// writes to `popups` and never parses a date.
//
// WHY 지역 AND NOT blog/news. Measured 2026-08-07 (full table in the
// naver-search header): blog sorted by date was 9/30 real pop-ups, the rest
// real-estate and job spam containing the word 팝업스토어. But Naver classifies
// 지역 rows under a literal `팝업스토어` category — the corpus is pre-filtered
// at source, so there is no keyword heuristic here to tune or get wrong.
//
// WHAT NAVER DOES NOT GIVE: dates and photos. Those are Naver Place data and no
// public API exposes them. What 지역 does give is the venue's OWN link, and the
// dates and og:image live on that page — so this function's real output is a
// candidate URL pointing at a tier-1 page, which is exactly the input
// enrich-candidates was already built to consume.
//
// SECURITY: takes NO caller input. QUERIES is the fixed list below, so a holder
// of the anon key cannot turn this into an open search proxy.

const API_HUB = 'https://naverapihub.apigw.ntruss.com';

/** Identifies us in robots.txt and to the sites we fetch. */
const UA = 'SeoulPopupsBot/1.0 (+discovery; contact via app store listing)';

// 지역 caps BOTH display and total at 5 — the cap is on the result set, not the
// page — so breadth comes from more queries, never a bigger display. Five
// phrasings per neighbourhood; overlap is expected and deduped on url.
const QUERIES = [
  '성수 팝업스토어',
  '성수동 팝업스토어',
  '연무장길 팝업스토어',
  '서울숲 팝업스토어',
  '성수 팝업',
  '홍대 팝업스토어',
  '홍대입구 팝업스토어',
  '연남동 팝업스토어',
  '합정 팝업스토어',
  '서교동 팝업스토어',
  '강남 팝업스토어',
  '코엑스 팝업스토어',
  '압구정 팝업스토어',
  '신사동 팝업스토어',
  '삼성동 팝업스토어',
];

const SOURCE_URL = `${API_HUB}/search/v1/local`;
const POLITE_DELAY_MS = 300;

/**
 * Gu → our three neighbourhoods. 서초구 maps to Gangnam on purpose: Shinsegae
 * Gangnam is technically in Seocho but reads as Gangnam to anyone using the
 * app, and 011-venues.sql already records that call.
 */
const GU_TO_HOOD: Record<string, string> = {
  성동구: 'Seongsu',
  마포구: 'Hongdae',
  강남구: 'Gangnam',
  서초구: 'Gangnam',
};

interface LocalItem {
  title: string;
  link: string;
  category: string;
  description: string;
  address: string;
  roadAddress: string;
  mapx: string;
  mapy: string;
}

/** Naver wraps matched terms in <b>…</b> and HTML-escapes the rest. */
function clean(s: string): string {
  return (s ?? '')
    .replace(/<\/?b>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Minimal robots.txt: `User-agent: *` Disallow prefixes. */
function parseRobots(txt: string): string[] {
  const disallow: string[] = [];
  let inStar = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const [kRaw, ...rest] = line.split(':');
    const k = kRaw.trim().toLowerCase();
    const v = rest.join(':').trim();
    if (k === 'user-agent') inStar = v === '*';
    else if (inStar && k === 'disallow' && v) disallow.push(v);
  }
  return disallow;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Per-HOST robots check, cached for the run.
 *
 * scan-sources can keep robots_allows on the source row because a source is one
 * site. Here every candidate is a different host — 지역 returned Instagram,
 * YouTube, birkenstock.com and four other domains in a single 15-row sample —
 * so the check has to happen per link or we would fetch sites that forbid it.
 * Instagram is `Disallow: /`, and it was 7 of 12 links in that sample, so this
 * is the common path and not an edge case.
 *
 * Fetch failure means allow, which is the standard reading of a missing
 * robots.txt.
 */
async function robotsAllows(
  link: string,
  cache: Map<string, string[] | null>,
): Promise<boolean> {
  let u: URL;
  try {
    u = new URL(link);
  } catch {
    return false;
  }
  const origin = u.origin;
  if (!cache.has(origin)) {
    try {
      const r = await fetch(`${origin}/robots.txt`, {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(8000),
      });
      cache.set(origin, r.ok ? parseRobots(await r.text()) : null);
    } catch {
      cache.set(origin, null);
    }
    await sleep(POLITE_DELAY_MS);
  }
  const rules = cache.get(origin);
  if (!rules) return true;
  const path = u.pathname + u.search;
  return !rules.some((d) => path.startsWith(d));
}

/** Cheap stable hash so a changed Naver row is detectable. */
async function hash(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async () => {
  const id = Deno.env.get('NCP_API_KEY_ID');
  const secret = Deno.env.get('NCP_API_KEY');
  if (!id || !secret) {
    return json(
      { ok: false, hint: 'NCP_API_KEY_ID / NCP_API_KEY are not set' },
      500,
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: srcRow } = await supabase
    .from('popup_sources')
    .select('id')
    .eq('url', SOURCE_URL)
    .maybeSingle();
  if (!srcRow) {
    return json(
      { ok: false, hint: 'NAVER 지역 검색 source row missing — apply 021' },
      500,
    );
  }
  const sourceId = (srcRow as { id: string }).id;

  // url is globally unique, so the same pop-up surfacing under several query
  // phrasings collapses here rather than in the database.
  const seen = new Map<string, LocalItem>();
  const queryStats: Record<string, unknown>[] = [];
  let apiCalls = 0;

  for (const query of QUERIES) {
    const url =
      `${SOURCE_URL}?query=${encodeURIComponent(query)}` +
      `&display=5&sort=random&format=json`;
    try {
      const res = await fetch(url, {
        headers: {
          'X-NCP-APIGW-API-KEY-ID': id,
          'X-NCP-APIGW-API-KEY': secret,
        },
        signal: AbortSignal.timeout(15000),
      });
      apiCalls++;
      if (!res.ok) {
        queryStats.push({
          query,
          status: res.status,
          body: (await res.text()).slice(0, 160),
        });
        continue;
      }
      const data = (await res.json()) as { items?: LocalItem[] };
      const items = data.items ?? [];
      let fresh = 0;
      for (const raw of items) {
        const link = raw.link?.trim();
        // popup_candidates.url is NOT NULL and unique — it IS the identity of a
        // candidate. A Naver row with no link cannot become one, so it is
        // counted and dropped rather than given a synthetic URL that would
        // later look like a real page to enrich-candidates.
        if (!link || !link.startsWith('http')) continue;
        if (!seen.has(link)) {
          seen.set(link, raw);
          fresh++;
        }
      }
      queryStats.push({ query, returned: items.length, new_in_run: fresh });
    } catch (e) {
      queryStats.push({ query, error: String(e).slice(0, 160) });
    }
  }

  const robotsCache = new Map<string, string[] | null>();
  const now = new Date().toISOString();
  let inserted = 0;
  let refreshed = 0;
  let blocked = 0;
  const skippedHosts: Record<string, number> = {};

  for (const [link, raw] of seen) {
    const title = clean(raw.title);
    const category = clean(raw.category);
    const roadAddress = clean(raw.roadAddress) || clean(raw.address);
    const gu = roadAddress.match(/(\S+구)\s/)?.[1] ?? '';
    const hood = GU_TO_HOOD[gu] ?? null;

    // mapx/mapy are WGS84 degrees x 1e7 — confirmed 2026-08-07 against a live
    // response (러쉬 성수 landed 220 m from PopupMapView's SEOUL_REGION centre),
    // NOT the TM128 the legacy developers.naver.com API returned. mapx is
    // longitude, mapy is latitude.
    const lng = raw.mapx ? Number(raw.mapx) / 1e7 : null;
    const lat = raw.mapy ? Number(raw.mapy) / 1e7 : null;
    const coordsSane =
      lat !== null &&
      lng !== null &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= 37.4 &&
      lat <= 37.7 &&
      lng >= 126.7 &&
      lng <= 127.2;

    const reasons: string[] = [];
    let score = 0;
    // Naver already classified this as a pop-up — a stronger signal than any
    // keyword rule scan-sources can apply to free text.
    if (category.includes('팝업')) {
      score += 4;
      reasons.push('naver_category_popup');
    }
    if (hood) {
      score += 2;
      reasons.push(`neighborhood_${hood}`);
    }
    if (coordsSane) {
      score += 1;
      reasons.push('has_coordinates');
    }

    const allowed = await robotsAllows(link, robotsCache);
    if (!allowed) {
      blocked++;
      const host = (() => {
        try {
          return new URL(link).host;
        } catch {
          return '?';
        }
      })();
      skippedHosts[host] = (skippedHosts[host] ?? 0) + 1;
      reasons.push('detail_blocked_by_robots');
    }

    const row = {
      source_id: sourceId,
      url: link,
      title: title.slice(0, 300),
      excerpt: category || null,
      detected_dates: [] as string[],
      detected_neighborhood: hood,
      detected_address: roadAddress || null,
      detected_latitude: coordsSane ? lat : null,
      detected_longitude: coordsSane ? lng : null,
      detected_category: category || null,
      score,
      score_reasons: reasons,
      content_hash: await hash(`${title}|${roadAddress}|${raw.mapx},${raw.mapy}`),
      last_seen_at: now,
      // Marking a robots-blocked link as already fetched is what actually stops
      // enrich-candidates touching it — it selects on `detail_fetched_at is
      // null` and does no robots check of its own. The candidate still reaches
      // a human with name, category, address and coordinates filled in; only
      // the automatic date/photo read is given up.
      detail_fetched_at: allowed ? null : now,
    };

    // ignoreDuplicates so a URL another source already queued keeps its own
    // source_id, status and triage history — Naver must not resurrect a
    // candidate a human already rejected.
    const { data: ins, error: insErr } = await supabase
      .from('popup_candidates')
      .upsert(row, { onConflict: 'url', ignoreDuplicates: true })
      .select('id');
    if (insErr) {
      queryStats.push({ url: link, insert_error: insErr.message.slice(0, 160) });
      continue;
    }
    if (ins && ins.length > 0) {
      inserted++;
      continue;
    }

    // Already present. Fill in only the Naver hints, and only where they are
    // still empty, so a human's correction is never overwritten by a rescan.
    const { error: updErr } = await supabase
      .from('popup_candidates')
      .update({
        detected_address: roadAddress || null,
        detected_latitude: coordsSane ? lat : null,
        detected_longitude: coordsSane ? lng : null,
        detected_category: category || null,
        last_seen_at: now,
      })
      .eq('url', link)
      .is('detected_address', null);
    if (!updErr) refreshed++;
  }

  return json({
    ok: true,
    queries: QUERIES.length,
    api_calls: apiCalls,
    distinct_popups: seen.size,
    inserted,
    refreshed,
    robots_blocked: blocked,
    blocked_hosts: skippedHosts,
    per_query: queryStats,
  });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
