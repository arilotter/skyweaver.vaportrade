import { NftSwapV3, Order, SignedOrder } from "@traderxyz/nft-swap-sdk";
import { WebSocket, WebSocketServer } from "ws";
import {
  Address,
  Trade,
  VTMessage,
  makeSwappableAsset,
  vtMessage,
} from "../../shared";
import { ethers } from "ethers";
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
  const tradesInvolvingMe = trades.filter((t) =>
    t.users.some((u) => u.address === address)
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
      const msg = vtMessage.parse(JSON.parse(rawMessage.toString("utf8")));
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
            trades.some((trade) => tradeIsBetweenUsers(trade, fromAddr, toAddr))
          ) {
            return; // trade already exists
          }
          trades.push({
            users: [
              {
                address: fromAddr,
                assets: [],
                lockedIn: false,
              },
              { address: toAddr, assets: [], lockedIn: false },
            ],
            feePayer: 0,
            signedOrder: null,
          });
          updateTradesInvolvingMe(fromAddr);
          updateTradesInvolvingMe(toAddr);
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
        const trade = trades.find((t) =>
          tradeIsBetweenUsers(t, msg.with, fromAddr)
        );
        if (!trade) {
          throw new Error("no trade in progress with that user!");
        }
        if ("iPayFees" in msg) {
          // TODO smelly code here.. do boolean reduction truth table jazz to simplify. i'm sleepy.
          const meIndex = trade.users.findIndex(
            ({ address }) => address === fromAddr
          ) as 0 | 1;
          trade.feePayer = msg.iPayFees ? meIndex : ((1 - meIndex) as 0 | 1);
          resetTradeOnChange(trade);
        } else if ("lockIn" in msg) {
          trade.users.find((u) => u.address === fromAddr)!.lockedIn =
            msg.lockIn;
          trade.signedOrder = null;
        } else if ("signedOrder" in msg) {
          const verificationErr = isOrderSameAsSignedOrder(
            msg.signedOrder,
            trade
          );
          if (typeof verificationErr === "string") {
            throw new Error(`Signed order is not correct - ${verificationErr}`);
          }
          trade.signedOrder = msg.signedOrder;
        } else if ("myOffer" in msg) {
          trade.users.find((u) => u.address === fromAddr)!.assets = msg.myOffer;
          resetTradeOnChange(trade);
        } else {
          const never: never = msg;
          throw new Error("unexpected trade message " + never);
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
      const tradesInvolvingMe = trades.filter((trade) =>
        trade.users.some(({ address }) => address === addr)
      );
      // remove trades involving me
      trades = trades.filter((trade) => !tradesInvolvingMe.includes(trade));
      const partnersAddrs = new Set(
        tradesInvolvingMe.flatMap((trade) => trade.users.map((u) => u.address))
      );
      for (const addr of partnersAddrs) {
        updateTradesInvolvingMe(addr);
      }
    }
    console.log("disconnected " + addr);
    sendUsersList();
  });
});

function resetTradeOnChange(trade: Trade) {
  trade.users.forEach((u) => (u.lockedIn = false));
  trade.signedOrder = null;
}

const trader = new NftSwapV3(
  new ethers.providers.JsonRpcProvider("https://nodes.sequence.app/polygon"),
  new ethers.VoidSigner("0"),
  137
);

function isOrderSameAsSignedOrder(
  signedOrder: SignedOrder,
  trade: Trade
): true | string {
  // if (
  //   !trader.verifyOrderSignature(
  //     signedOrder,
  //     signedOrder.signature,
  //     137,
  //     trader.exchangeContractAddress
  //   )
  // ) {
  //   return "swap SDK failed to verify order signature";
  // }

  // verify fee payer :)
  if (signedOrder.takerAddress !== trade.users[trade.feePayer].address) {
    return `fee payer is incorrect. expected ${signedOrder.takerAddress}, got ${
      trade.users[trade.feePayer].address
    }`;
  }

  const maker = trade.users[1 - trade.feePayer];
  const taker = trade.users[trade.feePayer];
  const order = trader.buildOrder(
    maker.assets.map(makeSwappableAsset),
    taker.assets.map(makeSwappableAsset),
    maker.address,
    {
      takerAddress: taker.address,
      chainId: 137,
    }
  );

  // make sure order is same as trade
  for (const key of Object.keys(verifyKeys) as Array<keyof typeof verifyKeys>) {
    if (verifyKeys[key] && order[key] !== signedOrder[key]) {
      return `order isn't the same as trade. under key ${key}, trade was ${order[key]}, but signedOrder was ${signedOrder[key]}`;
    }
  }

  // expiration time must be <5m from now
  const maxExpiryTime = Math.floor(new Date().getTime() / 1000) + 5 * 60; // now + 5m
  if (Number.parseInt(signedOrder.expirationTimeSeconds, 10) > maxExpiryTime) {
    return `Order expires in more than 5m.`;
  }

  // salt doesn't matter :)

  return true;
}

function tradeIsBetweenUsers({ users }: Trade, a: Address, b: Address) {
  return (
    (users[0].address === a && users[1].address === b) ||
    (users[0].address === b && users[1].address === a)
  );
}

const verifyKeys: { [K in keyof Order]: boolean } = {
  // expiration time manually verified
  expirationTimeSeconds: false,
  salt: false,
  signature: false,
  makerAddress: true,
  takerAddress: true,
  feeRecipientAddress: true,
  senderAddress: true,
  makerAssetAmount: true,
  takerAssetAmount: true,
  makerFee: true,
  takerFee: true,
  makerAssetData: true,
  takerAssetData: true,
  makerFeeAssetData: true,
  takerFeeAssetData: true,
};
