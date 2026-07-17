# Seoul Popups

A mobile discovery app for foreigners visiting Seoul — find, save, and reserve
pop-up stores. **English-first**, with subway directions (line, exit, walk time)
and a location-based "Plan my day" trip planner.

## Stack

- **Expo** (SDK 54) + **Expo Router** (file-based routing)
- **React Native** 0.81 / React 19
- **NativeWind v4** (Tailwind CSS for React Native)
- **Supabase** (backend / data)
- **Google Maps API** (map + routing — coming)

## Getting started

```bash
npm install
npx expo start
```

Then scan the QR code with the **Expo Go** app (must support SDK 54), or press
`i` / `a` for a simulator.

> **Note:** this project is pinned to **Expo SDK 54** to match the Expo Go app
> in use. Don't bump the SDK without confirming Expo Go supports the new version.

### Environment

Copy `.env.example` to `.env` and add your Supabase keys:

```bash
cp .env.example .env
```

Until keys are set, the app runs on mock data (`src/data/mockPopups.ts`).

## Scripts

| Command             | Description                    |
| ------------------- | ------------------------------ |
| `npm start`         | Start the Expo dev server      |
| `npm run ios`       | Start + open iOS simulator     |
| `npm run android`   | Start + open Android emulator  |
| `npm run lint`      | Lint with ESLint (Expo config) |
| `npm run format`    | Format with Prettier           |
| `npm run typecheck` | Type-check with TypeScript     |

## Docs

- **[FEATURES.md](FEATURES.md)** — roadmap; source of truth for what to build next
- **[PLAYBOOK.md](PLAYBOOK.md)** — how we write code here (conventions, definition of done)
- **[SECURITY.md](SECURITY.md)** — threat model + security checklists
- **[CONTENT.md](CONTENT.md)** — where popup data comes from + the entry
  workflow (with `supabase/` for the schema + policies)

## Project structure

```
app/                     # Expo Router routes (file = route)
  _layout.tsx            # Root stack; loads global.css, providers
  (tabs)/                # Bottom-tab group
    _layout.tsx          #   Tabs: Home · Discover · Map · Saved
    index.tsx            #   Home (curated landing)
    discover.tsx         #   Discover (full list + search + filters)
    map.tsx              #   Map (placeholder)
    saved.tsx            #   Saved (placeholder, Phase 1)
  popup/[id].tsx         # Popup detail (dynamic route)
  plan.tsx               # "Plan my day" trip planner
  +not-found.tsx         # Fallback for unmatched routes
src/
  components/ui/         # Generic UI primitives (Chip, BottomSheet)
  components/home/       # Home sections (SearchBar, AreaGrid, ...)
  components/popups/     # Popup components (PopupCard, filter sheets, ...)
  components/plan/       # Plan-my-day components
  hooks/                 # Data hooks (usePopups, usePopup, useHomeSections)
  lib/                   # supabase client, dates, status, route math
  data/                  # Mock seed data
  types/                 # Domain types
  constants/             # theme (colors), neighborhood metadata
```

The `@/*` import alias maps to `src/*`.

### Data layer

Screens read from `usePopups()`, which currently returns mock data. To go live,
swap only the hook body for a Supabase query — keep the `{ popups, loading,
error }` return shape and the screens won't need changes.

## Roadmap

See **[FEATURES.md](FEATURES.md)**. Short version: the full UI (Home, Discover,
detail, Plan my day) is built on mock data — next step is wiring Supabase.
