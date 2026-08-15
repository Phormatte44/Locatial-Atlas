/** Internal GSAP adapter — types stay in this module; never exported from `src/index.ts`. */

interface GsapTween {
  kill(): void;
}

interface GsapTimelineFactory {
  to(target: object, vars: Record<string, unknown>): GsapTween;
}

interface GsapModuleShape {
  gsap?: GsapTimelineFactory;
  default?: GsapTimelineFactory;
}

let gsapLoadPromise: Promise<GsapTimelineFactory | null> | null = null;

export function loadGsapPlayback(): Promise<GsapTimelineFactory | null> {
  if (!gsapLoadPromise) {
    gsapLoadPromise = import("gsap")
      .then((mod: GsapModuleShape) => mod.default ?? mod.gsap ?? null)
      .catch(() => null);
  }

  return gsapLoadPromise;
}

export interface GsapProgressTimelineOptions {
  durationMs: number;
  ease: string;
  onProgress: (easedProgress: number) => void;
  onComplete: () => void;
}

export interface GsapProgressTimeline {
  kill(): void;
}

export function createGsapProgressTimeline(
  gsap: GsapTimelineFactory,
  options: GsapProgressTimelineOptions
): GsapProgressTimeline {
  const progressTarget = { value: 0 };

  const tween = gsap.to(progressTarget, {
    value: 1,
    duration: options.durationMs / 1000,
    ease: options.ease,
    onUpdate: () => {
      options.onProgress(progressTarget.value);
    },
    onComplete: () => {
      options.onProgress(1);
      options.onComplete();
    }
  });

  return {
    kill: () => {
      tween.kill();
    }
  };
}
