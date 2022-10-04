import { Wallet } from "0xsequence";
import { useEffect, useMemo, useState } from "react";
import { ReadyState } from "react-use-websocket";
import { Trade, isVTMessage, VTMessage, Address } from "../../shared";
import "./App.css";
import { Trades } from "./Trades";
import { useWebSocket } from "./useWebSocket";
import { NftSwapV3 } from "@traderxyz/nft-swap-sdk";
import Blocky from "react-blockies";

const socketURL = `ws://${window.location.hostname}:6969`;

function App({ wallet }: { wallet: Wallet }) {
  const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
  const [tradeRequests, setTradeRequests] = useState<Address[]>([]);
  const [address, setAddress] = useState("");

  const { sendJsonMessage, lastJsonMessage, readyState } =
    useWebSocket(socketURL);
  useEffect(() => {
    wallet.getAddress().then(setAddress);
  }, [address]);

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
    <div className="App">
      <div
        className="walletConnected"
        onClick={() => {
          wallet.openWallet();
        }}
      >
        <Blocky
          className="blocky"
          seed={address.toUpperCase()}
          size={8}
          scale={3}
        />
        {address.length > 14
          ? `${address.slice(0, 11)}...${address.slice(-4)}`
          : address}
        <button
          onClick={() => {
            wallet.disconnect();
          }}
        >
          &times;
        </button>
      </div>
      {readyState !== ReadyState.OPEN ? (
        "Connecting to server..."
      ) : (
        <>
          <Trades
            users={users}
            trades={activeTrades}
            tradeRequests={tradeRequests}
            address={address}
            trader={trader}
            sendMessage={sendJsonMessage}
          ></Trades>
        </>
      )}
    </div>
  );
}

export default App;
