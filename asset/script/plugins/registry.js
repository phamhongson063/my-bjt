const registry = new Map();

export function register(PluginClass) {
  registry.set(PluginClass.type, new PluginClass());
}

export function getPlugin(type) {
  return registry.get(type);
}
