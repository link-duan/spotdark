import {
  LogicalPosition,
  LogicalSize,
  appWindow,
  currentMonitor,
} from "@tauri-apps/api/window";
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import "./App.css";
import { invoke } from "@tauri-apps/api";
import { SearchResult } from "./SearchResult";
import {
  PLUGIN_UI_HEIGHT,
  SEARCH_INPUT_HEIGHT,
  SEARCH_INPUT_WIDTH,
  SEARCH_RESULT_EXTRA_HEIGHT,
  SEARCH_RESULT_ITEM_HEIGHT,
} from "./config";
import { Context, SearchResultItem } from "./store";
import { plugins } from "./plugin";

async function search(keyword: string) {
  return await invoke<SearchResultItem[]>("search", { keyword });
}

async function launchApplication(appPath: string) {
  console.log("launch", appPath);
  return await invoke("launch_application", { appPath });
}

async function setWindowToCenter() {
  const monitor = await currentMonitor()!;
  const scaleFactor = monitor!.scaleFactor;
  const monitorSize = monitor!.size!.toLogical(scaleFactor);
  const windowSize = (await appWindow.outerSize()).toLogical(scaleFactor);
  appWindow.setPosition(
    new LogicalPosition(
      (monitorSize.width - windowSize.width) / 2,
      monitorSize.height * 0.3
    )
  );
}

function App() {
  const inputRef = useRef<HTMLInputElement>(null);
  const screenScaleFactor = useRef(1);

  currentMonitor().then((monitor) => {
    screenScaleFactor.current = monitor!.scaleFactor;
  });

  useEffect(() => {
    setWindowToCenter();

    const registerEvents = async () => {
      const unRegisterFocusChanged = await appWindow.onFocusChanged(
        async (ev) => {
          console.log("onFocusChanged", ev);
          inputRef.current!.focus();
          if (!ev.payload) {
            appWindow.hide();
          }
          setWindowToCenter();
        }
      );
      return () => {
        unRegisterFocusChanged();
      };
    };
    const unregister = registerEvents();
    return () => {
      unregister.then((h) => h());
    };
  }, []);

  const [searchResult, setSearchResult] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSeleectedIndex] = useState(0);

  const handleInput = useCallback(async (ev: ChangeEvent<HTMLInputElement>) => {
    setShowPluginUI(false);
    let keyword = ev.target.value;
    const searchResult = await search(keyword);
    setSearchResult(searchResult);

    for (const id in plugins) {
      const plugin = plugins[id];
      if (plugin.matches(keyword)) {
        searchResult.push({
          type: "plugin",
          plugin,
        });
      }
    }

    setSeleectedIndex(0);
    const resultCount = searchResult.length;
    appWindow.setSize(
      new LogicalSize(
        SEARCH_INPUT_WIDTH,
        SEARCH_INPUT_HEIGHT +
          SEARCH_RESULT_ITEM_HEIGHT * resultCount +
          (resultCount ? SEARCH_RESULT_EXTRA_HEIGHT : 0)
      )
    );
  }, []);

  const enterSelected = useCallback(() => {
    const selectedItem = searchResult[selectedIndex];
    switch (selectedItem.type) {
      case "app":
        launchApplication(selectedItem.path);
        break;
      case "plugin":
        setShowPluginUI(true);
        appWindow.setSize(
          new LogicalSize(
            SEARCH_INPUT_WIDTH,
            SEARCH_INPUT_HEIGHT + PLUGIN_UI_HEIGHT
          )
        );
    }
  }, [selectedIndex, searchResult]);

  const handleKeyDown = useCallback(
    (ev: React.KeyboardEvent<HTMLInputElement>) => {
      switch (ev.key) {
        case "Tab":
          ev.preventDefault();
          return false;
        case "ArrowDown":
          ev.preventDefault();
          setSeleectedIndex((i) => Math.min(i + 1, searchResult.length - 1));
          break;
        case "ArrowUp":
          ev.preventDefault();
          setSeleectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          ev.preventDefault();
          enterSelected();
          break;
      }
    },
    [searchResult, enterSelected]
  );

  const [showPluginUI, setShowPluginUI] = useState(false);
  const pluginUI = useMemo(() => {
    if (!showPluginUI) return;
    const selected = searchResult[selectedIndex];
    if (!selected || selected.type !== "plugin") return;
    return selected.plugin.render({ keyword: inputRef.current!.value });
  }, [showPluginUI, selectedIndex, searchResult]);

  return (
    <Context.Provider value={{ searchResult, selectedIndex }}>
      <input
        id="search-input"
        tabIndex={-1}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        ref={inputRef}
        autoFocus
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        style={{ height: SEARCH_INPUT_HEIGHT }}
      />
      {showPluginUI ? (
        <div id="plugin-ui-container">{pluginUI}</div>
      ) : (
        <SearchResult />
      )}
    </Context.Provider>
  );
}

export default App;
