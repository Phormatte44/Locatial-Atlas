const MARKER_PALETTE = [0xe4572e, 0x17bebb, 0xf2a541, 0x9368b7, 0x4cb944];

/** Deterministic accent color for a marker id. */
export function markerColorForId(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }

  return MARKER_PALETTE[hash % MARKER_PALETTE.length] ?? MARKER_PALETTE[0];
}

/** Brighter variant used when a marker is highlighted. */
export function highlightedMarkerColorForId(id: string): number {
  const base = markerColorForId(id);
  const red = Math.min(255, ((base >> 16) & 0xff) + 40);
  const green = Math.min(255, ((base >> 8) & 0xff) + 40);
  const blue = Math.min(255, (base & 0xff) + 40);
  return (red << 16) | (green << 8) | blue;
}

export const HIGHLIGHTED_MARKER_SCALE = 1.22;
