/**
 * Will paint a display with an actor and current activities as dropdown
 * needs to be position absolute so we can have multiple instances of that for shared screen.
 * Each user can have one instance it need not be the user of the client.
 * each user instance can be dragged and rotated to position it.
 * the app needs to be very small. in place dropdown ?
 * */
import {NAMESPACE} from "../main.js";
import {GamepadSettings} from "../GamepadSettings.js";

export class TinyUserInterface extends Application {

    _data: {
        userId: string,
        wheel: number,
        choices: {
            [id:string]:{ text: string }
        },
        resolve?:(any)=>void,
    }
    _settings: GamepadSettings;

    constructor(userId: string, options: any = {}) {
        super(options);
        this._settings = game[NAMESPACE].Settings as GamepadSettings
        this._data = {
            userId: userId,
            wheel: 0,
            choices: {},
        };
        const userData = this._settings.getUserData(userId);
        if (this.element.length > 0) {
            this.bringToTop();
        }
        this.setPosition({top:userData.top||0,left:userData.left||0});
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

    async getData(options = {}) {
        const userData = this._settings.getUserData(this._data.userId);
        return {
            transform: userData.userPosition==="left"?"90deg":userData.userPosition==="top"?"180deg":userData.userPosition==="right"?"270deg":"0deg",
            userData: userData,
            user: game["users"].get(this._data.userId),
            choices: this._data.choices,
        }
    }

    activateListeners(html) {
        html.find(".selection").on("wheel", (e) => {
            if (e.originalEvent.deltaY > 0) {
                this._rotateWheel(1, html);
            }
            if (e.originalEvent.deltaY < 0) {
                this._rotateWheel(-1, html);
            }
        });
        html.find("a.up").on("click", (e) => {
            this._rotateWheel(1, html);
        });
        html.find("a.down").on("click", (e) => {
            this._rotateWheel(-1, html);
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

    public async select(choices: { [id: string]: { text: string } }):Promise<string> {
        this._data.choices = choices
        const dfd = new Deferred<string>();
        this._data.resolve = dfd.resolve;
        await this._render(true);
        return dfd.promise;
    }

    _choose(id:string) {
        if(this._data.resolve){
            this._data.resolve(id);
        }
    }

    async _reset(){
        this._data.choices = {};
        this._data.wheel = 0;
        this._render(true);
    }

    _rotateWheel(count: number, html) {
        this._data.wheel += count;
        const length = Object.values(this._data.choices).length;
        this._data.wheel = Math.min(length - 1, Math.max(0, this._data.wheel))
        const top = 7 - this._data.wheel * 21;
        html.find(".wheel").css({top: top});
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