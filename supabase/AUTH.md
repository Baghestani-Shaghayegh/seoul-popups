# Auth setup

Email/password works out of the box once the project exists. Two things to
configure:

## Email confirmation

**Authentication → Providers → Email → "Confirm email"**

- **On** — new users get a confirmation email first; the app shows "check your
  email, then sign in".
- **Off** — sign-up logs the user straight in.

## Apple / Google OAuth

The buttons are wired (PKCE + in-app browser); they light up once the providers
are enabled. The app's redirect is the scheme `seoulpopups://auth/callback`.

1. **Authentication → URL Configuration → Redirect URLs** → add
   `seoulpopups://auth/callback`.
2. **Google** — in Google Cloud, create an **OAuth client (Web)**; set the
   authorized redirect URI to your Supabase callback
   `https://xkykpcjbnlihreikqonu.supabase.co/auth/v1/callback`; paste the client
   id + secret into **Authentication → Providers → Google**.
3. **Apple** — create a **Services ID** and **Sign in with Apple key** in the
   Apple Developer portal, add the same Supabase callback, and paste the values
   into **Authentication → Providers → Apple**. (Apple sign-in on a real iPhone
   also needs the entitlement in the native build.)

No code change or redeploy is needed — the buttons work as soon as a provider
is enabled and the redirect URL is allow-listed.
