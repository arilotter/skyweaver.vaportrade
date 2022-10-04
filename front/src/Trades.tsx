import {
  Address,
  Asset,
  isAsset,
  isSameAsset,
  SW_CONTRACT,
  Trade,
  UpdateTradeMessage,
  isSwContract,
  USDC_CONTRACT,
  VTMessage,
} from "../../shared";
import { SequenceIndexerClient, TokenBalance } from "@0xsequence/indexer";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { NftSwapV3 } from "@traderxyz/nft-swap-sdk";
import { niceBalance } from "./utils";
import { BigNumber } from "@ethersproject/bignumber";
import Blocky from "react-blockies";
import "./Trades.css";
import { UsersList } from "./UsersList";
import { FixedNumber } from "ethers";

export function Trades({
  trades,
  address,
  trader,
  users,
  tradeRequests,
  sendMessage,
}: {
  users: Address[];
  tradeRequests: Address[];
  trades: Trade[];
  address: Address;
  trader: NftSwapV3;
  sendMessage: (msg: VTMessage) => void;
}) {
  const [lastNumTrades, setLastNumTrades] = useState(trades.length);
  const [activeTradePartner, setActiveTrade] = useState<Address | null>(null);

  const [allAddresses, setAllAddresses] = useState<Set<string>>(new Set());
  const [refreshToken, setRefreshToken] = useState(0);
  const [tokenBalances, setTokenBalances] = useState<
    Map<Address, TokenBalance[]>
  >(new Map());

  // If we start a trade, pick it.
  useEffect(() => {
    if (trades.length && lastNumTrades < trades.length) {
      const newTrade = trades[trades.length - 1];
      setActiveTrade(
        newTrade.userA === address ? newTrade.userB : newTrade.userA
      );
    }
    setLastNumTrades(trades.length);
  }, [trades, setActiveTrade, lastNumTrades]);

  // Drop active trade if it disappears from trades list
  useEffect(() => {
    if (
      activeTradePartner &&
      !trades.some(
        (trade) =>
          trade.userA === activeTradePartner ||
          trade.userB === activeTradePartner
      )
    ) {
      if (trades.length > 0) {
        const newTrade = trades[trades.length - 1];
        setActiveTrade(
          newTrade.userA === address ? newTrade.userB : newTrade.userA
        );
      } else {
        setActiveTrade(null);
      }
    }
  }, [trades, activeTradePartner, setActiveTrade]);

  // Refresh everyone's balances when we change set of addresses!
  useEffect(() => {
    setTokenBalances(new Map());
    void refreshToken;
    Promise.all(
      [...allAddresses].map((addr) =>
        Promise.all([
          indexer
            .getTokenBalances({
              accountAddress: addr,
              contractAddress: USDC_CONTRACT,
              includeMetadata: true,
            })
            .then((b) => b.balances),
          getTokenBalancesAll(addr),
        ]).then((bals) => [addr, bals.flat()] as const)
      )
    ).then((allBalances) => setTokenBalances(new Map(allBalances)));
  }, [refreshToken, allAddresses]);

  // Refresh set of addresses when trades change, but only if needed
  useEffect(() => {
    const tradeAddresses = new Set(trades.flatMap((t) => [t.userA, t.userB]));
    const hasNewAddress = [...tradeAddresses].some((a) => !allAddresses.has(a));
    if (hasNewAddress) {
      setAllAddresses(tradeAddresses);
    }
  }, [trades]);

  const activeTrade = activeTradePartner
    ? trades.find(
        (t) => t.userB === activeTradePartner || t.userA === activeTradePartner
      )
    : null;

  const partner = activeTrade
    ? address === activeTrade.userA
      ? activeTrade.userB
      : activeTrade.userA
    : null;

  const myItems = activeTrade
    ? address === activeTrade.userA
      ? activeTrade.aAssets
      : activeTrade.bAssets
    : null;

  let tokenBalancesMinusActiveTrade: TokenBalance[] = [];
  if (myItems && tokenBalances.has(address)) {
    const allTokens = tokenBalances.get(address)!;
    tokenBalancesMinusActiveTrade = allTokens.map((t) => {
      const inTrade = myItems.find(
        (i) =>
          i.address === t.contractAddress &&
          (i.address !== SW_CONTRACT || i.id === t.tokenID)
      );
      return {
        ...t,
        balance: BigNumber.from(t.balance)
          .sub(inTrade?.amount ?? 0)
          .toString(),
      };
    });
  }

  return (
    <div>
      <div className="tradesTabs">
        <label htmlFor={"browser"} className="tradesTab">
          Trade Requests
          <input
            id={"browser"}
            type="radio"
            checked={activeTrade === null}
            onChange={() => setActiveTrade(null)}
          />
        </label>
        {trades.map((t) => {
          const notMe = t.userA === address ? t.userB : t.userA;
          return (
            <label key={`${notMe}-radio`} className="tradesTab">
              <Blocky
                className="blocky"
                seed={notMe.toUpperCase()}
                size={8}
                scale={2}
              />
              {notMe}
              <input
                type="radio"
                checked={t === activeTrade}
                onChange={() => setActiveTrade(notMe)}
              />
            </label>
          );
        })}
      </div>
      {!!(activeTrade && partner) ? (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              columnGap: "10px",
            }}
          >
            <div>
              <h2 className="yourItemsHeader">
                Your items ({tokenBalancesMinusActiveTrade.length})
                <button
                  className="refreshButton"
                  onClick={() => setRefreshToken(refreshToken + 1)}
                >
                  &#8635;
                </button>
              </h2>
              <FilterTokenBalanceGrid
                tokens={tokenBalancesMinusActiveTrade}
                className={"myTokens"}
                allowDrag
                tokenStyle={{
                  height: "200px",
                }}
              />
            </div>
            <TradeUI
              key={activeTrade.userA + activeTrade.userB}
              address={address}
              trade={activeTrade}
              tokenBalances={tokenBalances}
              style={{
                maxHeight: "100%",
              }}
              setIPayFees={(iPayFees) =>
                sendMessage({
                  type: "update_trade",
                  with: partner,
                  iPayFees,
                })
              }
              setMyTradeOffer={(myOffer) =>
                sendMessage({
                  type: "update_trade",
                  with: partner,
                  myOffer,
                })
              }
            />
          </div>
        </>
      ) : (
        <UsersList
          users={users.filter(
            (u) => !trades.some((t) => t.userA === u || t.userB === u)
          )}
          tradeRequests={tradeRequests}
          sendTradeRequest={(address) => {
            sendMessage({
              type: "trade_request",
              address,
            });
          }}
        ></UsersList>
      )}
    </div>
  );
}

