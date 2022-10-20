import { initWallet } from "0xsequence";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

await initWallet("polygon");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
