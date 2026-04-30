# Design System

Living document. Update on every visual or token change.

## Direction

Modern AI dashboard. Reference points: Vercel, Linear, OpenAI/Anthropic console. Monochrome base + a single chromatic accent. Dark only.

## Brand

- **Primary `#0E0D0C`** — HappyRobot wordmark color. Warm near-black. Used for the logo tile, primary buttons (when on light surfaces), focus states.
- **Accent (`--chart-1`, `--ring`) `#F59E0B`** — Amber. Used for the "booked" series, primary chart highlight, focus rings, primary trend indicators.
- **Neutrals** — Stone family (`oklch(... ... 49)`), warmer than Zinc/Slate, harmonizes with the warm primary.

## Tokens

All theme tokens live in [app/globals.css](app/globals.css) as CSS variables, exposed to Tailwind via `@theme inline`.

Use semantic tokens — never raw hex in component code.

| Token | Use |
|---|---|
| `bg-background` / `text-foreground` | Page background and base text |
| `bg-card` / `text-card-foreground` | Card surfaces |
| `bg-primary` / `text-primary-foreground` | Primary CTAs, logo tile |
| `bg-muted` / `text-muted-foreground` | Subtle surfaces, secondary text |
| `bg-accent` / `text-accent-foreground` | Hover states on quiet chrome |
| `bg-destructive` | Errors, "failed verification" outcome |
| `border-border` | All separators |
| `ring-ring` | Focus outlines |
| `var(--chart-1)` … `var(--chart-5)` | Chart series, in priority order |

### Chart palette

| Var | Color | Semantic |
|---|---|---|
| `--chart-1` | `#F59E0B` (amber) | Primary / "booked" / accent series |
| `--chart-2` | stone-500-ish | Secondary series |
| `--chart-3` | stone-700-ish | Tertiary / "rejected" |
| `--chart-4` | stone-400-ish | Quaternary / "no_load" |
| `--chart-5` | stone-300-ish | Last fallback |
| `--destructive` | red | "failed_verification" only |

Outcome → chart-var mapping is centralized in [lib/colors.ts](lib/colors.ts). Don't duplicate elsewhere.

## Typography

- **Sans / heading:** Inter (loaded via `next/font/google` in [layout.tsx](app/layout.tsx) as `--font-sans`)
- Heading letter-spacing: `-0.01em` on `h1–h4` (set in `globals.css`)
- Tabular numerals (`tabular-nums`) on every metric value, every table number, every chart legend count

## Layout

- Outer container: `mx-auto max-w-[1600px] px-4` for header and main
- Content gap: `gap-4` between cards, `gap-6` for top-level sections inside a tab
- Cards: shadcn `<Card>` primitive — never hand-roll a styled `<div>`
- Card composition: `<CardHeader><CardTitle><CardDescription></CardHeader><CardContent>` — don't dump everything in `CardContent`
- Tab strip: centered (`<TabsList className="self-center">`)

## Components

### shadcn primitives (in `components/ui/`)

Installed via `npx shadcn@latest add <name>`. Always prefer the primitive over a styled div. Currently installed:

`button`, `card`, `chart`, `table`, `tabs`, `input`, `select`, `dropdown-menu`, `separator`, `label`, `badge`

When a primitive is missing, run `npx shadcn add` rather than building it.

### Custom primitives

- **[KpiCard](components/ui/KpiCard.tsx)** — label + value + optional hint + optional `children` slot for an inline mini-viz. Slot is pinned to the bottom of the card via `mt-auto`, so visualizations align across the row. Always renders inside a shadcn `Card`.

- **[MiniDonut](components/charts/MiniDonut.tsx)** — small ring with hoverable per-segment arcs. Each slice is its own `<path>` with `pointerEvents: "stroke"`; non-hovered slices fade to 40% opacity and a custom popover above the ring shows label + count + percent immediately. No legend — info is hover-only.

- **[SegBar](components/charts/SegBar.tsx)** — horizontal stacked bar with hover tooltips on each segment (label + count + %). The inline under-bar legend is opt-out via `showLegend={false}` — drop it when labels would overlap or when the surrounding context (title + hint) already conveys the breakdown.

- **[Bars / Donut / Line](components/charts/)** — Recharts wrappers using shadcn's `<ChartContainer>` so series colors come from `--chart-*` automatically. Strokes/fills/gridlines use `var(--muted-foreground)`, `var(--border)`, never hex.

## Conventions

- **Icons in buttons** use `data-icon="inline-start"` / `"inline-end"`; don't size them manually — components handle sizing via CSS
- **No `space-x-*` or `space-y-*`** — use `flex` + `gap-*`. For vertical stacks, `flex flex-col gap-*`
- **`size-*` when width and height match** — `size-10`, not `w-10 h-10`
- **Use `truncate`** instead of `overflow-hidden text-ellipsis whitespace-nowrap`
- **No manual `dark:` overrides** — semantic tokens already adapt
- **No raw colors** in components (`bg-blue-500` etc.) — use semantic tokens or `var(--chart-N)`

## Dark mode

`<html className="dark">` in [layout.tsx](app/layout.tsx). The `.dark` selector swaps every CSS variable in [globals.css](app/globals.css). Light vars are still defined; if light mode comes back, just remove the `dark` class and add a toggle.

## When extending

1. **New metric / KPI:** add a `KpiCard` with the appropriate `SegBar` or `MiniDonut` child. Reuse existing `lib/derive` helpers when possible; if you add one, keep the function pure and tested against `CallRow[]`.
2. **New chart:** wrap Recharts in `<ChartContainer config={...}>` + `<ChartTooltipContent />`. Pass series colors as `var(--chart-N)` derived from `lib/colors`.
3. **New shadcn component:** `npx shadcn@latest add <name>` from inside `frontend/`. Commit `components.json`, the new file, and the updated `package-lock.json` together.
4. **New token:** add the CSS variable in `:root` (and `.dark`) inside [globals.css](app/globals.css), then expose to Tailwind in the `@theme inline` block.
