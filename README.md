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

## Project structure

```
app/                     # Expo Router routes (file = route)
  _layout.tsx            # Root stack; loads global.css, providers
  (tabs)/                # Bottom-tab group
    _layout.tsx          #   Tabs: Discover + Map
    index.tsx            #   Discover screen (list + filters)
    map.tsx              #   Map screen (placeholder)
  popup/[id].tsx         # Popup detail (dynamic route)
  +not-found.tsx         # Fallback for unmatched routes
src/
  components/ui/         # Generic UI primitives (Chip)
  components/popups/     # Feature components (PopupCard, NeighborhoodFilter)
  hooks/                 # Data hooks (usePopups)
  lib/                   # supabase client, formatting helpers
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

- [x] Project structure + tooling
- [x] Discover screen (mock data)
- [x] Popup detail screen
- [ ] Wire Supabase
- [ ] Map screen (clustered pins, "Plan my day" route)
- [ ] In-app reservations
