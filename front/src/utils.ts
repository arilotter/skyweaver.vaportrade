import { TokenBalance } from "@0xsequence/indexer";
import { BigNumber, FixedNumber } from "ethers";

export function niceBalance(b: TokenBalance): FixedNumber {
  const decimals = b.tokenMetadata?.decimals ?? b.contractInfo?.decimals ?? 0;
  const denominator = FixedNumber.from(BigNumber.from(10).pow(decimals));
  const balance = FixedNumber.from(b.balance).divUnsafe(denominator);
  return balance;
}
