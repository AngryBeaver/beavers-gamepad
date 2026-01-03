/**
 * Will paint a display with an actor and current activities as dropdown
 * needs to be position absolute, so we can have multiple instances of that for shared screen.
 * Each user can have one instance it need not be the user of the client.
 * each user instance can be dragged and rotated to position it.
 * the app needs to be very small. in place dropdown ?
 * */
import {NAMESPACE} from "../definitions.js";
import {GamepadSettings} from "../GamepadSettings.js";
import {TinyUserInterfaceGamepadModule} from "../modules/TinyUserInterfaceGamepadModule.js";
const { ApplicationV2, HandlebarsApplicationMixin } = (foundry as any).applications.api;

export class TinyUserInterface extends HandlebarsApplicationMixin(ApplicationV2) implements TinyUserInterfaceI {

    _data: {
        userId: string,
        wheel: number,
        selectData: SelectData,
        resolve?:(arg0:any)=>void,
        html: any,
        glow:boolean,
    }
    _settings: GamepadSettings;
    hook:number


    constructor(userId: string) {
        super({id:`${NAMESPACE}-tiny-ui-${userId}`});
        this._settings = (game as ExtendedGame)[NAMESPACE].Settings as GamepadSettings
        this._data = {
            userId: userId,
            wheel: 0,
            selectData: {choices:{}},
            html: null,
            glow:false,
        };
        if ((this as any).rendered) {
            (this as any).bringToTop?.();
        }
        this.hook = Hooks.on("updateUser", async function(user:any){
            if(user.id === userId) {
                // @ts-ignore
                this.render(true);
            }
        }.bind(this));
    }

    static DEFAULT_OPTIONS = {
        id: NAMESPACE+"tiny-ui",
        classes: [NAMESPACE, "tiny-user-interface"],
        tag: "div",
        position: {
            width: 240,
            height: 60
        },
        window: {
            resizable: false,
            title: `tiny-ui`,
            frame: false,
        }
    }

    static PARTS = {
        content: {
            template: `modules/${NAMESPACE}/templates/tiny-ui.hbs`,
        }
    }

    async render(forceOrOptions?: any): Promise<any> {
        const opts = typeof forceOrOptions === 'boolean' ? { force: forceOrOptions } : (forceOrOptions ?? {});
        return super.render(opts);
    }

    async _prepareContext(options: any = {}): Promise<any> {
        return this.getData(options);
    }

    mySetPosition(position: { top?: number; left?: number }) {
        const el: HTMLElement | undefined = (this as any).element as HTMLElement;
        if (el) {
            el.style.position = 'absolute';
            if (typeof position.top === 'number') el.style.top = `${Math.max(position.top, 0)}px`;
            if (typeof position.left === 'number') el.style.left = `${Math.max(position.left, 0)}px`;
        }
        return this;
    }

    getStoredPosition(){
        const userData = this._settings.getUserData(this._data.userId);
        return { top:  Math.min(document.body.offsetHeight-40,Math.max(userData.top, 0)),left: Math.min(document.body.offsetWidth-180,Math.max(userData.left,0))}
    }

    close(options?: any): Promise<void> {
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
            user: (game as foundry.Game)["users"].get(this._data.userId),
            choices: this._data.selectData.choices,
            glow: this._data.glow
        }
    }

    setPosition(options: any) {
        if( this.element.parentElement) {
            super.setPosition(options)
        }
    }

    _onRender(context:any, options:any) {
        this.setPosition(this.getStoredPosition());
        const html = this.element as HTMLElement;
        this._data.html = html;
        html.querySelectorAll('.selection').forEach(el => {
            el.addEventListener('wheel', (e: any) => {
                const deltaY = (e as WheelEvent).deltaY ?? (e.originalEvent?.deltaY ?? 0);
                if (deltaY > 0) this.rotateWheel(1);
                if (deltaY < 0) this.rotateWheel(-1);
            });
        });
        html.querySelectorAll('a.up').forEach(el => el.addEventListener('click', () => this.rotateWheel(1)));
        html.querySelectorAll('a.down').forEach(el => el.addEventListener('click', () => this.rotateWheel(-1)));
        html.querySelectorAll('.select').forEach(el => el.addEventListener('click', (e: any) => {
            const target = e.currentTarget as HTMLElement;
            const id = (target.dataset as any).key;
            this._choose(id);
        }));
        html.querySelectorAll('.drag-me').forEach(el => el.addEventListener('mousedown', (e: any) => {
            const appEl = (e.currentTarget as HTMLElement).closest('.beavers-tiny-ui') as HTMLElement;
            if (!appEl) return;
            dragElement(e, appEl)
                .then(x => {
                    const current:UserData =  this._settings.getUserData(this._data.userId);
                    const diff = {top:current.top+x.top,left:current.left+x.left};
                    this._settings.setUserData(this._data.userId, diff)
                });
        }));
        Object.entries(this._data.selectData.choices).forEach(([key, value], index) => {
            if (key === (this._data.selectData as any).selected) {
                this._data.wheel = index;
                this.rotateWheel(0);
            }
        });
    }

    public async select(selectData: SelectData):Promise<string> {
        const gamepadIndex = this._settings.getGamepadIndexForUser(this.userId);
        const dfd = new Deferred<string>();
        let promise = dfd.promise;
        if(gamepadIndex){
            (game as ExtendedGame)[NAMESPACE].GamepadModuleManager.enableContextModule(gamepadIndex,TinyUserInterfaceGamepadModule.defaultConfig.id);
            this._data.glow = true;
            promise = dfd.promise.then(x=>{
                this._data.glow = false;
                (game as ExtendedGame)[NAMESPACE].GamepadModuleManager.disableContextModule(gamepadIndex);
                return this.render(true).then(y=>x);
            })
        }
        this._data.selectData = selectData
        this._data.resolve = dfd.resolve;
        await this.render(true);
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
        const top = 7 - this._data.wheel * 16;
        const root: HTMLElement | null = this._data.html as any;
        const wheelEl = root ? (root.querySelector('.wheel') as HTMLElement) : null;
        if (wheelEl) wheelEl.style.top = `${top}px`;
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
        return this.render(true);
    }

}

class Deferred<T> {
    promise:Promise<T>;
    reject: () => void = ()=> void 0;
    resolve: (value: T) => void = (value:any) => void 0;
    constructor() {
        this.promise = new Promise((resolve, reject)=> {
            this.reject = reject
            this.resolve = resolve
        })
    }
}

function dragElement(event:any, elmnt:any):Promise<{top:number,left:number}> {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0, top = elmnt.offsetTop-3, left = elmnt.offsetLeft;
    const deferred = new Deferred<{top:number,left:number}>();
    dragMouseDown(event);
    return deferred.promise;
    function dragMouseDown(e:any) {
        e = e || window.event;
        e.preventDefault();
        // get the mouse cursor position at startup:
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        // call a function whenever the cursor moves:
        document.onmousemove = elementDrag;
    }

    function elementDrag(e:any) {
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
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        deferred.resolve({top:Math.max(top,0),left:Math.max(left,0)});
    }
}