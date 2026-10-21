import { secp256k1 } from "@noble/curves/secp256k1";

const Point = secp256k1.ProjectivePoint;
export const EC_ORDER = secp256k1.CURVE.n;
export const PRIVATE_KEY_LIMIT = 4096;
export const MAX_MESSAGE_BYTES = 256;
export const pointHex = (p) => (p.equals(Point.ZERO) ? "00" : p.toHex(true));
export function parsePoint(hex, { allowIdentity = false } = {}) {
  if (typeof hex !== "string")
    throw new TypeError("A hexadecimal curve point is required.");
  const value = hex.trim().replace(/^0x/i, "");
  if (value === "00" && allowIdentity) return Point.ZERO;
  if (!/^(02|03)[0-9a-f]{64}$/i.test(value))
    throw new RangeError(
      "Use a compressed secp256k1 point: 02 or 03 followed by 64 hex digits.",
    );
  const p = Point.fromHex(value);
  p.assertValidity();
  if (p.equals(Point.ZERO))
    throw new RangeError(
      "The identity cannot be a public key or ephemeral point.",
    );
  return p;
}
function privateScalar(d) {
  const k = BigInt(d);
  if (k < 1n || k >= EC_ORDER)
    throw new RangeError("Private scalar must be between 1 and n−1.");
  return k;
}
export const publicKey = (d) => pointHex(Point.BASE.multiply(privateScalar(d)));
export function randomPrivateKey(limit = PRIVATE_KEY_LIMIT) {
  if (!Number.isInteger(limit) || limit < 1 || limit > PRIVATE_KEY_LIMIT)
    throw new RangeError("Invalid demo key range.");
  const ceiling = Math.floor(0x100000000 / limit) * limit,
    word = new Uint32Array(1);
  let x;
  do {
    crypto.getRandomValues(word);
    x = word[0];
  } while (x >= ceiling);
  return 1 + (x % limit);
}
function ephemeralScalar() {
  // Exact rejection sampling: cryptographic randomness is separate from experiment seeds.
  const bytes = new Uint8Array(32);
  let r;
  do {
    crypto.getRandomValues(bytes);
    r = BigInt(
      "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""),
    );
  } while (r === 0n || r >= EC_ORDER);
  return r;
}
let dictionary;
function byteDictionary() {
  if (!dictionary) {
    const points = [],
      reverse = new Map();
    let p = Point.BASE;
    for (let byte = 0; byte < 256; byte++) {
      points.push(p);
      reverse.set(pointHex(p), byte);
      p = p.add(Point.BASE);
    }
    dictionary = { points, reverse };
  }
  return dictionary;
}
export function encryptBytes(bytes, d, scalarSource = ephemeralScalar) {
  if (
    !(bytes instanceof Uint8Array) ||
    !bytes.length ||
    bytes.length > MAX_MESSAGE_BYTES
  )
    throw new RangeError("Use a message containing 1–256 UTF-8 bytes.");
  const secret = privateScalar(d),
    Q = Point.BASE.multiply(secret),
    dict = byteDictionary(),
    pairs = [];
  let trace;
  for (let i = 0; i < bytes.length; i++) {
    const r = privateScalar(scalarSource()),
      M = dict.points[bytes[i]],
      R = Point.BASE.multiply(r),
      S = Q.multiply(r),
      C = M.add(S);
    pairs.push({ R: pointHex(R), C: pointHex(C) });
    if (i === 0)
      trace = {
        byte: bytes[i],
        mapped: pointHex(M),
        ephemeral: r.toString(),
        senderMask: pointHex(S),
        receiverMask: pointHex(R.multiply(secret)),
        recovered: pointHex(C.subtract(R.multiply(secret))),
      };
  }
  return {
    packet: { version: "ec-elgamal-byte-v1", publicKey: pointHex(Q), pairs },
    trace,
    byteLength: bytes.length,
  };
}
export function encryptMessage(text, d, scalarSource) {
  return encryptBytes(new TextEncoder().encode(text), d, scalarSource);
}
export function decryptBytes(packet, d) {
  if (
    packet?.version !== "ec-elgamal-byte-v1" ||
    !Array.isArray(packet.pairs) ||
    !packet.pairs.length ||
    packet.pairs.length > MAX_MESSAGE_BYTES
  )
    throw new RangeError("Invalid toy ciphertext packet.");
  const secret = privateScalar(d),
    dict = byteDictionary();
  return Uint8Array.from(
    packet.pairs.map((pair) => {
      const R = parsePoint(pair.R),
        C = parsePoint(pair.C, { allowIdentity: true }),
        M = C.subtract(R.multiply(secret));
      const byte = dict.reverse.get(pointHex(M));
      if (byte === undefined)
        throw new Error(
          "Recovered point is outside the byte codebook: wrong key or altered ciphertext.",
        );
      return byte;
    }),
  );
}
export function decryptMessage(packet, d) {
  return new TextDecoder("utf-8", { fatal: true }).decode(
    decryptBytes(packet, d),
  );
}
export function ciphertextStats(packet) {
  const counts = Array(16).fill(0);
  let payloadBytes = 0,
    coordinateBytes = 0,
    identities = 0;
  for (const pair of packet.pairs)
    for (const value of [pair.R, pair.C]) {
      payloadBytes += value.length / 2;
      if (value === "00") {
        identities++;
        continue;
      }
      // Exclude SEC1's structural prefix 02/03, which is not a uniform byte.
      for (let j = 2; j < value.length; j += 2) {
        counts[parseInt(value.slice(j, j + 2), 16) >>> 4]++;
        coordinateBytes++;
      }
    }
  return { counts, payloadBytes, coordinateBytes, identities };
}
export function tamperFirstByte(packet) {
  const copy = structuredClone(packet);
  copy.pairs[0].C = pointHex(
    parsePoint(copy.pairs[0].C, { allowIdentity: true }).add(Point.BASE),
  );
  return copy;
}
export function recoverPrivateKey(
  target,
  limit = PRIVATE_KEY_LIMIT,
  method = "exhaustive",
  progress = () => {},
) {
  if (!Number.isInteger(limit) || limit < 1 || limit > PRIVATE_KEY_LIMIT)
    throw new RangeError("Search limit must be between 1 and 4096.");
  const Q = parsePoint(target),
    start = performance.now(),
    samples = [];
  let key = null,
    checks = 0,
    additions = 0,
    entries = 0;
  if (method === "exhaustive") {
    let candidate = Point.BASE;
    for (let d = 1; d <= limit; d++) {
      checks++;
      if (d <= 5 || candidate.equals(Q))
        samples.push({
          candidate: d,
          point: pointHex(candidate),
          match: candidate.equals(Q),
        });
      if (candidate.equals(Q)) {
        key = d;
        break;
      }
      if (d < limit) {
        candidate = candidate.add(Point.BASE);
        additions++;
      }
      if (d % 128 === 0) progress({ completed: d, total: limit });
    }
  } else if (method === "bsgs") {
    const m = Math.ceil(Math.sqrt(limit + 1)),
      baby = new Map();
    let p = Point.ZERO;
    for (let j = 0; j < m; j++) {
      baby.set(pointHex(p), j);
      p = p.add(Point.BASE);
      additions++;
    }
    entries = baby.size;
    const stride = p;
    let giant = Q;
    for (let i = 0; i <= Math.floor(limit / m); i++) {
      checks++;
      const j = baby.get(pointHex(giant));
      if (j !== undefined) {
        const d = i * m + j;
        if (d >= 1 && d <= limit && Point.BASE.multiply(BigInt(d)).equals(Q)) {
          key = d;
          samples.push({ candidate: d, point: pointHex(Q), match: true });
          break;
        }
      }
      if (i < Math.floor(limit / m)) {
        giant = giant.subtract(stride);
        additions++;
      }
    }
  } else throw new RangeError("Unknown key-search method.");
  progress({ completed: key ?? limit, total: limit });
  return {
    key,
    method,
    limit,
    checks,
    additions,
    entries,
    samples,
    elapsedMs: performance.now() - start,
  };
}
