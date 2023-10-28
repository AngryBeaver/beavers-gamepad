import {BeaversGamepadManager} from "./apps/BeaversGamepadManager.js";
import {GamepadSettings} from "./GamepadSettings.js";
import {DND5e} from "./systems/DND5e.js";
import {GamepadModuleManager} from "./apps/GamepadModuleManager.js";
import {TinyUIModuleManager} from "./apps/TinyUIModuleManager.js";
import {TinyUserInterfaceGamepadModule} from "./modules/TinyUserInterfaceGamepadModule.js";
import {TinyUserInterfaceGamepadModuleActivate} from "./modules/TinyUserInterfaceGamepadModuleActivate.js";
import {CharacterSelectionUI} from "./apps/CharacterSelectionUI.js";
import {TokenRotation} from "./modules/TokenRotation.js";


export const NAMESPACE = "beavers-gamepad"
export const HOOK_READY = NAMESPACE+".ready";
export const HOOK_GAMEPAD_CONNECTED = NAMESPACE+".connected";
export const SOCKET_UPDATE_USER = "updateUser";

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
        game[NAMESPACE].GamepadModuleManager.registerGamepadModule(TinyUserInterfaceGamepadModule);
        game[NAMESPACE].GamepadModuleManager.registerGamepadModule(TinyUserInterfaceGamepadModuleActivate);
        game[NAMESPACE].GamepadModuleManager.registerGamepadModule(TokenRotation);
        if(!game[NAMESPACE].socket){
            ui.notifications.warn("Parts of beavers-gamepad won't work when module socketlib is not enabled")
        }

        game[NAMESPACE].socket.register(SOCKET_UPDATE_USER, (userId,data)=>{
            return game["users"].get(userId).update(data);
        });
    },1000);
});

Hooks.once("socketlib.ready", () => {
    game[NAMESPACE]=game[NAMESPACE]||{};
    game[NAMESPACE].socket = socketlib.registerModule(NAMESPACE);
});

Handlebars.registerHelper("beavers-objectLen", function(json) {
    return Object.keys(json).length;
});

