# Integrating Locational Atlas

Locational Atlas ships as an ES module library from `dist/`. Creator Studio and other apps consume the public API in `src/index.ts` (`AtlasEngine`, `AtlasMapView`, and related types).

## Install

### Local `file:` dependency (sibling repo)

In the consumer `package.json`:

```json
{
  "dependencies": {
    "locational-atlas": "file:../Locatial-Atlas"
  }
}
```

Run `npm install`, then build Atlas before or as part of the consumer workflow:

```bash
cd ../Locatial-Atlas && npm run build
```

### Vite alias to live `src/` (development)

For hot reload without rebuilding `dist/` on every change, alias to Atlas source in the consumer Vite config:

```ts
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "locational-atlas": resolve(__dirname, "../Locatial-Atlas/src/index.ts")
    }
  }
});
```

Studio uses this pattern today. Production builds should resolve the built `dist/` entry instead.

### Monorepo

In a workspace (npm/pnpm/yarn), add Atlas as a workspace package and depend on `"locational-atlas": "workspace:*"`. Build Atlas with `npm run build` in CI or via a root `build` script so `dist/` exists before consumers bundle.

## Import the library

```ts
import { AtlasEngine, AtlasMapView } from "locational-atlas";
```

## Peer dependencies

The library build externalizes renderer and framework packages (see `vite.config.ts` `libraryExternals`). They are declared in Atlas `peerDependencies` so npm warns when a consumer is missing a runtime. The host app must install compatible versions:

| Package | Peer range | Notes |
| --- | --- | --- |
| `react`, `react-dom` | `^19.0.0` | Required for `AtlasMapView` |
| `maplibre-gl` | `^5.0.0` | Atlas targets MapLibre 5 today; Studio may pin MapLibre 6 and rewrite imports at build time |
| `three` | `^0.179.0` | World markup overlay |
| `3d-tiles-renderer` | `^0.5.0` | Optional (`peerDependenciesMeta.optional`); renders registered 3D Tiles overlays via a MapLibre custom layer. Without it, enabling a 3D Tiles layer emits a clear install hint (registry + validation still work). |
| `@turf/turf` | `^7.0.0` | Geographic geometry helpers |
| `gsap` | `^3.0.0` | Optional (`peerDependenciesMeta.optional`); powers cinematic camera transitions via GSAP timelines. Without it, Atlas falls back to `requestAnimationFrame` playback. |

Atlas keeps the same packages in `devDependencies` for Lab and local `npm run dev`. Consumers must not rely on Atlas installing these transitively.

Example consumer `package.json` fragment:

```json
{
  "dependencies": {
    "locational-atlas": "file:../Locatial-Atlas",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "maplibre-gl": "^5.6.0",
    "three": "^0.179.0",
    "3d-tiles-renderer": "^0.5.0",
    "@turf/turf": "^7.2.0"
  }
}
```

## Validate before publish or CI

Run the full library gate locally or in CI:

```bash
npm run validate
```

This runs `typecheck`, `lint`, and `build`. `prepublishOnly` invokes the same gate when the package is published.

## MapLibre CSS

Atlas does not bundle MapLibre styles. Import once in the host app entry (e.g. `main.tsx`):

```ts
import "maplibre-gl/dist/maplibre-gl.css";
```

## Static assets: editorial map style

The built-in editorial basemap uses `LOCATIAL_EDITORIAL_STYLE_URL` (`/map-styles/locatial-editorial.json`). Host apps must serve that file at the same URL path.

**Option A — copy from Atlas `public/`**

Copy `public/map-styles/locatial-editorial.json` into the consumer's static `public/map-styles/` directory. When the style changes in Atlas, recopy it (Studio maintains its own copy for this reason).

**Option B — npm `files`**

Published or packed installs include `public/map-styles/` via the `"files"` field in Atlas `package.json`. Copy or symlink from `node_modules/locational-atlas/public/map-styles/` into the consumer's deployable static assets.

Without this file, MapLibre will fail to load the editorial style URL.

## Build output

After `npm run build`:

```
dist/
  index.js          # ESM bundle
  index.js.map
  index.d.ts        # public types (+ mirrored .d.ts under subpaths)
  …                 # declaration files for exported modules
public/map-styles/
  locatial-editorial.json
```

## API boundary

Import only from `locational-atlas` (the package entry). Do not import `lab/`, renderer internals, or deep paths under `src/rendering/`. See `AGENTS.md` and `ARCHITECTURE.md`.

## 3D Tiles overlays

Register layers with `registerTileset3DLayer()` and enable them via `setTileset3DLayers([layerId])`. Load lifecycle uses family `tiles3d` (`getLayerLoadState`, `onLayerLoadChange`).

Install the optional peer `3d-tiles-renderer` alongside `three`. Without it, enabling a layer validates the tileset URL but reports a clear install hint.

### Draco / KTX2 decoder assets

Compressed glTF tiles need Three.js Draco and Basis/KTX2 transcoder WASM files. By default Atlas loads them from a pinned unpkg URL for the peer Three version. For air-gapped or self-hosted deployments, set a libs base URL on the engine or per layer:

```ts
const engine = new AtlasEngine({
  tileset3DDecoderBaseUrl: "https://cdn.example.com/three/0.179.1/examples/jsm/libs/"
});

engine.registerTileset3DLayer({
  id: "city-mesh",
  label: "City mesh",
  semanticType: "photogrammetry",
  tilesetUrl: "https://tiles.example.com/tileset.json",
  decoderBaseUrl: "https://cdn.example.com/custom-three/libs/" // optional per-layer override
});
```

Atlas resolves `${baseUrl}/draco/` and `${baseUrl}/basis/` internally. Host those directories from your Three.js package `examples/jsm/libs/` tree (or equivalent mirror).

