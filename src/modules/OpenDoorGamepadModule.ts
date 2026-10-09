import { withStoredBinding } from "../core/config";
import { toggleDoorInFront } from "../apps/OpenDoorUI";

/**
 * Gamepad module that opens a door in front of the user's token when the button is pressed.
 */
export class OpenDoorGamepadModule {
  public static defaultConfig: GamepadModuleConfig = {
    binding: {
      axes: {},
      buttons: {
        open: {
          index: "1",
          label: "open door:",
        },
      },
    },
    name: "Open Door",
    id: "beavers-open-door-module",
    desc: "beaversGamepad.openDoor.desc",
  };

  private _data: {
    config: GamepadModuleConfig;
    userId: string;
  } = {
    config: OpenDoorGamepadModule.defaultConfig,
    userId: "",
  };

  public updateGamepadConfig(gamepadConfig: GamepadConfig) {
    this._data.config = withStoredBinding(OpenDoorGamepadModule.defaultConfig, gamepadConfig);
    this._data.userId = gamepadConfig.userId;
  }

  public getConfig(): GamepadModuleConfig {
    return this._data.config;
  }

  public tick(event: GamepadTickEvent): boolean {
    if (!event.hasAnyButtonTicked) return true;
    const index = this._data.config.binding.buttons["open"].index;
    if (event.buttons[index]) {
      toggleDoorInFront(this._data.userId).catch(console.error);
    }
    return true;
  }

  public destroy() {}
}

type _staticCheck = AssertAssignable<typeof OpenDoorGamepadModule, StaticOf<GamepadModule>>;
