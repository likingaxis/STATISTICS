import {
  ALPHABET,
  METHODS,
  METHOD_LABELS,
  caesar,
  letterCounts,
  distributionStats,
  trainLanguage,
  rankCaesar,
} from "./cryptanalysis.js";
import { randomPrivateKey, MAX_MESSAGE_BYTES } from "./toy-encryption.js";

const state = {
  text: "MEET ME AT THE LIBRARY AT NINE.",
  shift: 3,
  privateKey: 731,
  packet: null,
  encryption: null,
  model: null,
  customCorpus: "",
  corpora: null,
  experiment: null,
  seed: 20261021,
  trials: 100,
  method: "chi2",
};
const $ = (selector) => document.querySelector(selector);
let ui,
  worker,
  serial = 0,
  active = false,
  pending = new Map(),
  corporaPromise;
let lifecycle = 0,
  encryptionVersion = 0,
  experimentVersion = 0;
const fmt = (value, d = 3) =>
  value === null ? "undefined" : Number(value).toFixed(d);
const percentage = (value) => (100 * value).toFixed(1) + "%";

function job(type, input, onProgress = () => {}) {
  if (!worker) {
    worker = new Worker(new URL("./homework3-worker.js", import.meta.url), {
      type: "module",
    });
    worker.onmessage = ({ data }) => {
      const item = pending.get(data.id);
      if (!item) return;
      if (data.progress) {
        item.progress(data.progress);
        return;
      }
      pending.delete(data.id);
      data.error
        ? item.reject(new Error(data.error))
        : item.resolve(data.result);
    };
    worker.onerror = () => {
      for (const item of pending.values())
        item.reject(
          new Error(
            "The experiment worker could not start. Reload this page and try again.",
          ),
        );
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  }
  const id = ++serial;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, progress: onProgress });
    worker.postMessage({ id, type, ...input });
  });
}
export function disposeHomework3() {
  active = false;
  lifecycle++;
  encryptionVersion++;
  experimentVersion++;
  worker?.terminate();
  worker = null;
  for (const item of pending.values())
    item.reject(new DOMException("Chapter changed.", "AbortError"));
  pending.clear();
}
function status(selector, message, isError = false) {
  if (!active || !$(selector)) return;
  $(selector).textContent = message;
  $(selector).classList.toggle("error-text", isError);
}
function exportCSV(name, rows) {
  // Spreadsheet-safe quoting for user-entered message fields.
  ui.download(
    name,
    rows.map((row) =>
      row.map((value) =>
        typeof value === "string" && /^[=+@\-\t\r]/.test(value)
          ? "'" + value
          : value,
      ),
    ),
  );
}
function block(value) {
  return `<code class="data-value">${ui.esc(value)}</code>`;
}
export function renderHomework3(helpers) {
  ui = helpers;
  const { chapterIntro, sectionHead, note } = ui;
  return `<main id="main" class="homework-three">${chapterIntro("3", "Public-Key Encryption<br><em>and Statistical Cryptanalysis</em>", "Encrypt the same plaintext using an elliptic-curve ElGamal scheme on secp256k1 and the classical Caesar cipher, then contrast statistical key recovery from English letter frequencies with algebraic key search over a restricted scalar range.", "ENCRYPTION & CRYPTANALYSIS")}
    <nav class="section-nav" aria-label="Chapter sections"><a href="#hw3-idea">Mathematical formulation</a><a href="#hw3-ciphers">Encryption &amp; decryption</a><a href="#hw3-statistics">Statistical cryptanalysis</a><a href="#hw3-key-search">ECC key recovery</a><a href="#hw3-discussion">Comparative analysis</a></nav>
    <section id="hw3-idea" class="content-section">
      ${sectionHead("01 / FORMULATION", "Additive masking in Z₂₆ versus point masking on secp256k1", "Both ciphers conceal a message element by adding a key-dependent mask and decrypt by subtracting that same mask.")}
      <div class="two-col prose"><div><p>Homework 1 introduced the discrete logarithm relationship Q = dG on a finite-field curve, and Homework 2 traced how a 256-bit secp256k1 key pair is derived inside an Ethereum wallet. Here we use the real <strong>secp256k1 group</strong> to implement a textbook <strong>EC-ElGamal encryption scheme</strong> and compare its structure and vulnerabilities against the classical <strong>Caesar cipher</strong>.</p><p>In our EC-ElGamal setup, the curve parameters and base point G are full-scale, and every plaintext byte is encrypted with a fresh 256-bit ephemeral scalar r drawn from a cryptographic RNG. However, to make key-recovery experiments computationally tractable in the browser, the recipient’s long-term private scalar is deliberately restricted to the small interval <strong>d ∈ {1, …, 4096}</strong>. This separates the effect of per-byte randomized masking from the vulnerability of a small private-key space.</p></div><div class="formula-box"><span class="eyebrow">GROUP MASKING IN BOTH SCHEMES</span><p class="formula">C = M + S, &nbsp; M = C − S</p><p><strong>Caesar cipher (over Z₂₆):</strong><br>c = (m + k) mod 26, &nbsp; m = (c − k) mod 26.</p><p><strong>EC-ElGamal (over secp256k1):</strong><br>R = rG, &nbsp; C = M + rQ, &nbsp; M = C − dR.</p><p>Because Q = dG and R = rG, associativity of scalar multiplication ensures that the sender’s mask rQ = r(dG) equals the recipient’s mask dR = d(rG).</p></div></div>
      <details><summary>Curve domain parameters, byte codebook M = (b + 1)G, and key roles</summary><p>The secp256k1 curve is defined by y² ≡ x³ + 7 (mod p) with p = 2²⁵⁶ − 2³² − 977, where the standard generator G has prime order n ≈ 2²⁵⁶. To map each UTF-8 byte b ∈ {0, …, 255} onto a valid curve point before encryption, we use the public reversible codebook <strong>M = (b + 1)G</strong>. After computing M = C − dR, the recipient recovers the byte value b by looking up M in the 256-entry table.</p><div class="table-scroll"><table><thead><tr><th>Quantity</th><th>Visibility</th><th>Mathematical role in the scheme</th></tr></thead><tbody><tr><td>d</td><td>Recipient secret (restricted to 1…4096)</td><td>Long-term decryption scalar used to compute dR from each ephemeral point R</td></tr><tr><td>Q = dG</td><td>Public key</td><td>Published by the recipient so any sender can compute masks rQ</td></tr><tr><td>r</td><td>Sender ephemeral secret (1…n−1)</td><td>Sampled freshly via CSPRNG for each byte to randomize the ciphertext pair</td></tr><tr><td>R = rG</td><td>Public (sent in ciphertext)</td><td>Transmitted alongside C so the recipient can reconstruct the shared mask</td></tr><tr><td>S = rQ = dR</td><td>Shared ephemeral point</td><td>Additive point mask that conceals the encoded byte point M</td></tr></tbody></table></div><p>Curve points are serialized in 33-byte compressed SEC 1 format (prefix <code>02</code> or <code>03</code> followed by the 32-byte x-coordinate); the point at infinity O is rejected for Q and R and encoded as <code>00</code> if it ever arises as C.</p></details>
    </section>
    <section id="hw3-ciphers" class="content-section">
      ${sectionHead("02 / LABORATORY", "Encrypting and decrypting a shared message", "Modify the plaintext, the recipient scalar d, or the Caesar shift k to inspect the resulting ciphertexts and frequency histograms.")}
      <div class="panel shared-message"><label for="h3-message">Shared plaintext message (UTF-8)</label><textarea id="h3-message" rows="3" maxlength="256">${ui.esc(state.text)}</textarea><p id="h3-byte-count" class="small muted"></p><p class="small">EC-ElGamal encrypts every UTF-8 byte (up to ${MAX_MESSAGE_BYTES} bytes). The Caesar cipher shifts ASCII letters A–Z and a–z while leaving spaces, digits, and punctuation unchanged.</p></div>
      <div class="two-col cipher-panels"><article class="panel"><div class="panel-heading"><h3>EC-ElGamal on secp256k1</h3></div><label for="h3-private">Recipient private key d · integer in 1…4096</label><input id="h3-private" type="number" min="1" max="4096" value="${state.privateKey}"><div class="checksum-actions"><button id="h3-random-key" class="secondary">Sample random demo key</button><button id="h3-encrypt" class="button">Encrypt &amp; decrypt with ECC</button></div><p id="h3-ecc-status" class="small" role="status">Preparing the initial encryption…</p><div id="h3-ecc-output"></div></article>
      <article class="panel"><h3>Caesar cipher</h3><label for="h3-shift">Shift key k · integer in 0…25</label><input id="h3-shift" type="number" min="0" max="25" value="${state.shift}"><div id="h3-caesar-output"></div><p class="interpretation">Because the same shift k is applied deterministically to every alphabetic character, identical plaintext letters always map to identical ciphertext letters, preserving the underlying frequency profile of the language.</p></article></div>
      <div id="h3-cipher-comparison"></div>
    </section>
    <section id="hw3-statistics" class="content-section">
      ${sectionHead("03 / STATISTICAL CRYPTANALYSIS", "Corpus-based key recovery for the Caesar cipher", "Using empirical letter and trigram distributions estimated from a training novel, we rank all 26 candidate shifts without knowledge of the true key.")}
      <div class="panel"><h3>Reference language model from English narrative text</h3><p id="h3-model-status" class="small" role="status">Loading local training and evaluation corpora…</p><button id="h3-retry-corpora" class="secondary" hidden>Retry loading corpora</button><p class="small">The reference model is trained on the first 200,000 characters of Jane Austen’s <em>Emma</em> (154,364 ASCII letters), while length-recovery experiments are evaluated on a disjoint test corpus from Lewis Carroll’s <em>Alice’s Adventures in Wonderland</em> (74,681 ASCII letters). <a class="text-link" href="${import.meta.env.BASE_URL}corpora/manifest.json" target="_blank" rel="noopener">Inspect corpus manifest and SHA-256 digests ↗</a></p><details><summary>Supply a custom English training corpus</summary><label for="h3-custom-corpus">Custom training text (minimum 1,000 A–Z letters)</label><textarea id="h3-custom-corpus" rows="5" maxlength="500000" placeholder="Paste an English training text here. Avoid pasting passages from the evaluation corpus.">${ui.esc(state.customCorpus)}</textarea><div class="checksum-actions"><button id="h3-use-custom" class="secondary">Apply custom corpus</button><button id="h3-default-corpus" class="secondary">Restore default Emma corpus</button></div><p id="h3-custom-status" class="small" role="status"></p></details><div id="h3-model-chart"></div></div>
      <div class="panel analysis-panel"><h3>Ranking all 26 candidate shifts</h3><label for="h3-ciphertext">Ciphertext to analyze</label><textarea id="h3-ciphertext" rows="3"></textarea><div class="experiment-toolbar"><div><label for="h3-score-method">Statistical scoring rule</label><select id="h3-score-method"><option value="chi2">Chi-square letter distance (χ²)</option><option value="trigram">Smoothed trigram log-likelihood</option><option value="dominant">Most frequent letter → E baseline</option></select></div><button id="h3-import-caesar" class="secondary">Copy current Caesar ciphertext</button><button id="h3-rank" class="button">Rank candidate keys</button></div><p id="h3-rank-status" class="small" role="status"></p><div id="h3-rank-output"></div></div>
      <div class="panel experiment-panel"><h3>Key-recovery accuracy as a function of ciphertext length</h3><p class="small">For each ciphertext length L ∈ {5, 10, 20, 40, 80, 160, 320, 640}, the worker samples random passages of length L from the held-out <em>Alice</em> corpus, encrypts them with uniformly drawn shifts, and evaluates all three ranking methods on the exact same trials.</p><div class="experiment-toolbar"><div><label for="h3-trials">Trials per length</label><select id="h3-trials">${[50, 100, 200, 500].map((n) => `<option ${n === state.trials ? "selected" : ""}>${n}</option>`).join("")}</select></div><div><label for="h3-seed">Sampling seed</label><input id="h3-seed" type="number" min="1" max="4294967295" value="${state.seed}"></div><button id="h3-run-experiment" class="button">Run length experiment</button><button id="h3-stop-experiment" class="secondary" disabled>Cancel running tasks</button></div><p id="h3-experiment-status" class="small" role="status">The initial batch runs automatically once the local corpora finish loading.</p><div id="h3-experiment-output"></div></div>
      <details><summary>Scoring formulas, smoothing, and limitations of frequency analysis</summary><div class="two-col prose"><div><p><strong>Chi-square distance score:</strong> From training letter counts fᵢ and total letters T, we compute Laplace-smoothed reference probabilities pᵢ = (fᵢ + 0.5) / (T + 13). For each candidate shift s ∈ {0, …, 25}, we decrypt the ciphertext, count the resulting letter frequencies Oᵢ, and evaluate χ²(s) = Σᵢ (Oᵢ − L pᵢ)² / (L pᵢ). The shift minimizing χ²(s) is selected as the top candidate.</p><p><strong>Trigram log-likelihood and single-letter baseline:</strong> As an extension, we also score candidates using overlapping letter triples with additive smoothing α = 0.1 across all 26³ = 17,576 trigrams (minimizing negative log-likelihood), and compare both against the naive rule that maps the single most frequent ciphertext letter to <code>E</code>.</p></div><div><p><strong>Statistical scope and failure modes:</strong> Here χ²(s) serves strictly as a goodness-of-fit ranking metric rather than a formal hypothesis test, since consecutive letters in natural language are strongly dependent and expected counts in short ciphertexts are small.</p><p>On very short texts (L = 5 or 10), sampling variance dominates and an unshifted decryption can accidentally match common English letters better than the true plaintext. Frequency recovery can also fail on proper nouns, technical jargon, lipograms, or texts written in a different language or register than the training corpus.</p></div></div></details>
    </section>
    <section id="hw3-key-search" class="content-section">
      ${sectionHead("04 / ALGEBRAIC KEY RECOVERY", "Attacking the restricted EC-ElGamal key space", "Because the recipient’s private key is constrained to d ∈ {1, …, 4096}, an attacker who knows only the public point Q and the curve parameters can recover d directly without inspecting the ciphertext.")}
      <div class="panel"><h3>Public-key search over d ∈ {1, …, K}</h3><label for="h3-target">Target compressed public key Q (hexadecimal)</label><input id="h3-target" type="text" class="mono" spellcheck="false" maxlength="68"><div class="experiment-toolbar"><div><label for="h3-search-limit">Search bound K</label><select id="h3-search-limit"><option value="128">1…128</option><option value="512">1…512</option><option value="1024">1…1024</option><option value="4096" selected>1…4096 · full demo range</option></select></div><div><label for="h3-search-method">Search algorithm</label><select id="h3-search-method"><option value="exhaustive">Incremental exhaustive search · O(K)</option><option value="bsgs">Baby-step giant-step (BSGS) · O(√K)</option></select></div><button id="h3-import-public" class="secondary">Use current demo public key</button><button id="h3-recover" class="button">Recover private key &amp; decrypt</button></div><p id="h3-search-status" class="small" role="status">Encrypt a message above or paste a valid compressed secp256k1 point.</p><div id="h3-search-output"></div><p class="interpretation">Incremental search starts at P₁ = G and repeatedly adds G (P_d = P_{d−1} + G), testing whether P_d = Q at each step. For a key drawn uniformly from {1, …, K}, it requires (K + 1)/2 point comparisons on average and at most K − 1 group additions.</p></div>
      <details><summary>Time–memory trade-off: Shanks’s baby-step giant-step algorithm</summary><p>Baby-step giant-step (BSGS) splits the unknown scalar as d = i m + j with m = ⌈√(K + 1)⌉ and 0 ≤ i, j &lt; m. The baby-step phase precomputes and stores jG in a hash table for j = 0, …, m − 1. The giant-step phase then steps through Q − i(mG) for i = 0, …, ⌊K / m⌋ until a collision with the table is found, reducing both worst-case group operations and storage to O(√K).</p></details>
    </section>
    <section id="hw3-discussion" class="content-section">
      ${sectionHead("05 / COMPARATIVE ANALYSIS", "Structural comparison and scaling to 256-bit keys")}
      <div class="table-scroll"><table class="roles-table"><thead><tr><th>Dimension</th><th>Caesar cipher</th><th>Toy EC-ElGamal on secp256k1</th></tr></thead><tbody>
      <tr><td>Encryption rule</td><td>Deterministic shift c = (m + k) mod 26</td><td>Randomized pair R = rG, C = M + rQ per byte</td></tr><tr><td>Decryption rule</td><td>Subtract shared shift: m = (c − k) mod 26</td><td>Subtract point mask: M = C − dR, then codebook lookup</td></tr><tr><td>Key material</td><td>Single symmetric shift k ∈ {0, …, 25}</td><td>Public point Q = dG, private scalar d, per-byte ephemeral r</td></tr><tr><td>Effective key space</td><td>26 keys (≈ 4.70 bits)</td><td>Restricted recipient scalar: 4,096 keys (12 bits); ephemeral r ≈ 256 bits</td></tr><tr><td>Ciphertext determinism</td><td>Identical plaintexts produce identical ciphertexts</td><td>Fresh ephemeral scalars yield distinct point pairs on every run</td></tr><tr><td>Statistical profile</td><td>Rotates the letter histogram; leaves entropy H and coincidence index IC invariant</td><td>Fresh masks hide plaintext letter repetitions across byte positions</td></tr><tr><td>Primary attack vector</td><td>Linguistic scoring (χ² or n-grams) on ciphertext letters</td><td>Discrete-logarithm search against Q = dG over the known interval</td></tr><tr><td>Dependence on message length</td><td>Success rate improves rapidly as ciphertext length L increases</td><td>Key recovery depends only on Q and K, regardless of message length</td></tr><tr><td>Key verification</td><td>Probabilistic: a short text can favour an incorrect shift</td><td>Exact: dG = Q uniquely identifies the scalar within the subgroup</td></tr><tr><td>Protocol limitations</td><td>Trivial key space and preserved word boundaries</td><td>66× ciphertext expansion and algebraic malleability (unauthenticated)</td></tr></tbody></table></div>
      <div class="two-col prose discussion-prose"><article><h3>Why a full 256-bit private key prevents key search</h3><p>On secp256k1, the generator order is n ≈ 1.158 × 10⁷⁷ ≈ 2²⁵⁶. When the recipient’s private key d is sampled uniformly from {1, …, n − 1} using a cryptographic random number generator, the probability that d falls inside a small enumerable interval is negligible.</p><p>Even with square-root discrete logarithm algorithms such as Pollard’s rho or BSGS, recovering a random 256-bit key requires on the order of √n ≈ 2¹²⁸ group operations, rendering algebraic key search computationally infeasible on classical hardware.</p></article><article><h3>Protocol weaknesses independent of key size</h3><p>Increasing the recipient key d to 256 bits eliminates the small-range search attack, but it does not turn textbook byte-wise EC-ElGamal into a secure production scheme. Encrypting each byte separately expands every 1-byte character into 66 bytes of compressed curve points and leaks the exact byte length of the plaintext.</p><p>Furthermore, because the ciphertext includes no authentication tag (unlike integrated schemes such as ECIES), an active attacker can algebraically modify C in transit without knowing d.</p></article></div>
      <details><summary>Interactive demonstration: ciphertext malleability without knowing d</summary><p>Because the byte codebook maps byte b to M = (b + 1)G, replacing the first ciphertext component C₀ with C₀′ = C₀ + G causes the recipient to compute M₀′ = C₀ + G − dR₀ = M₀ + G = (b + 2)G. As long as b &lt; 255, decryption silently increments the first plaintext byte by 1, regardless of how large the private key d is.</p><button id="h3-tamper" class="secondary">Add G to the first ciphertext point C₀</button><p id="h3-tamper-status" class="small" role="status"></p><div id="h3-tamper-output"></div></details>
      ${note("Summary of the two cryptanalytic mechanisms", "The Caesar attack succeeds because monoalphabetic substitution preserves the statistical redundancy of natural language. The EC-ElGamal key recovery succeeds because the recipient’s private key was restricted to a 12-bit interval, allowing direct enumeration of dG = Q even though fresh ephemeral scalars mask the letter frequencies in the ciphertext.")}
      <div class="chapter-footer-actions"><a class="button next-chapter" href="#hw4">Continue to Homework 4: stochastic processes →</a><a class="text-link" href="#references">Sources &amp; methodology →</a></div>
    </section></main>`;
}

