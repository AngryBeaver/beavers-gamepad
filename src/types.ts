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
    id: string
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
    GamepadConfigManager:GamepadConfigManagerI
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
interface GamepadConfigManagerI {
    getGamepadConfigs:()=>GamepadConfigs
    getGamepadModules:()=>{
        [key:string]:GamepadModuleConfig
    }
    updateGamepadModuleInstance:()=>void
    updateGamepadConfigs:(data:{[key:string]:any})=>Promise<any>
    deleteGamepadConfigModule:(gamepadIndex:string,moduleId:string)=>Promise<any>
}

interface GamepadModuleI {
    initialize:(actorId:string,config: GamepadModuleConfigBinding)=>void
    getConfig:()=> GamepadModuleConfig
    tick:(GamepadTickEventHandle)=>boolean
    destroy:()=>void
}

