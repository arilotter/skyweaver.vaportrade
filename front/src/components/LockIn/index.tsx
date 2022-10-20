import "./LockIn.css";

export type LockInButtonState =
  | "add_items"
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
  const disabled =
    state !== "lock_in" &&
    state !== "submit_order" &&
    state !== "waiting_for_asset_approval";
  return (
    <button
      className="lockInButton"
      disabled={disabled}
      onClick={!disabled ? onClick : undefined}
    >
      {stateText[state]}
    </button>
  );
}

const stateText: { [K in LockInButtonState]: string } = {
  add_items: "Add items",
  lock_in: "Lock In",
  waiting_for_partner: "Waiting for Partner",
  waiting_for_asset_approval: "Approve transferring assets",
  waiting_for_signature: "Waiting for Signature",
  submit_order: "Execute Trade",
};
