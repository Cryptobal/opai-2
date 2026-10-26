# OPAI Design System

> The single source of truth for designing anything inside the **OPAI** brand — the ERP for private-security companies.

**Product:** OPAI Suite — ERP + AI SaaS for private security companies in Chile (`opai.gard.cl` / `opai.cl`).  
**Parent company:** Gard Security.  
**Surfaces:** Marketing website (`opai.cl`), Desktop ERP (Next.js web app), Mobile PWAs (Capacitor iOS/Android wrappers) for four distinct user roles: Guardia (guard), Supervisor, Cliente (client portal), Terreno / Marcación (field kiosk).

---

## Sources

All reference material lives in the OPAI monorepo:

- **Codebase** (primary truth): attached locally as `opai/`. Next.js 15 App Router, TypeScript, Tailwind + shadcn/ui + Radix. ~148 pages, ~430 components, 195 Prisma models.
- **GitHub:** `Cryptobal/opai` (default branch `main`).
- **Marketing tokens:** `opai/src/app/(marketing)/marketing.css` — editorial theme with two modes (`data-mk-theme="light"`).
- **App tokens:** `opai/src/styles/globals.css` — shadcn token set (`:root` = light, `.dark`) **plus DS v3 surface/text/status/tint tokens, DS v4 semantic type scale, motion tokens y Liquid Glass v1**.
- **Tailwind config:** `opai/tailwind.config.js` — extends shadcn HSL vars plus a `gard` brand palette (blue + teal) used only in email templates, PDFs, and login screens.
- **Icons / logos:** `opai/public/brand/opai/` (logotipo, isotipo, SVGs, PWA icons) and `opai/public/logos/`.
- **Fonts:** App ships `@fontsource-variable/inter` (body), `@fontsource-variable/outfit` (display), Instrument Sans 400–700, and **Geist Mono Variable** — el mono obligatorio para datos (precios, stock, SKU, fechas, IDs), con JetBrains Mono como fallback. Marketing sigue con Exo 2 / DM Sans / JetBrains Mono vía `next/font`. Legacy Plus Jakarta Sans = deprecated.

---

## Index of this design system

| File / folder | What it is |
|---|---|
| `README.md` | You are here — context, content, visual, iconography. |
| `SKILL.md` | Agent-Skills manifest so this system is invocable. |
| `colors_and_type.css` | All tokens — app scope (`.opai-app`) + marketing scope (`.opai-mk`). |
| `fonts/` | Placeholder — app ships Inter Variable via `@fontsource`; marketing loads from Google Fonts. |
| `assets/logos/` | Logotipo (horizontal + stacked), isotipo (O-with-dot), favicons, PWA icons. |
| `assets/images/` | Brand hero photography — warm/industrial, guardia/monitoreo/drones. |
| `preview/` | Individual Design-System tab cards (colors, type, buttons, etc). |
| `ui_kits/erp-admin/` | Desktop ERP shell — sidebar, topbar, hub, KPIs, tables. |
| `ui_kits/marketing/` | `opai.cl` landing & pricing — editorial dark w/ grid. |
| `ui_kits/mobile-guardia/` | Guard PWA — marcación, rondas, bottom-nav shell. |

---

## Company context

OPAI is a sibling of Gard Security, which runs the platform for its own operation. The pitch is **specificity**: not "ERP for SMBs" — ERP built *only* for companies running private security guards in Chile. Everything from the color palette (monitored-control-room dark, teal pulse) to the copy ("Face ID", "ronda GPS", "pauta mensual") leans into this vertical.

Primary modules, as registered in `/hub`: CRM, CPQ, Presentaciones, Documentos, Payroll, Ops (turnos / pauta / rondas), Marcación biométrica, Tickets, Notificaciones, Finanzas (SII, Santander), Personas (guardias 360), Portal Cliente, Inventario, Supervisión. Plus Hub (exec dashboard, KPIs, app launcher).

---

## Content fundamentals

**Language:** Chilean Spanish. No English in UI copy unless it's a proper-noun module name ("Hub", "CRM", "Payroll", "IA Operacional"). Tildes used correctly — `notificación`, `información`, `guardias`. Informal you: **"tú"** in marketing ("Comenzar gratis", "Cancela cuando quieras"), neutral/formal tone inside the app ("Iniciar sesión", "Cerrar sesión", "Volver a …").

**Casing:** Sentence case everywhere — including buttons (`Comenzar gratis`, not `COMENZAR GRATIS`). The one exception: marketing eyebrow labels + KPI card titles are UPPERCASE with wide letter-spacing, always paired with a small pulsing teal dot or mono caps.

