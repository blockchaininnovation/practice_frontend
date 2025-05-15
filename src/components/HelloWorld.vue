<template>
  <div class="container">
    <header class="header">
      <h1>AssetManager コントラクト</h1>
      <p>アドレス登録・資産管理・証拠ハッシュ登録デモ (実装1 & 実装2)</p>
    </header>

    <main class="main-content">
      <section class="card">
        <h2>1. アドレス登録</h2>
        <p class="description">
          最初に、資産管理機能を利用するアドレスを登録します。
        </p>
        <div class="input-group">
          <input
            type="text"
            v-model.trim="addressToRegister"
            placeholder="登録するEthereumアドレス (例: 0x...)"
            :disabled="isLoadingRegistration"
          />
          <button
            @click="populateMyAddress"
            class="button-outline"
            :disabled="isLoadingRegistration"
          >
            自分のアドレスを使用
          </button>
          <button
            @click="handleRegistAddress"
            :disabled="!canSubmitRegistration || isLoadingRegistration"
          >
            <span v-if="!isLoadingRegistration">アドレスを登録</span>
            <span v-else>処理中...</span>
          </button>
        </div>
        <div
          v-if="registrationMessage"
          :class="['message', registrationMessageType, 'message-spacer']"
        >
          {{ registrationMessage }}
          <a
            v-if="registrationTxHash"
            :href="etherscanUrl(registrationTxHash)"
            target="_blank"
            rel="noopener noreferrer"
            class="tx-link"
          >
            (トランザクション詳細)
          </a>
        </div>
      </section>

      <section class="card section-spacer">
        <h2>2. 資産の登録/更新 (ハッシュなし)</h2>
        <p class="description">
          現在MetaMaskで接続しているアカウントの資産額を登録・更新（加算）します。<br />
          （注意:
          事前に上記でそのアカウントアドレスが登録されている必要があります）
        </p>
        <div class="input-group">
          <input
            type="number"
            v-model.number="assetAmountToSet"
            placeholder="登録/加算する資産額"
            min="1"
            :disabled="isLoadingSetAsset"
          />
          <button
            @click="handleSetAsset"
            :disabled="!canSubmitSetAsset || isLoadingSetAsset"
          >
            <span v-if="!isLoadingSetAsset">資産を登録/更新</span>
            <span v-else>処理中...</span>
          </button>
        </div>
        <div
          v-if="setAssetMessage"
          :class="['message', setAssetMessageType, 'message-spacer']"
        >
          {{ setAssetMessage }}
          <a
            v-if="setAssetTxHash"
            :href="etherscanUrl(setAssetTxHash)"
            target="_blank"
            rel="noopener noreferrer"
            class="tx-link"
          >
            (トランザクション詳細)
          </a>
        </div>
      </section>

      <section class="card section-spacer">
        <h2>3. 資産と証拠ファイルのハッシュを登録 (フロントエンドで計算)</h2>
        <p class="description">
          資産額と、その証拠となるファイルのSHA256ハッシュ値を同時に登録します。<br />
          ファイル自体はブロックチェーンに記録されません。ハッシュ値のみが記録されます。
        </p>
        <div class="input-group">
          <label for="assetAmountForHash">資産額:</label>
          <input
            type="number"
            id="assetAmountForHash"
            v-model.number="assetAmountForHash"
            placeholder="登録する資産額"
            min="1"
            :disabled="isLoadingAddAssetWithHash"
          />
        </div>
        <div class="input-group">
          <label for="fileForHash">証拠ファイル:</label>
          <input
            type="file"
            id="fileForHash"
            @change="handleFileForHashChange"
            ref="fileInputForHash"
            :disabled="isLoadingAddAssetWithHash"
          />
        </div>
        <div v-if="selectedFileName" class="message info message-spacer">
          選択中のファイル (実装1用): {{ selectedFileName }}
        </div>
        <div
          v-if="calculatedFileHashHex"
          class="message info message-spacer code-block"
        >
          計算されたSHA256ハッシュ (16進数): {{ calculatedFileHashHex }}
        </div>
        <button
          @click="handleSubmitAssetWithHash"
          :disabled="!canSubmitAddAssetWithHash || isLoadingAddAssetWithHash"
          class="button-primary section-spacer"
        >
          <span v-if="!isLoadingAddAssetWithHash"
            >資産とハッシュを登録 (実装1)</span
          >
          <span v-else>処理中...</span>
        </button>
        <div
          v-if="addAssetWithHashMessage"
          :class="['message', addAssetWithHashMessageType, 'message-spacer']"
        >
          {{ addAssetWithHashMessage }}
          <a
            v-if="addAssetWithHashTxHash"
            :href="etherscanUrl(addAssetWithHashTxHash)"
            target="_blank"
            rel="noopener noreferrer"
            class="tx-link"
          >
            (トランザクション詳細)
          </a>
        </div>
      </section>

      <section class="card section-spacer">
        <h2>3b. 資産とファイルデータを送信 (コントラクト内でハッシュ計算)</h2>
        <p class="description">
          資産額と、証拠となるファイルの<strong>データそのもの</strong>をコントラクトに送信し、コントラクト内部でSHA256ハッシュ値を計算・登録します。<br />
          <strong style="color: red"
            >注意:
            送信するファイルサイズが大きい場合、非常に高額なガス代がかかるか、トランザクションが失敗する可能性があります。小さなファイルでテストしてください。</strong
          >
        </p>
        <div class="input-group">
          <label for="assetAmountForInternalHash">資産額:</label>
          <input
            type="number"
            id="assetAmountForInternalHash"
            v-model.number="assetAmountForInternalHash"
            placeholder="登録する資産額"
            min="1"
            :disabled="isLoadingAddAssetInternalHash"
          />
        </div>
        <div class="input-group">
          <label for="fileForInternalHash">証拠ファイル:</label>
          <input
            type="file"
            id="fileForInternalHash"
            @change="handleFileForInternalHashChange"
            ref="fileInputForInternalHash"
            :disabled="isLoadingAddAssetInternalHash"
          />
        </div>
        <div
          v-if="selectedFileForInternalHashName"
          class="message info message-spacer"
        >
          選択中のファイル (実装2用):
          {{ selectedFileForInternalHashName }} (サイズ:
          {{ selectedFileForInternalHashSize }} bytes)
        </div>
        <button
          @click="handleSubmitAssetAndCalculateInternalHash"
          :disabled="
            !canSubmitAddAssetInternalHash || isLoadingAddAssetInternalHash
          "
          class="button-primary section-spacer"
        >
          <span v-if="!isLoadingAddAssetInternalHash"
            >資産とファイルデータを送信 (実装2)</span
          >
          <span v-else>処理中...</span>
        </button>
        <div
          v-if="addAssetInternalHashMessage"
          :class="[
            'message',
            addAssetInternalHashMessageType,
            'message-spacer',
          ]"
        >
          {{ addAssetInternalHashMessage }}
          <a
            v-if="addAssetInternalHashTxHash"
            :href="etherscanUrl(addAssetInternalHashTxHash)"
            target="_blank"
            rel="noopener noreferrer"
            class="tx-link"
          >
            (トランザクション詳細)
          </a>
        </div>
      </section>

      <section class="card section-spacer">
        <h2>4. 自分の資産額表示</h2>
        <p class="description">
          現在MetaMaskで接続しているアカウントの資産額をコントラクトから取得して表示します。
        </p>
        <button
          @click="handleGetMyAsset"
          :disabled="isLoadingGetAsset"
          class="button-secondary"
        >
          <span v-if="!isLoadingGetAsset">自分の資産額を取得</span>
          <span v-else>取得中...</span>
        </button>
        <div
          v-if="getAssetMessage"
          :class="['message', getAssetMessageType, 'message-spacer']"
        >
          {{ getAssetMessage }}
        </div>
        <div v-if="myAssetAmount !== null" class="asset-display message-spacer">
          現在の資産額: <strong>{{ myAssetAmount }}</strong>
        </div>
      </section>

      <section class="card section-spacer">
        <h2>5. 資産額に対応するハッシュを表示 (フロントエンド計算)</h2>
        <p class="description">
          指定したユーザーの、特定の総資産額に対応する、フロントエンドで計算・登録されたハッシュ値
          (bytes) を取得・表示します。
        </p>
        <div class="input-group">
          <label for="userForHashLookup">ユーザーアドレス:</label>
          <input
            type="text"
            id="userForHashLookup"
            v-model.trim="userForHashLookup"
            placeholder="確認するEthereumアドレス"
            :disabled="isLoadingGetAssetHash"
          />
        </div>
        <div class="input-group">
          <label for="totalAssetForHashLookup">総資産額:</label>
          <input
            type="number"
            id="totalAssetForHashLookup"
            v-model.number="totalAssetForHashLookup"
            placeholder="確認する総資産額"
            min="0"
            :disabled="isLoadingGetAssetHash"
          />
        </div>
        <button
          @click="handleGetAssetHash"
          :disabled="!canSubmitGetAssetHash || isLoadingGetAssetHash"
          class="button-secondary"
        >
          <span v-if="!isLoadingGetAssetHash">ハッシュを取得 (実装1)</span>
          <span v-else>取得中...</span>
        </button>
        <div
          v-if="getAssetHashMessage"
          :class="['message', getAssetHashMessageType, 'message-spacer']"
        >
          {{ getAssetHashMessage }}
        </div>
        <div
          v-if="retrievedAssetHash"
          class="message info message-spacer code-block"
        >
          取得されたハッシュ (実装1): {{ retrievedAssetHash }}
        </div>
      </section>

      <section class="card section-spacer">
        <h2>5b. 資産額に対応するハッシュを表示 (コントラクト内部計算)</h2>
        <p class="description">
          指定したユーザーの、特定の総資産額に対応する、コントラクト内部で計算・保存されたハッシュ値
          (bytes32) を取得・表示します。
        </p>
        <div class="input-group">
          <label for="userForInternalHashLookup">ユーザーアドレス:</label>
          <input
            type="text"
            id="userForInternalHashLookup"
            v-model.trim="userForInternalHashLookup"
            placeholder="確認するEthereumアドレス"
            :disabled="isLoadingGetInternalAssetHash"
          />
        </div>
        <div class="input-group">
          <label for="totalAssetForInternalHashLookup">総資産額:</label>
          <input
            type="number"
            id="totalAssetForInternalHashLookup"
            v-model.number="totalAssetForInternalHashLookup"
            placeholder="確認する総資産額"
            min="0"
            :disabled="isLoadingGetInternalAssetHash"
          />
        </div>
        <button
          @click="handleGetInternalAssetHash"
          :disabled="
            !canSubmitGetInternalAssetHash || isLoadingGetInternalAssetHash
          "
          class="button-secondary"
        >
          <span v-if="!isLoadingGetInternalAssetHash"
            >内部計算ハッシュを取得 (実装2)</span
          >
          <span v-else>取得中...</span>
        </button>
        <div
          v-if="getInternalAssetHashMessage"
          :class="[
            'message',
            getInternalAssetHashMessageType,
            'message-spacer',
          ]"
        >
          {{ getInternalAssetHashMessage }}
        </div>
        <div
          v-if="retrievedInternalAssetHash"
          class="message info message-spacer code-block"
        >
          取得された内部計算ハッシュ (実装2): {{ retrievedInternalAssetHash }}
        </div>
      </section>

      <section class="card section-spacer">
        <h2>6. 登録済みアドレス一覧</h2>
        <p class="description">
          コントラクトに現在登録されている全アドレスの一覧を表示します。
        </p>
        <button
          @click="handleGetAddresses"
          :disabled="isLoadingRetrieval"
          class="button-secondary"
        >
          <span v-if="!isLoadingRetrieval">一覧を取得</span>
          <span v-else>取得中...</span>
        </button>
        <div
          v-if="retrievalMessage"
          :class="['message', retrievalMessageType, 'message-spacer']"
        >
          {{ retrievalMessage }}
        </div>
        <div
          v-if="registeredAddressList.length > 0"
          class="address-list message-spacer"
        >
          <h3>登録済みアドレス ({{ registeredAddressList.length }}件)</h3>
          <ul>
            <li v-for="(address, index) in registeredAddressList" :key="index">
              {{ address }}
            </li>
          </ul>
        </div>
      </section>
    </main>

    <footer class="footer">
      <p>接続先コントラクト: {{ contractAddressShort }}</p>
    </footer>
  </div>
