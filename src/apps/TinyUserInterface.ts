/**
 * Will paint a display with an actor and current activities as dropdown
 * needs to be position absolute, so we can have multiple instances of that for shared screen.
 * Each user can have one instance it need not be the user of the client.
 * each user instance can be dragged and rotated to position it.
 * the app needs to be very small. in place dropdown ?
 * */
import { NAMESPACE, gamepadApi } from "../definitions";
import { TinyUserInterfaceGamepadModule } from "../modules/TinyUserInterfaceGamepadModule";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const ROTATION: { [userPosition: string]: string } = { left: "90deg", top: "180deg", right: "270deg" };
// height of one choice in the wheel, has to match tiny-ui.hbs
const WHEEL_STEP = 16;

export class TinyUserInterface extends HandlebarsApplicationMixin(ApplicationV2) implements TinyUserInterfaceI {
  _data: {
    userId: string;
    wheel: number;
    selectData: TinyUISelectData;
    resolve?: (id: string | null) => void;
    glow: boolean;
    closed: boolean;
  };
  hook: number;

  constructor(userId: string) {
    super({ id: `${NAMESPACE}-tiny-ui-${userId}` });
    this._data = {
      userId: userId,
      wheel: 0,
      selectData: { choices: {} },
      glow: false,
      closed: false,
    };
    this.hook = Hooks.on("updateUser", (user: any) => {
      if (user.id === userId) {
        this.render();
      }
    });
  }

  // The root element has to be a direct child of body with the class beavers-tiny-ui: that is what gamepad.css
  // keeps visible when monks-common-display hides the rest of the ui.
  static DEFAULT_OPTIONS = {
    classes: [NAMESPACE, "beavers-tiny-ui"],
    tag: "div",
    window: {
      frame: false,
      positioned: false,
    },
  };

  static PARTS = {
    content: {
      template: `modules/${NAMESPACE}/templates/tiny-ui.hbs`,
    },
  };

  get userId() {
    return this._data.userId;
  }

  async close(options?: any): Promise<any> {
    Hooks.off("updateUser", this.hook);
    this._data.closed = true;
    const resolve = this._data.resolve;
    this._data.resolve = undefined;
    resolve?.(null);
    return super.close(options);
  }

  async _prepareContext(options: any): Promise<any> {
    const choices = Object.entries(this._data.selectData.choices).map(([key, value]) => ({ key, ...value }));
    return {
      user: game.users.get(this._data.userId),
      choices: choices,
      isIdle: choices.length === 0,
    };
  }

  /**
   * the tiny ui is placed by the stored userdata and not by the window management of foundry
   */
  setPosition(position?: any): any {
    this._place();
    return position;
  }

  private _place() {
    const element: HTMLElement | undefined = this.element;
    if (!element) return;
    const userData = gamepadApi().Settings.getUserData(this._data.userId);
    const user = game.users.get(this._data.userId);
    const top = Math.min(Math.max(Number(userData.top) || 0, 0), Math.max(window.innerHeight - 40, 0));
    const left = Math.min(Math.max(Number(userData.left) || 0, 0), Math.max(window.innerWidth - 40, 0));
    element.style.top = `${top}px`;
    element.style.left = `${left}px`;
    element.style.transform = `rotate(${ROTATION[userData.userPosition] ?? "0deg"})`;
    element.style.setProperty("--user-color", String(user?.color ?? "#888888"));
    element.classList.toggle("glow", this._data.glow);
  }

  async _onRender(context: any, options: any) {
    await super._onRender(context, options);
    this._place();
    const html: HTMLElement = this.element;
    html.querySelector(".selection")?.addEventListener(
      "wheel",
      (e) => {
        const deltaY = (e as WheelEvent).deltaY;
        if (deltaY !== 0) this.rotateWheel(deltaY > 0 ? 1 : -1);
      },
      { passive: true },
    );
    html.querySelector("a.up")?.addEventListener("click", () => this.rotateWheel(-1));
    html.querySelector("a.down")?.addEventListener("click", () => this.rotateWheel(1));
    html.querySelectorAll<HTMLElement>(".select").forEach((el) =>
      el.addEventListener("click", () => {
        this._choose(el.dataset.key ?? null);
      }),
    );
    html.querySelector(".drag-me")?.addEventListener("mousedown", (e) => {
      dragElement(e as MouseEvent, html).then((position) => {
        gamepadApi().Settings.setUserData(this._data.userId, position);
      });
    });
    this.rotateWheel(0);
  }

