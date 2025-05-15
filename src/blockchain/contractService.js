import { ethers } from "ethers";
import contractDataAssetManager from "@/blockchain/abi/AssetManager.json"; // ABIファイル名を確認

const providerUrl = process.env.VUE_APP_PROVIDER_URL;
const assetManagerContractAddress = process.env.VUE_APP_CONTRACT_ADDRESS;
const assetManagerABI = contractDataAssetManager?.abi || [];

// --- 初期チェック ---
if (!providerUrl) {
  console.error("VUE_APP_PROVIDER_URLが設定されていません。");
}
if (!assetManagerContractAddress) {
  console.error(
    "VUE_APP_CONTRACT_ADDRESS (AssetManager用) が設定されていません。"
  );
}
if (!assetManagerABI.length) {
  console.error("AssetManagerのABIの読み込みに失敗しました。");
}
// ---------------------

const provider = providerUrl ? new ethers.JsonRpcProvider(providerUrl) : null;

async function getAssetManagerSignerContract() {
  if (!window.ethereum) {
    throw new Error(
      "MetaMaskが見つかりません。ブラウザ拡張機能がインストールされ、有効になっているか確認してください。"
    );
  }
  if (!assetManagerContractAddress || !assetManagerABI.length) {
    throw new Error(
      "AssetManagerのコントラクト情報（アドレスまたはABI）が読み込めていません。"
    );
  }
  const browserProvider = new ethers.BrowserProvider(window.ethereum);
  try {
    await browserProvider.send("eth_requestAccounts", []);
    const signer = await browserProvider.getSigner();
    return new ethers.Contract(
      assetManagerContractAddress,
      assetManagerABI,
      signer
    );
  } catch (error) {
    console.error("getSignerContract Error:", error);
    if (error.code === 4001) {
      throw new Error("MetaMaskでの接続が拒否されました。");
    }
    throw new Error("MetaMaskとの接続中にエラーが発生しました。");
  }
}

export async function getCurrentSignerAddress() {
  if (!window.ethereum) {
    throw new Error("MetaMaskが見つかりません。");
  }
  const browserProvider = new ethers.BrowserProvider(window.ethereum);
  try {
    await browserProvider.send("eth_requestAccounts", []);
    const signer = await browserProvider.getSigner();
    return await signer.getAddress();
  } catch (error) {
    console.error("getCurrentSignerAddress Error:", error);
    if (error.code === 4001) {
      throw new Error("MetaMaskでの接続またはアドレス取得が拒否されました。");
    }
    throw new Error("MetaMaskからアドレスを取得できませんでした。");
  }
}

export async function registAddressService(addressToRegister) {
  if (!ethers.isAddress(addressToRegister)) {
    throw new Error(
      "無効なアドレス形式です。'0x'から始まる42文字の英数字を入力してください。"
    );
  }
  const contract = await getAssetManagerSignerContract();
  try {
    const tx = await contract.registAddress(addressToRegister);
    const receipt = await tx.wait();
    if (!receipt || receipt.status === 0) {
      throw new Error(
        "トランザクションが失敗しました(Reverted)。コントラクト条件(アドレス形式, 重複登録など)を確認してください。"
      );
    }
    return receipt;
  } catch (error) {
    console.error("registAddressService Error:", error);
    if (error.code === "ACTION_REJECTED" || error.code === 4001) {
      throw new Error("MetaMaskでトランザクションが拒否されました。");
    }
    const reason =
      error.reason ||
      (error.data ? error.data.message : null) ||
      error.info?.error?.message ||
      error.message ||
      "不明なエラー";
    const cleanReason = reason
      .replace("execution reverted: ", "")
      .replace("Error: ", "");
    let detailedMessage = `アドレス登録中にエラーが発生しました: ${cleanReason}`;
    if (cleanReason.includes("already registered")) {
      detailedMessage = "このアドレスは既に登録されています。";
    } else if (cleanReason.includes("zero address")) {
      detailedMessage = "ゼロアドレスは登録できません。";
    }
    throw new Error(detailedMessage);
  }
}

