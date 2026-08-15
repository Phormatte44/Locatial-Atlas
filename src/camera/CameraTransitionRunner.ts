import type { CameraState } from "../types/camera";
import type { CameraPathFamily } from "../types/cameraTransition";
import { easeInOutCubic } from "./easing";
import { sampleTransitionCameraState } from "./sampleTransitionPath";

export interface CameraTransitionOptions {
  from: CameraState;
  to: CameraState;
  durationMs: number;
  pathFamily: CameraPathFamily;
  onFrame: (state: CameraState) => void;
}

export class CameraTransitionRunner {
  private animationFrameId: number | null = null;
  private running = false;

  isRunning(): boolean {
    return this.running;
  }

  cancel(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.running = false;
  }

  run(options: CameraTransitionOptions): Promise<void> {
    this.cancel();

    return new Promise((resolve) => {
      this.running = true;
      const startTime = performance.now();

      const tick = (now: number) => {
        const elapsedMs = now - startTime;
        const linearProgress = Math.min(1, elapsedMs / options.durationMs);
        const easedProgress = easeInOutCubic(linearProgress);

        if (linearProgress >= 1) {
          const finalState: CameraState = { ...options.to, transitionProgress: 1 };
          options.onFrame(finalState);
          this.animationFrameId = null;
          this.running = false;
          resolve();
          return;
        }

        options.onFrame(sampleTransitionCameraState(options.from, options.to, easedProgress));
        this.animationFrameId = requestAnimationFrame(tick);
      };

      this.animationFrameId = requestAnimationFrame(tick);
    });
  }
}
