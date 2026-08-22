# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SpreadAlready is a personal, single-page site (spreadalready.com) documenting cheeses the owner has eaten around the world. It is a static HTML/CSS/JS site with **no build step, no package manager, and no framework** — every dependency (fonts, mapping library) is pulled from a CDN via plain `<script>`/`<link>` tags directly in `index.html`.

## Commands

There is no build, lint, or test tooling in this repo. To preview locally, serve the directory root with any static file server (e.g. `npx serve .` or `python -m http.server`) and open `index.html` — do not open the file directly via `file://`, since the map tiles/scripts assume being served over http(s).

## Deployment

Deployed via GitHub Pages directly from the `main` branch root — pushing to `main` publishes the live site. The custom domain is set via the root `CNAME` file (`spreadalready.com`). There is no CI/build workflow (no `.github/workflows`); whatever is committed to `main` is what ships, unmodified.

Note: `docs/CNAME` (`www.spreadalready.com`) is a leftover from an earlier Pages configuration and is not currently read by anything — GitHub Pages is serving from the repo root, not `/docs`. Don't assume `/docs` is part of the active deploy path without checking the repo's Pages settings first.

## Architecture

- `index.html` — the entire site: markup, inline `<style>`-free CSS links, and an inline `<script>` block containing both the cheese data and all interactive logic. This is the live page.
- `css/spreadalready.css` — the primary stylesheet for `index.html` (layout, the ABOUT overlay, Leaflet popup theming).
- `styles.css` — an older, smaller stylesheet (font declarations only) still referenced by `index_old.html` but **not** by the current `index.html`.
- `index_old.html` — a superseded earlier draft of the homepage (fewer cheese entries, inline `<style>` instead of `css/spreadalready.css`). Not linked from anywhere in the live site; kept around as a snapshot, not part of the active experience.
- `images/` — cheese photos (large, unresized straight-from-phone JPEGs, several MB each) plus favicons.

### Current homepage behavior (`index.html`)

The cheese data is a hardcoded JS array (`const cheeses = [...]`) inline in `index.html`, each entry holding `picture`, `name`, `date`, `lat`, `lng`, `region`, `notes` (an HTML string). The page renders an interactive 2D map with [Leaflet](https://leafletjs.com/) (loaded via CDN, no local copy) using CARTO's light basemap tiles, and drops one marker per cheese at its lat/lng with a themed popup built by `renderPopup()`. A separate "ABOUT" button/overlay (plain DOM show/hide, no library) shows a short bio blurb.

### Current visual identity (not a constraint — see below)

- Fonts: `Bitter` (serif, headings/body) and `Libre Franklin` (popups/overlay body copy) and `Inter` (uppercase popup labels), all loaded from Google Fonts.
- Palette: translucent gold/yellow (`rgba(255, 215, 0, ~0.5)`, defined as `--gold` / `--gold-hover` in `css/spreadalready.css`) on black text, rounded corners, soft drop shadows — applied consistently to the ABOUT overlay and map popups.
- Tone: the tasting notes are written in a distinct, sassy/personal voice (often multi-quote, conversational) — this is real personal content, not boilerplate, and should be preserved verbatim when the site evolves.

## Design direction: full redesign in progress

The owner is intentionally redesigning the entire site. The project's name stays **SpreadAlready** — "cheese globe" is not a rename, it's just the shape of the new homepage centerpiece: an interactive 3D globe replacing the current 2D Leaflet map. **The visual design above is not sacred** — colors, typography, layout, and the map/marker approach are all open to being fully replaced. What must be preserved is the underlying *content*: the real cheese entries (names, coordinates, dates, tasting notes verbatim, photos) and the personal/sassy voice — not the current CSS or Leaflet implementation. Treat this as an active initiative, not a constraint to work around.
