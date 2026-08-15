# Architecture Decision Log

Record meaningful decisions here.

Use this format:

## YYYY-MM-DD — Decision title

**Decision**
What was decided.

**Reason**
Why this approach was selected.

**Consequences**
Important technical or product implications.

---

## Initial decisions

### Atlas is standalone

Atlas is developed as an independent spatial/map repository.

### Lab and engine are separate

Experimental controls and scenes belong in `lab`. Reusable spatial behavior belongs in `src`.

### Public contracts remain renderer-agnostic

External products should not depend directly on MapLibre, Three.js, or GSAP implementation details.

### Canonical geographic camera state

Camera behavior is expressed through geographic camera state and solved into renderer-specific output by adapters.