**Tone:**
- Marketing = *operator-to-operator*. Direct, technical, proud. Names the pain first ("¿Tu operación depende de planillas y WhatsApp?") and answers with proof ("259 modelos · 801 endpoints · 18 automatizaciones"). Claims are numeric and specific, never vague.
- App = *professional-calm*. Short nominal labels ("Borrador", "Enviada", "Rechazada"), imperative CTAs ("Crear guardia", "Aprobar rendición"), empty states are brief and helpful ("No hay rondas programadas").
- AI/terminal voice (the `TERMINAL_LINES` on the landing) is *diagnostic*: `opai analyze --turno-noche`, `142 registros cargados`, `Recomendación: reasignar + reforzar Sector B`.

**Emoji:** Used in **marketing** only, as oversized top-of-card glyphs in feature grids (⚠️ 🚨 🔗 📋 🧑‍💻 📍 🧠 🛡️ 🦾). **Never** inside the app UI — the app uses Lucide icons exclusively.

**Numbers:** Always monospaced (JetBrains Mono) for KPIs, stats, money, percentages. Large numbers on landing get Exo 2 extra-bold + teal.

**Do** write "IA" not "AI". Write "empresas de seguridad privada", "guardias de seguridad", "rondas GPS", "Face ID", "OS-10", "WhatsApp".

**Specific exemplars:**
- Hero: *"El ERP que las empresas de seguridad **necesitaban**"*
- Eyebrow: *"ERP + IA PARA SEGURIDAD PRIVADA"*
- Trust micro: *"Sin tarjeta de crédito · Sin compromisos · Cancela cuando quieras"*
- Problem card: *"Te enteras del puesto vacío cuando el cliente reclama. Sin alertas, sin plan B automático."*
- App status: `Borrador`, `Enviada`, `Aprobada`, `Rechazada`, `Vista`, `Ganado`, `Perdido`, `En curso`, `Realizado`.

---

## Visual foundations

### Palette

Two *separate* palettes — don't cross them.

**App v2 (shadcn tokens; dark = "azul pizarra legible, no negro", hue 218):**
- Background `#142033`. Cards `#1a2940`. Popovers `#1f304a`. Muted `#223048`. Border `#334861`.
- Foreground `#f8fafc`. Muted foreground `#9aadc4`.
- **Primary teal** `#14a88a` (hsl 168 78% 38%, "menos neón"), `#189a79` in light mode. Light theme (`:root`) is the code default; dark is overrideable per empresa via BrandThemeSync.
- Destructive `#dc2626`. Chart accents: teal, blue, green, amber, pink.

**DS v3 semantic layer (preferred for new work):**
- **Surfaces 0–4** — 5 elevation levels (page → card → elevated → dialog → tooltip), each one step brighter in dark.
- **Text 1–4** — primary / body / secondary / placeholder.
- **Borders** — subtle / default / strong.
- **Status** — `ok / warn / danger / info`, each with solid + `-fg` + `-soft` (tinted bg) + `-border`. Info is neutral blue, *not* brand.
- **Categorical tints** — 12 hues (violet→slate) as container+fg pairs, for IconTile and non-semantic grouping only. Never for states.

**Conocimiento module** has its own literal tokens (`ink #0D1117`, `brand #0066FF`) — scoped, don't reuse elsewhere.

**Marketing (editorial):**
- BG `#050A12` (deeper). Card `#0C1523`. Card-hover `#101D2E`. Border `#182438`.
- Text `#E8EDF5`. Muted `#657BA0`.
- **Teal** `#00D4B0` (brighter — acts like a neon). Hover shifts to `#00EDCA`.
- **Orange** `#FF5A35` — reserved for alerts, anomalies, warnings in terminal/log output.
- Grid lines `rgba(0,212,176,0.025)` — 48×48px repeating on dark hero bgs.

### Typography

- **App (DS v4 — roles, not pixels):** Inter Variable body with cv02/cv03/cv04/cv11; **Outfit Variable** for display; **Geist Mono** for all data (KPIs, money, dates, IDs). Scale: eyebrow 11 (600, +0.08em, caps) · caption 12 · body 13 · title 15 (500) · heading 17 (600) · display 21 (600, −0.01em) · metric 26 (600, lh 1). `data-density="compact"` shrinks only title/heading/display/metric (14/15/18/22) — no layout shift in tables. Root font-size 17px, 18px mobile; iOS inputs forced to 16px.
- **Marketing display:** **Exo 2**, weights 300/400/600/700/800/900. Used for all headings, CTAs, and big stat numbers. Italic is never used.
- **Marketing body:** **DM Sans**. Hero lede is ~1.15rem, body 0.95rem, line-height 1.6–1.75.
- **Mono:** **JetBrains Mono** for KPI numerics, terminal blocks, eyebrow labels, micro-metadata ("Sin tarjeta de crédito ·").

