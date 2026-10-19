# KERNEL Laptop Care & Supply — website

A scroll-driven product film for a laptop repair and sales shop. One code-built laptop stays on stage for the whole visit and opens, fails, comes apart, gets diagnosed, is rebuilt, joins the shop's stock, and finally closes as the visitor reaches the contact details. All the copy is real, server-rendered HTML laid over a fixed WebGL canvas, so the site reads fine without the 3D.

**Stack:** Next.js 16 (App Router, Turbopack) · React 19 · three.js 0.186 · React Three Fiber 9 · drei 10 · @react-three/postprocessing 3 · GSAP 3.15 + ScrollTrigger · Lenis 1.3 · Tailwind CSS 4 · zustand 5 · zod 4 · Playwright for QA.

---

## Run it

Needs Node 20.9 or newer.

```bash
npm install
npm run dev
```
Open http://localhost:3000.

Production build:

```bash
npm run check
```
`check` runs the typecheck, ESLint and `next build`. Then `npm start` serves the build.

### Sample repair tickets (for the tracker)

| Ticket | Device | Status |
|---|---|---|
| `KR-2026-0412` | Meridian 15 (2021) | In repair |
| `KR-2026-0398` | Kestrel 14 Air | Awaiting approval |
| `KR-2026-0371` | Tern 14 | Ready for pickup |

Lookups ignore case. A new booking made on the site also becomes trackable straight away (as "Received") until the server restarts, because the mock keeps bookings in memory.

---

## Rebrand it: one file

Everything brand-related is in **`src/config/brand.ts`**: name, tagline, description, colours, phone, WhatsApp number, email, address, map coordinates, opening hours, social links and the lid mark. The values marked `PLACEHOLDER` (phone, WhatsApp, email, street, postcode, coordinates, URL, social links) must be replaced before launch.

These all read from that file:
- CSS colour tokens: set on `<html>` in `src/app/layout.tsx`, used through Tailwind (`bg-bg`, `text-accent`, …).
- The 3D materials, the screen UI, the lid mark and the leader lines.
- Metadata, the Open Graph image (`src/app/opengraph-image.tsx`), the LocalBusiness JSON-LD (`src/lib/seo.ts`), the sitemap and robots.
- WhatsApp links (`whatsappLink()`) and the map link.

After changing colours or the mark, re-render the no-WebGL fallback stills (see *Fallback stills* below).

Copy lives in `src/content/copy.ts` and service text in `src/data/services.json`. The service "from" prices are placeholders: `0` renders as "From LKR —" and `null` as "Quote after diagnosis".

---

## Edit the story (the chapter timeline)

The whole story is data in **`src/content/chapters.ts`**: an ordered list of chapters.

```ts
{
  id: 'svc-battery',          // also the <section id> and the jump-link anchor
  nav: 'Services',            // label in the side indicator (omit to hide it there)
  length: 1.4,                // viewport heights of scroll, and its share of the 3D timeline
  screen: 'off',              // what the laptop screen shows: desktop | tracker | product | off
  still: 0.5,                 // where reduced-motion mode freezes this chapter
  service: { id, parts, anchor },   // service stops: hoverable/clickable parts + leader-line target
  keys: [                     // keyframes, `at` is 0..1 within the chapter
    { at: 0.4, ease: 'power3.inOut',
      camera: { position, target, frame: [x, y] },   // frame shifts the subject on screen
      cameraMobile: { … },                            // optional phone pose
      root: { position, rotation },                   // the whole laptop
      parts: { battery: { offset, rotation, glow, dim } },
      u: { lidOpen, screen, boot, glitch, heat, fan, scan, fault, fixed, dof, key, rim, warn, accent, shelf, logo, tilt },
      stagger: { order: [...parts], each } },
  ],
}
```

- **Retime:** change `length`. The section height and the 3D timeline slice move together.
- **Reorder:** move a chapter in the array, and keep camera poses continuous across the new neighbours. The page sections are rendered in `src/app/page.tsx`; keep their order matching.
- **Hold semantics:** a value holds until the keyframe *before* the one that changes it, then tweens into it. Values you don't mention don't move.
- During the teardown the laptop is upside down, so a negative `y` offset moves a part *up* on screen. The helper `up(n)` does this for you.

How it runs: `src/lib/timeline.ts` compiles the data into one paused GSAP timeline that tweens a plain `rig` object. `src/components/ScrollController.tsx` maps each section's own pixel range onto its slice (Lenis provides the smoothing), and `src/components/scene/Director.tsx` copies the rig onto the camera, lights, parts and materials every frame. React never re-renders per frame. Scrolling back up replays everything exactly; this is verified by pixel-diffing the same scroll position reached forwards and backwards.

---

## The laptop model

It's built entirely in code under `src/components/scene/laptop/`: rounded and chamfered shells, brushed aluminium, instanced key caps, a motherboard with instanced chips and capacitors plus an emissive trace layer, a spinning blower fan, flattened copper heat pipes with a fin stack, labelled battery cells, RAM with gold contacts, an M.2 SSD, a glass display with a live canvas screen, and the KERNEL mark glowing on the lid.

Every animated piece is a `<Part name="…">`. The timeline only addresses **names** (`src/lib/parts.ts`).

