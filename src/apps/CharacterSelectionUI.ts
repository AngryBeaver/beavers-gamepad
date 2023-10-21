import {TinyUserInterface} from "./TinyUserInterface.js";
import {GamepadSettings} from "../GamepadSettings.js";

export class CharacterSelectionUI implements UIModule {
    name = "beavers-character-selection"

    async process(userId: string, userInput: UserInput) {
        const choices = {};
        game["actors"].filter(a => {
            let ownership = a.ownership.default;
            if (a.ownership[userId]) {
                ownership = a.ownership[userId];
            }
            return ownership >= 3;
        }).forEach(a => {
            choices[a.id] = {text: a.name, img: a.img}
        });
        const actorId = await userInput.select({choices: choices});
        if (actorId !== null && actorId !== "") {
            const settings: GamepadSettings = game["beavers-gamepad"].Settings;
            const gamepadIndex = settings.getGamepadIndexForUser(userId);
            const data = {};
            game["users"].get(userId).update({"character": actorId}).then(x => {
                if (game["users"].current.id === userId && canvas instanceof Canvas) {
                    const token: any | undefined = canvas.tokens?.objects?.children.find(token => game["users"].current.character.id === token["actor"]?.id);
                    if (token) {
                        token.control();
                    }
                }
            });
            data[`${gamepadIndex}.actorId`] = "Actor." + actorId;
            settings.updateGamepadConfigs(data);
        }
    }

}