</template>

<script>
import { ethers } from "ethers";
import {
  registAddressService,
  getRegisteredAddressesService,
  getCurrentSignerAddress,
  setAssetService,
  getAssetService,
  addAssetWithHashService, // 実装1用
  getHashForAssetAmountService, // 実装1用
  addAssetAndCalculateHashInternalService, // 実装2用
  getInternalHashForAssetAmountService, // 実装2用
} from "@/blockchain/contractService";

export default {
  name: "HelloWorld",
  data() {
    return {
      addressToRegister: "",
      registrationMessage: null,
      registrationMessageType: "info",
      isLoadingRegistration: false,
      registrationTxHash: null,
      registeredAddressList: [],
      retrievalMessage: null,
      retrievalMessageType: "info",
      isLoadingRetrieval: false,
      assetAmountToSet: null,
      myAssetAmount: null,
      isLoadingSetAsset: false,
      isLoadingGetAsset: false,
      setAssetMessage: null,
      setAssetMessageType: "info",
      setAssetTxHash: null,
      getAssetMessage: null,
      getAssetMessageType: "info",

      assetAmountForHash: null,
      selectedFile: null,
      selectedFileName: "",
      calculatedFileHashHex: "",
      calculatedFileHashBytes: null,
      isLoadingAddAssetWithHash: false,
      addAssetWithHashMessage: null,
      addAssetWithHashMessageType: "info",
      addAssetWithHashTxHash: null,

      userForHashLookup: "",
      totalAssetForHashLookup: null,
      isLoadingGetAssetHash: false,
      getAssetHashMessage: null,
      getAssetHashMessageType: "info",
      retrievedAssetHash: "",

      assetAmountForInternalHash: null,
      selectedFileForInternalHash: null,
      selectedFileForInternalHashName: "",
      selectedFileForInternalHashSize: 0,
      fileDataForInternalHashBytes: null,
      isLoadingAddAssetInternalHash: false,
      addAssetInternalHashMessage: null,
      addAssetInternalHashMessageType: "info",
      addAssetInternalHashTxHash: null,

      userForInternalHashLookup: "",
      totalAssetForInternalHashLookup: null,
      isLoadingGetInternalAssetHash: false,
      getInternalAssetHashMessage: null,
      getInternalAssetHashMessageType: "info",
      retrievedInternalAssetHash: "",

      contractAddress: process.env.VUE_APP_CONTRACT_ADDRESS,
      networkChainId: 31337,
    };
  },
  computed: {
    isAddressValid() {
      return ethers.isAddress(this.addressToRegister);
    },
    canSubmitRegistration() {
      return this.isAddressValid && !this.isLoadingRegistration;
    },
    canSubmitSetAsset() {
      return (
        typeof this.assetAmountToSet === "number" &&
        this.assetAmountToSet > 0 &&
        !this.isLoadingSetAsset
      );
    },
    canSubmitAddAssetWithHash() {
      // 実装1用
      return (
        typeof this.assetAmountForHash === "number" &&
        this.assetAmountForHash > 0 &&
        this.calculatedFileHashBytes instanceof Uint8Array &&
        this.calculatedFileHashBytes.length > 0 &&
        !this.isLoadingAddAssetWithHash
      );
    },
    canSubmitGetAssetHash() {
      // 実装1用
      return (
        ethers.isAddress(this.userForHashLookup) &&
        typeof this.totalAssetForHashLookup === "number" &&
        this.totalAssetForHashLookup >= 0 &&
        !this.isLoadingGetAssetHash
      );
    },
    canSubmitAddAssetInternalHash() {
      // 実装2用
      return (
        typeof this.assetAmountForInternalHash === "number" &&
        this.assetAmountForInternalHash > 0 &&
        this.fileDataForInternalHashBytes instanceof Uint8Array &&
        this.fileDataForInternalHashBytes.length > 0 &&
        !this.isLoadingAddAssetInternalHash
      );
    },
    canSubmitGetInternalAssetHash() {
      // 実装2用
      return (
        ethers.isAddress(this.userForInternalHashLookup) &&
        typeof this.totalAssetForInternalHashLookup === "number" &&
        this.totalAssetForInternalHashLookup >= 0 &&
        !this.isLoadingGetInternalAssetHash
      );
    },
    contractAddressShort() {
      const addr = this.contractAddress;
      if (!addr) return "未設定";
      return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
    },
  },
  methods: {
    async handleRegistAddress() {
      if (!this.canSubmitRegistration) {
        if (!this.isAddressValid && this.addressToRegister) {
          this.registrationMessage = "有効なアドレス形式ではありません。";
          this.registrationMessageType = "error";
        }
        return;
      }
      this.isLoadingRegistration = true;
      this.registrationMessage =
        "MetaMaskでトランザクションを確認・承認してください...";
      this.registrationMessageType = "info";
      this.registrationTxHash = null;
      try {
        const receipt = await registAddressService(this.addressToRegister);
        this.isLoadingRegistration = false;
        this.registrationMessage = `アドレス ${this.addressToRegisterShort(
          this.addressToRegister
        )} の登録に成功しました！`;
        this.registrationMessageType = "success";
        this.registrationTxHash = receipt.transactionHash;
        this.addressToRegister = "";
      } catch (error) {
        this.isLoadingRegistration = false;
        this.registrationMessage =
          error.message || "不明なエラーが発生しました。";
        this.registrationMessageType = "error";
        this.registrationTxHash = null;
        console.error("Registration failed:", error);
      }
    },

    async handleGetAddresses() {
      this.isLoadingRetrieval = true;
      this.retrievalMessage = "コントラクトからアドレスリストを取得中です...";
      this.retrievalMessageType = "info";
      this.registeredAddressList = [];
      try {
        const addresses = await getRegisteredAddressesService();
        this.isLoadingRetrieval = false;
        if (addresses && addresses.length > 0) {
          this.registeredAddressList = addresses;
          this.retrievalMessage = `登録済みアドレスを ${addresses.length} 件取得しました。`;
          this.retrievalMessageType = "success";
        } else {
          this.retrievalMessage = "登録されているアドレスはありませんでした。";
          this.retrievalMessageType = "info";
        }
        console.log("Address retrieval successful:", addresses);
      } catch (error) {
        this.isLoadingRetrieval = false;
        this.retrievalMessage =
          error.message ||
          "アドレスリストの取得中に不明なエラーが発生しました。";
        this.retrievalMessageType = "error";
        console.error("Address retrieval failed:", error);
      }
    },

    async populateMyAddress() {
      if (this.isLoadingRegistration) return;
      const originalMessage = this.registrationMessage;
      const originalType = this.registrationMessageType;

      this.registrationMessage = "MetaMaskからアドレスを取得中です...";
      this.registrationMessageType = "info";
      try {
        const myAddress = await getCurrentSignerAddress();
        this.addressToRegister = myAddress;
        this.registrationMessage = originalMessage;
        this.registrationMessageType = originalType;
        if (!originalMessage && myAddress) {
          this.registrationMessage = `あなたのアドレス ${this.addressToRegisterShort(
            myAddress
          )} を入力しました。`;
          this.registrationMessageType = "info";
        } else if (!myAddress) {
          this.registrationMessage =
            "MetaMaskからアドレスを取得できませんでした。接続を確認してください。";
          this.registrationMessageType = "error";
        }
      } catch (error) {
        console.error("Failed to get address from MetaMask:", error);
        this.registrationMessage =
          error.message || "MetaMaskからアドレスを取得できませんでした。";
        this.registrationMessageType = "error";
      }
    },

    async handleSetAsset() {
      if (!this.canSubmitSetAsset) {
        if (
          !(
            typeof this.assetAmountToSet === "number" &&
            this.assetAmountToSet > 0
          )
        ) {
          this.setAssetMessage =
            "資産額には0より大きい数値を入力してください。";
          this.setAssetMessageType = "error";
        }
        return;
      }
      this.isLoadingSetAsset = true;
      this.setAssetMessage =
        "MetaMaskで資産登録トランザクションを確認・承認してください...";
      this.setAssetMessageType = "info";
      this.setAssetTxHash = null;

      try {
        const receipt = await setAssetService(this.assetAmountToSet);
        this.isLoadingSetAsset = false;
        this.setAssetMessage = `資産 ${this.assetAmountToSet} の登録/更新に成功しました！`;
        this.setAssetMessageType = "success";
        this.setAssetTxHash = receipt.transactionHash;
        this.assetAmountToSet = null;
        this.handleGetMyAsset();
      } catch (error) {
        this.isLoadingSetAsset = false;
        this.setAssetMessage =
          error.message || "資産登録/更新中に不明なエラーが発生しました。";
        this.setAssetMessageType = "error";
        this.setAssetTxHash = null;
        console.error("Set asset failed:", error);
      }
    },

    async handleGetMyAsset() {
      this.isLoadingGetAsset = true;
      this.getAssetMessage = "あなたの資産額を取得中です...";
      this.getAssetMessageType = "info";
      this.myAssetAmount = null;

      try {
        const myAddress = await getCurrentSignerAddress();
        if (!myAddress) {
          throw new Error("MetaMaskから現在のアドレスを取得できませんでした。");
        }
        const assetAmount = await getAssetService(myAddress);
        this.isLoadingGetAsset = false;
        this.myAssetAmount = assetAmount;
        this.getAssetMessage = `現在の資産額を取得しました (アドレス: ${this.addressToRegisterShort(
          myAddress
        )})`;
        this.getAssetMessageType = "success";
        console.log(`My asset amount for ${myAddress}: ${assetAmount}`);
      } catch (error) {
        this.isLoadingGetAsset = false;
        this.myAssetAmount = null;
        this.getAssetMessage =
          error.message || "資産額の取得中に不明なエラーが発生しました。";
        this.getAssetMessageType = "error";
        console.error("Get my asset failed:", error);
      }
    },

    // --- 実装1用メソッド ---
    async handleFileForHashChange(event) {
      // 実装1用
      const file = event.target.files[0];
      if (!file) {
        this.selectedFile = null;
        this.selectedFileName = "";
        this.calculatedFileHashHex = "";
        this.calculatedFileHashBytes = null;
        return;
      }
      this.selectedFile = file;
      this.selectedFileName = file.name;
      this.calculatedFileHashHex = "計算中...";
      this.calculatedFileHashBytes = null;

      try {
        const arrayBuffer = await this.readFileAsArrayBuffer(file);
        const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);

        this.calculatedFileHashBytes = new Uint8Array(hashBuffer);
        this.calculatedFileHashHex = this.bufferToHex(hashBuffer);
      } catch (error) {
        console.error("Error calculating file hash (impl 1):", error);
        this.calculatedFileHashHex = "ハッシュ計算エラー";
        this.calculatedFileHashBytes = null;
        this.addAssetWithHashMessage =
          "ファイルのハッシュ計算中にエラーが発生しました: " + error.message;
        this.addAssetWithHashMessageType = "error";
      }
    },

    async handleSubmitAssetWithHash() {
      // 実装1用
      if (!this.canSubmitAddAssetWithHash) {
        if (
          !(
            typeof this.assetAmountForHash === "number" &&
            this.assetAmountForHash > 0
          )
        ) {
          this.addAssetWithHashMessage =
            "資産額には0より大きい数値を入力してください。";
          this.addAssetWithHashMessageType = "error";
        } else if (
          !this.calculatedFileHashBytes ||
          this.calculatedFileHashBytes.length === 0
        ) {
          this.addAssetWithHashMessage =
            "ファイルを選択し、ハッシュ値を計算してください。";
          this.addAssetWithHashMessageType = "error";
        }
        return;
      }
      this.isLoadingAddAssetWithHash = true;
      this.addAssetWithHashMessage =
        "MetaMaskで資産とハッシュの登録トランザクションを確認・承認してください...";
      this.addAssetWithHashMessageType = "info";
      this.addAssetWithHashTxHash = null;

      try {
        const receipt = await addAssetWithHashService(
          this.assetAmountForHash,
          this.calculatedFileHashBytes
        );
        this.isLoadingAddAssetWithHash = false;
        this.addAssetWithHashMessage = `資産 ${this.assetAmountForHash} とファイルのハッシュの登録に成功しました！`;
        this.addAssetWithHashMessageType = "success";
        this.addAssetWithHashTxHash = receipt.transactionHash;

        this.assetAmountForHash = null;
        this.selectedFile = null;
        this.selectedFileName = "";
        this.calculatedFileHashHex = "";
        this.calculatedFileHashBytes = null;
        if (this.$refs.fileInputForHash) {
          this.$refs.fileInputForHash.value = null;
        }
        this.handleGetMyAsset();
      } catch (error) {
        this.isLoadingAddAssetWithHash = false;
        this.addAssetWithHashMessage =
          error.message ||
          "資産とハッシュの登録中に不明なエラーが発生しました。";
        this.addAssetWithHashMessageType = "error";
        this.addAssetWithHashTxHash = null;
        console.error("Add asset with hash (impl 1) failed:", error);
      }
    },

    async handleGetAssetHash() {
      // 実装1用
      if (!this.canSubmitGetAssetHash) {
        if (!ethers.isAddress(this.userForHashLookup)) {
          this.getAssetHashMessage =
            "有効なユーザーアドレスを入力してください。";
        } else if (
          !(
            typeof this.totalAssetForHashLookup === "number" &&
            this.totalAssetForHashLookup >= 0
          )
        ) {
          this.getAssetHashMessage =
            "総資産額には0以上の数値を入力してください。";
        }
        this.getAssetHashMessageType = "error";
        return;
      }
      this.isLoadingGetAssetHash = true;
      this.getAssetHashMessage = `ユーザー ${this.addressToRegisterShort(
        this.userForHashLookup
      )} の総資産額 ${
        this.totalAssetForHashLookup
      } に対応するハッシュを取得中です...`;
      this.getAssetHashMessageType = "info";
      this.retrievedAssetHash = "";

      try {
        const hashValue = await getHashForAssetAmountService(
          this.userForHashLookup,
          this.totalAssetForHashLookup
        );
        this.isLoadingGetAssetHash = false;
        if (hashValue && hashValue !== "0x") {
          this.retrievedAssetHash = hashValue;
          this.getAssetHashMessage = "ハッシュ値(実装1)を取得しました。";
          this.getAssetHashMessageType = "success";
        } else {
          this.retrievedAssetHash = "該当なし";
          this.getAssetHashMessage =
            "指定された条件に一致するハッシュ値(実装1)は見つかりませんでした。";
          this.getAssetHashMessageType = "info";
        }
      } catch (error) {
        this.isLoadingGetAssetHash = false;
        this.retrievedAssetHash = "";
        this.getAssetHashMessage =
          error.message ||
          "ハッシュ値(実装1)の取得中に不明なエラーが発生しました。";
        this.getAssetHashMessageType = "error";
        console.error("Get asset hash (impl 1) failed:", error);
      }
    },

    // --- 実装2用メソッド ---
    async handleFileForInternalHashChange(event) {
      // 実装2用
      const file = event.target.files[0];
      if (!file) {
        this.selectedFileForInternalHash = null;
        this.selectedFileForInternalHashName = "";
        this.selectedFileForInternalHashSize = 0;
        this.fileDataForInternalHashBytes = null;
        return;
      }
      this.selectedFileForInternalHash = file;
      this.selectedFileForInternalHashName = file.name;
      this.selectedFileForInternalHashSize = file.size;
      this.fileDataForInternalHashBytes = null;

      try {
        const arrayBuffer = await this.readFileAsArrayBuffer(file);
        this.fileDataForInternalHashBytes = new Uint8Array(arrayBuffer);
        console.log(
          `File "${file.name}" read for impl 2, size: ${this.fileDataForInternalHashBytes.length} bytes`
        );
      } catch (error) {
        console.error("Error reading file for internal hash (impl 2):", error);
        this.selectedFileForInternalHashName = "ファイル読み込みエラー";
        this.selectedFileForInternalHashSize = 0;
        this.fileDataForInternalHashBytes = null;
        this.addAssetInternalHashMessage =
          "ファイルの読み込み中にエラーが発生しました: " + error.message;
        this.addAssetInternalHashMessageType = "error";
      }
    },

    async handleSubmitAssetAndCalculateInternalHash() {
      // 実装2用
      if (!this.canSubmitAddAssetInternalHash) {
        if (
          !(
            typeof this.assetAmountForInternalHash === "number" &&
            this.assetAmountForInternalHash > 0
          )
        ) {
          this.addAssetInternalHashMessage =
            "資産額には0より大きい数値を入力してください。";
          this.addAssetInternalHashMessageType = "error";
        } else if (
          !this.fileDataForInternalHashBytes ||
          this.fileDataForInternalHashBytes.length === 0
        ) {
          this.addAssetInternalHashMessage =
            "ファイルを選択し、データを読み込んでください。";
          this.addAssetInternalHashMessageType = "error";
        }
        return;
      }
      this.isLoadingAddAssetInternalHash = true;
      this.addAssetInternalHashMessage =
        "MetaMaskで資産とファイルデータの送信トランザクションを確認・承認してください...";
      this.addAssetInternalHashMessageType = "info";
      this.addAssetInternalHashTxHash = null;

      try {
        const receipt = await addAssetAndCalculateHashInternalService(
          this.assetAmountForInternalHash,
          this.fileDataForInternalHashBytes
        );
        this.isLoadingAddAssetInternalHash = false;
        this.addAssetInternalHashMessage = `資産 ${this.assetAmountForInternalHash} とファイルデータ(内部でハッシュ計算)の登録に成功しました！`;
        this.addAssetInternalHashMessageType = "success";
        this.addAssetInternalHashTxHash = receipt.transactionHash;

        this.assetAmountForInternalHash = null;
        this.selectedFileForInternalHash = null;
        this.selectedFileForInternalHashName = "";
        this.selectedFileForInternalHashSize = 0;
        this.fileDataForInternalHashBytes = null;
        if (this.$refs.fileInputForInternalHash) {
          this.$refs.fileInputForInternalHash.value = null;
        }
        this.handleGetMyAsset();
      } catch (error) {
        this.isLoadingAddAssetInternalHash = false;
        this.addAssetInternalHashMessage =
          error.message ||
          "資産とファイルデータの登録中(内部ハッシュ)に不明なエラーが発生しました。";
        this.addAssetInternalHashMessageType = "error";
        this.addAssetInternalHashTxHash = null;
        console.error(
          "Add asset with internal hash calculation (impl 2) failed:",
          error
        );
      }
    },

    async handleGetInternalAssetHash() {
      // 実装2用
      if (!this.canSubmitGetInternalAssetHash) {
        if (!ethers.isAddress(this.userForInternalHashLookup)) {
          this.getInternalAssetHashMessage =
            "有効なユーザーアドレスを入力してください。";
        } else if (
          !(
            typeof this.totalAssetForInternalHashLookup === "number" &&
            this.totalAssetForInternalHashLookup >= 0
          )
        ) {
          this.getInternalAssetHashMessage =
            "総資産額には0以上の数値を入力してください。";
        }
        this.getInternalAssetHashMessageType = "error";
        return;
      }
      this.isLoadingGetInternalAssetHash = true;
      this.getInternalAssetHashMessage = `ユーザー ${this.addressToRegisterShort(
        this.userForInternalHashLookup
      )} の総資産額 ${
        this.totalAssetForInternalHashLookup
      } に対応する内部計算ハッシュを取得中です...`;
      this.getInternalAssetHashMessageType = "info";
      this.retrievedInternalAssetHash = "";

      try {
        const hashValueBytes32 = await getInternalHashForAssetAmountService(
          this.userForInternalHashLookup,
          this.totalAssetForInternalHashLookup
        );
        this.isLoadingGetInternalAssetHash = false;
        this.retrievedInternalAssetHash = hashValueBytes32;
        this.getInternalAssetHashMessage =
          hashValueBytes32 === "該当なし"
            ? "指定された条件に一致する内部計算ハッシュ値は見つかりませんでした。"
            : "内部計算ハッシュ値(実装2)を取得しました。";
        this.getInternalAssetHashMessageType =
          hashValueBytes32 === "該当なし" ? "info" : "success";
      } catch (error) {
        this.isLoadingGetInternalAssetHash = false;
        this.retrievedInternalAssetHash = "";
        this.getInternalAssetHashMessage =
          error.message ||
          "内部計算ハッシュ値(実装2)の取得中に不明なエラーが発生しました。";
        this.getInternalAssetHashMessageType = "error";
        console.error("Get internal asset hash (impl 2) failed:", error);
      }
    },

    // --- 共通ヘルパーメソッド ---
    readFileAsArrayBuffer(file) {
      // 実装1と実装2で共通
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          resolve(event.target.result);
        };
        reader.onerror = (error) => {
          reject(error);
        };
        reader.readAsArrayBuffer(file);
      });
    },

    bufferToHex(buffer) {
      // 実装1で使用 (表示用)
      return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    },

    addressToRegisterShort(addr) {
      if (!addr) return "";
      return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
    },
    etherscanUrl(txHash) {
      if (!txHash) return "#";
      const sepoliaBase = "https://sepolia.etherscan.io/tx/";
      const localBase = "#tx-";
      return this.networkChainId === 31337
        ? `${localBase}${txHash}`
        : `${sepoliaBase}${txHash}`;
    },
  },
  mounted() {
    // this.handleGetMyAsset();
  },
};
</script>

