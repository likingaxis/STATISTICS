import { runCaesarExperiment } from "./cryptanalysis.js";
import {
  encryptMessage,
  decryptMessage,
  recoverPrivateKey,
  ciphertextStats,
  tamperFirstByte,
} from "./toy-encryption.js";
const enc = new TextEncoder();
async function fingerprint(text) {
  const bytes = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
self.onmessage = async ({ data: { id, type, ...input } }) => {
  const progress = (value) => self.postMessage({ id, progress: value });
  try {
    let result;
    if (type === "experiment") {
      result = runCaesarExperiment(input, progress);
      result.trainSha256 = await fingerprint(input.trainText);
      result.testSha256 = await fingerprint(input.testText);
    } else if (type === "encrypt") {
      result = encryptMessage(input.text, input.privateKey);
      result.decrypted = decryptMessage(result.packet, input.privateKey);
      result.stats = ciphertextStats(result.packet);
    } else if (type === "recover") {
      result = recoverPrivateKey(
        input.target,
        input.limit,
        input.method,
        progress,
      );
      // No recipient private key or original plaintext is passed into this attack.
      if (
        result.key !== null &&
        input.packet?.publicKey ===
          input.target.replace(/^0x/i, "").toLowerCase()
      ) {
        result.decrypted = decryptMessage(input.packet, result.key);
      }
    } else if (type === "tamper") {
      const changed = tamperFirstByte(input.packet);
      result = {
        changedC: changed.pairs[0].C,
        decrypted: decryptMessage(changed, input.privateKey),
      };
    } else throw new Error("Unknown experiment.");
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error.message });
  }
};
