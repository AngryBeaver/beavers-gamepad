// Pure helpers for the token movement, no Foundry access.
import type { Point } from "./axes";

export const SNAP_ALWAYS = "always";
export const SNAP_END = "end";
export const SNAP_NEVER = "never";
export type SnapMode = typeof SNAP_ALWAYS | typeof SNAP_END | typeof SNAP_NEVER;

/** A stick resting in the middle never reports exactly 0. */
export const DEADZONE = 0.2;

export interface MoveInput {
  /** length 1, or 0 when nothing is pressed */
  direction: Point;
  /** how far the stick is pushed, 0..1, for the d-pad how long it is held */
  strength: number;
}

const NONE: MoveInput = { direction: { x: 0, y: 0 }, strength: 0 };

/** A button that just got pressed walks with this strength ... */
export const RAMP_START = 0.05;
/** ... and gets stronger while it is held, reaching full strength after this many milliseconds. */
export const RAMP_TIME = 2000;

/**
 * The strength of a button (d-pad, key) that is held for the given time: it starts slow and speeds up
 * like a stick that is pushed further and further.
 */
export function rampStrength(heldMs: number, start = RAMP_START, rampTime = RAMP_TIME): number {
  return start + (1 - start) * Math.min(1, Math.max(0, heldMs) / rampTime);
}

/** How far a stick has to be pushed to walk with the given strength, the inverse of moveInput. */
export function stickForStrength(strength: number, deadzone = DEADZONE): number {
  return deadzone + (1 - deadzone) * strength;
}

/**
 * Turns the raw stick values and the pressed d-pad buttons into a direction and a strength.
 * The d-pad wins over the stick. A diagonal is never faster than a straight line.
 * @param dpadStrength the strength of the d-pad, see rampStrength
 */
export function moveInput(stick: Point, dpad: Point, dpadStrength = 1, deadzone = DEADZONE): MoveInput {
  if (dpad.x !== 0 || dpad.y !== 0) {
    const length = Math.hypot(dpad.x, dpad.y);
    return { direction: { x: dpad.x / length, y: dpad.y / length }, strength: dpadStrength };
  }
  const length = Math.hypot(stick.x, stick.y);
  if (length <= deadzone) {
    return NONE;
  }
  // radial deadzone: the strength starts at 0 right at the edge of the deadzone
  const strength = Math.min(1, (length - deadzone) / (1 - deadzone));
  return { direction: { x: stick.x / length, y: stick.y / length }, strength };
}

/** The direction of one grid step: each axis is -1, 0 or 1, like a ticked stick. */
export function gridDirection(input: MoveInput): Point {
  const step = (value: number) => (value > 0.38 ? 1 : value < -0.38 ? -1 : 0) + 0;
  return { x: step(input.direction.x), y: step(input.direction.y) };
}

/**
 * The size of the cells a token snaps to on a square grid. A token smaller than a grid space divides the grid:
 * a token of half the width snaps to half grid spaces, one of a third of the width to thirds.
 * @param gridSize pixels of one grid space
 * @param width width of the token in grid spaces
 * @param height height of the token in grid spaces
 */
export function snapCell(gridSize: number, width: number, height: number): { w: number; h: number } {
  const part = (size: number) => (size > 0 && size < 1 ? gridSize * size : gridSize);
  return { w: part(width), h: part(height) };
}

/** The top left position of the cell that is closest to the given top left position of a token. */
export function snapToCell(position: Point, cell: { w: number; h: number }): Point {
  return {
    x: Math.round(Math.round(position.x / cell.w) * cell.w),
    y: Math.round(Math.round(position.y / cell.h) * cell.h),
  };
}

/**
 * Cell positions around a position, the closest first. When a wall stands on the closest one,
 * the token goes to the next one.
 * @param range how many cells to each side are looked at
 */
export function snapCandidates(position: Point, cell: { w: number; h: number }, range = 2): Point[] {
  const baseX = Math.floor(position.x / cell.w);
  const baseY = Math.floor(position.y / cell.h);
  const result: { point: Point; distance: number }[] = [];
  for (let dx = -range + 1; dx <= range; dx++) {
    for (let dy = -range + 1; dy <= range; dy++) {
      const point = { x: Math.round((baseX + dx) * cell.w), y: Math.round((baseY + dy) * cell.h) };
      result.push({ point, distance: Math.hypot(point.x - position.x, point.y - position.y) });
    }
  }
  return result.sort((a, b) => a.distance - b.distance).map((entry) => entry.point);
}

/**
 * The next position of a freely walking token.
 * @param position top left position of the token
 * @param input where the stick points to
 * @param distance how many pixels the token walks
 */
export function freeStep(position: Point, input: MoveInput, distance: number): Point {
  return {
    x: Math.round(position.x + input.direction.x * distance),
    y: Math.round(position.y + input.direction.y * distance),
  };
}

/**
 * The steps to try when the way is blocked: straight ahead first, then sliding along the wall on one axis only.
 */
export function slideAlternatives(position: Point, target: Point): Point[] {
  const result = [target];
  if (target.x !== position.x && target.y !== position.y) {
    const alongX = { x: target.x, y: position.y };
    const alongY = { x: position.x, y: target.y };
    // the axis the stick points to more is tried first
    if (Math.abs(target.x - position.x) >= Math.abs(target.y - position.y)) result.push(alongX, alongY);
    else result.push(alongY, alongX);
  }
  return result;
}
