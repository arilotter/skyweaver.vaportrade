import { useMemo, useState } from "react";
import { TokenBalanceGrid, TokenBalanceGridProps } from "../TokenBalanceGrid";

import "./FilterTokenBalanceGrid.css";

export interface FilterTokenBalanceGridProps extends TokenBalanceGridProps {}

export function FilterTokenBalanceGrid(props: FilterTokenBalanceGridProps) {
  const { tokens } = props;

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const lowerSearch = search.toLowerCase().split(" ");
    return tokens.filter((t) =>
      lowerSearch.every(
        (part) =>
          t.tokenMetadata?.name.toLowerCase().includes(part) ||
          t.tokenMetadata?.description.toLowerCase().includes(part) ||
          JSON.stringify(t.tokenMetadata?.properties)
            ?.toLowerCase()
            .includes(part) ||
          t.contractInfo?.name.toLowerCase().includes(part)
      )
    );
  }, [tokens, search]);

  return (
    <div>
      <input
        className="gridSearch"
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={"Search..."}
      ></input>
      <TokenBalanceGrid {...props} tokens={filtered} />
    </div>
  );
}
