import {NAMESPACE, SOCKET_UPDATE_USER} from "../main.js";

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
        const selected = game["users"].get(userId).character?.id
        const actorId = await userInput.select({choices: choices,selected:selected});
        if (actorId !== null && actorId !== "") {
            game[NAMESPACE].socket.executeAsGM(SOCKET_UPDATE_USER,userId,{"character": actorId}).then(x => {
                if (game["users"].current.id === userId && canvas instanceof Canvas) {
                    const token: any | undefined = canvas.tokens?.objects?.children.find(token => game["users"].current.character.id === token["actor"]?.id);
                    if (token) {
                        token.control();
                    }
                }
            });
        }
    }

}