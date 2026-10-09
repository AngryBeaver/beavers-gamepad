# 3.1.x detect bindings
## 3.1.0
- feature: detect sticks and buttons by using them on the gamepad instead of typing in their numbers.
  - "detect" per stick or button, a wand per gamepad module that walks through all of its bindings.
  - a row lights up while its stick or button is in use, the name of a gamepad lights up while a button is held, gamepads can rumble to identify them.
- feature: a new gamepad starts with the gamepad modules of this module, the user of a gamepad gets a tiny-ui: assigning the user is all that is needed.
- feature: seat of the user can be set in the gamepad configuration.
- feature: a gamepad that shows up on another index keeps its configuration, a second gamepad of the same model starts with the bindings of the first.
- ⚠ no longer depends on beavers-system-interface and socketlib. Changing the character of a user now uses the user queries of foundry.
- ⚠ minimum foundry version is 13, verified for 14.
- fix v14: setProperty/mergeObject globals are gone (assigning a user to a gamepad failed), getMovementAdjustedPoint is deprecated.
- fix: gamepad and user configuration did not store changes of bindings and seat since the migration to ApplicationV2.
- fix: all gamepads shared the bindings of the gamepad that was configured last.
- fix: token rotation ignored "reversed".
- fix: open door ignored walls between token and door and used the controlled token instead of the token of the user.
- fix: tiny-ui was hidden by monks-common-display since the migration to ApplicationV2.
- fix: token halted after each step while the stick was held, steps are now chained to one continuous movement.
- fix: gamepads that got disconnected stayed in the gamepad configuration.
- tiny-ui: new look of the selection wheel, ui modules can have a readable label.
- removed setting "Actor Filter Type", it was not used anymore.
- build: esbuild, pnpm, vitest and github workflows as in the other beavers modules.

# 3.0.x migrate to V2Application
## 3.0.0
- add open-doors as gamepadmodule and tiny-ui context module.
- migrate to v2Application
- v14 compatibility

# 2.0.x Context Modules
## 2.1.2
- using latest typescript
- moving TokenMovement to this module.
- add tiny-ui display position configuration.
## 2.1.1 fix remove TinyUi
- bug: when deleting a user that has a tiny-ui the ui sticks around until reloaded. fixed.
## 2.1.0 Token Rotation Module
- feature: token rotation module
- fix default config for standard mapped gamepads
## 2.0.0 Tiny User Interface
- ⚠ breaking change: gamepads are no longer bound to actor they are bound to users see docu
- feature Concept for Context Modules (modules that disable gamepad and enable control of a context ui)
  - TinyUserInterface Context Module
- feature: Concept UI-Modules
  - UI-Module "beavers character selection"
- feature: Gamepad becomes npm module to import types
- feature client specific user settings
  -  in vtt a user is most often also a client. however in a local setup you connect to one client belonging to a central user.

# 1.0.x Initial release
## 1.0.3
- move beavers-token-movement to beaversSystemInterface module (in order to share movement with beavers-mobile module)
- improve movement-tick (increase initial tick delay to prevent initial double movement)
- fix ignoring return value of tickEvents.
## 1.0.2
- fix for bugs when canvas has tokens without actor
- feature allow dnd5e polymorph to switch actor to the new polymorphed actor
- fix mixed token movement ( when mixing movement via mouse or gamepad the gamepad looses track on where to move next)
- code refactoring 
## 1.0.1
- improve ui,
- prevent startup double movement,
- fix diagonal movement
## 1.0.0
initial release