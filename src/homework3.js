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
function required(text) {
  return `<span class="requirement">Required</span> ${text}`;
}

export function renderHomework3(helpers) {
  ui = helpers;
  const { chapterIntro, sectionHead, note } = ui;
  return `<main id="main" class="homework-three">${chapterIntro("3", "One message.<br><em>Two attacks.</em>", "Encrypt the same message with two different schemes, recover their deliberately weak keys, and measure how the attacks depend on language and key-space size.", "ENCRYPTION & CRYPTANALYSIS")}
    <nav class="section-nav" aria-label="Chapter sections"><a href="#hw3-idea">The scheme</a><a href="#hw3-ciphers">Encrypt & decrypt</a><a href="#hw3-statistics">Caesar cryptanalysis</a><a href="#hw3-key-search">ECC key recovery</a><a href="#hw3-discussion">Compare & interpret</a></nav>
    <section id="hw3-idea" class="content-section">
      ${sectionHead("01 / UNDERSTAND", "What exactly are we encrypting?", "The assignment is labelled “Homework 2” in the supplied text. It is Homework 3 in this site, following our curve and wallet chapters.")}
      <div class="two-col prose"><div><p>Homework 1 implemented the group law on a tiny field, modulo 17. Homework 2 used the real secp256k1 curve to derive wallet keys. Neither operation by itself encrypted a message. Here we explicitly add <strong>textbook EC-ElGamal on real secp256k1</strong>, using the same public-key idea Q = dG.</p><p>The curve and its generator retain their full-size parameters. Only the recipient’s private key is restricted to <strong>d ∈ {1,…,4096}</strong>. Each message byte receives a fresh, full-range random ephemeral scalar r. This isolates the small recipient key space as the weakness for our search attack.</p><p>All keys shown here are disposable teaching values. This unauthenticated, byte-wise construction is an experiment, not a production encryption protocol.</p></div><div class="formula-box"><span class="eyebrow">THE SHARED MATHEMATICAL IDEA</span><p class="formula">Add a mask.<br>Subtract it to recover.</p><p><strong>Caesar:</strong> c = (m + k) mod 26<br><strong>EC-ElGamal:</strong> C = M + rQ; M = C − dR<br><strong>Why it works:</strong> R = rG, so dR = r(dG) = rQ.</p><p>Caesar reuses one shift for every letter. EC-ElGamal generates a fresh curve-point mask for every byte.</p></div></div>
      <details><summary>Assignment checklist: what is required and what is an extension?</summary><div class="table-scroll"><table><thead><tr><th>Requirement</th><th>Where to inspect it</th></tr></thead><tbody>
      <tr><td>ECC encryption, decryption, steps and keys</td><td><a href="#hw3-ciphers">Worked EC-ElGamal example</a></td></tr><tr><td>Caesar on the same message</td><td><a href="#hw3-ciphers">Shared message and Caesar alphabet</a></td></tr><tr><td>Procedures, key spaces and statistical properties</td><td><a href="#hw3-discussion">Comparison table and ciphertext statistics</a></td></tr><tr><td>Corpus-based Caesar key recovery, tested at different lengths</td><td><a href="#hw3-statistics">Training corpus, 26 candidates and repeated length experiment</a></td></tr><tr><td>Attack the restricted ECC key space and explain the contrast</td><td><a href="#hw3-key-search">Exhaustive recovery, then decrypt</a></td></tr><tr><td>Explain why full-size keys change feasibility</td><td><a href="#hw3-discussion">Complexity and design limitations</a></td></tr><tr><td>Optional extensions</td><td>Trigram scoring, a simple frequency baseline, baby-step giant-step, and a tampering demonstration</td></tr></tbody></table></div></details>
      <details><summary>Curve parameters, point encoding and the role of each key</summary><p>secp256k1 uses y² = x³ + 7 modulo p, with p = 2²⁵⁶ − 2³² − 977, and the standard generator G of prime order n ≈ 2²⁵⁶. This is different from changing the field modulus to 17. Library arithmetic uses BigInt and validates incoming points.</p><p>To represent a UTF-8 byte b, we use the public, reversible codebook <strong>M = (b + 1)G</strong> for b = 0…255. This encoding supplies valid points and is not encryption. Decoding looks up the recovered point among those 256 entries. There is no assumption that an arbitrary curve point represents a byte.</p><div class="table-scroll"><table><thead><tr><th>Value</th><th>Who knows it?</th><th>Role</th></tr></thead><tbody><tr><td>d</td><td>Recipient; deliberately exposed in this demo</td><td>Long-term decryption scalar; restricted to 1…4096</td></tr><tr><td>Q = dG</td><td>Public</td><td>Lets anyone encrypt; lets the attacker verify guesses of d</td></tr><tr><td>r</td><td>Sender, for one byte only</td><td>Fresh secret scalar sampled from 1…n−1 using a CSPRNG</td></tr><tr><td>R = rG</td><td>Public, in the ciphertext</td><td>Lets the recipient compute dR without learning r</td></tr><tr><td>S = rQ = dR</td><td>Sender and recipient</td><td>Mask added to the encoded byte</td></tr></tbody></table></div><p>Points are serialized as compressed SEC 1 encodings (33 bytes). The exceptional identity C = O uses the explicit one-byte marker 00; O is never accepted as Q or R. This packet format and byte codebook are local educational choices, not an ECIES standard.</p></details>
    </section>
    <section id="hw3-ciphers" class="content-section">
      ${sectionHead("02 / EXPERIMENT", "The same message, two procedures.", "Change the shared input, then compare exact round trips and inspect the intermediate values.")}
      <div class="panel shared-message"><label for="h3-message">Shared message · public demo text</label><textarea id="h3-message" rows="3" maxlength="256">${ui.esc(state.text)}</textarea><p id="h3-byte-count" class="small muted"></p><p class="small">ECC encrypts all UTF-8 bytes (limit ${MAX_MESSAGE_BYTES}). Caesar shifts only ASCII A–Z / a–z and preserves other characters and letter case.</p></div>
      <div class="two-col cipher-panels"><article class="panel"><div class="panel-heading"><h3>${required("EC-ElGamal on secp256k1")}</h3></div><label for="h3-private">Recipient’s demo private key d · 1…4096</label><input id="h3-private" type="number" min="1" max="4096" value="${state.privateKey}"><div class="checksum-actions"><button id="h3-random-key" class="secondary">Draw a new demo key</button><button id="h3-encrypt" class="button">Encrypt & decrypt with ECC</button></div><p id="h3-ecc-status" class="small" role="status">Preparing the first worked example…</p><div id="h3-ecc-output"></div></article>
      <article class="panel"><h3>${required("Caesar cipher")}</h3><label for="h3-shift">Shared shift key k · 0…25</label><input id="h3-shift" type="number" min="0" max="25" value="${state.shift}"><div id="h3-caesar-output"></div><p class="interpretation">Encryption adds k modulo 26; decryption subtracts the same k. There are 26 transformations, including the identity k = 0, or 25 nontrivial shifts. No random value is used.</p></article></div>
      <div id="h3-cipher-comparison"></div>
    </section>
    <section id="hw3-statistics" class="content-section">
      ${sectionHead("03 / MEASURE", "Recover a shift from language statistics.", "The attacker receives ciphertext and an English model. The correct key is not supplied to the ranking algorithm.")}
      <div class="panel"><h3>${required("Build the language model")}</h3><p id="h3-model-status" class="small" role="status">Loading the bundled training and test excerpts…</p><button id="h3-retry-corpora" class="secondary" hidden>Retry loading corpora</button><p class="small">Training: Jane Austen, <em>Emma</em>. Evaluation: Lewis Carroll, <em>Alice’s Adventures in Wonderland</em>. Both excerpts are bundled locally from the NLTK Gutenberg distribution. Authors and text files are disjoint. <a class="text-link" href="${import.meta.env.BASE_URL}corpora/manifest.json" target="_blank" rel="noopener">Inspect corpus sources and SHA-256 hashes ↗</a></p><details><summary>Use your own English training corpus</summary><label for="h3-custom-corpus">English training text · at least 1,000 A–Z letters</label><textarea id="h3-custom-corpus" rows="5" maxlength="500000" placeholder="Paste training text here. Do not reuse the text you intend to evaluate.">${ui.esc(state.customCorpus)}</textarea><div class="checksum-actions"><button id="h3-use-custom" class="secondary">Use this training corpus</button><button id="h3-default-corpus" class="secondary">Restore bundled corpus</button></div><p id="h3-custom-status" class="small" role="status"></p></details><div id="h3-model-chart"></div></div>
      <div class="panel analysis-panel"><h3>${required("Rank all 26 candidate keys")}</h3><label for="h3-ciphertext">Ciphertext to analyse</label><textarea id="h3-ciphertext" rows="3"></textarea><div class="experiment-toolbar"><div><label for="h3-score-method">Scoring rule</label><select id="h3-score-method"><option value="chi2">Letter χ² · required method</option><option value="trigram">Trigram log likelihood · optional</option><option value="dominant">Most frequent → E · optional baseline</option></select></div><button id="h3-import-caesar" class="secondary">Use current Caesar ciphertext</button><button id="h3-rank" class="button">Recover Caesar key</button></div><p id="h3-rank-status" class="small" role="status"></p><div id="h3-rank-output"></div></div>
      <div class="panel experiment-panel"><h3>${required("Test different ciphertext lengths")}</h3><p class="small">For each of eight lengths, sample independent start positions with replacement from the fixed test excerpt and draw shifts uniformly from 0…25. Every scoring method receives the same ciphertexts. Length counts A–Z letters after normalization.</p><div class="experiment-toolbar"><div><label for="h3-trials">Trials per length</label><select id="h3-trials">${[50, 100, 200, 500].map((n) => `<option ${n === state.trials ? "selected" : ""}>${n}</option>`).join("")}</select></div><div><label for="h3-seed">Reproducible sampling seed</label><input id="h3-seed" type="number" min="1" max="4294967295" value="${state.seed}"></div><button id="h3-run-experiment" class="button">Run length experiment</button><button id="h3-stop-experiment" class="secondary" disabled>Cancel running tasks</button></div><p id="h3-experiment-status" class="small" role="status">The initial batch runs once the local corpora have loaded.</p><div id="h3-experiment-output"></div></div>
      <details><summary>Scoring equations, sampling protocol and honest limitations</summary><div class="two-col prose"><div><p><strong>Letter χ² score.</strong> From training counts fᵢ and total T, estimate pᵢ = (fᵢ + 0.5)/(T + 13). For each candidate shift s, decrypt and count letters Oᵢ. Compute χ²(s) = Σᵢ (Oᵢ − Lpᵢ)²/(Lpᵢ); choose the lowest score. Smoothing prevents zero expected counts.</p><p>This is a ranking score, not a claim that the formal chi-square test is valid on short texts. Rare expected cells can be tiny and language letters are dependent. We report no chi-square p-values.</p><p><strong>Optional trigram score.</strong> Join A–Z letters across word boundaries, count triples in training, add 0.1 to all 26³ possible counts, and sum their log probabilities in each candidate. Overlapping triples give a heuristic score, not a calibrated probability for the whole text. The table displays negative log likelihood, so lower is better. With fewer than three letters, all shifts tie.</p></div><div><p><strong>Exhaustive search and statistics work together.</strong> We enumerate all 26 keys; language scores decide which candidate looks plausible. The simple most-frequent → E baseline is a separate weak heuristic. Ties are resolved by the lowest numeric key and reported explicitly. The true key’s rank uses the midpoint of tied ranks.</p><p><strong>Protocol caesar-v1.</strong> A documented Mulberry32 generator and rejection sampling choose window starts and shifts from the supplied seed. This deterministic generator is for reproducible experiments only; ECC uses a CSPRNG. Excerpts may overlap. The test file never supplies training counts.</p><p>Wilson 95% intervals summarize resampling variability under a binomial model for this fixed corpus and sampling procedure. They do not establish a universal success rate for English, independent language letters, or unseen genres. Short or ambiguous messages, unusual spelling, proper names, a different language, or a biased custom corpus can defeat the ranking. A larger training corpus cannot remove intrinsic ambiguity.</p></div></div></details>
    </section>
    <section id="hw3-key-search" class="content-section">
      ${sectionHead("04 / ATTACK", "Recover the deliberately small private key.", "This attack compares public points. It needs no language model, known plaintext, or original secret key.")}
      <div class="panel"><h3>${required("Public-key search")}</h3><label for="h3-target">Target public key Q · compressed hexadecimal</label><input id="h3-target" type="text" class="mono" spellcheck="false" maxlength="68"><div class="experiment-toolbar"><div><label for="h3-search-limit">Search interval · d = 1…K</label><select id="h3-search-limit"><option value="128">1…128</option><option value="512">1…512</option><option value="1024">1…1024</option><option value="4096" selected>1…4096 · full demo range</option></select></div><div><label for="h3-search-method">Attack</label><select id="h3-search-method"><option value="exhaustive">Exhaustive incremental search · required</option><option value="bsgs">Baby-step giant-step · optional</option></select></div><button id="h3-import-public" class="secondary">Use current demo public key</button><button id="h3-recover" class="button">Recover key & decrypt</button></div><p id="h3-search-status" class="small" role="status">Encrypt a message above, or enter a valid public test key.</p><div id="h3-search-output"></div><p class="interpretation">Exhaustive search starts at P = G and compares P with Q. After a failed guess, P ← P + G. It costs at most K comparisons and K − 1 additions. If d is uniform in 1…K, the expected comparisons are (K + 1)/2. A search that finds nothing only excludes that interval; it does not prove the key is secure.</p></div>
      <details><summary>Optional: why baby-step giant-step needs fewer operations</summary><p>Set m = ⌈√(K + 1)⌉. Store jG for j = 0…m−1, then look for Q − imG in that table. A match gives d = im + j; check 1 ≤ d ≤ K and verify dG = Q. This uses O(√K) group operations and O(√K) stored points. The result reports table lookups and additions separately: a lookup is not an exhaustive key test. On a tiny range, table construction and point serialization can make this method slower in milliseconds despite fewer group additions.</p></details>
    </section>
    <section id="hw3-discussion" class="content-section">
      ${sectionHead("05 / INTERPRET", "Two weaknesses, two kinds of evidence.")}
      <div class="table-scroll"><table class="roles-table"><thead><tr><th>Property</th><th>Caesar cipher</th><th>Our toy EC-ElGamal scheme</th></tr></thead><tbody>
      <tr><td>Encryption</td><td>c = (m + k) mod 26</td><td>Encode byte M; send R = rG and C = M + rQ</td></tr><tr><td>Decryption</td><td>m = (c − k) mod 26</td><td>Recover M = C − dR and look up its byte</td></tr><tr><td>Keys and roles</td><td>One shared secret shift</td><td>Public encryption key Q, private decryption key d, fresh sender scalar r</td></tr><tr><td>Key space</td><td>26 keys; log₂26 ≈ 4.70 bits</td><td>Recipient: 4,096 keys = 12 bits. Ephemeral r remains full-range</td></tr><tr><td>Repeated encryption</td><td>Same message and key give the same ciphertext</td><td>Fresh r normally gives different ciphertext point pairs</td></tr><tr><td>Statistical fingerprint</td><td>Letter frequencies are rotated; letter entropy and index of coincidence are unchanged</td><td>Fresh masks hide direct letter repetition; serialized formats still have structure</td></tr><tr><td>Attack input</td><td>Ciphertext and a language distribution</td><td>Public Q and a known interval for d</td></tr><tr><td>Effect of message length</td><td>Generally more evidence for language-based ranking</td><td>Recovering d from Q does not depend on message length</td></tr><tr><td>Verification of a guess</td><td>A plausible score can select the wrong key</td><td>dG = Q verifies the scalar exactly within the interval</td></tr><tr><td>Other weaknesses</td><td>Tiny key space; spaces and non-letters also remain visible</td><td>No authentication, large byte-wise expansion, unsafe if r is reused or predictable</td></tr></tbody></table></div>
      <div class="two-col prose discussion-prose"><article><h3>Why full-size keys change feasibility</h3><p>The real secp256k1 private-scalar space contains n − 1 ≈ 2²⁵⁶ values. A uniformly generated full-range scalar is overwhelmingly unlikely to lie in 1…4096. Exhaustive enumeration of that full space is infeasible with current classical computing.</p><p>This does not mean every attack requires 2²⁵⁶ steps: generic discrete-log methods have square-root scale, roughly 2¹²⁸ group operations for a full-size group. A known short interval permits square-root searches in that much smaller interval. Entropy and the distribution of chosen keys matter, not just the curve’s name.</p></article><article><h3>What the statistics do and do not establish</h3><p>A successful Caesar experiment describes the specific training distribution, held-out text, sampling method and lengths used. It does not promise to recover every short English message. The ECC search succeeds because its target key belongs to a small enumerable set, even if the plaintext is random bytes.</p><p>A flat coordinate-byte histogram is not a proof of secure encryption. Full-range recipient keys would remove this small-interval weakness but would not add authentication, constant-time guarantees or a reviewed protocol design to this classroom construction.</p></article></div>
      <details><summary>Optional: demonstrate a design weakness independent of the key range</summary><p>Textbook EC-ElGamal is malleable. Replace the first C with C + G. Decryption produces M + G, so a byte encoded as (b + 1)G becomes b + 1 when it is still inside the 256-byte codebook. The attacker can make this algebraic change without knowing d. This weakness persists even with full-size keys.</p><button id="h3-tamper" class="secondary">Add G to the first ciphertext point</button><p id="h3-tamper-status" class="small" role="status"></p><div id="h3-tamper-output"></div><p class="small">The recipient’s demo key is used only to display the effect of tampering. A decoding failure is not an authentication mechanism: some altered ciphertexts still decode into valid text. A practical protocol needs suitable ciphertext authentication and authenticated public keys.</p></details>
      ${note("Keep the causes separate", "Caesar key ranking exploits redundant language statistics. The ECC recovery exploits the recipient’s restricted key space. Malleability arises from the chosen unauthenticated scheme. These are different mechanisms, and changing a key length does not repair all of them.")}
      <p class="small">Algorithm sources: <a class="text-link" href="https://www.secg.org/sec2-v2.pdf" target="_blank" rel="noopener">SEC 2 · curve parameters</a> · <a class="text-link" href="https://www.secg.org/sec1-v2.pdf" target="_blank" rel="noopener">SEC 1 · point encodings and integrated encryption</a> · <a class="text-link" href="https://cacr.uwaterloo.ca/hac/about/chap8.pdf" target="_blank" rel="noopener">Handbook of Applied Cryptography · ElGamal</a> · <a class="text-link" href="https://cacr.uwaterloo.ca/hac/about/chap3.pdf" target="_blank" rel="noopener">Discrete logarithms and search methods</a>. EC-ElGamal code, protocol, explanations and experiments here are original. Student references informed planning and were not imported.</p><a class="text-link" href="#references">Sources and methodology for all three chapters →</a>
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
    `<div class="two-col cipher-panels"><article class="panel"><h3>Plaintext versus Caesar letter frequencies</h3>${ui.bars(plainCounts, { labels: [...ALPHABET], title: "Plaintext A to Z letter counts" })}${ui.bars(caesarCounts, { labels: [...ALPHABET], color: "orange", title: "Caesar ciphertext A to Z letter counts" })}<p class="small">Top: plaintext. Bottom: Caesar, k = ${comparisonShift} when this example was computed. Same alphabet and denominator, ${p.n} letters.</p><p class="interpretation">Entropy ${fmt(p.entropy)} → ${fmt(c.entropy)} bits/letter; IC ${fmt(p.ic, 4)} → ${fmt(c.ic, 4)}. A shift permutes counts, so both statistics are exactly invariant (when defined). The histogram is rotated, not flattened.</p></article><article class="panel"><h3>ECC coordinate-byte frequencies</h3>${ui.bars(result.stats.counts, { labels: [..."0123456789abcdef"].map((h) => h + "x"), expected: result.stats.coordinateBytes / 16, title: "High-nibble bins of compressed point x-coordinate bytes" })}<p class="small">${result.stats.coordinateBytes} x-coordinate bytes from R and C, grouped by high nibble into 16 bins (00–0f, 10–1f, …, f0–ff). Expected reference: ${fmt(result.stats.coordinateBytes / 16, 2)} per bin. ${result.stats.identities} identity encodings excluded.</p><p class="interpretation">We remove structural 02/03 point prefixes. These bytes have a different alphabet from A–Z letters, so the heights and entropies are not directly comparable. The sample is small and curve outputs have algebraic structure; visual balance cannot certify security.</p></article></div>`;
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
    colors = { chi2: "#426d53", trigram: "#bd7045", dominant: "#596c9b" };
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
    `<p class="dataset-caption">${result.protocol} · seed ${result.seed} · ${result.trialCount} trials × ${result.lengths.length} lengths = ${result.trialCount * result.lengths.length} ciphertexts, each ranked by all three methods. Training ${result.trainingLetters.toLocaleString("en")} letters; test ${result.testLetters.toLocaleString("en")} letters.</p>${accuracyPlot(result)}<div class="legend"><span><i class="dot green"></i>Letter χ²</span><span><i class="dot orange"></i>Trigrams (optional)</span><span><i class="dot blue"></i>Most frequent → E (optional)</span></div><p class="small">Dashed reference: uninformed uniform guessing, 1/26 ≈ 3.85%. Connecting lines guide reading between measured lengths; they are not a fitted law.</p><div class="table-scroll"><table><thead><tr><th>Letters</th><th>Scoring method</th><th>Correct / trials</th><th>Success</th><th>Wilson 95% interval</th><th>Mean true-key rank</th></tr></thead><tbody>${result.summary.map((row) => `<tr><td>${row.length}</td><td>${METHOD_LABELS[row.method]}</td><td>${row.successes} / ${row.trials}</td><td>${percentage(row.rate)}</td><td>${percentage(row.low)}–${percentage(row.high)}</td><td>${fmt(row.meanRank, 2)}</td></tr>`).join("")}</tbody></table></div><p class="interpretation">Longer excerpts usually provide more linguistic evidence, but the observed curve need not increase at every measured point. These intervals concern the fixed-corpus resampling experiment, not all English text. Overlapping passages and a particular author’s style limit generalization.</p><div class="checksum-actions"><button id="h3-experiment-export" class="secondary">Export every trial ↓ CSV</button><button id="h3-summary-export" class="secondary">Export summary ↓ CSV</button></div><details><summary>Reproduction identifiers and sample trials</summary><p class="small">SHA-256 hashes of the exact UTF-8 training and test inputs used in this run:</p>${block("train: " + result.trainSha256 + "\ntest:  " + result.testSha256)}<p class="small">A sample starts at a zero-based offset in the test file after ASCII-letter normalization. Supply the same corpus files, seed, trial count and protocol to reproduce the complete dataset.</p><div class="table-scroll"><table><thead><tr><th>Length</th><th>Trial</th><th>Start</th><th>True key</th><th>Method</th><th>Chosen key</th><th>Best ties</th></tr></thead><tbody>${result.trials
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
      `<div class="metric-grid"><div><span>RECOVERED PRIVATE KEY</span><b>${result.key ?? "not found"}</b><small>interval 1…${result.limit}</small></div><div><span>${method === "exhaustive" ? "CANDIDATES COMPARED" : "GIANT-STEP LOOKUPS"}</span><b>${result.checks}</b><small>${method === "exhaustive" ? "one exact public-point comparison per guess" : "not exhaustive keys tested"}</small></div><div><span>GROUP ADDITIONS</span><b>${result.additions}</b><small>${result.entries} stored baby steps</small></div><div><span>MEASURED ELAPSED TIME</span><b>${fmt(result.elapsedMs, 2)}<small>ms</small></b><small>this device and implementation</small></div></div>${result.decrypted !== undefined ? `<label>Message decrypted using the recovered key</label>${block(result.decrypted)}` : result.key !== null ? '<p class="small">Key recovered. The current demo packet belongs to a different public key, so no message is decrypted here.</p>' : ""}${result.samples.length ? `<div class="table-scroll"><table><thead><tr><th>Inspected candidate d</th><th>dG</th><th>Match?</th></tr></thead><tbody>${result.samples.map((row) => `<tr><td>${row.candidate}</td><td class="mono wrap">${row.point}</td><td>${row.match ? "yes" : "no"}</td></tr>`).join("")}</tbody></table></div>` : ""}<p class="small">The timer measures the actual worker calculation, including its progress callbacks; it is not a calibrated benchmark. No extrapolated “years to break ECC” are inferred from this tiny experiment.</p>`;
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
