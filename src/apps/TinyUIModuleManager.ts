import {TinyUserInterface} from "./TinyUserInterface.js";
import {NAMESPACE} from "../main.js";

export class TinyUIModuleManager implements TinyUIModuleManagerI{

    private _data:{
        instances:{
            [userId:string]:TinyUserInterface
        },
        uiModules:{
            [moduleId:string]:UIModule
        }
    } = {
        instances:{},
        uiModules:{},
    }

    getInstance(userId: string):TinyUserInterface{
        return this._data.instances[userId];
    }
    getUiModuleChoices(){
        const choices = {};
        Object.entries(this._data.uiModules).forEach(([moduleId,uiModule])=>{
            choices[moduleId] = {text:uiModule.name}
        });
        return choices;
    }
    processUI(userId:string,moduleId:string){
        return this._data.uiModules[moduleId].process(userId,this._data.instances[userId]);
    }

    /**
     * this injects and updates uiModules into "the" TinyUserInterface.
     * if uiModuleInstance is nonexistent on the gamepad it creates an instance.
     */
    updateUIModules(){
        const uiData = (game as Game)[NAMESPACE].Settings.getUIData();
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