# FAMOZ depth-system audit

Date: 2026-09-01  
Branch baseline: `fix/hero-canvas-clear@20d7615`

## Before-change diagnosis

| Item | Observed implementation | Direct problem | Verification |
|---|---|---|---|
| Z distribution | Main field `-3.00…0.35`; background `-3.15…-1.90`; camera `z=3.4`, FOV `55`, near/far `0.1/60` | Continuous coordinates were reduced to far/mid/near behavior, so depth had only three functional responses | `zones` and `zoneA…zoneE` diagnostic views; Z counts/range in overlay |
| Size | Main base sizes `1.85/4.6/9.0`, perspective-scaled; background `3.25…3.9px × DPR` | Perspective existed, but it was not paired with five distinct motion/latency roles | Zone-isolated static captures at 1440×900 and ultrawide |
| Motion | Far/mid/near speed `0.10/0.22/0.38`; class-based pointer lag | Layers moved differently, but semantic depth zones did not; far field had no pointer propagation | Slow/fast pointer tests in each zone view |
| Occlusion | Main alpha blending, `depthWrite:false`; far field `depthTest:false`; DOM mask textures | Safe for typography, but particle-to-particle occlusion was weak and the final space surface was hidden | Composite/particle-only comparison and grayscale capture |
| Color | Scene journey color multiplier plus light scattering | Color changed by scene, but did not explain sensing/structure/data/depth by itself | Zone diagnostic colors only in development; final colors remain scene-owned |
| Performance | One shared renderer/RAF; main 36k at tier 3 plus low-cost background 18k; DPR cap 1.0 | Vertex work is the budget constraint; adding particles would regress pointer movement | Real-GPU stationary/slow/fast 10s samples; SwiftShader excluded |

## Implemented depth model

The same main buffer now carries `aZone`; no renderer, canvas, animation loop, or
particle system was added.

| Zone | World Z | Purpose | Base speed | Pointer response |
|---|---:|---|---:|---|
| A | `>-0.35` | foreground pass-through | `0.46` | strongest, shortest memory |
| B | `-1.05…-0.35` | user sensing/response | `0.31` | strong, short delay |
| C | `-1.85…-1.05` | spatial structure | `0.20` | medium, organized surface |
| D | `-2.45…-1.85` | directional data flow | `0.12` | weak, delayed, opposite parallax |
| E | `<-2.45` | deep environment | `0.065` | weakest, longest memory, opposite parallax |

Final scene colors still belong to the established scene palette. The diagnostic
colors (A coral, B cyan, C gold, D violet, E blue) communicate function only and
are never presented as company/project data.

## Data classification

- **Verified content data:** company copy, project categories, confirmed media and
  facts already stored in the repository. These may appear as explicit text.
- **Interaction-derived state:** pointer position, velocity, dwell, memory, scene
  progress, particle density and zone. These drive motion/light but are not shown
  as business metrics.
- **Decorative simulation:** procedural noise and seeds. These create continuity
  only; they must never be labeled as visitor analytics, AI inference, or project
  results.

## Validation gates

- [x] Production build and TypeScript
- [ ] Real browser static composite and A–E diagnostic captures
- [ ] Real-GPU stationary / slow pointer / fast pointer measurements
- [ ] 1440×900, 2560×1080, 1366×768, 390×844 captures
- [ ] WebGL-disabled and reduced-motion captures
- [ ] Full scroll transition recording

Unchecked gates are intentionally not claimed as complete.
