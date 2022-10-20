import { TokenBalance } from "@0xsequence/indexer";
import React, { useCallback } from "react";
import * as types from "../../../../shared";
import { niceBalance } from "../../utils";

import "./TokenBalanceGrid.css";

export interface TokenBalanceGridProps {
  tokens: TokenBalance[];
  className?: string;
  tokenStyle?: React.CSSProperties;
  allowDrag?: boolean;
  onDrop?: (asset: types.Asset) => void;
  onRemove?: (asset: types.Asset) => void;
  placeholder?: boolean;
}

export function TokenBalanceGrid({
  className,
  tokens,
  tokenStyle,
  allowDrag,
  onDrop,
  onRemove,
  placeholder,
}: TokenBalanceGridProps) {
  const [isDraggingOver, setIsDraggingOver] = React.useState(false);
  const handleDragOverStart = useCallback(
    () => setIsDraggingOver(true),
    [setIsDraggingOver]
  );
  const handleDragOverEnd = useCallback(
    () => setIsDraggingOver(false),
    [setIsDraggingOver]
  );
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!onDrop) {
        return;
      }
      event.preventDefault();
      try {
        const asset = JSON.parse(event.dataTransfer.getData("asset"));
        onDrop(types.asset.parse(asset));
      } catch (err) {
        console.warn("invalid drop data:" + err);
      }
      setIsDraggingOver(false);
    },
    [setIsDraggingOver, onDrop]
  );

  const onDragStart = useCallback(
    (balance: TokenBalance) => (event: React.DragEvent<HTMLDivElement>) => {
      const asset: types.Asset = {
        address: balance.contractAddress as types.Asset["address"],
        amount: balance.balance,
        id: balance.tokenID,
      };
      event.dataTransfer.setData("asset", JSON.stringify(asset));
      event.dataTransfer.effectAllowed = "move";
    },
    []
  );

  return (
    <div
      className={`tokenBalanceGrid ${className ?? ""}`}
      style={{
        ...(isDraggingOver && onDrop ? { background: "limegreen" } : {}),
      }}
      onDragOver={onDrop && ((e) => e.preventDefault())}
      onDrop={onDrop && handleDrop}
      onDragEnter={onDrop && handleDragOverStart}
      onDragLeave={onDrop && handleDragOverEnd}
    >
      {tokens.map((b) => {
        const balance = niceBalance(b);
        const balanceString = balance.toString();
        const isEmpty = balance.isZero();
        return (
          <div
            key={b.tokenID + b.contractAddress}
            className={`token ${isEmpty ? "isEmpty" : ""}`}
            style={tokenStyle}
            {...(allowDrag && !isEmpty
              ? {
                  draggable: true,
                  onDragStart: onDragStart(b),
                }
              : {})}
          >
            <img
              draggable={false}
              src={
                b.tokenMetadata?.image ??
                b.tokenMetadata?.image_data ??
                b.contractInfo?.logoURI
              }
            />
            <div className="balanceBubble">
              {balanceString.endsWith(".0")
                ? balanceString.replace(".0", "")
                : balanceString
                    .split(".")
                    .map((x, i) => (i === 1 ? x.slice(0, 2) : x))
                    .join(".")}
              {onRemove && (
                <button
                  className="removeBubble"
                  onClick={() =>
                    onRemove({
                      address: b.contractAddress as types.Asset["address"],
                      amount: b.balance,
                      id: b.tokenID,
                    })
                  }
                >
                  &times;
                </button>
              )}
            </div>
          </div>
        );
      })}
      {!tokens.length && placeholder && (
        <div className="placeholder token">Drag &amp; drop items to add</div>
      )}
    </div>
  );
}
