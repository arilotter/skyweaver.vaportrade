import { Connect } from "./components/ConnectButton";
import { ServerConnection } from "./components/ServerConnection";

import skyweaverLogo from "./assets/sw.png";
import vaportradeIcon from "./assets/vaportrade.png";

import { useState } from "react";
import "./App.css";
import { Credits } from "./components/Credits";

export function App() {
  const [credits, setCredits] = useState(false);
  return (
    <>
      <header className="title" onClick={() => setCredits(true)}>
        <img src={vaportradeIcon} />
        &times;
        <img
          src={skyweaverLogo}
          style={{
            height: "76%",
            paddingLeft: "12px",
          }}
        />
      </header>
      {credits && <Credits onClose={() => setCredits(false)} />}
      <Connect
        afterConnect={(wallet, address) => (
          <ServerConnection wallet={wallet} address={address} />
        )}
      />
    </>
  );
}
