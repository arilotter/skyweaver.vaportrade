import { getWallet } from "0xsequence";
import Blocky from "react-blockies";
import { Address } from "../../../../shared";
import { ResponsiveAddress } from "../ResponsiveAddress";

import "./WalletConnected.css";

export function WalletConnected({ address }: { address: Address }) {
  return (
    <div
      className="walletConnected"
      onClick={() => {
        getWallet().openWallet();
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
          getWallet().disconnect();
        }}
      >
        &times;
      </button>
    </div>
  );
}