export async function getRegisteredAddressesService() {
  if (!provider) {
    throw new Error(
      "ブロックチェーンへの接続(Provider)が初期化されていません。"
    );
  }
  if (!assetManagerContractAddress || !assetManagerABI.length) {
    throw new Error(
      "AssetManagerのコントラクト情報（アドレスまたはABI）が読み込めていません。"
    );
  }
  const contract = new ethers.Contract(
    assetManagerContractAddress,
    assetManagerABI,
    provider
  );
  try {
    return await contract.getRegisteredAddresses();
  } catch (error) {
    console.error("getRegisteredAddressesService Error:", error);
    throw new Error("登録済みアドレスの取得中にエラーが発生しました。");
  }
}

export async function setAssetService(amount) {
  const amountBN = ethers.parseUnits(amount.toString(), 0);
  if (amountBN <= 0) {
    throw new Error("資産額は0より大きい数値を入力してください。");
  }
  const contract = await getAssetManagerSignerContract();
  try {
    const tx = await contract.setAsset(amountBN);
    const receipt = await tx.wait();
    if (!receipt || receipt.status === 0) {
      throw new Error(
        "トランザクションが失敗しました(Reverted)。コントラクト条件(アドレス登録有無など)を確認してください。"
      );
    }
    return receipt;
  } catch (error) {
    console.error("setAssetService Error:", error);
    if (error.code === "ACTION_REJECTED" || error.code === 4001) {
      throw new Error("MetaMaskでトランザクションが拒否されました。");
    }
    const reason =
      error.reason ||
      (error.data ? error.data.message : null) ||
      error.info?.error?.message ||
      error.message ||
      "不明なエラー";
    const cleanReason = reason
      .replace("execution reverted: ", "")
      .replace("Error: ", "");
    let detailedMessage = `資産設定中にエラーが発生しました: ${cleanReason}`;
    if (cleanReason.includes("Caller is not a registered address")) {
      detailedMessage =
        "この操作を行うには、あなたのアドレスが登録されている必要があります。";
    } else if (cleanReason.includes("Amount must be greater than zero")) {
      detailedMessage = "資産額は0より大きい数値を入力してください。";
    }
    throw new Error(detailedMessage);
  }
}

export async function getAssetService(userAddress) {
  if (!ethers.isAddress(userAddress)) {
    throw new Error("資産額を取得するためのアドレスが無効です。");
  }
  if (!provider) {
    throw new Error(
      "ブロックチェーンへの接続(Provider)が初期化されていません。"
    );
  }
  const contract = new ethers.Contract(
    assetManagerContractAddress,
    assetManagerABI,
    provider
  );
  try {
    const currentAsset = await contract.userAssets(userAddress); // もしコントラクト側の関数名がgetAssetなら contract.getAsset(userAddress)
    return currentAsset.toString();
  } catch (error) {
    console.error("getAssetService Error:", error);
    throw new Error(
      `アドレス ${userAddress} の資産額取得中にエラーが発生しました。`
    );
  }
}

// --- ★★★ 資料80ページ向け: 新しいサービス関数: 資産とハッシュを登録 ★★★ ---
export async function addAssetWithHashService(amount, hashValueBytes) {
  const amountBN = ethers.parseUnits(amount.toString(), 0); // 整数として扱う
  if (amountBN <= 0) {
    throw new Error("資産額は0より大きい数値を入力してください。");
  }
  if (!hashValueBytes || hashValueBytes.length === 0) {
    // hashValueBytes は Uint8Array を期待
    throw new Error("ハッシュ値が空です。");
  }

  const contract = await getAssetManagerSignerContract();
  try {
    console.log(
      `Calling addAssetWithHash with amount: ${amount.toString()}, hash: [Uint8Array of length ${
        hashValueBytes.length
      }] (Hex will be shown in contract event or successful UI update)`
    );
    // コントラクトの addAssetWithHash 関数を呼び出す
    // hashValueBytes は Uint8Array または ethers.jsが解釈できる bytes লাইক 値であるべき
    const tx = await contract.addAssetWithHash(amountBN, hashValueBytes);
    console.log("addAssetWithHash transaction sent:", tx.hash);
    console.log("Waiting for addAssetWithHash transaction confirmation...");
    const receipt = await tx.wait();
    console.log("addAssetWithHash transaction confirmed:", receipt);
    if (!receipt || receipt.status === 0) {
      throw new Error(
        "トランザクションが失敗しました(Reverted)。コントラクト条件（アドレス登録、金額、ハッシュ値の空チェックなど）を確認してください。"
      );
    }
    return receipt;
  } catch (error) {
    console.error("addAssetWithHashService Error:", error);
    if (error.code === "ACTION_REJECTED" || error.code === 4001) {
      throw new Error("MetaMaskでトランザクションが拒否されました。");
    }
    const reason =
      error.reason ||
      (error.data ? error.data.message : null) ||
      error.info?.error?.message ||
      error.message ||
      "不明なエラー";
    const cleanReason = reason
      .replace("execution reverted: ", "")
      .replace("Error: ", "");
    let detailedMessage = `資産とハッシュの登録中にエラーが発生しました: ${cleanReason}`;
    // 必要に応じてコントラクトのエラーメッセージに基づいて詳細化
    if (cleanReason.includes("Caller is not a registered address")) {
      detailedMessage =
        "この操作を行うには、あなたのアドレスが登録されている必要があります。";
    } else if (cleanReason.includes("Amount must be greater than zero")) {
      detailedMessage = "資産額は0より大きい数値を入力してください。";
    } else if (cleanReason.includes("Hash value cannot be empty")) {
      detailedMessage = "ハッシュ値は空ではいけません。";
    }
    throw new Error(detailedMessage);
  }
}

