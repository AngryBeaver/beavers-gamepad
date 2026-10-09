import { NAMESPACE, gamepadApi } from "../definitions";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

// Tiny UI dimensions, have to match gamepad.css
const UI_WIDTH = 210;
const UI_HEIGHT = 50;
const MARGIN = 50;

/**
 * this is the configuration app for the users that sit around this client: where they sit and where their
 * TinyUserInterface is displayed.
 */
export class UIConfigApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: NAMESPACE + "-ui-config",
    classes: [NAMESPACE, "ui-config", "standard-form"],
    tag: "form",
    position: {
      width: 600,
      height: 600,
    },
    window: {
      title: "beaversGamepad.uiConfigApp.title",
      icon: "fa-solid fa-users",
      resizable: true,
    },
    form: {
      handler: UIConfigApp.onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      removeUser: UIConfigApp.onRemoveUser,
      centerUser: UIConfigApp.onCenterUser,
    },
  };

  static PARTS = {
    form: {
      template: `modules/${NAMESPACE}/templates/ui-config.hbs`,
      scrollable: [""],
    },
  };

  async _prepareContext(options: any): Promise<any> {
    const uiData = gamepadApi().Settings.getUIData();
    const users: any[] = game.users.contents;
    return {
      users: users
        .filter((user) => uiData[user.id])
        .map((user) => ({ id: user.id, name: user.name, ...uiData[user.id] })),
      addable: users.filter((user) => !uiData[user.id]).map((user) => ({ id: user.id, name: user.name })),
      positionChoices: {
        bottom: "beaversGamepad.position.bottom",
        left: "beaversGamepad.position.left",
        right: "beaversGamepad.position.right",
        top: "beaversGamepad.position.top",
      },
    };
  }

  /**
   * stores the field that got changed. Not the whole form: a TinyUserInterface might have been dragged to another
   * place since the form got rendered.
   */
  static async onSubmit(this: UIConfigApp, event: Event, form: HTMLFormElement, formData: any) {
    const settings = gamepadApi().Settings;
    const data: { [path: string]: any } = formData.object;
    const changed = (event.target as HTMLInputElement | null)?.name ?? "";
    const uiData: { [userId: string]: any } = {};
    for (const path of changed in data ? [changed] : Object.keys(data)) {
      if (path === "addUser") {
        if (data.addUser) uiData[data.addUser] = settings.getUserData(data.addUser);
        continue;
      }
      const [userId, attribute] = path.split(".");
      const value = attribute === "userPosition" ? data[path] : Number(data[path]) || 0;
      uiData[userId] = { ...uiData[userId], [attribute]: value };
    }
    await settings.setUIData(uiData, { updateUI: true });
    // the modules read the position of the user
    gamepadApi().GamepadModuleManager.updateGamepadModuleInstance();
    if (data.addUser && (changed === "addUser" || !(changed in data))) {
      await this.render();
    }
  }

  static async onRemoveUser(this: UIConfigApp, event: Event, target: HTMLElement) {
    await gamepadApi().Settings.removeUserData(target.dataset.id as string);
    await this.render();
  }

  /**
   * places the TinyUserInterface in the middle of the edge the user sits at.
   */
  static async onCenterUser(this: UIConfigApp, event: Event, target: HTMLElement) {
    const userId = target.dataset.id as string;
    const settings = gamepadApi().Settings;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    let top: number;
    let left: number;
    switch (settings.getUserData(userId).userPosition) {
      case "top":
        top = UI_HEIGHT;
        left = Math.max(MARGIN, Math.round((viewportW - UI_WIDTH / 2) / 2));
        break;
      case "left":
        top = Math.max(MARGIN, Math.round((viewportH - UI_WIDTH / 2) / 2));
        left = MARGIN;
        break;
      case "right":
        top = Math.max(MARGIN, Math.round((viewportH - UI_WIDTH / 2) / 2));
        left = Math.max(MARGIN, viewportW - UI_HEIGHT);
        break;
      default:
        top = Math.max(MARGIN, viewportH - UI_HEIGHT - MARGIN);
        left = Math.max(MARGIN, Math.round((viewportW - UI_WIDTH / 2) / 2));
        break;
    }
    await settings.setUIData({ [userId]: { ...settings.getUserData(userId), top, left } }, { updateUI: true });
    await this.render();
  }
}
