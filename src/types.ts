

interface GamepadConfigs {
    [gamepadIndex:string]:GamepadConfig
}

interface GamepadConfig {
    userId:string,
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

interface GamepadConfigAppI{
}

interface BeaversGamepadManagerI {
    getRegisteredGamepads:()=>RegisteredGamepads
}
interface GamepadModuleManagerInstance {
    getGamepadModules:()=>{
        [key:string]:GamepadModule
    }
    tick:(gamepadTickEvent:GamepadTickEvent)=>void
    updateGamepadModuleInstance:()=>void
    deleteGamepadModuleInstance:(gamepadIndex:string,moduleId:string)=>void
    registerGamepadModule:(GamepadModule:GamepadModule)=>void,
}

interface UIModule{
    name: string,
    process: ()=>void,
}

interface UIDataOption{
    updateUI?: boolean;
}
interface UIData {
    [userId:string]: UserData
}

interface UserData {
    userPosition: string,
    enableUI: boolean,
    top: number,
    left: number,
    [key:string]: any
}

