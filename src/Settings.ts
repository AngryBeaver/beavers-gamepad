import {NAMESPACE} from "./main.js";
import {GamepadConfigApp} from "./apps/GamepadConfigApp.js";

export class Settings implements SettingsI{

    GAMEPAD_CONFIG = "gamepad_config";
    ACTOR_FILTER = "actor_filter";
    GAMEPAD_CONFIG_BUTTON = "gamepad_config_button"

    constructor() {
        if (!(game instanceof Game)) {
            throw new Error("Settings called before game has been initialized");
        }

        game.settings.register(NAMESPACE, this.ACTOR_FILTER, {
            name: game.i18n.localize('beaversGamepad.settings.actorFilter.name'),
            hint: game.i18n.localize('beaversGamepad.settings.actorFilter.hint'),
            scope: "world",
            config: true,
            default: "character"
        });

        game.settings.register(NAMESPACE, this.GAMEPAD_CONFIG, {
            name: game.i18n.localize('beaversGamepad.settings.gamepadConfig.name'),
            scope: "client",
            config: false,
            default: {},
            type: Object
        });

        game.settings.registerMenu(NAMESPACE, this.GAMEPAD_CONFIG_BUTTON, {
            name: game.i18n.localize('beaversGamepad.settings.gamepadConfig.name'),
            label: game.i18n.localize("beaversGamepad.settings.gamepadConfig.label"),
            hint: game.i18n.localize('beaversGamepad.settings.gamepadConfig.hint'),
            //@ts-ignore
            type: GamepadConfigApp,
            restricted: true
        });

    }

    getGamepadConfigs(): GamepadConfigs{
        return this.get(this.GAMEPAD_CONFIG) as GamepadConfigs;
    }

    setGamepadConfigs(gamepadConfigs: GamepadConfigs):Promise<any>{
        return this.set(this.GAMEPAD_CONFIG,gamepadConfigs);
    }

    private get(key) {
        if (!(game instanceof Game)) {
            throw new Error("Settings called before game has been initialized");
        }
        return game.settings.get(NAMESPACE, key);

    };

    private set(key, value):Promise<any> {
        if (!(game instanceof Game)) {
            throw new Error("Settings called before game has been initialized");
        }
        return game.settings.set(NAMESPACE, key, value);
    }


}
