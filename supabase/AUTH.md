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

### Naver (NOT built yet — custom)

Supabase has **no native Naver provider**. It needs a custom flow: Naver OAuth
in-app → an Edge Function verifies the Naver token and mints a Supabase session
via the admin API. Real work; deferred.

### Apple (deferred)

Needs the paid Apple Developer Program ($99/yr) — bundle it with the iOS launch.
Create a Services ID + Sign in with Apple key, add the same Supabase callback,
paste into **Authentication → Providers → Apple**.

No redeploy needed — a button works as soon as its provider is enabled and the
redirect URL is allow-listed.
