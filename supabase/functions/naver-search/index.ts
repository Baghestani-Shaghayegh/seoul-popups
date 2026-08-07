import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// Naver Search API probe — does Naver surface the pop-ups our newsroom sources
// cannot reach?
//
// WHY THIS EXISTS: automated discovery currently sees only Shinsegae press
// releases. Every other route was probed and rejected (scan-sources/README.md):
// Korean department-store sites are JS-rendered with no per-event page, Popply
// included (its /popup listing yields zero per-event hrefs and its sitemap
// lists 10 section pages). Instagram's Hashtag Search needs Meta App Review.
// Naver is the remaining candidate, and unlike scraping a competitor it is an
// official, documented API with terms — which is the whole point.
//
// WHAT IT DOES NOT DO: it writes nothing. It reports what Naver returns so a
// human can judge whether the quality justifies wiring it into the pipeline.
// Blog and cafe results are user-generated — a discovery signal, never an
// authority for dates and never an image source (CONTENT.md §4).
//
// SECURITY: takes NO caller input. The queries are the fixed list below, so a
// holder of the anon key cannot turn this into an open search proxy.
//
// PLATFORM NOTE (2026-08-04): the old free Search API on developers.naver.com
// is gone — 검색 is no longer offered when registering an application there.
// It moved to NAVER API HUB on Naver Cloud Platform: different host, different
// auth headers (X-NCP-APIGW-*, not X-Naver-Client-*), and an NCP account
// rather than a Naver Developers one. Currently free, 775,000 search calls a
// month. naver-auth still uses developers.naver.com and is unaffected.
//
// Secrets (from NCP Console → Application → API 관리 → 인증정보):
//   NCP_API_KEY_ID, NCP_API_KEY
//
// Deliberately NOT named NAVER_CLIENT_* : naver-auth uses those for its
// developers.naver.com login credentials, and Supabase Edge Function secrets
// are project-wide — one shared env across every function. Sharing the names
// would mean whichever service was configured last silently broke the other.

/** API HUB gateway. The old openapi.naver.com host serves the retired API. */
const API_HUB = 'https://naverapihub.apigw.ntruss.com';

const QUERIES = ['성수 팝업스토어', '홍대 팝업스토어', '강남 팝업스토어'];

// blog and news carry a usable date; webkr does not, so it is not worth a call.
//
// local turned out to be the most valuable of the three, and not for the reason
// expected. It was added as a geocoder, but Naver classifies these venues under
// a literal `팝업스토어` category (with sub-categories like `팝업스토어>뷰티 팝업`
// and `팝업스토어>웹툰, 애니메이션 팝업`), so the corpus is already filtered to
// actual pop-ups — no keyword guessing needed. It returns name + category +
// floor-level road address + exact coordinates. What it still does NOT return
// is dates, which remain the job of enrich-candidates parsing the linked page.
//
// Each corpus has its own limits: local caps display at 5 and rejects
// sort=date (it accepts random | comment), so the params cannot be shared.
// local's `total` also comes back as 5 — the cap is on the result set, not just
// the page, so breadth has to come from more QUERIES, not a bigger display.
//
// blog and news are each probed under both sorts because sort turned out to
// matter far more than corpus. Measured 2026-08-07, share of the 30 returned
// titles (3 queries x 10) that actually name a 팝업:
//
//   blog/date   9/30   real-estate listings, job ads, furniture makers
//   blog/sim   29/30   ← distinct, real pop-ups; the discovery source
//   news/date  12/30
//   news/sim   24/30   high quality but heavily duplicated: the 10 강남 hits
//                      were 10 articles about ONE pop-up (무민)
//
// So blog/sim gives breadth (10 different pop-ups per query) and news/sim gives
// depth on whichever pop-up is big enough for a press run. sort=date is spam on
// both and is kept here only so this comparison stays reproducible.
const CORPORA = [
  { name: 'blog', display: 10, sort: 'date' },
  { name: 'blog', display: 10, sort: 'sim' },
  { name: 'news', display: 10, sort: 'date' },
  { name: 'news', display: 10, sort: 'sim' },
  { name: 'local', display: 5, sort: 'random' },
] as const;

interface NaverItem {
  title: string;
  link: string;
  description: string;
  /** blog */
  postdate?: string;
  /** news */
  pubDate?: string;
  /** local only, below */
  category?: string;
  address?: string;
  roadAddress?: string;
  mapx?: string;
  mapy?: string;
}

/** Naver wraps matched terms in <b>…</b> and HTML-escapes the rest. */
function clean(s: string): string {
  return s
    .replace(/<\/?b>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

Deno.serve(async () => {
  const id = Deno.env.get('NCP_API_KEY_ID');
  const secret = Deno.env.get('NCP_API_KEY');
  if (!id || !secret) {
    return json({
      configured: false,
      hint: 'NCP_API_KEY_ID / NCP_API_KEY are not set on this project',
    });
  }

  const out: Record<string, unknown>[] = [];

  for (const query of QUERIES) {
    for (const { name: corpus, display, sort } of CORPORA) {
      const url =
        `${API_HUB}/search/v1/${corpus}` +
        `?query=${encodeURIComponent(query)}&display=${display}&sort=${sort}&format=json`;
      try {
        const res = await fetch(url, {
          headers: {
            'X-NCP-APIGW-API-KEY-ID': id,
            'X-NCP-APIGW-API-KEY': secret,
          },
        });
        const bodyText = await res.text();
        if (!res.ok) {
          out.push({
            query,
            corpus,
            sort,
            status: res.status,
            body: bodyText.slice(0, 300),
          });
          continue;
        }
        const data = JSON.parse(bodyText) as {
          total: number;
          items: NaverItem[];
        };
        out.push({
          query,
          corpus,
          sort,
          total: data.total,
          returned: data.items?.length ?? 0,
          items: (data.items ?? []).map((i) => ({
            title: clean(i.title),
            link: i.link,
            date: i.postdate ?? i.pubDate ?? null,
            snippet: clean(i.description).slice(0, 120),
            // Only local carries these; spread so blog/news output stays clean.
            ...(i.roadAddress || i.address
              ? {
                  category: i.category ?? null,
                  roadAddress: i.roadAddress ?? null,
                  // CONFIRMED 2026-08-07 against a live response: mapx/mapy are
                  // WGS84 degrees x 1e7 (NOT the TM128 the legacy API returned).
                  // 러쉬 성수 came back as 37.5422/127.0558 — 220 m from the
                  // Seongsu centre already hardcoded in PopupMapView's
                  // SEOUL_REGION. mapx is longitude, mapy is latitude.
                  longitude: i.mapx ? Number(i.mapx) / 1e7 : null,
                  latitude: i.mapy ? Number(i.mapy) / 1e7 : null,
                }
              : {}),
          })),
        });
      } catch (e) {
        out.push({ query, corpus, sort, error: String(e).slice(0, 200) });
      }
    }
  }

  return json({ configured: true, results: out });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
