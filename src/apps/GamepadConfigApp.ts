import {NAMESPACE} from "../main.js";

export class GamepadConfigApp extends FormApplication<any,any,any> implements GamepadConfigAppI {


    handlerConfigs: {
        [key:string]:GamepadModuleConfig
    }
    context: Context;
    gamepadConfigs: GamepadConfigs

    constructor(){
        super();
        this.context = game[NAMESPACE];
        this.context.GamepadConfigApp = this;
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

    updateController(){
        this.render()
    }

    close(options?: FormApplication.CloseOptions): Promise<void>{
        const result = super.close(options);
        this.context.GamepadConfigManager.updateGamepadEventHandler();
        return result
    }

    async getData(options: any): Promise<any> {
        if (!(game instanceof Game)) {
            throw new Error("Settings called before game has been initialized");
        }
        const actors = game.actors?.filter(a=>a.type==="character")||[];
        this.handlerConfigs = this.context.GamepadConfigManager.getGamepadModules();
        this.gamepadConfigs = this.context.GamepadConfigManager.getGamepadConfigs();
        return {
            hasGamepadConfigs: Object.values(this.gamepadConfigs).length>0,
            hasHandlerConfigs: Object.values(this.handlerConfigs).length>0,
            gamepadConfigs: this.gamepadConfigs,
            actors: actors,
        }
    }

    activateListeners(html) {
        super.activateListeners(html)
        html.find('.addGameHandlerSetting').on("click",e=>{
            const id = $(e.currentTarget).data("id");
            this.addGameHandlerSetting(id);
        });
    }

    protected _updateObject(event: Event, formData: object | undefined): Promise<unknown> {
        console.log("FORM",formData);
        if(formData != undefined) {
            return this.context.GamepadConfigManager.updateGamepadConfigs(formData)
        }
        return Promise.resolve("");
    }

    async addGameHandlerSetting(gamepadIndex:string){
        const selectData = {
            choices:{}
        }
        for(const [key,handlerConfig] of Object.entries(this.handlerConfigs)){
            if(!this.gamepadConfigs[gamepadIndex].modules[key]) {
                selectData.choices[key] = {text: handlerConfig.name};
            }
        }
        const key = await beaversSystemInterface.uiDialogSelect(selectData);
        const data = {}
        data[gamepadIndex+'.modules.'+key] = this.handlerConfigs[key];
        this.context.GamepadConfigManager.updateGamepadConfigs(data).then(()=>this.render());
    }




}