<style scoped>
/* スタイルは前回の回答から変更なし。必要に応じて調整してください。 */
.container {
  max-width: 700px;
  margin: 2rem auto;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica,
    Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  background-color: #f9fafb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}
.header {
  text-align: center;
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}
.header h1 {
  margin-bottom: 0.5rem;
  color: #1f2937;
  font-size: 2rem;
  font-weight: 600;
}
.header p {
  color: #6b7280;
  font-size: 1rem;
}
.main-content {
  margin-bottom: 2rem;
}
.card {
  background-color: #fff;
  padding: 1.75rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.card h2 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  color: #374151;
  font-size: 1.5rem;
  font-weight: 600;
}
.card .description {
  font-size: 0.95rem;
  color: #6b7280;
  margin-bottom: 1.5rem;
  line-height: 1.6;
}
.input-group {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}
.input-group label {
  font-weight: 500;
  color: #4b5563;
  margin-right: 0.5rem;
  font-size: 0.9rem;
}
.input-group input[type="text"],
.input-group input[type="number"],
.input-group input[type="file"] {
  flex-grow: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  min-width: 180px;
  color: #374151;
}
.input-group input[type="file"] {
  padding: 0.6rem 1rem;
}
.input-group input[type="text"]:focus,
.input-group input[type="number"]:focus,
.input-group input[type="file"]:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}
.input-group input[type="text"]:disabled,
.input-group input[type="number"]:disabled,
.input-group input[type="file"]:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}
.input-group button,
.button-primary,
.button-secondary {
  padding: 0.8rem 1.25rem;
  font-size: 1rem;
  font-weight: 500;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  border: none;
}
.button-primary {
  color: #fff;
  background-color: #3b82f6;
}
.button-primary:hover:not(:disabled) {
  background-color: #2563eb;
}
.input-group button {
  color: #fff;
  background-color: #3b82f6;
}
.input-group button:hover:not(:disabled) {
  background-color: #2563eb;
}
.button-outline {
  color: #3b82f6;
  background-color: #fff;
  border: 1px solid #3b82f6;
  padding: 0.8rem 1.25rem;
  font-size: 1rem;
  font-weight: 500;
  border-radius: 6px;
  white-space: nowrap;
}
.button-outline:hover:not(:disabled) {
  background-color: #eff6ff;
}
.button-secondary {
  color: #fff;
  background-color: #6b7280;
}
.button-secondary:hover:not(:disabled) {
  background-color: #4b5563;
}
.input-group button:disabled,
.button-primary:disabled,
.button-secondary:disabled,
.button-outline:disabled {
  background-color: #d1d5db;
  color: #9ca3af;
  border-color: #d1d5db;
  cursor: not-allowed;
}
.message {
  margin-top: 1rem;
  padding: 0.8rem 1.25rem;
  border-radius: 6px;
  font-size: 0.9rem;
  border: 1px solid transparent;
  word-break: break-word;
}
.message.info {
  background-color: #eff6ff;
  border-color: #bfdbfe;
  color: #1e40af;
}
.message.success {
  background-color: #d1fae5;
  border-color: #a7f3d0;
  color: #065f46;
}
.message.error {
  background-color: #fee2e2;
  border-color: #fecaca;
  color: #991b1b;
}
.message-spacer {
  margin-top: 1rem;
  margin-bottom: 1rem;
}
.tx-link {
  color: inherit;
  text-decoration: underline;
  margin-left: 0.5rem;
  font-weight: 500;
}
.tx-link:hover {
  text-decoration: none;
}
.section-spacer {
  margin-top: 2.5rem;
}
.address-list {
  background-color: #f9fafb;
  padding: 1.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}
.address-list h3 {
  margin-top: 0;
  margin-bottom: 0.75rem;
  color: #374151;
  font-size: 1.1rem;
  font-weight: 600;
}
.address-list ul {
  list-style-type: none;
  padding-left: 0;
  margin-bottom: 0;
}
.address-list li {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier,
    monospace;
  padding: 0.4rem 0;
  border-bottom: 1px dashed #e5e7eb;
  word-break: break-all;
  color: #4b5563;
  font-size: 0.9rem;
}
.address-list li:last-child {
  border-bottom: none;
}
.asset-display {
  background-color: #eff6ff;
  padding: 0.8rem 1.25rem;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  color: #1e40af;
  font-size: 1.05rem;
}
.asset-display strong {
  font-weight: 600;
  margin-left: 0.5rem;
}
.footer {
  text-align: center;
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
  font-size: 0.85rem;
  color: #9ca3af;
}
.code-block {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier,
    monospace;
  font-size: 0.85rem;
  word-break: break-all;
  white-space: pre-wrap;
}
</style>
