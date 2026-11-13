import { GamepadConfigApp } from "./apps/GamepadConfigApp";
import { UIConfigApp } from "./apps/UIConfigApp";
import { KeyboardGamepad } from "./apps/KeyboardGamepad";
import { DEFAULT_MODULE_IDS, MOVEMENT_SNAP, NAMESPACE, USER_UI, gamepadApi } from "./definitions";
import { SNAP_ALWAYS, SNAP_END, SNAP_NEVER } from "./core/movement";
import { cloneModuleConfig, reconcileGamepadConfigs } from "./core/config";

export class GamepadSettings implements GamepadSettingsI {
  private GAMEPAD_CONFIG = "gamepad_config";
  private GAMEPAD_CONFIG_BUTTON = "gamepad_config_button";
  private UI_CONFIG_BUTTON = "ui_config_button";
  private KEYBOARD_GAMEPAD = "keyboard_gamepad";

  constructor() {
    game.settings.register(NAMESPACE, USER_UI, {
      scope: "client",
      config: false,
      default: {},
      type: Object,
    });

    game.settings.register(NAMESPACE, this.GAMEPAD_CONFIG, {
      scope: "client",
      config: false,
      default: {},
      type: Object,
    });

    game.settings.register(NAMESPACE, MOVEMENT_SNAP, {
      name: "beaversGamepad.TokenMovement.snap.label",
      hint: "beaversGamepad.TokenMovement.snap.hint",
      scope: "world",
      config: true,
      default: SNAP_ALWAYS,
      type: String,
      choices: {
        [SNAP_ALWAYS]: "beaversGamepad.TokenMovement.snap.always",
        [SNAP_END]: "beaversGamepad.TokenMovement.snap.end",
        [SNAP_NEVER]: "beaversGamepad.TokenMovement.snap.never",
      },
    });

    const keyboardGamepad = new KeyboardGamepad();
    game.settings.register(NAMESPACE, this.KEYBOARD_GAMEPAD, {
      name: "beaversGamepad.settings.keyboardGamepad.name",
      hint: "beaversGamepad.settings.keyboardGamepad.hint",
      scope: "client",
      config: true,
      default: false,
      type: Boolean,
      onChange: (value: boolean) => keyboardGamepad.setEnabled(value),
    });
    keyboardGamepad.setEnabled(!!this.get(this.KEYBOARD_GAMEPAD));

    Hooks.on("renderSettingsConfig", (app: any, element: HTMLElement) => this._saveOnChange(element));

    game.settings.registerMenu(NAMESPACE, this.GAMEPAD_CONFIG_BUTTON, {
      icon: "fa-solid fa-gamepad",
      name: "beaversGamepad.settings.gamepadConfig.name",
      label: "beaversGamepad.settings.gamepadConfig.label",
      hint: "beaversGamepad.settings.gamepadConfig.hint",
      type: GamepadConfigApp,
      restricted: false,
    });

    game.settings.registerMenu(NAMESPACE, this.UI_CONFIG_BUTTON, {
      icon: "fa-solid fa-users",
      name: "beaversGamepad.settings.uiConfig.name",
      label: "beaversGamepad.settings.uiConfig.label",
      hint: "beaversGamepad.settings.uiConfig.hint",
      type: UIConfigApp,
      restricted: false,
    });
  }

  /**
   * The settings of this module are stored as soon as they are changed, the settings window stays open.
   * E.g. after enabling the keyboard gamepad you go on to the gamepad configuration right away.
   * Pressing save afterwards does no harm.
   */
  private _saveOnChange(element: HTMLElement) {
    // the window keeps its element when it renders again, the listener must only be added once
    if (!element || element.dataset.beaversGamepadSave) return;
    element.dataset.beaversGamepadSave = "true";
    element.addEventListener("change", (event) => {
      const input = event.target as HTMLInputElement | HTMLSelectElement;
      const name = input?.name ?? "";
      if (!name.startsWith(NAMESPACE + ".") || !game.settings.settings.has(name)) return;
      const value = input instanceof HTMLInputElement && input.type === "checkbox" ? input.checked : input.value;
      this.set(name.substring(NAMESPACE.length + 1), value).catch(console.error);
    });
  }

  private _getGamepadConfigs(): GamepadConfigs {
    return foundry.utils.deepClone(this.get(this.GAMEPAD_CONFIG)) || {};
  }

  private _setGamepadConfigs(gamepadConfigs: GamepadConfigs): Promise<any> {
    return this.set(this.GAMEPAD_CONFIG, gamepadConfigs);
  }

