import {NAMESPACE} from "../main.js";
import {TinyUIModuleManager} from "./TinyUIModuleManager";

function staticImplements<T>() {
    return <U extends T>(constructor: U) => {constructor};
}

// @ts-ignore
@staticImplements<GamepadModule>()
export class TinyUserInterfaceGamepadModule {

    private _data:{
        config:  GamepadModuleConfig,
        consecutiveTick: number,
        userPosition: string
        userId: string,
    }={
        config: TinyUserInterfaceGamepadModule.defaultConfig,
        consecutiveTick: 0,
        userPosition:"bottom",
        userId: "",
    }

    private X_AXES = "horizontal";
    private Y_AXES = "vertical";

    public static defaultConfig: GamepadModuleConfig={
        binding: {
            axes: {
                "horizontal": {
                    index: "0",
                    reversed: false
                },
                "vertical": {
                    index: "1",
                    reversed: false
                },
            },
            buttons:{}
        },
        name: "Control TinyUserInterface",
        id:"beavers-tinyUI-control",
        // @ts-ignore
        isContextModule:true
    }

    public updateGamepadConfig(gamepadConfig: GamepadConfig){
        this._data.config = TinyUserInterfaceGamepadModule.defaultConfig;
        this._data.config.binding = gamepadConfig.modules[this._data.config.id].binding;
        const userData = game[NAMESPACE].Settings.getUserData(gamepadConfig.userId);
        this._data.userPosition = userData.userPosition;
        this._data.userId = gamepadConfig.userId;
    }

    public tick(event: GamepadTickEvent):boolean{

        this._data.consecutiveTick ++;
        if(!event.hasAnyAxesTicked){
            return true;
        }

        const axes = this.getAxes(event,this.X_AXES,this.Y_AXES,this._data.userPosition);
        if(axes.y > 0){
            if(this._data.consecutiveTick > 3){
                game[NAMESPACE].TinyUIModuleManager.instances[this._data.userId].rotateWheel(axes.y)
                this._data.consecutiveTick = 0;
            }
        }
        return true;
    }

    private getAxes(event: GamepadTickEvent,xAxis:string,yAxis:string,userPosition:string):{x:number,y:number}{
        let x = 0;
        let y = 0;
        event.axes
        for(const [i,value] of Object.entries(event.axes)){
            x = x || this._get(xAxis,i,value);
            y = y || this._get(yAxis,i,value);
        }
        if(userPosition==="top" || userPosition==="right"){
            x = x*-1;
            y = y*-1;
        }
        if(userPosition==="right" || userPosition==="left"){
            const y2 = y;
            y = x;
            x = y2*-1;
        }
        return {x:x, y:y}
    }

    private _get(type:string,i:string,value:number){
        let result = 0;
        const {index,reversed} = this._data.config.binding.axes[type];
        if(i === index.toString()) {
            if(reversed){
                result = value*-1;
            }else {
                result = value;
            }
        }
        return result;
    }




    public destroy(){

    }
}