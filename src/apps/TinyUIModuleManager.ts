import {TinyUserInterface} from "./TinyUserInterface.js";
import {NAMESPACE} from "../main.js";
import {Context} from "../GamepadSettings.js";

export class TinyUIModuleManager {

    private _data:{
        context: Context
        instances:{
            [userId:string]:TinyUserInterface
        },
        uiModules:{
            [moduleId:string]:UIModule
        }
    } = {
        context: game[NAMESPACE],
        instances:{},
        uiModules:{},
    }

    /**
     * this injects and updates uiModules into "the" TinyUserInterface.
     * if uiModuleInstance is nonexistent on the gamepad it creates an instance.
     */
    updateUIModules(){
        const uiData = this._data.context.Settings.getUIData();
        for(const [userId,userData] of Object.entries(uiData)){
            if(userData.enableUI){
                if(this._data.instances[userId]){
                    this._data.instances[userId].render(true);
                }else{
                    this.addInstance(userId);
                }
            }else{
                this.removeInstance(userId);
            }
        }
    }

    addInstance(userId:string){
        this._data.instances[userId] = new TinyUserInterface(userId)
        this._data.instances[userId].render(true);
    }
    async removeInstance(userId:string){
        if(this._data.instances[userId]) {
            await this._data.instances[userId].close();
            delete this._data.instances[userId];
        }
    }

    addModule(moduleId:string,uiModule:UIModule){
        this._data.uiModules[moduleId] = uiModule;
    }
    removeModule(moduleId:string){
        delete this._data.uiModules[moduleId];
    }


}