### Framing loaded tilesets

After a tileset reaches `ready`, frame the camera to its bounding volume:

```ts
await engine.frameTilesetOnReady("city-mesh");
// or, if already ready:
await engine.flyToTilesetBounds("city-mesh");
```

Both methods use the tileset root oriented bounding box (OBB) when available, falling back to axis-aligned bounds or bounding sphere, converted to geographic bounds and Atlas’s existing `frameBounds` camera solver.

### Picking and highlighting 3D Tiles features

3D Tiles meshes participate in the same hover/select pipeline as other geographic layers. Pick order (first match wins): world markup → POIs → **3D Tiles** → labels → roads → buildings → areas → boundaries.

Raycast picking runs against loaded tile geometry each frame using the same camera matrices as the custom layer render pass. Feature ids use the prefix `tileset3d:`:

```
tileset3d:{layerId}:{featureKey}
```

When available, `featureKey` prefers semantic ids from tile content:

| Source | Key shape | Example |
| --- | --- | --- |
| `EXT_mesh_features` | `mf:{featureId}@{objectUuid}` | `mf:42@abc-uuid` |
| Batch table / batched mesh | `batch:{batchId}@{objectUuid}` | `batch:7@abc-uuid` |
| Fallback | `{meshUuid}` | `abc-uuid` |

The `@objectUuid` suffix disambiguates highlight targets when semantic ids are used. Use hover/select APIs as usual:

```ts
engine.updateGeoHover(screenX, screenY);
engine.selectGeoAt(screenX, screenY);

// Frame a picked feature (mesh bbox → geographic bounds → frameBounds)
await engine.frameTilesetFeature("city-mesh", "tileset3d:city-mesh:mf:42@abc-uuid");

// Explicit highlight (same contract as other layer families)
engine.highlightFeature("tileset3d:city-mesh:mf:42@abc-uuid");
engine.clearHighlights();
```

Request a manual camera path family when framing:

```ts
await engine.framePlace(place, { pathFamily: "high-arc" });
await engine.frameBounds(bounds, { pathFamily: "straight" });
await engine.framePlace(place, { pathFamily: "straight", durationMs: 6400 });
```

Highlight applies an emissive tint on the picked mesh; it does not cross the public API with Three.js types.

## Place-area ellipses (world markup)

For geodesic place-area authoring, build `WorldEllipseMarkup` with `ellipseMarkupFromCenter(id, lng, lat, radiusXMeters, radiusYMeters, bearingDegrees?)` and push it through `engine.setWorldMarkup([...])` alongside labels, circles, and other markup. Atlas samples the ellipse ring geodesically (turf `destination` on a rotated ENU loop) and renders it on the ground plane with the same hover/select pipeline as circles and polygons (pick priority 2, spatial index from Foundation 62).

Studio pattern: derive one ellipse per place from the Director place index (bounds → axis radii when available, otherwise demo defaults), toggle against legacy rectangle/polygon markup in the Frame tab, and keep markup ids stable (`place-area:{placeId}`) so `onGeoHover` / `onGeoSelect` highlight and selection work without Studio importing renderer internals.

#### Async mesh-feature picks

When `EXT_mesh_features` stores feature ids in textures, the first sync raycast may return a provisional key (batch id or mesh uuid). Atlas queues `MeshFeatures.getFeaturesAsync` for that hit and re-emits `onGeoHover` / `onGeoSelect` when the semantic `mf:{id}@{objectUuid}` key resolves. Hover highlight upgrades with the resolved id.

#### Structural metadata on pick

For picked tileset features, Atlas reads batch-table properties and `EXT_structural_metadata` property tables / property textures (when the optional peer registers metadata extensions). Properties surface two ways:

```ts
engine.onGeoHover((event) => {
  if (event.tilesetFeatureProperties) {
    // e.g. { name: "Tower", height: 310 }
  }
});

// Or query after hover/select (requires recent pick on that feature id)
const props = engine.getTilesetFeatureProperties("city-mesh", featureId);
```

`GeoHoverEvent` / `GeoSelectEvent` include optional `tilesetFeatureProperties?: Record<string, unknown> | null` — omitted for non-tileset picks (backward compatible).

### Studio wiring (remaining)

Creator Studio Director still needs to:

1. Register and enable 3D Tiles layers via `registerTileset3DLayer` / `setTileset3DLayers` (optional `3d-tiles-renderer` peer).
2. Forward map pointer events to `updateGeoHover` / `selectGeoAt` (already done for other layers via `AtlasMapView`).
3. Surface tileset hover readout in Director UX using `onGeoHover` feature ids (`tileset3d:…` prefix) and `event.tilesetFeatureProperties` when present.
4. Optionally call `frameTilesetFeature` on tileset select for building-centric workflows.
5. Use `getTilesetFeatureProperties(layerId, featureId)` for detail panels after pick.
6. Recopy `public/map-styles/locatial-editorial.json` when that file changes in Atlas.

### Optional peers summary (Studio)

| Peer | Required? | Atlas behavior without it |
| --- | --- | --- |
| `react`, `react-dom` | Yes | `AtlasMapView` unavailable |
| `maplibre-gl` | Yes | Map cannot mount |
| `three` | Yes | World markup and 3D Tiles overlays unavailable |
| `@turf/turf` | Yes | Geographic geometry helpers fail at runtime |
| `3d-tiles-renderer` | Optional | Register/enable 3D Tiles layers still works; rendering emits install hint; pick/highlight no-op |
| `gsap` | Optional | Camera transitions use rAF playback with path-family polynomial easing (parity with GSAP `powerN.inOut`) |
