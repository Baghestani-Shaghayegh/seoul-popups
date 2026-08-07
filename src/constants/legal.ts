/**
 * Public legal + support pages, served by GitHub Pages from `docs/` on main
 * (repo Settings → Pages → Source: main / docs).
 *
 * These are not decoration: App Store Connect requires a reachable privacy
 * policy URL and support URL before a build can be submitted, and Guideline
 * 5.1.1(v) expects the deletion route to be documented as well as implemented.
 * They must stay live for as long as the app is listed — a 404 here is grounds
 * for rejection on its own.
 *
 * Keep in sync with docs/index.html and docs/privacy.html.
 */
const BASE = 'https://baghestani-shaghayegh.github.io/seoul-popups';

export const PRIVACY_POLICY_URL = `${BASE}/privacy.html`;
export const SUPPORT_URL = `${BASE}/`;