  public async select(selectData: TinyUISelectData): Promise<string | null> {
    // a selection that is still open is aborted.
    this._data.resolve?.(null);
    const gamepadIndex = gamepadApi().Settings.getGamepadIndexForUser(this.userId);
    const dfd = new Deferred<string | null>();
    let promise = dfd.promise;
    if (gamepadIndex) {
      gamepadApi().GamepadModuleManager.enableContextModule(
        gamepadIndex,
        TinyUserInterfaceGamepadModule.defaultConfig.id,
      );
      this._data.glow = true;
      promise = dfd.promise.then(async (x) => {
        // only when no follow up selection took over the gamepad meanwhile
        if (this._data.resolve === undefined) {
          this._data.glow = false;
          gamepadApi().GamepadModuleManager.disableContextModule(gamepadIndex);
          if (!this._data.closed) {
            await this.render();
          }
        }
        return x;
      });
    }
    this._data.selectData = selectData;
    this._data.wheel = Math.max(0, Object.keys(selectData.choices).indexOf(selectData.selected ?? ""));
    this._data.resolve = dfd.resolve;
    await this.render();
    return promise;
  }

  /**
   * may get called via gamepadmodule
   * @param count
   */
  public rotateWheel(count: number) {
    this._data.wheel += count;
    const length = Object.values(this._data.selectData.choices).length;
    this._data.wheel = Math.min(length - 1, Math.max(0, this._data.wheel));
    const html: HTMLElement | undefined = this.element;
    const wheel = html?.querySelector<HTMLElement>(".wheel");
    if (!html || !wheel) {
      return;
    }
    // the current choice sits in the middle of three visible rows
    wheel.style.transform = `translateY(${(1 - this._data.wheel) * WHEEL_STEP}px)`;
    html.querySelectorAll(".select").forEach((el, index) => el.classList.toggle("current", index === this._data.wheel));
    html.querySelector("a.up")?.classList.toggle("disabled", this._data.wheel === 0);
    html.querySelector("a.down")?.classList.toggle("disabled", this._data.wheel >= length - 1);
    const counter = html.querySelector(".count");
    if (counter) {
      counter.textContent = length > 1 ? `${this._data.wheel + 1}/${length}` : "";
    }
  }

  /**
   * may get called via gamepadmodule
   */
  public async ok() {
    const choice = Object.keys(this._data.selectData.choices)[this._data.wheel];
    return this._choose(choice ?? null);
  }

  /**
   * may get called via gamepadmodule
   */
  public async abort() {
    return this._choose(null);
  }

  async _choose(id: string | null) {
    const resolve = this._data.resolve;
    this._data.resolve = undefined;
    this._data.selectData = { choices: {} };
    this._data.wheel = 0;
    await this.render();
    resolve?.(id);
  }
}

class Deferred<T> {
  promise: Promise<T>;
  reject: () => void = () => void 0;
  resolve: (value: T) => void = () => void 0;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.reject = reject;
      this.resolve = resolve;
    });
  }
}

/**
 * moves the element with the mouse until the mouse button is released, resolves with its final position.
 */
function dragElement(event: MouseEvent, element: HTMLElement): Promise<{ top: number; left: number }> {
  event.preventDefault();
  const offsetX = event.clientX - element.offsetLeft;
  const offsetY = event.clientY - element.offsetTop;
  let top = element.offsetTop;
  let left = element.offsetLeft;
  return new Promise((resolve) => {
    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      top = Math.max(e.clientY - offsetY, 0);
      left = Math.max(e.clientX - offsetX, 0);
      element.style.top = `${top}px`;
      element.style.left = `${left}px`;
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      resolve({ top, left });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
}
