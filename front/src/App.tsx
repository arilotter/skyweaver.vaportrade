import { useEffect, useState } from "react";
import { Connect } from "./components/ConnectButton";
import { ServerConnection } from "./components/ServerConnection";

import skyweaverLogo from "./assets/sw.png";
import vaportradeIcon from "./assets/vaportrade.png";

export function App() {
  return (
    <>
      <header className="title">
        <img
          src={vaportradeIcon}
          style={{ paddingLeft: "8px", height: "60%" }}
        />{" "}
        &times;
        <img
          src={skyweaverLogo}
          style={{ paddingLeft: "8px", height: "60%" }}
        />
      </header>
      <Connect
        afterConnect={(wallet, address) => (
          <ServerConnection wallet={wallet} address={address} />
        )}
      />
    </>
  );
}
