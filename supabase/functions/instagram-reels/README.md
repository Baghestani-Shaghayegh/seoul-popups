# `instagram-reels` Edge Function

Fetches @mgn.radar's recent Instagram media and returns the safe public fields
the Reel screen needs. **The Instagram token lives here as a secret, never in
the app** (SECURITY.md §1). Response shape:

```jsonc
{ "configured": true, "reels": [
  { "id", "caption", "mediaType", "imageUrl", "permalink", "timestamp" }
] }
```

Until the token secret is set it returns `{ "configured": false, "reels": [] }`
and the app shows a "coming soon" state. Deploy is already done (it redeploys on
every `deploy_edge_function`); the remaining work is the Meta setup below.

## One-time Meta setup (needs the @mgn.radar login)

Uses **Instagram API with Instagram Login** (the 2024+ replacement for the
retired Basic Display API). No Facebook Page required.

1. **@mgn.radar must be a Professional account** — in the Instagram app:
   Settings → Account type → switch to **Business** or **Creator**.
2. Go to **developers.facebook.com** → **My Apps → Create App** → use case
   **"Other" → Business**, name it (e.g. "Seoul Popups Reels").
3. In the app dashboard: **Add product → Instagram → set up**, choose
   **"Instagram API with Instagram Login"**.
4. Under **Instagram → API setup with Instagram Login**, add @mgn.radar and
   generate a **long-lived access token** (or run the OAuth flow and exchange
   for a long-lived token — the dashboard has a generator).
5. Copy the long-lived token.

## Set the secret

Dashboard → **Edge Functions → Manage secrets** → add:

```
INSTAGRAM_ACCESS_TOKEN = <the long-lived token>
```

Or via CLI: `supabase secrets set INSTAGRAM_ACCESS_TOKEN=<token>`.

The Reel tab goes live on the next app load — no redeploy needed.

## Maintenance

- **Long-lived tokens expire in ~60 days.** Refresh before then via
  `GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=<token>`
  and update the secret. (A scheduled Edge Function could automate this later.)
- To go beyond your own testers in production, Meta may require **app review**
  for the `instagram_business_basic` scope — do this before a public launch.
