import { doorsInFront, stepBack } from "../core/door";
import { findUserToken } from "../tokens";

/**
 * Toggle the closest normal door (non-locked) roughly in front of the user's token.
 * - If closed -> open
 * - If open -> close
 */
export class OpenDoorUI implements UIModule {
  name = "beavers-open-door";
  label = "beaversGamepad.uiModule.openDoor";

  async process(userId: string, _userInput: UserInput): Promise<void> {
    return toggleDoorInFront(userId);
  }
}

export async function toggleDoorInFront(userId: string): Promise<void> {
  const token = findUserToken(userId);
  if (!token) return;
  const { OPEN, CLOSED } = CONST.WALL_DOOR_STATES;
  // only normal doors, no secret ones. Locked doors stay locked.
  const doors = canvas.walls.placeables
    .map((wall: any) => wall.document)
    .filter((wall: any) => wall.door === CONST.WALL_DOOR_TYPES.DOOR && [OPEN, CLOSED].includes(wall.ds))
    .map((wall: any) => ({ door: wall, c: wall.c }));
  const center = token.getCenterPoint();
  // a token that does not rotate has no front
  const arc = token.document.lockRotation ? 360 : 120;
  const candidates = doorsInFront<any>(center, token.document.rotation ?? 0, doors, canvas.grid.size * 1.5, arc);
  // no door behind a wall
  const candidate = candidates.find(({ point }) => !token.checkCollision(stepBack(center, point, 5)));
  if (!candidate) return;
  await candidate.door.update({ ds: candidate.door.ds === CLOSED ? OPEN : CLOSED });
}
