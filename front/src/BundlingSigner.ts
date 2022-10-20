import { Signer, TypedDataSigner } from "@ethersproject/abstract-signer";
import { Provider } from "@ethersproject/abstract-provider";
import { Deferrable, defineReadOnly } from "@ethersproject/properties";
import { Bytes } from "@ethersproject/bytes";
import { TransactionRequest } from "@ethersproject/providers";
import {
  TypedDataDomain,
  TypedDataField,
} from "@ethersproject/abstract-signer";
import { resolveProperties } from "@ethersproject/properties";
import { Wallet } from "0xsequence";
import { TransactionResponse } from "0xsequence/dist/declarations/src/transactions";

export async function bundleTransactions(
  wallet: Wallet,
  collect: (signer: BundlingSigner) => Promise<void> | void
): Promise<TransactionResponse<any>> {
  const bundleSigner = new BundlingSigner(await wallet.getAddress(), wallet);
  await collect(bundleSigner);
  return bundleSigner.sendBundledTransactions();
}

class BundlingSigner extends Signer implements TypedDataSigner {
  private _bundledTransactions: Array<Deferrable<TransactionRequest>> | null =
    [];
  constructor(
    public readonly address: string,
    private readonly _sequenceWallet: Wallet
  ) {
    super();
    defineReadOnly(this, "address", address);
    defineReadOnly(this, "provider", _sequenceWallet.getProvider());
  }

  getAddress(): Promise<string> {
    return Promise.resolve(this.address);
  }
  signMessage(_message: Bytes | string): Promise<string> {
    throw new Error("BundlingSigner cannot sign messages");
  }

  /**
   *
   * @param transaction
   * @returns this won't do anything!!
   */
  async signTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<string> {
    if (!this._bundledTransactions) {
      throw new Error("BundlingSigner already sent bundle!");
    }
    this._bundledTransactions.push(transaction);
    return await "dummy_result";
  }

  _signTypedData(
    _domain: TypedDataDomain,
    _types: Record<string, Array<TypedDataField>>,
    _value: Record<string, any>
  ): Promise<string> {
    throw new Error("BundlingSigner cannot sign typed data");
  }

  connect(_provider: Provider): BundlingSigner {
    throw new Error("BundlingSigner is already connected");
  }

  async sendBundledTransactions(): Promise<TransactionResponse> {
    if (!this._bundledTransactions) {
      throw new Error("BundlingSigner already sent bundle!");
    }
    const preparedTxs = await Promise.all(
      this._bundledTransactions.map(resolveProperties)
    );
    if (!preparedTxs.length) {
      debugger;
      throw new Error("empty bundle list");
    }
    console.log("Sending bundle:", preparedTxs);
    this._bundledTransactions = null;
    if (preparedTxs.length === 1) {
      return this._sequenceWallet.getSigner().sendTransaction(preparedTxs[0]);
    } else {
      return this._sequenceWallet.getSigner().sendTransactionBatch(preparedTxs);
    }
  }
}
