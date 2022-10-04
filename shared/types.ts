export type Address = string;
export function isAddress(x: unknown): x is Address {
  return typeof x === "string" && x.startsWith("0x");
}

export const SW_CONTRACT = "0x631998e91476da5b870d741192fc5cbc55f5a52e";
export function isSwContract(x: unknown): x is typeof SW_CONTRACT {
  return x === SW_CONTRACT;
}

export const USDC_CONTRACT = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174";
export function isUdscContract(x: unknown): x is typeof SW_CONTRACT {
  return x === USDC_CONTRACT;
}

export type Asset =
  | {
      address: typeof USDC_CONTRACT;
      amount: string;
    }
  | {
      address: typeof SW_CONTRACT;
      id: string;
      amount: string;
    };

export function isAsset(x: unknown): x is Asset {
  return (
    !!x &&
    typeof x === "object" &&
    "address" in x &&
    (isUdscContract((x as { address: unknown }).address) ||
      (isSwContract((x as { address: unknown }).address) &&
        "id" in x &&
        typeof (x as { id: unknown }).id === "string")) &&
    "amount" in x &&
    typeof (x as { amount: unknown }).amount === "string"
  );
}

export function isSameAsset(a: Asset, b: Asset): boolean {
  return (
    a.address === b.address &&
    (a.address !== SW_CONTRACT || b.address !== SW_CONTRACT || a.id === b.id)
  );
}

export interface Trade {
  userA: Address;
  userB: Address;
  feePayer: "a" | "b";
  aAssets: Asset[];
  bAssets: Asset[];
  aLockedIn: boolean;
  bLockedIn: boolean;
}

// TODO isTrade
export function isTrade(x: unknown): x is Trade {
  return typeof x === "object";
}

// TODO isVTMessage
export function isVTMessage(x: unknown): x is VTMessage {
  return typeof x === "object";
}

export type VTMessage =
  | {
      type: "init";
      address: Address;
    }
  | { type: "users"; users: Address[] }
  | {
      type: "trade_request";
      address: Address;
    }
  | { type: "trade_requests"; from: Address[] }
  | { type: "trades"; trades: Trade[] }
  | UpdateTradeMessage;

export type UpdateTradeMessage = { type: "update_trade"; with: Address } & (
  | {
      myOffer: Asset[];
    }
  | { iPayFees: boolean }
);
