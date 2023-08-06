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
    isAnyButtonPressed:boolean,
    hasAnyAxesActivity:boolean,
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
    GamepadModuleManager:GamepadModuleManagerInstance
    GamepadConfigApp?: GamepadConfigAppI
}

interface GamepadConfigAppI{
}

interface SettingsI {
    getGamepadConfigs:()=>GamepadConfigs,
    setGamepadConfigs:(gamepadConfigs: GamepadConfigs)=>Promise<any>
}
interface BeaversGamepadManagerI {
    getRegisteredGamepads:()=>RegisteredGamepads
}
interface GamepadModuleManagerInstance {
    getGamepadConfigs:()=>GamepadConfigs
    getGamepadModules:()=>{
        [key:string]:GamepadModule
    }
    tick:(gamepadTickEvent:GamepadTickEvent)=>void
    updateGamepadModuleInstance:()=>void
    updateGamepadConfigs:(data:{[key:string]:any})=>Promise<any>
    deleteGamepadConfigModule:(gamepadIndex:string,moduleId:string)=>Promise<any>
}


