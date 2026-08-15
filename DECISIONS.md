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

---

## 2026-08-14 — Foundation 1 map architecture

**Decision**

Foundation 1 uses a single MapLibre adapter behind `AtlasEngine`, with canonical camera state owned by `CameraController` and converted to MapLibre view parameters only inside `src/rendering/maplibre`.

**Reason**

This proves the Lab-to-Atlas boundary early: Lab selects test places and calls `framePlace`, while MapLibre remains an internal rendering detail.

**Consequences**

- Three.js, terrain, markup, and cinematic path families are deferred.
- Place framing uses a simple default altitude/pitch model until dedicated framing solvers arrive.
- Altitude/zoom conversion is approximate and should be replaced or refined when terrain and multi-renderer alignment land.

---

## 2026-08-14 — Foundation 2 Three.js overlay alignment

**Decision**

Three.js renders as a MapLibre custom layer (`renderingMode: "3d"`), using MapLibre's projection matrix each frame rather than maintaining a separate free-running Three.js camera.

**Reason**

This is the smallest reliable way to satisfy the first-milestone requirement that MapLibre and Three.js stay aligned during camera motion, without exposing either renderer through the public Lab contract.

**Consequences**

- World markers are placed via mercator transforms in `src/world/mercatorTransform.ts`.
- Lab supplies marker data through `setWorldMarkers`; Atlas owns Three.js scene composition.
- Advanced markup, materials, and lighting remain future work on top of this overlay path.
- Marker rendering uses `defaultProjectionData.mainMatrix` with per-marker model matrices (MapLibre v5+ custom layer contract).

---

## 2026-08-14 — Foundation 3 Atlas-owned camera transitions

**Decision**

Place-to-place motion is solved inside `src/camera` using geodesic path sampling and a `CameraTransitionRunner` that emits canonical `CameraState` each frame. MapLibre receives instant `jumpTo` updates from the adapter rather than owning animation via `flyTo`.

**Reason**

This establishes the camera system as a first-class Atlas subsystem with distance-aware path families (`local-glide`, `geographic-arc`) while keeping renderer-specific commands inside adapters.

**Consequences**

- Long moves (e.g. London → Dubai) rise to a computed apex altitude, travel along a geodesic, then descend into framing pitch.
- Additional path families can plug into the same sampler/runner without changing the Lab contract.
- Transition timing and altitude/zoom conversion remain approximate until terrain-aware framing lands.

---

## 2026-08-14 — Foundation 4 geographic projection

**Decision**

`project`, `unproject`, and screen-space marker picking live behind `AtlasEngine`. MapLibre provides the concrete projection math inside `src/rendering/maplibre/projection.ts`; reusable hit testing lives in `src/interaction`.

**Reason**

This satisfies the spatial contract’s screen/world translation requirements without exposing MapLibre APIs to Lab or future products.

**Consequences**

- Altitude-aware projection remains approximate until terrain elevation is integrated.
- Lab demonstrates hover picking via `findWorldMarkerAtScreen`; visual highlight rendering is still deferred.

---

## 2026-08-14 — Foundation 5 swappable map styles

**Decision**

Basemap styles are registered in `src/data/mapStyles` and resolved through a provider adapter. `AtlasEngine.setMapStyle(styleId)` swaps styles while preserving camera state and re-attaching the Three.js overlay.

**Reason**

This creates the migration path for bringing map styling over from older builds one provider at a time, without leaking style URLs or MapLibre calls into Lab.

**Consequences**

- Built-in styles currently use credential-free demo/OpenFreeMap URLs.
- Future product-specific styles can be added to the registry or injected without changing renderer code.
- Style swaps re-register the Three.js custom layer after MapLibre reloads the style.

---

## 2026-08-14 — Foundation 6 place highlight rendering

**Decision**

`highlightPlace(placeId)` drives Three.js marker appearance (scale, color, opacity) inside the overlay adapter. Lab hover picking calls the public contract; rendering stays in Atlas.

**Reason**

This completes the hover loop started in Foundation 4 and proves place-linked visual feedback without MapLibre symbol layers or Lab-side Three.js access.

**Consequences**

- Highlight state is marker-id based and matches place ids in current Lab presets.
- Richer highlight treatments (rings, labels, markup layers) can extend the same contract later.

---

## 2026-08-14 — Foundation 7 terrain adapter

**Decision**

Terrain is enabled through `AtlasEngine.setTerrainEnabled()` using registered DEM sources in `src/data/terrain`. MapLibre setup (raster-dem source, hillshade, `setTerrain`) lives in `src/rendering/maplibre/terrainSetup.ts`.

**Reason**

Terrain is a provider concern and should be swappable without Lab or products touching MapLibre terrain APIs directly.

**Consequences**

- Lab uses MapLibre demo Terrarium tiles for development only.
- Three.js markers re-ground using terrain elevation queries when terrain is enabled.
- Production deployments should register a CDN-backed terrain provider (for example Mapterhorn) in the terrain registry.

---

## 2026-08-14 — Foundation 8 orbit-reveal path family

**Decision**

Atlas camera paths now select among `local-glide`, `orbit-reveal`, and `geographic-arc` based on move distance. The engine emits `started`, `completed`, and `cancelled` transition events through `onCameraTransition`.

**Reason**

This extends the camera system toward the path families described in `CAMERA-SYSTEM.md` while giving Lab and future products visibility into which solver ran.

**Consequences**

- Mid-range moves use a lateral orbit offset rather than a straight geodesic glide.
- Long moves (London ↔ Dubai) still use geographic arcs.
- Additional path families can register in the same selector/sampler pipeline.

---

## 2026-08-14 — Foundation 9 world markup layer

**Decision**

World-space geometry is expressed as typed markup (`WorldSphereMarkup`, `WorldCircleMarkup`) and registered through `AtlasEngine.setWorldMarkup()`. The Three.js overlay renders all markup kinds; `setWorldMarkers()` remains as a compatibility wrapper that converts markers to sphere markup.

**Reason**

The spatial contract calls for a single engine-owned world markup layer rather than ad hoc marker objects. Circles and spheres share grounding, highlight, and screen picking through `GeoAnchoredFeature` anchors.

**Consequences**

- Lab registers spheres at each test place plus ~12 km ground circles.
- Hover picking uses `findNearestGeoFeature` over markup anchors; place ids still drive highlight for spheres.
- Future markup kinds (polygons, labels) can extend the `WorldMarkup` union without changing the public attach/render pipeline.

---

## 2026-08-14 — Foundation 10 production terrain registry

**Decision**

Terrain providers are registered in `src/data/terrain` and switched through `AtlasEngine.setTerrainSource()`. Mapterhorn is the first production-grade open terrain source; MapLibre demo tiles remain for lightweight development. Projection and unprojection now report ground elevation when terrain is enabled.

**Reason**

Foundation 7 proved terrain toggling with a single demo provider. Products need swappable DEM sources without touching MapLibre terrain APIs, and screen/world translation should reflect terrain height once relief is active.

**Consequences**

- Lab can compare MapLibre demo terrain vs Mapterhorn and read ground elevation under the cursor.
- `project()` honors optional altitude offsets above terrain when terrain is enabled.
- Additional providers (for example FABDEM-backed tiles) register in the same terrain registry pattern.

---

## 2026-08-14 — Foundation 11 polygon world markup

**Decision**

Ground polygons join spheres and circles in the `WorldMarkup` union. Rings are expressed as lng/lat vertices; Atlas derives a centroid anchor for placement, grounding, and screen picking. Three.js renders flat `ShapeGeometry` in local meter space anchored to the centroid.

**Reason**

The spatial contract requires Atlas to render arbitrary world-space geometry, not only radial primitives. Polygons are the next step toward boundaries and editorial area highlights without MapLibre fill layers in Lab.

**Consequences**

- Lab replaces ground circles with pentagonal/hexagonal ~12 km area rings around London and Dubai.
- `polygonMarkupFromRing()` and Turf centroid helpers live in `src/geometry/polygonMarkup.ts`.
- Future label/line markup can follow the same typed union and overlay pipeline.

---

## 2026-08-14 — Foundation 12 departure-arrival arc path family

**Decision**

Long-range camera moves (≥ 500 km) now use an explicit `departure-arrival-arc` path family instead of the earlier bundled `geographic-arc` name. Departure climb, cruise, and arrival descent are sampled as separate eased phases with dedicated altitude, pitch, and heading curves in `src/camera/departureArrivalArc.ts`.

**Reason**

`CAMERA-SYSTEM.md` treats departure and arrival as distinct motion phases. Naming and sampling them explicitly makes transition events truthful and gives the camera system room to tune editorial long-range motion without ad hoc renderer animation.

**Consequences**

- London ↔ Dubai reports `departure-arrival-arc` in Lab transition readouts.
- Mid-range moves still use `orbit-reveal`; short moves use `local-glide`.
- Additional path families can register in the same selector/sampler pipeline.

