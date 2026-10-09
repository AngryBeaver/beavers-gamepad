import { BeaversGamepadManager } from "./apps/BeaversGamepadManager";
import { HOOK_READY, NAMESPACE, QUERY_UPDATE_USER } from "./definitions";
import { GamepadSettings } from "./GamepadSettings";
import { DND5e } from "./systems/DND5e";
import { GamepadModuleManager } from "./apps/GamepadModuleManager";
import { TinyUIModuleManager } from "./apps/TinyUIModuleManager";
import { TinyUserInterfaceGamepadModule } from "./modules/TinyUserInterfaceGamepadModule";
import { TinyUserInterfaceGamepadModuleActivate } from "./modules/TinyUserInterfaceGamepadModuleActivate";
import { CharacterSelectionUI, handleUpdateUserQuery } from "./apps/CharacterSelectionUI";
import { OpenDoorUI } from "./apps/OpenDoorUI";
import { OpenDoorGamepadModule } from "./modules/OpenDoorGamepadModule";
import { TokenRotation } from "./modules/TokenRotation";
import { TokenMovement } from "./modules/TokenMovement";

Hooks.once("init", () => {
  game[NAMESPACE] = game[NAMESPACE] || {};
  game[NAMESPACE].GamepadModuleManager = new GamepadModuleManager();
  game[NAMESPACE].TinyUIModuleManager = new TinyUIModuleManager();
  game[NAMESPACE].Settings = new GamepadSettings();
  CONFIG.queries[QUERY_UPDATE_USER] = handleUpdateUserQuery;
});

Hooks.once("ready", () => {
  if (game.system.id === "dnd5e") {
    new DND5e();
  }
  for (const uiModule of [new CharacterSelectionUI(), new OpenDoorUI()]) {
    game[NAMESPACE].TinyUIModuleManager.addModule(uiModule.name, uiModule);
  }
  // other vtt-modules register their gamepadmodules and uimodules in this hook
  Hooks.callAll(HOOK_READY, game[NAMESPACE].GamepadModuleManager);
  game[NAMESPACE].GamepadManager = new BeaversGamepadManager();
  game[NAMESPACE].GamepadModuleManager.updateGamepadModuleInstance();
  game[NAMESPACE].TinyUIModuleManager.updateUIModules();
});

Hooks.on(HOOK_READY, (manager: GamepadModuleManagerI) => {
  manager.registerGamepadModule(TokenMovement);
  manager.registerGamepadModule(TinyUserInterfaceGamepadModule);
  manager.registerGamepadModule(TinyUserInterfaceGamepadModuleActivate);
  manager.registerGamepadModule(TokenRotation);
  manager.registerGamepadModule(OpenDoorGamepadModule);
});
