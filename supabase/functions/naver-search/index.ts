import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// Naver Search API probe — does Naver surface the pop-ups our newsroom sources
// cannot reach?
//
// WHY THIS EXISTS: automated discovery currently sees only Shinsegae press
// releases. Every other route was probed and rejected (scan-sources/README.md):
// Korean department-store sites are JS-rendered with no per-event page, Popply
// included (its /popup listing yields zero per-event hrefs and its sitemap
// lists 10 section pages). Instagram's Hashtag Search needs Meta App Review.
// Naver is the remaining candidate and the credentials already exist here for
// the OAuth login, so this costs nothing to answer with evidence.
//
// WHAT IT DOES NOT DO: it writes nothing. It reports what Naver returns so a
// human can judge whether the quality justifies wiring it into the pipeline.
// Blog and cafe results are user-generated — a discovery signal, never an
// authority for dates and never an image source (CONTENT.md §4).
//
// SECURITY: takes NO caller input. The queries are the fixed list below, so a
// holder of the anon key cannot turn this into an open search proxy.
//
// Secrets (same Naver Developers app as naver-auth; the app must have
// 검색 API enabled):  NAVER_CLIENT_ID, NAVER_CLIENT_SECRET

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
        `https://openapi.naver.com/v1/search/${corpus}.json` +
        `?query=${encodeURIComponent(query)}&display=${DISPLAY}&sort=date`;
      try {
        const res = await fetch(url, {
          headers: {
            'X-Naver-Client-Id': id,
            'X-Naver-Client-Secret': secret,
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
