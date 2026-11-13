import { MOVEMENT_SNAP, gamepadApi } from "../definitions";
import { readAxis, seatAdjust, type Point } from "../core/axes";
import { withStoredBinding } from "../core/config";
import {
  SNAP_ALWAYS,
  SNAP_END,
  SNAP_NEVER,
  freeStep,
  gridDirection,
  moveInput,
  rampStrength,
  slideAlternatives,
  snapCandidates,
  snapCell,
  snapToCell,
  type MoveInput,
  type SnapMode,
} from "../core/movement";
import { findUserToken } from "../tokens";

// The stick counts as released when no tick reported it for this long, a tick comes every 100ms.
const HOLD_TIMEOUT = 250;
// The next grid step is sent when the token on the screen is this close (in steps) to where the current step ends.
// Foundry chains the animations, so the token keeps walking without a halt between two steps, and it never has more
// than this one step ahead of it when the stick changes direction or is released.
const LOOKAHEAD = 0.25;
// Walking freely the token gets a new destination this often (ms) ...
const FREE_SEGMENT = 200;
// ... and the next one is sent when the token on the screen needs less than this (ms) to reach the current one.
// It has to cover the round trip to the server, otherwise the token halts shortly between two segments.
const FREE_LOOKAHEAD = 100;
// A stick that is pushed just a little, or a d-pad button that just got pressed, walks with this part of the speed.
const MIN_SPEED = 0.15;
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
      // the d-pad of a standard gamepad
      buttons: {
        "Move-up": { index: "12", label: "d-pad up:" },
        "Move-down": { index: "13", label: "d-pad down:" },
        "Move-left": { index: "14", label: "d-pad left:" },
        "Move-right": { index: "15", label: "d-pad right:" },
      },
    },
    options: {
      speed: {
        label: "beaversGamepad.TokenMovement.speed.label",
        hint: "beaversGamepad.TokenMovement.speed.hint",
        value: 4,
        min: 0.5,
        max: 20,
        step: 0.5,
      },
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
  // when the last tick reported that the stick or the d-pad is in use
  heldAt?: number;
  // since when a d-pad button is held
  dpadSince?: number;
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
   * The tick only notes that the stick is in use. The walking itself is paced by the movement animation of the
   * token and not by the ticks, otherwise the token halts after each step until the next tick comes.
   */
  public tick(event: GamepadTickEvent): boolean {
    this.gamepadIndex = event.gamepad.index;
    if (this._input(event.gamepad).strength > 0) {
      this.heldAt = Date.now();
      this._walk().catch(console.error);
    } else {
      this.heldAt = undefined;
    }
    return true;
  }

  public destroy() {
    this.heldAt = undefined;
  }

  private get snapMode(): SnapMode {
    const mode = gamepadApi().Settings.get(MOVEMENT_SNAP);
    return mode === SNAP_END || mode === SNAP_NEVER ? mode : SNAP_ALWAYS;
  }

  /** the speed in grid spaces per second when the stick is pushed all the way */
  private get maxSpeed(): number {
    const speed = Number(this.config.options?.speed?.value);
    return speed > 0 ? speed : 4;
  }

  private _speed(input: MoveInput): number {
    return this.maxSpeed * (MIN_SPEED + (1 - MIN_SPEED) * input.strength);
  }

  /** where the stick and the d-pad of the gamepad point to, turned to the seat of the player. */
  private _input(gamepad: Gamepad): MoveInput {
    const binding = this.config.binding;
    const pressed = (name: string) => {
      const index = binding.buttons[name]?.index;
      if (index === undefined || index === null || index === "") return 0;
      return gamepad.buttons[Number(index)]?.pressed ? 1 : 0;
    };
    const stick: Point = {
      x: readAxis(binding, gamepad.axes, this.X_AXES),
      y: readAxis(binding, gamepad.axes, this.Y_AXES),
    };
    const dpad: Point = {
      x: pressed("Move-right") - pressed("Move-left"),
      y: pressed("Move-down") - pressed("Move-up"),
    };
    // walking freely the d-pad speeds up the longer it is held, turning to another direction keeps the speed.
    // grid steps with the d-pad walk with the top speed right away.
    const now = Date.now();
    if (dpad.x === 0 && dpad.y === 0) this.dpadSince = undefined;
    else this.dpadSince ??= now;
    const dpadStrength = this.snapMode === SNAP_ALWAYS ? 1 : rampStrength(now - (this.dpadSince ?? now));
    return moveInput(seatAdjust(stick, this.userPosition), seatAdjust(dpad, this.userPosition), dpadStrength);
  }

  /**
   * Where the stick points to at this very moment. The ticks only come every 100ms, a turn or a release of the stick
   * would be noticed too late to stop the next step.
   */
  private _currentInput(): MoveInput | undefined {
    if (!this.heldAt || Date.now() - this.heldAt >= HOLD_TIMEOUT) {
      return undefined;
    }
    const gamepad = navigator.getGamepads()[this.gamepadIndex ?? -1];
    if (!gamepad) {
      return undefined;
    }
    const input = this._input(gamepad);
    return input.strength > 0 ? input : undefined;
  }

  /**
   * moves the token as long as the stick is held.
   */
  private async _walk() {
    if (this.isMoving) {
      return;
    }
    this.isMoving = true;
    try {
      const mode = this.snapMode;
      let moved = false;
      let input: MoveInput | undefined;
      while ((input = this._currentInput())) {
        const speed = this._speed(input);
        if (mode === SNAP_ALWAYS) {
          const token = await this.move(input, speed);
          if (token) {
            const cell = this._cell(token);
            await this._almostArrived(token, Math.min(cell.w, cell.h) * LOOKAHEAD);
          } else {
            await sleep(BLOCKED_RETRY);
          }
        } else {
          const token = await this.moveFree(input, speed);
          if (token) {
            moved = true;
            await this._almostArrived(token, (speed * canvas.grid.size * FREE_LOOKAHEAD) / 1000);
          } else {
            await sleep(BLOCKED_RETRY);
          }
        }
      }
      if (moved && mode === SNAP_END) {
        await this.snapToGrid();
      }
    } finally {
      this.isMoving = false;
    }
  }

  /**
   * resolves when the token on the screen is closer than `lookahead` pixels to the position its document is heading
   * to. Watches the token itself instead of calculating the duration: systems and modules change the movement speed.
   */
  private async _almostArrived(token: any, lookahead: number) {
    const start = Date.now();
    while (Date.now() - start < STEP_TIMEOUT && !token.destroyed) {
      const source = token.document._source;
      const distance = Math.hypot(source.x - token.position.x, source.y - token.position.y);
      if (distance <= lookahead) {
        return;
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }

  /**
   * The cells the token walks on and snaps to. A token smaller than a grid space walks on parts of it.
   */
  private _cell(token: any): { w: number; h: number } {
    const size = canvas.grid.size;
    if (!canvas.grid.isSquare) {
      return { w: size, h: size };
    }
    return snapCell(size, token.document._source.width, token.document._source.height);
  }

  private _canMoveTo(token: any, position: Point): boolean {
    const center = token.getCenterPoint(position);
    return canvas.dimensions.rect.contains(center.x, center.y) && !token.checkCollision(center);
  }

  private _movableToken(): any | undefined {
    if (game.paused) {
      return undefined;
    }
    return findUserToken(this.userId);
  }

  /**
   * moves the token of the user one cell into the given direction, unless a wall is in the way.
   * @param speed grid spaces per second
   * @returns the token when it moved.
   */
  public async move(input: MoveInput, speed: number): Promise<any | undefined> {
    const token = this._movableToken();
    if (!token) {
      return undefined;
    }
    const direction = gridDirection(input);
    const cell = this._cell(token);
    // the position the token is heading to, not the one its animation currently shows.
    const start = snapToCell(token.document._source, cell);
    const destination = {
      x: start.x + direction.x * cell.w,
      y: start.y + direction.y * cell.h,
    };
    if (!this._canMoveTo(token, destination)) {
      return undefined;
    }
    await token.document.update(destination, { animation: { movementSpeed: speed } });
    return token;
  }

  /**
   * moves the token of the user a short way into the given direction without regard of the grid.
   * Slides along a wall that stands in the way diagonally.
   * @param speed grid spaces per second
   * @returns the token when it moved.
   */
  public async moveFree(input: MoveInput, speed: number): Promise<any | undefined> {
    const token = this._movableToken();
    if (!token) {
      return undefined;
    }
    const source = token.document._source;
    const position = { x: source.x, y: source.y };
    // speed is in grid spaces, the same walk takes the same time on a scene with small or large grid spaces
    const distance = Math.max(1, (speed * canvas.grid.size * FREE_SEGMENT) / 1000);
    const target = freeStep(position, input, distance);
    for (const candidate of slideAlternatives(position, target)) {
      if ((candidate.x !== position.x || candidate.y !== position.y) && this._canMoveTo(token, candidate)) {
        await token.document.update(candidate, { animation: { movementSpeed: speed } });
        return token;
      }
    }
    return undefined;
  }

  /**
   * moves the token of the user to the closest grid position it can reach.
   */
  public async snapToGrid(): Promise<void> {
    const token = this._movableToken();
    if (!token || canvas.grid.isGridless) {
      return;
    }
    const source = token.document._source;
    const position = { x: source.x, y: source.y };
    const candidates: Point[] = canvas.grid.isSquare
      ? snapCandidates(position, this._cell(token))
      : [token.document.getSnappedPosition(position)];
    for (const candidate of candidates) {
      if (candidate.x === position.x && candidate.y === position.y) {
        return;
      }
      if (this._canMoveTo(token, candidate)) {
        await token.document.update(
          { x: candidate.x, y: candidate.y },
          { animation: { movementSpeed: this.maxSpeed } },
        );
        return;
      }
    }
  }
}

type _TokenMovement_StaticCheck = AssertAssignable<typeof TokenMovement, StaticOf<GamepadModule>>;
