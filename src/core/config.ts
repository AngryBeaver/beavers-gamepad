// Pure helpers for the stored gamepad configuration, no Foundry access.

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/**
 * The configuration is stored per gamepad index, but the browser hands out the indexes in the order the gamepads
 * woke up. This matches the stored configurations to the gamepads that are connected right now:
 *  - a gamepad that shows up on another index takes its configuration (user and bindings) with it,
 *  - a second gamepad of a known model starts with the bindings of the first one,
 *  - an unknown gamepad starts with the default modules.
 */
export function reconcileGamepadConfigs(
  stored: GamepadConfigs,
  registered: { [gamepadIndex: string]: { id: string } },
  defaultModules: { [moduleId: string]: GamepadModuleConfig } = {},
): { configs: GamepadConfigs; changed: boolean } {
  const configs: GamepadConfigs = { ...stored };
  let changed = false;
  const isSeated = (index: string) =>
    configs[index] !== undefined && registered[index]?.id === configs[index].gamepadId;

  for (const [index, { id }] of Object.entries(registered)) {
    if (isSeated(index)) continue;
    changed = true;
    const displaced = Object.keys(configs).find((other) => configs[other].gamepadId === id && !isSeated(other));
    if (displaced !== undefined) {
      const previous = configs[index];
      configs[index] = configs[displaced];
      if (previous) configs[displaced] = previous;
      else delete configs[displaced];
      continue;
    }
    const sameModel = Object.values(configs).find((config) => config.gamepadId === id);
    configs[index] = {
      userId: "",
      gamepadId: id,
      modules: clone(sameModel?.modules ?? defaultModules),
    };
  }
  return { configs, changed };
}

/** A module configuration for one gamepad: the module's defaults with the bindings stored for that gamepad. */
export function withStoredBinding(
  defaultConfig: GamepadModuleConfig,
  gamepadConfig: GamepadConfig,
): GamepadModuleConfig {
  return {
    ...defaultConfig,
    binding: gamepadConfig.modules[defaultConfig.id]?.binding ?? clone(defaultConfig.binding),
  };
}

export const cloneModuleConfig = (config: GamepadModuleConfig): GamepadModuleConfig => clone(config);
