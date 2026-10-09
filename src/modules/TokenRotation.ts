import { gamepadApi } from "../definitions";
import { readAxis, seatAdjust, toDegree } from "../core/axes";
import { withStoredBinding } from "../core/config";
import { findUserToken } from "../tokens";

export class TokenRotation {
  public static defaultConfig: GamepadModuleConfig = {
    binding: {
      axes: {
        horizontal: {
          index: "2",
          reversed: false,
        },
        vertical: {
          index: "3",
          reversed: false,
        },
      },
      buttons: {},
    },
    name: "Token Rotation",
    id: "beavers-token-rotation",
    desc: "beaversGamepad.TokenRotation.desc",
  };

  private _data: {
    config: GamepadModuleConfig;
    userPosition: string;
    userId: string;
  } = {
    config: TokenRotation.defaultConfig,
    userPosition: "bottom",
    userId: "",
  };

  private X_AXES = "horizontal";
  private Y_AXES = "vertical";

  public updateGamepadConfig(gamepadConfig: GamepadConfig) {
    this._data.config = withStoredBinding(TokenRotation.defaultConfig, gamepadConfig);
    this._data.userPosition = gamepadApi().Settings.getUserData(gamepadConfig.userId).userPosition;
    this._data.userId = gamepadConfig.userId;
  }

  public getConfig(): GamepadModuleConfig {
    return this._data.config;
  }

  public tick(event: GamepadTickEvent): boolean {
    if (event.hasAnyAxesTicked) {
      this.tickAxes(event);
    }
    return true;
  }

  private tickAxes(event: GamepadTickEvent) {
    // foundry warns on every attempt to rotate while paused
    if (game.paused && !game.user.isGM) {
      return;
    }
    // the analog values of the stick, not the ticked ones: a token can face any direction.
    const axes = seatAdjust(
      {
        x: readAxis(this._data.config.binding, event.gamepad.axes, this.X_AXES),
        y: readAxis(this._data.config.binding, event.gamepad.axes, this.Y_AXES),
      },
      this._data.userPosition,
    );
    if (Math.abs(axes.y) + Math.abs(axes.x) > 0.3) {
      const degree = (Math.round(toDegree(axes)) + 360) % 360;
      const token = findUserToken(this._data.userId);
      if (token && token.document.rotation !== degree) {
        token.rotate(degree, 0)?.catch?.(console.error);
      }
    }
  }

  public destroy() {}
}

type _staticCheck = AssertAssignable<typeof TokenRotation, StaticOf<GamepadModule>>;
