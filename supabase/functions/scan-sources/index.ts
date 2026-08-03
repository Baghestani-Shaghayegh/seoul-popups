import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Twice-weekly discovery scan.
//
// WHAT THIS IS: it notices that a pop-up MIGHT exist and queues a link for a
// human to check. That is the whole job.
//
// WHAT THIS IS NOT: it never writes to `popups`, never parses a date into a
// date column, and never decides what is true. Both aggregator dates this
// project actually verified were wrong — one off by a month, one a permanent
// store listed with an end date — so verification stays human (CONTENT.md §3.5).
//
// SECURITY: takes NO caller input, same posture as ingest-image. Every URL
// fetched comes from `popup_sources`, which only the service role can write, so
// a holder of the shipped anon key cannot aim this at an arbitrary host.
//
// HEALTH: the signal is `last_link_count`, NOT new-candidate count. A healthy
// source in a quiet week matches many links and yields zero new candidates; a
// broken one matches zero links. Conflating those makes breakage invisible.

const UA =
  'SeoulPopupsBot/1.0 (+https://github.com/Baghestani-Shaghayegh/seoul-popups; twice-weekly popup discovery)';
const MAX_SOURCES_PER_RUN = 12;
const FETCH_TIMEOUT_MS = 10_000;
const POLITE_DELAY_MS = 2_000;
const MAX_HTML_BYTES = 3 * 1024 * 1024;

/** Literal date-ish strings. Stored verbatim — never parsed into a date. */
const DATE_PATTERNS = [
  /\d{4}\s*[.\-/]\s*\d{1,2}\s*[.\-/]\s*\d{1,2}/g,
  /\d{1,2}\s*[./]\s*\d{1,2}\s*(?:\([월화수목금토일]\))?\s*[~\-–—]\s*\d{1,2}\s*[./]\s*\d{1,2}/g,
  /\d{1,2}\s*월\s*\d{1,2}\s*일/g,
];

const NEIGHBORHOOD_HINTS: [string, RegExp][] = [
  ['Seongsu', /성수|seongsu|서울숲/i],
  ['Hongdae', /홍대|연남|합정|hongdae|yeonnam/i],
  [
    'Gangnam',
    /강남|신사|압구정|청담|삼성동|가로수길|gangnam|apgujeong|cheongdam|garosu/i,
  ],
];

const POPUP_HINTS = /팝업|팝업스토어|pop-?\s?up|기획전|한정|오픈/i;

interface Source {
  id: string;
  display_name: string;
  url: string;
  tier: number;
  link_pattern: string;
  etag: string | null;
  last_modified: string | null;
  robots_allows: boolean | null;
  robots_checked_at: string | null;
  crawl_delay_seconds: number | null;
  last_link_count: number | null;
  consecutive_failures: number;
}

interface ExistingPopup {
  id: string;
  name: string;
  aliases: string[] | null;
  source_url: string | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Stable identity for dedupe. Query string is preserved — Korean CMSes put
 *  the article id there (e.g. ?scheduleSeq=26122) — minus tracking params. */
function normalizeUrl(raw: string, base?: string): string | null {
  try {
    const u = new URL(raw, base);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    u.protocol = 'https:';
    u.hostname = u.hostname.toLowerCase();
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|igshid$)/i.test(k)) u.searchParams.delete(k);
    }
    let s = u.toString();
    if (s.endsWith('/') && u.pathname !== '/') s = s.slice(0, -1);
    return s;
  } catch {
    return null;
  }
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}

/** href + visible anchor text. Regex rather than a DOM parser: we only need
 *  links, and this keeps the function dependency-free. */
function extractAnchors(html: string): { href: string; text: string }[] {
  const out: { href: string; text: string }[] = [];
  const re = /<a\b[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = decodeEntities(m[2].replace(/<[^>]*>/g, ' '))
      .replace(/\s+/g, ' ')
      .trim();
    out.push({ href: m[1], text });
  }
  return out;
}

function findDates(text: string): string[] {
  const hits = new Set<string>();
  for (const re of DATE_PATTERNS) {
    for (const m of text.matchAll(re)) hits.add(m[0].replace(/\s+/g, ''));
  }
  return [...hits].slice(0, 6);
}

function findNeighborhood(text: string): string | null {
  for (const [name, re] of NEIGHBORHOOD_HINTS) if (re.test(text)) return name;
  return null;
}

