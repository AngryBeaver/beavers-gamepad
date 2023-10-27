import {NAMESPACE} from "../main.js";

function staticImplements<T>() {
    return <U extends T>(constructor: U) => {
        constructor
    };
}

// @ts-ignore
@staticImplements<GamepadModule>()
export class TokenRotation {

    private _data: {
        config: GamepadModuleConfig,
        userPosition: string
        userId: string,
        actorId?: string,
    } = {
        config: TokenRotation.defaultConfig,
        userPosition: "bottom",
        userId: "",
    }

    private X_AXES = "horizontal";
    private Y_AXES = "vertical";

    public static defaultConfig: GamepadModuleConfig = {
        binding: {
            axes: {
                "horizontal": {
                    index: "2",
                    reversed: false
                },
                "vertical": {
                    index: "3",
                    reversed: false
                },
            },
            buttons: {}
        },
        name: "Token Rotation",
        id: "beavers-token-rotation",
        desc: "beaversGamepad.TokenRotation.desc"
    }

    public updateGamepadConfig(gamepadConfig: GamepadConfig) {
        this._data.config = TokenRotation.defaultConfig;
        this._data.config.binding = gamepadConfig.modules[this._data.config.id].binding;
        const userData = game[NAMESPACE].Settings.getUserData(gamepadConfig.userId);
        this._data.userPosition = userData.userPosition;
        this._data.userId = gamepadConfig.userId;
        const user = (game as Game).users?.find(u=>u.id === gamepadConfig.userId);
        this._data.actorId = user?.character?.id;
    }

    public getConfig(): GamepadModuleConfig {
        return this._data.config;
    }

    public tick(event: GamepadTickEvent): boolean {
        if (event.hasAnyAxesTicked) {
            this.tickAxes(event);
        }
        return true;
    }

    private tickAxes(event: GamepadTickEvent) {
        const axes = this.getAxes(event, this.X_AXES, this.Y_AXES, this._data.userPosition);
        if (Math.abs(axes.y) + Math.abs(axes.x) > 0.3) {
            // @ts-ignore
            const token:Token = (canvas as Canvas).tokens?.objects?.children.find(token => this._data.actorId?.endsWith(token.actor?.id) );
            if(token){
                token.rotate(this.getDegree(axes),0);
            }
        }
    }

    private getDegree(point: Point):number{
        return (Math.atan2(point.x*-1, point.y) * 180) / Math.PI;
    }



    private getAxes(event: GamepadTickEvent, xAxis: string, yAxis: string, userPosition: string): Point {
        let x = 0;
        let y = 0;
        for (const [i, value] of Object.entries(event.gamepad.axes)) {
            x = x || this._get(xAxis, i, value);
            y = y || this._get(yAxis, i, value);
        }
        if (userPosition === "top" || userPosition === "right") {
            x = x * -1;
            y = y * -1;
        }
        if (userPosition === "right" || userPosition === "left") {
            const y2 = y;
            y = x;
            x = y2 * -1;
        }
        return {x: x, y: y}
    }

    private _get(type: string, i: string, value: number) {
        let result = 0;
        const {index, reversed} = this._data.config.binding.axes[type];
        if (i === index.toString()) {
            if (reversed) {
                result = value;
            } else {
                result = value;
            }
        }
        return result;
    }


    public destroy() {

    }
}