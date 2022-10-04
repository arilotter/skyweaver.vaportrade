import { getWallet, initWallet, Wallet } from "0xsequence";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import skyweaverLogo from "./assets/sw.png";

import sequenceLogo from "./assets/sequence-icon.svg";
import sequenceWordmark from "./assets/sequence-wordmark.svg";
import vaportradeIcon from "./assets/vaportrade.png";

await initWallet("polygon");

function Connect({
  afterConnect,
}: {
  afterConnect: (wallet: Wallet) => JSX.Element;
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
  if (!connected) {
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
                theme: "gray",
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
  return afterConnect(getWallet());
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <header className="title">
      <img src={vaportradeIcon} style={{ paddingLeft: "8px", height: "60%" }} />{" "}
      &times;
      <img src={skyweaverLogo} style={{ paddingLeft: "8px", height: "60%" }} />
    </header>
    <Connect
      afterConnect={(wallet) => {
        return <App wallet={wallet} />;
      }}
    />
  </React.StrictMode>
);
