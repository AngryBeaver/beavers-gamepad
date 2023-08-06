import {HOOK_GAMEPAD_CONNECTED, NAMESPACE} from "../main.js";

export class GamepadConfigApp extends FormApplication<any,any,any> implements GamepadConfigAppI {


    gamepadModules: {
        [key:string]:GamepadModule
    }
    context: Context;
    gamepadConfigs: GamepadConfigs;
    hook:number;

    constructor(){
        super();
        this.context = game[NAMESPACE];
        this.context.GamepadConfigApp = this;
        this.hook = Hooks.on(HOOK_GAMEPAD_CONNECTED, async function(){
            this.render();
        }.bind(this));
    }

    static get defaultOptions(): any {
        if (!(game instanceof Game)) {
            throw new Error("Settings called before game has been initialized");
        }
        const title = game.i18n.localize("beaversGamepad.gamepadConfigApp.title");
        return mergeObject(super.defaultOptions, {
            title: title,
            template: "modules/beavers-gamepad/templates/gamepad-config.hbs",
            id: "beavers-gamepad-config",
            width: 600,
            height: 600,
            resizable:false,
            submitOnChange:true,
            submitOnClose:true,
            closeOnSubmit:false,
            classes:  ["beavers-gamepad","gamepad-config"]
        })
    }

    async getData(options: any): Promise<any> {
        if (!(game instanceof Game)) {
            throw new Error("Settings called before game has been initialized");
        }
        const actors = game.actors?.filter(a=>a.type==="character")||[];
        this.gamepadModules = this.context.GamepadModuleManager.getGamepadModules();
        this.gamepadConfigs = this.context.GamepadModuleManager.getGamepadConfigs();
        return {
            hasGamepadConfigs: Object.values(this.gamepadConfigs).length>0,
            gamepadConfigs: this.gamepadConfigs,
            actors: actors,
        }
    }

    activateListeners(html) {
        super.activateListeners(html)
        html.find('.addGamepadModule').on("click",e=>{
            const id = $(e.currentTarget).data("id");
            this.addGamepadModule(id);
        });
        html.find('.delete').on("click",e=>{
            const id = $(e.currentTarget).data("id");
            const moduleId = $(e.currentTarget).data("module");
            this.context.GamepadModuleManager.deleteGamepadConfigModule(id,moduleId).then(()=>this.render());
        });

    }

    protected _updateObject(event: Event, formData: object | undefined): Promise<unknown> {
        console.log("FORM",formData);
        if(formData != undefined) {
            return this.context.GamepadModuleManager.updateGamepadConfigs(formData)
        }
        return Promise.resolve("");
    }

    async addGamepadModule(gamepadIndex:string){
        const selectData = {
            choices:{}
        }
        for(const [moduleId,gamepadModule] of Object.entries(this.gamepadModules)){
            if(!this.gamepadConfigs[gamepadIndex].modules[moduleId]) {
                selectData.choices[moduleId] = {text: gamepadModule.name};
            }
        }
        const selectedId = await beaversSystemInterface.uiDialogSelect(selectData);
        const data = {}
        data[gamepadIndex+'.modules.'+selectedId] = this.gamepadModules[selectedId].defaultConfig;
        this.context.GamepadModuleManager.updateGamepadConfigs(data).then(()=>this.render());
    }


    close(options?: FormApplication.CloseOptions): Promise<void>{
        const result = super.close(options);
        this.context.GamepadModuleManager.updateGamepadModuleInstance();
        Hooks.off(HOOK_GAMEPAD_CONNECTED,this.hook);
        return result
    }


}
