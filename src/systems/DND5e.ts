const HOOK_DND5E_TRANSFORMED = "dnd5e.transformActor";
const HOOK_DND5E_REVERTFORM = "dnd5e.revertOriginalForm";

/**
 * keeps the gamepad of a user on its character when dnd5e polymorphs that character into another actor.
 */
export class DND5e {
  constructor() {
    Hooks.on(HOOK_DND5E_TRANSFORMED, this._transformActor.bind(this));
    Hooks.on(HOOK_DND5E_REVERTFORM, this._revertForm.bind(this));
  }

  async _transformActor(original: any, transformed: any, p: any) {
    const closure = {
      hook: 0,
    };
    closure.hook = Hooks.on("createActor", async function () {
      const transformedID = game.actors.find((a: any) => a.name === p.name)?.id;
      if (transformedID) {
        for (const user of game.users.contents) {
          if (user.character?.id === original.id) {
            await user.update({ character: transformedID });
          }
        }
        Hooks.off("createActor", closure.hook);
      }
    });
  }

  async _revertForm(transformed: any) {
    const originalId = transformed.flags?.dnd5e?.originalActor;
    if (!originalId) return;
    for (const user of game.users.contents) {
      if (user.character?.id === transformed.id) {
        await user.update({ character: originalId });
      }
    }
  }
}
