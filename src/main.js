import {BeaversGamepadManager} from "./apps/BeaversGamepadManager.js";
import {GamepadSettings} from "./GamepadSettings.js";
import {DND5e} from "./systems/DND5e.js";
import {GamepadModuleManager} from "./apps/GamepadModuleManager.js";
import {TinyUIModuleManager} from "./apps/TinyUIModuleManager.js";
import {TinyUserInterfaceGamepadModule} from "./apps/TinyUserInterfaceGamepadModule.js";


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
        game[NAMESPACE].TinyUIModuleManager = new TinyUIModuleManager();
        game[NAMESPACE].Settings = new GamepadSettings();

        if(game['system'].id === 'dnd5e'){
            new DND5e();
        }
        Hooks.call(HOOK_READY, game[NAMESPACE].GamepadModuleManager);
        game[NAMESPACE].GamepadModuleManager.updateGamepadModuleInstance();
        game[NAMESPACE].TinyUIModuleManager.updateUIModules();
        game[NAMESPACE].GamepadModuleManager.registerGamepadModule(TinyUserInterfaceGamepadModule);

    },1000);
});

Handlebars.registerHelper("beavers-objectLen", function(json) {
    return Object.keys(json).length;
});

