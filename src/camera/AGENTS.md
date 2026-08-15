# Camera Agent Instructions

Camera code produces canonical geographic camera state and transition behavior.

## Rules

- Do not scatter direct MapLibre camera calls through camera-domain code.
- Do not make UI controls the source of camera behavior.
- Separate path shape, progress along path, orientation, lens behavior, and arrival framing.
- Keep distance-aware logic explicit and testable.
- Long-range motion should use appropriate geographic math.
- Renderer adapters consume camera output.
- Document changes to the canonical camera model in `DECISIONS.md`.
