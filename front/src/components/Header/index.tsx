import Blocky from "react-blockies";

import "./Header.css";

export function Header({
  address,
  isYou,
}: {
  address: string;
  isYou: boolean;
}) {
  return (
    <div className="header">
      <Blocky
        className="blocky"
        seed={address.toUpperCase()}
        size={8}
        scale={6}
      />
      <div className="headerText">
        <h2>{isYou ? "Your" : "Their"} offer</h2>
        <h4>
          These are the items you'll {isYou ? "lose" : "get"} in the trade
        </h4>
      </div>
    </div>
  );
}
