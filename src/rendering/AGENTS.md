# Rendering Agent Instructions

Rendering owns MapLibre/Three integration and visual-world implementation.

## Rules

- Keep renderer-specific code inside rendering adapters.
- Maintain camera and projection alignment between renderers.
- Define shared materials and lighting centrally.
- Avoid scene-specific rendering hacks in reusable code.
- Treat provider-specific APIs as adapters where practical.
- Do not leak renderer internals into public Atlas contracts without explicit architectural approval.
- Preserve geographic depth and terrain correctness when adding visual effects.
