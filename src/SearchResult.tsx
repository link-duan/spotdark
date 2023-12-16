import { useContext } from "react";
import { SEARCH_RESULT_ITEM_HEIGHT } from "./config";
import { Context, SearchResultItem } from "./store";
import className from "classnames";

export function SearchResult() {
  const { searchResult, selectedIndex } = useContext(Context);

  return (
    <ul id="search-result">
      {searchResult.map((item, index) => (
        <li
          key={index}
          style={{ height: SEARCH_RESULT_ITEM_HEIGHT }}
          className={className({ active: index === selectedIndex })}
        >
          <Item item={item} />
        </li>
      ))}
    </ul>
  );
}

function Item({ item }: { item: SearchResultItem }) {
  switch (item.type) {
    case "app":
      return item.name;
    case "plugin":
      const info = item.plugin.info();
      return info.name;
  }
}
