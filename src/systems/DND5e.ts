import {NAMESPACE} from "../main.js";
import {Context} from "../GamepadSettings.js";

const HOOK_DND5E_TRANSFORMED = "dnd5e.transformActor";
const HOOK_DND5E_REVERTFORM = "dnd5e.revertOriginalForm";

export class DND5e {
    context: Context;

    constructor() {
        this.context = game[NAMESPACE];
        Hooks.on(HOOK_DND5E_TRANSFORMED, this._transformActor.bind(this));
        Hooks.on(HOOK_DND5E_REVERTFORM, this._revertForm.bind(this));
    }

    async _transformActor(o: Actor, t: Actor, p) {
        if (!(game instanceof Game)) {
            throw new Error("Called before game has been initialized");
        }
        const gamepadIndexArray = this.getGamepadIndexForActor(o.uuid);
        const closure = {
            hook: 0,
        };
        if (gamepadIndexArray.length > 0) {
            closure.hook = Hooks.on("createActor", async function (n: Actor) {
                for (const gamepadIndex of gamepadIndexArray) {
                    if (n.name === p.name) {
                        // @ts-ignore
                        const transformedID = game.actors.find(a => a.name === p.name).uuid;
                        const data = {};
                        if (transformedID != undefined) {
                            data[gamepadIndex + ".actorId"] = transformedID;
                            Hooks.off("createActor", closure.hook);
                            await this.settings.updateGamepadConfigs(data)
                        }
                    }
                }
            });
        }
    }

    private getGamepadIndexForActor(id: string) {
        const gamepadConfigs = this.context.Settings.getGamepadConfigs()
        const result: string[] = [];
        for (const [key, gamepadConfig] of Object.entries(gamepadConfigs)) {
            if (gamepadConfig.actorId === id) {
                result.push(key);
            }
        }
        return result;
    }

    async _revertForm(t: Actor) {
        const gamepadIndexArray = this.getGamepadIndexForActor(t.uuid);
        for (const gamepadIndex of gamepadIndexArray) {
            const actorId = t["flags"].dnd5e.originalActor;
            const manager = this.context.GamepadModuleManager;
            const data = {};
            data[gamepadIndex + ".actorId"] = "Actor." + actorId;
            await this.context.Settings.updateGamepadConfigs(data).then(() => manager.updateGamepadModuleInstance())
        }
    }


}