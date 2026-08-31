# Design QA — four-scene experience

## Baseline diagnosis

- Composite WebGL path rendered six passes: one spatial field, two particle passes, and three fog planes.
- Tier 3 used 34,000 particles at DPR 1.5; each particle evaluated nine pointer-path segments.
- The content mask performed DOM reads and texture uploads on scroll and every 30 frames.
- Six page components plus the visual canvas owned separate native scroll listeners.
- The parallax system wrote two root CSS variables on every animation frame, including while idle.
- Large splats (up to 64 px), three overlapping fog layers, warm/cool mixing, and sheet-heavy distribution produced the muddy membrane appearance.
- Mascot scenes used an intro lineup plus immediate `Math.floor` scene replacement. Spotlight mascots were card-scale and the copy was body-copy scale.

## Implemented checkpoint

- Composite rendering reduced to two particle passes plus one low-opacity fog pass on capable tiers; the spatial surface is debug-only.
- Tier 3 uses 24,000 particles at DPR 1.0. Pointer-path shader work is reduced from nine to five segments.
- Particle mix is 76% micro / 21% medium / 3% large; large points are capped at 16 px.
- Scroll input is centralized into one passive listener and one RAF dispatch.
- Mask regeneration is limited to initial load, font readiness, and resize.
- Pointer history uses a fixed ring buffer; idle parallax RAF stops when interpolation settles.
- Four continuous, overlapping scenes now use optimized project photography, a left copy safety zone, large right-side mascots, and staged background → mascot → title timing.
- Four source images were converted from 11.5 MB of PNG files to 460 KB of WebP files.

## Automated checks

- `npm run build`: passed.
- TypeScript: passed through Next.js production build.
- `git diff --check`: passed.
- Native scroll listeners in page components: one shared listener.

## Visual gate

- Cloud preview could not start because the project is Next.js while the available preview runner forwards Vite-only flags.
- The authenticated Vercel preview is not accessible to the cloud browser.
- Desktop WebGL, desktop `--disable-3d-apis`, and mobile screenshots therefore remain pending and must not be reported as visually passed.
