/**
 * Will paint a display with an actor and current activities as dropdown
 * needs to be position absolute, so we can have multiple instances of that for shared screen.
 * Each user can have one instance it need not be the user of the client.
 * each user instance can be dragged and rotated to position it.
 * the app needs to be very small. in place dropdown ?
 * */
import {NAMESPACE} from "../main.js";
import {GamepadSettings} from "../GamepadSettings.js";
import {TinyUserInterfaceGamepadModule} from "./TinyUserInterfaceGamepadModule.js";

export class TinyUserInterface extends Application implements TinyUserInterfaceI {

    _data: {
        userId: string,
        wheel: number,
        selectData: SelectData,
        resolve?:(any)=>void,
        html: any,
    }
    _settings: GamepadSettings;
    hook:number


    constructor(userId: string, options: any = {}) {
        super(options);
        this._settings = game[NAMESPACE].Settings as GamepadSettings
        this._data = {
            userId: userId,
            wheel: 0,
            selectData: {choices:{}},
            html: null,
        };
        const userData = this._settings.getUserData(userId);
        if (this.element.length > 0) {
            this.bringToTop();
        }
        this.setPosition({top:userData.top||0,left:userData.left||0});
        this.hook = Hooks.on("updateUser", async function(user){
            if(user.id === userId) {
                this.render();
            }
        }.bind(this));
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            // @ts-ignore
            //title: game.i18n.localize(`beaversCrafting.crafting-app.title`),
            width: 240,
            height: 60,
            template: `modules/${NAMESPACE}/templates/tiny-ui.hbs`,
            closeOnSubmit: false,
            submitOnClose: false,
            submitOnChange: false,
            resizable: false,
            classes: [NAMESPACE, "tiny-user-interface"],
            popOut: false,
            id: NAMESPACE
        });
    }

    close(options?: Application.CloseOptions): Promise<void> {
        const result = super.close(options);
        Hooks.off("updateUser",this.hook);
        return result;
    }

    get userId(){
        return this._data.userId;
    }

    async getData(options = {}) {
        const userData = this._settings.getUserData(this._data.userId);
        return {
            transform: userData.userPosition==="left"?"90deg":userData.userPosition==="top"?"180deg":userData.userPosition==="right"?"270deg":"0deg",
            userData: userData,
            user: game["users"].get(this._data.userId),
            choices: this._data.selectData.choices,
        }
    }

    activateListeners(html) {
        this._data.html = html;
        html.find(".selection").on("wheel", (e) => {
            if (e.originalEvent.deltaY > 0) {
                this.rotateWheel(1);
            }
            if (e.originalEvent.deltaY < 0) {
                this.rotateWheel(-1);
            }
        });
        html.find("a.up").on("click", (e) => {
            this.rotateWheel(1);
        });
        html.find("a.down").on("click", (e) => {
            this.rotateWheel(-1);
        });
        html.find(".select").on("click", (e) => {
            const id = $(e.currentTarget).data().key;
            this._choose(id);
        });
        html.find('.drag-me').on("mousedown", e => {
            const app = $(e.currentTarget).parent(".app");
            dragElement(e,app[0])
                .then(x=>{
                    this._settings.setUserData(this._data.userId,x)
                });
        });

    }

    public async select(selectData: SelectData):Promise<string> {
        const gamepadIndex = this._settings.getGamepadIndexForUser(this.userId);
        const dfd = new Deferred<string>();
        let promise = dfd.promise;
        if(gamepadIndex){
            game[NAMESPACE].GamepadModuleManager.enableContextModule(gamepadIndex,TinyUserInterfaceGamepadModule.defaultConfig.id);
            promise = dfd.promise.then(x=>{
                game[NAMESPACE].GamepadModuleManager.disableContextModule(gamepadIndex);
                return x;
            })
        }
        this._data.selectData = selectData
        this._data.resolve = dfd.resolve;
        await this._render(true);
        return promise;
    }

    /**
     * may get called via gamepadmodule
     * @param count
     */
    public rotateWheel(count: number) {
        this._data.wheel += count;
        const length = Object.values(this._data.selectData.choices).length;
        this._data.wheel = Math.min(length - 1, Math.max(0, this._data.wheel))
        const top = 7 - this._data.wheel * 21;
        this._data.html.find(".wheel").css({top: top});
    }

    /**
     * may get called via gamepadmodule
     */
    public async ok() {
        const choice = Object.entries(this._data.selectData.choices)[this._data.wheel];
        return this._choose(choice[0])
    }

    /**
     * may get called via gamepadmodule
     */
    public async abort() {
        return this._choose(null);
    }

    _choose(id:string | null) {
        return this._reset()
            .then(x=>{
                if(this._data.resolve){
                    this._data.resolve(id)
                }
            });
    }

    async _reset() {
        this._data.selectData = {choices:{}};
        this._data.wheel = 0;
        return this._render(true);
    }

}

class Deferred<T> {
    promise:Promise<T>;
    reject:()=>void;
    resolve:(value:T)=>void;
    constructor() {
        this.promise = new Promise((resolve, reject)=> {
            this.reject = reject
            this.resolve = resolve
        })
    }
}

function dragElement(event, elmnt):Promise<{top:number,left:number}> {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0, top = elmnt.offsetTop-3, left = elmnt.offsetLeft;
    const deferred = new Deferred<{top:number,left:number}>();
    dragMouseDown(event);
    return deferred.promise;
    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        // calculate the new cursor position:
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        top = elmnt.offsetTop - pos2-3;
        left = elmnt.offsetLeft - pos1
        // set the element's new position:
        elmnt.style.top = (elmnt.offsetTop - pos2-3) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        // stop moving when mouse button is released:
        document.onmouseup = null;
        document.onmousemove = null;
        deferred.resolve({top:top,left:left});
    }
}