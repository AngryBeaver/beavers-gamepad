// Pure axis helpers shared by the gamepad modules, no Foundry access.

export interface Point {
  x: number;
  y: number;
}

/**
 * Value of the axis a binding points at, 0 when the axis is unbound or idle.
 * `values` is either the raw Gamepad.axes array or the sparse axes of a GamepadTickEvent.
 */
export function readAxis(
  binding: GamepadModuleConfigBinding,
  values: readonly number[] | { [index: string]: number },
  name: string,
): number {
  const axis = binding.axes[name];
  if (!axis) return 0;
  const value = (values as { [index: string]: number })[String(axis.index)] ?? 0;
  return (axis.reversed ? -value : value) + 0;
}

/**
 * Turns a stick direction into screen direction for a player sitting at the given side of a monitor lying flat
 * on the table: whatever the player pushes away from themselves moves away from them on the screen.
 */
export function seatAdjust(point: Point, userPosition: string): Point {
  let { x, y } = point;
  if (userPosition === "top" || userPosition === "right") {
    x = -x;
    y = -y;
  }
  if (userPosition === "right" || userPosition === "left") {
    [x, y] = [-y, x];
  }
  return { x: x + 0, y: y + 0 };
}

/** Token rotation in degrees for a stick direction, 0 faces down like Foundry's token rotation. */
export function toDegree(point: Point): number {
  return (Math.atan2(-point.x, point.y) * 180) / Math.PI + 0;
}
