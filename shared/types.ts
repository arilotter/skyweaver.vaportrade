import type { SignedOrder, SwappableAsset } from "@traderxyz/nft-swap-sdk";
import { BigNumber, ethers } from "ethers";
import { z } from "zod";

export const address = z.string().refine(ethers.utils.isAddress);
export type Address = z.infer<typeof address>;

export const SW_CONTRACT = "0x631998e91476da5b870d741192fc5cbc55f5a52e";

export const USDC_CONTRACT = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174";

const bigNumberString = z.string().refine(
  (value) => {
    try {
      BigNumber.from(value);
      return true;
    } catch {
      return false;
    }
  },
  (val) => ({
    message: `${val} is not a valid BigNumber`,
  })
);
export const asset = z.union([
  z.object({
    address: z.literal(USDC_CONTRACT),
    amount: bigNumberString,
  }),
  z.object({
    address: z.literal(SW_CONTRACT),
    id: bigNumberString,
    amount: bigNumberString,
  }),
]);

export type Asset = z.infer<typeof asset>;

export function isSameAsset(a: Asset, b: Asset): boolean {
  return (
    a.address === b.address &&
    (a.address !== SW_CONTRACT || b.address !== SW_CONTRACT || a.id === b.id)
  );
}

export const order = z.object({
  makerAddress: address,
  takerAddress: address,
  feeRecipientAddress: address,
  senderAddress: address,
  makerAssetAmount: bigNumberString,
  takerAssetAmount: bigNumberString,
  makerFee: bigNumberString,
  takerFee: bigNumberString,
  expirationTimeSeconds: bigNumberString,
  salt: z.string(),
  makerAssetData: z.string(),
  takerAssetData: z.string(),
  makerFeeAssetData: z.string(),
  takerFeeAssetData: z.string(),
  signature: z.string(),
});
export const signedOrder = order.extend({
  signature: z.string(),
});

export const tradeParticipant = z.object({
  address: address,
  assets: z.array(asset),
  lockedIn: z.boolean(),
});

export type TradeParticipant = z.infer<typeof tradeParticipant>;

export const trade = z.object({
  users: z.array(tradeParticipant).length(2),
  feePayer: z.union([z.literal(0), z.literal(1)]),
  signedOrder: signedOrder.nullable(),
});

export type Trade = z.infer<typeof trade>;

const updateTradeMessageRequired = z.object({
  type: z.literal("update_trade"),
  with: address,
});
const updateTradeMessage = z.union([
  updateTradeMessageRequired.extend({ myOffer: z.array(asset) }),
  updateTradeMessageRequired.extend({ iPayFees: z.boolean() }),
  updateTradeMessageRequired.extend({ lockIn: z.boolean() }),
  updateTradeMessageRequired.extend({ signedOrder: signedOrder }),
]);

export const vtMessage = z.union([
  z.object({
    type: z.literal("init"),
    address: address,
  }),
  z.object({
    type: z.literal("users"),
    users: z.array(address),
  }),
  z.object({
    type: z.literal("trade_request"),
    address: address,
  }),
  z.object({
    type: z.literal("trade_requests"),
    from: z.array(address),
  }),
  z.object({
    type: z.literal("trades"),
    trades: z.array(trade),
  }),
  updateTradeMessage,
]);

export type VTMessage = z.infer<typeof vtMessage>;