---

## 2026-08-14 — Foundation 13 line world markup

**Decision**

Geographic polylines join the `WorldMarkup` union as `WorldLineMarkup`. Paths are sampled in lng/lat, anchored at the path midpoint for placement and picking, and rendered as Three.js `Line` geometry in local meter space.

**Reason**

Routes and leader lines are core spatial storytelling primitives. Line markup completes the basic primitive set (point, area, path) before labels or styled boundaries arrive.

**Consequences**

- Lab draws a geodesic London–Dubai route at 120 m altitude so it reads above the globe at wide zoom.
- `sampleGeodesicPath()` and `lineMarkupFromPath()` live in `src/geometry/lineMarkup.ts`.
- Hover picking uses the path midpoint anchor; dedicated line picking can extend later.

---

## 2026-08-14 — Foundation 14 Locatial editorial basemap

**Decision**

The product-facing Positron basemap from Locatial Studio is registered in Atlas as `locatial-editorial` (`LOCATIAL_EDITORIAL_MAP_STYLE_ID`). Lab defaults to this style; `atlas-neutral` remains the engine fallback for credential-free development.

**Reason**

Foundation 5 proved swappable styles through a registry. The next deliberate migration from the old product stack is the editorial basemap identity—not a wholesale style dump, but the single basemap Creator Studio already uses.

**Consequences**

- Lab opens on Locatial Editorial (OpenFreeMap Positron) instead of MapLibre demo tiles.
- Products can opt into the same style id without hard-coding tile URLs.
- A fully custom hosted Locatial style JSON can replace the URL later without changing the public style id.

---

## 2026-08-14 — Foundation 15 label world markup

**Decision**

Geographic place names render as billboard `WorldLabelMarkup` in the Three.js overlay. Labels use canvas-backed sprites scaled in mercator meter space and co-highlight when their paired place sphere is hovered.

**Reason**

Editorial spatial composition needs readable place names in world space without Lab touching MapLibre symbol layers. Labels complete the core markup primitive set alongside points, areas, and paths.

**Consequences**

- Lab shows “London” and “Dubai” labels above each city sphere.
- `labelMarkupFromPlace()` lives in `src/geometry/labelMarkup.ts`; sprite rendering in `src/rendering/three/labelSprites.ts`.
- Richer typography and leader lines can extend the same markup pipeline later.

---

## 2026-08-14 — Foundation 16 geographic hover events

**Decision**

Atlas reports hovered geographic features through `onGeoHover()` listeners. `AtlasMapView` forwards pointer movement to `updateGeoHover()` / `clearGeoHover()`, which pick place spheres, drive highlight state, and emit cursor geo coordinates. Lab no longer implements its own pointer picking loop.

**Reason**

`SPATIAL-CONTRACT.md` lists hovered geographic features as an engine concern. Centralizing hover in Atlas keeps picking, highlight, and future selection on one boundary instead of duplicating probe logic in each product shell.

**Consequences**

- Lab readout subscribes to `onGeoHover` only.
- Place hover targets sphere markup anchors; route and area markup picking can extend later.
- Products can react to hover without calling `findWorldMarkerAtScreen()` directly.

---

## 2026-08-14 — Foundation 17 geographic selection events

**Decision**

Atlas reports clicked geographic features through `onGeoSelect()` listeners. `AtlasMapView` forwards pointer clicks to `selectGeoAt()`, which picks place spheres and route lines in screen space, persists selection, and keeps highlight active until cleared. Line picking uses screen-space distance to projected path segments in `pickInteractiveMarkup.ts`.

**Reason**

`SPATIAL-CONTRACT.md` lists selected geographic features alongside hover. Selection completes the core pointer interaction loop and enables route inspection without Lab-side geometry math.

**Consequences**

- Lab readout shows both hover and selected feature ids.
- Clicking the London–Dubai route selects `london-dubai-route`; clicking empty map clears selection.
- Polygon and label picking can extend the same interactive markup picker later.

---

## 2026-08-14 — Foundation 18 frame geographic bounds

**Decision**

Atlas exposes `frameBounds(bounds)` for `[west, south, east, north]` boxes, with altitude derived from bounds span in `computeBoundsFramingCamera()`. Places with a `bounds` field frame the box instead of a fixed point altitude when `framePlace()` is used.

**Reason**

`SPATIAL-CONTRACT.md` requires framing places or bounds, not only center points. Metro-area polygons in Lab now have matching bounds for camera framing.

**Consequences**

- Lab adds `{city} area` buttons that call `frameBounds()` on each test place.
- Bounds framing reuses the same animated camera path pipeline as place framing.
- Products can frame any geographic rectangle without constructing a synthetic place object.

---

## 2026-08-15 — Foundation 19 map readiness events

**Decision**

Atlas reports renderer and data readiness through `onMapReady()` listeners with `{ ready, reason, mapStyleId }`. Reasons are `initial-load`, `style-changed`, `terrain-changed`, and `detached`. `MapLibreAdapter` emits after style load completes (including Three overlay and terrain setup); `AtlasEngine` wraps adapter callbacks, exposes `isMapReady()`, and emits `detached` on `detach()`.

**Reason**

`SPATIAL-CONTRACT.md` lists renderer/data readiness changes as part of the spatial event surface. Products need a stable signal to defer overlays, analytics, or UI until the basemap and terrain pipeline are usable.

**Consequences**

- Lab readout shows the latest readiness reason (toggle terrain or swap style to see updates).
- Readiness fires after terrain idle, not only MapLibre `load`.

---

## 2026-08-15 — Foundation 20 recoverable map error events

**Decision**

Atlas reports recoverable map and data failures through `onMapError()` listeners with `{ kind, message, recoverable, mapStyleId, sourceId? }`. Kinds include `style-load`, `tile-load`, `terrain-load`, `source-load`, and `render`. `MapLibreAdapter` listens to MapLibre `error` events and classifies them in `classifyMapError.ts`; `AtlasEngine` enriches events with the active `mapStyleId`.

**Reason**

`SPATIAL-CONTRACT.md` lists recoverable data/rendering errors alongside readiness. Products need a stable event surface for tile drops, terrain DEM failures, and style load problems without subscribing to MapLibre internals.

**Consequences**

- Lab readout shows the latest classified error (tile and terrain failures are marked recoverable).
- Style swap failures still reject `setMapStyle()` promises while also notifying listeners.
- Non-recoverable style-load errors are flagged with `recoverable: false`.

---

## 2026-08-15 — Foundation 21 polygon and label selection picking

**Decision**

Geographic selection in `pickInteractiveMarkup.ts` now includes polygon fill hits and label sprite bounds, alongside place spheres and route lines. Polygon picking uses a screen-space point-in-polygon test on projected ring vertices. Label picking projects altitude-aware anchor bounds from `measureLabelSpriteMeters()`. Pick priority favors labels and points over lines and area polygons so city markers stay selectable inside metro polygons.

**Reason**

Foundation 17 added selection for spheres and lines only. Lab metro polygons and place labels were visible but not selectable, leaving the interaction loop incomplete for area and label markup.

**Consequences**

- Clicking inside a city polygon selects `{place-id}-area`; clicking a label selects `{place-id}-label`.
- Labels and place spheres win over underlying polygon fills at the same screen point.
- Hover remains sphere-only; selection highlight already supports labels and polygons in `ThreeOverlayAdapter`.

---

## 2026-08-15 — Foundation 22 camera state change events

**Decision**

Atlas reports canonical camera updates through `onCameraChange()` listeners with `{ state, reason }`. Reasons are `user-interaction` (MapLibre move end while not transitioning), `programmatic` (`setCamera()` and pre-attach framing targets), `transition` (animated framing completed), and `sync` (immediate snapshot when subscribing). Transition frames do not emit per-frame updates; `onCameraTransition()` remains the animation lifecycle surface.

**Reason**

`SPATIAL-CONTRACT.md` lists camera state changes alongside hover, selection, and readiness. Products need the geographic camera contract without reading MapLibre camera internals or polling `getCameraState()` every frame.

**Consequences**

- Lab readout shows the latest change reason with lat/lng/altitude summary.
- User pan/zoom emits once per MapLibre `moveend`.
- New subscribers receive the current camera state immediately.

---

## 2026-08-15 — Foundation 23 hosted Locatial editorial style JSON

**Decision**

The `locatial-editorial` style id now resolves to a repo-hosted MapLibre style document at `/map-styles/locatial-editorial.json` instead of the remote OpenFreeMap Positron URL. The JSON keeps OpenFreeMap vector tiles, sprites, and glyphs but applies Locatial editorial palette tweaks (warmer land background, deeper water, darker city labels). `LOCATIAL_EDITORIAL_STYLE_URL` is exported for products that need the path explicitly.

**Reason**

