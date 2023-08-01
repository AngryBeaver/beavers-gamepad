import {HOOK_GAMEPAD_CONNECTED, HOOK_GAMEPAD_TICKED, HOOK_READY, NAMESPACE} from "../main.js";

export class GamepadConfigManager implements GamepadConfigManagerI{

    context:Context;
    registeredGamepadModuleInstance:{
        [gamepadIndex:string]:{
            [moduleId:string]:GamepadModuleI
        }
    }={};

    registeredGamepadModuleConfigs:{
        [moduleId:string]:GamepadModuleConfig
    }={};


    constructor() {
        this.context = game[NAMESPACE];
        Hooks.on(HOOK_GAMEPAD_CONNECTED, this.updateGamepadModuleInstance.bind(this));
        Hooks.on(HOOK_GAMEPAD_TICKED,this._gamepadTicked.bind(this));

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

    registerGamepadModule(constructorPath:string) {
        const gamepadModule = this._getGamepadModule(constructorPath);
        const config = gamepadModule.getConfig();
        this.registeredGamepadModuleConfigs[config.id] = gamepadModule.getConfig();
    }

    getGamepadModules(){
        return {...this.registeredGamepadModuleConfigs};
    }

    updateGamepadModuleInstance(){
        const gamepadConfigs = this.getGamepadConfigs();
        for(const [gamepadIndex,gamepadConfig] of Object.entries(gamepadConfigs)){
            for(const [moduleId,moduleConfig] of Object.entries(gamepadConfig.modules)){
                let gamepadModule = this._getRegisteredGamepadModuleInstance(gamepadIndex,moduleId);
                if(!gamepadModule){
                    gamepadModule = this._getGamepadModule(moduleConfig.constructorPath);
                    if(!this.registeredGamepadModuleInstance[gamepadIndex]){
                        this.registeredGamepadModuleInstance[gamepadIndex] = {};
                    }
                    this.registeredGamepadModuleInstance[gamepadIndex][moduleId] = gamepadModule;
                }
                gamepadModule.initialize(gamepadConfig.actorId,moduleConfig.binding);
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
            delete this.registeredGamepadModuleInstance[gamepadIndex][moduleId];
        }
        if(gamepadConfigs[gamepadIndex]?.modules[moduleId]){
            delete gamepadConfigs[gamepadIndex].modules[moduleId]
        }
        return this.context.Settings.setGamepadConfigs(gamepadConfigs);
    }

    private _gamepadTicked(gamepadTickEvent:GamepadTickEvent){
        const gamepadIndex = gamepadTickEvent.gamepad.index;
        if(this.registeredGamepadModuleInstance[gamepadIndex]){
            for(const gamepadModule of Object.values(this.registeredGamepadModuleInstance[gamepadIndex])){
                gamepadModule.tick(gamepadTickEvent);
            }
        }
    }

    private _getRegisteredGamepadModuleInstance(gamepadIndex,moduleId): GamepadModuleI|undefined{
        if(this.registeredGamepadModuleInstance[gamepadIndex]){
            if(this.registeredGamepadModuleInstance[gamepadIndex][moduleId]) {
                return this.registeredGamepadModuleInstance[gamepadIndex][moduleId] as GamepadModuleI
            }
        }
        return undefined;
    }

    private _getGamepadModule(constructorPath:string):GamepadModuleI{
        const parts = constructorPath.split(".");
        let constructor = window;
        for(const part of parts){
            // @ts-ignore
            constructor = constructor[part]
        }
        // @ts-ignore
        return new constructor() as GamepadModuleI;
    }

}