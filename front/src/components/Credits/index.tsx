import "./Credits.css";

interface CreditsProps {
  onClose: () => void;
}

export function Credits({ onClose }: CreditsProps) {
  return (
    <div className="credits">
      <button onClick={onClose}>&times;</button>
      <div className="creditsContents">
        <h1>Credits</h1>
        <h2>Concept &amp; Design</h2>
        <p>
          <a href="https://ari.computer/">Ari Lotter</a> &amp;{" "}
          <a href="https://www.instagram.com/matthewshera/">Matthew Shera</a>
        </p>
        <h2>Vaportrade Logo</h2>
        <p>
          <a href="https://www.instagram.com/soapy_scribbles/">
            @soapy_scribbles
          </a>
        </p>
        <h2>Development</h2>
        <p>
          Ari Lotter with heaps of{" "}
          <a href="https://docs.swapsdk.xyz">nft-swap-sdk</a> help from @hazucf
          of <a href="https:/trader.xyz">trader.xyz</a> and unending Sequence
          guidance from William Hua, Michael Yu, Philippe Castonguay, &amp;
          Agustin Aguilar.
        </p>
        <h2>Dependencies</h2>
        <p>
          <a href="https://docs.swapsdk.xyz">nft-swap-sdk</a>
          {", "}
          <a href="https://0x.org/">0x v3</a>
          {", "}
          <a href="https://sequence.xyz/">sequence.js</a>
          {", "}
          <a href="https://ethers.org/">ethers</a>
          {", "}
          <a href="https://github.com/stephensprinkle-zz/react-blockies">
            react blockies
          </a>
          {", "}
          <a href="https://github.com/robtaussig/react-use-websocket">
            react-use-websocket
          </a>
          {", "}
          <a href="https://reactjs.org/">react</a>
          {", "}
          <a href="https://www.typescriptlang.org/">typescript</a>
          {", and "}
          <a href="https://vitejs.dev/">vite</a>
        </p>
        <p>
          Vaportrade &times; Skyweaver is dedicated to everyone who got scammed
          because they couldn&apos;t get the OG Vaportrade to work.
        </p>
        <p>
          Follow
          <a href="https://twitter.com/usevaportrade"> @usevaportrade </a> on
          that bird app or shoot me an email at{" "}
          <a href="mailto:vaportrade.net@gmail.com">vaportrade.net@gmail.com</a>
        </p>
        <p>
          skyweaver.vaportrade.net is open source!{" "}
          <a href="https://github.com/arilotter/skyweaver.vaportrade/">
            https://github.com/arilotter/skyweaver.vaportrade/
          </a>
        </p>
        <p>
          Try the original <a href="https://vaportrade.net">vaportrade.net</a>
        </p>
      </div>
    </div>
  );
}
