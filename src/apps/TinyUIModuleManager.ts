import { TinyUserInterface } from "./TinyUserInterface";
import { gamepadApi } from "../definitions";

export class TinyUIModuleManager implements TinyUIModuleManagerI {
  private _data: {
    instances: {
      [userId: string]: TinyUserInterface;
    };
    uiModules: {
      [moduleId: string]: UIModule;
    };
  } = {
    instances: {},
    uiModules: {},
  };

  getInstance(userId: string): TinyUserInterface | undefined {
    return this._data.instances[userId];
  }

  getUiModuleChoices() {
    const choices: any = {};
    Object.entries(this._data.uiModules).forEach(([moduleId, uiModule]) => {
      choices[moduleId] = { text: game.i18n.localize(uiModule.label ?? uiModule.name) };
    });
    return choices;
  }

  async processUI(userId: string, moduleId: string) {
    const uiModule = this._data.uiModules[moduleId];
    const instance = this._data.instances[userId];
    if (!uiModule || !instance) {
      return;
    }
    return uiModule.process(userId, instance);
  }

  /**
   * every user that has userData on this client gets a TinyUserInterface.
   */
  updateUIModules() {
    const uiData = gamepadApi().Settings.getUIData();
    for (const userId of Object.keys(this._data.instances)) {
      if (!uiData[userId]) {
        this.removeInstance(userId);
      }
    }
    for (const userId of Object.keys(uiData)) {
      if (!game.users.get(userId)) {
        continue;
      }
      if (this._data.instances[userId]) {
        this._data.instances[userId].render();
      } else {
        this.addInstance(userId);
      }
    }
  }

  addInstance(userId: string) {
    this._data.instances[userId] = new TinyUserInterface(userId);
    this._data.instances[userId].render({ force: true });
  }

  async removeInstance(userId: string) {
    const instance = this._data.instances[userId];
    if (instance) {
      delete this._data.instances[userId];
      await instance.close();
    }
  }

  addModule(moduleId: string, uiModule: UIModule) {
    this._data.uiModules[moduleId] = uiModule;
  }

  removeModule(moduleId: string) {
    delete this._data.uiModules[moduleId];
  }
}
