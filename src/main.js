import {BeaversGamepadManager} from "./apps/BeaversGamepadManager.js";
import {Settings} from "./Settings.js";
import {DND5e} from "./systems/DND5e.js";
import {GamepadModuleManager} from "./apps/GamepadModuleManager.js";


export const NAMESPACE = "beavers-gamepad"
export const HOOK_READY = NAMESPACE+".ready";
export const HOOK_GAMEPAD_CONNECTED = NAMESPACE+".connected";

Hooks.on("ready", async function(){
    setTimeout(()=>{
        if(!game[NAMESPACE]){
            game[NAMESPACE]={};
        }
        game[NAMESPACE].GamepadManager = new BeaversGamepadManager();
        game[NAMESPACE].GamepadModuleManager = new GamepadModuleManager();
        game[NAMESPACE].Settings = new Settings();
        if(game['system'].id === 'dnd5e'){
            new DND5e();
        }
        Hooks.call(HOOK_READY, game[NAMESPACE].GamepadModuleManager);
        game[NAMESPACE].GamepadModuleManager.updateGamepadModuleInstance();

    },1000);
})