function updateCaesar() {
  const text = $("#h3-message").value;
  state.text = text;
  const key = Number($("#h3-shift").value);
  const n = new TextEncoder().encode(text).length;
  $("#h3-byte-count").textContent =
    `${n} / ${MAX_MESSAGE_BYTES} UTF-8 bytes · ${letterCounts(text).reduce((a, b) => a + b, 0)} A–Z letters`;
  if (!Number.isInteger(key) || key < 0 || key > 25) {
    $("#h3-caesar-output").innerHTML =
      '<p class="error-text">Choose an integer shift from 0 to 25.</p>';
    return;
  }
  state.shift = key;
  const cipher = caesar(text, key),
    counts = letterCounts(text),
    stats = distributionStats(counts);
  $("#h3-caesar-output").innerHTML =
    `<label>Encryption: add ${key}</label>${block(cipher || "(empty message)")}<label>Decryption: subtract ${key}</label>${block(caesar(cipher, -key) || "(empty message)")}<p class="small"><strong>Exact round trip:</strong> ${caesar(cipher, -key) === text ? "yes" : "no"}. Letters counted: ${stats.n}.</p><div class="table-scroll alphabet-table"><table><tbody><tr><th>Plain</th>${[...ALPHABET].map((c) => `<td>${c}</td>`).join("")}</tr><tr><th>Shifted</th>${[...caesar(ALPHABET, key)].map((c) => `<td>${c}</td>`).join("")}</tr></tbody></table></div>`;
  if (state.encryption)
    status(
      "#h3-ecc-status",
      "Message or Caesar settings updated. Encrypt again to refresh the ECC comparison.",
    );
}
function drawEncryption(result) {
  state.encryption = result;
  state.packet = result.packet;
  state.encryptedText = result.inputText;
  state.encryptedPrivateKey = result.inputPrivateKey;
  const t = result.trace;
  $("#h3-ecc-output").innerHTML =
    `<label>Public encryption key Q = dG</label>${block(result.packet.publicKey)}<label>Decrypted UTF-8 message</label>${block(result.decrypted)}<p class="small"><strong>Exact round trip:</strong> ${result.decrypted === state.encryptedText ? "yes" : "no"} · ${result.byteLength} bytes · ${result.packet.pairs.length} point pairs · ${result.stats.payloadBytes} serialized point bytes (JSON overhead excluded).</p><div class="checksum-actions"><button id="h3-repeat-ecc" class="secondary">Encrypt again with fresh randomness</button><button id="h3-packet-export" class="secondary">Export point pairs ↓ CSV</button></div><details><summary>Follow the first byte through encryption and decryption</summary><p>Input byte b = ${t.byte}; encode it as (${t.byte}+1)G. The byte codebook is public. The scalar r shown below is secret in the algorithm and exposed here only as a worked demo.</p><label>M = (b + 1)G</label>${block(t.mapped)}<label>Ephemeral scalar r · full range, fresh for this byte</label>${block(t.ephemeral)}<label>Sender’s mask rQ</label>${block(t.senderMask)}<label>Recipient’s mask dR · must match</label>${block(t.receiverMask)}<label>Recovered point C − dR · must match M</label>${block(t.recovered)}<p class="small">Masks equal: ${t.senderMask === t.receiverMask ? "yes" : "no"}. Encoded and recovered point equal: ${t.mapped === t.recovered ? "yes" : "no"}.</p></details><details><summary>Inspect all ciphertext point pairs</summary><div class="table-scroll packet-table"><table><thead><tr><th>Byte index</th><th>R = rG</th><th>C = M + rQ</th></tr></thead><tbody>${result.packet.pairs.map((p, i) => `<tr><td>${i}</td><td class="mono wrap">${p.R}</td><td class="mono wrap">${p.C}</td></tr>`).join("")}</tbody></table></div></details>`;
  $("#h3-repeat-ecc").onclick = encrypt;
  $("#h3-packet-export").onclick = () =>
    exportCSV("homework3-ecc-pairs.csv", [
      ["protocol", "public_key", "byte_index", "R", "C"],
      ...result.packet.pairs.map((p, i) => [
        result.packet.version,
        result.packet.publicKey,
        i,
        p.R,
        p.C,
      ]),
    ]);
  $("#h3-target").value = result.packet.publicKey;
  const comparisonShift = result.comparisonShift;
  const plainCounts = letterCounts(state.encryptedText),
    caesarCounts = letterCounts(caesar(state.encryptedText, comparisonShift));
  const p = distributionStats(plainCounts),
    c = distributionStats(caesarCounts);
  $("#h3-cipher-comparison").innerHTML =
    `<div class="two-col cipher-panels"><article class="panel"><h3>Plaintext versus Caesar letter frequencies</h3>${ui.bars(plainCounts, { labels: [...ALPHABET], title: "Plaintext A to Z letter counts" })}${ui.bars(caesarCounts, { labels: [...ALPHABET], color: "orange", title: "Caesar ciphertext A to Z letter counts" })}<p class="small">Top: plaintext. Bottom: Caesar, k = ${comparisonShift} when this example was computed. Same alphabet and denominator, ${p.n} letters.</p><p class="interpretation">Empirical Shannon entropy: ${fmt(p.entropy)} → ${fmt(c.entropy)} bits/letter; index of coincidence: ${fmt(p.ic, 4)} → ${fmt(c.ic, 4)}. Because a Caesar shift simply permutes the 26 alphabet bins, both summary statistics remain invariant and the letter histogram is cyclically shifted rather than flattened.</p></article><article class="panel"><h3>ECC coordinate-byte frequencies</h3>${ui.bars(result.stats.counts, { labels: [..."0123456789abcdef"].map((h) => h + "x"), expected: result.stats.coordinateBytes / 16, title: "High-nibble bins of compressed point x-coordinate bytes" })}<p class="small">${result.stats.coordinateBytes} x-coordinate bytes from R and C, grouped by high nibble into 16 bins (00–0f, 10–1f, …, f0–ff). Expected reference: ${fmt(result.stats.coordinateBytes / 16, 2)} per bin. ${result.stats.identities} identity encodings excluded.</p><p class="interpretation">After stripping the structural 02/03 compression byte, the 32-byte x-coordinates of R and C are distributed across all 16 high-nibble bins. Because each plaintext byte receives an independent ephemeral scalar r, repeated plaintext letters no longer produce repeated ciphertext blocks.</p></article></div>`;
}
async function encrypt() {
  if (!active) return;
  const text = $("#h3-message").value,
    d = Number($("#h3-private").value),
    size = new TextEncoder().encode(text).length;
  if (!Number.isInteger(d) || d < 1 || d > 4096) {
    status(
      "#h3-ecc-status",
      "Choose an integer recipient key from 1 to 4096.",
      true,
    );
    return;
  }
  if (!size || size > MAX_MESSAGE_BYTES) {
    status(
      "#h3-ecc-status",
      `Enter 1–${MAX_MESSAGE_BYTES} UTF-8 bytes; this message contains ${size}.`,
      true,
    );
    return;
  }
  const previous = state.packet,
    version = ++encryptionVersion,
    page = lifecycle;
  state.privateKey = d;
  $("#h3-encrypt").disabled = true;
  $("#h3-random-key").disabled = true;
  if ($("#h3-repeat-ecc")) $("#h3-repeat-ecc").disabled = true;
  status(
    "#h3-ecc-status",
    "Encrypting with fresh CSPRNG scalars, then decrypting…",
  );
  try {
    const result = await job("encrypt", { text, privateKey: d });
    if (!active || page !== lifecycle || version !== encryptionVersion) return;
    result.inputText = text;
    result.inputPrivateKey = d;
    result.comparisonShift = state.shift;
    drawEncryption(result);
    const same =
      previous &&
      JSON.stringify(previous.pairs) === JSON.stringify(result.packet.pairs);
    status(
      "#h3-ecc-status",
      `${$("#h3-message").value === text ? "Round trip completed." : "This worked example uses the previous input; encrypt again to update it."} ${previous ? `Ciphertext point pairs ${same ? "match" : "differ from"} the previous encryption.` : "First worked example is ready."}`,
    );
  } catch (error) {
    if (error.name !== "AbortError")
      status("#h3-ecc-status", error.message, true);
  } finally {
    if (active && page === lifecycle && version === encryptionVersion) {
      $("#h3-encrypt").disabled = false;
      $("#h3-random-key").disabled = false;
      if ($("#h3-repeat-ecc")) $("#h3-repeat-ecc").disabled = false;
    }
  }
}
function drawModel() {
  const m = state.model;
  status(
    "#h3-model-status",
    `${state.customCorpus ? "Custom English corpus" : "Bundled Emma training excerpt"}: ${m.n.toLocaleString("en")} A–Z letters. Held-out Alice test excerpt: ${state.corpora.manifest.sources[1].letters.toLocaleString("en")} A–Z letters. Letter smoothing α = 0.5; trigram smoothing α = 0.1.`,
  );
  $("#h3-model-chart").innerHTML =
    ui.bars(m.counts, {
      labels: [...ALPHABET],
      title: "Training corpus A to Z counts",
    }) +
    '<p class="small">These measured counts, rather than a fixed English-frequency table, determine the candidate scores.</p>';
}
function rank() {
  if (!state.model) {
    status(
      "#h3-rank-status",
      "Wait for the local language corpus to load, then try again.",
      true,
    );
    return;
  }
  try {
    const cipher = $("#h3-ciphertext").value,
      method = $("#h3-score-method").value,
      result = rankCaesar(cipher, state.model),
      rows = result.ranked[method],
      best = rows[0];
    state.method = method;
    status(
      "#h3-rank-status",
      `${result.n} A–Z letters · all 26 shifts evaluated · ${result.tied[method]} tied best candidate(s). Ties select the lowest numeric key. No true key is used by this ranking.`,
    );
    $("#h3-rank-output").innerHTML =
      `<div class="inline-metrics"><b>${best.key}<small>best candidate key</small></b><b>${fmt(best[method], 2)}<small>${METHOD_LABELS[method]} · lower is better</small></b></div><label>Candidate plaintext · plausibility is not certainty</label>${block(caesar(cipher, -best.key))}${ui.bars(
        result.rows.map((r) => r[method]),
        {
          labels: result.rows.map((r) => r.key),
          title: "Candidate scores for all 26 Caesar shifts",
        },
      )}<p class="small">${method === "chi2" ? "χ² is a distance score here; no p-value is reported." : method === "trigram" ? "Negative trigram log likelihood; lower values rank first." : "This heuristic maps the first most-frequent ciphertext letter to E and ignores the rest of the distribution."}</p><details><summary>All 26 candidates, ranked by score</summary><div class="table-scroll"><table><thead><tr><th>Rank</th><th>Key</th><th>Score</th><th>Plaintext preview</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.key}</td><td>${fmt(r[method], 3)}</td><td>${ui.esc(r.preview)}</td></tr>`).join("")}</tbody></table></div></details><button id="h3-rank-export" class="secondary">Export candidate rankings ↓ CSV</button>`;
    $("#h3-rank-export").onclick = () =>
      exportCSV("homework3-caesar-candidates.csv", [
        ["method", "rank", "key", "score", "preview"],
        ...rows.map((r, i) => [method, i + 1, r.key, r[method], r.preview]),
      ]);
  } catch (error) {
    status("#h3-rank-status", error.message, true);
    $("#h3-rank-output").innerHTML = "";
  }
}
function accuracyPlot(result) {
  const w = 660,
    h = 270,
    l = 45,
    r = 18,
    t = 15,
    b = 40,
    colors = { chi2: "var(--series-main)", trigram: "var(--series-reference)", dominant: "var(--series-third)" };
  const x = (i) => l + (i / (result.lengths.length - 1)) * (w - l - r),
    y = (p) => h - b - p * (h - t - b);
  return `<div class="chart-scroll"><svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Key recovery success versus ciphertext length; three scoring methods"><title>Paired Caesar experiment: success rate by A–Z letter count</title>${[0, 0.25, 0.5, 0.75, 1].map((p) => `<line x1="${l}" x2="${w - r}" y1="${y(p)}" y2="${y(p)}" class="gridline"/><text x="${l - 8}" y="${y(p) + 4}" class="axis" text-anchor="end">${p * 100}%</text>`).join("")}<line x1="${l}" x2="${w - r}" y1="${y(1 / 26)}" y2="${y(1 / 26)}" class="expected"/>${METHODS.map(
    (method) => {
      const rows = result.summary.filter((row) => row.method === method);
      return `<polyline points="${rows.map((row, i) => `${x(i)},${y(row.rate)}`).join(" ")}" fill="none" stroke="${colors[method]}" stroke-width="2"/>${rows.map((row, i) => `<circle cx="${x(i)}" cy="${y(row.rate)}" r="4" fill="${colors[method]}"><title>${METHOD_LABELS[method]}, ${row.length} letters: ${row.successes}/${row.trials} = ${percentage(row.rate)}</title></circle>`).join("")}`;
    },
  ).join(
    "",
  )}${result.lengths.map((len, i) => `<text x="${x(i)}" y="${h - 18}" text-anchor="middle" class="axis">${len}</text>`).join("")}<text x="${w - r}" y="${h - 3}" text-anchor="end" class="axis">A–Z letters · doubling steps</text></svg></div>`;
}
function drawExperiment(result) {
  state.experiment = result;
  $("#h3-experiment-output").innerHTML =
    `<p class="dataset-caption">${result.protocol} · seed ${result.seed} · ${result.trialCount} trials × ${result.lengths.length} lengths = ${result.trialCount * result.lengths.length} ciphertexts, each ranked by all three methods. Training ${result.trainingLetters.toLocaleString("en")} letters; test ${result.testLetters.toLocaleString("en")} letters.</p>${accuracyPlot(result)}<div class="legend"><span><i class="dot green"></i>Letter χ²</span><span><i class="dot orange"></i>Trigrams (optional)</span><span><i class="dot blue"></i>Most frequent → E (optional)</span></div><p class="small">Dashed reference: uninformed uniform guessing, 1/26 ≈ 3.85%. Connecting lines guide reading between measured lengths; they are not a fitted law.</p><div class="table-scroll"><table><thead><tr><th>Letters</th><th>Scoring method</th><th>Correct / trials</th><th>Success</th><th>Wilson 95% interval</th><th>Mean true-key rank</th></tr></thead><tbody>${result.summary.map((row) => `<tr><td>${row.length}</td><td>${METHOD_LABELS[row.method]}</td><td>${row.successes} / ${row.trials}</td><td>${percentage(row.rate)}</td><td>${percentage(row.low)}–${percentage(row.high)}</td><td>${fmt(row.meanRank, 2)}</td></tr>`).join("")}</tbody></table></div><p class="interpretation">As the ciphertext length L increases from 5 to 640 letters, empirical letter counts converge toward the corpus distribution and key-recovery accuracy approaches 100%, with trigram scoring providing the strongest separation on very short excerpts.</p><div class="checksum-actions"><button id="h3-experiment-export" class="secondary">Export every trial ↓ CSV</button><button id="h3-summary-export" class="secondary">Export summary ↓ CSV</button></div><details><summary>Reproduction identifiers and sample trials</summary><p class="small">SHA-256 hashes of the exact UTF-8 training and test inputs used in this run:</p>${block("train: " + result.trainSha256 + "\ntest:  " + result.testSha256)}<p class="small">A sample starts at a zero-based offset in the test file after ASCII-letter normalization. Supply the same corpus files, seed, trial count and protocol to reproduce the complete dataset.</p><div class="table-scroll"><table><thead><tr><th>Length</th><th>Trial</th><th>Start</th><th>True key</th><th>Method</th><th>Chosen key</th><th>Best ties</th></tr></thead><tbody>${result.trials
      .slice(0, 12)
      .map(
        (row) =>
          `<tr><td>${row.length}</td><td>${row.trial}</td><td>${row.start}</td><td>${row.trueKey}</td><td>${row.method}</td><td>${row.predictedKey}</td><td>${row.bestTies}</td></tr>`,
      )
      .join("")}</tbody></table></div></details>`;
  $("#h3-experiment-export").onclick = () =>
    exportCSV("homework3-caesar-trials.csv", [
      [
        "protocol",
        "seed",
        "train_sha256",
        "test_sha256",
        "letters",
        "trial",
        "start",
        "true_key",
        "method",
        "predicted_key",
        "success",
        "best_ties",
        "true_key_midrank",
      ],
      ...result.trials.map((row) => [
        result.protocol,
        result.seed,
        result.trainSha256,
        result.testSha256,
        row.length,
        row.trial,
        row.start,
        row.trueKey,
        row.method,
        row.predictedKey,
        row.success,
        row.bestTies,
        row.trueMidRank,
      ]),
    ]);
  $("#h3-summary-export").onclick = () =>
    exportCSV("homework3-caesar-summary.csv", [
      [
        "protocol",
        "seed",
        "letters",
        "method",
        "trials",
        "correct",
        "rate",
        "wilson95_low",
        "wilson95_high",
        "mean_true_key_rank",
      ],
      ...result.summary.map((row) => [
        result.protocol,
        result.seed,
        row.length,
        row.method,
        row.trials,
        row.successes,
        row.rate,
        row.low,
        row.high,
        row.meanRank,
      ]),
    ]);
}
async function runExperiment() {
  if (!state.corpora || !state.model) {
    status(
      "#h3-experiment-status",
      "Load the local training and test corpora first.",
      true,
    );
    return;
  }
  const seed = Number($("#h3-seed").value),
    trialCount = Number($("#h3-trials").value);
  if (!Number.isInteger(seed) || seed < 1 || seed > 4294967295) {
    status(
      "#h3-experiment-status",
      "Choose an integer seed between 1 and 4294967295.",
      true,
    );
    return;
  }
  const version = ++experimentVersion,
    page = lifecycle;
  state.seed = seed;
  state.trials = trialCount;
  $("#h3-run-experiment").disabled = true;
  $("#h3-stop-experiment").disabled = false;
  $("#h3-use-custom").disabled = true;
  $("#h3-default-corpus").disabled = true;
  status(
    "#h3-experiment-status",
    "Running the paired length experiment in a background worker…",
  );
  try {
    const result = await job(
      "experiment",
      {
        trainText: state.customCorpus || state.corpora.train,
        testText: state.corpora.test,
        trialCount,
        seed,
      },
      (p) =>
        status(
          "#h3-experiment-status",
          `Completed ${p.completed}/${p.total} lengths; latest: ${p.length} letters.`,
        ),
    );
    if (!active || page !== lifecycle || version !== experimentVersion) return;
    drawExperiment(result);
    status(
      "#h3-experiment-status",
      "Experiment completed. Every displayed result was computed from the selected corpus and seed.",
    );
  } catch (error) {
    if (error.name !== "AbortError")
      status("#h3-experiment-status", error.message, true);
  } finally {
    if (active && page === lifecycle && version === experimentVersion) {
      $("#h3-run-experiment").disabled = false;
      $("#h3-stop-experiment").disabled = true;
      $("#h3-use-custom").disabled = false;
      $("#h3-default-corpus").disabled = false;
    }
  }
}
async function recover() {
  const target = $("#h3-target").value.trim().replace(/^0x/i, "").toLowerCase(),
    limit = Number($("#h3-search-limit").value),
    method = $("#h3-search-method").value;
  $("#h3-recover").disabled = true;
  status(
    "#h3-search-status",
    "Searching using only Q and the specified interval…",
  );
  try {
    const result = await job(
      "recover",
      { target, limit, method, packet: state.packet },
      (p) =>
        status(
          "#h3-search-status",
          `Compared ${p.completed} / ${p.total} candidates…`,
        ),
    );
    if (!active) return;
    status(
      "#h3-search-status",
      result.key === null
        ? `No private key in 1…${limit}. Try the full demo range if appropriate.`
        : `Verified: ${result.key}G equals the target public key.`,
    );
    $("#h3-search-output").innerHTML =
      `<div class="metric-grid"><div><span>RECOVERED PRIVATE KEY</span><b>${result.key ?? "not found"}</b><small>interval 1…${result.limit}</small></div><div><span>${method === "exhaustive" ? "CANDIDATES COMPARED" : "GIANT-STEP LOOKUPS"}</span><b>${result.checks}</b><small>${method === "exhaustive" ? "one exact public-point comparison per guess" : "not exhaustive keys tested"}</small></div><div><span>GROUP ADDITIONS</span><b>${result.additions}</b><small>${result.entries} stored baby steps</small></div><div><span>MEASURED ELAPSED TIME</span><b>${fmt(result.elapsedMs, 2)}<small>ms</small></b><small>this device and implementation</small></div></div>${result.decrypted !== undefined ? `<label>Message decrypted using the recovered key</label>${block(result.decrypted)}` : result.key !== null ? '<p class="small">Key recovered. The current demo packet belongs to a different public key, so no message is decrypted here.</p>' : ""}${result.samples.length ? `<div class="table-scroll"><table><thead><tr><th>Inspected candidate d</th><th>dG</th><th>Match?</th></tr></thead><tbody>${result.samples.map((row) => `<tr><td>${row.candidate}</td><td class="mono wrap">${row.point}</td><td>${row.match ? "yes" : "no"}</td></tr>`).join("")}</tbody></table></div>` : ""}<p class="small">Elapsed time reflects the Web Worker execution on this device, including point additions and progress reporting.</p>`;
  } catch (error) {
    status("#h3-search-status", error.message, true);
    $("#h3-search-output").innerHTML = "";
  } finally {
    if (active) $("#h3-recover").disabled = false;
  }
}
async function loadCorpora() {
  const base = import.meta.env.BASE_URL,
    page = lifecycle;
  if (!corporaPromise)
    corporaPromise = Promise.all(
      ["train-austen.txt", "test-carroll.txt", "manifest.json"].map(
        async (file) => {
          const response = await fetch(`${base}corpora/${file}`);
          if (!response.ok)
            throw new Error(
              `Could not load ${file}. Check the static host and retry.`,
            );
          return file.endsWith(".json") ? response.json() : response.text();
        },
      ),
    )
      .then(([train, test, manifest]) => ({ train, test, manifest }))
      .catch((error) => {
        corporaPromise = null;
        throw error;
      });
  try {
    const corpora = await corporaPromise;
    if (!active || page !== lifecycle) return;
    state.corpora = corpora;
    state.model = trainLanguage(state.customCorpus || state.corpora.train);
    drawModel();
    $("#h3-retry-corpora").hidden = true;
    rank();
    if (state.experiment) drawExperiment(state.experiment);
    else await runExperiment();
  } catch (error) {
    if (error.name === "AbortError") return;
    status("#h3-model-status", error.message, true);
    status(
      "#h3-experiment-status",
      "The experiment has no input corpus yet. Retry loading the bundled files.",
      true,
    );
    if (active) $("#h3-retry-corpora").hidden = false;
  }
}
export function bindHomework3() {
  active = true;
  updateCaesar();
  $("#h3-ciphertext").value = caesar(state.text, state.shift);
  $("#h3-score-method").value = state.method;
  $("#h3-message").oninput = updateCaesar;
  $("#h3-shift").oninput = updateCaesar;
  $("#h3-encrypt").onclick = encrypt;
  $("#h3-random-key").onclick = () => {
    $("#h3-private").value = randomPrivateKey();
    encrypt();
  };
  $("#h3-import-caesar").onclick = () => {
    $("#h3-ciphertext").value = caesar(state.text, state.shift);
    rank();
  };
  $("#h3-rank").onclick = rank;
  $("#h3-score-method").onchange = rank;
  $("#h3-run-experiment").onclick = runExperiment;
  $("#h3-stop-experiment").onclick = () => {
    disposeHomework3();
    active = true;
    $("#h3-run-experiment").disabled = false;
    $("#h3-stop-experiment").disabled = true;
    $("#h3-encrypt").disabled = false;
    $("#h3-random-key").disabled = false;
    $("#h3-recover").disabled = false;
    $("#h3-use-custom").disabled = false;
    $("#h3-default-corpus").disabled = false;
    if ($("#h3-repeat-ecc")) $("#h3-repeat-ecc").disabled = false;
    status(
      "#h3-experiment-status",
      "Running tasks cancelled. Last completed results, if any, remain available.",
    );
  };
  $("#h3-import-public").onclick = () => {
    if (!state.packet) {
      status("#h3-search-status", "Encrypt a demo message first.", true);
      return;
    }
    $("#h3-target").value = state.packet.publicKey;
  };
  $("#h3-recover").onclick = recover;
  $("#h3-tamper").onclick = async () => {
    if (!state.packet) {
      status("#h3-tamper-status", "Encrypt a demo message first.", true);
      return;
    }
    try {
      const result = await job("tamper", {
        packet: state.packet,
        privateKey: state.encryptedPrivateKey,
      });
      if (!active) return;
      status(
        "#h3-tamper-status",
        "Tampered ciphertext was accepted by the byte decoder; there is no authentication tag.",
      );
      $("#h3-tamper-output").innerHTML =
        `<label>Altered first point C + G</label>${block(result.changedC)}<label>Decrypted altered message</label>${block(result.decrypted)}`;
    } catch (error) {
      if (error.name !== "AbortError")
        status(
          "#h3-tamper-status",
          "This change did not decode as valid UTF-8 bytes. Such rejection is not guaranteed authentication: " +
            error.message,
          true,
        );
    }
  };
  const changeModel = async (custom) => {
    try {
      const text = custom ? $("#h3-custom-corpus").value : state.corpora?.train;
      if (!text) throw new Error("Load the bundled corpus first.");
      const model = trainLanguage(text);
      state.customCorpus = custom ? text : "";
      state.model = model;
      state.experiment = null;
      $("#h3-experiment-output").innerHTML = "";
      drawModel();
      rank();
      status(
        "#h3-custom-status",
        custom
          ? "Custom model applied. The held-out test file is unchanged."
          : "Bundled model restored.",
      );
      await runExperiment();
    } catch (error) {
      status("#h3-custom-status", error.message, true);
    }
  };
  $("#h3-use-custom").onclick = () => changeModel(true);
  $("#h3-default-corpus").onclick = () => changeModel(false);
  $("#h3-retry-corpora").onclick = loadCorpora;
  if (state.encryption) {
    drawEncryption(state.encryption);
    status(
      "#h3-ecc-status",
      "Last worked example restored. Encrypt again for fresh ephemeral scalars.",
    );
  } else encrypt();
  loadCorpora();
}
