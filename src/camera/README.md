# Camera

Canonical geographic camera state, path solvers, framing, orientation, transitions, and lens behavior.

Start here:

- [`CAMERA-SYSTEM.md`](./CAMERA-SYSTEM.md) — governing model
- [`AGENTS.md`](./AGENTS.md) — implementation rules
- [`paths/README.md`](./paths/README.md) — live and planned path families

`CameraController` owns current state and framing targets. `CameraTransitionRunner` plays eased progress along a path via GSAP (rAF fallback). `sampleTransitionPath.ts` dispatches to a family sampler in `paths/`. Renderer adapters consume `CameraState`; they do not own animation.