// --- ★★★ 資料80ページ向け: 新しいサービス関数: 登録されたハッシュ値を取得 (任意追加) ★★★ ---
export async function getHashForAssetAmountService(
  userAddress,
  totalAssetAmount
) {
  if (!ethers.isAddress(userAddress)) {
    throw new Error("ハッシュ値を取得するためのユーザーアドレスが無効です。");
  }
  if (!provider) {
    throw new Error(
      "ブロックチェーンへの接続(Provider)が初期化されていません。"
    );
  }
  const contract = new ethers.Contract(
    assetManagerContractAddress,
    assetManagerABI,
    provider
  );
  try {
    const totalAssetBN = ethers.parseUnits(totalAssetAmount.toString(), 0);
    console.log(
      `Calling getHashForAssetAmount for user: ${userAddress}, totalAsset: ${totalAssetAmount.toString()}`
    );
    const hashValue = await contract.getHashForAssetAmount(
      userAddress,
      totalAssetBN
    );
    // bytes で返ってくるので、16進数文字列 (0xプレフィックス付き) に変換して返すのが一般的
    console.log(`Hash retrieved: ${hashValue}`);
    return hashValue; // そのまま bytes (0x prefixed hex string) で返す
  } catch (error) {
    console.error("getHashForAssetAmountService Error:", error);
    // コントラクト側で User is not registered の require があるため、そのエラーを拾う可能性
    const reason =
      error.reason ||
      (error.data ? error.data.message : null) ||
      error.info?.error?.message ||
      error.message ||
      "不明なエラー";
    const cleanReason = reason
      .replace("execution reverted: ", "")
      .replace("Error: ", "");
    if (cleanReason.includes("User is not registered")) {
      throw new Error("指定されたユーザーは登録されていません。");
    }
    throw new Error(
      `アドレス ${userAddress} の資産額 ${totalAssetAmount} に対応するハッシュ取得中にエラーが発生しました。`
    );
  }
}
// ★★★ 実装2用: 新しいサービス関数: 資産とファイルデータ送信 (コントラクト内でハッシュ計算) ★★★
export async function addAssetAndCalculateHashInternalService(
  amount,
  fileDataBytes
) {
  const amountBN = ethers.parseUnits(amount.toString(), 0);
  if (amountBN <= 0) {
    throw new Error("資産額は0より大きい数値を入力してください。");
  }
  if (!fileDataBytes || fileDataBytes.length === 0) {
    // fileDataBytes は Uint8Array またはそれに類するものを期待
    throw new Error("ファイルデータが空です。");
  }

  const contract = await getAssetManagerSignerContract();
  try {
    console.log(
      `Calling addAssetAndCalculateHashInternal with amount: ${amount.toString()}, fileData length: ${
        fileDataBytes.length
      } bytes`
    );

    // コントラクトの addAssetAndCalculateHashInternal 関数を呼び出す
    // fileDataBytes は Uint8Array または ethers.jsが解釈できる bytes লাইক 値であるべき
    const tx = await contract.addAssetAndCalculateHashInternal(
      amountBN,
      fileDataBytes
    );
    console.log("addAssetAndCalculateHashInternal transaction sent:", tx.hash);
    console.log(
      "Waiting for addAssetAndCalculateHashInternal transaction confirmation..."
    );
    const receipt = await tx.wait();
    console.log(
      "addAssetAndCalculateHashInternal transaction confirmed:",
      receipt
    );
    if (!receipt || receipt.status === 0) {
      throw new Error(
        "トランザクションが失敗しました(Reverted)。コントラクト条件（アドレス登録、金額、ファイルデータの空チェックなど）を確認してください。"
      );
    }
    return receipt;
  } catch (error) {
    console.error("addAssetAndCalculateHashInternalService Error:", error);
    if (error.code === "ACTION_REJECTED" || error.code === 4001) {
      throw new Error("MetaMaskでトランザクションが拒否されました。");
    }
    // ガス代関連のエラーは特に注意
    if (
      error.message &&
      error.message.toLowerCase().includes("insufficient funds")
    ) {
      throw new Error(
        "ガス代が不足しているか、トランザクションデータが大きすぎる可能性があります。"
      );
    }
    if (
      error.message &&
      error.message.toLowerCase().includes("intrinsic gas too low")
    ) {
      throw new Error(
        "トランザクションデータが大きすぎるため、ガスリミットを超過しました。小さいファイルで試してください。"
      );
    }

    const reason =
      error.reason ||
      (error.data ? error.data.message : null) ||
      error.info?.error?.message ||
      error.message ||
      "不明なエラー";
    const cleanReason = reason
      .replace("execution reverted: ", "")
      .replace("Error: ", "");
    let detailedMessage = `資産とファイルデータの登録中にエラーが発生しました: ${cleanReason}`;
    // 必要に応じてコントラクトのエラーメッセージに基づいて詳細化
    if (cleanReason.includes("Caller is not a registered address")) {
      detailedMessage =
        "この操作を行うには、あなたのアドレスが登録されている必要があります。";
    } else if (cleanReason.includes("Amount must be greater than zero")) {
      detailedMessage = "資産額は0より大きい数値を入力してください。";
    } else if (cleanReason.includes("File data cannot be empty")) {
      detailedMessage = "ファイルデータは空ではいけません。";
    }
    throw new Error(detailedMessage);
  }
}

