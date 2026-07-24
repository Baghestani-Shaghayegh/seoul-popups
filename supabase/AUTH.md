# Auth setup

Email/password works out of the box once the project exists. Two things to
configure:

## Email confirmation

**Authentication → Providers → Email → "Confirm email"**

- **On** — new users get a confirmation email first; the app shows "check your
  email, then sign in".
- **Off** — sign-up logs the user straight in.

## Social OAuth

The **Kakao** and **Google** buttons are wired (PKCE + in-app browser); each
lights up once its provider is enabled. The app's redirect is the scheme
`seoulpopups://auth/callback`.

**First, once:** **Authentication → URL Configuration → Redirect URLs** → add
`seoulpopups://auth/callback`. Every provider below needs this.

### Kakao (recommended — Supabase-native, dominant in Korea)

1. [Kakao Developers](https://developers.kakao.com) → create an app.
2. **App Settings → App → Platform Key**: the **REST API key** is the client id;
   activate + copy the **Kakao Login Client Secret** for the client secret.
3. Add the Supabase callback `https://xkykpcjbnlihreikqonu.supabase.co/auth/v1/callback`
   as the **Kakao Login Redirect URI**.
4. **Product Settings → Kakao Login**: turn it **ON**; under **Consent Items**
   enable `profile_nickname` + `profile_image` (email needs a "Biz App", so you
   can skip `account_email` and enable **Allow users without an email** in
   Supabase).
5. **Supabase → Authentication → Providers → Kakao** → enable → paste the client
   id + secret → Save.

### Google (done)

Google Cloud OAuth client (**Web application**) with authorized redirect
`https://xkykpcjbnlihreikqonu.supabase.co/auth/v1/callback`; client id + secret
pasted into **Authentication → Providers → Google**.

### Naver (built — custom, needs a Naver app)

Supabase has **no native Naver provider**, so this uses a custom flow: the app
opens Naver login → Naver redirects to the public `naver-auth` Edge Function →
it verifies the profile, finds/creates the Supabase user, and bounces back to
the app with a one-time OTP the app redeems for a session. The button appears
once `EXPO_PUBLIC_NAVER_CLIENT_ID` is set.

1. [Naver Developers](https://developers.naver.com) → **Application → 애플리케이션 등록**.
2. Use **네이버 로그인**; request the **email** + nickname/profile scopes (email
   is required — we key users by it).
3. Set the **Callback URL** to the Edge Function:
   `https://xkykpcjbnlihreikqonu.supabase.co/functions/v1/naver-auth`
4. Copy the **Client ID** and **Client Secret**.
5. Put the Client ID in the app env: `EXPO_PUBLIC_NAVER_CLIENT_ID=<id>` (`.env`,
   and EAS env for cloud builds) — this reveals the Naver button.
6. Set the secret on the Edge Function (dashboard → Edge Functions → secrets, or
   CLI):
   ```sh
   supabase secrets set NAVER_CLIENT_ID=<id> NAVER_CLIENT_SECRET=<secret>
   ```
7. Also allow-list `seoulpopups://auth/callback` (the redirect step above).

Note: the Naver button + flow can't be exercised until steps 1–6 are done — it's
untested against real Naver, so verify on the dev build and tell me if the OTP
exchange needs tweaking (the magiclink OTP `type` is the likeliest thing).

### Apple (deferred)

Needs the paid Apple Developer Program ($99/yr) — bundle it with the iOS launch.
Create a Services ID + Sign in with Apple key, add the same Supabase callback,
paste into **Authentication → Providers → Apple**.

No redeploy needed — a button works as soon as its provider is enabled and the
redirect URL is allow-listed.
