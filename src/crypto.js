import {
  Mnemonic,
  HDNodeWallet,
  SigningKey,
  keccak256,
  getBytes,
  hexlify,
  getAddress,
  toUtf8Bytes,
  sha512,
  toBeHex,
} from "ethers";
import { sha3_256 } from "@noble/hashes/sha3";
import { hamming, mean } from "./math.js";
export const PUBLIC_ENTROPY = "0x00000000000000000000000000000000";
export function deriveDemo(index = 0, passphrase = "") {
  if (!Number.isInteger(index) || index < 0 || index > 20)
    throw new RangeError("Use a demo index from 0 to 20.");
  if (!["", "TREZOR"].includes(passphrase))
    throw new RangeError("Only public test passphrases are supported.");
  const mnemonic = Mnemonic.fromEntropy(PUBLIC_ENTROPY, passphrase),
    seed = mnemonic.computeSeed();
  const root = HDNodeWallet.fromSeed(seed),
    path = `m/44'/60'/0'/0/${index}`,
    child = root.derivePath(path);
  const publicKey = SigningKey.computePublicKey(child.privateKey, false),
    payload = "0x" + publicKey.slice(4);
  const digest = keccak256(payload),
    address = "0x" + digest.slice(-40);
  const branches = [
    "m",
    "m/44'",
    "m/44'/60'",
    "m/44'/60'/0'",
    "m/44'/60'/0'/0",
    path,
  ].map((p) => {
    const w = p === "m" ? root : root.derivePath(p);
    return { path: p, chainCode: w.chainCode, publicKey: w.publicKey };
  });
  return {
    mnemonic: mnemonic.phrase,
    seed,
    path,
    privateKey: child.privateKey,
    publicKey,
    payload,
    digest,
    address,
    checksum: getAddress(address),
    masterPrivate: root.privateKey,
    chainCode: root.chainCode,
    branches,
  };
}
const binary = (bytes) =>
  [...bytes].map((v) => v.toString(2).padStart(8, "0")).join("");
// Reproducible deterministic test messages, not randomly generated secrets.
export function hashExperiment(n = 256, run = 1) {
  if (!Number.isInteger(n) || n < 1 || n > 2048)
    throw new RangeError("Invalid sample size.");
  const distances = [],
    hexCounts = Array(16).fill(0),
    addressCounts = Array(16).fill(0),
    bitCounts = Array(256).fill(0),
    rows = [];
  for (let i = 0; i < n; i++) {
    const message = getBytes(
      keccak256(toUtf8Bytes(`statistics-lab/v1/${run}/${i}`)),
    );
    const changed = message.slice(),
      bit = i % 256;
    changed[Math.floor(bit / 8)] ^= 1 << bit % 8;
    const original = keccak256(message),
      flipped = keccak256(changed),
      out = binary(getBytes(original));
    const distance = hamming(out, binary(getBytes(flipped)));
    distances.push(distance);
    for (const digit of original.slice(2)) hexCounts[parseInt(digit, 16)]++;
    for (const digit of original.slice(-40))
      addressCounts[parseInt(digit, 16)]++;
    [...out].forEach((b, j) => (bitCounts[j] += Number(b)));
    rows.push({
      i,
      bit,
      input: hexlify(message),
      changed: hexlify(changed),
      original,
      flipped,
      distance,
    });
  }
  const avg = mean(distances),
    sd =
      n > 1
        ? Math.sqrt(distances.reduce((s, d) => s + (d - avg) ** 2, 0) / (n - 1))
        : 0;
  return {
    n,
    run,
    distances,
    hexCounts,
    addressCounts,
    bitCounts,
    rows,
    avg,
    sd,
    ones: bitCounts.reduce((a, b) => a + b, 0),
    se: sd / Math.sqrt(n),
  };
}
export function compareHashes(text) {
  const bytes = toUtf8Bytes(text);
  return {
    keccak: keccak256(bytes),
    sha3: hexlify(sha3_256(bytes)),
    sha512: sha512(bytes),
  };
}
export function checkChecksum(value) {
  if (!/^0x[\da-fA-F]{40}$/.test(value))
    return {
      valid: false,
      message: "Expected 0x followed by exactly 40 hexadecimal characters.",
    };
  const expected = getAddress(value.toLowerCase());
  return {
    valid: value === expected,
    expected,
    message:
      value === expected
        ? "Exact EIP-55 encoding matches."
        : "Case or value does not match its EIP-55 checksum.",
  };
}
export const childIndexBytes = (index) => toBeHex(index, 4);
