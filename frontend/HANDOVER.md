# Frontend Handover

Living context doc. Update on every session.

## Project at a glance

Next.js 14 dashboard for HappyRobot's inbound carrier-sales voice agent. Reads metrics + call rows from a FastAPI backend (Railway) via three thin proxy routes, polls every 30s, renders four tabs of analytics.

Deployed on Vercel. Root Directory: `frontend`. Env vars: `BACKEND_API_URL`, `BACKEND_API_KEY`.

## Stack

- **Next.js 14.2.35** — App Router, client-side rendering for the dashboard page
- **React 18**
- **Tailwind CSS 4** — `@import "tailwindcss"` in [globals.css](app/globals.css), tokens defined in `@theme inline`. **Not** v3 — see Quirks below.
- **shadcn/ui 4** — CLI installs primitives into [components/ui/](components/ui/). Built on **@base-ui/react** (the post-Radix base). Components.json present.
- **Recharts 3** — wrapped by shadcn's `ChartContainer` for theme-aware colors
- **lucide-react 1.14.0** — icon set (note: 1.x is current upstream)
- **No `next-themes`** — dark mode is forced via `<html className="dark">`

Node ≥ 20 required (shadcn 4 deps). Local dev: `nvm use 22`.

## Architecture

```
app/
  layout.tsx          html.dark + Inter font
  page.tsx            data fetch + 30s polling + tabs
  globals.css         Tailwind v4 import + @theme + CSS vars (light + .dark)
  api/
    metrics/          proxy to backend GET /metrics
    calls/            proxy to backend GET /calls
    loads/            proxy to backend GET /loads (unused by UI today)
components/
  ui/                 shadcn primitives (button, card, chart, table, tabs, etc.)
  charts/             Bars, Donut, Line (Recharts wrappers); MiniDonut, SegBar (custom SVG)
  tabs/               OverviewTab, NegotiationsTab, CarriersTab, CallLogTab
lib/
  backend.ts          fetch helper for backend API
  colors.ts           OUTCOME_COLORS / SENTIMENT_COLORS maps to var(--chart-*)
  derive.ts           data transforms; clampedTime() helper for future-date sort
  format.ts           fmtPct / fmtNum / fmtUsd / fmtDuration / fmtDateTime
  types.ts            CallRow, MetricsResponse
tailwind.config.ts    minimal — darkMode + content; tokens live in CSS
```

### Data flow

1. `page.tsx` mounts → `refresh()` fetches `/api/metrics` + `/api/calls?limit=500`
2. `setInterval(refresh, 30_000)` — paused when `document.visibilityState !== "visible"`
3. State propagates to four tab components; each derives its own slices via `lib/derive`

## Brand & theme

See [design.md](./design.md) for the full design system. Highlights:

- Primary: `#0E0D0C` (HappyRobot wordmark, warm near-black)
- Accent / chart-1 / ring: `#F59E0B` (amber)
- Neutrals: stone family in `oklch(... ... 49)`
- Dark mode only

## Known quirks

- **Tailwind v4 with Next 14:** uses `@tailwindcss/postcss` plugin. The v3 → v4 jump was mandatory: shadcn 4 ships v4-only utilities (`data-active:`, `size-3!`, `[&_svg]:size-3!`, `rounded-4xl`) that v3.4 silently no-ops. The shadcn `tabs.tsx` template still ships `data-horizontal:` selectors that don't match base-ui's `data-orientation="horizontal"` attribute — patched to `data-[orientation=horizontal]:` after running `add tabs`.

- **macOS case-insensitive filesystem:** shadcn primitives are lowercase (`card.tsx`, `tabs.tsx`). Custom components must avoid PascalCase collisions or `shadcn add` will prompt to overwrite. We renamed the original `Card.tsx` → `AppCard.tsx` (later deleted) and `Tabs.tsx` → `AppTabs.tsx` (later deleted).

