import { SequenceIndexerClient, TokenBalance } from "@0xsequence/indexer";
import { BigNumber } from "@ethersproject/bignumber";
import { NftSwapV3 } from "@traderxyz/nft-swap-sdk";
import { useEffect, useState } from "react";
import Blocky from "react-blockies";
import {
  Address,
  SW_CONTRACT,
  Trade,
  USDC_CONTRACT,
  VTMessage,
} from "../../../../shared";
import { FilterTokenBalanceGrid } from "../FilterTokenBalanceGrid";
import { ResponsiveAddress } from "../ResponsiveAddress";
import { TradeUI } from "../TradeUI";
import { UsersList } from "../UsersList";
import "./Trades.css";

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
              <ResponsiveAddress address={notMe} />
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
          <div className="activeTradeContainer">
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
              <div className="loadingBalances">
                {tokenBalances.size === 0 && "Loading items..."}
              </div>
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
              lockIn={() => {
                sendMessage({
                  type: "update_trade",
                  with: partner,
                  lockIn: true,
                });
              }}
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

const indexer = new SequenceIndexerClient(
  "https://polygon-indexer.sequence.app"
);

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
