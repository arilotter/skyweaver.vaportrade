import { Wallet } from "0xsequence";
import { useEffect, useMemo, useState } from "react";
import { ReadyState } from "react-use-websocket";
import { Trade, isVTMessage, VTMessage, Address } from "../../../../shared";
import { Trades } from "../Trades";
import { useWebSocket } from "../../useWebSocket";
import { NftSwapV3 } from "@traderxyz/nft-swap-sdk";
import { WalletConnected } from "../WalletConnected";

import "./ServerConnection.css";

const socketURL = `ws://${window.location.hostname}:6969`;

export function ServerConnection({
  wallet,
  address,
}: {
  wallet: Wallet;
  address: Address;
}) {
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
  }, [readyState, address]);

  useEffect(() => {
    if (!lastJsonMessage || !isVTMessage(lastJsonMessage)) {
      return;
    }
    const msg: VTMessage = lastJsonMessage;
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
  }, [lastJsonMessage]);

  const trader = useMemo(
    () => new NftSwapV3(wallet.getProvider()!, wallet.getSigner(), 137, {}),
    [wallet]
  );

  const [users, setUsers] = useState<string[]>([]);

  return (
    <>
      <WalletConnected wallet={wallet} address={address} />
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
