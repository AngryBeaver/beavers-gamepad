export class TokenMovement implements GamepadModuleI{

    private X_AXES = "Move-horizontal";
    private Y_AXES = "Move-vertical";
    private NAME = "Beaver's Token Movement";
    private CONSTRUCTOR_PATH = "game.beavers-gamepad.TokenMovement";

    config: GamepadModuleConfig
    actorId: string
    isMoving:boolean = false;
    token?:Token;
    position?:{
        collision:any,
        point:any,
        size:number
    }

    constructor(actorId:string){
        this.actorId = actorId;
        this.config = this.getDefaultConfig();
    }

    public setConfig(handlerConfig: GamepadModuleConfig){
        this.config = handlerConfig;
    }

    public getDefaultConfig():GamepadModuleConfig {
        return {
            binding: {
                axes: {
                    "Move-horizontal": {
                        index: "0",
                        reversed: false
                    },
                    "Move-vertical": {
                        index: "1",
                        reversed: false
                    },
                },
                buttons:{}
            },
            name: this.NAME,
            constructorPath: this.CONSTRUCTOR_PATH
        };
    }

    public tick(event: GamepadTickEvent):boolean{
        if(event.hasAnyAxesTicked && this.actorId !== ""){
            let x = 0;
            let y = 0;
            for(const [i,value] of Object.entries(event.axes)){
                x = x || this._get(this.X_AXES,i,value);
                y = y || this._get(this.Y_AXES,i,value);
            }
            this._move(x,y)
        }
        return true;
    }

    private _get(type:string,i:string,value:number){
        let result = 0;
        const {index,reversed} = this.config.binding.axes[type];
        if(i === index.toString()) {
            if(reversed){
                result = value*-1;
            }else {
                result = value;
            }
        }
        return result;
    }


    private _getToken():Token {
        // @ts-ignore
        const token:Token = canvas.tokens?.objects?.children.find(token => this.actorId.endsWith(token?.actor.id) );
        if(token.id !== this.token?.id) {
            this.position = undefined;
        }
        this.token = token;
        return token;
    }

    private getPosition(){
        if(!this.position){
            const token = this.token;
            // @ts-ignore
            const center = token.getCenter(token.x, token.y);
            // @ts-ignore
            this.position ={
                // @ts-ignore
                collision:token.getMovementAdjustedPoint(center),
                point:{
                    // @ts-ignore
                    x : token.x ,
                    // @ts-ignore
                    y : token.y
                },
                // @ts-ignore
                size: + canvas?.scene?.dimensions.size
            }
        }
        return this.position;
    }

    public _move(x, y) {
        if(this.isMoving){
            return
        }
        if (!(canvas instanceof Canvas)) {
            throw new Error("TokenMovement called before canvas has been initialized");
        }
        if(!(game instanceof Game) || game.paused){
            return;
        }
        const token = this._getToken();
        const position = this.getPosition();
        const movePoint = {...position.point }
        movePoint.x = movePoint.x+ x*position.size;
        movePoint.y = movePoint.y+ y*position.size;
        const collisionPoint = {...position.collision }
        collisionPoint.x = collisionPoint.x+ x*position.size
        collisionPoint.y = collisionPoint.y+ y*position.size;
        if (!token.checkCollision(collisionPoint) && this._checkSceneCollision(collisionPoint)) {
            this.isMoving=true;
            token.document.update(movePoint).finally(()=>{
                this.isMoving=false;
                if(this.position) {
                    this.position.point = movePoint;
                    this.position.collision = collisionPoint;
                }
            })
        }
    }

    private _checkSceneCollision(collisionPoint) {
        if (!(canvas instanceof Canvas)) {
            throw new Error("TokenMovement called before canvas has been initialized");
        }
        // @ts-ignore
        return !(collisionPoint.x < canvas.dimensions?.sceneX
            && collisionPoint.x > 0
            // @ts-ignore
            && collisionPoint.y < canvas.dimensions?.sceneY
            && collisionPoint.y > 0);
    }


}