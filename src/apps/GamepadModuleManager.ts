import {HOOK_GAMEPAD_CONNECTED, NAMESPACE} from "../main.js";

/**
 * gamepadmodule manager
 */
export class GamepadModuleManager implements GamepadModuleManagerI {

    registeredGamepadModuleInstances: {
        [gamepadIndex: string]: {
            [moduleId: string]: GamepadModuleInstance
        }
    } = {};
    registeredGamepadModules: {
        [moduleId: string]: GamepadModule
    } = {};
    enabledContextModules: {
        [gamepadIndex: string]: string
    } = {}

    constructor() {
        Hooks.on(HOOK_GAMEPAD_CONNECTED, this.updateGamepadModuleInstance.bind(this));
        Hooks.on("updateUser", async function(user){
            const gamepadIndex = (game as Game)[NAMESPACE].Settings.getGamepadIndexForUser(user.id)
            if(gamepadIndex){
                this.updateGamepadModuleInstance()
            }

        }.bind(this));
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
        return {...this.registeredGamepadModules};
    }

    enableContextModule(gamepadIndex: string, focusModuleId: string) {
        this.enabledContextModules[gamepadIndex] = focusModuleId;
    }

    disableContextModule(gamepadIndex: string) {
        delete this.enabledContextModules[gamepadIndex];
    }

    /**
     * this injects and updates the module configuration into "the" gamepadmoduleinstance.
     * if gamepadmodule is non existant on the gamepad it creates an instance.
     */
    updateGamepadModuleInstance() {
        const gamepadConfigs = (game as Game)[NAMESPACE].Settings.getGamepadConfigs();
        for (const [gamepadIndex, gamepadConfig] of Object.entries(gamepadConfigs)) {
            for (const [moduleId, moduleConfig] of Object.entries(gamepadConfig.modules)) {
                let gamepadModuleInstance = this._getRegisteredGamepadModuleInstance(gamepadIndex, moduleId);
                if (!gamepadModuleInstance) {
                    gamepadModuleInstance = this._addGamepadModuleInstance(gamepadIndex, moduleId);
                }
                if (gamepadModuleInstance) {
                    // @ts-ignore
                    gamepadModuleInstance.updateGamepadConfig(gamepadConfig);
                }
            }
        }
    }

    /**
     * removes a gamepadmoduleInstancecs
     * @param gamepadIndex
     * @param moduleId
     */
    deleteGamepadModuleInstance(gamepadIndex: string, moduleId: string) {
        let gamepadModule = this._getRegisteredGamepadModuleInstance(gamepadIndex, moduleId);
        if (gamepadModule) {
            gamepadModule.destroy();
            delete this.registeredGamepadModuleInstances[gamepadIndex][moduleId];
        }
    }

    /**
     * this is executed via BeaversGamepadManager for each gamepad
     * It passes the tick event down to each registered moduleInstance of that gamepad.
     * @param gamepadTickEvent
     */
    tick(gamepadTickEvent: GamepadTickEvent) {
        const gamepadIndex = gamepadTickEvent.gamepad.index;
        const gamepadModules = this.registeredGamepadModuleInstances[gamepadIndex];
        if (gamepadModules) {
            if (this.enabledContextModules[gamepadIndex]) {
                for (const [moduleId, gamepadModuleInstance] of Object.entries(gamepadModules)) {
                    if (this.enabledContextModules[gamepadIndex] === moduleId) {
                        gamepadModuleInstance.tick(gamepadTickEvent);
                        return;
                    }
                }
            } else {
                for (const [moduleId, gamepadModuleInstance] of Object.entries(gamepadModules)) {
                    // @ts-ignore
                    if (!gamepadModuleInstance.getConfig().isContextModule && !gamepadModuleInstance.tick(gamepadTickEvent)) {
                        return
                    }
                }
            }
        }
    }

    private _addGamepadModuleInstance(gamepadIndex: string, moduleId: string): GamepadModuleInstance {
        if (!this.registeredGamepadModules[moduleId]) {
            console.warn("Module " + moduleId + " is not yet registered");
        }
        // @ts-ignore
        const gamepadModuleInstance = new this.registeredGamepadModules[moduleId]();
        if (!this.registeredGamepadModuleInstances[gamepadIndex]) {
            this.registeredGamepadModuleInstances[gamepadIndex] = {};
        }
        this.registeredGamepadModuleInstances[gamepadIndex][moduleId] = gamepadModuleInstance;
        return gamepadModuleInstance;
    }

    private _getRegisteredGamepadModuleInstance(gamepadIndex, moduleId): GamepadModuleInstance | undefined {
        if (this.registeredGamepadModuleInstances[gamepadIndex]) {
            if (this.registeredGamepadModuleInstances[gamepadIndex][moduleId]) {
                return this.registeredGamepadModuleInstances[gamepadIndex][moduleId]
            }
        }
        return undefined;
    }

}