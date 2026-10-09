import { gamepadApi } from "../definitions";
import { readAxis, seatAdjust, type Point } from "../core/axes";
import { withStoredBinding } from "../core/config";
import { findUserToken } from "../tokens";

// The stick counts as released when no tick reported it for this long, a tick comes every 100ms.
const HOLD_TIMEOUT = 250;
// The next step is sent when the token on the screen is this close (in grid steps) to where the current step ends.
// Foundry chains the animations, so the token keeps walking without a halt between two steps, and it never has more
// than this one step ahead of it when the stick changes direction or is released.
const LOOKAHEAD = 0.25;
// Never wait longer than this for the animation of a step.
const STEP_TIMEOUT = 2000;
// How often a token that stands in front of a wall tries again while the stick is held.
const BLOCKED_RETRY = 100;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class TokenMovement {
  public static defaultConfig: GamepadModuleConfig = {
    binding: {
      axes: {
        "Move-horizontal": {
          index: "0",
          reversed: false,
        },
        "Move-vertical": {
          index: "1",
          reversed: false,
        },
      },
      buttons: {},
    },
    name: "Beaver's Token Movement",
    id: "beavers-token-movement",
    desc: "beaversGamepad.TokenMovement.desc",
  };

  private X_AXES = "Move-horizontal";
  private Y_AXES = "Move-vertical";

  config: GamepadModuleConfig = TokenMovement.defaultConfig;
  userId: string = "";
  userPosition: string = "bottom";
  isMoving: boolean = false;
  // where the stick points to and when that was reported last
  held?: { direction: Point; at: number };
  gamepadIndex?: number;

  public getConfig(): GamepadModuleConfig {
    return this.config;
  }

  public updateGamepadConfig(gamepadConfig: GamepadConfig) {
    this.config = withStoredBinding(TokenMovement.defaultConfig, gamepadConfig);
    this.userId = gamepadConfig.userId;
    this.userPosition = gamepadApi().Settings.getUserData(gamepadConfig.userId).userPosition;
  }

  /**
   * The tick only notes where the stick points to. The walking itself is paced by the movement animation of the
   * token and not by the ticks, otherwise the token halts after each step until the next tick comes.
   */
  public tick(event: GamepadTickEvent): boolean {
    this.gamepadIndex = event.gamepad.index;
    const direction = this._direction(event.axes);
    if (direction.x == 0 && direction.y == 0) {
      this.held = undefined;
    } else {
      this.held = { direction, at: Date.now() };
      this._walk().catch(console.error);
    }
    return true;
  }

  public destroy() {
    this.held = undefined;
  }

  private _direction(axes: readonly number[] | { [index: string]: number }): Point {
    return seatAdjust(
      {
        x: readAxis(this.config.binding, axes, this.X_AXES),
        y: readAxis(this.config.binding, axes, this.Y_AXES),
      },
      this.userPosition,
    );
  }

  /**
   * Where the stick points to at this very moment. The ticks only come every 100ms, a turn or a release of the stick
   * would be noticed too late to stop the next step.
   */
  private _currentDirection(): Point | undefined {
    if (!this.held || Date.now() - this.held.at >= HOLD_TIMEOUT) {
      return undefined;
    }
    const gamepad = navigator.getGamepads()[this.gamepadIndex ?? -1];
    if (!gamepad) {
      return this.held.direction;
    }
    // same threshold as the ticks of BeaversGamepadManager
    const direction = this._direction(gamepad.axes.map((value) => (value > 0.5 ? 1 : value < -0.5 ? -1 : 0)));
    return direction.x == 0 && direction.y == 0 ? undefined : direction;
  }

  /**
   * moves the token step by step as long as the stick is held.
   */
  private async _walk() {
    if (this.isMoving) {
      return;
    }
    this.isMoving = true;
    try {
      let direction: Point | undefined;
      while ((direction = this._currentDirection())) {
        const token = await this.move(direction.x, direction.y);
        if (token) {
          await this._almostArrived(token);
        } else {
          await sleep(BLOCKED_RETRY);
        }
      }
    } finally {
      this.isMoving = false;
    }
  }

  /**
   * resolves when the token on the screen has almost reached the position its document is heading to.
   * Watches the token itself instead of calculating the duration: systems and modules change the movement speed.
   */
  private async _almostArrived(token: any) {
    const start = Date.now();
    while (Date.now() - start < STEP_TIMEOUT && !token.destroyed) {
      const source = token.document._source;
      const distance = Math.hypot(source.x - token.position.x, source.y - token.position.y);
      if (distance <= canvas.grid.size * LOOKAHEAD) {
        return;
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }

  /**
   * moves the token of the user one grid step into the given direction, unless a wall is in the way.
   * @returns the token when it moved.
   */
  public async move(x: number, y: number): Promise<any | undefined> {
    if (game.paused) {
      return undefined;
    }
    const token = findUserToken(this.userId);
    if (!token) {
      return undefined;
    }
    const size = canvas.grid.size;
    // the position the token is heading to, not the one its animation currently shows.
    const source = token.document._source;
    const destination = {
      x: Math.round(source.x / size) * size + x * size,
      y: Math.round(source.y / size) * size + y * size,
    };
    const center = token.getCenterPoint(destination);
    if (!canvas.dimensions.rect.contains(center.x, center.y) || token.checkCollision(center)) {
      return undefined;
    }
    await token.document.update(destination);
    return token;
  }
}

type _TokenMovement_StaticCheck = AssertAssignable<typeof TokenMovement, StaticOf<GamepadModule>>;
