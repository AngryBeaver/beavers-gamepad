import {HOOK_GAMEPAD_CONNECTED, NAMESPACE} from "../main.js";

export class GamepadModuleManager implements GamepadModuleManagerInstance{

    context:Context;
    registeredGamepadModuleInstances:{
        [gamepadIndex:string]:{
            [moduleId:string]:GamepadModuleInstance
        }
    }={};

    registeredGamepadModules:{
        [moduleId:string]:GamepadModule
    }={};

    constructor() {
        this.context = game[NAMESPACE];
        Hooks.on(HOOK_GAMEPAD_CONNECTED, this.updateGamepadModuleInstance.bind(this));
    }

    getGamepadConfigs():GamepadConfigs{
        const gamepadConfig = this.context.Settings.getGamepadConfigs();
        const result: GamepadConfigs = {};
        const registeredGamepads = this.context.GamepadManager.getRegisteredGamepads();
        for(const [key,value] of Object.entries(registeredGamepads)){
            if(gamepadConfig[key] && value.id === gamepadConfig[key].gamepadId){
                result[key] = gamepadConfig[key];
            } else {
                result[key] = {
                    gamepadId:value.id,
                    actorId:"",
                    modules:{}
                }
                this.updateGamepadConfigs(result);
            }
        }
        return result;
    }

    registerGamepadModule(GamepadModule:GamepadModule) {
        const id = GamepadModule.defaultConfig.id;
        this.registeredGamepadModules[id] = GamepadModule;
    }

    getGamepadModules(){
        return {...this.registeredGamepadModules};
    }

    updateGamepadModuleInstance(){
        const gamepadConfigs = this.getGamepadConfigs();
        for(const [gamepadIndex,gamepadConfig] of Object.entries(gamepadConfigs)){
            for(const [moduleId,moduleConfig] of Object.entries(gamepadConfig.modules)){
                let gamepadModuleInstance = this._getRegisteredGamepadModuleInstance(gamepadIndex,moduleId);
                if(!gamepadModuleInstance){
                    gamepadModuleInstance = this._addGamepadModuleInstance(gamepadIndex, moduleId,gamepadConfig.actorId);
                }
                if(gamepadModuleInstance) {
                    gamepadModuleInstance.initialize(gamepadConfig.actorId, moduleConfig.binding);
                }
            }
        }
    }

    updateGamepadConfigs(data:{[key:string]:any}):Promise<any>{
        const gamepadConfigs = this.context.Settings.getGamepadConfigs();
        for(const [attribute,value] of Object.entries(data)){
            beaversSystemInterface.objectAttributeSet(gamepadConfigs,attribute,value);
        }
        return this.context.Settings.setGamepadConfigs(gamepadConfigs)
    }

    deleteGamepadConfigModule(gamepadIndex:string,moduleId:string):Promise<any>{
        const gamepadConfigs = this.context.Settings.getGamepadConfigs();
        let gamepadModule = this._getRegisteredGamepadModuleInstance(gamepadIndex,moduleId);
        if(gamepadModule){
            gamepadModule.destroy();
            delete this.registeredGamepadModuleInstances[gamepadIndex][moduleId];
        }
        if(gamepadConfigs[gamepadIndex]?.modules[moduleId]){
            delete gamepadConfigs[gamepadIndex].modules[moduleId]
        }
        return this.context.Settings.setGamepadConfigs(gamepadConfigs);
    }

    tick(gamepadTickEvent:GamepadTickEvent){
        const gamepadModules = this.registeredGamepadModuleInstances[gamepadTickEvent.gamepad.index];
        if(gamepadModules){
            for(const gamepadModuleInstance of Object.values(gamepadModules)){
                if(!gamepadModuleInstance.tick(gamepadTickEvent)){
                    return
                }
            }
        }
    }

    private _addGamepadModuleInstance(gamepadIndex:string, moduleId:string,actorId:string):GamepadModuleInstance{
        if(!this.registeredGamepadModules[moduleId]){
            console.warn("Module "+moduleId+" is not yet registered");
        }
        const gamepadModuleInstance = new this.registeredGamepadModules[moduleId](actorId);
        if(!this.registeredGamepadModuleInstances[gamepadIndex]){
            this.registeredGamepadModuleInstances[gamepadIndex] = {};
        }
        this.registeredGamepadModuleInstances[gamepadIndex][moduleId] = gamepadModuleInstance;
        return gamepadModuleInstance;
    }

    private _getRegisteredGamepadModuleInstance(gamepadIndex,moduleId): GamepadModuleInstance|undefined{
        if(this.registeredGamepadModuleInstances[gamepadIndex]){
            if(this.registeredGamepadModuleInstances[gamepadIndex][moduleId]) {
                return this.registeredGamepadModuleInstances[gamepadIndex][moduleId]
            }
        }
        return undefined;
    }

}