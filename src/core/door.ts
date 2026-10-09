// Pure geometry for picking the door a token stands in front of, no Foundry access.

import type { Point } from "./axes";

export interface DoorCandidate<T> {
  door: T;
  /** middle of the door */
  point: Point;
  distance: number;
}

/**
 * The doors within reach of a token, nearest first.
 * @param center the center of the token
 * @param rotation the rotation of the token in degrees, 0 faces down
 * @param doors the doors with their wall coordinates [x1, y1, x2, y2]
 * @param maxDistance how far the middle of a door may be away
 * @param arc doors outside of this arc in front of the token are skipped, 360 for a token that does not rotate
 */
export function doorsInFront<T>(
  center: Point,
  rotation: number,
  doors: { door: T; c: number[] }[],
  maxDistance: number,
  arc: number = 120,
): DoorCandidate<T>[] {
  const radians = (rotation * Math.PI) / 180;
  const facing = { x: -Math.sin(radians), y: Math.cos(radians) };
  const minCos = arc >= 360 ? -1 : Math.cos((arc / 2) * (Math.PI / 180));
  const result: DoorCandidate<T>[] = [];
  for (const { door, c } of doors) {
    const point = { x: (c[0] + c[2]) / 2, y: (c[1] + c[3]) / 2 };
    const v = { x: point.x - center.x, y: point.y - center.y };
    const distance = Math.hypot(v.x, v.y);
    if (distance > maxDistance) continue;
    // 1e-9: a door exactly on the edge of the arc counts
    if (distance > 0 && (v.x * facing.x + v.y * facing.y) / distance < minCos - 1e-9) continue;
    result.push({ door, point, distance });
  }
  return result.sort((a, b) => a.distance - b.distance);
}

/** The point a few pixels before the target, to test whether a wall lies between origin and target. */
export function stepBack(origin: Point, target: Point, pixels: number): Point {
  const distance = Math.hypot(target.x - origin.x, target.y - origin.y);
  if (distance <= pixels) return { ...origin };
  const factor = (distance - pixels) / distance;
  return { x: origin.x + (target.x - origin.x) * factor, y: origin.y + (target.y - origin.y) * factor };
}