Foundation 14 registered the editorial basemap identity with a temporary remote URL. Hosting the style JSON in Atlas unlocks controlled cartographic iteration without changing the public style id or coupling products to OpenFreeMap style endpoints.

**Consequences**

- Lab and products still request `locatial-editorial`; only the style document location changed.
- Raw Positron remains available as `openfreemap-positron` for comparison.
- Production can CDN-host the same JSON file without engine code changes.

---

## 2026-08-15 — Foundation 24 interactive markup hover

**Decision**

Geographic hover now uses the same interactive markup picker as selection (`pickInteractiveMarkup.ts`). `updateGeoHover()` resolves labels, place spheres, route lines, and area polygons under the cursor, with the same pick priority as click selection. Place-only sphere picking remains on `findWorldMarkerAtScreen()` for legacy callers.

**Reason**

Foundation 21 added polygon and label selection but left hover on sphere anchors only. The spatial contract pairs hover and selection; area and label markup should preview highlight before click without duplicate picking logic in Lab.

**Consequences**

- Lab hover readout updates for metro polygons, labels, and the London–Dubai route.
- Highlight follows hover across markup kinds via existing `syncMarkupHighlight()`.
- Hover and selection share one screen-space picker implementation.

---

## 2026-08-15 — Foundation 25 circle markup picking

**Decision**

Flat circle markup is included in the interactive picker via a screen-space radius test projected from `radiusMeters`. Pick priority is label → sphere → circle → line → polygon. Lab adds `{place-id}-core` circles (3 km) beneath metro polygons so circles are hoverable and selectable separately from pentagon/hexagon areas.

**Reason**

`WorldCircleMarkup` rendered in Foundation 9 but was omitted from Foundation 21 selection and Foundation 24 hover. Circles are a distinct ground-plane primitive from polygons and spheres and need the same interaction coverage.

**Consequences**

- `circleMarkupFromCenter()` helper lives in `src/geometry/circleMarkup.ts`.
- Core circles pick before surrounding polygon fills and route lines at the same screen point.
- All five markup kinds now participate in hover and selection.

---

## 2026-08-15 — Foundation 26 interaction polish

**Decision**

Three interaction gaps are closed to finish the spatial event surface. Place highlight linking expands a hovered or selected place id to its `-label`, `-core`, and `-area` markup siblings via `placeHighlightIds.ts`. Animated framing emits throttled `onCameraChange()` updates with `transitionProgress` (5% buckets) and clears progress when the transition settles or is cancelled. Pointer leave already clears hover through `AtlasMapView` (`pointerleave` → `clearGeoHover()`).

**Reason**

Foundation 22 intentionally omitted per-frame camera events; products still need transition progress without polling MapLibre. Place selection highlighted only spheres and labels while Lab now renders core circles and metro polygons as a set.

**Consequences**

- Selecting or hovering `london` highlights sphere, label, core circle, and area polygon together.
- Lab camera readout shows transition progress percentages during city framing animations.
- `getCameraState()` returns settled state without `transitionProgress` after transitions complete.

---

## 2026-08-15 — Foundation 27 feature highlight API

**Decision**

Atlas exposes spatial-contract highlight controls through `highlightFeature(featureId)`, `getHighlightedFeatureId()`, and `clearHighlights()`. Explicit highlights are separate from hover and selection state; visual priority is selection, then hover, then explicit highlight. `highlightPlace()` remains as a convenience alias. Place sibling expansion from Foundation 26 applies to all highlight sources.

**Reason**

`SPATIAL-CONTRACT.md` requires applications to highlight geographic features and clear highlights without pointer interaction. Previously only `highlightPlace()` existed and it incorrectly wrote selection state without emitting selection events.

**Consequences**

- Lab adds route highlight and clear buttons; readout shows the resolved active highlight id.
- Products can spotlight routes, areas, or labels programmatically.
- `clearHighlights()` resets hover, selection, and explicit highlight together.

---

## 2026-08-15 — Foundation 28 runtime style registration + transition state query

**Decision**

Atlas exposes runtime basemap registration through `registerMapStyle(def)` on the default `MapStyleRegistry`, wired via `resolveMapStyle` and `AtlasEngine.registerMapStyle()`. Products can register custom styles before or after engine construction; `listMapStyles()` and `setMapStyle(styleId)` resolve against the same registry. Transition state is queryable through `isTransitionRunning()`, backed by `CameraTransitionRunner`. `getCameraState()` includes `transitionProgress` while a transition is active (defaulting to `0` before the first animation frame) and omits it once the transition settles or is cancelled.

**Reason**

The spatial contract requires basemap style selection without hard-coding every product style in Atlas builtins, and transition progress without polling MapLibre every frame. Foundation 26 added throttled `onCameraChange()` progress events but left no synchronous transition-running query or guaranteed `getCameraState()` progress during active framing.

**Consequences**

- Module export: `registerMapStyle` from `src/index.ts`; engine method mirrors it on `AtlasEngine`.
- Lab readout shows `isTransitionRunning()` during city framing animations.
- `getCameraState().transitionProgress` is defined for the full active transition window.

---

## 2026-08-15 — Creator Studio consumes Atlas through the public API

**Decision**

Creator Studio’s Director map is a live product consumer of Locational Atlas. Studio talks only to the public engine surface (`AtlasEngine`, `AtlasMapView`, and the exports in `src/index.ts`). Atlas remains a sibling git repo, linked from Studio as `file:../Locatial-Atlas` with a Vite alias into `src/`. Lab is not a product API.

**Reason**

Studio retired in-repo Spatial (`MapViewport` / `SpatialEngine`) for the Director map. Atlas already owns camera, terrain, markup display, and geographic events. Consuming the public contract — rather than copying Atlas or importing `lab/` / renderer folders — keeps the Lab-to-product boundary real and lets Atlas edits appear in Studio while `npm run dev` is running.

**Consequences**

- Breaking or silently widening `src/index.ts`, `AtlasEngine`, `AtlasMapView`, camera state, Place, markup, or event types will break Studio immediately.
- Studio must not import `lab/` or `src/rendering/maplibre/*` / `src/rendering/three/*`. Do not add “convenience” leaks to make Studio work.
- Studio maps `locational-atlas` types through its own `.d.ts` shim because Atlas MapLibre 5 types collide with Studio MapLibre 6. Do not “fix” that by exposing renderer types from Atlas.
- Atlas still uses `import maplibregl from "maplibre-gl"`. Studio rewrites that default import at Vite compile time. Changing MapLibre import style or major version is an explicit, documented decision.
- `public/map-styles/locatial-editorial.json` is copied into Studio. Editing that file here requires Studio to recopy it.
- Atlas has no draw API. `setWorldMarkup()` displays geometry Studio already owns. Terra Draw, story globe overlay, aesthetic rail, and Spatial playback remain Studio/Spatial seams until explicitly tasked.
- Commits do not cross repos. Atlas changes land here; Studio adapters stay in Studio.

---

## 2026-08-15 — Foundation 29 library peer dependency packaging

**Decision**

Runtime packages externalized by the Vite library build (`react`, `react-dom`, `maplibre-gl`, `three`, `@turf/turf`, optional `gsap`) move from `dependencies` to `peerDependencies`. Atlas keeps them in `devDependencies` for Lab. A `validate` script runs `typecheck`, `lint`, and `build`; `prepublishOnly` calls `validate`.

**Reason**

Foundation 28 added the library build and documented host-app runtime requirements in `INTEGRATION.md`, but npm still installed those packages as Atlas dependencies. Peer declarations match the externalized bundle, prevent duplicate React/MapLibre/Three copies in consumers, and surface missing installs at `npm install` time.

**Consequences**

- Creator Studio and other consumers must declare matching runtime deps explicitly (Studio already does).
- `gsap` remains optional until camera motion uses it.
- CI or pre-publish checks can use `npm run validate` as a single gate.

---

## 2026-08-15 — Foundation 30 runtime terrain source registration

**Decision**

Atlas exposes runtime terrain source registration through `registerTerrainSource(def)` on the default `TerrainRegistry`, wired via `resolveTerrain` and `AtlasEngine.registerTerrainSource()`. Products can register custom DEM tile sources before or after engine construction; `listTerrainSources()` and `setTerrainSource(sourceId)` resolve against the same registry. Registration validates that `id` and `url` are non-empty.

**Reason**

Foundation 28 added runtime basemap style registration; terrain sources still required hard-coding every product DEM endpoint in Atlas builtins. The spatial contract requires swappable terrain without leaking provider URLs into Lab or Studio.

**Consequences**

- Module export: `registerTerrainSource` from `src/index.ts`; engine method mirrors it on `AtlasEngine`.
- Lab labels updated to Foundation 30; no new Lab terrain UI beyond existing selector.
- GitHub Actions `validate` workflow runs `npm run validate` on push/PR to `main`.

---

## 2026-08-15 — Foundation 31 view mode contract

