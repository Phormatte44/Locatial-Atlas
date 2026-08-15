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
| `@turf/turf` | `^7.0.0` | Geographic geometry helpers |
| `gsap` | `^3.0.0` | Optional (`peerDependenciesMeta.optional`); reserved for future camera motion |

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
