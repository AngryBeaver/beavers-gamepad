import {NAMESPACE} from "../definitions.js";

/**
 * Gamepad module that opens a door in front of the user's token when the button is pressed.
 * It leverages the TinyUIModuleManager to run the OpenDoorUI flow.
 */
export class OpenDoorGamepadModule {

    public static defaultConfig: GamepadModuleConfig = {
        binding: {
            axes: {},
            buttons: {
                "open": {
                    index: "1",
                    label: "open door:"
                }
            }
        },
        name: "Open Door",
        id: "beavers-open-door-module",
        desc: "beaversGamepad.openDoor.desc"
    };

    private _data: {
        config: GamepadModuleConfig,
        userId: string,
    } = {
        config: OpenDoorGamepadModule.defaultConfig,
        userId: "",
    };

    public updateGamepadConfig(gamepadConfig: GamepadConfig) {
        this._data.config = OpenDoorGamepadModule.defaultConfig;
        this._data.config.binding = gamepadConfig.modules[this._data.config.id]?.binding || this._data.config.binding;
        this._data.userId = gamepadConfig.userId;
    }

    public getConfig(): GamepadModuleConfig {
        return this._data.config;
    }

    public tick(event: GamepadTickEvent): boolean {
        if (!event.hasAnyButtonTicked) return true;
        const idx = this._data.config.binding.buttons["open"].index;
        if (event.buttons[idx]) {
            // Use the UI module so both paths stay consistent
            const moduleId = "beavers-open-door";
            (game as ExtendedGame)[NAMESPACE].TinyUIModuleManager.processUI(this._data.userId, moduleId);
        }
        return true;
    }

    public destroy() {}
}

type _staticCheck = AssertAssignable<typeof OpenDoorGamepadModule, StaticOf<GamepadModule>>;
