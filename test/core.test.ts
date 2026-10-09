import { describe, expect, it } from "vitest";
import { readAxis, seatAdjust, toDegree } from "../src/core/axes";
import { CaptureSession, axisDirection, isNeutral, snapshot, type PadSnapshot } from "../src/core/capture";
import { reconcileGamepadConfigs, withStoredBinding } from "../src/core/config";
import { doorsInFront, stepBack } from "../src/core/door";

const pad = (buttons: number[], axes: number[]): PadSnapshot => ({ buttons, axes });

describe("capture buttons", () => {
  it("picks the first button that gets pressed", () => {
    const session = new CaptureSession("buttons", pad([0, 0, 0], []));
    expect(session.update(pad([0, 0, 0], []))).toBeNull();
    expect(session.update(pad([0, 0, 1], []))).toEqual({ kind: "buttons", index: 2 });
  });

  // The click on "detect" is often done with a button still held down, e.g. a resting trigger finger.
  it("ignores a button that is held down from the start until it got released once", () => {
    const session = new CaptureSession("buttons", pad([1, 0], []));
    expect(session.update(pad([1, 0], []))).toBeNull();
    expect(session.update(pad([0, 0], []))).toBeNull();
    expect(session.update(pad([1, 0], []))).toEqual({ kind: "buttons", index: 0 });
  });

  it("takes an analog trigger only when it is pressed more than half way", () => {
    const session = new CaptureSession("buttons", pad([0], []));
    expect(session.update(pad([0.3], []))).toBeNull();
    expect(session.update(pad([0.7], []))).toEqual({ kind: "buttons", index: 0 });
  });

  it("ignores sticks", () => {
    const session = new CaptureSession("buttons", pad([0], [0, 0]));
    expect(session.update(pad([0], [1, -1]))).toBeNull();
  });
});

describe("capture axes", () => {
  it("picks the axis that got pushed and tells the direction", () => {
    const session = new CaptureSession("axes", pad([], [0, 0, 0, 0]));
    expect(session.update(pad([], [0, 0.2, 0, 0]))).toBeNull();
    expect(session.update(pad([], [0, 0, 0.9, 0]))).toEqual({ kind: "axes", index: 2, reversed: false });
    expect(session.update(pad([], [0, -0.9, 0, 0]))).toEqual({ kind: "axes", index: 1, reversed: true });
  });

  it("picks the axis that moved the most when the stick is pushed diagonal", () => {
    const session = new CaptureSession("axes", pad([], [0, 0]));
    expect(session.update(pad([], [0.7, -1]))).toEqual({ kind: "axes", index: 1, reversed: true });
  });

  // Triggers mapped as axes rest at -1, hat switches at odd values like 1.29.
  it("measures from the resting value of an axis, not from 0", () => {
    const session = new CaptureSession("axes", pad([], [-1, 1.29, 0]));
    expect(session.update(pad([], [-1, 1.29, 0]))).toBeNull();
    expect(session.update(pad([], [1, 1.29, 0]))).toEqual({ kind: "axes", index: 0, reversed: false });
  });

  it("ignores buttons", () => {
    const session = new CaptureSession("axes", pad([0], [0]));
    expect(session.update(pad([1], [0]))).toBeNull();
  });
});

describe("capture helpers", () => {
  it("snapshot reads buttons and axes of a gamepad", () => {
    const gamepad = {
      buttons: [
        { pressed: true, value: 0 },
        { pressed: false, value: 0.2 },
      ],
      axes: [0.5, -1],
    };
    expect(snapshot(gamepad)).toEqual({ buttons: [1, 0.2], axes: [0.5, -1] });
  });

  it("isNeutral: nothing pressed and all axes back at rest", () => {
    const rest = pad([0, 0], [-1, 0]);
    expect(isNeutral(rest, pad([0, 0], [-0.9, 0.1]))).toBe(true);
    expect(isNeutral(rest, pad([0, 1], [-1, 0]))).toBe(false);
    expect(isNeutral(rest, pad([0, 0], [0, 0]))).toBe(false);
  });

  it("axisDirection asks for the direction named by the module", () => {
    expect(axisDirection("Move-horizontal")).toBe("right");
    expect(axisDirection("vertical")).toBe("down");
    expect(axisDirection("zoom")).toBe("any");
  });
});

describe("axes", () => {
  const binding: GamepadModuleConfigBinding = {
    axes: { horizontal: { index: "2", reversed: false }, vertical: { index: 3, reversed: true } },
    buttons: {},
  };

  it("reads the bound axis from a gamepad and from the sparse axes of a tick event", () => {
    expect(readAxis(binding, [0, 0, 0.5, 0.25], "horizontal")).toBe(0.5);
    expect(readAxis(binding, { "2": 1 }, "horizontal")).toBe(1);
    expect(readAxis(binding, {}, "horizontal")).toBe(0);
  });

  it("flips a reversed axis", () => {
    expect(readAxis(binding, [0, 0, 0.5, 0.25], "vertical")).toBe(-0.25);
  });

  it("is 0 for an axis the module does not have", () => {
    expect(readAxis(binding, [1, 1, 1, 1], "unknown")).toBe(0);
  });

  // Stick pushed away from the player: x 0, y -1. On the screen that is away from the seat of that player.
  it("seatAdjust turns the stick with the seat of the player", () => {
    const away = { x: 0, y: -1 };
    expect(seatAdjust(away, "bottom")).toEqual({ x: 0, y: -1 });
    expect(seatAdjust(away, "top")).toEqual({ x: 0, y: 1 });
    expect(seatAdjust(away, "left")).toEqual({ x: 1, y: 0 });
    expect(seatAdjust(away, "right")).toEqual({ x: -1, y: 0 });
  });

  it("toDegree: 0 faces down, clockwise like the token rotation of foundry", () => {
    expect(toDegree({ x: 0, y: 1 })).toBeCloseTo(0);
    expect(toDegree({ x: -1, y: 0 })).toBeCloseTo(90);
    expect(Math.abs(toDegree({ x: 0, y: -1 }))).toBeCloseTo(180);
    expect(toDegree({ x: 1, y: 0 })).toBeCloseTo(-90);
  });
});

