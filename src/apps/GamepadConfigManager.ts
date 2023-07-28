import {NAMESPACE} from "../main.js";

export class GamepadConfigManager implements GamepadConfigManagerI{

    context:Context;
    registeredGamepadEventHandler:{
        [key:string]:string[]
    }={};

    registeredGamepadModules:{
        [key:string]:GamepadModuleConfig
    }={};


    constructor() {
        this.context = game[NAMESPACE];
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
            }
        }
        this.updateGamepadConfigs(result);
        return result;
    }

    registerGamepadModule(constructorPath:string) {
        const gamepadModule = this._getGamepadModule("",constructorPath);
        const key = constructorPath.replaceAll(".","-");
        this.registeredGamepadModules[key] = gamepadModule.getDefaultConfig();
    }

    getGamepadModules(){
        return {...this.registeredGamepadModules};
    }


    updateGamepadEventHandler(){
        const gamepadConfigs = this.getGamepadConfigs();
        this._unregisterGamepadEventHandler();
        for(const [gamepadIndex,gamepadConfig] of Object.entries(gamepadConfigs)){
            for(const moduleConfig of Object.values(gamepadConfig.modules)){
                const gamepadModule = this._getGamepadModule(gamepadConfig.actorId,moduleConfig.constructorPath);
                gamepadModule.setConfig(moduleConfig);
                const eventHandlerId = this.context.GamepadManager.registerEventHandler(gamepadIndex,gamepadModule.tick.bind(gamepadModule));
                if(!this.registeredGamepadEventHandler[gamepadIndex]){
                    this.registeredGamepadEventHandler[gamepadIndex] = [];
                }
                this.registeredGamepadEventHandler[gamepadIndex].push(eventHandlerId);
            }
        }
    }

    updateGamepadConfigs(data:{[key:string]:any}):Promise<any>{
        const gamepadConfigs = this.context.Settings.getGamepadConfigs();
        for(const [attribute,value] of Object.entries(data)){
            beaversSystemInterface.objectAttributeSet(gamepadConfigs,attribute,value);
        }
        return this.context.Settings.setGamepadConfigs(gamepadConfigs);
    }

    deleteGamepadConfigModule(gamepadIndex:string,moduleId:string):Promise<any>{
        const gamepadConfigs = this.context.Settings.getGamepadConfigs();
        if(gamepadConfigs[gamepadIndex]?.modules[moduleId]){
            delete gamepadConfigs[gamepadIndex].modules[moduleId]
        }
        return this.context.Settings.setGamepadConfigs(gamepadConfigs);
    }

    private _getGamepadModule(actorId:string, constructorPath:string):GamepadModuleI{
        const parts = constructorPath.split(".");
        let constructor = window;
        for(const part of parts){
            // @ts-ignore
            constructor = constructor[part]
        }
        // @ts-ignore
        return new constructor(actorId) as GamepadModuleI;
    }

    private _unregisterGamepadEventHandler(){
        for( const [index,value] of Object.entries(this.registeredGamepadEventHandler) ){
            value.forEach(id=>{
                this.context.GamepadManager.unregisterEventHandler(index,id);
            })
        }
        this.registeredGamepadEventHandler={};
    }
}