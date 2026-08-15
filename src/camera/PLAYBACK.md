# Camera playback

Playback is how the camera moves along a path. It is not the path.

- Path shape: `paths/<family>.ts` samples `CameraState` at progress `0…1`
- Progress + easing: `CameraTransitionRunner`
- GSAP adapter: `gsapPlayback.ts` (optional peer)
- Family ease tokens: `transitionEasing.ts`

When `gsap` is installed, the runner uses a GSAP timeline. When it is not, the runner falls back to `requestAnimationFrame` and cubic ease-in-out.

Do not put renderer `flyTo` / `easeTo` calls here. Do not put geodesic math here. UI buttons must not own playback.
