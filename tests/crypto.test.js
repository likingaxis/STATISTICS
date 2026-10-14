import test from "node:test";
import assert from "node:assert/strict";
import {
  HDNodeWallet,
  Mnemonic,
  keccak256,
  toUtf8Bytes,
  getAddress,
  SigningKey,
  computeAddress,
  getBytes,
} from "ethers";
import {
  deriveDemo,
  hashExperiment,
  compareHashes,
  checkChecksum,
} from "../src/crypto.js";
test("BIP-39 official zero-entropy TREZOR vector", () => {
  const d = deriveDemo(0, "TREZOR");
  assert.equal(d.mnemonic, "abandon ".repeat(11) + "about");
  assert.equal(
    d.seed,
    "0xc55257c360c07c72029aebc1b53c05ed0362ada38ead3e3e9efa3708e53495531f09a6987599d18264c1e1c92f2cf141630c7a3c4ab7c81b2f001698e7463b04",
  );
});
// Published extended keys: BIP-32, Test vector 1 (not generated expectations).
test("BIP-32 published test vector 1, master and hardened child", () => {
  const m = HDNodeWallet.fromSeed("0x000102030405060708090a0b0c0d0e0f");
  assert.equal(
    m.privateKey,
    "0xe8f32e723decf4051aefac8e2c93c9c5b214313817cdb01a1494b917c8436b35",
  );
  assert.equal(
    m.chainCode,
    "0x873dff81c02f525623fd1fe5167eac3a55a049de3d314bb42ee227ffed37d508",
  );
  assert.equal(
    m.extendedKey,
    "xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi",
  );
  assert.equal(
    m.derivePath("m/0'").extendedKey,
    "xprv9uHRZZhk6KAJC1avXpDAp4MDc3sQKNxDiPvvkX8Br5ngLNv1TxvUxt4cV1rGL5hj6KCesnDYUhd7oWgT11eZG7XnxHrnYeSvkzY7d2bhkJ7",
  );
  assert.equal(
    m.derivePath("m/0'/1").extendedKey,
    "xprv9wTYmMFdV23N2TdNG573QoEsfRrWKQgWeibmLntzniatZvR9BmLnvSxqu53Kw1UmYPxLgboyZQaXwTCg8MSY3H2EU4pWcQDnRnrVA1xe8fs",
  );
});
test("Ethereum serialization independently agrees with known private scalar 1", () => {
  const key = "0x" + "0".repeat(63) + "1";
  const pub = SigningKey.computePublicKey(key, false);
  assert.equal(pub.slice(0, 4), "0x04");
  assert.equal(getBytes(pub).length, 65);
  assert.equal(
    getAddress("0x" + keccak256("0x" + pub.slice(4)).slice(-40)),
    "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf",
  );
  for (let i = 0; i < 3; i++) {
    const d = deriveDemo(i);
    assert.equal(getBytes(d.payload).length, 64);
    assert.equal(d.checksum, computeAddress(d.privateKey));
    assert.equal(d.address.length, 42);
  }
});
test("EIP-55 official vectors, strict case and malformed input", () => {
  for (const v of [
    "0x52908400098527886E0F7030069857D2E4169EE7",
    "0x8617E340B3D01FA5F11F306F4090FD50E238070D",
    "0xde709f2102306220921060314715629080e2fb77",
    "0x27b1fdb04752bbc536007a920d24acb045561c26",
    "0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed",
  ])
    assert.equal(checkChecksum(v).valid, true);
  assert.equal(
    checkChecksum("0x52908400098527886e0F7030069857D2E4169EE7").valid,
    false,
  );
  assert.equal(checkChecksum("<script>").valid, false);
});
test("empty Keccak-256 and SHA3-256 known answers are distinct", () => {
  const h = compareHashes("");
  assert.equal(
    h.keccak,
    "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470",
  );
  assert.equal(
    h.sha3,
    "0xa7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a",
  );
  assert.notEqual(h.keccak, h.sha3);
  assert.equal(compareHashes("hello").keccak, keccak256(toUtf8Bytes("hello")));
});
test("experiment is reproducible, flips exactly one input bit, correct denominators", () => {
  const a = hashExperiment(64, 1),
    b = hashExperiment(64, 1);
  assert.deepEqual(a, b);
  assert.equal(
    a.hexCounts.reduce((s, v) => s + v),
    64 * 64,
  );
  assert.equal(
    a.addressCounts.reduce((s, v) => s + v),
    40 * 64,
  );
  for (const r of a.rows) {
    const x = getBytes(r.input),
      y = getBytes(r.changed);
    let count = 0;
    for (let i = 0; i < x.length; i++)
      count += (x[i] ^ y[i]).toString(2).replaceAll("0", "").length;
    assert.equal(count, 1);
    assert.equal(keccak256(y), r.flipped);
  }
  assert.notDeepEqual(a.rows, hashExperiment(64, 2).rows);
  assert.throws(() => deriveDemo(0, "private secret"));
});
