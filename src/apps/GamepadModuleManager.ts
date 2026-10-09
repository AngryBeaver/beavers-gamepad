import { HOOK_GAMEPAD_CONNECTED, gamepadApi } from "../definitions";

/**
 * gamepadmodule manager
 */
export class GamepadModuleManager implements GamepadModuleManagerI {
  registeredGamepadModuleInstances: {
    [gamepadIndex: string]: {
      [moduleId: string]: GamepadModuleInstance;
    };
  } = {};
  registeredGamepadModules: {
    [moduleId: string]: GamepadModule;
  } = {};
  enabledContextModules: {
    [gamepadIndex: string]: string;
  } = {};
  suspendedGamepads = new Set<string>();

  constructor() {
    Hooks.on(HOOK_GAMEPAD_CONNECTED, () => this.updateGamepadModuleInstance());
    Hooks.on("updateUser", (user: any) => {
      if (gamepadApi().Settings.getGamepadIndexForUser(user.id)) {
        this.updateGamepadModuleInstance();
      }
    });
  }

  /**
   * this should be called within the gamepadmodule ready hook and can register gamepadModules
   * @param GamepadModule
   */
  registerGamepadModule(GamepadModule: GamepadModule) {
    const id = GamepadModule.defaultConfig.id;
    this.registeredGamepadModules[id] = GamepadModule;
  }

  getGamepadModules() {
    return { ...this.registeredGamepadModules };
  }

  enableContextModule(gamepadIndex: string, focusModuleId: string) {
    this.enabledContextModules[gamepadIndex] = focusModuleId;
  }

  disableContextModule(gamepadIndex: string) {
    delete this.enabledContextModules[gamepadIndex];
  }

  suspend(gamepadIndex: string) {
    this.suspendedGamepads.add(String(gamepadIndex));
  }

  resume(gamepadIndex: string) {
    this.suspendedGamepads.delete(String(gamepadIndex));
  }

  /**
   * this injects and updates the module configuration into "the" gamepadmoduleinstance.
   * if gamepadmodule is non existant on the gamepad it creates an instance.
   * instances of modules that are no longer configured for the gamepad get destroyed.
   */
  updateGamepadModuleInstance() {
    const gamepadConfigs = gamepadApi().Settings.getGamepadConfigs();
    for (const [gamepadIndex, gamepadConfig] of Object.entries(gamepadConfigs)) {
      for (const moduleId of Object.keys(this.registeredGamepadModuleInstances[gamepadIndex] ?? {})) {
        if (!gamepadConfig.modules[moduleId]) {
          this.deleteGamepadModuleInstance(gamepadIndex, moduleId);
        }
      }
      for (const moduleId of Object.keys(gamepadConfig.modules)) {
        const gamepadModuleInstance =
          this._getRegisteredGamepadModuleInstance(gamepadIndex, moduleId) ??
          this._addGamepadModuleInstance(gamepadIndex, moduleId);
        gamepadModuleInstance?.updateGamepadConfig(gamepadConfig);
      }
    }
  }

  /**
   * removes a gamepadmoduleInstance
   * @param gamepadIndex
   * @param moduleId
   */
  deleteGamepadModuleInstance(gamepadIndex: string, moduleId: string) {
    const gamepadModule = this._getRegisteredGamepadModuleInstance(gamepadIndex, moduleId);
    if (gamepadModule) {
      gamepadModule.destroy();
      delete this.registeredGamepadModuleInstances[gamepadIndex][moduleId];
    }
    if (this.enabledContextModules[gamepadIndex] === moduleId) {
      this.disableContextModule(gamepadIndex);
    }
  }

  /**
   * this is executed via BeaversGamepadManager for each gamepad
   * It passes the tick event down to each registered moduleInstance of that gamepad.
   * @param gamepadTickEvent
   */
  tick(gamepadTickEvent: GamepadTickEvent) {
    const gamepadIndex = String(gamepadTickEvent.gamepad.index);
    if (this.suspendedGamepads.has(gamepadIndex)) {
      return;
    }
    const gamepadModules = this.registeredGamepadModuleInstances[gamepadIndex];
    if (gamepadModules) {
      if (this.enabledContextModules[gamepadIndex]) {
        gamepadModules[this.enabledContextModules[gamepadIndex]]?.tick(gamepadTickEvent);
      } else {
        for (const gamepadModuleInstance of Object.values(gamepadModules)) {
          if (!gamepadModuleInstance.getConfig().isContextModule && !gamepadModuleInstance.tick(gamepadTickEvent)) {
            return;
          }
        }
      }
    }
  }

  private _addGamepadModuleInstance(gamepadIndex: string, moduleId: string): GamepadModuleInstance | undefined {
    if (!this.registeredGamepadModules[moduleId]) {
      // the vtt-module that brought this gamepadmodule might be disabled.
      return undefined;
    }
    const gamepadModuleInstance = new this.registeredGamepadModules[moduleId]();
    if (!this.registeredGamepadModuleInstances[gamepadIndex]) {
      this.registeredGamepadModuleInstances[gamepadIndex] = {};
    }
    this.registeredGamepadModuleInstances[gamepadIndex][moduleId] = gamepadModuleInstance;
    return gamepadModuleInstance;
  }

  private _getRegisteredGamepadModuleInstance(
    gamepadIndex: string,
    moduleId: string,
  ): GamepadModuleInstance | undefined {
    return this.registeredGamepadModuleInstances[gamepadIndex]?.[moduleId];
  }
}
