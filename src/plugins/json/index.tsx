import { ReactNode } from "react";
import { Plugin, PluginInfo } from "../../plugin";

const JsonPlugin: Plugin = {
  info: function (): PluginInfo {
    return {
      name: "JSON",
      icon: <div>JSON</div>,
    };
  },
  matches: function (keyword: string): boolean {
    try {
      JSON.parse(keyword);
      return true;
    } catch (_) {
      return false;
    }
  },
  render: function (props): ReactNode {
    const object = JSON.parse(props.keyword);
    return <pre>{JSON.stringify(object, null, 2)}</pre>;
  },
};

export default JsonPlugin;