- **Synthetic seed has future timestamps:** the seed-generator in [seed-generator/generate.py](../seed-generator/generate.py) anchors `created_at` to May 2026 (up to a month ahead). The frontend uses `clampedTime()` in [derive.ts](lib/derive.ts) to clamp future dates to `Date.now()` for **sort** comparisons only — display still shows the raw timestamp. Tie-breaker: `id` desc so a brand-new real call beats clamped synthetic rows.

- **Call Log preview height:** the right card in OverviewTab uses a `relative` wrapper + `lg:absolute lg:inset-0` Card so the wrapper contributes 0 to grid row sizing and the row is dictated by the left column. Without this, the 30-row list would inflate the grid and force the page to scroll.

- **Polling cadence is 30s.** Defined as `REFRESH_INTERVAL_MS` in [page.tsx](app/page.tsx). Rationale: avg call duration is ~3 min, 30s lands within one call's worth of latency without piling load on Railway. Chart polish ideas: server-sent events from FastAPI would be the right next step if real-time becomes important.

## Recent work log

Newest at top. Keep entries short — link to commits for detail.

- **(this commit)** — "Powered by HappyRobot" badge added to the top-right of the header. Italic "Powered by" + dark `bg-primary` (#0E0D0C) tile containing `happyrobot-mark.svg` (already white) and `happyrobot-wordmark.svg` rendered white via `filter: brightness(0) invert(1)`. Hidden below `sm` to avoid header crowding on mobile.
- **`7bc28a6`** — Header chrome swapped to "ACME Logistics" branding for the demo. Recreated as styled text (Inter Black amber `ACME` + light italic `Logistics`), no raster asset; only the dashboard header changed — HappyRobot wordmark/mark SVGs in `public/` and the rest of the chrome stay as-is.
- **`9806559`** — Rounds KPI labels back to terse `1` / `2` / `3` and inline legend re-enabled, so bars align across all 4 KPI cards again. Hover tooltips still on. (Iteration on the previous two commits.)
- **`5b04e54`** — SegBar gets hover tooltips on every segment (label/count/%); `showLegend` prop opts out of the inline under-bar legend.
- **`290010f`** — Spelled out "round"/"rounds" in negotiation rounds KPI legend
- **`1aa58ca`** — Clamp future `created_at` for Call Log sort + id tie-breaker
- **`12e994f`** — 30s polling with tab-visibility pause
- **`50d2e03`** — Donut hover tooltip (React state, not `<title>`); KPI bars lifted; Call Log restored after `items-start` collapse
- **`895bc34`** — MiniDonut as per-segment SVG arc paths; KPI viz at bottom via `mt-auto`
- **`f21b9bb`** — Bound Call Log height to left column (`relative` wrapper + `absolute` card); ring-only donut
- **`d955baf`** — Centered tabs; mini visualizations in KPIs; scrollable Call Log
- **`612975e`** — Dark-only; widened content; redesigned Overview to 4 KPIs + Call Volume + Call Log
- **`cc2ddb0`** — Fixed Tabs `data-[orientation=horizontal]:` selectors; donut legend overflow
- **`aed9fc1`** — Tailwind 3.4 → 4.2 upgrade (mandatory for shadcn 4)
- **`476bde1`** — Migrated to shadcn primitives (Card/Tabs/Table/Input/Select); deleted custom AppCard/AppTabs and dead Sidebar/PageHeader/Footer
- **`b2fc2c5`** — Initial shadcn install + chart refactor + brand alignment

## Open follow-ups

- Negotiations and Carriers tabs still use the older Card composition pattern but no inline mini-viz; could add SegBars / MiniDonuts there for consistency
- Theme toggle is gone, but the dark CSS variables in [globals.css](app/globals.css) are still defined — could be repurposed if light mode comes back
- The `/api/loads` route exists but no UI consumes it
- `lucide-react@1.14.0` is current upstream but the exports list is huge; tree-shaking is fine via per-icon imports

## Local dev

```
cd frontend
nvm use 22
npm run dev        # http://localhost:3000
npm run build      # production build
```
