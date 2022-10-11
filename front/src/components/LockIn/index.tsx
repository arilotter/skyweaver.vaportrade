import "./LockIn.css";

export type LockInButtonState =
  | "lock_in"
  | "waiting_for_partner"
  | "waiting_for_signature"
  | "submit_order"
  | "waiting_for_asset_approval";

export function LockIn({
  state,
  onClick,
}: {
  state: LockInButtonState;
  onClick: () => void;
}) {
  const disabled = state !== "lock_in" && state !== "submit_order";
  return (
    <button
      className="lockInButton"
      disabled={state !== "lock_in" && state !== "submit_order"}
      onClick={!disabled ? onClick : undefined}
    >
      {stateText[state]}
    </button>
  );
}

const stateText: { [K in LockInButtonState]: string } = {
  lock_in: "Lock In",
  waiting_for_partner: "Waiting for Partner",
  waiting_for_asset_approval: "Waiting for Asset Approval",
  waiting_for_signature: "Waiting for Signature",
  submit_order: "Execute Trade",
};
