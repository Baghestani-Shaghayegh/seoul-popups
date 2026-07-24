import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Custom Naver OAuth — Supabase has no native Naver provider. This function is
// the redirect target Naver calls after the user approves. It exchanges the
// code for a Naver profile, finds-or-creates the matching Supabase user, mints
// a one-time login (magiclink OTP), and bounces back to the app's scheme with
// { email, otp }. The app then calls verifyOtp() to get a real session.
//
// Deploy with verify_jwt = false (Naver calls it unauthenticated). Secrets:
//   NAVER_CLIENT_ID, NAVER_CLIENT_SECRET  (from the Naver Developers app)
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are injected automatically.

const APP_REDIRECT = 'seoulpopups://auth/callback';

function toApp(params: Record<string, string>): Response {
  const qs = new URLSearchParams(params).toString();
  return new Response(null, {
    status: 302,
    headers: { Location: `${APP_REDIRECT}?${qs}` },
  });
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') ?? '';
  if (!code) return toApp({ error: 'missing_code', provider: 'naver' });

  const clientId = Deno.env.get('NAVER_CLIENT_ID');
  const clientSecret = Deno.env.get('NAVER_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    return toApp({ error: 'naver_not_configured', provider: 'naver' });
  }

  try {
    // 1. Exchange the code for a Naver access token.
    const tokenRes = await fetch(
      'https://nid.naver.com/oauth2.0/token?' +
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code,
          state,
        }),
    );
    const token = await tokenRes.json();
    if (!token.access_token) {
      return toApp({ error: 'naver_token_failed', provider: 'naver' });
    }

    // 2. Fetch the Naver profile.
    const meRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const me = await meRes.json();
    const profile = me?.response;
    const email: string | undefined = profile?.email;
    if (!email) {
      // Naver didn't share an email (scope not granted) — we key users by email.
      return toApp({ error: 'naver_no_email', provider: 'naver' });
    }

    // 3. Find or create the Supabase user for this email.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const created = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: profile?.nickname,
        avatar_url: profile?.profile_image,
        provider: 'naver',
      },
    });
    // Ignore "already registered" — that just means the user exists.
    if (
      created.error &&
      !/already been registered|already exists/i.test(created.error.message)
    ) {
      return toApp({ error: 'user_create_failed', provider: 'naver' });
    }

    // 4. Mint a one-time login the app can redeem for a session.
    const link = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    const otp = link.data?.properties?.email_otp;
    if (link.error || !otp) {
      return toApp({ error: 'link_failed', provider: 'naver' });
    }

    return toApp({ email, otp, provider: 'naver' });
  } catch {
    return toApp({ error: 'naver_unexpected', provider: 'naver' });
  }
});