  /**
   * the modules a gamepad starts with when it is seen for the first time.
   */
  private _getDefaultModules(): { [moduleId: string]: GamepadModuleConfig } {
    const result: { [moduleId: string]: GamepadModuleConfig } = {};
    const gamepadModules = gamepadApi().GamepadModuleManager.getGamepadModules();
    for (const moduleId of DEFAULT_MODULE_IDS) {
      if (gamepadModules[moduleId]) {
        result[moduleId] = cloneModuleConfig(gamepadModules[moduleId].defaultConfig);
      }
    }
    return result;
  }

  public async setUIData(updateData: UIData, options?: UIDataOption): Promise<any> {
    const data = this.getUIData();
    for (const [userId, userData] of Object.entries(updateData)) {
      data[userId] = { ...this.getUserData(userId), ...userData };
    }
    await this.set(USER_UI, data);
    if (options?.updateUI) {
      gamepadApi().TinyUIModuleManager.updateUIModules();
    }
  }

  public getUIData(): { [userId: string]: UserData } {
    return foundry.utils.deepClone(this.get(USER_UI)) || {};
  }

  public getUserData(userId: string): UserData {
    return (
      this.getUIData()[userId] || {
        userPosition: "bottom",
        top: 0,
        left: 0,
      }
    );
  }

  public setUserData(userId: string, updateData: any): Promise<any> {
    const userData = this.getUserData(userId);
    const data = this.getUIData();
    data[userId] = { ...userData, ...updateData };
    return this.set(USER_UI, data);
  }

  public async removeUserData(userId: string) {
    const data = this.getUIData();
    delete data[userId];
    await this.set(USER_UI, data);
    await gamepadApi().TinyUIModuleManager.removeInstance(userId);
  }

  public get(key: string): any {
    return game.settings.get(NAMESPACE, key);
  }

  public set(key: string, value: any): Promise<any> {
    return game.settings.set(NAMESPACE, key, value);
  }

  /**
   * this looks up the stored gamepadConfigSettings of all connected gamepads.
   * if a connected gamepad does not have any stored config information it gets one, see reconcileGamepadConfigs.
   */
  getGamepadConfigs(): GamepadConfigs {
    const configs = this._getReconciledConfigs();
    const result: GamepadConfigs = {};
    for (const gamepadIndex of Object.keys(this._getRegisteredGamepads())) {
      result[gamepadIndex] = configs[gamepadIndex];
    }
    return result;
  }

  private _getRegisteredGamepads(): RegisteredGamepads {
    return gamepadApi().GamepadManager?.getRegisteredGamepads() ?? {};
  }

  /**
   * all stored configs, including those of gamepads that are not connected right now.
   */
  private _getReconciledConfigs(): GamepadConfigs {
    const { configs, changed } = reconcileGamepadConfigs(
      this._getGamepadConfigs(),
      this._getRegisteredGamepads(),
      this._getDefaultModules(),
    );
    if (changed) {
      this._setGamepadConfigs(configs);
    }
    return configs;
  }

  getGamepadConfig(gamepadIndex: string): GamepadConfig {
    return this.getGamepadConfigs()[gamepadIndex];
  }

  getGamepadIndexForUser(userId: string): string | undefined {
    return Object.entries(this.getGamepadConfigs()).find(([, config]) => config.userId === userId)?.[0];
  }

  /**
   * this is called when updating the gamepadConfig store
   * @param data flat object, keys are paths into the gamepadConfigs e.g. "0.userId"
   */
  async updateGamepadConfigs(data: { [key: string]: any }): Promise<any> {
    const gamepadConfigs = this._getReconciledConfigs();
    for (const [attribute, value] of Object.entries(data)) {
      foundry.utils.setProperty(gamepadConfigs, attribute, value);
    }
    const result = await this._setGamepadConfigs(gamepadConfigs);
    gamepadApi().GamepadModuleManager.updateGamepadModuleInstance();
    return result;
  }

  /**
   * removes a gamepadmoduleInstance
   * @param gamepadIndex
   * @param moduleId
   */
  async deleteGamepadConfig(gamepadIndex: string, moduleId: string): Promise<any> {
    const gamepadConfigs = this._getReconciledConfigs();
    if (gamepadConfigs[gamepadIndex]?.modules[moduleId]) {
      delete gamepadConfigs[gamepadIndex].modules[moduleId];
    }
    const result = await this._setGamepadConfigs(gamepadConfigs);
    gamepadApi().GamepadModuleManager.deleteGamepadModuleInstance(gamepadIndex, moduleId);
    return result;
  }
}
