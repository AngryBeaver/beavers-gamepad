import {BeaversGamepadManager} from "./apps/BeaversGamepadManager.js";
import {GamepadConfigManager} from "./apps/GamepadConfigManager.js";
import {Settings} from "./Settings.js";
import {TokenMovement} from "./apps/TokenMovement.js"
import {DND5e} from "./systems/DND5e.js";


export const NAMESPACE = "beavers-gamepad"
export const HOOK_READY = NAMESPACE+".ready";
export const HOOK_GAMEPAD_CONNECTED = NAMESPACE+".connected";
export const HOOK_GAMEPAD_TICKED = NAMESPACE+".ticked";

Hooks.on("ready", async function(){
    if(!game[NAMESPACE]){
        game[NAMESPACE]={};
    }
    game[NAMESPACE].GamepadManager = new BeaversGamepadManager();
    game[NAMESPACE].GamepadConfigManager = new GamepadConfigManager();
    game[NAMESPACE].TokenMovement = TokenMovement;
    game[NAMESPACE].Settings = new Settings();

    window.setTimeout(()=>
        Hooks.call(HOOK_READY, game[NAMESPACE].GamepadConfigManager)
    ,200);

    if(game['system'].id === 'dnd5e'){
        new DND5e();
    }
})

Hooks.on(HOOK_READY, async function(manager){
    manager.registerGamepadModule("game.beavers-gamepad.TokenMovement");
})