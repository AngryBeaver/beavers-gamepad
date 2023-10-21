import {NAMESPACE} from "../main.js";
import {TinyUIModuleManager} from "./TinyUIModuleManager";

function staticImplements<T>() {
    return <U extends T>(constructor: U) => {constructor};
}

// @ts-ignore
@staticImplements<GamepadModule>()
export class TinyUserInterfaceGamepadModuleActivate {

    private _data:{
        config:  GamepadModuleConfig,
        userId: string,
    }={
        config: TinyUserInterfaceGamepadModuleActivate.defaultConfig,
        userId: "",
    }

    public static defaultConfig: GamepadModuleConfig={
        binding: {
            axes: {
            },
            buttons:{
                "activate":{
                    index: "2"
                },
            }
        },
        name: "Activate TinyUserInterface",
        id:"beavers-tinyUI-activate",
        // @ts-ignore
        desc: "beaversGamepad.TUIGamepadModule.desc2"
    }

    public updateGamepadConfig(gamepadConfig: GamepadConfig){
        this._data.config = TinyUserInterfaceGamepadModuleActivate.defaultConfig;
        this._data.config.binding = gamepadConfig.modules[this._data.config.id].binding;
        this._data.userId = gamepadConfig.userId;
    }
    public getConfig():GamepadModuleConfig{
        return this._data.config;
    }

    public tick(event: GamepadTickEvent):boolean{
        if(!event.hasAnyButtonTicked){
            return true;
        }
        const index = this._data.config.binding.buttons["activate"].index;
        if(event.buttons[index]){
            const choices = game[NAMESPACE].TinyUIModuleManager.getUiModuleChoices();
            game[NAMESPACE].TinyUIModuleManager.getInstance(this._data.userId).select({choices:choices})
                .then(moduleId=>{
                    if(moduleId !== null && moduleId !== "") {
                        game[NAMESPACE].TinyUIModuleManager.processUI(this._data.userId, moduleId)
                    }
                })
        }
        return true;
    }

    public destroy(){

    }
}