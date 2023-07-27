import {BeaversGamepadManager} from "./apps/BeaversGamepadManager.js";
import {GamepadConfigManager} from "./apps/GamepadConfigManager.js";
import {Settings} from "./Settings.js";
import {TokenMovement} from "./apps/TokenMovement.js"


export const NAMESPACE = "beavers-gamepad"

Hooks.on("ready", async function(){
    if(!game[NAMESPACE]){
        game[NAMESPACE]={};
    }
    game[NAMESPACE].GamepadManager = new BeaversGamepadManager();
    game[NAMESPACE].GamepadConfigManager = new GamepadConfigManager();
    game[NAMESPACE].TokenMovement = TokenMovement;
    game[NAMESPACE].Settings = new Settings();

    window.setTimeout(()=>
        Hooks.call("beavers-gamepad.ready", game[NAMESPACE].GamepadConfigManager)
    ,200);
})

Hooks.on("beavers-gamepad.ready", async function(manager){
    manager.registerGamepadModule("game.beavers-gamepad.TokenMovement");
})