describe("reconcileGamepadConfigs", () => {
  const module = (index: string): GamepadModuleConfig => ({
    id: "move",
    name: "Move",
    binding: { axes: { x: { index, reversed: false } }, buttons: {} },
  });
  const config = (gamepadId: string, userId: string, index = "0"): GamepadConfig => ({
    userId,
    gamepadId,
    modules: { move: module(index) },
  });

  it("leaves everything alone when each gamepad sits on its index", () => {
    const stored = { "0": config("A", "u1"), "1": config("B", "u2") };
    const { configs, changed } = reconcileGamepadConfigs(stored, { "0": { id: "A" }, "1": { id: "B" } });
    expect(changed).toBe(false);
    expect(configs).toEqual(stored);
  });

  it("gives an unknown gamepad the default modules and no user", () => {
    const defaults = { move: module("0") };
    const { configs, changed } = reconcileGamepadConfigs({}, { "0": { id: "A" } }, defaults);
    expect(changed).toBe(true);
    expect(configs["0"]).toEqual({ userId: "", gamepadId: "A", modules: defaults });
    expect(configs["0"].modules.move).not.toBe(defaults.move);
  });

  it("swaps the configurations when two gamepads wake up in the other order", () => {
    const stored = { "0": config("A", "u1", "4"), "1": config("B", "u2", "5") };
    const { configs, changed } = reconcileGamepadConfigs(stored, { "0": { id: "B" }, "1": { id: "A" } });
    expect(changed).toBe(true);
    expect(configs["0"]).toEqual(stored["1"]);
    expect(configs["1"]).toEqual(stored["0"]);
  });

  it("keeps the configuration of a gamepad that is not connected, for when it comes back", () => {
    const stored = { "0": config("A", "u1"), "1": config("B", "u2") };
    const { configs } = reconcileGamepadConfigs(stored, { "0": { id: "B" } });
    expect(configs["0"]).toEqual(stored["1"]);
    expect(configs["1"]).toEqual(stored["0"]);
  });

  it("starts a second gamepad of a known model with the bindings of the first, but without its user", () => {
    const stored = { "0": config("A", "u1", "7") };
    const { configs } = reconcileGamepadConfigs(stored, { "0": { id: "A" }, "1": { id: "A" } });
    expect(configs["0"]).toEqual(stored["0"]);
    expect(configs["1"]).toEqual({ userId: "", gamepadId: "A", modules: { move: module("7") } });
    expect(configs["1"].modules.move).not.toBe(stored["0"].modules.move);
  });

  it("does not touch the stored object", () => {
    const stored = { "0": config("A", "u1") };
    reconcileGamepadConfigs(stored, { "0": { id: "B" } });
    expect(stored).toEqual({ "0": config("A", "u1") });
  });
});

describe("withStoredBinding", () => {
  const defaultConfig: GamepadModuleConfig = {
    id: "move",
    name: "Move",
    binding: { axes: { x: { index: "0", reversed: false } }, buttons: {} },
  };

  // Every gamepad has its own bindings. The defaults of the module are shared and must never change.
  it("uses the binding stored for the gamepad without changing the defaults of the module", () => {
    const stored = { axes: { x: { index: "3", reversed: true } }, buttons: {} };
    const gamepadConfig: GamepadConfig = {
      userId: "",
      gamepadId: "A",
      modules: { move: { ...defaultConfig, binding: stored } },
    };
    const result = withStoredBinding(defaultConfig, gamepadConfig);
    expect(result.binding).toBe(stored);
    expect(result.name).toBe("Move");
    expect(defaultConfig.binding.axes.x.index).toBe("0");
  });

  it("falls back to a copy of the default binding", () => {
    const result = withStoredBinding(defaultConfig, { userId: "", gamepadId: "A", modules: {} });
    expect(result.binding).toEqual(defaultConfig.binding);
    expect(result.binding).not.toBe(defaultConfig.binding);
  });
});

describe("doors", () => {
  // Token at (100, 100). Scene y points down, rotation 0 faces down.
  const center = { x: 100, y: 100 };
  const below = { door: "below", c: [50, 150, 150, 150] };
  const above = { door: "above", c: [50, 60, 150, 60] };
  const far = { door: "far", c: [50, 400, 150, 400] };

  it("finds the door the token faces", () => {
    expect(doorsInFront(center, 0, [below, above, far], 150).map((d) => d.door)).toEqual(["below"]);
    expect(doorsInFront(center, 180, [below, above, far], 150).map((d) => d.door)).toEqual(["above"]);
  });

  it("finds no door to the side of the token", () => {
    expect(doorsInFront(center, 90, [below, above], 150)).toEqual([]);
  });

  it("lists every door in reach, nearest first, for a token that does not rotate", () => {
    expect(doorsInFront(center, 0, [below, above, far], 150, 360).map((d) => d.door)).toEqual(["above", "below"]);
  });

  it("stepBack stops a few pixels before the target", () => {
    expect(stepBack({ x: 0, y: 0 }, { x: 100, y: 0 }, 5)).toEqual({ x: 95, y: 0 });
    expect(stepBack({ x: 0, y: 0 }, { x: 3, y: 0 }, 5)).toEqual({ x: 0, y: 0 });
  });
});
