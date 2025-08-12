import {BeaversGamepadManager} from "./apps/BeaversGamepadManager.js";
import {GamepadSettings, HOOK_READY, NAMESPACE, SOCKET_UPDATE_USER} from "./GamepadSettings.js";
import {DND5e} from "./systems/DND5e.js";
import {GamepadModuleManager} from "./apps/GamepadModuleManager.js";
import {TinyUIModuleManager} from "./apps/TinyUIModuleManager.js";
import {TinyUserInterfaceGamepadModule} from "./modules/TinyUserInterfaceGamepadModule.js";
import {TinyUserInterfaceGamepadModuleActivate} from "./modules/TinyUserInterfaceGamepadModuleActivate.js";
import {CharacterSelectionUI} from "./apps/CharacterSelectionUI.js";
import {TokenRotation} from "./modules/TokenRotation.js";
import {TokenMovement} from "./modules/TokenMovement.js";

Hooks.on("ready", async function(){
    setTimeout(()=>{
        game[NAMESPACE]=game[NAMESPACE]||{};
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
        const csUI = new CharacterSelectionUI();
        game[NAMESPACE].TinyUIModuleManager.addModule(csUI.name,csUI);

        if(!game[NAMESPACE].socket){
            ui.notifications.warn("Parts of beavers-gamepad won't work when module socketlib is not enabled")
        }

        game[NAMESPACE].socket.register(SOCKET_UPDATE_USER, (userId,data)=>{
            return game["users"].get(userId).update(data);
        });
    },1000);
});

Hooks.on(HOOK_READY, async function(manager){
    manager.registerGamepadModule(TokenMovement);
    manager.registerGamepadModule(TinyUserInterfaceGamepadModule);
    manager.registerGamepadModule(TinyUserInterfaceGamepadModuleActivate);
    manager.registerGamepadModule(TokenRotation);
})

Hooks.once("socketlib.ready", () => {
    game[NAMESPACE]=game[NAMESPACE]||{};
    game[NAMESPACE].socket = socketlib.registerModule(NAMESPACE);
});

Handlebars.registerHelper("beavers-objectLen", function(json) {
    return Object.keys(json).length;
});