**Swapping in a real `.glb` later:** load it with drei's `useGLTF`, map its nodes to the same part names and call `registerPart(name, node)` for each one (or wrap them in `<Part>`). Then replace `<Laptop>` in `src/components/scene/Experience.tsx`. The timeline, camera work and UI don't change. The rest offsets in `src/lib/layout.ts` drive the exploded view, so check them against the new model.

---

## Connect a real backend

The UI only ever talks to the `Repository` interface in `src/lib/data/types.ts`:

```ts
products.list()   services.list()   tickets.get(id)   bookings.create(input)
```

The mock implementation is `src/lib/data/mock.ts`: JSON files in `src/data/` plus an in-memory store for bookings. To connect a database, CMS or ticketing system, write another implementation of `Repository` and export it from `src/lib/data/index.ts`. Nothing else changes.

API (Next.js route handlers in `src/app/api/`):

| Route | |
|---|---|
| `GET /api/products` | catalogue |
| `GET /api/services` | services |
| `GET /api/tickets/:id` | 400 for a malformed id, 404 for an unknown one |
| `POST /api/bookings` | validated with the same zod schema as the form (`src/lib/validation.ts`); 400 returns per-field errors |

The home page is prerendered and revalidates every 10 minutes (`export const revalidate = 600` in `src/app/page.tsx`).

Bookings don't notify anyone yet. Hook email, SMS or your ticketing system into `bookings.create`. Add rate limiting before launch; the form only has a honeypot field.

---

## Quality tiers, fallbacks and accessibility

- **Tiers** (`src/lib/quality.ts`): chosen at start from GPU, memory and cores.
  - **High** (discrete GPUs, Apple silicon): bloom, depth of field, 4× MSAA, live contact shadows, DPR up to 2.
  - **Medium** (phones, integrated laptop GPUs): bloom, 2× MSAA, DPR up to 1.5.
  - **Low**: no post-processing, baked shadows, DPR up to 1.25.
  - drei's `PerformanceMonitor` drops one tier on a *sustained* fall below about 38 fps, with a cooldown so a single hitch can't cascade.
  - `?quality=high|medium|low` forces a tier.
- **Rendering pauses** when the tab is hidden. Shaders compile before the scene is revealed.
- **No WebGL, scene failure or no JavaScript:** each chapter shows a still rendered from the real scene (`public/fallback/*.jpg`) beside its copy. Nothing is blank. `?nowebgl=1` simulates this.
- **Reduced motion:** no scrubbing, no smooth scroll and no cursor tilt. Each chapter shows one well-framed still with a short fade. `?stills=1` simulates this.
- **Accessibility:**
  - Skip links, a chapter nav built from real anchor links, and visible focus rings.
  - Every 3D interaction has an HTML equivalent (the service buttons).
  - A screen-reader description of what the scene shows in each chapter.
  - Labelled form fields with inline errors and a focused error summary.
  - `aria-live` results for the tracker and catalogue filters.

### Fallback stills
After changing the model, colours or camera poses, run the site and re-render the stills:

```bash
npm run fallbacks
```

---

## QA scripts (Playwright)

Run these against a running server (`npm start` or `npm run dev`). Pass a base URL as the first argument if it isn't `http://localhost:3000/`.

| Script | What it does |
|---|---|
| `npm run qa:shots` | screenshots every chapter on desktop and phone → `qa/`; `python scripts/sheet.py qa/desktop 5` makes a contact sheet |
| `npm run qa:e2e` | booking (invalid, then valid, then WhatsApp), tracker, catalogue filters and selection, 3D hover and click, keyboard |
| `npm run qa:modes` | real `--disable-webgl`, JavaScript off, reduced motion |
| `npm run qa:perf` | wheel-scrolls the whole story and reports fps and p95 per chapter (`--phone --cpu=4` for a throttled phone) |
| `npm run qa:vitals` | lab LCP, CLS, boot and scene-ready times |
| `scripts/profile.mjs`, `cpuprofile.mjs`, `longframes.mjs`, `loadprofile.mjs` | profiling helpers (see `.claude/skills/webgl-performance/lessons.md`) |

QA-only URL flags (active only with `?qa=1`): `dof=0`, `bloom=0`, `post=0`, `msaa=N`, `shadows=baked`, `dpr=N`, `auto=0`.

---

## Project layout

```
src/
  config/brand.ts            ← rebrand here
  content/chapters.ts        ← the story timeline (data)
  content/copy.ts            ← story copy
  data/*.json                ← mock products, services, tickets
  lib/data/                  ← Repository interface + mock implementation
  lib/timeline.ts            ← data → GSAP timeline → rig
  lib/parts.ts, layout.ts    ← part registry and physical layout
  lib/quality.ts             ← quality tiers
  lib/validation.ts          ← zod schemas (client + server)
  app/                       ← page, layout/metadata, API routes, OG image, sitemap, robots
  components/scene/          ← R3F scene: Experience, Director, Stage, Effects, laptop/*
  components/sections/       ← server-rendered chapter HTML
  components/features/       ← catalogue, tracker, booking form
  components/ui/             ← boot screen, chapter nav, cursor, callout, book button
scripts/                     ← QA and profiling (Playwright)
.claude/skills/              ← the playbooks this site was built from
```
