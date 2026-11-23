import {
  ASK_USER_ON_RECONNECT,
  HOOK_GAMEPAD_REGISTERED,
  NAMESPACE,
  QUERY_CLAIM_GAMEPAD,
  gamepadApi,
} from "../definitions";
import { claimCandidates, withStoredBinding } from "../core/config";
import { TinyUserInterfaceGamepadModule } from "../modules/TinyUserInterfaceGamepadModule";
import { GamepadClaimPicker } from "./GamepadClaimPicker";

export const ASK_GAMEMASTER = "gamemaster";
export const ASK_SCREEN = "screen";
export const ASK_OFF = "off";

// a gamemaster that does not answer, keeps the user the gamepad got.
const QUERY_TIMEOUT_MS = 10 * 60 * 1000;

interface ClaimQuery {
  gamepadId: string;
  candidates: string[];
  selected: string;
}

/**
 * Gamepads fall asleep and wake up in any order and the browser hands out no serial number. When a gamepad wakes up
 * while several gamepads of the same model are off, it can not be told which of them it is. The gamemaster or the
 * players at this screen are asked who is playing with it, the answer swaps the seats (user and bindings).
 * Meanwhile the gamepad is paused, so it does not move the token of somebody else.
 */
export class GamepadClaim {
  // the newest question per gamepad index, an answer to an older question is ignored.
  private _pending = new Map<string, number>();
  private _pickers = new Map<string, GamepadClaimPicker>();
  private _counter = 0;

  constructor() {
    Hooks.on(HOOK_GAMEPAD_REGISTERED, (gamepadIndex: string) => this._onRegistered(gamepadIndex));
  }

  private _onRegistered(gamepadIndex: string) {
    if (game.settings.get(NAMESPACE, ASK_USER_ON_RECONNECT) === ASK_OFF) return;
    const settings = gamepadApi().Settings;
    const configs = settings.getStoredGamepadConfigs();
    const connected = Object.keys(settings.getGamepadConfigs()).filter((index) => index !== gamepadIndex);
    const candidates = claimCandidates(configs, connected, gamepadIndex);
    if (candidates.length === 0) return;
    this._claim(gamepadIndex, configs[gamepadIndex], candidates).catch(console.error);
  }

  private async _claim(gamepadIndex: string, config: GamepadConfig, candidates: string[]) {
    const token = ++this._counter;
    this._pending.set(gamepadIndex, token);
    this._pickers.get(gamepadIndex)?.close();
    const moduleManager = gamepadApi().GamepadModuleManager;
    moduleManager.suspend(gamepadIndex);
    try {
      const chosen = await this._ask(gamepadIndex, config, candidates);
      if (chosen && this._pending.get(gamepadIndex) === token) {
        await this._swap(gamepadIndex, chosen);
      }
    } finally {
      if (this._pending.get(gamepadIndex) === token) {
        this._pending.delete(gamepadIndex);
        moduleManager.resume(gamepadIndex);
      }
    }
  }

  private async _ask(gamepadIndex: string, config: GamepadConfig, candidates: string[]): Promise<string | null> {
    const query: ClaimQuery = { gamepadId: config.gamepadId, candidates, selected: config.userId };
    const gm = game.users.activeGM;
    // a gamemaster that is logged in at this screen gets the question on this screen.
    if (game.settings.get(NAMESPACE, ASK_USER_ON_RECONNECT) === ASK_GAMEMASTER && gm && !gm.isSelf) {
      return gm.query(QUERY_CLAIM_GAMEPAD, query, { timeout: QUERY_TIMEOUT_MS }).catch((e: unknown) => {
        console.warn(e);
        return null;
      });
    }
    // ask on this screen, the gamepad plays the question.
    const binding = withStoredBinding(TinyUserInterfaceGamepadModule.defaultConfig, config).binding;
    const picker = new GamepadClaimPicker({ ...query, gamepad: { index: gamepadIndex, binding }, overlay: true });
    this._pickers.set(gamepadIndex, picker);
    const chosen = await picker.ask();
    if (this._pickers.get(gamepadIndex) === picker) this._pickers.delete(gamepadIndex);
    return chosen;
  }

  /**
   * the gamepad takes the seat of the chosen user, the gamepad that sat there gets the seat of this one.
   */
  private async _swap(gamepadIndex: string, chosen: string) {
    const settings = gamepadApi().Settings;
    // the seats may have changed while the question was open, e.g. another gamepad woke up.
    const configs = settings.getStoredGamepadConfigs();
    const current = configs[gamepadIndex];
    if (!current || current.userId === chosen) return;
    const other = Object.keys(configs).find(
      (index) => configs[index].userId === chosen && configs[index].gamepadId === current.gamepadId,
    );
    if (other === undefined) return;
    await settings.updateGamepadConfigs({ [gamepadIndex]: configs[other], [other]: current });
  }
}

/**
 * the gamemaster side of the question, registered in CONFIG.queries
 */
export async function handleClaimGamepadQuery(query: ClaimQuery): Promise<string | null> {
  const chosen = await new GamepadClaimPicker({ ...query, overlay: false }).ask();
  return chosen && query.candidates.includes(chosen) ? chosen : null;
}
