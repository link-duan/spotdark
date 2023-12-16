export interface Plugin {
  info(): PluginInfo;

  /**
   * Test if the keyword matches this plugin
   */
  matches(keyword: string): boolean;

  render(props: RenderProps): React.ReactNode;
}

export interface PluginInfo {
  name: string;
  icon: React.ReactNode;
}

export interface RenderProps {
  keyword: string;
}

export const plugins: Record<string, Plugin> = {};

export function registerPlugin(id: string, plugin: Plugin) {
  plugins[id] = plugin;
}