**Decision**

Atlas exposes geographic presentation through `getViewMode()`, `setViewMode(mode)`, `listViewModes()`, and `onViewModeChange()`. Modes are `globe` (MapLibre globe projection), `map` (Mercator with full 3D pitch for editorial map work), and `mercator` (flat Mercator with pitch clamped to 0). MapLibre applies projection and pitch policy in `viewModeSetup.ts`; globe overlay alignment is implemented in Foundation 36.

**Reason**

README and `RENDERING-SYSTEM.md` assign globe/map rendering to Atlas. Products need a renderer-agnostic view-mode contract before Studio can drive globe-to-street transitions through the public API.

**Consequences**

- Default view mode is `map` (preserves prior Lab behavior).
- `AtlasEngineOptions.viewMode` sets the initial mode before attach.
- Style reloads re-apply the active view mode and atmosphere.

---

## 2026-08-15 — Foundation 32 atmosphere and overlay lighting

**Decision**

Sky/atmosphere and Three.js overlay lighting live in `src/rendering/lighting/`. `AtmosphereSettings` drives MapLibre `setSky()` through `applyAtmosphereToMap()`; `LightingSettings` drives a shared `OverlayLightingRig` (ambient, hemisphere, directional) attached to each markup scene. Atlas exposes `get/setAtmosphereSettings`, `get/setLightingSettings`, and change listeners. Defaults ship in `atmosphereDefaults.ts`; engine options accept partial overrides.

**Reason**

Atlas owns lighting, materials, and atmosphere per README. MapLibre sky and a centralized overlay lighting rig establish the reusable visual-environment boundary without exposing shader or renderer internals.

**Consequences**

- Markup still uses basic materials; lighting rig is ready for future PBR materials.
- Lab toggles atmosphere and lighting and applies a warm-sky preset.
- Disabling atmosphere clears MapLibre sky.

---

## 2026-08-15 — Foundation 33 public ground elevation query

**Decision**

Atlas exposes `queryGroundElevation(lng, lat)` on `AtlasEngine`, returning terrain elevation in meters when terrain is enabled and the map is attached, otherwise `0` on flat maps or `null` when detached. The method wraps the existing MapLibre terrain query in `MapLibreAdapter.queryGroundElevation()`.

**Reason**

Products need programmatic elevation lookup separate from pointer unprojection. Lab readout shows query results alongside unproject ground height for comparison when terrain is toggled.

**Consequences**

- Module export is engine-only; no new provider types.
- Elevation remains approximate until terrain tiles are fully loaded.
- Lab label updated to Foundation 33.

---

## 2026-08-15 — Foundation 34 PBR markup materials

**Decision**

World-space overlay materials are defined centrally in `src/rendering/three/markupMaterials.ts`. Mesh markup kinds (`sphere`, `polygon`, `circle`) use `MeshStandardMaterial` when `LightingSettings.enabled` is true so they respond to `OverlayLightingRig`; when lighting is disabled they fall back to `MeshBasicMaterial` for the prior flat appearance. Lines keep `LineBasicMaterial`; labels keep canvas `SpriteMaterial` (documented non-PBR paths).

**Reason**

`RENDERING-SYSTEM.md` requires materials to be defined centrally rather than inside scenes. Foundation 32 attached overlay lighting; Foundation 34 connects mesh markup to that rig without exposing Three.js types through the public API.

**Consequences**

- `ThreeOverlayAdapter` creates and updates materials through the shared factory; toggling lighting swaps mesh material mode in place.
- Studio continues to drive material appearance indirectly via `setLightingSettings({ enabled })` and existing atmosphere/lighting options.
- Lab label updated to Foundation 34.

---

## 2026-08-15 — Foundation 35 overlay shadow foundation

**Decision**

Directional overlay shadows are configured in `src/rendering/lighting/overlayShadowConfig.ts` and driven through extended `LightingSettings` (`shadowEnabled`, `shadowIntensity`). `OverlayLightingRig` enables PCF soft shadow maps on the shared directional light; lit mesh markup renders in a composite `litScene` with anchor-group world matrices so shadow maps align with MapLibre projection. Spheres cast shadows; polygons and circles receive; optional per-anchor `ShadowMaterial` ground planes provide contact shadows.

**Reason**

`RENDERING-SYSTEM.md` and `ARCHITECTURE.md` assign shadow systems to `src/rendering`. Foundation 32–34 established atmosphere, overlay lighting, and PBR mesh materials; Foundation 35 connects directional shadows to that rig without exposing Three.js types through the public API.

**Consequences**

- `setLightingSettings({ shadowEnabled })` and `onLightingChange` refresh shadow cast/receive flags and ground receivers.
- MapLibre terrain remains a non-receiver for now; overlay-on-overlay and ground-plane contact shadows are supported.
- Lab adds a shadow toggle and Foundation 35 labels.
- Studio continues to use the public lighting API only.

**Limitations**

- Basemap/terrain shadow receiving deferred until MapLibre/Three depth integration is defined.
- Lines and labels are excluded from the shadow pass.
- Single ortho frustum per frame; cascaded shadows not yet implemented.

---

## 2026-08-15 — Foundation 36 globe Three overlay alignment

**Decision**

Globe overlay model matrices live in `src/world/overlayModelMatrix.ts`. When `viewMode === "globe"`, markup anchors use MapLibre `map.transform.getMatrixForModel(lngLat, altitudeMeters)` so local meter geometry shares the same unit-sphere space as `defaultProjectionData.mainMatrix`. Map and flat-mercator modes keep the existing `mercatorTransform.ts` path unchanged. `MapLibreAdapter.setViewMode()` refreshes markup grounding so matrices recompute after projection changes; lit shadow anchors reuse the same matrices for ortho frustum fitting.

**Reason**

Foundation 31 established the view-mode contract and Foundation 35 added lit shadow anchors, but both still assumed Mercator placement while MapLibre supplies globe custom-layer projection via `getProjectionDataForCustomLayer()`. Using MapLibre's documented model-matrix helper keeps Three.js overlays aligned during globe camera motion without duplicating globe math.

**Consequences**

- `ThreeOverlayAdapter` routes matrix creation through `createOverlayMatrixForMarkup()`.
- Shadow ground receivers and directional frustum bounds inherit globe-aware anchor transforms automatically.
- Lab readout shows active projection path (`globe matrices` vs `mercator matrices`).

**Limitations**

- Line and polygon local geometry is still built in a single-anchor mercator meter frame; long geodesic spans may diverge slightly on the sphere until geometry generation becomes globe-aware.
- MapLibre globe/mercator projection blend during zoom transitions follows MapLibre's `_globeness` interpolation; Atlas does not override it.
- Terrain elevation on globe uses MapLibre model altitude above the nominal sphere, not per-vertex draping.
- Label sprites remain billboards without tangent-plane rotation on globe.

---

## 2026-08-15 — Foundation 37 view-mode projection blend

**Decision**

Atlas keeps Three.js overlay matrices aligned during MapLibre's globe↔mercator projection interpolation (`projectionTransition` / `_globeness`). While blend progress is strictly between 0 and 1, `ThreeOverlayAdapter` refreshes markup grounding each custom-layer frame; `overlayModelMatrix.ts` routes map mode through `getMatrixForModel` whenever transition > 0. View-mode switches that involve globe defer `onViewModeChange` until projection settles and emit throttled `transitionProgress` on interim events, matching the camera transition pattern. Instant switches (map↔mercator, globe→map) still settle on the next frame.

**Reason**

Foundation 36 aligned overlays in settled globe or mercator states, but `setViewMode` snapped logical mode while MapLibre continued interpolating projection during zoom and globe entry. Markup anchors and shadow receivers drifted for the duration of the blend.

**Consequences**

- `projectionBlend.ts` centralizes reading blend progress from MapLibre custom-layer projection data.
- `MapLibreAdapter` listens on map `render` to refresh grounding and forward blend progress to the engine.
- `ViewModeChangeEvent` gains optional `transitionProgress`; Lab readout and `ViewModeSelector` show blend percentage.
- Shadow anchors inherit per-frame matrix refresh automatically.

**Limitations**

- No Atlas-owned `transitionViewMode()` animation yet; projection timing follows MapLibre zoom and `setProjection` behavior.
- Zoom-driven globe↔mercator blends do not emit view-mode events (view mode unchanged); only overlay matrices refresh.
- Line/polygon geometry remains single-anchor mercator meters (Foundation 36 limitation).
- `map↔mercator` pitch-only switches remain instant with no blend tracking.
- High-frequency zoom transitions may refresh matrices every frame; acceptable for current markup counts but not yet batched.

---

## 2026-08-15 — Foundation 38 boundary layer registry

**Decision**

