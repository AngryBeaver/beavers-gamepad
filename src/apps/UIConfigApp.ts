import {HOOK_GAMEPAD_CONNECTED, NAMESPACE} from "../definitions.js";
/**
 * this is the configuration module that allows to add and delete and configure gamepadmodules
 */
const { ApplicationV2, HandlebarsApplicationMixin } = (foundry as any).applications.api;

export class UIConfigApp extends HandlebarsApplicationMixin(ApplicationV2) {

    gamepadModules: {
        [key:string]:GamepadModule
    } = {};
    gamepadConfigs: GamepadConfigs = {}
    hook:number;

    constructor(){
        super();
        this.hook = Hooks.on(HOOK_GAMEPAD_CONNECTED, this.render.bind(this));
    }

    static DEFAULT_OPTIONS = {
        id: NAMESPACE+"ui-config",
        classes: [NAMESPACE,"ui-config","standard-form","beavers-settings"],
        tag: "div",
        form: {
            submitOnChange:false,
            submitOnClose:true,
        },
        position: {
            width: 600
        },
        window: {
            resizable:true,
        }
    }
    static PARTS = {
        form: {
            template: `modules/${NAMESPACE}/templates/ui-config.hbs`,
        }
    }
    get title(){
        return (game as foundry.Game).i18n?.localize("beaversGamepad.uiConfigApp.title");
    }


    async _prepareContext(options:any): Promise<any> {
        return {
            users: (game as ExtendedGame).users?.contents.reduce((a: any, v: { id: any; }) => ({ ...a, [v.id]: v}), {}) || {},
            uiData: (game as ExtendedGame)[NAMESPACE].Settings.getUIData(),
            positionChoices: ["bottom", "left", "right", "top"]
        }
    }

    _onRender(context: any, options:any){
        const html = $(this.element);
        this.activateListeners(html);
    }
    activateListeners(html:any) {
        html.find('button[type=submit]').on("click",(e:any)=>{
            this.close();
        });
        html.find('.addUser').on("click",(e:any)=>{
            const formData = new FormData($(e.currentTarget).parents("form")[0]);
            const userId = formData.get("addUser") as string;
            if(userId) {
                (game as ExtendedGame)[NAMESPACE].Settings.setUserData(userId, {}).then(
                    ()=>{
                        this.render()
                    });
            }
        });
        html.find('.removeUser').on("click",(e:any)=>{
            const id = $(e.currentTarget).data("id");
            (game as ExtendedGame)[NAMESPACE].Settings.removeUserData(id).then(
                ()=>{
                    (game as ExtendedGame)[NAMESPACE].TinyUIModuleManager.removeInstance(id);
                    this.render()
                }
            );
        });
        // Center button handler
        html.find('.center-user-pos').on("click", async (e:any) => {
            const userId: string = $(e.currentTarget).data("id");
            if (!userId) return;

            const userData = (game as ExtendedGame)[NAMESPACE].Settings.getUserData(userId) || {};
            const pos = (userData.userPosition || "bottom") as "top" | "bottom" | "left" | "right";

            const viewportW = window.innerWidth || document.documentElement.clientWidth;
            const viewportH = window.innerHeight || document.documentElement.clientHeight;

            // Tiny UI dimensions (match tiny-ui.hbs inline styles)
            const UI_WIDTH = 210;
            const UI_HEIGHT = 50;
            const MARGIN = 50;

            let top = 0;
            let left = 0;

            switch (pos) {
                case "top":
                    top = UI_HEIGHT;
                    left = Math.max(MARGIN, Math.round((viewportW - UI_WIDTH/2) / 2));
                    break;
                case "bottom":
                    top = Math.max(MARGIN, viewportH-UI_HEIGHT-MARGIN);
                    left = Math.max(MARGIN, Math.round((viewportW - UI_WIDTH/2) / 2));
                    break;
                case "left":
                    top = Math.max(MARGIN, Math.round((viewportH - UI_WIDTH/2) / 2));
                    left = MARGIN;
                    break;
                case "right":
                    top = Math.max(MARGIN, Math.round((viewportH - UI_WIDTH/2) / 2));
                    left = Math.max(MARGIN, viewportW - UI_HEIGHT);
                    break;
                default:
                    top = Math.max(MARGIN, viewportH - UI_HEIGHT - MARGIN);
                    left = Math.max(MARGIN, Math.round((viewportW - UI_WIDTH/2) / 2));
                    break;
            }

            await (game as ExtendedGame)[NAMESPACE].Settings.setUserData(userId, { top, left });
            this.render();
        });
    }

    async _updateObject(event: Event, formData: any | undefined) {
        if(formData != undefined) {
            delete formData["addUser"];
            const uiData = {};
            for (const [attribute, value] of Object.entries(formData)) {
                setProperty(uiData, attribute, value);
            }
            (game as ExtendedGame)[NAMESPACE].Settings.setUIData(uiData as UIData,{updateUI:true})
        }
    }

    async close(options?: FormApplication.CloseOptions): Promise<void>{
        super.close(options);
        const result = super.close(options);
        Hooks.off(HOOK_GAMEPAD_CONNECTED,this.hook);
        return result
    }

}
