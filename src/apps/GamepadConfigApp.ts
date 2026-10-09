import { HOOK_GAMEPAD_CONNECTED, NAMESPACE, gamepadApi } from "../definitions";
import {
  CaptureKind,
  CaptureResult,
  CaptureSession,
  PadSnapshot,
  axisDirection,
  isNeutral,
  snapshot,
} from "../core/capture";
import { cloneModuleConfig } from "../core/config";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

interface CaptureTarget {
  gamepadIndex: string;
  moduleId: string;
  kind: CaptureKind;
  name: string;
}

const POLL_INTERVAL = 50;
// give up when the player does not touch the gamepad
const CAPTURE_TIMEOUT = 15000;
// do not wait forever for a stick that does not return to its resting position
const RELEASE_TIMEOUT = 3000;

const bindingPath = (target: CaptureTarget) =>
  `${target.gamepadIndex}.modules.${target.moduleId}.binding.${target.kind}.${target.name}`;

/**
 * this is the configuration app that allows to assign users to gamepads and to add, delete and configure gamepadmodules
 */
export class GamepadConfigApp extends HandlebarsApplicationMixin(ApplicationV2) {
  gamepadModules: {
    [key: string]: GamepadModule;
  } = {};
  gamepadConfigs: GamepadConfigs = {};
  hook?: number;
  pollTimer?: number;
  capture?: {
    queue: CaptureTarget[];
    session: CaptureSession;
    baseline: PadSnapshot;
    phase: "listen" | "release";
    since: number;
    busy: boolean;
  };

  static DEFAULT_OPTIONS = {
    id: NAMESPACE + "-config",
    classes: [NAMESPACE, "gamepad-config", "standard-form"],
    tag: "form",
    position: {
      width: 600,
      height: 700,
    },
    window: {
      title: "beaversGamepad.gamepadConfigApp.title",
      icon: "fa-solid fa-gamepad",
      resizable: true,
    },
    form: {
      handler: GamepadConfigApp.onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      detect: GamepadConfigApp.onDetect,
      detectAll: GamepadConfigApp.onDetectAll,
      cancelDetect: GamepadConfigApp.onCancelDetect,
      deleteModule: GamepadConfigApp.onDeleteModule,
      identify: GamepadConfigApp.onIdentify,
    },
  };

  static PARTS = {
    form: {
      template: `modules/${NAMESPACE}/templates/gamepad-config.hbs`,
      scrollable: [""],
    },
  };

  async _prepareContext(options: any): Promise<any> {
    const settings = gamepadApi().Settings;
    this.gamepadModules = gamepadApi().GamepadModuleManager.getGamepadModules();
    this.gamepadConfigs = settings.getGamepadConfigs();
    const uiData = settings.getUIData();
    const assigned = new Set(Object.values(this.gamepadConfigs).map((config) => config.userId));
    const listening = this.capture ? bindingPath(this.capture.queue[0]) : undefined;
    const pads = navigator.getGamepads();

    const gamepads = Object.entries(this.gamepadConfigs).map(([index, config]) => ({
      index: index,
      gamepadId: config.gamepadId,
      userId: config.userId,
      userPosition: uiData[config.userId]?.userPosition ?? "bottom",
      canRumble: !!(pads[Number(index)] as any)?.vibrationActuator,
      users: game.users.contents
        .filter((user: any) => user.id === config.userId || !assigned.has(user.id))
        .map((user: any) => ({ id: user.id, name: user.name, selected: user.id === config.userId })),
      modules: Object.entries(config.modules).map(([moduleId, moduleConfig]) => {
        const defaultConfig = this.gamepadModules[moduleId]?.defaultConfig;
        const binding = (kind: CaptureKind, name: string, data: any) => {
          const path = bindingPath({ gamepadIndex: index, moduleId, kind, name });
          return {
            kind: kind,
            name: name,
            path: path,
            label: data.label ?? name,
            index: data.index,
            isAxis: kind === "axes",
            reversed: !!data.reversed,
            listening: path === listening,
          };
        };
        return {
          id: moduleId,
          name: defaultConfig?.name ?? moduleConfig.name,
          desc: defaultConfig?.desc ?? moduleConfig.desc,
          isMissing: !defaultConfig,
          bindings: [
            ...Object.entries(moduleConfig.binding.axes).map(([name, data]) => binding("axes", name, data)),
            ...Object.entries(moduleConfig.binding.buttons).map(([name, data]) => binding("buttons", name, data)),
          ],
        };
      }),
      addable: Object.entries(this.gamepadModules)
        .filter(([moduleId]) => !config.modules[moduleId])
        .map(([moduleId, gamepadModule]) => ({ id: moduleId, name: gamepadModule.defaultConfig.name })),
    }));

    return {
      gamepads: gamepads,
      hasGamepads: gamepads.length > 0,
      prompt: this._getPrompt(),
      positionChoices: {
        bottom: "beaversGamepad.position.bottom",
        left: "beaversGamepad.position.left",
        right: "beaversGamepad.position.right",
        top: "beaversGamepad.position.top",
      },
    };
  }

