import {HOOK_GAMEPAD_CONNECTED, NAMESPACE} from "../main.js";
import {Context} from "../GamepadSettings.js";

/**
 * this is the configuration module that allows to add and delete and configure gamepadmodules
 */
export class UIConfigApp extends FormApplication<any,any,any> {

    gamepadModules: {
        [key:string]:GamepadModule
    }
    context: Context = game[NAMESPACE];
    gamepadConfigs: GamepadConfigs;
    hook:number;

    constructor(){
        super();
        this.hook = Hooks.on(HOOK_GAMEPAD_CONNECTED, async function(){
            this.render();
        }.bind(this));
    }

    static get defaultOptions(): any {
        if (!(game instanceof Game)) {
            throw new Error("Settings called before game has been initialized");
        }
        const title = game.i18n.localize("beaversGamepad.uiConfigApp.title");
        return mergeObject(super.defaultOptions, {
            title: title,
            template: "modules/beavers-gamepad/templates/ui-config.hbs",
            id: "ui-config",
            width: 600,
            height: 600,
            resizable:true,
            submitOnChange:false,
            submitOnClose:true,
            classes:  ["beavers-gamepad","ui-config"]
        })
    }

    async getData(options: any): Promise<any> {
        if (!(game instanceof Game)) {
            throw new Error("Settings called before game has been initialized");
        }


        return {
            users: game.users?.contents.reduce((a, v) => ({ ...a, [v.id]: v}), {}) || {},
            uiData: this.context.Settings.getUIData(),
        }
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.find('button[type=submit]').on("click",e=>{
            this.close();
        });
        html.find('.addUser').on("click",e=>{
            const formData = new FormData($(e.currentTarget).parents("form")[0]);
            const userId = formData.get("addUser") as string;
            if(userId) {
                this.context.Settings.setUserData(userId, {}).then(
                    ()=>{
                        this.render()
                    });
            }
        });
        html.find('.removeUser').on("click",e=>{
            const id = $(e.currentTarget).data("id");
            this.context.Settings.removeUserData(id).then(
                ()=>{
                    this.render()
                }
            );
        });
    }

    async _updateObject(event: Event, formData: object | undefined) {
        if(formData != undefined) {
            delete formData["addUser"];
            const uiData = {};
            for (const [attribute, value] of Object.entries(formData)) {
                setProperty(uiData, attribute, value);
            }
            this.context.Settings.setUIData(uiData as UIData,{updateUI:true})
        }
    }

    async close(options?: FormApplication.CloseOptions): Promise<void>{
        super.close(options);
        const result = super.close(options);
        Hooks.off(HOOK_GAMEPAD_CONNECTED,this.hook);
        return result
    }

}