Boundary polygons render through a provider-agnostic registry in `src/data/boundaries`. Applications register `BoundaryLayerDefinition` entries (GeoJSON url or inline data, semantic type, style tokens) via `registerBoundaryLayer()` or `AtlasEngine.registerBoundaryLayer()`, then enable layers with `setBoundaryLayers(ids[])`. MapLibre fill and line layers are composed in `boundarySetup.ts` behind `MapLibreAdapter`; consumers never touch MapLibre source or layer ids.

**Reason**

Studio and future products need jurisdictional overlays without hard-coded demo geometry in `src` or direct MapLibre coupling. The registry mirrors map-style and terrain patterns established in Foundations 5 and 7.

**Consequences**

- Hover and selection extend the existing `onGeoHover` / `onGeoSelect` pipeline: markup picks first, then `queryRenderedFeatures` on enabled boundary layers.
- Boundary feature ids use the `boundary:{layerId}:{featureKey}` prefix; highlight uses MapLibre feature-state on registered GeoJSON sources.
- No built-in boundary layers ship in `src`; Lab registers demo metro polygons at runtime.
- Style swaps re-sync enabled boundary layers after the basemap reloads.

**Limitations**

- Polygon-only GeoJSON sources in this foundation; MultiPolygon and line boundaries deferred.
- Multiple enabled layers re-add on every `setBoundaryLayers` call; diffing and incremental updates can follow if layer counts grow.
- Boundary hover does not yet participate in place-id expansion (`placeHighlightIds`); explicit boundary ids only.

## 2026-08-15 — Foundation 39 label layer registry

**Decision**

Map label layers render through a provider-agnostic registry in `src/data/labels`. Applications register `LabelLayerDefinition` entries (GeoJSON point features, semantic type, text field, style tokens) via `registerLabelLayer()` or `AtlasEngine.registerLabelLayer()`, then enable layers with `setLabelLayers(ids[])`. MapLibre symbol layers are composed in `labelSetup.ts` behind `MapLibreAdapter`; consumers never touch MapLibre source or layer ids.

**Reason**

Studio and future products need basemap-aligned text overlays (city names, POIs, administrative labels) without hard-coded demo geometry in `src` or direct MapLibre coupling. The registry mirrors the boundary layer pattern from Foundation 38.

**Consequences**

- Hover and selection extend the existing `onGeoHover` / `onGeoSelect` pipeline: world markup picks first, then registered label symbol layers, then boundary layers.
- Label feature ids use the `label:{layerId}:{featureKey}` prefix; highlight uses MapLibre feature-state on registered GeoJSON sources.
- Symbol text requires the active map style to define a `glyphs` URL (documented in `labelSetup.ts`; `locatial-editorial` satisfies this).
- No built-in label layers ship in `src`; Lab registers demo city point labels at runtime.
- Style swaps re-sync enabled label layers after the basemap reloads.

**Limitations**

- Point-only GeoJSON sources in this foundation; line-following labels and clustered labels deferred.
- Default font stack assumes Noto Sans from OpenFreeMap glyphs; custom fonts require matching glyph hosting.
- Label hover does not yet participate in place-id expansion (`placeHighlightIds`); explicit label ids only.

## 2026-08-15 — Foundation 40 road layer registry

**Decision**

Road and path layers render through a provider-agnostic registry in `src/data/roads`. Applications register `RoadLayerDefinition` entries (GeoJSON LineString or MultiLineString, semantic type, style tokens) via `registerRoadLayer()` or `AtlasEngine.registerRoadLayer()`, then enable layers with `setRoadLayers(ids[])`. MapLibre line layers with optional casing are composed in `roadSetup.ts` behind `MapLibreAdapter`; consumers never touch MapLibre source or layer ids.

**Reason**

Studio and future products need route corridors, transit paths, and highway overlays without hard-coded demo geometry in `src` or direct MapLibre coupling. The registry mirrors the boundary and label layer patterns from Foundations 38 and 39.

**Consequences**

- Hover and selection extend the existing `onGeoHover` / `onGeoSelect` pipeline: world markup picks first, then registered label layers, then road layers, then boundary layers.
- Road feature ids use the `road:{layerId}:{featureKey}` prefix; highlight uses MapLibre feature-state on registered GeoJSON sources.
- Optional casing renders as a wider underlying line when `casingWidth` exceeds `width`; dashed routes use `dashArray` style tokens.
- No built-in road layers ship in `src`; Lab registers a London–Dubai geodesic corridor at runtime.
- Style swaps re-sync enabled road layers after the basemap reloads.

**Limitations**

- LineString and MultiLineString GeoJSON only; polygon buffers and animated paths deferred.
- Road hover does not yet participate in place-id expansion; explicit road ids only.
- Casing is a single pass; multi-layer cartographic casings (e.g. highway shields) deferred.

## 2026-08-15 — Foundation 41 area layer registry

**Decision**

Area and fill layers render through a provider-agnostic registry in `src/data/areas`. Applications register `AreaLayerDefinition` entries (GeoJSON Polygon or MultiPolygon, semantic type, fill and outline style tokens) via `registerAreaLayer()` or `AtlasEngine.registerAreaLayer()`, then enable layers with `setAreaLayers(ids[])`. MapLibre fill and outline layers are composed in `areaSetup.ts` behind `MapLibreAdapter`; consumers never touch MapLibre source or layer ids.

**Reason**

Studio and future products need parks, zones, land-use overlays, and thematic fills without hard-coded demo geometry in `src` or direct MapLibre coupling. The registry mirrors the boundary, label, and road layer patterns from Foundations 38–40.

**Consequences**

- Hover and selection extend the existing `onGeoHover` / `onGeoSelect` pipeline: world markup picks first, then registered label layers, then road layers, then area layers, then boundary layers.
- Area feature ids use the `area:{layerId}:{featureKey}` prefix; highlight uses MapLibre feature-state on registered GeoJSON sources.
- Render stack (bottom → top): boundaries → areas → roads → labels → Three overlay. Area layers insert before the first road or label layer when present.
- Optional `pattern` style tokens map to MapLibre `fill-pattern` when the active style exposes matching sprite images.
- No built-in area layers ship in `src`; Lab registers London park and Dubai business zone polygons at runtime.
- Style swaps re-sync enabled area layers after the basemap reloads.

**Limitations**

- Polygon and MultiPolygon GeoJSON only; extruded fills and animated patterns deferred.
- Area hover does not yet participate in place-id expansion; explicit area ids only.
- Fill patterns require sprite images in the active map style; no built-in pattern catalog ships in Atlas.

## 2026-08-15 — Foundation 42 building layer registry

**Decision**

Building footprint layers render through a provider-agnostic registry in `src/data/buildings`. Applications register `BuildingLayerDefinition` entries (GeoJSON Polygon or MultiPolygon footprints, semantic type, fill-extrusion style tokens) via `registerBuildingLayer()` or `AtlasEngine.registerBuildingLayer()`, then enable layers with `setBuildingLayers(ids[])`. MapLibre `fill-extrusion` layers are composed in `buildingSetup.ts` behind `MapLibreAdapter`; consumers never touch MapLibre source or layer ids.

**Reason**

Studio and future products need extruded building footprints for editorial city scenes without hard-coded demo geometry in `src` or direct MapLibre coupling. MapLibre native fill-extrusion keeps footprints aligned with the basemap and terrain; a Three.js hybrid remains available later if extrusion limits block a use case.

**Consequences**

- Hover and selection extend the existing `onGeoHover` / `onGeoSelect` pipeline: world markup picks first, then registered label layers, then road layers, then building layers, then area layers, then boundary layers.
- Building feature ids use the `building:{layerId}:{featureKey}` prefix; highlight uses MapLibre feature-state on registered GeoJSON sources.
- Render stack (bottom → top): boundaries → areas → buildings → roads → labels → Three overlay. Building layers insert before the first road or label layer when present.
- Extrusion height resolves from a configurable GeoJSON property (default `heightMeters`) with a layer-level `heightMeters` fallback.
- No built-in building layers ship in `src`; Lab registers London and Dubai footprint clusters at runtime.
- Style swaps re-sync enabled building layers after the basemap reloads.

**Limitations**

- MapLibre `fill-extrusion` on globe projection can flatten or misalign extrusions during projection blend; prefer map view or settled mercator for reliable 3D footprints.
- Polygon and MultiPolygon GeoJSON only; mesh roofs, detailed facades, and animated construction deferred to a future Three hybrid if needed.
- Height requires numeric meters on features or a fixed layer fallback; no automatic OSM or 3D Tiles ingestion ships in Atlas.
- Building hover does not yet participate in place-id expansion; explicit building ids only.
- Picking uses 2D footprint queries; vertical face hits on extruded walls are not distinguished from footprint fills.

## 2026-08-15 — Foundation 43 async layer loading

**Decision**

