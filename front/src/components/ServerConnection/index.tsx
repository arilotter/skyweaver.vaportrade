import { getWallet } from "0xsequence";
import { NftSwapV3 } from "@traderxyz/nft-swap-sdk";
import { useEffect, useMemo, useState } from "react";
import { ReadyState } from "react-use-websocket";
import { Address, vtMessage, Trade } from "../../../../shared";
import { useWebSocket } from "../../useWebSocket";
import { Trades } from "../Trades";
import { WalletConnected } from "../WalletConnected";

import "./ServerConnection.css";

const socketURL = `ws://${window.location.hostname}${
  window.location.port ? `:${window.location.port}` : ""
}/api/`;

export function ServerConnection({ address }: { address: Address }) {
  const { sendJsonMessage, lastJsonMessage, readyState } =
    useWebSocket(socketURL);

  const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
  const [tradeRequests, setTradeRequests] = useState<Address[]>([]);

  useEffect(() => {
    if (readyState !== ReadyState.OPEN || !address) {
      return;
    }
    sendJsonMessage({
      type: "init",
      address,
    });
  }, [readyState, address, sendJsonMessage]);

  useEffect(() => {
    if (!lastJsonMessage) {
      return;
    }
    try {
      const msg = vtMessage.parse(lastJsonMessage);
      if (msg.type === "users") {
        const notMeUsers = msg.users.filter((u) => u !== address);
        setUsers(notMeUsers);
        const tradesImIn = tradeRequests.filter((u) => msg.users.includes(u));
        setTradeRequests(tradesImIn);
      } else if (msg.type === "trade_requests") {
        setTradeRequests(msg.from);
      } else if (msg.type === "trades") {
        setActiveTrades(msg.trades);
      }
    } catch (err) {
      console.error("failed to apply msg from server ", err);
    }
  }, [address, lastJsonMessage, tradeRequests]);

  const trader = useMemo(() => {
    const provider = getWallet().getProvider();
    if (!provider) {
      throw new Error("failed to get provider!");
    }
    return new NftSwapV3(provider, getWallet().getSigner(137), 137);
  }, []);

  const [users, setUsers] = useState<string[]>([]);

  return (
    <>
      <WalletConnected address={address} />
      {readyState !== ReadyState.OPEN ? (
        <div className="connectingToServer">Connecting to server...</div>
      ) : (
        <Trades
          users={users}
          trades={activeTrades}
          tradeRequests={tradeRequests}
          address={address}
          trader={trader}
          sendMessage={sendJsonMessage}
        ></Trades>
      )}
    </>
  );
}