  async _onFirstRender(context: any, options: any) {
    await super._onFirstRender(context, options);
    this.hook = Hooks.on(HOOK_GAMEPAD_CONNECTED, () => this.render());
    this.pollTimer = window.setInterval(() => this._poll(), POLL_INTERVAL);
  }

  _onClose(options: any) {
    super._onClose(options);
    Hooks.off(HOOK_GAMEPAD_CONNECTED, this.hook);
    window.clearInterval(this.pollTimer);
    this._stopCapture();
    gamepadApi().GamepadModuleManager.updateGamepadModuleInstance();
  }

  /**
   * stores every change right away. Only changes that alter the structure of the form trigger a rendering,
   * so that the focus is not lost while typing.
   */
  static async onSubmit(this: GamepadConfigApp, event: Event, form: HTMLFormElement, formData: any) {
    const settings = gamepadApi().Settings;
    const update: { [path: string]: any } = {};
    const uiData: UIData = {};
    let render = false;
    for (const [path, value] of Object.entries(formData.object as { [path: string]: any })) {
      const [head, ...tail] = path.split(".");
      if (head === "add") {
        const gamepadModule = this.gamepadModules[value];
        if (gamepadModule) {
          update[`${tail[0]}.modules.${value}`] = cloneModuleConfig(gamepadModule.defaultConfig);
          render = true;
        }
      } else if (head === "ui") {
        const [userId, attribute] = tail;
        if (settings.getUserData(userId)[attribute] !== value) {
          uiData[userId] = { ...settings.getUserData(userId), ...uiData[userId], [attribute]: value };
        }
      } else if (tail[0] === "userId") {
        if (value !== this.gamepadConfigs[head]?.userId) {
          update[path] = value;
          render = true;
          // a user with a gamepad always gets a tiny user interface on this client
          if (value && !settings.getUIData()[value]) {
            uiData[value] = { ...settings.getUserData(value), ...uiData[value] };
          }
        }
      } else if (value !== null) {
        update[path] = value;
      }
    }
    if (Object.keys(uiData).length > 0) {
      await settings.setUIData(uiData, { updateUI: true });
    }
    if (Object.keys(update).length > 0) {
      await settings.updateGamepadConfigs(update);
    } else if (Object.keys(uiData).length > 0) {
      // the modules read the position of the user
      gamepadApi().GamepadModuleManager.updateGamepadModuleInstance();
    }
    if (render) {
      await this.render();
    }
  }

  static async onDeleteModule(this: GamepadConfigApp, event: Event, target: HTMLElement) {
    const { gamepad, module } = target.dataset;
    this._stopCapture();
    await gamepadApi().Settings.deleteGamepadConfig(gamepad as string, module as string);
    await this.render();
  }

  static async onDetect(this: GamepadConfigApp, event: Event, target: HTMLElement) {
    const { gamepad, module, kind, name } = target.dataset;
    await this._startCapture([
      { gamepadIndex: gamepad as string, moduleId: module as string, kind: kind as CaptureKind, name: name as string },
    ]);
  }

  /**
   * walks through all bindings of a module one after the other
   */
  static async onDetectAll(this: GamepadConfigApp, event: Event, target: HTMLElement) {
    const gamepadIndex = target.dataset.gamepad as string;
    const moduleId = target.dataset.module as string;
    const binding = this.gamepadConfigs[gamepadIndex]?.modules[moduleId]?.binding;
    if (!binding) return;
    await this._startCapture([
      ...Object.keys(binding.axes).map((name) => ({ gamepadIndex, moduleId, kind: "axes" as CaptureKind, name })),
      ...Object.keys(binding.buttons).map((name) => ({ gamepadIndex, moduleId, kind: "buttons" as CaptureKind, name })),
    ]);
  }

  static async onCancelDetect(this: GamepadConfigApp) {
    this._stopCapture();
    await this.render();
  }

  /**
   * lets the gamepad rumble, to find out which of the listed gamepads is in your hands.
   */
  static async onIdentify(this: GamepadConfigApp, event: Event, target: HTMLElement) {
    const pad: any = navigator.getGamepads()[Number(target.dataset.gamepad)];
    try {
      await pad?.vibrationActuator?.playEffect("dual-rumble", {
        duration: 500,
        strongMagnitude: 1,
        weakMagnitude: 1,
      });
    } catch (e) {
      console.warn(`${NAMESPACE} | gamepad can not rumble`, e);
    }
  }

