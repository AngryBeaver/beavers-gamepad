interface GamepadConfigs {
    [gamepadIndex:string]:GamepadConfig
}

interface GamepadConfig {
    gamepadId:string,
    actorId:string,
    modules:{
        [key:string]: GamepadModuleConfig
    }
}

interface GamepadModuleConfig {
    name: string
    constructorPath: string
    binding:GamepadModuleConfigBinding
}

interface GamepadModuleConfigBinding {
    axes:{
        [name:string]:{
            index:string
            reversed: boolean
        }
    }
    buttons:{
        [name:string]:{
            index:string
        }
    }
}

interface RegisteredGamepads {
    [gamepadIndex: string]: {
        id: string
        count:{
            buttons: number,
            axes: number
        }
    }
}

interface GamepadTickEvent {
    gamepad:Gamepad,
    hasAnyButtonTicked:boolean,
    hasAnyAxesTicked:boolean,
    axes: {
        [key: string]: number
    }
    buttons: {
        [key: string]: number
    }
}

interface Context {
    Settings: SettingsI,
    GamepadManager: BeaversGamepadManagerI
    GamepadConfigManager:GamepadConfigManagerI
    GamepadConfigApp?: GamepadConfigAppI
}

interface GamepadConfigAppI{
    updateController:()=>void,
}

interface SettingsI {
    getGamepadConfigs:()=>GamepadConfigs,
    setGamepadConfigs:(gamepadConfigs: GamepadConfigs)=>Promise<any>
}
interface BeaversGamepadManagerI {
    getRegisteredGamepads:()=>RegisteredGamepads
    registerEventHandler: (gamepadIndex:string,event: GamepadTickEventHandle)=>string
    unregisterEventHandler: (gamepadIndex:string, handlerId:string)=>void
}
interface GamepadConfigManagerI {
    getGamepadConfigs:()=>GamepadConfigs
    getGamepadModules:()=>{
        [key:string]:GamepadModuleConfig
    }
    updateGamepadEventHandler:()=>void
    updateGamepadConfigs:(data:{[key:string]:any})=>Promise<any>
    deleteGamepadConfigModule:(gamepadIndex:string,moduleId:string)=>Promise<any>
}

type GamepadTickEventHandle = (tickEvent: GamepadTickEvent) => boolean;


interface GamepadModuleI {
    setConfig:(handlerConfig: GamepadModuleConfig)=>void
    getDefaultConfig:()=> GamepadModuleConfig
    tick:(GamepadTickEventHandle)=>boolean
}

