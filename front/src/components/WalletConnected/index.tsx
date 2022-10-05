import { Wallet } from "0xsequence";
import Blocky from "react-blockies";
import { Address } from "../../../../shared";
import { ResponsiveAddress } from "../ResponsiveAddress";

import "./WalletConnected.css";

export function WalletConnected({
  wallet,
  address,
}: {
  wallet: Wallet;
  address: Address;
}) {
  return (
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
      <ResponsiveAddress address={address} />
      <button
        onClick={() => {
          wallet.disconnect();
        }}
      >
        &times;
      </button>
    </div>
  );
}
