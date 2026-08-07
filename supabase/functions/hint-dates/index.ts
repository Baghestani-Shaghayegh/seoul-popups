import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Third pass: find date and hours HINTS for candidates whose own link gave none.
//
// WHY. Naver 지역 (021) finds pop-ups and their addresses but never their dates,
// and 21 of the 32 link to Instagram, which robots.txt closes — so those
// candidates reach triage with no date at all and cannot be drafted.
//
// Korean pop-up blog posts carry exactly what is missing, usually in one line:
//   "기간 ☞ 7월 17일 ~ 26일 ● 오픈 ☞ 매일 11시 ~ 20시"
// and blog.naver.com permits it: its robots.txt disallows a specific list of
// .nhn/.naver endpoints for `User-agent: *`, and PostView is not among them.
//
// WHAT THIS IS NOT. Blog posts are strangers writing from memory, and CONTENT.md
// §4 is explicit that they are never an authority for dates. So everything here
// lands in `detected_dates` — which 009 defines as LITERAL matched strings,
// never parsed — and never in extracted_start/extracted_end. A human confirms
// against the pop-up's own post before publishing. Both automated dates this
// project ever verified were wrong; this pass exists to save the searching, not
// the checking.
//
// SECURITY: no caller input. It reads candidates and queries Naver with their
// stored titles.

const API_HUB = 'https://naverapihub.apigw.ntruss.com';
const UA = 'SeoulPopupsBot/1.0 (+discovery; date hints)';
const MAX_CANDIDATES = 25;
const MAX_POSTS_PER_CANDIDATE = 3;
const POLITE_DELAY_MS = 700;

/**
 * Date ranges, deliberately narrow.
 *
 * A first pass allowed `\d{1,2}[.]\d{1,2}` on both sides and matched sidebar
 * junk like "4.29-1.28" and "1.79-1.16" — prices and ratings, not dates. Both
 * forms below therefore demand an explicit 월/일 or a four-digit year, which is
 * how a Korean post actually writes a run.
 */
const RANGES: RegExp[] = [
  // 7월 26일(일) ~ 8월 12일  /  7월 17일 ~ 26일
  /\d{1,2}\s*월\s*\d{1,2}\s*일\s*(?:\([월화수목금토일]\))?\s*[~\-–—]\s*(?:\d{1,2}\s*월\s*)?\d{1,2}\s*일?/g,
  // 2026년 7월 26일 ~ 2026.08.12
  /20\d{2}\s*[년.]\s*\d{1,2}\s*[월.]\s*\d{1,2}\s*일?\s*(?:\([월화수목금토일]\))?\s*[~\-–—]\s*(?:20\d{2}\s*[년.]\s*)?\d{1,2}\s*[월.]\s*\d{1,2}\s*일?/g,
];

/** "11시 ~ 20시", "11:00~20:00", "오전 11시부터 오후 8시" */
const HOURS =
  /(?:오전\s*)?\d{1,2}\s*(?:시|:\s*\d{2})\s*(?:부터)?\s*[~\-–—]\s*(?:오후\s*)?\d{1,2}\s*(?:시|:\s*\d{2})/g;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function strip(html: string): string {
  return html
    .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * blog.naver.com/<id>/<logNo> serves a FRAMESET, not the post — fetching it
 * returns ~2.8 KB with no Korean text at all. The content lives at
 * PostView.naver, whose parameters are in that frameset.
 */
function postViewUrl(link: string): string | null {
  const m = link.match(/blog\.naver\.com\/([^/?#]+)\/(\d+)/);
  if (!m) return null;
  return `https://blog.naver.com/PostView.naver?blogId=${m[1]}&logNo=${m[2]}`;
}

function uniq(xs: string[]): string[] {
  return [...new Set(xs.map((x) => x.replace(/\s+/g, ' ').trim()))];
}

Deno.serve(async () => {
  const id = Deno.env.get('NCP_API_KEY_ID');
  const secret = Deno.env.get('NCP_API_KEY');
  if (!id || !secret) {
    return json({ ok: false, hint: 'NCP_API_KEY_ID / NCP_API_KEY are not set' }, 500);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Only candidates that still lack dates, so a re-run is cheap and never
  // overwrites a hint a human has already acted on.
  const { data: rows, error } = await supabase
    .from('popup_candidates')
    .select('id, title, detected_dates, extracted_start')
    .eq('status', 'new')
    .is('extracted_start', null)
    .limit(MAX_CANDIDATES);
  if (error) return json({ ok: false, error: error.message }, 500);

  const out: Record<string, unknown>[] = [];

  for (const c of (rows ?? []) as {
    id: string;
    title: string;
    detected_dates: string[] | null;
  }[]) {
    if ((c.detected_dates ?? []).length > 0) continue;

    const line: Record<string, unknown> = { title: c.title.slice(0, 44) };
    try {
      // sort=sim, not date: measured 2026-08-07, relevance was 29/30 real
      // pop-ups against 9/30 for recency (see the naver-search header).
      const q = encodeURIComponent(`${c.title} 팝업`);
      const res = await fetch(
        `${API_HUB}/search/v1/blog?query=${q}&display=${MAX_POSTS_PER_CANDIDATE}&sort=sim&format=json`,
        {
          headers: {
            'X-NCP-APIGW-API-KEY-ID': id,
            'X-NCP-APIGW-API-KEY': secret,
          },
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!res.ok) {
        line.status = `search_${res.status}`;
        out.push(line);
        continue;
      }
      const data = (await res.json()) as { items?: { link: string }[] };

      const dates: string[] = [];
      const hours: string[] = [];
      let read = 0;

      for (const item of data.items ?? []) {
        const pv = postViewUrl(item.link);
        if (!pv) continue;
        try {
          const p = await fetch(pv, {
            headers: { 'User-Agent': UA },
            signal: AbortSignal.timeout(15000),
          });
          await sleep(POLITE_DELAY_MS);
          if (!p.ok) continue;
          const text = strip(await p.text());
          read++;
          for (const re of RANGES) dates.push(...(text.match(re) ?? []));
          hours.push(...(text.match(HOURS) ?? []));
        } catch {
          // A single unreadable post is not a failure for the candidate.
        }
      }

      const d = uniq(dates).slice(0, 6);
      const h = uniq(hours).slice(0, 3);
      line.posts_read = read;
      line.dates = d;
      line.hours = h;

      if (d.length || h.length) {
        const { error: upErr } = await supabase
          .from('popup_candidates')
          .update({
            detected_dates: d,
            // Kept as a note rather than a column: hours is nullable on popups
            // and a blog's opening time is the softest claim on the page.
            extract_notes: [
              'blog_hints',
              ...d.map((x) => `hint_date:${x}`),
              ...h.map((x) => `hint_hours:${x}`),
            ],
          })
          .eq('id', c.id);
        if (upErr) line.error = upErr.message.slice(0, 120);
      }
    } catch (e) {
      line.error = String(e).slice(0, 140);
    }
    out.push(line);
  }

  return json({ ok: true, checked: out.length, results: out });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
