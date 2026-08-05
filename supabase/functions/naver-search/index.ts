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
// Secrets (from NCP Console → NAVER API HUB → 인증정보):
//   NAVER_CLIENT_ID, NAVER_CLIENT_SECRET

/** API HUB gateway. The old openapi.naver.com host serves the retired API. */
const API_HUB = 'https://naverapihub.apigw.ntruss.com';

const QUERIES = ['성수 팝업스토어', '홍대 팝업스토어', '강남 팝업스토어'];

/** blog and news carry a usable date; webkr does not, so it is not worth a call. */
const CORPORA = ['blog', 'news'] as const;

const DISPLAY = 10;

interface NaverItem {
  title: string;
  link: string;
  description: string;
  postdate?: string;
  pubDate?: string;
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
  const id = Deno.env.get('NAVER_CLIENT_ID');
  const secret = Deno.env.get('NAVER_CLIENT_SECRET');
  if (!id || !secret) {
    return json({
      configured: false,
      hint: 'NAVER_CLIENT_ID / NAVER_CLIENT_SECRET are not set on this project',
    });
  }

  const out: Record<string, unknown>[] = [];

  for (const query of QUERIES) {
    for (const corpus of CORPORA) {
      const url =
        `${API_HUB}/search/v1/${corpus}` +
        `?query=${encodeURIComponent(query)}&display=${DISPLAY}&sort=date&format=json`;
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
          total: data.total,
          returned: data.items?.length ?? 0,
          items: (data.items ?? []).map((i) => ({
            title: clean(i.title),
            link: i.link,
            date: i.postdate ?? i.pubDate ?? null,
            snippet: clean(i.description).slice(0, 120),
          })),
        });
      } catch (e) {
        out.push({ query, corpus, error: String(e).slice(0, 200) });
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