function scoreCandidate(
  title: string,
  dates: string[],
  hood: string | null,
  tier: number,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  if (POPUP_HINTS.test(title)) {
    score += 3;
    reasons.push('popup_keyword');
  }
  if (hood) {
    score += 2;
    reasons.push(`neighborhood:${hood}`);
  }
  if (dates.length) {
    score += 2;
    reasons.push('has_date');
  }
  if (tier === 1) {
    score += 1;
    reasons.push('tier1_official');
  }
  if (title.length < 8) {
    score -= 2;
    reasons.push('title_too_short');
  }
  return { score, reasons };
}

/** Distinctive tokens only, so "팝업"/"store" don't match everything. */
function tokens(s: string): Set<string> {
  const cleaned = s
    .toLowerCase()
    .replace(/[×—–\-_/|,.:()\[\]'"]+/g, ' ')
    .replace(
      /\b(팝업스토어|팝업|스토어|오픈|이벤트|popup|pop|up|store|the|and|x)\b/g,
      ' ',
    );
  return new Set(
    cleaned
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => (/[가-힣]/.test(t) ? t.length >= 2 : t.length >= 4)),
  );
}

function overlaps(title: string, popup: ExistingPopup): boolean {
  const a = tokens(title);
  const names = [popup.name, ...(popup.aliases ?? [])];
  for (const n of names) {
    for (const t of tokens(n)) if (a.has(t)) return true;
  }
  return false;
}

/** Minimal robots.txt: `User-agent: *` Disallow prefixes + Crawl-delay. */
function parseRobots(txt: string): {
  disallow: string[];
  delay: number | null;
} {
  const lines = txt.split(/\r?\n/);
  let inStar = false;
  const disallow: string[] = [];
  let delay: number | null = null;
  for (const raw of lines) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    const [kRaw, ...rest] = line.split(':');
    const k = kRaw.trim().toLowerCase();
    const v = rest.join(':').trim();
    if (k === 'user-agent') inStar = v === '*';
    else if (inStar && k === 'disallow' && v) disallow.push(v);
    else if (inStar && k === 'crawl-delay') {
      const n = Number(v);
      if (Number.isFinite(n)) delay = n;
    }
  }
  return { disallow, delay };
}

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Newness is "first_seen_at falls inside this run", not
  // "first_seen_at === last_seen_at": the upsert writes last_seen_at from the
  // client while first_seen_at comes from the DB default, so the two are never
  // byte-equal and the first cut of this reported 0 new on an empty queue.
  const runStart = Date.now() - 1_000;
  // A URL can appear in more than one source in a single run (our two Shinsegae
  // tag pages overlap). The global unique(url) stores it once, so it must be
  // counted once too — otherwise "new" inflates and the health signal lies.
  const countedNew = new Set<string>();

  // Heartbeat first: a run that dies mid-way still leaves evidence it started.
  const { data: runRow } = await supabase
    .from('scan_runs')
    .insert({})
    .select('id')
    .single();
  const runId = runRow?.id as string | undefined;

  const { data: popupRows } = await supabase
    .from('popups')
    .select('id, name, aliases, source_url');
  const existing = (popupRows ?? []) as ExistingPopup[];
  const bySourceUrl = new Map<string, string>();
  for (const p of existing) {
    const n = p.source_url ? normalizeUrl(p.source_url) : null;
    if (n) bySourceUrl.set(n, p.id);
  }

  const { data: srcRows } = await supabase
    .from('popup_sources')
    .select('*')
    .eq('enabled', true)
    .order('last_fetched_at', { ascending: true, nullsFirst: true })
    .limit(MAX_SOURCES_PER_RUN);
  const sources = (srcRows ?? []) as Source[];

  const detail: Record<string, unknown>[] = [];
  let ok = 0;
  let failed = 0;
  let totalLinks = 0;
  let totalNew = 0;

  for (const src of sources) {
    const line: Record<string, unknown> = { source: src.display_name };
    let failures = src.consecutive_failures;
    let linkCount = src.last_link_count ?? 0;
    let etag = src.etag;
    let lastModified = src.last_modified;
    let robotsAllows = src.robots_allows;
    let crawlDelay = src.crawl_delay_seconds;

    try {
      const origin = new URL(src.url).origin;

      // robots.txt, re-checked weekly. Fetch failure => allow (standard).
      const robotsStale =
        !src.robots_checked_at ||
        Date.now() - Date.parse(src.robots_checked_at) > 7 * 864e5;
      if (robotsStale) {
        try {
          const r = await fetch(`${origin}/robots.txt`, {
            headers: { 'User-Agent': UA },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          });
          if (r.ok) {
            const { disallow, delay } = parseRobots(await r.text());
            const path = new URL(src.url).pathname;
            robotsAllows = !disallow.some((d) => path.startsWith(d));
            crawlDelay = delay;
          } else {
            robotsAllows = true;
          }
        } catch {
          robotsAllows = true;
        }
      }

      if (robotsAllows === false) {
        line.status = 'robots_disallow';
        detail.push(line);
        await supabase
          .from('popup_sources')
          .update({
            robots_allows: robotsAllows,
            robots_checked_at: new Date().toISOString(),
            last_status: 'robots_disallow',
            last_fetched_at: new Date().toISOString(),
          })
          .eq('id', src.id);
        continue;
      }

      const headers: Record<string, string> = { 'User-Agent': UA };
      if (etag) headers['If-None-Match'] = etag;
      if (lastModified) headers['If-Modified-Since'] = lastModified;

      const res = await fetch(src.url, {
        headers,
        redirect: 'follow',
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (res.status === 304) {
        line.status = 'not_modified';
        line.links_matched = linkCount;
        line.new_candidates = 0;
        ok++;
        failures = 0;
      } else if (!res.ok) {
        line.status = `http_${res.status}`;
        failures++;
        failed++;
      } else {
        etag = res.headers.get('etag');
        lastModified = res.headers.get('last-modified');
        const html = (await res.text()).slice(0, MAX_HTML_BYTES);

        const pattern = new RegExp(src.link_pattern, 'i');
        const host = new URL(src.url).hostname;
        const seen = new Set<string>();
        const links: { url: string; text: string }[] = [];

        for (const a of extractAnchors(html)) {
          const abs = normalizeUrl(a.href, src.url);
          if (!abs) continue;
          if (new URL(abs).hostname !== host) continue;
          if (!pattern.test(abs)) continue;
          if (seen.has(abs)) continue;
          seen.add(abs);
          links.push({ url: abs, text: a.text });
        }

        linkCount = links.length;
        totalLinks += linkCount;
        line.links_matched = linkCount;

        let newHere = 0;
        for (const link of links) {
          const title = (link.text || link.url).slice(0, 300);
          const hash = await sha256(`${title}|${link.url}`);
          const dates = findDates(title);
          const hood = findNeighborhood(`${title} ${link.url}`);
          const { score, reasons } = scoreCandidate(
            title,
            dates,
            hood,
            src.tier,
          );

          // Exact source_url match is true identity — the only auto-link.
          const knownPopupId = bySourceUrl.get(link.url) ?? null;
          const dupes = knownPopupId
            ? []
            : existing.filter((p) => overlaps(title, p)).map((p) => p.id);

          const { error, data } = await supabase
            .from('popup_candidates')
            .upsert(
              {
                source_id: src.id,
                url: link.url,
                title,
                detected_dates: dates,
                detected_neighborhood: hood,
                score,
                score_reasons: reasons,
                content_hash: hash,
                last_seen_at: new Date().toISOString(),
                ...(knownPopupId
                  ? { status: 'accepted', popup_id: knownPopupId }
                  : { possible_duplicate_of: dupes }),
              },
              { onConflict: 'url', ignoreDuplicates: false },
            )
            .select('first_seen_at');
          const firstSeen = data?.[0]?.first_seen_at as string | undefined;
          if (
            !error &&
            firstSeen &&
            Date.parse(firstSeen) >= runStart &&
            !countedNew.has(link.url)
          ) {
            countedNew.add(link.url);
            newHere++;
          }
        }
        totalNew += newHere;
        line.new_candidates = newHere;
        line.status = 'ok';
        ok++;
        failures = 0;
      }
    } catch (e) {
      line.status = `error:${e}`;
      failures++;
      failed++;
    }

    await supabase
      .from('popup_sources')
      .update({
        last_fetched_at: new Date().toISOString(),
        last_status: String(line.status ?? 'unknown'),
        last_link_count: linkCount,
        consecutive_failures: failures,
        etag,
        last_modified: lastModified,
        robots_allows: robotsAllows,
        robots_checked_at: new Date().toISOString(),
        crawl_delay_seconds: crawlDelay,
      })
      .eq('id', src.id);

    detail.push(line);
    await sleep(Math.max(POLITE_DELAY_MS, (crawlDelay ?? 0) * 1000));
  }

  if (runId) {
    await supabase
      .from('scan_runs')
      .update({
        finished_at: new Date().toISOString(),
        sources_attempted: sources.length,
        sources_ok: ok,
        sources_failed: failed,
        links_matched: totalLinks,
        new_candidates: totalNew,
        detail,
      })
      .eq('id', runId);
  }

  // Per-source, never aggregate-only: {new: 0} is useless for spotting breakage.
  return new Response(
    JSON.stringify({ run_id: runId, sources: detail }, null, 2),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
