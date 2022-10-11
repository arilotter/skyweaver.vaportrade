import { sequence } from "0xsequence";
import { TokenBalance } from "@0xsequence/indexer";
import { randomBytes } from "@ethersproject/random";
import { NftSwapV3, SignedOrder } from "@traderxyz/nft-swap-sdk";
import { BigNumber, FixedNumber } from "ethers";
import { useCallback, useEffect, useState } from "react";
import {
  Address,
  Asset,
  isSameAsset,
  SW_CONTRACT,
  Trade,
  USDC_CONTRACT,
  makeSwappableAsset,
} from "../../../../shared";
import { niceBalance } from "../../utils";
import { Header } from "../Header";
import { LockIn } from "../LockIn";
import { TokenBalanceGrid } from "../TokenBalanceGrid";

import "./TradeUI.css";

export function TradeUI({
  address,
  trade,
  setMyTradeOffer,
  setIPayFees,
  setLockedIn,
  setSignedOrder,
  style,
  tokenBalances,
  trader,
}: {
  address: Address;
  trade: Trade;
  trader: NftSwapV3;
  setMyTradeOffer: (assets: Asset[]) => void;
  setIPayFees: (iPayFees: boolean) => void;
  setLockedIn: (lockedIn: boolean) => void;
  setSignedOrder: (signedOrder: SignedOrder) => void;
  style?: React.CSSProperties;
  tokenBalances: Map<Address, TokenBalance[]>;
}) {
  const meIndex = trade.users.findIndex((t) => t.address === address);
  const me = trade.users[meIndex];
  const them = trade.users[1 - meIndex];
  const iPayFees = meIndex === trade.feePayer;

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

  useEffect(() => {
    if (me.lockedIn && them.lockedIn && !iPayFees && !trade.signedOrder) {
      const expiryTime = new Date(new Date().getTime() + 5 * 60000); // now + 5m
      const order = trader.buildOrder(
        me.assets.map(makeSwappableAsset),
        them.assets.map(makeSwappableAsset),
        me.address,
        {
          takerAddress: them.address,
          chainId: 137,
          salt: BigNumber.from([1, 2, 7, 3, ...randomBytes(28)]).toString(), // get a real salt to sign this order
          expiration: expiryTime,
        }
      );
      // pop wallet to sign :)
      trader
        .signOrder(order, me.address, undefined, {
          signatureType: "eip1271",
        })
        .then((signedOrder) => {
          setSignedOrder(signedOrder);
        })
        .catch((err) => {
          setLockedIn(false);
          alert(err);
        });
    }
  }, [trade]);

  // Check if we need to approve any tokens for swapping
  const [requiredApprovals, setRequiredApprovals] = useState<Asset[]>([]);
  const updateApprovalStatuses = useCallback(() => {
    (async () => {
      const statuses = await Promise.all(
        me.assets.map((item) =>
          trader
            .loadApprovalStatus(makeSwappableAsset(item), address)
            .then((status) => ({
              item,
              stillNeedsApproval:
                !status.tokenIdApproved && !status.contractApproved,
            }))
        )
      );
      setRequiredApprovals(
        statuses.filter((t) => t.stillNeedsApproval).map((i) => i.item)
      );
    })();
  }, [trade]);
  useEffect(() => {
    updateApprovalStatuses();
  }, [trade, updateApprovalStatuses]);

  const tradeState = !me.lockedIn
    ? "lock_in"
    : !them.lockedIn
    ? "waiting_for_partner"
    : iPayFees
    ? trade.signedOrder
      ? "submit_order"
      : "waiting_for_partner"
    : trade.signedOrder
    ? "waiting_for_partner"
    : "waiting_for_signature";

  return (
    <div style={style}>
      <Header address={me.address} isYou />
      <TokenBalanceGrid
        tokens={me.assets
          .map((asset) => {
            const meta = tokenBalances
              .get(me.address)
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
          width: "128px",
        }}
      />
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
          I pay gas
        </label>
        <LockIn
          state={tradeState}
          onClick={() => {
            if (tradeState === "submit_order") {
              trader
                .fillSignedOrder(trade.signedOrder!, undefined, {
                  gasLimit: 100000000000000,
                })
                .then(() => {
                  alert("Trade success!");
                });
            } else {
              setLockedIn(true);
            }
          }}
        />
        <label>
          <input
            type="radio"
            disabled={Boolean(me.lockedIn)}
            onChange={(e) => {
              if (e.target.checked) setIPayFees(false);
            }}
            checked={!iPayFees}
          />
          They pay gas
        </label>
      </div>
      <Header address={them.address} isYou={false} />
      <TokenBalanceGrid
        tokens={them.assets
          .map((asset) => {
            const meta = tokenBalances
              .get(them.address)
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
          width: "128px",
        }}
      />
    </div>
  );
}