  private async _startCapture(queue: CaptureTarget[]) {
    this._stopCapture();
    const pad = navigator.getGamepads()[Number(queue[0]?.gamepadIndex)];
    if (!pad) return;
    // the gamepad must not move tokens or open doors while its buttons are detected
    gamepadApi().GamepadModuleManager.suspend(queue[0].gamepadIndex);
    const baseline = snapshot(pad);
    this.capture = {
      queue: queue,
      baseline: baseline,
      session: new CaptureSession(queue[0].kind, baseline),
      phase: "listen",
      since: Date.now(),
      busy: false,
    };
    await this.render();
  }

  private _stopCapture() {
    if (this.capture) {
      gamepadApi().GamepadModuleManager.resume(this.capture.queue[0].gamepadIndex);
      this.capture = undefined;
    }
  }

  private _getPrompt(): string {
    if (!this.capture) return "";
    const target = this.capture.queue[0];
    if (this.capture.phase === "release") {
      return game.i18n.localize("beaversGamepad.detect.release");
    }
    const key = target.kind === "buttons" ? "button" : axisDirection(target.name);
    return game.i18n.localize(`beaversGamepad.detect.${key}`);
  }

  /**
   * reads the gamepads while the app is open: shows which bindings are in use right now and feeds a running detection.
   */
  private _poll() {
    const pads = navigator.getGamepads();
    const root: HTMLElement | undefined = this.element;
    if (!root) return;
    for (const fieldset of root.querySelectorAll<HTMLElement>("fieldset.gamepad")) {
      const pad = pads[Number(fieldset.dataset.gamepad)];
      fieldset.classList.toggle("pressed", !!pad?.buttons.some((button) => button.pressed));
      const raw = fieldset.querySelector<HTMLElement>(".gamepad-raw");
      const text = this._describe(pad);
      if (raw && raw.textContent !== text) {
        raw.textContent = text;
      }
      for (const row of fieldset.querySelectorAll<HTMLElement>(".binding")) {
        const value = row.querySelector<HTMLInputElement>("input.binding-index")?.value;
        const index = value === "" || value === undefined ? -1 : Number(value);
        const active =
          row.dataset.kind === "buttons" ? !!pad?.buttons[index]?.pressed : Math.abs(pad?.axes[index] ?? 0) > 0.5;
        row.classList.toggle("active", active);
      }
    }
    this._pollCapture(pads).catch(console.error);
  }

  /**
   * what the browser reports for a gamepad right now. If a stick does not show up here, the gamepad does not send
   * it as gamepad input (e.g. it is in a mouse or media mode) and nothing can be detected.
   */
  private _describe(pad: Gamepad | null | undefined): string {
    if (!pad) {
      return game.i18n.localize("beaversGamepad.gamepadConfigApp.rawMissing");
    }
    const none = game.i18n.localize("beaversGamepad.gamepadConfigApp.rawNone");
    const pressed = pad.buttons.flatMap((button, index) => (button.pressed ? [index] : []));
    const moved = pad.axes.flatMap((value, index) =>
      Math.abs(value) > 0.15 ? [`${index}: ${value > 0 ? "+" : ""}${value.toFixed(2)}`] : [],
    );
    return game.i18n.format("beaversGamepad.gamepadConfigApp.raw", {
      buttonCount: pad.buttons.length,
      axisCount: pad.axes.length,
      pressed: pressed.join(", ") || none,
      moved: moved.join(", ") || none,
    });
  }

  private async _pollCapture(pads: (Gamepad | null)[]) {
    const capture = this.capture;
    if (!capture || capture.busy) return;
    const target = capture.queue[0];
    const pad = pads[Number(target.gamepadIndex)];
    const waited = Date.now() - capture.since;
    if (!pad || (capture.phase === "listen" && waited > CAPTURE_TIMEOUT)) {
      ui.notifications.warn("beaversGamepad.detect.timeout", { localize: true });
      this._stopCapture();
      await this.render();
      return;
    }
    const current = snapshot(pad);
    capture.busy = true;
    try {
      if (capture.phase === "listen") {
        const result = capture.session.update(current);
        if (result) {
          await this._applyCapture(target, result);
          capture.phase = "release";
          capture.since = Date.now();
          await this.render();
        }
      } else if (isNeutral(capture.baseline, current) || waited > RELEASE_TIMEOUT) {
        if (capture.queue.length > 1) {
          capture.queue.shift();
          capture.baseline = current;
          capture.session = new CaptureSession(capture.queue[0].kind, current);
          capture.phase = "listen";
          capture.since = Date.now();
        } else {
          this._stopCapture();
        }
        await this.render();
      }
    } finally {
      capture.busy = false;
    }
  }

  private async _applyCapture(target: CaptureTarget, result: CaptureResult) {
    const path = bindingPath(target);
    const update: { [path: string]: any } = { [`${path}.index`]: result.index };
    if (result.kind === "axes") {
      update[`${path}.reversed`] = result.reversed;
    }
    await gamepadApi().Settings.updateGamepadConfigs(update);
  }
}
