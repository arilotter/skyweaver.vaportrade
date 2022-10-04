import { WebSocket, WebSocketServer } from "ws";
import { Address, Trade, VTMessage, isVTMessage } from "../../shared";
const wss = new WebSocketServer({ port: 6969 });

const wsToAddr = new Map<WebSocket, Address>();
const addrToWs = new Map<Address, WebSocket>();
let trades: Array<Trade> = [];

const tradeRequestsTo: Map<Address, Set<Address>> = new Map();

function sendUsersList() {
  const usersList: VTMessage = {
    type: "users",
    users: [...addrToWs.keys()],
  };
  for (const socket of wsToAddr.keys()) {
    socket.send(JSON.stringify(usersList));
  }
}

function updateTradesInvolvingMe(address: Address) {
  const tradesInvolvingMe = trades.filter(
    (t) => t.userA === address || t.userB === address
  );
  const client = addrToWs.get(address);
  if (client) {
    const msg: VTMessage = {
      type: "trades",
      trades: tradesInvolvingMe,
    };
    client.send(JSON.stringify(msg));
  }
}
wss.on("connection", (ws) => {
  console.log("connected");
  ws.on("message", (rawMessage) => {
    try {
      const msg = JSON.parse(rawMessage.toString("utf8"));
      if (!isVTMessage(msg)) {
        throw new Error("invalid message");
      }
      const isInitted = wsToAddr.has(ws);
      if (!isInitted && msg.type !== "init") {
        throw new Error("got non-init message before init!");
      }

      const fromAddr = wsToAddr.get(ws)!;

      if (msg.type === "init") {
        if (isInitted) {
          throw new Error("Got init message, but already initted!");
        }
        // TODO verify auth
        wsToAddr.set(ws, msg.address);
        addrToWs.set(msg.address, ws);
        sendUsersList();
        updateTradesInvolvingMe(msg.address);
      } else if (msg.type === "trade_request") {
        const { address: toAddr } = msg;

        const tradeReqToWs = addrToWs.get(toAddr);
        if (!tradeReqToWs) {
          throw new Error("got a trade request to an invalid user");
        }

        if (tradeRequestsTo.get(fromAddr)?.has(toAddr)) {
          // we're accepting a trade!
          tradeRequestsTo.get(fromAddr)!.delete(toAddr);
          if (
            !trades.some((trade) => {
              (trade.userA === fromAddr && trade.userB === toAddr) ||
                (trade.userB === fromAddr && trade.userA === toAddr);
            })
          ) {
            trades.push({
              userA: fromAddr,
              userB: toAddr,
              feePayer: "a",
              aAssets: [],
              bAssets: [],
            });
            updateTradesInvolvingMe(fromAddr);
            updateTradesInvolvingMe(toAddr);
          }
        } else {
          // we're sending the request!
          if (!tradeRequestsTo.has(msg.address)) {
            tradeRequestsTo.set(msg.address, new Set([fromAddr]));
          } else {
            tradeRequestsTo.get(msg.address)!.add(fromAddr);
          }
        }

        const tradeReqTo: VTMessage = {
          type: "trade_requests",
          from: [...(tradeRequestsTo.get(msg.address)?.values() ?? [])],
        };
        tradeReqToWs.send(JSON.stringify(tradeReqTo));
        const tradeReqFrom: VTMessage = {
          type: "trade_requests",
          from: [...(tradeRequestsTo.get(fromAddr)?.values() ?? [])],
        };
        ws.send(JSON.stringify(tradeReqFrom));
      } else if (msg.type === "update_trade") {
        const trade = trades.find(
          (t) =>
            (t.userA === fromAddr && t.userB === msg.with) ||
            (t.userA === msg.with && t.userB === fromAddr)
        );
        if (!trade) {
          throw new Error("no trade in progress with that user!");
        }
        if ("iPayFees" in msg) {
          // TODO smelly code here.. do boolean reduction truth table jazz to simplify. i'm sleepy.
          trade.feePayer = msg.iPayFees
            ? trade.userA === fromAddr
              ? "a"
              : "b"
            : trade.userA === fromAddr
            ? "b"
            : "a";
        } else {
          if (trade.userA === fromAddr) {
            trade.aAssets = msg.myOffer;
          } else {
            trade.bAssets = msg.myOffer;
          }
        }
        updateTradesInvolvingMe(fromAddr);
        updateTradesInvolvingMe(msg.with);
      } else {
        throw new Error("unexpected message type " + msg.type);
      }
    } catch (e) {
      console.warn("invalid message!", e);
      ws.close();
    }
  });
  ws.on("close", () => {
    const addr = wsToAddr.get(ws);
    if (addr) {
      wsToAddr.delete(ws);
      addrToWs.delete(addr);
      tradeRequestsTo.delete(addr);

      // Close trade if both users are offline
      const tradesInvolvingMe = trades.filter(
        (trade) => trade.userA === addr || trade.userB === addr
      );
      trades = trades.filter((trade) => !tradesInvolvingMe.includes(trade));
      const partnersAddrs = new Set(
        tradesInvolvingMe.flatMap((trade) => [trade.userA, trade.userB])
      );
      for (const addr of partnersAddrs) {
        updateTradesInvolvingMe(addr);
      }
    }
    console.log("disconnected " + addr);
    sendUsersList();
  });
});
