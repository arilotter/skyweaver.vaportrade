import Blocky from "react-blockies";

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
        {users.map((u) => {
          const hasAcceptButton = tradeRequests.includes(u);
          return (
            <div key={u} className={"onlineUser"}>
              <Blocky
                className="blocky"
                seed={u.toUpperCase()}
                size={8}
                scale={4}
              />
              <span>{u}</span>
              <button
                onClick={() => sendTradeRequest(u)}
                className={hasAcceptButton ? "hasAcceptButton" : ""}
              >
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
