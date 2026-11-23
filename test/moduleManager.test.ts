import { beforeAll, describe, expect, it } from "vitest";

// the manager registers foundry hooks when it is created, they are not needed here.
beforeAll(() => {
  (globalThis as any).Hooks = { on: () => 0 };
});

const event = (pressed: boolean): GamepadTickEvent =>
  ({
    gamepad: { index: 0 },
    hasAnyButtonTicked: pressed,
    hasAnyAxesTicked: false,
    hasAnyAxesActivity: false,
    isAnyButtonPressed: pressed,
    axes: {},
    buttons: pressed ? { 0: 1 } : {},
  }) as unknown as GamepadTickEvent;

async function managerWithModule() {
  const { GamepadModuleManager } = await import("../src/apps/GamepadModuleManager");
  const manager = new GamepadModuleManager();
  const ticks: boolean[] = [];
  manager.registeredGamepadModuleInstances["0"] = {
    activate: {
      getConfig: () => ({ id: "activate", name: "activate", binding: { axes: {}, buttons: {} } }),
      tick: (e: GamepadTickEvent) => {
        ticks.push(e.isAnyButtonPressed);
        return true;
      },
      updateGamepadConfig: () => undefined,
      destroy: () => undefined,
    } as GamepadModuleInstance,
  };
  return { manager, ticks };
}

describe("GamepadModuleManager suspend and resume", () => {
  it("does not pass ticks of a suspended gamepad to its modules", async () => {
    const { manager, ticks } = await managerWithModule();
    manager.suspend("0");
    manager.tick(event(true));
    expect(ticks).toEqual([]);
  });

  // e.g. (A) answers a question while the gamepad is suspended, the question resumes it before the manager saw
  // the press: the press must not reach the modules as a new one, e.g. open the tiny-ui.
  it("keeps a resumed gamepad muted until its buttons are released", async () => {
    const { manager, ticks } = await managerWithModule();
    manager.suspend("0");
    manager.resume("0");
    manager.tick(event(true));
    expect(ticks).toEqual([]);
    manager.tick(event(false));
    manager.tick(event(true));
    expect(ticks).toEqual([false, true]);
  });

  it("passes the ticks of a gamepad that was never suspended", async () => {
    const { manager, ticks } = await managerWithModule();
    manager.tick(event(true));
    expect(ticks).toEqual([true]);
  });
});