function TradeUI({
  address,
  trade,
  setMyTradeOffer,
  setIPayFees,
  style,
  tokenBalances,
}: {
  address: Address;
  trade: Trade;
  setMyTradeOffer: (assets: Asset[]) => void;
  setIPayFees: (iPayFees: boolean) => void;
  style?: React.CSSProperties;
  tokenBalances: Map<Address, TokenBalance[]>;
}) {
  const lockedIn = false;

  const iPayFees = trade.feePayer === (address === trade.userA ? "a" : "b");
  const me =
    address === trade.userA
      ? { addr: trade.userA, assets: trade.aAssets }
      : { addr: trade.userB, assets: trade.bAssets };
  const them =
    address === trade.userB
      ? { addr: trade.userA, assets: trade.aAssets }
      : { addr: trade.userB, assets: trade.bAssets };

  const onDrop = useCallback(
    (asset: Asset) => {
      let newAssets = [...me.assets];
      const toModify = me.assets.find((a) => isSameAsset(a, asset));
      const remainingAmount = BigNumber.from(asset.amount);
      const amountToAdd = remainingAmount.gt(100)
        ? BigNumber.from("100")
        : remainingAmount;
      if (asset.address === SW_CONTRACT) {
        if (toModify) {
          toModify.amount = BigNumber.from(toModify.amount)
            .add(amountToAdd)
            .toString();
        } else {
          newAssets.push({ ...asset, amount: amountToAdd.toString() });
        }
      } else {
        debugger;
        const tokenData = tokenBalances.get(address);
        if (!tokenData) {
          return;
        }
        const usdcAsset = tokenData.find(
          (td) => td.contractAddress === USDC_CONTRACT
        );
        if (!usdcAsset) {
          return;
        }
        const remainingUSDCAmount = niceBalance({
          ...usdcAsset,
          balance: asset.amount,
        });
        const amount = prompt(
          `How much USDC do you want to add? You have ${remainingUSDCAmount} left.`
        );
        if (!amount) {
          return;
        }
        const decimals =
          usdcAsset.tokenMetadata?.decimals ??
          usdcAsset.contractInfo?.decimals ??
          0;
        const tenToDecimals = FixedNumber.from(
          BigNumber.from(10).pow(decimals)
        );
        console.log(amount);
        const balance = FixedNumber.from(amount)
          .mulUnsafe(tenToDecimals)
          .toString();
        if (!balance.endsWith(".0")) {
          throw new Error("Invalid bignumber!");
        }
        const bnBalance = BigNumber.from(balance.split(".")[0]);
        if (toModify) {
          toModify.amount = BigNumber.from(toModify.amount)
            .add(bnBalance)
            .toString();
        } else {
          newAssets.push({
            ...asset,
            amount: bnBalance.toString(),
          });
        }
      }

      setMyTradeOffer(newAssets);
    },
    [trade]
  );
  const onRemove = useCallback(
    (asset: Asset) => {
      const newAssets = me.assets.filter((a) => {
        if (asset.address === SW_CONTRACT && a.address === SW_CONTRACT) {
          return asset.id !== a.id;
        } else {
          return asset.address !== a.address;
        }
      });
      setMyTradeOffer(newAssets);
    },
    [address, trade]
  );
  return (
    <div style={style} className="tradeUI">
      <Header address={me.addr} isYou />
      <TokenBalanceGrid
        tokens={me.assets
          .map((asset) => {
            const meta = tokenBalances
              .get(me.addr)
              ?.find(
                (bal) =>
                  bal.contractAddress === asset.address &&
                  (asset.address !== SW_CONTRACT || asset.id === bal.tokenID)
              );
            if (meta) {
              return { ...meta, balance: asset.amount };
            }
          })
          .filter((x): x is TokenBalance => !!x)}
        placeholder
        onDrop={onDrop}
        onRemove={onRemove}
        tokenStyle={{
          height: "128px",
        }}
      />
      <div className="feesSelector">
        <label>
          <input
            type="radio"
            disabled={Boolean(lockedIn)}
            onChange={(e) => {
              if (e.target.checked) setIPayFees(true);
            }}
            checked={iPayFees}
          />
          I'll pay fees
        </label>
        <div>⇵</div>
        <label>
          <input
            type="radio"
            disabled={Boolean(lockedIn)}
            onChange={(e) => {
              if (e.target.checked) setIPayFees(false);
            }}
            checked={!iPayFees}
          />
          They'll pay fees
        </label>
      </div>
      <Header address={them.addr} isYou={false} />
      <TokenBalanceGrid
        tokens={them.assets
          .map((asset) => {
            const meta = tokenBalances
              .get(them.addr)
              ?.find(
                (bal) =>
                  bal.contractAddress === asset.address &&
                  (asset.address !== SW_CONTRACT || asset.id === bal.tokenID)
              );
            if (meta) {
              return { ...meta, balance: asset.amount };
            }
          })
          .filter((x): x is TokenBalance => !!x)}
      />
    </div>
  );
}

