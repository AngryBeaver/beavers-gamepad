/**
 * A virtual gamepad that is played with the keyboard, to try out gamepad modules without a gamepad.
 * It is added to what navigator.getGamepads() returns, so everything treats it like a real one.
 *
 * - arrow keys: left stick pushed all the way, with shift pushed half way.
 * - I J K L: d-pad up, left, down, right (the token movement speeds up the longer the d-pad is held)
 * - Enter: button 0 (A), Backspace: button 1 (B)
 *
 * While it is active these keys do not reach foundry, unless you type into an input field.
 */
export const KEYBOARD_GAMEPAD_ID = "Beaver's Keyboard Gamepad (arrow keys, IJKL, Enter, Backspace)";

// how far the stick is pushed while shift is held
const SLOW = 0.5;
const BUTTON_COUNT = 17;

const STICK_KEYS: { [code: string]: { axis: number; value: number } } = {
  ArrowLeft: { axis: 0, value: -1 },
  ArrowRight: { axis: 0, value: 1 },
  ArrowUp: { axis: 1, value: -1 },
  ArrowDown: { axis: 1, value: 1 },
};

const BUTTON_KEYS: { [code: string]: number } = {
  Enter: 0,
  NumpadEnter: 0,
  Backspace: 1,
  KeyI: 12,
  KeyK: 13,
  KeyJ: 14,
  KeyL: 15,
};

export class KeyboardGamepad {
  private enabled = false;
  private pressed = new Set<string>();
  private slow = false;
  private readonly originalGetGamepads: () => (Gamepad | null)[];

  constructor() {
    this.originalGetGamepads = navigator.getGamepads.bind(navigator);
    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      writable: true,
      value: () => this._getGamepads(),
    });
    window.addEventListener("keydown", (event) => this._onKey(event, true), { capture: true });
    window.addEventListener("keyup", (event) => this._onKey(event, false), { capture: true });
    window.addEventListener("blur", () => this._release());
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    this._release();
  }

  private _getGamepads(): (Gamepad | null)[] {
    const pads = Array.from(this.originalGetGamepads());
    if (!this.enabled) {
      return pads;
    }
    // chrome always lists 4 slots, the virtual gamepad takes the one after them.
    const index = Math.max(4, pads.length);
    pads[index] = this._snapshot(index);
    return pads;
  }

  private _snapshot(index: number): Gamepad {
    const axes = [0, 0, 0, 0];
    for (const [code, { axis, value }] of Object.entries(STICK_KEYS)) {
      if (this.pressed.has(code)) axes[axis] += value;
    }
    const strength = this.slow ? SLOW : 1;
    // a diagonal is not pushed further than a straight line
    const length = Math.hypot(axes[0], axes[1]) || 1;
    const buttons = Array.from({ length: BUTTON_COUNT }, () => ({ pressed: false, touched: false, value: 0 }));
    for (const [code, button] of Object.entries(BUTTON_KEYS)) {
      if (this.pressed.has(code)) buttons[button] = { pressed: true, touched: true, value: 1 };
    }
    return {
      id: KEYBOARD_GAMEPAD_ID,
      index: index,
      connected: true,
      mapping: "standard",
      timestamp: performance.now(),
      axes: axes.map((value) => (value * strength) / length),
      buttons: buttons,
      hapticActuators: [],
      vibrationActuator: null,
    } as unknown as Gamepad;
  }

  private _onKey(event: KeyboardEvent, down: boolean) {
    if (!this.enabled) {
      return;
    }
    if (event.key === "Shift") {
      this.slow = down;
      return;
    }
    if (!(event.code in STICK_KEYS) && !(event.code in BUTTON_KEYS)) {
      return;
    }
    if (down && (event.ctrlKey || event.altKey || event.metaKey || this._isTyping(event))) {
      return;
    }
    if (down) this.pressed.add(event.code);
    else this.pressed.delete(event.code);
    // foundry would also pan the canvas, move the selected token or delete it
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  private _release() {
    this.pressed.clear();
  }

  private _isTyping(event: KeyboardEvent): boolean {
    const target = event.target as HTMLElement | null;
    return !!target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
  }
}
