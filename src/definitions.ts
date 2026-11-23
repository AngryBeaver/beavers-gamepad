export const NAMESPACE = "beavers-gamepad" as const;
export const QUERY_UPDATE_USER = NAMESPACE + ".updateUser";
export const QUERY_CLAIM_GAMEPAD = NAMESPACE + ".claimGamepad";
export const HOOK_READY = NAMESPACE + ".ready";
export const HOOK_GAMEPAD_CONNECTED = NAMESPACE + ".connected";
// called with the index of a gamepad that got connected, after its configuration is in place
export const HOOK_GAMEPAD_REGISTERED = NAMESPACE + ".registered";
export const ASK_USER_ON_RECONNECT = "ask_user_on_reconnect";
export const USER_UI: string = "user_ui";
export const MOVEMENT_SNAP = "movement_snap";

// A gamepad that is seen for the first time starts with these modules, so it works without further setup.
export const DEFAULT_MODULE_IDS = [
  "beavers-token-movement",
  "beavers-token-rotation",
  "beavers-tinyUI-activate",
  "beavers-tinyUI-control",
  "beavers-open-door-module",
];

export const gamepadApi = (): ExtendedGame["beavers-gamepad"] => game[NAMESPACE];
