# ECG Review Station

A demo cardiologist review station for ECG records, built as a single-page React app with **no build step and no `npm install` required**. Dependencies are loaded directly from public CDNs at runtime via an ESM import map. Renders the signal with HTML5 2D Canvas. Static JSON files in `public/data/` stand in for the backend.

> Frontend-only demo. The "save" step is mocked with `console.log` and a UI animation.

## How to run

You only need **Node.js** (any v18+, including Cursor's bundled `node`). No package manager, no build, no internet config beyond CDN access.

```bash
node serve.mjs           # serves the project at http://localhost:5173
```

Then open <http://localhost:5173> in a browser. That's it.

If port 5173 is in use, pass another: `node serve.mjs 8080`.

## How it works (no-build architecture)

- **`index.html`** declares an [import map](https://developer.mozilla.org/docs/Web/HTML/Element/script/type/importmap) that points `react`, `react-dom/client`, `lucide-react`, and `htm` at [esm.sh](https://esm.sh).
- **Tailwind CSS** is loaded via the [Play CDN](https://tailwindcss.com/docs/installation/play-cdn) with our custom keyframes inlined.
- Components are written in plain `.js` modules and use [`htm`](https://github.com/developit/htm) — a tiny tagged-template alternative to JSX that needs no transpilation:

  ```js
  import { html } from './vendor.js';
  import { Activity } from 'lucide-react';

  export default function Card({ children }) {
    return html`
      <div className="rounded-md p-4">
        <${Activity} className="h-4 w-4" />
        ${children}
      </div>
    `;
  }
  ```

- **`serve.mjs`** is a ~60-line zero-dependency static file server.

## Features

- **Pending dashboard** — searchable queue of patients with risk badges and a "Process" action.
- **Review station** — primary 2D Canvas viewer with a 1mm grid, smooth pan/zoom, and label overlays.
- **Navigation track** — full-signal minimap with a draggable viewport window (cached envelope render for perf).
- **AI insights panel** — proposed diagnosis, reasoning bullets, confidence bar, and beat metrics.
- **Impulse zoom modal** — click any label to inspect a single beat and relabel it among `N / S / V / F / Q`.
- **Sign-off modal** — pre-filled diagnosis, free-form notes, follow-up urgency, and a success animation.

## MIT-BIH categories

| Code | Label   | Color (Tailwind)  |
|------|---------|-------------------|
| N    | Normal  | `emerald-400`     |
| S    | SVEB    | `amber-400`       |
| V    | VEB     | `rose-500`        |
| F    | Fusion  | `violet-400`      |
| Q    | Unknown | `slate-400`       |

## Generating data

The 4 sample ECG records in `public/data/` were already generated. To regenerate (or after adding a new record):

```bash
node scripts/generate-data.mjs   # or: npm run data, if you have npm
```

The generator skips files that already exist, so delete the `rec-*.json` files first if you want fresh data.

## Project layout

```
index.html                       # importmap + Tailwind Play CDN + entry script
serve.mjs                        # zero-dep static file server
package.json                     # only declares "type": "module" + helper scripts
src/
  vendor.js                      # binds htm to React.createElement, exports `html`
  main.js                        # mounts <App /> via createRoot
  App.js                         # view router (dashboard | review)
  context/AppContext.js          # current record + relabel + sign-off state
  constants/categories.js        # MIT-BIH categories, risk colors, sample rate
  components/
    PendingDashboard.js
    ReviewStation.js
    EcgCanvas.js                 # primary viewer (grid, signal, labels, pan/zoom)
    NavigationTrack.js           # full-signal minimap with viewport window
    CategoryFilters.js
    AiInsightsPanel.js
    ImpulseZoomModal.js
    SignOffModal.js
    SuccessToast.js
    RiskBadge.js
  hooks/
    useEcgViewport.js            # pan/zoom state machine
    useCanvasDpr.js              # devicePixelRatio + ResizeObserver
  utils/
    ecgRender.js                 # grid + signal drawing primitives
    mockAi.js                    # deterministic mock diagnosis from labels

public/
  favicon.svg
  data/
    records.json                 # dashboard index
    rec-001.json ... rec-004.json   # 100k samples + labels each

scripts/
  generate-data.mjs              # synthesizes ECG signals into public/data/
```

## Rendering notes

- Canvas resolution is multiplied by `devicePixelRatio` and the 2D context is scaled so all coordinates are in CSS pixels.
- When the viewport contains more samples than canvas pixels, the renderer draws a **min/max envelope** per pixel column for crisp waveforms at any zoom.
- The navigation track's full-signal envelope is rendered **once** to an offscreen canvas and re-used; only the window rectangle is redrawn as the user scrolls.

## Keyboard shortcuts

- ECG viewer (focused): `←` / `→` pan · `+` / `−` zoom
- Impulse zoom modal: `N / S / V / F / Q` to relabel · `Esc` to close
- Sign-off modal: `Esc` to cancel

## Why no `npm install`?

This machine has `registry.npmjs.org` blackholed in `/etc/hosts` (corporate policy on a managed device). Rather than bypassing that, the app was refactored to use ESM modules from public CDNs (`esm.sh`, `cdn.tailwindcss.com`) which are reachable. The trade-off is a slightly slower first paint and a runtime dependency on those CDNs — fine for a demo.

## CDN dependencies (loaded at runtime)

- `react@18.3.1`, `react-dom@18.3.1` — via esm.sh
- `lucide-react@0.453.0` — via esm.sh
- `htm@3.1.1` — via esm.sh
- Tailwind CSS — via `cdn.tailwindcss.com` (Play CDN)
- Inter & JetBrains Mono — via Google Fonts
# HakatonGDG
