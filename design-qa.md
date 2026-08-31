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

## Hero reference pass

- Direct comparison against the supplied Shopify capture showed that the remaining gap was structural: the reference separates blue, violet, cyan, and white by depth, while the current capture collapsed warm ivory, gray-purple, and brown-black into one low-contrast field.
- Hero background is now a clean blue-black base with three independently positioned blue, violet, and cyan light fields. These are static/composited CSS layers rather than another WebGL volumetric pass.
- Composite fog is disabled, leaving two particle draw calls. Particle count rises from 24,000 to 30,000 while micro-particle share rises to 82%; this increases perceived density without restoring large overdraw-heavy splats.
- Particle maximums are now 1.9 px micro, 5.2 px medium, and 10 px large. Depth layers receive separately biased blue, violet, and cyan lighting instead of gray desaturation.
- Hero title scale changes from an 8.5vw/10rem ceiling to 6.15vw/7.25rem, preserving a title-page hierarchy while reopening the right and upper visual field.

## Continuity and whole-page tone pass

- Supplied screenshots confirmed that the hard horizontal lines were section seams, not WebGL tearing: opaque per-section black gradients ended on the exact boundary where the next transparent scene began.
- Hero and the first mascot scene now meet through matching blue-black transition veils. `WhatWeCreate` no longer paints an opaque black edge and uses a bottom color bridge into Value.
- `WhatWeCreate` no longer changes scenes with `Math.floor()` replacement. All three backgrounds and copy groups remain mounted and crossfade with continuous scroll weights.
- Works project boundaries now overlap the previous final image and the next first image for the first 34% of the entry interval.
- Green-black, orange-brown, warm charcoal, and muddy plum area fills were replaced across What, Value, Public Value, Works, and Ending with separated cyan, cobalt, indigo, and lilac fields.
- The old 2D distortion canvas performed an O(600²) constellation-neighbor loop and created up to 120 radial gradients every frame. It now updates 420 desktop / 210 mobile reusable dots in a single O(n) loop, caps DPR at 1, and mounts only within 12% of the viewport.
- Hero particle visibility loss came from stacked sheet binding, far-depth attenuation, density attenuation, and content masks after the particles had already been reduced in size. These gates were relaxed while point ceilings stayed at 2.1 / 5.2 / 10 px to improve visibility without coarse or glaring dots.

## Automated checks

- `npm run build`: passed.
- TypeScript: passed through Next.js production build.
- `git diff --check`: passed.
- Native scroll listeners in page components: one shared listener.

## Visual gate

- Cloud preview could not start because the project is Next.js while the available preview runner forwards Vite-only flags.
- The authenticated Vercel preview is not accessible to the cloud browser.
- Desktop WebGL, desktop `--disable-3d-apis`, and mobile screenshots therefore remain pending and must not be reported as visually passed.
