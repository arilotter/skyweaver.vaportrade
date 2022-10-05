import Blocky from "react-blockies";
import { ResponsiveAddress } from "../ResponsiveAddress";

import "./UsersList.css";

export function UsersList({
  users,
  tradeRequests,
  sendTradeRequest,
}: {
  users: string[];
  tradeRequests: string[];
  sendTradeRequest: (user: string) => void;
}) {
  return (
    <>
      <div>
        {!users.length && (
          <div className={"onlineUser"}>
            Nobody else is online right now, ask your friends to come trade!
          </div>
        )}
        {users.map((u) => {
          const hasAcceptButton = tradeRequests.includes(u);
          return (
            <div
              key={u}
              className={`onlineUser ${
                hasAcceptButton ? "hasAcceptButton" : ""
              }`}
            >
              <Blocky
                className="blocky"
                seed={u.toUpperCase()}
                size={8}
                scale={4}
              />
              <ResponsiveAddress address={u} />
              <button onClick={() => sendTradeRequest(u)}>
                {hasAcceptButton
                  ? "Accept Trade Request"
                  : "Send Trade Request"}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
