import { Connect } from "./components/ConnectButton";
import { ServerConnection } from "./components/ServerConnection";

import skyweaverLogo from "./assets/sw.png";
import vaportradeIcon from "./assets/vaportrade.png";

import "./App.css";
import { useState } from "react";
import { Credits } from "./components/Credits";

export function App() {
  const [credits, setCredits] = useState(false);
  return (
    <>
      <header className="title" onClick={() => setCredits(true)}>
        <img src={vaportradeIcon} />
        &times;
        <img src={skyweaverLogo} />
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
