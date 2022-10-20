import { initWallet } from "0xsequence";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./index.css";

await initWallet("polygon");
const root = document.getElementById("root");
if (!root) {
  throw new Error("failed to mount react, no root element in html");
}
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
