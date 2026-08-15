# Camera System

The Atlas camera system owns how the viewer moves through geographic space.

This is the governing file. Path math lives in `paths/`. Each live family has a TypeScript sampler and a markdown brief. Planned families have a brief only until they have a sampler and a `CameraPathFamily` id.

## Folder map

```text
src/camera/
  CAMERA-SYSTEM.md          ← this file
  AGENTS.md                 ← implementation rules
  PLAYBACK.md               ← progress and easing (not path shape)
  README.md                 ← short index
  CameraController.ts       ← canonical state + framing targets
  CameraTransitionRunner.ts ← GSAP timeline playback (rAF fallback)
  gsapPlayback.ts           ← internal GSAP adapter (not public API)
  transitionEasing.ts       ← path-family GSAP ease tokens
  sampleTransitionPath.ts   ← dispatcher: family id → sampler
  framePlace.ts / frameBounds.ts
  paths/
    README.md               ← family index
    AGENTS.md               ← how to add or refine a path
    local-glide.ts/.md      ← live
    orbit-reveal.ts/.md     ← live
    departure-arrival-arc.ts/.md  ← live
    linear.md               ← planned signpost
    high-arc.md             ← planned signpost
    low-arc.md              ← planned signpost
    route.md                ← planned signpost
```

Lab buttons, when they exist, must target a **path family id** (`local-glide`, `orbit-reveal`, `departure-arrival-arc`). They must not parse these markdown files at runtime.

## Canonical camera properties

- longitude
- latitude
- altitude
- heading
- pitch
- roll
- field of view
- target longitude
- target latitude
- target altitude
- transition progress

## Movement model

A transition should separate:

1. The shape of the camera path through space.
2. The camera's movement along that path.
3. The orientation and lens behavior while moving.
4. Arrival framing.

## Playback (Foundation 46)

`CameraTransitionRunner` advances normalized progress `0 → 1` along the solved path. When the host installs the optional `gsap` peer dependency, playback uses a GSAP timeline with path-family easing tokens from `transitionEasing.ts`:

| Path family | GSAP ease | Feel |
| --- | --- | --- |
| `local-glide` | `power2.inOut` | neighborhood glide |
| `orbit-reveal` | `power3.inOut` | mid-range cinematic sweep |
| `departure-arrival-arc` | `power4.inOut` | long-range soft arrival |

GSAP types and timelines never cross the public API boundary. Without `gsap`, the runner falls back to `requestAnimationFrame` with cubic ease-in-out.

Path samplers in `paths/` receive **eased** progress; they define spatial shape only. Duration constants live on each family file; `transitionDuration.ts` selects them.

## Path families

Live ids (`CameraPathFamily`):

- `local-glide`
- `orbit-reveal`
- `departure-arrival-arc`

Planned briefs (no id yet — do not auto-select or expose on the public contract):

- linear
- high-arc
- low-arc
- route

Do not implement families as unrelated animation hacks. They should share a common camera-state output.

## Distance-aware behavior

Camera duration, apex altitude, pitch, and arrival behavior should respond to geographic distance.

Current auto-select:

- `< 3 km` → `local-glide`
- `3 km`–`500 km` → `orbit-reveal`
- `≥ 500 km` → `departure-arrival-arc`

## Long-range transitions

Prefer geographic/geodesic logic for long-range motion. Local movement can use a local tangent/ENU-style approximation where appropriate.

## Renderer rule

The camera system produces canonical camera state.

MapLibre and Three.js adapters consume that state.

The camera system should not be written as direct renderer commands scattered through UI code.
