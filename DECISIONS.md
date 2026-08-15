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

Atlas exposes geographic presentation through `getViewMode()`, `setViewMode(mode)`, `listViewModes()`, and `onViewModeChange()`. Modes are `globe` (MapLibre globe projection), `map` (Mercator with full 3D pitch for editorial map work), and `mercator` (flat Mercator with pitch clamped to 0). The Three.js overlay tracks view mode for future globe-specific alignment; MapLibre applies projection and pitch policy in `viewModeSetup.ts`.

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
