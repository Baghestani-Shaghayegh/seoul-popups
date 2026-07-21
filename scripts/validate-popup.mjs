#!/usr/bin/env node
// Pre-publish validation gate for a popup row.
//
// Checks a drafted popup against the CONTENT.md §3 rules and the
// supabase/schema.sql constraints BEFORE it goes live — the automated half of
// "trustworthy data". Errors block publish; warnings are judgment calls.
//
// Usage:
//   node scripts/validate-popup.mjs path/to/popup.json
//   cat popup.json | node scripts/validate-popup.mjs
//   node scripts/validate-popup.mjs path/to/popups.json   # array also OK
//
// The JSON uses the camelCase Popup shape (see src/types/popup.ts): name,
// tagline, description, neighborhood, category, imageUrl, startDate, endDate,
// hours, subway {line, station, exit, walkMinutes}, latitude, longitude,
// reservable, plus optional instagramUrl / websiteUrl / reservationUrl /
// sourceUrl / sourceName. Exit code 0 = all valid, 1 = at least one error.

import { readFileSync } from 'node:fs';

const NEIGHBORHOODS = ['Seongsu', 'Hongdae', 'Gangnam'];
const CATEGORIES = ['Fashion', 'Beauty', 'Food', 'Art', 'Lifestyle'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const today = new Date().toISOString().slice(0, 10);

function isHttps(v) {
  return typeof v === 'string' && v.startsWith('https://');
}
function nonEmpty(v) {
  return typeof v === 'string' && v.trim().length > 0;
}
function validDate(v) {
  return DATE_RE.test(v) && !Number.isNaN(Date.parse(v));
}

/** Returns { errors: string[], warnings: string[] } for one popup. */
function validatePopup(p) {
  const errors = [];
  const warnings = [];
  const err = (m) => errors.push(m);
  const warn = (m) => warnings.push(m);

  for (const f of ['name', 'tagline', 'description', 'hours']) {
    if (!nonEmpty(p[f])) err(`${f} is required and must be non-empty`);
  }

  if (!NEIGHBORHOODS.includes(p.neighborhood))
    err(`neighborhood must be one of ${NEIGHBORHOODS.join(', ')}`);
  if (!CATEGORIES.includes(p.category))
    err(`category must be one of ${CATEGORIES.join(', ')}`);

  if (!isHttps(p.imageUrl)) err('imageUrl must be an https:// URL');
  if (typeof p.imageUrl === 'string' && p.imageUrl.includes('unsplash.com'))
    warn('imageUrl is an Unsplash placeholder — replace with an official photo');
  for (const f of ['instagramUrl', 'websiteUrl', 'reservationUrl', 'sourceUrl']) {
    if (p[f] != null && !isHttps(p[f])) err(`${f}, if set, must be https://`);
  }
  if (!p.sourceUrl) warn('sourceUrl missing — needed to re-verify this popup later');

  if (!validDate(p.startDate)) err('startDate must be YYYY-MM-DD');
  if (!validDate(p.endDate)) err('endDate must be YYYY-MM-DD');
  if (validDate(p.startDate) && validDate(p.endDate) && p.endDate < p.startDate)
    err('endDate must be on or after startDate');
  if (validDate(p.endDate) && p.endDate < today)
    warn(`already ended (${p.endDate}) — CONTENT.md wants a week+ of run left`);

  const s = p.subway ?? {};
  for (const f of ['line', 'station', 'exit']) {
    if (!nonEmpty(s[f])) err(`subway.${f} is required`);
  }
  if (!Number.isInteger(s.walkMinutes) || s.walkMinutes < 0)
    err('subway.walkMinutes must be an integer >= 0');
  if (s.walkMinutes > 20) warn(`subway.walkMinutes is ${s.walkMinutes} — unusually far, double-check`);

  if (typeof p.latitude !== 'number' || p.latitude < -90 || p.latitude > 90)
    err('latitude must be a number between -90 and 90');
  if (typeof p.longitude !== 'number' || p.longitude < -180 || p.longitude > 180)
    err('longitude must be a number between -180 and 180');
  // Seoul sanity box — catches swapped or wrong coordinates.
  if (typeof p.latitude === 'number' && (p.latitude < 37.4 || p.latitude > 37.7))
    warn(`latitude ${p.latitude} is outside Seoul — verify the pin`);
  if (typeof p.longitude === 'number' && (p.longitude < 126.7 || p.longitude > 127.2))
    warn(`longitude ${p.longitude} is outside Seoul — verify the pin`);

  if (p.reservable != null && typeof p.reservable !== 'boolean')
    err('reservable must be a boolean');

  const sentences = String(p.description ?? '').split(/[.!?](\s|$)/).filter((x) => x.trim()).length;
  if (sentences > 5) warn('description is long — CONTENT.md suggests 2–4 sentences');

  return { errors, warnings };
}

function main() {
  const arg = process.argv[2];
  const raw = arg ? readFileSync(arg, 'utf8') : readFileSync(0, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error(`Could not parse JSON: ${e.message}`);
    process.exit(1);
  }
  const rows = Array.isArray(data) ? data : [data];

  let hadError = false;
  rows.forEach((p, i) => {
    const label = p?.name ? `"${p.name}"` : `row ${i + 1}`;
    const { errors, warnings } = validatePopup(p ?? {});
    if (errors.length) hadError = true;
    if (!errors.length && !warnings.length) {
      console.log(`✓ ${label} — valid`);
      return;
    }
    console.log(`${errors.length ? '✗' : '⚠'} ${label}`);
    errors.forEach((m) => console.log(`   ✗ ${m}`));
    warnings.forEach((m) => console.log(`   ⚠ ${m}`));
  });

  console.log(
    hadError
      ? '\nBLOCKED — fix the ✗ errors before publishing.'
      : '\nOK to publish (review any ⚠ warnings first).',
  );
  process.exit(hadError ? 1 : 0);
}

main();
