const PLACE_MARKUP_SUFFIXES = ["-label", "-core", "-area"] as const;

/** Expand a place or place-derived markup id to its related Lab markup siblings. */
export function expandPlaceHighlightIds(featureId: string): Set<string> {
  const ids = new Set<string>([featureId]);

  for (const suffix of PLACE_MARKUP_SUFFIXES) {
    if (featureId.endsWith(suffix)) {
      const baseId = featureId.slice(0, -suffix.length);
      ids.add(baseId);
      for (const siblingSuffix of PLACE_MARKUP_SUFFIXES) {
        ids.add(`${baseId}${siblingSuffix}`);
      }
      return ids;
    }
  }

  for (const suffix of PLACE_MARKUP_SUFFIXES) {
    ids.add(`${featureId}${suffix}`);
  }

  return ids;
}

export function markupMatchesHighlight(markupId: string, highlightedId: string | null): boolean {
  if (!highlightedId) {
    return false;
  }

  return expandPlaceHighlightIds(highlightedId).has(markupId);
}
