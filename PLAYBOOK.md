# Engineering Playbook

How we write code in this repo. Follow it for every feature; update it when a
decision changes. Security rules live in [SECURITY.md](SECURITY.md); what to
build and in what order lives in [FEATURES.md](FEATURES.md).

---

## 1. Architecture

```
app/   → routes only (Expo Router: file = route). Screens compose components
         and call hooks. No business logic, no direct data access.
src/   → everything shared:
  components/   dumb, reusable UI (props in, callbacks out; no data fetching)
  hooks/        data + derived state (usePopups, usePopup, useHomeSections)
  lib/          pure logic (dates, status, routing math, supabase client)
  data/         mock seed data (dies when Supabase is wired)
  types/        domain types (Popup, Neighborhood, Category)
  constants/    theme + static metadata
```

**Rules that keep this clean:**

- **Screens never touch the data source.** They call hooks. The hooks in
  `src/hooks/usePopups.ts` are the _only_ mock → Supabase swap point; when we
  go live, only that file changes.
- **Pure logic goes in `src/lib/`** as plain functions (no React imports).
  That's what makes it testable and reusable (`popupStatus.ts`, `route.ts`).
- **Components are presentational.** If a component needs data, lift the fetch
  to the screen/hook and pass props down.
- **One concept, one home.** Status logic lives in `popupStatus.ts` only; date
  helpers in `format.ts` only; colors in `constants/theme.js` only. Never
  re-derive these locally in a component (that's how the PopupCard
  ending-soon bug happened).

## 2. TypeScript

- `strict` stays on. No `any`, no `@ts-ignore`; if you must override, use
  `@ts-expect-error` with a one-line reason.
- Model domain values as **union types + a runtime array** (see
  `Neighborhood` / `NEIGHBORHOODS`) so you get both compile-time safety and
  something to `.map()` / validate against.
- Narrow unknown input (route params, JSON, API rows) with a validation step
  before casting — never a bare `as`.
- Exported functions get explicit return types; internals can infer.
- Dates are **ISO `YYYY-MM-DD` strings** in the domain layer (they compare
  lexicographically). Convert to `Date` only inside `lib/` helpers.

## 3. React / React Native

- Function components only; hooks at top level; a hook call must never be
  conditional.
- Derive, don't sync: prefer `useMemo` over copying data into state. State is
  for things the user changed.
- Keep an eye on `react-hooks/exhaustive-deps` — fix the cause, only disable
  with a comment explaining why (see the join-key pattern in `usePopups`).
- Lists use `FlatList` (never `.map` inside a `ScrollView` for long lists) and
  a stable `keyExtractor`.
- Screens in tabs **stay mounted** — params can change on a mounted screen.
  Consume params via effects and clear them after use (see `discover.tsx`).
- Every async data path renders all three states: **loading, error, empty**.
  The hooks already return `{ loading, error }` — screens must use them once
  Supabase lands.
- Images always go through `PopupImage` (placeholder + broken-URL fallback).
- Pressables get press feedback:
  `style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}`.
- Add `accessibilityRole` / `accessibilityLabel` to interactive elements that
  aren't self-describing (icon-only buttons especially).

## 4. Styling

- NativeWind classes for everything static; inline `style` only for values
  that are computed at runtime (safe-area insets, press opacity).
- **Never hardcode hex.** Tailwind classes (`text-brand`) and runtime colors
  (`colors.brand.DEFAULT`) both come from `src/constants/theme.js`.
- Reuse the spacing/radius idioms already in the codebase (`rounded-2xl`
  cards, `px-4` screen gutters) instead of inventing new ones per screen.

## 5. Naming & files

- Components `PascalCase.tsx`, hooks `useThing.ts`, lib modules `camelCase.ts`.
- One component per file; co-locate by feature (`components/popups/`,
  `components/plan/`), generic bits in `components/ui/`.
- Import shared code via the `@/` alias, never `../../..`.
- Name things by domain meaning (`endingLabel`, `isActiveOn`), not by
  implementation (`getDiffDays2`).

## 6. Definition of done (every change)

1. `npm run lint` — 0 errors, 0 warnings
2. `npm run typecheck` — clean
3. `npx prettier --check .` — clean (or run `npm run format`)
4. `npx expo-doctor` — 18/18 (run when deps/config changed)
5. Manually exercise the changed screens in Expo Go, including the empty/error
   paths you touched.
6. Security checklist in [SECURITY.md](SECURITY.md) if the change touches
   data, params, links, auth, or deps.

## 7. Git

- Small, single-purpose commits; each feature/fix is its own commit with a
  message explaining **why**, not just what.
- Push after committing so GitHub stays current.
- Never commit `.env` (only `.env.example` with placeholders), keys, or
  generated `/ios` `/android` folders — `.gitignore` already covers these;
  don't fight it.

## 8. Dependencies

- We're **pinned to Expo SDK 54** (Expo Go on the phone). Install libraries
  with `npx expo install <pkg>` so versions match the SDK; don't bump
  `expo`/`react-native` majors casually.
- Before adding a dependency: does `expo-*` or stdlib already cover it? Every
  package is attack surface and upgrade burden.
- After any install: `npx expo-doctor` + restart with `npx expo start -c` if
  things look stale (Metro cache gotcha).

## 9. Testing (as logic grows)

UI is verified manually in Expo Go for now. When we wire Supabase and the
route/date logic grows, add `jest-expo` + `@testing-library/react-native` and
start with the pure `src/lib/` functions (`popupStatus`, `route`, `dateRanges`)
— they're already dependency-free and cheapest to test. New pure-logic modules
should ship with tests from then on.
