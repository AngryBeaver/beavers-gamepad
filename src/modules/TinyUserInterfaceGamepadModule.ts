import { gamepadApi } from "../definitions";
import { readAxis, seatAdjust } from "../core/axes";
import { withStoredBinding } from "../core/config";

export class TinyUserInterfaceGamepadModule {
  public static defaultConfig: GamepadModuleConfig = {
    binding: {
      axes: {
        horizontal: {
          index: "0",
          reversed: false,
        },
        vertical: {
          index: "1",
          reversed: false,
        },
      },
      buttons: {
        ok: {
          index: "0",
          label: "(A) ok:",
        },
        abort: {
          index: "1",
          label: "(B) abort:",
        },
      },
    },
    name: "Tiny-User-Interface Control",
    id: "beavers-tinyUI-control",
    isContextModule: true,
    desc: "beaversGamepad.TUIGamepadModule.desc",
  };

  private _data: {
    config: GamepadModuleConfig;
    consecutiveTick: number;
    userPosition: string;
    userId: string;
  } = {
    config: TinyUserInterfaceGamepadModule.defaultConfig,
    consecutiveTick: 0,
    userPosition: "bottom",
    userId: "",
  };

  private X_AXES = "horizontal";
  private Y_AXES = "vertical";

  public updateGamepadConfig(gamepadConfig: GamepadConfig) {
    this._data.config = withStoredBinding(TinyUserInterfaceGamepadModule.defaultConfig, gamepadConfig);
    this._data.userPosition = gamepadApi().Settings.getUserData(gamepadConfig.userId).userPosition;
    this._data.userId = gamepadConfig.userId;
  }

  public getConfig(): GamepadModuleConfig {
    return this._data.config;
  }

  public tick(event: GamepadTickEvent): boolean {
    this._data.consecutiveTick++;
    if (event.hasAnyAxesTicked) {
      this.tickAxes(event);
    }
    if (event.hasAnyButtonTicked) {
      this.tickButton(event);
    }
    return true;
  }

  private tickAxes(event: GamepadTickEvent) {
    const axes = seatAdjust(
      {
        x: readAxis(this._data.config.binding, event.axes, this.X_AXES),
        y: readAxis(this._data.config.binding, event.axes, this.Y_AXES),
      },
      this._data.userPosition,
    );
    if (axes.y != 0) {
      if (this._data.consecutiveTick > 3) {
        gamepadApi().TinyUIModuleManager.getInstance(this._data.userId)?.rotateWheel(axes.y);
        this._data.consecutiveTick = 0;
      }
    }
  }

  private tickButton(event: GamepadTickEvent) {
    const instance = gamepadApi().TinyUIModuleManager.getInstance(this._data.userId);
    const { ok, abort } = this._data.config.binding.buttons;
    if (event.buttons[ok.index]) {
      instance?.ok();
    } else if (event.buttons[abort.index]) {
      instance?.abort();
    }
  }

  public destroy() {}
}

type _staticCheck = AssertAssignable<typeof TinyUserInterfaceGamepadModule, StaticOf<GamepadModule>>;