### Backgrounds

- App shell: flat dark, NO gradients on real screens. One exception — the **sidebar itself** uses `bg-gradient-to-b from-card to-card/80`, so it sits slightly brighter than the main canvas.
- Templates (login, PDFs, invoices) get a subtle three-point radial wash: blue top-left + teal top-right + dim blue bottom-right. Scoped to `.template-ui-scope` only.
- Marketing: flat dark OR a 48px repeating grid (`.mk-grid-bg::before`), plus one enormous radial teal glow behind the hero headline (`radial-gradient(ellipse, rgba(0,212,176,0.07) 0%, transparent 70%)`).
- Hero imagery: real warm-lit photography of guards / control rooms / drones. Not illustrated. Color vibe is cool-neutral with warm highlights.

### Motion

Token-based tiers (`--motion-duration-*`):
- `fast` **150ms** — focus/color transitions.
- `base` **200ms** — sidebar collapse, padding changes.
- `slow` **300ms** — modals, drawers, page-level entrances.

Named easings: `standard` `cubic-bezier(0.2,0,0,1)`, `emphasized` `cubic-bezier(0.3,0,0,1)`; interactive pops (nav pill, icon bounce) use an overshoot `cubic-bezier(0.2,0.9,0.3,1.2)`. Specific named animations: `fade-in`, `slide-up`, `in-page` (fadeInUp 8→0px), `pulse-subtle` (2s opacity 1↔0.85), `cell-flash` (teal box-shadow pulse on table cell update), `live-beacon` (green pulse with shadow ring, for "EN VIVO" status), `mk-pulse` (2s teal dot in eyebrow labels). `prefers-reduced-motion` respected globally (0.01ms fallback).

Bouncy springs? **No.** Parallax? **No.** Everything glides.

### Hover + press

- **Hover:** opacity/brightness bumps — `hover:bg-primary/90`, `hover:bg-accent`, `hover:border-mk-teal`. On marketing cards, a tiny `translateY(-2px)` with a border brightening.
- **Active/press:** on touch devices only, `opacity: 0.7` + `transform: scale(0.98)`. No color change needed.
- **Focus:** `ring-1 ring-ring ring-offset-1 ring-offset-background` — single thin teal ring. No thick 2px colored rings.

### Borders + shadows

- Borders are **the primary separator** — not shadows. `1px solid hsl(var(--border))` around every card and surface.
- Shadows are subtle: `shadow-sm` on cards, `shadow-lg` on popovers. Dark UI + subtle shadows = reads as "layered" without being blurry.
- Elevated popovers lift one step up in brightness (`--popover` sits above `--card` which sits above `--background`).
- **Glass effect** (`.glass-card`) exists but is scoped to *templates* only: `bg-white/5 backdrop-blur-xl border-white/10`, with a 32px drop shadow + inner top highlight.

### Liquid Glass v1 (mobile material, <1024px)

The mobile shell (all PWAs + ERP under `lg`) now uses a unified glass material — desktop keeps the opaque DS surfaces.
- **One material, 3 intensities:** `glass` (containers, blur 24px sat 180%), `glass-strong` (bars/sheets/modals, blur 32px sat 200% + card underlay ~0.72), `glass-soft` (inner rows/chips — translucent fill, **no blur**). Performance rule: backdrop-filter only on containers, max ~10 blurs/viewport.
- **Concentric radii:** 16 (soft) / 22 (base) / 26 (strong) / pill.
- Specular edge: `inset 0 1px 0 white/20, inset 0 -1px 0 black/22`.
- **Floating nav island** with an active **teal-glow pill** (`0 0 18px primary/35`); semantic pill variants for pánico (danger) / alerta (warn). OPAI **orb** with a rotating conic sweep. Marcación "lens" button with pulsing ring.
- **Aurora ambient** background blobs (teal + indigo radials over `#070b14`) drift slowly behind glass; disabled under `prefers-reduced-transparency`.
- Bottom sheets, dialogs, popovers and toasts all get glass treatments on mobile via `.opai-ios-surface-*` classes.
- **Teal glow** ring-shadow around active CTA hover: `0 0 0 1px rgba(0,212,176,0.28), 0 8px 24px -8px rgba(0,212,176,0.35)`.

### Corners

- App shadcn base: `--radius: 0.5rem` (8px); `md = 6px`, `sm = 4px`.
- **DS v3 radii:** `sm 6 / md 10 / lg 14 / xl 20 / pill 999`. Glass radii: 16/22/26/pill.
- Badges are `rounded-md` (6px). Avatars, pills, status dots → `rounded-full`.
- Marketing cards and buttons are deliberately **squarer**: `border-radius: 3–4px`. Eyebrow labels: `2px`. This is a tell — marketing wants to feel slightly more industrial/technical than the app.

