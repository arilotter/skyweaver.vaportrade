import { SwappableAsset } from "@traderxyz/nft-swap-sdk";
import { Asset, SW_CONTRACT } from "./types";

export * from "./types";

export function makeSwappableAsset(asset: Asset): SwappableAsset {
  if (asset.address === SW_CONTRACT) {
    return {
      type: "ERC1155",
      tokenAddress: asset.address,
      tokenId: asset.id,
      amount: asset.amount,
    };
  } else {
    return {
      type: "ERC20",
      amount: asset.amount,
      tokenAddress: asset.address,
    };
  }
}
