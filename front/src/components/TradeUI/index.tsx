import { TokenBalance } from "@0xsequence/indexer";
import { BigNumber, FixedNumber } from "ethers";
import { useCallback } from "react";
import {
  Address,
  Asset,
  isSameAsset,
  SW_CONTRACT,
  Trade,
  USDC_CONTRACT,
} from "../../../../shared";
import { niceBalance } from "../../utils";
import { Header } from "../Header";
import { TokenBalanceGrid } from "../TokenBalanceGrid";

import "./TradeUI.css";

export function TradeUI({
  address,
  trade,
  setMyTradeOffer,
  setIPayFees,
  lockIn,
  style,
  tokenBalances,
}: {
  address: Address;
  trade: Trade;
  setMyTradeOffer: (assets: Asset[]) => void;
  setIPayFees: (iPayFees: boolean) => void;
  lockIn: () => void;
  style?: React.CSSProperties;
  tokenBalances: Map<Address, TokenBalance[]>;
}) {
  const iPayFees = trade.feePayer === (address === trade.userA ? "a" : "b");
  const me =
    address === trade.userA
      ? { addr: trade.userA, assets: trade.aAssets, lockedIn: trade.aLockedIn }
      : { addr: trade.userB, assets: trade.bAssets, lockedIn: trade.bLockedIn };
  const them =
    address === trade.userB
      ? { addr: trade.userA, assets: trade.aAssets, lockedIn: trade.aLockedIn }
      : { addr: trade.userB, assets: trade.bAssets, lockedIn: trade.bLockedIn };

  const onDrop = useCallback(
    (asset: Asset) => {
      let newAssets = [...me.assets];
      const toModify = me.assets.find((a) => isSameAsset(a, asset));
      const remainingAmount = BigNumber.from(asset.amount);
      const amountToAdd = remainingAmount.gt(100)
        ? BigNumber.from("100")
        : remainingAmount;
      if (asset.address === SW_CONTRACT) {
        if (toModify) {
          toModify.amount = BigNumber.from(toModify.amount)
            .add(amountToAdd)
            .toString();
        } else {
          newAssets.push({ ...asset, amount: amountToAdd.toString() });
        }
      } else {
        const tokenData = tokenBalances.get(address);
        if (!tokenData) {
          return;
        }
        const usdcAsset = tokenData.find(
          (td) => td.contractAddress === USDC_CONTRACT
        );
        if (!usdcAsset) {
          return;
        }
        const remainingUSDCAmount = niceBalance({
          ...usdcAsset,
          balance: asset.amount,
        });
        const amount = prompt(
          `How much USDC do you want to add? You have ${remainingUSDCAmount} left.`
        );
        if (!amount) {
          return;
        }
        const decimals =
          usdcAsset.tokenMetadata?.decimals ??
          usdcAsset.contractInfo?.decimals ??
          0;
        const tenToDecimals = FixedNumber.from(
          BigNumber.from(10).pow(decimals)
        );
        const balance = FixedNumber.from(amount)
          .mulUnsafe(tenToDecimals)
          .toString();
        if (!balance.endsWith(".0")) {
          throw new Error("Invalid bignumber!");
        }
        const bnBalance = BigNumber.from(balance.split(".")[0]);
        if (toModify) {
          toModify.amount = BigNumber.from(toModify.amount)
            .add(bnBalance)
            .toString();
        } else {
          newAssets.push({
            ...asset,
            amount: bnBalance.toString(),
          });
        }
      }

      setMyTradeOffer(newAssets);
    },
    [trade]
  );
  const onRemove = useCallback(
    (asset: Asset) => {
      const newAssets = me.assets.filter((a) => {
        if (asset.address === SW_CONTRACT && a.address === SW_CONTRACT) {
          return asset.id !== a.id;
        } else {
          return asset.address !== a.address;
        }
      });
      setMyTradeOffer(newAssets);
    },
    [address, trade]
  );
  return (
    <div style={style}>
      <Header address={me.addr} isYou />
      <TokenBalanceGrid
        tokens={me.assets
          .map((asset) => {
            const meta = tokenBalances
              .get(me.addr)
              ?.find(
                (bal) =>
                  bal.contractAddress === asset.address &&
                  (asset.address !== SW_CONTRACT || asset.id === bal.tokenID)
              );
            if (meta) {
              return { ...meta, balance: asset.amount };
            }
          })
          .filter((x): x is TokenBalance => !!x)}
        placeholder
        onDrop={onDrop}
        onRemove={onRemove}
        tokenStyle={{
          height: "128px",
        }}
      />
      <div className="lockInContainer">
        <button disabled={me.lockedIn} onClick={lockIn}>
          &#x1F512; Lock{me.lockedIn ? "ed" : ""} In &#x1F512;
        </button>
      </div>
      <div className="feesSelector">
        <label>
          <input
            type="radio"
            disabled={Boolean(me.lockedIn)}
            onChange={(e) => {
              if (e.target.checked) setIPayFees(true);
            }}
            checked={iPayFees}
          />
          I'll pay fees
        </label>
        <div>⇵</div>
        <label>
          <input
            type="radio"
            disabled={Boolean(me.lockedIn)}
            onChange={(e) => {
              if (e.target.checked) setIPayFees(false);
            }}
            checked={!iPayFees}
          />
          They'll pay fees
        </label>
      </div>
      <Header address={them.addr} isYou={false} />
      <TokenBalanceGrid
        tokens={them.assets
          .map((asset) => {
            const meta = tokenBalances
              .get(them.addr)
              ?.find(
                (bal) =>
                  bal.contractAddress === asset.address &&
                  (asset.address !== SW_CONTRACT || asset.id === bal.tokenID)
              );
            if (meta) {
              return { ...meta, balance: asset.amount };
            }
          })
          .filter((x): x is TokenBalance => !!x)}
        tokenStyle={{
          height: "128px",
        }}
      />
    </div>
  );
}
