import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { SigningKey, toBeHex } from "ethers";
import {
  caesar,
  letterCounts,
  lettersOnly,
  distributionStats,
  trainLanguage,
  rankCaesar,
  runCaesarExperiment,
  wilson,
} from "../src/cryptanalysis.js";
import {
  EC_ORDER,
  publicKey,
  encryptBytes,
  encryptMessage,
  decryptBytes,
  decryptMessage,
  recoverPrivateKey,
  parsePoint,
  ciphertextStats,
  tamperFirstByte,
  randomPrivateKey,
} from "../src/toy-encryption.js";

const train = readFileSync(
  new URL("../public/corpora/train-austen.txt", import.meta.url),
  "utf8",
);
const heldOut = readFileSync(
  new URL("../public/corpora/test-carroll.txt", import.meta.url),
  "utf8",
);
const manifest = JSON.parse(
  readFileSync(
    new URL("../public/corpora/manifest.json", import.meta.url),
    "utf8",
  ),
);
const model = trainLanguage(train);

test("Caesar round trips for all 26 keys, including identity, case and Unicode preservation", () => {
  const text = "Attack at Dawn! Zz, 123. Caffè ☕";
  assert.equal(caesar("Abc XYZ!", 3), "Def ABC!");
  assert.equal(caesar(text, 0), text);
  for (let key = 0; key < 26; key++)
    assert.equal(caesar(caesar(text, key), -key), text);
  assert.equal(caesar("é🙂9", 7), "é🙂9");
  assert.throws(() => caesar("A", 1.5));
});
test("Caesar permutes letter counts and preserves entropy and coincidence index", () => {
  const text = heldOut.slice(0, 5000),
    original = letterCounts(text),
    a = distributionStats(original);
  for (let key = 0; key < 26; key++) {
    const rotated = letterCounts(caesar(text, key)),
      b = distributionStats(rotated);
    for (let i = 0; i < 26; i++)
      assert.equal(rotated[(i + key) % 26], original[i]);
    assert.ok(Math.abs(a.entropy - b.entropy) < 1e-12);
    assert.equal(a.ic, b.ic);
  }
  assert.equal(distributionStats(Array(26).fill(0)).entropy, null);
});
test("corpus files match source manifest; training/test authors and hashes are distinct", () => {
  for (const [i, text] of [train, heldOut].entries()) {
    assert.equal(lettersOnly(text).length, manifest.sources[i].letters);
    assert.equal(
      createHash("sha256").update(text).digest("hex"),
      manifest.sources[i].sha256,
    );
  }
  assert.notEqual(manifest.sources[0].author, manifest.sources[1].author);
  assert.notEqual(manifest.sources[0].sha256, manifest.sources[1].sha256);
  assert.ok(model.n > 100000);
});
test("smoothed corpus model, all-key ranking, explicit short-text ties and no-letter errors", () => {
  assert.ok(model.probabilities.every((p) => p > 0));
  assert.ok(
    Math.abs(model.probabilities.reduce((s, p) => s + p, 0) - 1) < 1e-12,
  );
  assert.throws(() => trainLanguage("short"));
  const result = rankCaesar(caesar(heldOut.slice(1000, 8000), 11), model);
  assert.equal(result.ranked.chi2[0].key, 11);
  assert.equal(result.ranked.trigram[0].key, 11);
  assert.equal(result.rows.length, 26);
  assert.equal(rankCaesar("Z", model).tied.trigram, 26);
  assert.throws(() => rankCaesar("123?!", model));
});
test("paired length experiment is reproducible, has correct denominators and bounded intervals", () => {
  const config = {
    trainText: train,
    testText: heldOut,
    seed: 20261021,
    trialCount: 10,
    lengths: [5, 20, 80],
  };
  const a = runCaesarExperiment(config),
    b = runCaesarExperiment(config);
  assert.deepEqual(a, b);
  assert.equal(a.trials.length, 3 * 10 * 3);
  assert.equal(a.summary.length, 9);
  for (const summary of a.summary) {
    assert.equal(summary.trials, 10);
    assert.equal(summary.rate, summary.successes / 10);
    assert.ok(
      summary.low <= summary.rate + 1e-12 &&
        summary.high >= summary.rate - 1e-12,
    );
    assert.ok(summary.low >= 0 && summary.high <= 1);
  }
  for (let i = 0; i < a.trials.length; i += 3) {
    const rows = a.trials.slice(i, i + 3);
    assert.equal(new Set(rows.map((r) => r.start)).size, 1);
    assert.equal(new Set(rows.map((r) => r.trueKey)).size, 1);
  }
  assert.notDeepEqual(
    a.trials,
    runCaesarExperiment({ ...config, seed: 7 }).trials,
  );
  assert.ok(wilson(0, 100)[1] > 0);
  assert.ok(wilson(100, 100)[0] < 1);
});
test("EC-ElGamal agrees with independent scalar relations and decrypts punctuation/UTF-8", () => {
  const result = encryptMessage("A", 3, () => 7n);
  assert.equal(
    result.packet.publicKey,
    SigningKey.computePublicKey(toBeHex(3, 32), true).slice(2),
  );
  assert.equal(
    result.packet.pairs[0].R,
    SigningKey.computePublicKey(toBeHex(7, 32), true).slice(2),
  );
  assert.equal(
    result.packet.pairs[0].C,
    SigningKey.computePublicKey(toBeHex(66 + 7 * 3, 32), true).slice(2),
  );
  assert.equal(result.trace.senderMask, result.trace.receiverMask);
  assert.equal(result.trace.mapped, result.trace.recovered);
  const text = "Caffè, hello 🌍!";
  let r = 0n;
  const encrypted = encryptMessage(text, 731, () => ++r);
  assert.equal(decryptMessage(encrypted.packet, 731), text);
  assert.throws(() => decryptMessage(encrypted.packet, 1));
});
test("all byte values round trip; identity C is explicitly encoded and decoded", () => {
  const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
  let r = 1n;
  const e = encryptBytes(bytes, 19, () => ++r);
  assert.deepEqual(decryptBytes(e.packet, 19), bytes);
  const identity = encryptBytes(Uint8Array.of(0), 1, () => EC_ORDER - 1n);
  assert.equal(identity.packet.pairs[0].C, "00");
  assert.deepEqual(decryptBytes(identity.packet, 1), Uint8Array.of(0));
  assert.throws(() => parsePoint("00"));
  assert.throws(() => parsePoint("02" + "ff".repeat(32)));
  assert.throws(() => encryptMessage("", 1));
  assert.throws(() => encryptBytes(new Uint8Array(257), 1));
});
test("ephemeral keys are full-range CSPRNG samples; prefixes excluded from coordinate histogram", () => {
  const a = encryptMessage("AA", 731),
    b = encryptMessage("AA", 731);
  assert.notDeepEqual(a.packet.pairs, b.packet.pairs);
  assert.ok(
    BigInt(a.trace.ephemeral) > 4096n && BigInt(a.trace.ephemeral) < EC_ORDER,
  );
  const s = ciphertextStats(a.packet);
  assert.equal(s.coordinateBytes, 128);
  assert.equal(s.payloadBytes, 132);
  assert.equal(
    s.counts.reduce((a, b) => a + b),
    128,
  );
  for (let i = 0; i < 30; i++) {
    const d = randomPrivateKey(4096);
    assert.ok(d >= 1 && d <= 4096);
  }
});
test("exhaustive and BSGS recover boundary keys from Q alone and report outside-range failure", () => {
  for (const key of [1, 2, 127, 128, 511, 512, 731, 1024, 4096]) {
    for (const method of ["exhaustive", "bsgs"])
      assert.equal(recoverPrivateKey(publicKey(key), 4096, method).key, key);
  }
  const brute = recoverPrivateKey(publicKey(731), 4096);
  assert.equal(brute.checks, 731);
  assert.equal(brute.additions, 730);
  assert.equal(recoverPrivateKey(publicKey(731), 128).key, null);
  assert.equal(recoverPrivateKey(publicKey(731), 128, "bsgs").key, null);
  const fast = recoverPrivateKey(publicKey(4096), 4096, "bsgs");
  assert.ok(fast.checks < 100 && fast.entries < 100);
  assert.throws(() => recoverPrivateKey(publicKey(1), 0));
});
test("ciphertext malleability is independent of a small private-key range", () => {
  const d = 2n ** 200n + 123n,
    packet = encryptMessage("A", d, () => 17n).packet;
  const changed = tamperFirstByte(packet);
  assert.equal(decryptMessage(packet, d), "A");
  assert.equal(decryptMessage(changed, d), "B");
  assert.notDeepEqual(packet, changed);
});
