export const NAMESPACE = "beavers-gamepad" as const;
export const QUERY_UPDATE_USER = NAMESPACE + ".updateUser";
export const HOOK_READY = NAMESPACE + ".ready";
export const HOOK_GAMEPAD_CONNECTED = NAMESPACE + ".connected";
export const USER_UI: string = "user_ui";

// A gamepad that is seen for the first time starts with these modules, so it works without further setup.
export const DEFAULT_MODULE_IDS = [
  "beavers-token-movement",
  "beavers-token-rotation",
  "beavers-tinyUI-activate",
  "beavers-tinyUI-control",
  "beavers-open-door-module",
];

export const gamepadApi = (): ExtendedGame["beavers-gamepad"] => game[NAMESPACE];
