-- 013 — RSS source support. (applied 2026-08-03)
--
-- Korean department-store sites all failed viability the same way: LCDC,
-- Hyundai and Lotte are JS-rendered and expose no per-event page or per-item
-- og:title to a plain fetch. Only Shinsegae's WordPress newsroom worked.
--
-- RSS is the escape hatch — a stable published format with a title and link per
-- item. NOTE: no feed is currently seeded. Google News RSS was tried and
-- removed: news.google.com/robots.txt is "User-agent: * / Disallow: /" with an
-- allowlist excluding /rss/, and our robots gate correctly blocked it. The
-- capability stays for a publisher whose robots.txt permits it.

alter table public.popup_sources
  add column if not exists source_type text not null default 'html'
    check (source_type in ('html', 'rss'));