GeoJSON layers that declare a remote URL load through a centralized `LayerSourceLoader` in `src/data`. MapLibre sources mount immediately with an empty `FeatureCollection`; fetched data is applied via `setData` when ready. Inline GeoJSON remains synchronous. `AtlasEngine` exposes `getLayerLoadState(layerId)`, `getLayerLoadStates()`, `onLayerLoadChange`, and `retryLayerLoad(layerId, family?)`. Failed URL loads emit recoverable `onMapError` events with kind `layer-load`. `onMapReady` fires when the basemap style is ready (partial ready); enabled URL layers continue loading progressively afterward.

**Reason**

All five layer registries (boundary, label, road, area, building) accepted GeoJSON URLs but delegated fetch lifecycle to MapLibre with no loading/error/retry surface, no cancellation on style swap, and no visibility into load progress for Studio consumers.

**Consequences**

- `LayerLoadStatus` tracks `idle | loading | ready | error` per enabled layer id.
- Style swaps invalidate in-flight fetches via `AbortController`; layers re-sync after the basemap reloads.
- Progressive enable: map layers appear immediately (empty) and populate when data arrives.
- Lab registers `paris-metro-url` boundary layer loading from `/lab/geojson/paris-metro.geojson`.
- Inline GeoJSON layers report `ready` immediately without a network round trip.

**Limitations**

- No request deduplication across duplicate URLs; each layer id loads independently.
- No caching layer beyond the current map session; revisiting a layer re-fetches unless the browser cache hits.
- POI and cluster layers deferred to Foundation 44.

## 2026-08-15 — Foundation 44 POI / cluster layer registry

**Decision**

POI point layers render through a provider-agnostic registry in `src/data/pois`. Applications register `PoiLayerDefinition` entries (GeoJSON Point or MultiPoint features, semantic type, symbol or circle style tokens, optional cluster config) via `registerPoiLayer()` or `AtlasEngine.registerPoiLayer()`, then enable layers with `setPoiLayers(ids[])`. MapLibre GeoJSON sources with optional clustering and symbol or circle layers are composed in `poiSetup.ts` behind `MapLibreAdapter`; consumers never touch MapLibre source or layer ids. Cluster expansion uses `expandClusterAt(screenX, screenY)` on click or `frameCluster(layerId, clusterId)` to fit leaf features.

**Reason**

Studio and future products need interactive landmark and amenity markers with optional density clustering, without hard-coded demo geometry in `src` or direct MapLibre coupling. The registry mirrors label and building layer patterns from Foundations 39 and 42, extended with MapLibre cluster source options from Foundation 43 async loading.

**Consequences**

- Hover and selection extend the existing `onGeoHover` / `onGeoSelect` pipeline: world markup picks first, then registered POI layers, then labels, roads, buildings, areas, and boundaries.
- POI feature ids use the `poi:{layerId}:{featureKey}` prefix; cluster picks use `poi:{layerId}:cluster:{clusterId}`. Highlight uses MapLibre feature-state on unclustered points only.
- Optional clustering renders circle and count layers plus unclustered symbol or circle markers; `clusterProperties` passes through to MapLibre when provided.
- Async URL POI layers load through `LayerSourceLoader` with family `poi`.
- No built-in POI layers ship in `src`; Lab registers London and Dubai landmark presets plus a Paris async URL layer at runtime.
- Style swaps re-sync enabled POI layers after the basemap reloads.

**Limitations**

- Point and MultiPoint GeoJSON only; polygon POI footprints and heatmaps deferred.
- Custom `iconImage` sprites require matching images in the active map style; default rendering uses circle markers.
- Cluster expansion eases the camera to MapLibre's expansion zoom; spiderfy layouts and supercluster custom reducers deferred.
- POI hover does not yet participate in place-id expansion; explicit POI ids only.
- `frameCluster` computes bounds from cluster leaf coordinates only; no padding or minimum zoom policy yet.

**Next**

- Foundation 45: raster / imagery overlay registry with tile URL sources, opacity tokens, and z-order relative to vector layers.

## 2026-08-15 — Foundation 45 raster / imagery overlay registry

**Decision**

Raster imagery layers render through a provider-agnostic registry in `src/data/rasters`. Applications register `RasterLayerDefinition` entries (XYZ tile templates or TileJSON URL, semantic type, opacity/brightness/contrast tokens, optional zoom range and bounds) via `registerRasterLayer()` or `AtlasEngine.registerRasterLayer()`, then enable layers with `setRasterLayers(ids[])`. MapLibre raster sources and layers are composed in `rasterSetup.ts` behind `MapLibreAdapter`; consumers never touch MapLibre source or layer ids.

**Reason**

Studio and future products need satellite, hillshade, and thematic imagery overlays composited beneath vector editorial layers, without hard-coded tile URLs in `src` or direct MapLibre coupling. The registry mirrors vector layer patterns from Foundations 39–44 while using native MapLibre raster sources for GPU compositing with the basemap.

**Consequences**

- Render stack (bottom → top): raster imagery → boundaries → areas → buildings → roads → POIs → labels → Three overlay. Raster layers insert below the first boundary layer (or below symbol layers when no boundaries are enabled).
- Tile source lifecycle tracks `loading | ready | error` per enabled raster id through `RasterSourceLoadTracker`; query via existing `getLayerLoadState` / `onLayerLoadChange` with family `raster`.
- Tile failures on registered raster sources emit recoverable `onMapError` events with kind `tile-load` and `layerFamily: "raster"`. Retry via `retryLayerLoad(layerId, "raster")`.
- No built-in raster layers ship in `src`; Lab registers Esri World Imagery and Stamen Toner presets at runtime.
- Style swaps re-sync enabled raster layers after the basemap reloads.

**Limitations**

- Raster layers are display-only; no hover, selection, or feature ids.
- XYZ templates and TileJSON URLs only; WMS, COG, and dynamic mosaic sources deferred.
- Opacity and raster paint tokens apply at layer level; per-tile styling and temporal sequences deferred.
- Lab demo tiles depend on third-party endpoints (Esri, Stadia); production apps should register their own sources with appropriate attribution.
- Multiple raster layers stack in registration order but share the same z-anchor below vector overlays; explicit per-layer z-index policy deferred.

**Next**

- Foundation 46: GSAP camera path integration, 3D Tiles overlay registry, or Studio integration documentation update.

## 2026-08-15 — Camera path family modules

**Decision**

Live camera path families live under `src/camera/paths/`, each as a TypeScript sampler plus a markdown brief. `src/camera/CAMERA-SYSTEM.md` is the governing file. Root `CAMERA-SYSTEM.md` is a pointer. Planned families (`linear`, `high-arc`, `low-arc`, `route`) are signpost markdown only — they do not have `CameraPathFamily` ids and must not be auto-selected or parsed at runtime. Lab buttons, when added, target a live family id.

**Reason**

Path shape should be isolatable so each move can be aged without turning `sampleTransitionPath.ts` into a switchboard of unrelated animation. The public camera contract is unchanged: distance still auto-selects `local-glide`, `orbit-reveal`, or `departure-arrival-arc`, and products still call `framePlace` / `frameBounds` / `setCamera`.

**Consequences**

- `CameraTransitionRunner` still owns progress and easing. Samplers only emit `CameraState`.
- Promoting a planned family requires a sampler, a contract id, a dispatcher branch, and a decision note.

## 2026-08-15 — Foundation 46 GSAP camera path integration

**Decision**

`CameraTransitionRunner` advances transition progress through an internal GSAP timeline adapter (`src/camera/gsapPlayback.ts`) when the host installs the optional `gsap` peer dependency. Path-family easing tokens live in `transitionEasing.ts` (`power2.inOut` for `local-glide`, `power3.inOut` for `orbit-reveal`, `power4.inOut` for `departure-arrival-arc`). GSAP types and timeline objects never cross the public API. All three live path families share the same GSAP playback path; spatial shape remains in `sampleTransitionPath.ts` / `paths/`.

**Reason**

Cinematic camera motion is core Atlas product value. GSAP is already declared as an optional peer dependency and externalized in the library build. Wiring the runner to GSAP timelines replaces hand-rolled rAF easing with production-grade playback while preserving the existing contract: `onCameraTransition`, throttled `onCameraChange` with `transitionProgress`, `isTransitionRunning()`, and `getCameraState().transitionProgress` during active transitions.

**Consequences**

- **GSAP playback:** all live path families (`local-glide`, `orbit-reveal`, `departure-arrival-arc`) when `gsap` is installed.
- **Legacy fallback:** `requestAnimationFrame` + cubic ease-in-out when `gsap` is absent (unchanged behavior for hosts that skip the peer).
- Lab PlaceSelector and readout label Foundation 46; London ↔ Dubai visibly exercises `departure-arrival-arc` GSAP easing.
- `INTEGRATION.md` updated: `gsap` peer now powers camera transitions.

**Limitations**

- No public `setTransitionEasing` API yet; ease override is an internal runner option only.
- Legacy rAF fallback does not use path-family-specific easing tokens.
- GSAP is still optional; hosts wanting cinematic motion should install `gsap@^3`.

