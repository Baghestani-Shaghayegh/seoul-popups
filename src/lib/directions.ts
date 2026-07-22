import { Linking, Platform } from 'react-native';

/**
 * Walking-directions deep links. In Korea, Google/Apple Maps can't do real
 * walking routes — Naver and Kakao can — so we offer those first and fall back
 * to Apple/Google (which always work) for visitors without a Korean map app.
 *
 * SECURITY.md §4: only https / nmap / kakaomap URLs may ever be opened, and we
 * validate the scheme before every openURL — never trust a raw string.
 */

// Naver's URL scheme requires the calling app's id as `appname`.
const APP_ID = 'com.mgnradar.seoulpopups';

const ALLOWED_SCHEMES = ['https:', 'nmap:', 'kakaomap:'] as const;

export type DirectionsProvider = 'naver' | 'kakao' | 'system';

export interface DirectionsTarget {
  latitude: number;
  longitude: number;
  name: string;
}

function schemeOf(url: string): string | null {
  const m = /^([a-z][a-z0-9+.-]*:)/i.exec(url);
  return m ? m[1].toLowerCase() : null;
}

function isAllowed(url: string): boolean {
  const s = schemeOf(url);
  return s !== null && (ALLOWED_SCHEMES as readonly string[]).includes(s);
}

/**
 * Try each candidate in order, opening the first that succeeds. App-scheme
 * links (nmap/kakaomap) come first; if the app isn't installed openURL
 * rejects and we fall through to the https web link. On web we skip the
 * app schemes entirely (there's no native app to hand off to).
 */
async function openFirst(candidates: string[]): Promise<void> {
  const urls = candidates.filter(
    (u) => isAllowed(u) && (Platform.OS !== 'web' || schemeOf(u) === 'https:'),
  );
  for (const url of urls) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // not installed / can't handle it — try the next candidate
    }
  }
}

function naverCandidates(t: DirectionsTarget): string[] {
  const name = encodeURIComponent(t.name);
  return [
    // start omitted → Naver uses the device's current location
    `nmap://route/walk?dlat=${t.latitude}&dlng=${t.longitude}&dname=${name}&appname=${APP_ID}`,
    `https://map.naver.com/p/directions/-/${t.longitude},${t.latitude},${name}/-/walk`,
  ];
}

function kakaoCandidates(t: DirectionsTarget): string[] {
  const ep = `${t.latitude},${t.longitude}`;
  return [
    `kakaomap://route?ep=${ep}&by=foot`,
    `https://m.map.kakao.com/scheme/route?ep=${ep}&by=foot`,
  ];
}

function systemCandidate(t: DirectionsTarget): string[] {
  const dest = `${t.latitude},${t.longitude}`;
  const name = encodeURIComponent(t.name);
  // dirflg=w / travelmode=walking so even the fallback opens in walking mode
  return Platform.OS === 'ios'
    ? [`https://maps.apple.com/?daddr=${dest}&dirflg=w&q=${name}`]
    : [
        `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=walking`,
      ];
}

/** Open walking directions to `target` in the chosen map app. */
export function openDirections(
  provider: DirectionsProvider,
  target: DirectionsTarget,
): Promise<void> {
  switch (provider) {
    case 'naver':
      return openFirst(naverCandidates(target));
    case 'kakao':
      return openFirst(kakaoCandidates(target));
    case 'system':
      return openFirst(systemCandidate(target));
  }
}

/** Label for the always-works option, which differs by platform. */
export const SYSTEM_MAP_LABEL =
  Platform.OS === 'ios' ? 'Apple Maps' : 'Google Maps';
