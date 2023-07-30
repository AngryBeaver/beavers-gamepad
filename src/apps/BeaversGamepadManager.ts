import {HOOK_GAMEPAD_CONNECTED, NAMESPACE} from "../main.js";

export class BeaversGamepadManager implements BeaversGamepadManagerI{
    gamepads: {
        [gamepadIndex: string]: {
            id: string
            button: {
                [buttonIndex: string]: number
            };
            axes: {
                [axesIndex: string]: number
            };
            count:{
                buttons: number,
                axes: number
            }
        }
    } = {};
    eventHandler: {
        [gamepadIndex: string]: {
            [handlerId: string]: GamepadTickEventHandle
        }
    } = {};
    handlerId: number = 0;
    context: Context;

    constructor() {
        this.context = game[NAMESPACE];
        window.addEventListener("gamepadconnected", (e) => {
            this._registerGamePad(e.gamepad)
        });
        window.setInterval(() => {
            this._gamepadTick();
        }, 100)
    }

    getRegisteredGamepads():RegisteredGamepads {
        const result:RegisteredGamepads = {}
        for(const [index,value] of Object.entries(this.gamepads)){
            result[index]={
                id:value.id,
                count:{
                    buttons: value.count.buttons,
                    axes: value.count.axes
                }
            }
        }
        return result;
    }

    registerEventHandler(gamepadIndex:string,event: GamepadTickEventHandle):string{
        const id = this.handlerId++;
        if(!this.eventHandler[gamepadIndex]){
            this.eventHandler[gamepadIndex] = {};
        }
        this.eventHandler[gamepadIndex][id]=event;
        return id.toString();
    }

    unregisterEventHandler(gamepadIndex:string,eventIndex: string){
        delete this.eventHandler[gamepadIndex][eventIndex];
    }

    private _registerGamePad(gamepad: Gamepad) {
        console.log("GamePad registered");
        this.gamepads[gamepad.index] = {button: {}, axes: {}, id:gamepad.id, count:{buttons:gamepad.buttons.length,axes:gamepad.axes.length}}
        Hooks.call(HOOK_GAMEPAD_CONNECTED);
    }

    private async _gamepadTick() {
        for (const gamepad of navigator.getGamepads()) {
            if (!gamepad) continue;
            if (!this.gamepads[gamepad.index]) {
                await this._registerGamePad(gamepad);
            }
            const gamepadTickEvent:GamepadTickEvent  = {
                gamepad:gamepad,
                hasAnyButtonTicked:false,
                hasAnyAxesTicked:false,
                axes:{},
                buttons:{}
            };
            this._gatherButtonTickEvent(gamepadTickEvent);
            this._gatherAxesTickEvent(gamepadTickEvent);
            this._triggerGamepadTickEvent(gamepadTickEvent);

        }
    }

    private _gatherButtonTickEvent(gamepadTickEvent:GamepadTickEvent){
        const gamepad = gamepadTickEvent.gamepad;
        const data = this.gamepads[gamepad.index];
        for (const [index, button] of gamepad.buttons.entries()) {
            if (button.pressed) {
                data.button[index] = data.button[index] + 1 || 1
            } else {
                data.button[index] = 0;
            }
            if (data.button[index] == 1 || data.button[index] > 10) {
                gamepadTickEvent.buttons[index]=1;
                gamepadTickEvent.hasAnyButtonTicked=true;
            }
        }
    }
    private _gatherAxesTickEvent(gamepadTickEvent:GamepadTickEvent){
        const gamepad = gamepadTickEvent.gamepad;
        const data = this.gamepads[gamepad.index];
        for (const [index, axis] of gamepad.axes.entries()) {
            const value = axis * 10;
            if (value < -5) {
                if(data.axes[index]>0){
                    data.axes[index]=0
                }
                if(data.axes[index]!=-1){
                    gamepadTickEvent.hasAnyAxesTicked = true;
                    gamepadTickEvent.axes[index] = -1
                }
                data.axes[index] = data.axes[index]-1;
            }else if (value > 5){
                if(data.axes[index]<0){
                    data.axes[index]=0
                }
                if(data.axes[index]!=1){
                    gamepadTickEvent.hasAnyAxesTicked = true;
                    gamepadTickEvent.axes[index] = 1
                }
                data.axes[index] = data.axes[index]+1;
            } else {
                data.axes[index]= 0;
            }
        }
    }

    private _triggerGamepadTickEvent(gamepadTickEvent:GamepadTickEvent) {
        const gamepad = gamepadTickEvent.gamepad;
        if(this.eventHandler[gamepad.index]) {
            for (const [eventId, event] of Object.entries(this.eventHandler[gamepad.index])) {
                try {
                    if (!event(gamepadTickEvent)) {
                        return;
                    }
                } catch (e) {
                    console.error("Error in gamepadTickEventHandler:", e);
                }
            }
        }
    }

}