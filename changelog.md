# 2.0.x Context Modules
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