// ★★★ 実装2用: 新しいサービス関数: 内部計算されたハッシュ値(bytes32)を取得 ★★★
export async function getInternalHashForAssetAmountService(
  userAddress,
  totalAssetAmount
) {
  if (!ethers.isAddress(userAddress)) {
    throw new Error("ハッシュ値を取得するためのユーザーアドレスが無効です。");
  }
  if (!provider) {
    throw new Error(
      "ブロックチェーンへの接続(Provider)が初期化されていません。"
    );
  }
  const contract = new ethers.Contract(
    assetManagerContractAddress,
    assetManagerABI,
    provider
  );
  try {
    const totalAssetBN = ethers.parseUnits(totalAssetAmount.toString(), 0);
    console.log(
      `Calling getInternalHashForAssetAmount for user: ${userAddress}, totalAsset: ${totalAssetAmount.toString()}`
    );
    const hashValueBytes32 = await contract.getInternalHashForAssetAmount(
      userAddress,
      totalAssetBN
    );
    console.log(`Internal hash (bytes32) retrieved: ${hashValueBytes32}`);
    // bytes32 は "0x" + 64文字の16進数文字列として返ってくる
    if (
      hashValueBytes32 ===
      "0x0000000000000000000000000000000000000000000000000000000000000000"
    ) {
      return "該当なし"; // ゼロハッシュは該当なしとみなす
    }
    return hashValueBytes32;
  } catch (error) {
    console.error("getInternalHashForAssetAmountService Error:", error);
    const reason =
      error.reason ||
      (error.data ? error.data.message : null) ||
      error.info?.error?.message ||
      error.message ||
      "不明なエラー";
    const cleanReason = reason
      .replace("execution reverted: ", "")
      .replace("Error: ", "");
    if (cleanReason.includes("User is not registered")) {
      throw new Error("指定されたユーザーは登録されていません。");
    }
    throw new Error(
      `アドレス ${userAddress} の資産額 ${totalAssetAmount} に対応する内部計算ハッシュ取得中にエラーが発生しました。`
    );
  }
}