**Next**

- Foundation 47: 3D Tiles overlay registry, path-family easing on legacy fallback, or `setTransitionEasing` on the public contract if Studio needs it.

## 2026-08-15 — Foundation 47 3D Tiles overlay registry

**Decision**

3D Tiles overlays use a provider-agnostic registry in `src/data/tilesets3d`. Applications register `Tileset3DLayerDefinition` entries (tileset root URL, semantic type, opacity tokens, optional georeferenced transform) via `registerTileset3DLayer()` or `AtlasEngine.registerTileset3DLayer()`, then enable layers with `setTileset3DLayers(ids[])`. MapLibre GL JS **5.6.x has no native 3D Tiles / batched-model source** (unlike Mapbox GL JS v3). Atlas therefore ships registry + async tileset validation + a **stub adapter** in `src/rendering/three/tileset3DSetup.ts` that never silently no-ops: enabling a layer fetches and validates `tileset.json`, then reports a clear renderer-unavailable error until live rendering lands.

**Reason**

Studio and future products need photogrammetry, city mesh, and point-cloud overlays composited with the editorial basemap without hard-coded tileset URLs in `src` or direct MapLibre coupling. The registry mirrors raster (F45) and async GeoJSON (F43) patterns while documenting the correct rendering path: **Three.js custom layer + `3d-tiles-renderer`** (MapLibre’s own example), not a MapLibre raster/vector source.

**Consequences**

- Public contract: `listTileset3DLayers`, `registerTileset3DLayer`, `getEnabledTileset3DLayerIds`, `setTileset3DLayers`.
- Load lifecycle family: `tiles3d` — `loading | error` today (renderer stub); `ready` reserved for when the Three.js adapter mounts tile content.
- Tileset validation uses fetch + minimal root JSON shape check; abort on disable or style swap.
- Failures emit recoverable `onMapError` with kind `layer-load` and `layerFamily: "tiles3d"`. Retry via `retryLayerLoad(layerId, "tiles3d")`.
- No built-in 3D Tiles layers ship in `src`; Lab registers the Re:Earth Buildings public tileset at runtime.
- Style swaps cancel in-flight tileset loads and re-sync enabled layers after basemap reload.

**Limitations**

- **No live rendering in F47** — validated tilesets still error with `TILESET3D_RENDERER_UNAVAILABLE_MESSAGE`.
- Opacity/transform tokens are stored on the definition but not applied until the Three.js adapter exists.
- No hover, selection, or feature ids on 3D Tiles overlays.
- Lab demo tileset depends on a third-party endpoint (Re:Earth Buildings); production apps should register their own tilesets with appropriate attribution and access tokens where required.
- Adding `3d-tiles-renderer` as a dependency is deferred to the rendering adapter milestone (F48 candidate).

**Next**

- Foundation 48: Three.js + `3d-tiles-renderer` custom layer adapter, path-family easing on legacy rAF fallback, or Studio integration documentation update.

## 2026-08-15 — Foundation 48 3D Tiles Three.js renderer adapter

**Decision**

Foundation 47’s stub is replaced by `Tileset3DOverlayAdapter` in `src/rendering/three/Tileset3DOverlayAdapter.ts`. Each enabled `Tileset3DLayerDefinition` mounts a dedicated MapLibre custom layer (`renderingMode: "3d"`) with one `TilesRenderer` instance from the optional peer `3d-tiles-renderer`. The adapter validates `tileset.json`, dynamically imports the renderer module (mirroring the GSAP optional-peer pattern in `tilesRendererLoader.ts`), syncs the MapLibre and Three.js cameras each frame (MapLibre’s official 3D Tiles example), and routes globe placement through `createTileset3DPlacementMatrix` / `overlayModelMatrix` conventions. Opacity and georeferenced transform tokens on the layer definition apply at render time. Load lifecycle family `tiles3d` reaches `ready` after the tileset root loads — not a renderer-unavailable error.

**Reason**

MapLibre GL JS 5.x has no native 3D Tiles source. Photogrammetry and city mesh overlays must render through a Three.js custom layer while staying behind Atlas’s provider-agnostic registry and load-state contract. Keeping `3d-tiles-renderer` optional avoids forcing every consumer to ship Draco/KTX2 tile pipelines when they only need markup overlays.

**Consequences**

- Optional peer: `3d-tiles-renderer@^0.5.0` (documented in `INTEGRATION.md`; externalized in the library build).
- Internal modules only: `Tileset3DOverlayAdapter`, `tilesRendererLoader`, `tileset3DPlacement` — no Three.js or `3d-tiles-renderer` types in `src/index.ts`.
- Without the peer installed, `setTileset3DLayers` still validates registry entries but emits a clear install hint via `tiles3d` load state / `onMapError`.
- Custom layers render below the world-markup Three overlay; `moveThreeLayerToTop` keeps markup above tilesets.
- Style swaps destroy and re-sync tileset layers; in-flight loads abort on disable.
- Lab registers Re:Earth Buildings and renders when enabled (fly to a covered city to inspect).

**Limitations**

- No hover, selection, or per-feature ids on 3D Tiles content.
- Draco/KTX2 decoders load from public CDN paths pinned to Atlas’s Three version — self-hosted decoder paths are not yet configurable.
- Tilesets without an explicit `transform` anchor from bounding-sphere center; explicit `Tileset3DTransform` recommended for production georeferencing.
- Re:Earth Buildings lab tileset depends on a third-party endpoint and global coverage varies by city.
- Multiple simultaneous 3D Tiles layers each own a custom layer and WebGL renderer context share (one `TilesRenderer` per layer).

**Next**

- Foundation 49: 3D Tiles depth compositing with terrain/basemap, self-hosted Draco/KTX2 paths, path-family easing on legacy rAF fallback, or Studio integration pass for `registerTileset3DLayer` + optional peer install docs.

## 2026-08-15 — FrameCameraOptions duration override

**Decision**

`framePlace` / `frameBounds` accept optional `durationMs` on `FrameCameraOptions`. `0` or less jumps instantly (CUT). Studio SceneRail transition preview uses this with `pathFamily: "straight"` for GLIDE and `pathFamily: "high-arc"` when type is ARC and Arc is `high`.

## 2026-08-15 — Foundation 49 3D Tiles depth compositing and production hardening

**Decision**

Foundation 48’s live renderer is hardened for production compositing and host configuration. `Tileset3DOverlayAdapter` renders with depth test and depth write enabled via shared helpers in `overlayDepthCompositing.ts`, compositing tileset meshes with MapLibre terrain and the basemap in the same WebGL depth buffer. `ThreeOverlayAdapter` continues to render world markup in a depth-disabled overlay pass above tileset custom layers; `moveThreeLayerToTop` runs after each tileset mount. Draco/KTX2 decoder asset paths are configurable through `AtlasEngineOptions.tileset3DDecoderBaseUrl` and optional per-layer `Tileset3DLayerDefinition.decoderBaseUrl` (resolved to `.../draco/` and `.../basis/` internally). Public framing APIs `flyToTilesetBounds(layerId)` and `frameTilesetOnReady(layerId)` derive geographic bounds from the tileset bounding sphere and reuse `frameBounds`.

**Reason**

Photogrammetry and city mesh overlays must occlude correctly against 3D terrain without breaking editorial markup visibility. CDN-pinned decoder defaults are unsuitable for air-gapped or self-hosted tile pipelines. Lab and Studio workflows need a contract-level way to frame a tileset once it reaches `ready` without exposing Three.js or `3d-tiles-renderer`.

**Consequences**

- Internal multi-pass contract documented in `overlayDepthCompositing.ts`; no Three.js or renderer types added to `src/index.ts`.
- Default decoder base remains a pinned unpkg URL for Atlas’s Three peer version; hosts override via engine options or per-layer definition.
- `flyToTilesetBounds` is a no-op when bounds are unavailable (layer disabled or not yet ready); `frameTilesetOnReady` resolves when the layer errors without framing.
- Lab auto-frames the Re:Earth Buildings sample on enable via `frameTilesetOnReady`.
- `INTEGRATION.md` documents decoder hosting and framing APIs for Studio consumers.

**Limitations**

- Bounding-volume framing uses a bounding-sphere approximation in WGS84 — not a tight oriented bounding box; explicit `Tileset3DTransform` still recommended for georeferencing.
- No hover, selection, or per-feature ids on 3D Tiles content.
- Semi-transparent tilesets (`opacity < 1`) disable depth write per mesh; stacking order may differ from opaque terrain occlusion.
- Multiple simultaneous tileset layers each own a custom layer; render order follows `setTileset3DLayers` definition order only.

**Next**

- Foundation 50: 3D Tiles picking/highlight hooks, tighter OBB framing, path-family easing on legacy rAF fallback, or Studio integration pass wiring `registerTileset3DLayer` + optional peer install in Creator Director.

