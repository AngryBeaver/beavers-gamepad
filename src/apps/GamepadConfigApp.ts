import {ACTOR_FILTER, HOOK_GAMEPAD_CONNECTED,NAMESPACE} from "../definitions.js";
const { ApplicationV2, HandlebarsApplicationMixin } = (foundry as any).applications.api;

/**
 * this is the configuration module that allows to add and delete and configure gamepadmodules
 */
export class GamepadConfigApp extends HandlebarsApplicationMixin(ApplicationV2) {

    gamepadModules: {
        [key: string]: GamepadModule;
    } ={};
    gamepadConfigs: GamepadConfigs = {};
    hook:number;

    constructor(){
        super();
        this.hook = Hooks.on(HOOK_GAMEPAD_CONNECTED, async () => {
            this.render();
        });
    }

    static DEFAULT_OPTIONS = {
        id: NAMESPACE+"-config",
        classes: [NAMESPACE,"gamepad-config","standard-form","beavers-settings"],
        tag: "div",
        position: {
            width: 600
        },
        window: {
            resizable:false,
        }
    }

    static PARTS = {
        form: {
            template: `modules/${NAMESPACE}/templates/gamepad-config.hbs`,
        }
    }

    get title(){
        return (game as foundry.Game).i18n?.localize("beaversGamepad.gamepadConfigApp.title");
    }

    async _prepareContext(options:any): Promise<any> {
        // @ts-ignore
        const filter = game[NAMESPACE].Settings.get(ACTOR_FILTER);
        const actors = (game as foundry.Game).actors?.filter((a: Actor)=>a.type===filter)||[];
        // @ts-ignore
        this.gamepadModules = game[NAMESPACE].GamepadModuleManager.getGamepadModules();
        // @ts-ignore
        this.gamepadConfigs = game[NAMESPACE].Settings.getGamepadConfigs();
        return {
            users:(game as foundry.Game).users?.contents.reduce((a: any, v: { id: any; }) => ({ ...a, [v.id]: v}), {}) || {},
            hasGamepadConfigs: Object.values(this.gamepadConfigs).length>0,
            gamepadConfigs: this.gamepadConfigs,
            actors: actors,
        }
    }
    _onRender(context: any, options:any){
        const html = $(this.element);
        this.activateListeners(html);
    }
    activateListeners(html:JQuery<HTMLElement>): void {
        html.find('.addGamepadModule').on("click",e=>{
            const id = $(e.currentTarget).data("id");
            this.addGamepadModule(id);
        });
        html.find('.delete').on("click",e=>{
            const id = $(e.currentTarget).data("id");
            const moduleId = $(e.currentTarget).data("module");
            // @ts-ignore
            game[NAMESPACE].Settings.deleteGamepadConfig(id,moduleId).then(
                ()=>{
                    this.render()
                }
            );
        });
        html.find('.addUser').on("click",e=>{
            const id = $(e.currentTarget).data("id");
            this._addUserId(id);
        });

        html.find('.removeUser').on("click",(e)=>{
            const id = $(e.currentTarget).data("id");
            const data:any = {}
            data[id+'.userId'] = "";
            // @ts-ignore
            game[NAMESPACE].Settings.updateGamepadConfigs(data).then(()=>{
                this.render()
            });
        });

    }

    async addGamepadModule(gamepadIndex:string){
        const selectData:any = {
            choices:{}
        }
        for(const [moduleId,gamepadModule] of Object.entries(this.gamepadModules)){
            if(!this.gamepadConfigs[gamepadIndex].modules[moduleId]) {
                selectData.choices[moduleId] = {text: gamepadModule.defaultConfig.name};
            }
        }
        const selectedId = await beaversSystemInterface.uiDialogSelect(selectData);
        const data:any = {}
        data[gamepadIndex+'.modules.'+selectedId] = this.gamepadModules[selectedId].defaultConfig;
        (game as ExtendedGame)[NAMESPACE].Settings.updateGamepadConfigs(data).then(()=>{
            this.render()
        });
    }
    async _addUserId(gamepadIndex:string){
        const choices:any = {};
        const users: User[] = (game as foundry.Game).users.contents || [];
        for(const user of Object.values(users)){
            choices[user.id] = {text:user.name, img:user.avatar}
            for(const config of Object.values(this.gamepadConfigs)){
                if(config.userId == user.id){
                    delete choices[user.id]
                    break;
                }
            }
        }
        const userId = await beaversSystemInterface.uiDialogSelect({choices:choices})
        if(userId) {
            const data:any = {}
            data[gamepadIndex+'.userId'] = userId;
            (game as ExtendedGame)[NAMESPACE].Settings.updateGamepadConfigs(data).then(()=>{
                this.render()
            });
        }
    }


    close(options?: FormApplication.CloseOptions): Promise<void>{
        const result = super.close(options);
        (game as ExtendedGame)[NAMESPACE].GamepadModuleManager.updateGamepadModuleInstance();
        Hooks.off(HOOK_GAMEPAD_CONNECTED,this.hook);
        return result
    }


}
