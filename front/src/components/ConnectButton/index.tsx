import { getWallet, Wallet } from "0xsequence";
import { useState, useEffect } from "react";

import sequenceLogo from "./sequence-icon.svg";
import sequenceWordmark from "./sequence-wordmark.svg";

import "./ConnectButton.css";
import { Address } from "../../../../shared";

export function Connect({
  afterConnect,
}: {
  afterConnect: (wallet: Wallet, address: Address) => JSX.Element;
}) {
  const [connected, setConnected] = useState(getWallet().isConnected());
  useEffect(() => {
    getWallet().on("connect", () => setConnected(true));
    getWallet().on("disconnect", () => setConnected(false));

    const originalDisconnect = getWallet().disconnect.bind(getWallet());
    getWallet().disconnect = () => {
      originalDisconnect();
      setConnected(false);
    };
  });

  const [address, setAddress] = useState<Address | null>(null);

  useEffect(() => {
    if (connected) {
      getWallet().getAddress().then(setAddress);
    } else {
      setAddress(null);
    }
  }, [setAddress]);
  if (!connected || !address) {
    return (
      <div className="connectContainer">
        <button
          className="connectButton"
          onClick={() => {
            getWallet().connect({
              app: "Vaportrade x Skyweaver",
              authorize: true,
              networkId: "polygon",
              settings: {
                theme: "dark",
              },
            });
          }}
        >
          <span style={{ paddingRight: "8px" }}>Sign in with</span>
          <img
            src={sequenceLogo}
            alt="Sequence Wallet Logo"
            style={{ width: "29px", marginRight: "0.5rem" }}
          />
          <img
            src={sequenceWordmark}
            alt="The word 'Sequence'."
            style={{ width: "88px" }}
          />
        </button>
      </div>
    );
  }
  return afterConnect(getWallet(), address);
}