## 2026-08-15 — Foundation 50 3D Tiles interaction and camera polish

**Decision**

Foundation 49’s production tileset path gains mesh-level interaction and tighter camera framing. `Tileset3DOverlayAdapter` raycast-picks loaded tile geometry using the same projection/view matrices stored each custom-layer render frame; feature ids use `tileset3d:{layerId}:{meshUuid}`. Pick order in `AtlasEngine.updateGeoHover` / `selectGeoAt` is world markup → POIs → 3D Tiles → labels → roads → buildings → areas → boundaries. Highlights reuse `highlightFeature(featureId)` with emissive tint on the hit mesh (internal `tileset3DHighlight.ts`). `computeTilesetGeographicBounds` prefers root OBB from `TilesRenderer.getOrientedBoundingBox`, then AABB, then bounding-sphere fallback. Legacy rAF camera playback in `CameraTransitionRunner` applies path-family polynomial easing (`power2/3/4.inOut` parity) via `applyLegacyTransitionEasing(linearProgress, pathFamily)`.

**Reason**

Photogrammetry workflows need hover/select on individual buildings without Studio importing renderer internals. Bounding-sphere framing was too loose for city-scale tilesets. Hosts without the optional `gsap` peer should get the same motion character as GSAP-backed transitions.

**Consequences**

- Pick/highlight helpers live under `src/interaction/tileset3dFeatureIds.ts` and `src/rendering/three/`; not exported from `src/index.ts`.
- Feature keys are mesh uuids (session-stable while loaded), not batch-table feature ids — documented in `INTEGRATION.md`.
- `INTEGRATION.md` adds tileset registration, pick/highlight, OBB framing, and optional-peers summary for Studio consumers.
- Lab labels advance to Foundation 50.

**Limitations**

- Pick requires at least one rendered frame after tileset `ready` (camera matrices cached during custom-layer render).
- Highlight is emissive-only; no outline or feature-id persistence across tile unload/reload.
- OBB framing uses root tile volume — not union of all loaded descendant tiles.
- Batch-table / EXT_mesh_features semantic ids are not yet surfaced.

**Next**

## 2026-08-15 — Foundation 51 stable tileset pick keys and path motion lab

**Decision**

Foundation 50’s tileset interaction gains semantic pick keys and per-feature framing. `featureKeyFromTilesetPickObject` prefers `EXT_mesh_features` ids (`mf:{id}@{objectUuid}`), then batch-table / batched-mesh ids (`batch:{id}@{objectUuid}`), then mesh `uuid`. `Tileset3DOverlayAdapter` registers `GLTFExtensionsPlugin` (metadata extensions) when the optional peer is present. Public `frameTilesetFeature(layerId, featureId)` derives geographic bounds from the picked mesh bbox (best-effort) and reuses `frameBounds`. Manual camera path families `straight` and `high-arc` are live samplers with ids in `CameraPathFamily`; Lab exposes all catalog entries via path-family buttons using `framePlace(place, { pathFamily })`. `CameraTransitionRunner` samples the requested family instead of re-running auto-select each frame.

**Reason**

Photogrammetry workflows need stable feature ids across reloads where batch tables or mesh features exist. Click-to-frame individual buildings completes the tileset interaction loop without Studio importing renderer internals. Side-by-side motion testing needs explicit path-family overrides without changing default city-button auto-select.

**Consequences**

- Pick/highlight helpers remain internal; `frameTilesetFeature` and `FrameCameraOptions` are on the public contract.
- Feature keys may include `@objectUuid` suffix for highlight resolution when semantic ids are used.
- Lab labels advance to Foundation 51; tileset click selects and frames the picked feature.
- `INTEGRATION.md` documents stable key formats and Studio wiring gaps.

**Limitations**

- Mesh-feature texture reads are synchronous only; async texture feature ids may miss on first pick.
- Per-feature framing uses mesh AABB in ECEF — not batch-table property bounds or union of instances.
- Batched-mesh highlight tints the whole batched object, not a single instance material.
- `straight` / `high-arc` are manual-only; distance auto-select unchanged.

**Next**

- Foundation 52: async mesh-feature pick and structural-metadata property readout on pick.

## 2026-08-15 — Foundation 52 async mesh-feature picks and structural metadata

**Decision**

Foundation 51’s tileset pick pipeline gains async `EXT_mesh_features` texture reads and structural-metadata property readout. When sync mesh-feature id resolution misses (texture-backed feature ids), `AtlasEngine.updateGeoHover` / `selectGeoAt` queue `MeshFeatures.getFeaturesAsync`, re-emit hover/select when the id resolves, and upgrade highlight to the semantic key. Batch-table properties (`getDataFromId`) and `EXT_structural_metadata` property tables / property textures are read via `tileset3DFeatureProperties.ts` (internal). Public API: `getTilesetFeatureProperties(layerId, featureId)` plus optional `tilesetFeatureProperties` on `GeoHoverEvent` / `GeoSelectEvent` (backward compatible — field omitted for non-tileset picks). Lab `MarkerHoverProbe` shows tileset property summary on hover.

**Reason**

Photogrammetry tilesets often store feature ids in textures; sync reads miss on first pick. Studio and Lab need building attributes (names, heights, categories) without importing `3d-tiles-renderer` metadata classes.

**Consequences**

- Pick pipeline: sync raycast → provisional feature key → async mesh-feature upgrade → property readout; documented in `pickTileset3DFeature.ts` and `INTEGRATION.md`.
- Property helpers remain internal; `getTilesetFeatureProperties` and event fields are on the public contract.
- Lab labels advance to Foundation 52.

**Limitations**

- Properties require a recent pick context cached on the adapter — `getTilesetFeatureProperties` returns null without a prior hover/select on that feature id.
- Property texture reads may still require async pass; batch-table-only tilesets without structural metadata expose batch properties only.
- Batched-mesh highlight tints the whole batched object, not a single instance material.

**Next**

- Foundation 53: view-mode transition atmosphere/lighting interpolation and Lab globeness readout.

## 2026-08-15 — Foundation 53 view-mode transition and atmosphere polish

**Decision**

Atlas interpolates atmosphere and overlay lighting with MapLibre globe↔mercator blend progress (`projectionTransition` / `_globeness`). `interpolateVisualEnvironment.ts` scales `atmosphereBlend`, fog/sky blends, and lighting intensities by transition; `MapLibreAdapter.syncVisualEnvironment()` applies effective settings each blend frame alongside existing markup matrix refresh (Foundation 37). Public API adds `getProjectionTransition()`, `getEffectiveAtmosphereSettings()`, `getEffectiveLightingSettings()`, and `onProjectionBlendProgress()`. `applyViewModeToMap()` skips redundant `setProjection({ mercator })` on map↔mercator switches so camera center/zoom/bearing are preserved (pitch still clamps for flat mercator). Lab `ViewModeSelector` and `VisualEnvironmentControls` show globeness and effective atmosphere/lighting during transitions.

**Reason**

Foundation 32 established atmosphere/lighting settings and Foundation 37 aligned overlays during projection blend, but sky and overlay lighting snapped instantly on `setViewMode` while MapLibre continued interpolating projection. Products and Lab need visibility into blend state and a smooth visual handoff during globe entry/exit.

**Consequences**

- Base atmosphere/lighting settings remain user-configured; effective values are derived per frame from transition progress.
- `ThreeOverlayAdapter.applyEffectiveLighting()` updates rig intensities during blend without overwriting configured settings or re-triggering material mode changes.
- Lab labels advance to Foundation 53.

**Limitations**

- No Atlas-owned `transitionViewMode()` duration yet; blend timing still follows MapLibre zoom and `setProjection` behavior (Foundation 37 limitation).
- Zoom-driven globe↔mercator blends update atmosphere/lighting but do not emit view-mode events.
- Color channels are not lerped — only blend scalars and lighting intensities scale with transition.

**Next**

- Foundation 54: Studio Director wiring for 3D Tiles enable + hover property readout, or Atlas-owned view-mode transition timing / label globe alignment.

## 2026-08-15 — Studio transition preview uses Atlas straight and high-arc

**Decision**

`FrameCameraOptions` accepts optional `durationMs` (`0` or less jumps instantly). Studio SceneRail transition Preview plays Atlas path families: GLIDE → `straight`, ARC + Arc `high` → `high-arc`. Preview jumps to the from Place, then animates to the to Place with the popover duration. Spatial remains a fallback only when Atlas is not mounted.

**Reason**

Director already renders through Atlas. The transition popover was still calling Spatial `previewPlaceTransition`, so GLIDE/ARC did not exercise the new samplers.

**Consequences**

- Studio shim exposes `CameraPathFamily`, `FrameCameraOptions`, and `framePlace(place, options?)`.
- Feel is still UI-only for Atlas playback; easing stays on the path family.
