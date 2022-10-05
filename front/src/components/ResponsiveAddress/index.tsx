import "./ResponsiveAddress.css";

export function ResponsiveAddress({ address }: { address: string }) {
  const lastFew = address.slice(-3);
  const start = address.slice(0, -3);
  return (
    <span className="responsiveAddressContainer">
      <span className="responsiveAddress">{start}</span>
      {lastFew}
    </span>
  );
}
