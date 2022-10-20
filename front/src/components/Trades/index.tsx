import { SequenceIndexerClient, TokenBalance } from "@0xsequence/indexer";
import { BigNumber } from "@ethersproject/bignumber";
import { NftSwapV3 } from "@traderxyz/nft-swap-sdk";
import { useEffect, useMemo, useState } from "react";
import Blocky from "react-blockies";
import {
  Address,
  SW_CONTRACT,
  Trade,
  USDC_CONTRACT,
  VTMessage,
} from "../../../../shared";
import { ResponsiveAddress } from "../ResponsiveAddress";
import { TokenBalanceGrid } from "../TokenBalanceGrid";
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
  // Drop active trade if it disappears from trades list
  useEffect(() => {
    if (trades.length && lastNumTrades !== trades.length) {
      const newTrade = trades[trades.length - 1];
      setActiveTrade(
        newTrade.users.find((u) => u.address !== address)?.address ?? null
      );
    }
    setLastNumTrades(trades.length);
  }, [trades, setActiveTrade, lastNumTrades, address]);

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
    const tradeAddresses = new Set(
      trades.flatMap((t) => t.users.map((u) => u.address))
    );
    const hasNewAddress = [...tradeAddresses].some((a) => !allAddresses.has(a));
    if (hasNewAddress) {
      setAllAddresses(tradeAddresses);
    }
  }, [trades, allAddresses]);

  const activeTrade = useMemo(
    () =>
      activeTradePartner
        ? trades.find((t) =>
            t.users.some((u) => u.address === activeTradePartner)
          )
        : null,
    [trades, activeTradePartner]
  );

  const them = useMemo(
    () =>
      activeTrade ? activeTrade.users.find((u) => u.address !== address) : null,
    [activeTrade, address]
  );

  const me = useMemo(
    () =>
      activeTrade ? activeTrade.users.find((u) => u.address === address) : null,
    [activeTrade, address]
  );
  const tokenBalancesMinusActiveTrade = useMemo(() => {
    let bal: TokenBalance[] = [];
    if (me && tokenBalances.has(address)) {
      const allTokens = tokenBalances.get(address) ?? [];
      bal = allTokens.map((t) => {
        const inTrade = me.assets.find(
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
    return bal;
  }, [address, me, tokenBalances]);

  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const lowerSearch = search.toLowerCase().split(" ");
    return tokenBalancesMinusActiveTrade.filter((t) =>
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
  }, [tokenBalancesMinusActiveTrade, search]);
  return (
    <div className="trades">
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
          const notMe = t.users.find((t) => t.address !== address)?.address;
          if (!notMe) {
            throw new Error("got trade without us in it??");
          }
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
      {activeTrade && me && them ? (
        <>
          <div className="activeTradeContainer">
            <div className="yourItems">
              <div className="tradeHeader">
                <div className="tradeHeaderTitles">
                  <h2 className="yourItemsHeader">
                    Your items{" "}
                    <button
                      className="refreshButton"
                      onClick={() => setRefreshToken(refreshToken + 1)}
                    >
                      &#8635;
                    </button>
                  </h2>
                  <h4 className="yourItemsHeader">
                    You have {tokenBalancesMinusActiveTrade.length} unique items
                  </h4>
                </div>

                <input
                  className="gridSearch"
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={"Search names, prisms, elements, text..."}
                ></input>
              </div>
              <TokenBalanceGrid
                tokens={filtered}
                className={"myTokens"}
                allowDrag
                tokenStyle={{
                  height: "196px",
                  width: "128px",
                }}
              />
              <div className="loadingBalances">
                {tokenBalances.size === 0 && "Loading items..."}
              </div>
            </div>
            <TradeUI
              key={me.address + them.address}
              trader={trader}
              address={address}
              trade={activeTrade}
              tokenBalances={tokenBalances}
              style={{
                maxHeight: "100%",
              }}
              setIPayFees={(iPayFees) =>
                sendMessage({
                  type: "update_trade",
                  with: them.address,
                  iPayFees,
                })
              }
              setMyTradeOffer={(myOffer) =>
                sendMessage({
                  type: "update_trade",
                  with: them.address,
                  myOffer,
                })
              }
              setLockedIn={(lockIn) => {
                sendMessage({
                  type: "update_trade",
                  with: them.address,
                  lockIn,
                });
              }}
              setSignedOrder={(signedOrder) => {
                sendMessage({
                  type: "update_trade",
                  with: them.address,
                  signedOrder,
                });
              }}
            />
          </div>
        </>
      ) : (
        <UsersList
          users={users.filter(
            (u) => !trades.some((t) => t.users.some((tu) => tu.address === u))
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
  let nextPage = 0;
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
  }
  return allBalances;
}
