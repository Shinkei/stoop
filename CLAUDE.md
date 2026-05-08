# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server → http://localhost:3000
npm run build      # Production build (SSR + client)
npm run start      # Serve built app
npm run typecheck  # Type-check without emit
npm run lint       # Run ESLint
npm run lint:fix   # Auto-fix lint issues
npm run format     # Format with Prettier
```

Node >=20 required.

## Architecture

**Stoop** is a mobile-first neighborhood marketplace (SolidStart + Supabase). The app is a learning project for SolidJS reactivity — component functions run once (no re-renders); only DOM nodes that read signals update.

### Entry Points

- `src/app.tsx` — Root component: Router, MetaProvider, Suspense boundary
- `src/entry-client.tsx` — Client hydration
- `src/entry-server.tsx` — SSR HTML template

### Routing

File-based routing via `src/routes/`. SolidStart auto-generates routes from this directory:

| File | Route |
|------|-------|
| `index.tsx` | `/` — Home feed (mock data, implemented) |
| `search.tsx` | `/search` |
| `sell.tsx` | `/sell` |
| `profile.tsx` | `/profile` |
| `manage.tsx` | `/manage` |
| `offers.tsx` | `/offers` |
| `item/[id].tsx` | `/item/:id` (access with `useParams()`) |

All routes should wrap content with `<MobileShell>`. Navigation uses `<A href="...">` from `@solidjs/router`.

### Layout Pattern

Every page uses `<MobileShell>` (390×844 mobile container with desktop wrapper) + `<TabBar>` (bottom nav with central FAB for `/sell`). See `src/components/layout/`.

### SolidJS Patterns vs React

| Task | Pattern |
|------|---------|
| Local state | `const [val, setVal] = createSignal(init)` |
| Derived values | `createMemo(() => computation())` |
| Side effects | `createEffect(() => { ... })` |
| Async/Suspense data | `createAsync(() => fetchFn())` |
| Conditional render | `<Show when={cond()} fallback={...}>` (not ternary) |
| Lists | `<For each={items()}>` (not `.map()`) |
| Server-only code | `"use server"` directive in functions |

Signal values are functions — read with `signal()`, not `signal`.

### Styling

Tailwind v4 with design tokens defined in `src/styles/app.css` via `@theme`. The design system source of truth is in `design-system.jsx` from the design export bundle.

**Color tokens** (CSS var → Tailwind utility):
| Token | Value | Usage |
|-------|-------|-------|
| `--color-ink` | `#0f1f17` | `bg-ink` — app background |
| `--color-card` | `#1f3028` | `bg-card` — elevated surfaces, inputs |
| `--color-lime` | `#9fe870` | `bg-lime` / `text-lime` — price, CTA, active |
| `--color-accent-soft` | `rgba(159,232,112,0.12)` | `bg-accent-soft` — badge backgrounds |
| `--color-cream` | `#f5f5f0` | `text-cream` — primary text |
| `--color-muted` | `rgba(245,245,240,0.6)` | `text-muted` — secondary text |
| `--color-faint` | `rgba(245,245,240,0.35)` | `border-faint` — disabled, secondary borders |
| `--color-hairline` | `rgba(245,245,240,0.08)` | `border-hairline` — separators |
| `--color-warning` | `oklch(0.78 0.12 80)` | `text-warning` — reserved status |
| `--color-danger` | `#ff5f57` | `text-danger` — destructive actions |

**Other tokens:** `font-display` / `font-ui` / `font-mono`, `rounded-{xs|sm|md|lg|xl|2xl|pill}`, `shadow-{sm|md|lg|cta}`, `ease-{default|spring|linear|emphasized}`.

**Reusable component classes:** `.btn-primary`, `.btn-secondary`, `.btn-pill`, `.chip`, `.chip-active`, `.price-badge`, `.stoop-card`, `.listing-card`, `.status-{active|reserved|draft}`, `.screen-title`, `.section-label`, `.divider`, `.cta-gradient`.

### Breakpoints (from design)

| Breakpoint | Width | Feed | Nav pattern |
|-----------|-------|------|-------------|
| mobile | 0–767 | 2-col | Bottom tab bar + center FAB |
| tablet | 768–1279 | 3-col | Top header + Sell button |
| desktop | 1280+ | 4-col | Top header + left sidebar + right filter rail |

### Data Layer

Supabase client singleton at `src/lib/supabase.ts`. Schema types auto-generated at `src/types/database.ts`. Three main tables: `profiles`, `listings`, `offers`.

Replace mock data in route components with `createAsync` + Supabase queries. Requires `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see `.env.example`).

### Path Alias

`~/*` maps to `src/*` (configured in `tsconfig.json`). Use for imports.
