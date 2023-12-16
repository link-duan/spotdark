import { createContext } from "react";
import { Plugin } from "./plugin";

export interface Application {
  type: "app";
  name: string;
  path: string;
}

export interface PluginItem {
  type: "plugin";
  plugin: Plugin;
}

export type SearchResultItem = Application | PluginItem;

export interface State {
  searchResult: SearchResultItem[];
  selectedIndex: number;
}

export const Context = createContext<State>({
  searchResult: [],
  selectedIndex: 0,
});
