import {TinyUserInterface} from "./TinyUserInterface.js";
import {GamepadSettings} from "../GamepadSettings.js";

export class CharacterSelectionUI implements UIModule{
    name: "beavers-character-selection"
    async process(userId:string, userInput:UserInput) {
        const choices = game["actors"].filter(a=>{
            let ownership = a.ownership.default;
            if(a.ownership[userId]){
                ownership = a.ownership[userId];
            }
            return ownership >= 3;
        }).reduce((a,v)=>({ ...a,[v.id]:{text:v.name,img:v.img}}));
        const actorId = await userInput.select({choices:choices});
        if(actorId === null) {
            const settings: GamepadSettings = game["beavers-gamepad"].Settings;
            const gamepadIndex = settings.getGamepadIndexForUser(userId);
            const data = {};
            data[`${gamepadIndex}.actorId`] = actorId;
            settings.updateGamepadConfigs(data);
        }
    }

}