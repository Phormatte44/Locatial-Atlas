import type { CameraState } from "../types/camera";
import type { CameraPathFamily } from "../types/cameraTransition";
import { createGsapProgressTimeline, loadGsapPlayback } from "./gsapPlayback";
import { sampleTransitionCameraState } from "./sampleTransitionPath";
import {
  applyLegacyTransitionEasing,
  getTransitionEaseForPathFamily
} from "./transitionEasing";

export interface CameraTransitionOptions {
  from: CameraState;
  to: CameraState;
  durationMs: number;
  pathFamily: CameraPathFamily;
  /** Override path-family default GSAP ease string (internal runner option). */
  easeOverride?: string;
  onFrame: (state: CameraState) => void;
}

export class CameraTransitionRunner {
  private cancelPlayback: (() => void) | null = null;
  private running = false;

  isRunning(): boolean {
    return this.running;
  }

  cancel(): void {
    this.cancelPlayback?.();
    this.cancelPlayback = null;
    this.running = false;
  }

  run(options: CameraTransitionOptions): Promise<void> {
    this.cancel();

    return loadGsapPlayback().then((gsap) => {
      if (gsap) {
        return this.runWithGsap(gsap, options);
      }

      return this.runWithLegacyRaf(options);
    });
  }

  private runWithGsap(
    gsap: Parameters<typeof createGsapProgressTimeline>[0],
    options: CameraTransitionOptions
  ): Promise<void> {
    this.running = true;
    const ease = options.easeOverride ?? getTransitionEaseForPathFamily(options.pathFamily);

    return new Promise((resolve) => {
      const timeline = createGsapProgressTimeline(gsap, {
        durationMs: options.durationMs,
        ease,
        onProgress: (easedProgress) => {
          if (easedProgress >= 1) {
            options.onFrame({ ...options.to, transitionProgress: 1 });
            return;
          }

          options.onFrame(sampleTransitionCameraState(options.from, options.to, easedProgress));
        },
        onComplete: () => {
          this.cancelPlayback = null;
          this.running = false;
          resolve();
        }
      });

      this.cancelPlayback = () => {
        timeline.kill();
      };
    });
  }

  private runWithLegacyRaf(options: CameraTransitionOptions): Promise<void> {
    return new Promise((resolve) => {
      this.running = true;
      const startTime = performance.now();
      let animationFrameId: number | null = null;

      const cancelRaf = () => {
        if (animationFrameId !== null) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      };

      this.cancelPlayback = cancelRaf;

      const tick = (now: number) => {
        const elapsedMs = now - startTime;
        const linearProgress = Math.min(1, elapsedMs / options.durationMs);
        const easedProgress = applyLegacyTransitionEasing(linearProgress);

        if (linearProgress >= 1) {
          options.onFrame({ ...options.to, transitionProgress: 1 });
          animationFrameId = null;
          this.cancelPlayback = null;
          this.running = false;
          resolve();
          return;
        }

        options.onFrame(sampleTransitionCameraState(options.from, options.to, easedProgress));
        animationFrameId = requestAnimationFrame(tick);
      };

      animationFrameId = requestAnimationFrame(tick);
    });
  }
}
