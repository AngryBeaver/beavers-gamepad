// Detects which button or axis the player uses on the physical gamepad, so bindings do not have to be typed in
// as numbers. Pure logic on plain snapshots, the polling of navigator.getGamepads() happens in the config app.

export interface PadSnapshot {
  buttons: number[];
  axes: number[];
}

export type CaptureKind = "buttons" | "axes";

export type CaptureResult = { kind: "buttons"; index: number } | { kind: "axes"; index: number; reversed: boolean };

/** A button counts as pressed from here on, analog triggers report everything between 0 and 1. */
export const BUTTON_THRESHOLD = 0.5;
/** How far an axis has to leave its resting value to be picked. */
export const AXIS_THRESHOLD = 0.6;
/** How close an axis has to be to its resting value to count as released again. */
export const AXIS_NEUTRAL = 0.3;

export function snapshot(pad: {
  buttons: ArrayLike<{ pressed: boolean; value: number }>;
  axes: ArrayLike<number>;
}): PadSnapshot {
  return {
    buttons: Array.from(pad.buttons, (b) => (b.pressed ? Math.max(b.value, 1) : b.value)),
    axes: Array.from(pad.axes),
  };
}

export class CaptureSession {
  // A button held down when the capture starts must be released once before it can be picked.
  private armed: boolean[];

  constructor(
    readonly kind: CaptureKind,
    private readonly baseline: PadSnapshot,
  ) {
    this.armed = baseline.buttons.map((value) => value < BUTTON_THRESHOLD);
  }

  /** Feed the current state of the gamepad, returns the binding as soon as the player made a clear input. */
  update(current: PadSnapshot): CaptureResult | null {
    return this.kind === "buttons" ? this.updateButtons(current) : this.updateAxes(current);
  }

  private updateButtons(current: PadSnapshot): CaptureResult | null {
    for (const [index, value] of current.buttons.entries()) {
      if (value < BUTTON_THRESHOLD) this.armed[index] = true;
      else if (this.armed[index] ?? true) return { kind: "buttons", index };
    }
    return null;
  }

  // Compared to the resting value, not to 0: triggers and hat switches mapped as axes do not rest at 0.
  private updateAxes(current: PadSnapshot): CaptureResult | null {
    let best: { index: number; delta: number } | null = null;
    for (const [index, value] of current.axes.entries()) {
      const delta = value - (this.baseline.axes[index] ?? 0);
      if (Math.abs(delta) >= AXIS_THRESHOLD && (!best || Math.abs(delta) > Math.abs(best.delta))) {
        best = { index, delta };
      }
    }
    return best ? { kind: "axes", index: best.index, reversed: best.delta < 0 } : null;
  }
}

/** True when nothing is pressed and every axis is back at its resting value. */
export function isNeutral(baseline: PadSnapshot, current: PadSnapshot): boolean {
  if (current.buttons.some((value) => value >= BUTTON_THRESHOLD)) return false;
  return current.axes.every((value, index) => Math.abs(value - (baseline.axes[index] ?? 0)) < AXIS_NEUTRAL);
}

/**
 * Which way the player is asked to push for an axis, taken from the name the gamepad module gave it.
 * A push in that direction is the not reversed one.
 */
export function axisDirection(name: string): "right" | "down" | "any" {
  if (/horizontal/i.test(name)) return "right";
  if (/vertical/i.test(name)) return "down";
  return "any";
}