const indexer = new SequenceIndexerClient(
  "https://polygon-indexer.sequence.app"
);

interface FilterTokenBalanceGridProps extends TokenBalanceGridProps {}

function FilterTokenBalanceGrid(props: FilterTokenBalanceGridProps) {
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

interface TokenBalanceGridProps {
  tokens: TokenBalance[];
  className?: string;
  tokenStyle?: React.CSSProperties;
  allowDrag?: boolean;
  onDrop?: (asset: Asset) => void;
  onRemove?: (asset: Asset) => void;
  placeholder?: boolean;
}

function TokenBalanceGrid({
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
      const asset = JSON.parse(event.dataTransfer.getData("asset"));
      if (isAsset(asset)) {
        onDrop(asset);
      }
      setIsDraggingOver(false);
    },
    [setIsDraggingOver, onDrop]
  );

  const onDragStart = useCallback(
    (balance: TokenBalance) => (event: React.DragEvent<HTMLDivElement>) => {
      const asset: Asset = {
        address: balance.contractAddress as any,
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
                      address: b.contractAddress as any,
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

function Header({ address, isYou }: { address: string; isYou: boolean }) {
  return (
    <div className="header">
      <Blocky
        className="blocky"
        seed={address.toUpperCase()}
        size={8}
        scale={6}
      />
      <div className="headerText">
        <h2>{isYou ? "Your" : "Their"} offer</h2>
        <h4>
          These are the items you'll {isYou ? "lose" : "get"} in the trade
        </h4>
      </div>
    </div>
  );
}

async function getTokenBalancesAll(addr: Address): Promise<TokenBalance[]> {
  let nextPage: number = 0;
  const allBalances = [];
  while (nextPage !== -1) {
    const { page, balances } = await indexer.getTokenBalances({
      accountAddress: addr,
      contractAddress: SW_CONTRACT,
      includeMetadata: true,
      page: {
        page: nextPage,
      },
    });
    allBalances.push(...balances);
    if (page.more && page.page) {
      nextPage = page.page;
    } else {
      nextPage = -1;
    }
    await new Promise((res) => setTimeout(res, 300));
  }
  return allBalances;
}
