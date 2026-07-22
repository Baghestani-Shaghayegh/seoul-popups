import { Linking } from 'react-native';

/**
 * Open an external link from popup data. Only https is allowed — never open
 * arbitrary schemes (javascript:, file:, custom app schemes) that could arrive
 * through the database (SECURITY.md §4).
 */
export function openExternalUrl(url: string | undefined): void {
  if (typeof url !== 'string' || !url.startsWith('https://')) return;
  void Linking.openURL(url);
}
