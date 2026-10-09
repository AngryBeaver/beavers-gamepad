import { QUERY_UPDATE_USER } from "../definitions";
import { findUserToken } from "../tokens";

export class CharacterSelectionUI implements UIModule {
  name = "beavers-character-selection";
  label = "beaversGamepad.uiModule.characterSelection";

  async process(userId: string, userInput: UserInput) {
    const user = game.users.get(userId);
    if (!user) return;
    const choices: TinyUISelectData["choices"] = {};
    game.actors
      .filter(
        (actor: any) => (actor.ownership[userId] ?? actor.ownership.default) >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
      )
      .forEach((actor: any) => {
        choices[actor.id] = { text: actor.name, img: actor.img };
      });
    const actorId = await userInput.select({ choices: choices, selected: user.character?.id });
    if (!actorId) return;
    if (await assignCharacter(userId, actorId)) {
      if (game.user.id === userId) {
        findUserToken(userId)?.control();
      }
    }
  }
}

/**
 * Only a gamemaster may change the character of another user, so everybody else has to ask one.
 */
export async function assignCharacter(userId: string, actorId: string): Promise<boolean> {
  const user = game.users.get(userId);
  if (user.canUserModify(game.user, "update", { character: actorId })) {
    await user.update({ character: actorId });
    return true;
  }
  const gm = game.users.activeGM;
  if (!gm) {
    ui.notifications.warn("beaversGamepad.errors.noGamemaster", { localize: true });
    return false;
  }
  return !!(await gm.query(QUERY_UPDATE_USER, { userId, character: actorId }));
}

/**
 * the gamemaster side of assignCharacter, registered in CONFIG.queries
 */
export async function handleUpdateUserQuery({ userId, character }: { userId: string; character: string }) {
  const user = game.users.get(userId);
  if (!user || !game.actors.get(character)) return false;
  await user.update({ character });
  return true;
}
