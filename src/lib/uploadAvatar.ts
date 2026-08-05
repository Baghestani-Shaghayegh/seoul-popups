import * as ImagePicker from 'expo-image-picker';

import { getSupabase } from '@/lib/supabase';

const BUCKET = 'avatars';
const MAX_BYTES = 2 * 1024 * 1024; // matches the bucket's own limit
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Base64 → bytes, without a dependency.
 *
 * `atob` is not polyfilled by React Native, so whether it exists depends on the
 * Hermes build — it is present on web and absent on some native builds. Rather
 * than gamble, or pull in a tiny third-party package for fifteen lines
 * (SECURITY.md §6), decode it here. Used only when `atob` is missing.
 */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToBytes(input: string): Uint8Array {
  const clean = input.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array((clean.length * 3) >> 2);
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = B64.indexOf(clean[i]!);
    const b = B64.indexOf(clean[i + 1]!);
    const c = B64.indexOf(clean[i + 2]!);
    const d = B64.indexOf(clean[i + 3]!);
    out[o++] = (a << 2) | (b >> 4);
    if (c >= 0) out[o++] = ((b & 15) << 4) | (c >> 2);
    if (d >= 0) out[o++] = ((c & 3) << 6) | d;
  }
  return out.subarray(0, o);
}

function decode(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  return base64ToBytes(b64);
}

export interface AvatarUploadResult {
  /** New public URL, or null when the user cancelled. */
  url: string | null;
  error: string | null;
}

/**
 * Pick a photo and store it as this user's avatar.
 *
 * Why bytes and not a Blob: `fetch(uri).then(r => r.blob())` is the usual
 * suggestion and it silently uploads a ZERO-BYTE object in React Native,
 * because an RN Blob is a handle to native data rather than the data itself.
 * FormData does not compose with supabase-js (it sets its own body), and
 * passing the `file://` string stores the path as a text file. Handing
 * supabase-js an ArrayBuffer is the approach that actually works.
 *
 * `allowsEditing` + a 1:1 aspect gives the square crop the UI wants for free
 * and keeps a modern phone photo well under the bucket's 2 MB limit.
 */
export async function pickAndUploadAvatar(
  userId: string,
): Promise<AvatarUploadResult> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    return {
      url: null,
      error: 'Photo access is blocked — enable it in Settings.',
    };
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
    base64: true,
  });
  if (result.canceled) return { url: null, error: null };

  const asset = result.assets[0];
  if (!asset?.base64) {
    return { url: null, error: 'Could not read that photo — try another one.' };
  }

  // iOS can hand back HEIC. Fail with a sentence rather than a Storage 400.
  const contentType = asset.mimeType ?? 'image/jpeg';
  if (!ALLOWED.includes(contentType)) {
    return {
      url: null,
      error: 'Please choose a JPEG, PNG or WebP image.',
    };
  }

  const bytes = decode(asset.base64);
  if (bytes.byteLength > MAX_BYTES) {
    return { url: null, error: 'That photo is too large — try a smaller one.' };
  }

  const supabase = getSupabase();
  // One object per user forever: the storage policy requires the uid to be the
  // first path segment, and a fixed name means no orphans accumulate (nothing
  // purges this bucket).
  const path = `${userId}/avatar.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes as unknown as ArrayBuffer, {
      contentType, // required: without a Blob supabase-js cannot infer it, and
      // the bucket rejects application/octet-stream
      upsert: true,
    });
  if (error) return { url: null, error: error.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  // The path never changes, so the CDN and RN's Image cache would both keep
  // serving the old picture — "Change photo" would look broken. Bust it.
  return { url: `${data.publicUrl}?v=${Date.now()}`, error: null };
}
