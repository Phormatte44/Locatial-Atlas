# Data Sources

Atlas should treat external geographic data as replaceable providers.

## Provider categories

- vector map tiles
- raster or satellite imagery
- terrain/DEM
- administrative boundaries
- buildings
- labels
- roads
- points of interest
- 3D assets
- optional elevation or surface datasets

## Rules

- Provider credentials live in environment variables.
- No secrets are committed.
- Provider-specific code should live under `src/data/providers`.
- Engine contracts should use canonical geographic data rather than vendor-specific response shapes.
- Document licensing or attribution requirements when a provider is added.
- Prefer adapters that make it possible to swap providers without rewriting camera or interaction systems.

## Boundary data

Administrative or semantic boundaries may be loaded from a database, vector tile source, or another geographic source.

Atlas renders boundary geometry but should not own the semantic search/resolution logic that decides what a user meant by a query.
