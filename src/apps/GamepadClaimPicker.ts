import { NAMESPACE } from "../definitions";
import { readAxis } from "../core/axes";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const POLL_MS = 100;
// standard mapping of the d-pad
const DPAD = { up: 12, down: 13, left: 14, right: 15 };

export interface ClaimPickerData {
  gamepadId: string;
  candidates: string[];
  selected: string;
  // the gamepad that plays the picker, without it the picker is played with mouse or touch only.
  gamepad?: {
    index: string;
    // binding of the tiny-ui control module of the gamepad: axes, ok and abort button
    binding: GamepadModuleConfigBinding;
  };
  // overlay: blurs the whole screen and sits in its middle (the table screen). Otherwise a normal window (gamemaster).
  overlay: boolean;
}

/**
 * Asks who plays with a gamepad that woke up: one card per seat it may belong to.
 * On the table screen it covers the screen and is played with that gamepad (stick or d-pad, ok, abort) or by touch.
 * For the gamemaster it is a normal window.
 */
export class GamepadClaimPicker extends HandlebarsApplicationMixin(ApplicationV2) {
  private _claim: ClaimPickerData;
  private _current: number;
  private _resolve?: (userId: string | null) => void;
  private _interval?: number;
  // a button or stick that is still held from waking the gamepad up must be released first.
  private _last = { direction: 1, ok: true, abort: true };

  static DEFAULT_OPTIONS = {
    classes: [NAMESPACE, "beavers-gamepad-claim"],
    window: {
      title: "beaversGamepad.claim.title",
      icon: "fa-solid fa-gamepad",
    },
    position: {
      width: 560,
      height: "auto",
    },
  };

  static PARTS = {
    content: {
      template: `modules/${NAMESPACE}/templates/claim-picker.hbs`,
    },
  };

  constructor(claim: ClaimPickerData) {
    super({
      id: `${NAMESPACE}-claim-${foundry.utils.randomID()}`,
      window: claim.overlay ? { frame: false, positioned: false } : {},
    });
    this._claim = claim;
    this._current = Math.max(0, claim.candidates.indexOf(claim.selected));
  }

  ask(): Promise<string | null> {
    return new Promise((resolve) => {
      this._resolve = resolve;
      this.render({ force: true });
      if (this._claim.gamepad) {
        this._interval = window.setInterval(() => this._poll(), POLL_MS);
      }
    });
  }

  async _prepareContext(options: any): Promise<any> {
    return {
      overlay: this._claim.overlay,
      title: game.i18n.localize("beaversGamepad.claim.title"),
      question: game.i18n.localize("beaversGamepad.claim.question"),
      model: this._claim.gamepadId,
      hint: game.i18n.localize(this._claim.overlay ? "beaversGamepad.claim.screenHint" : "beaversGamepad.claim.gmHint"),
      choices: this._claim.candidates.map((userId, index) => {
        const user = game.users.get(userId);
        const character = user?.character;
        return {
          id: userId,
          userName: user?.name ?? userId,
          characterName: character?.name ?? "",
          img: character?.img ?? user?.avatar ?? "icons/svg/mystery-man.svg",
          color: String(user?.color ?? "#888888"),
          current: index === this._current,
        };
      }),
    };
  }

  async _onRender(context: any, options: any) {
    await super._onRender(context, options);
    const element: HTMLElement = this.element;
    element.classList.toggle("overlay", this._claim.overlay);
    element
      .querySelectorAll<HTMLElement>(".claim-card")
      .forEach((el) => el.addEventListener("click", () => this._choose(el.dataset.user ?? null)));
    element.querySelector(".claim-keep")?.addEventListener("click", () => this._choose(null));
  }

  async close(options?: any): Promise<any> {
    this._finish(null);
    return super.close(options);
  }

  private _poll() {
    const claim = this._claim.gamepad!;
    const gamepad = navigator.getGamepads()[Number(claim.index)];
    if (!gamepad || gamepad.id !== this._claim.gamepadId) {
      // the gamepad went off again, it keeps its user.
      this.close();
      return;
    }
    const pressed = (index: string | number | undefined) =>
      index !== undefined && index !== "" && !!gamepad.buttons[Number(index)]?.pressed;
    const standard = gamepad.mapping === "standard";
    const stick = (name: string) => {
      const value = readAxis(claim.binding, gamepad.axes, name);
      return Math.abs(value) > 0.5 ? Math.sign(value) : 0;
    };
    const dpad = (minus: number, plus: number) => (standard ? Number(pressed(plus)) - Number(pressed(minus)) : 0);
    // the cards are a row that may wrap: right and down go to the next card, left and up to the previous one.
    const direction =
      stick("horizontal") || stick("vertical") || dpad(DPAD.left, DPAD.right) || dpad(DPAD.up, DPAD.down);
    const ok = pressed(claim.binding.buttons["ok"]?.index);
    const abort = pressed(claim.binding.buttons["abort"]?.index);
    if (direction !== 0 && this._last.direction === 0) this._move(direction);
    if (ok && !this._last.ok) this._choose(this._claim.candidates[this._current]);
    else if (abort && !this._last.abort) this._choose(null);
    this._last = { direction, ok, abort };
  }

  private _move(direction: number) {
    const length = this._claim.candidates.length;
    this._current = Math.min(length - 1, Math.max(0, this._current + direction));
    this.element
      ?.querySelectorAll(".claim-card")
      .forEach((el: Element, index: number) => el.classList.toggle("current", index === this._current));
  }

  private _choose(userId: string | null) {
    this._finish(userId);
    this.close();
  }

  private _finish(userId: string | null) {
    window.clearInterval(this._interval);
    const resolve = this._resolve;
    this._resolve = undefined;
    resolve?.(userId);
  }
}
