interface ExtendedGame {
  "beavers-gamepad": {
    GamepadManager: BeaversGamepadManagerI;
    GamepadModuleManager: GamepadModuleManagerI;
    TinyUIModuleManager: TinyUIModuleManagerI;
    Settings: GamepadSettingsI;
  };

  [key: string]: any;
}

interface GamepadConfigs {
  [gamepadIndex: string]: GamepadConfig;
}

interface GamepadConfig {
  userId: string;
  gamepadId: string;
  modules: {
    [key: string]: GamepadModuleConfig;
  };

  [key: string]: any;
}

interface RegisteredGamepads {
  [gamepadIndex: string]: {
    id: string;
    count: {
      buttons: number;
      axes: number;
    };
  };
}

interface GamepadModuleConfig {
  id: string;
  name: string;
  binding: GamepadModuleConfigBinding;
  //set this module as context module e.g. is usually not available except when the context is called.
  isContextModule?: boolean;
  //describes the module. can be an i18n language key
  desc?: string;

  [key: string]: any;
}

interface GamepadModuleConfigBinding {
  axes: {
    [name: string]: {
      index: string | number;
      reversed: boolean;
    };
  };
  buttons: {
    [name: string]: {
      index: string | number;
      label: string;
    };
  };
}

interface GamepadTickEvent {
  gamepad: Gamepad;
  hasAnyButtonTicked: boolean;
  hasAnyAxesTicked: boolean;
  isAnyButtonPressed: boolean;
  hasAnyAxesActivity: boolean;
  axes: {
    [key: string]: number;
  };
  buttons: {
    [key: string]: number;
  };
}

interface UIModule {
  name: string;
  //what the user reads in the tiny user interface, can be an i18n language key. default is the name.
  label?: string;
  process: (userId: string, userInput: UserInput) => Promise<void>;
}

interface UIDataOption {
  updateUI?: boolean;
}

interface UIData {
  [userId: string]: UserData;
}

interface UserData {
  userPosition: string;
  top: number;
  left: number;
  [key: string]: any;
}

interface TinyUISelectData {
  choices: {
    [id: string]: {
      text: string;
      img?: string;
    };
  };
  //id of the preselected choice
  selected?: string;
}

interface UserInput {
  //resolves with the id of the chosen choice, or null when the user aborted.
  select: (data: TinyUISelectData) => Promise<string | null>;
}

type StaticOf<T> = { new (...args: any[]): any } & T;
type AssertAssignable<T extends U, U> = true;

interface GamepadModule {
  new (): GamepadModuleInstance;
  defaultConfig: GamepadModuleConfig;
}

interface GamepadModuleInstance {
  updateGamepadConfig: (gamepadConfig: GamepadConfig) => void;
  getConfig: () => GamepadModuleConfig;
  tick: (tickEvent: GamepadTickEvent) => boolean;
  destroy: () => void;
}

interface BeaversGamepadManagerI {
  getRegisteredGamepads: () => RegisteredGamepads;
}

interface GamepadModuleManagerI {
  getGamepadModules: () => {
    [key: string]: GamepadModule;
  };
  tick: (gamepadTickEvent: GamepadTickEvent) => void;
  updateGamepadModuleInstance: () => void;
  deleteGamepadModuleInstance: (gamepadIndex: string, moduleId: string) => void;
  registerGamepadModule: (GamepadModule: GamepadModule) => void;
  enableContextModule: (gamepadIndex: string, focusModuleId: string) => void;
  disableContextModule: (gamepadIndex: string) => void;
  //a suspended gamepad does not trigger any module, used while its bindings are detected.
  suspend: (gamepadIndex: string) => void;
  resume: (gamepadIndex: string) => void;
}

interface TinyUIModuleManagerI {
  getInstance: (userId: string) => TinyUserInterfaceI | undefined;
  addInstance: (userId: string) => void;
  getUiModuleChoices: () => { [moduleId: string]: { text: string } };
  processUI: (userId: string, moduleId: string) => Promise<void>;
  updateUIModules: () => void;
  removeInstance: (userId: string) => Promise<void>;
  addModule: (moduleId: string, uiModule: UIModule) => void;
  removeModule: (moduleId: string) => void;
}

interface TinyUserInterfaceI extends UserInput {
  rotateWheel: (count: number) => void;
  ok: () => Promise<void>;
  abort: () => Promise<void>;
}

interface GamepadSettingsI {
  setUIData: (updateData: UIData, options?: UIDataOption) => Promise<any>;
  getUIData: () => { [userId: string]: UserData };
  getUserData: (userId: string) => UserData;
  setUserData: (userId: string, updateData: any) => Promise<any>;
  removeUserData: (userId: string) => Promise<any>;
  getGamepadConfigs: () => GamepadConfigs;
  getGamepadConfig: (gamepadIndex: string) => GamepadConfig;
  getGamepadIndexForUser: (userId: string) => string | undefined;
  updateGamepadConfigs: (data: { [key: string]: any }) => Promise<any>;
  deleteGamepadConfig: (gamepadIndex: string, moduleId: string) => Promise<any>;
  get: (key: string) => any;
}
