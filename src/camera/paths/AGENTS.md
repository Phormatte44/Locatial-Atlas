# Camera Path Agent Instructions

Each path family is one TypeScript sampler plus one markdown brief.

## Live families

`local-glide`, `orbit-reveal`, and `departure-arrival-arc` are registered `CameraPathFamily` ids. Auto-select and transition events use those ids.

## Planned families

`linear.md`, `high-arc.md`, `low-arc.md`, and `route.md` are signposts. They are not ids. Do not auto-select them. Do not add Lab buttons for them until they have a `.ts` sampler and a contract id.

## Rules

- Edit the `.md` to refine intent, feel, distance band, and knobs.
- Edit the `.ts` to change sampled `CameraState`.
- Every sampler must return canonical `CameraState`. Shared geo math stays in `../geodesicInterpolation.ts` and `../easing.ts`.
- Duration belongs with the family. Playback easing stays in `CameraTransitionRunner`.
- Do not parse markdown at runtime.
- Do not hard-code demo cities into a sampler.
- A new live family needs: `.ts`, `.md`, a `CameraPathFamily` id, a dispatcher branch in `../sampleTransitionPath.ts`, a duration, and a `DECISIONS.md` note.