### Layout rules

- App: fixed **sidebar** (`w-64` expanded / `w-72px` collapsed, z-48) + sticky **topbar** (`h-16`, backdrop-blur, z-20). Mobile: no sidebar, bottom nav appears (`h-20 + env(safe-area-inset-bottom)`).
- Marketing container: `max-width: 1200px`, horizontal padding `clamp(16px, 4vw, 32px)`, section padding `clamp(64px, 10vw, 120px)`.
- Responsive breakpoints follow Tailwind: `sm 640`, `md 768`, `lg 1024`, `xl 1280`.
- Safe-area insets are threaded everywhere for iOS — `--safe-area-top`, `--safe-area-bottom`.

### Transparency + blur

- Topbar `bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60` — used so content shows through while staying readable.
- Marketing nav `--mk-nav-bg: rgba(5,10,18,0.92)` with a backdrop-blur.
- Muted backgrounds on status badges use `/15` tint of their own color (e.g. `bg-emerald-500/15 text-emerald-400`).

### Imagery vibe

- Photography skews **cool-neutral with warm highlights** — uniformed guards in recepción / caseta / entrada, monitoring rooms, drones at dusk. Real people, real sites, no stock-photo grins.
- No illustrations, no 3D renders, no gradient mesh blobs. If you need decoration, use the **grid background** or a **teal radial glow**.

### Cards

- App card: `rounded-lg border border-border bg-card shadow-sm`. Body padding `p-4 sm:p-5`. Header is a `CardHeader` with `space-y-1.5` and a bold `CardTitle`.
- Marketing card: `rounded-[4px] bg-mk-bg-card border-mk-border`, hover lifts 2px + border-h. Light-mode adds a tiny `0 1px 3px rgba(0,0,0,0.06)` shadow.
- KPI card: colored variants (`blue`, `emerald`, `purple`, `amber`, `red`, `indigo`, `sky`, `teal`) — each = `border-{c}/25 bg-{c}/10 text-{c}-400`, with a matching `/15` icon chip.

---

## Iconography

- **Primary:** [Lucide React](https://lucide.dev) (`lucide-react@0.563`). `h-4 w-4` default size; nav icons are `h-[18px] w-[18px]` (desktop sidebar) or `h-5 w-5` (mobile drawer). Stroke-only outline style. No fill icons.
- **Badge dots:** tiny `h-1.5 w-1.5 rounded-full bg-current` circle inside status badges before the label.
- **No icon font.** No FontAwesome. No emoji inside app chrome.
- **Logos / brand marks:** shipped as `assets/logos/isotipo.svg` (the "O" + teal dot), `logo-horizontal.svg`, `logo-stacked.svg`, and full PWA icon set. The isotipo is rounded-rectangular (not a circle) with a bright teal `#14B8A6` accent dot — this dot is the signature brand move and may be tinted between `#14B8A6` (app) and `#00D4B0` (marketing) depending on scope.
- **PWA per-role icons:** four manifests — `manifest-guardia`, `manifest-cliente`, `manifest-supervisor`, `manifest-marcacion`, `manifest-terreno`. Currently all share the same isotipo; could diverge by role-tint in future.
- **Emoji:** used on **marketing only**, as oversized card glyphs in feature grids. Never in app UI, never in PDFs/emails.
- **Unicode chars as icons:** the middle-dot `·` is used heavily as a text-separator in microcopy ("Sin tarjeta de crédito · Sin compromisos"). Arrows `→` appear in CTA labels ("Comenzar gratis →"). Terminal lines use `❯ ✓ !` as prefixes.

---

## Known substitutions / caveats

- **Fonts:** todas se cargan desde Google Fonts en los HTML estáticos (Inter, Outfit, Geist Mono, Exo 2, DM Sans, JetBrains Mono). Producción usa `next/font` / `@fontsource-variable` — no hay TTFs empaquetados aquí; pide los binarios al equipo si necesitas uso offline.
- **Plus Jakarta Sans** TTFs exist in the real codebase (`public/fonts/PlusJakartaSans-*.ttf`) but only surface in the login-screen inline styles — treat as legacy, do not use for new work.
- **Icon set:** Lucide is loaded via CDN from `unpkg` in the HTML previews — same set used in production, no substitution.
- **Sync note (2026-07-30):** tokens synced against `Cryptobal/opai@main`. The UI kits under `ui_kits/` still render the pre-v3 near-black theme (`#0d1017`) and old teal `#1db990` in places — the token file and preview cards are the source of truth; ask to re-skin the kits if you need them pixel-current.
