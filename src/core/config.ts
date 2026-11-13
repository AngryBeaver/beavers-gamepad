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

/**
 * A module configuration for one gamepad: the module's defaults with the bindings and option values stored for that
 * gamepad. Bindings and options a module got in a later version are added with their defaults.
 */
export function withStoredBinding(
  defaultConfig: GamepadModuleConfig,
  gamepadConfig: GamepadConfig,
): GamepadModuleConfig {
  const stored = gamepadConfig.modules[defaultConfig.id];
  const defaults = clone(defaultConfig);
  const merge = <T extends object>(base: { [name: string]: T }, own: { [name: string]: Partial<T> } = {}) => {
    const result: { [name: string]: T } = { ...base };
    for (const [name, value] of Object.entries(own)) {
      result[name] = { ...base[name], ...value } as T;
    }
    return result;
  };
  const result: GamepadModuleConfig = {
    ...defaults,
    binding: {
      axes: merge(defaults.binding.axes, stored?.binding?.axes),
      buttons: merge(defaults.binding.buttons, stored?.binding?.buttons),
    },
  };
  if (defaults.options) {
    const options = { ...defaults.options };
    for (const [name, option] of Object.entries(defaults.options)) {
      const value = stored?.options?.[name]?.value;
      if (value !== undefined && value !== null && value !== "") {
        options[name] = { ...option, value: value };
      }
    }
    result.options = options;
  }
  return result;
}

export const cloneModuleConfig = (config: GamepadModuleConfig): GamepadModuleConfig => clone(config);
