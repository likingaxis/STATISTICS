import "./style.css";
import {
  points,
  formatPoint,
  multiply,
  repeated,
  doubleAndAdd,
  pointOrder,
  toyDataset,
  bits,
  mean,
  frequency,
} from "./math.js";
import {
  deriveDemo,
  hashExperiment,
  compareHashes,
  checkChecksum,
} from "./crypto.js";

const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const num = (n, d = 3) => (n === null ? "undefined" : n.toFixed(d));
const state = {
  page: "home",
  g: [1, 5],
  k: 6,
  algorithm: "repeated",
  cursor: 6,
  mode: "census",
  speed: 900,
  index: 0,
  passphrase: "",
  run: 1,
  n: 256,
  experiment: null,
};
let timer;
const icon =
  '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 24 12 8l8 16 8-16M4 24h24" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="8" r="3" fill="currentColor"/><circle cx="20" cy="24" r="3" fill="currentColor"/></svg>';
function header() {
  return `<header class="topbar"><a class="brand" href="#home">${icon}<span>FIELDNOTES<span class="brand-sub">STATISTICS × CRYPTOGRAPHY</span></span></a><nav aria-label="Main navigation">${[
    ["home", "Overview"],
    ["hw1", "Homework 01"],
    ["hw2", "Homework 02"],
    ["references", "Sources & method"],
  ]
    .map(
      ([id, label]) =>
        `<a href="#${id}" ${state.page === id ? 'aria-current="page"' : ""}>${label}</a>`,
    )
    .join(
      "",
    )}</nav><span class="course-tag">INTERACTIVE STUDY LABS <i></i></span></header>`;
}
function footer() {
  return `<footer><a href="#home">FIELDNOTES <span> / A statistics notebook</span></a><p>Deterministic calculations. Reproducible experiments. Careful conclusions.</p><a href="#references">Sources & methodology ↗</a></footer>`;
}
function sectionHead(n, title, desc) {
  return `<div class="section-heading"><div><span class="eyebrow">${n}</span><h2>${title}</h2></div>${desc ? `<p>${desc}</p>` : ""}</div>`;
}
function note(title, text) {
  return `<aside class="note"><strong>${title}</strong><p>${text}</p></aside>`;
}
function bars(
  values,
  {
    labels = values.map((_, i) => i),
    expected = null,
    color = "green",
    title = "Frequency chart",
    suffix = "count",
  } = {},
) {
  const w = 660,
    h = 210,
    l = 38,
    r = 12,
    t = 22,
    b = 37,
    max = Math.ceil(Math.max(...values, expected ?? 0, 1) * 1.16),
    step = (w - l - r) / values.length;
  const y = (v) => h - b - (v / max) * (h - t - b);
  return `<div class="chart-scroll"><svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${[
    0,
    Math.ceil(max / 2),
    max,
  ]
    .map((v) => {
      return `<line x1="${l}" x2="${w - r}" y1="${y(v)}" y2="${y(v)}" class="gridline"/><text x="${l - 8}" y="${y(v) + 4}" text-anchor="end" class="axis">${v}</text>`;
    })
    .join(
      "",
    )}${values.map((v, i) => `<g><rect x="${l + i * step + step * 0.18}" y="${y(v)}" width="${step * 0.64}" height="${Math.max(1, h - b - y(v))}" rx="2" class="bar ${color}"><title>${labels[i]}: ${v} ${suffix}</title></rect><text x="${l + (i + 0.5) * step}" y="${h - 15}" text-anchor="middle" class="axis">${labels[i]}</text></g>`).join("")}${expected !== null ? `<line x1="${l}" x2="${w - r}" y1="${y(expected)}" y2="${y(expected)}" class="expected"/><text x="${w - r}" y="${y(expected) - 5}" text-anchor="end" class="reference-label">reference ${Number(expected.toFixed(2))}</text>` : ""}</svg></div>`;
}
function curveSVG(g = [1, 5], active = [5, 8], visited = []) {
  const s = 420,
    l = 38,
    b = 35,
    inner = 344,
    xy = ([x, y]) => [l + (x * inner) / 16, s - b - (y * inner) / 16];
  return `<svg class="curve" viewBox="0 0 420 420" role="img" aria-label="Discrete points satisfying y squared equals x cubed plus seven modulo seventeen. Base ${formatPoint(g)}, current result ${formatPoint(active)}"><title>Finite field F₁₇: 17 affine points and identity O</title>${Array.from(
    { length: 17 },
    (_, i) => {
      const [x, y] = xy([i, i]);
      return `<line x1="${x}" x2="${x}" y1="41" y2="385" class="gridline"/><line x1="38" x2="382" y1="${y}" y2="${y}" class="gridline"/>${i % 4 === 0 ? `<text x="${x}" y="406" class="axis" text-anchor="middle">${i}</text><text x="23" y="${y + 4}" class="axis" text-anchor="middle">${i}</text>` : ""}`;
    },
  ).join("")}${points
    .map((p) => {
      const [x, y] = xy(p),
        base = String(p) === String(g),
        current = active && String(p) === String(active),
        seen = visited.some((q) => String(q) === String(p));
      return `<g><circle cx="${x}" cy="${y}" r="${current ? 10 : base ? 8 : 6}" class="point ${current ? "current" : base ? "base" : seen ? "visited" : ""}"/><title>${formatPoint(p)}${base ? " · G" : ""}${current ? " · current result" : ""}</title>${current ? `<text x="${x + 14}" y="${y - 12}" class="point-label">Q ${formatPoint(p)}</text>` : base ? `<text x="${x + 12}" y="${y + 5}" class="point-label">G</text>` : ""}</g>`;
    })
    .join(
      "",
    )}<text x="382" y="28" class="axis" text-anchor="end">y ∈ F₁₇</text><text x="404" y="405" class="axis">x</text></svg>`;
}
function home() {
  return `<main id="main"><section class="hero"><div class="hero-copy"><span class="eyebrow"><span class="tiny-line"></span> THE CRYPTOGRAPHY NOTEBOOK · 01 / 02</span><h1>Cryptography,<br><em>observed.</em></h1><p class="hero-lead">From a point on a curve to an Ethereum address.<br>Explore the mathematics. Run the experiments.<br>Learn what the statistics can—and cannot—tell us.</p><div class="hero-actions"><a class="button" href="#hw1">Open the curve lab <span>↗</span></a><a class="text-link" href="#hw2">Explore the wallet pipeline →</a></div><div class="hero-meta"><span>2 connected chapters</span><span>Client-side calculations</span><span>Public test data only</span></div></div><div class="hero-figure"><div class="figure-top"><span>FIG. 01 — A SMALL FIELD, A BIG IDEA</span><span>ℤ / 17ℤ</span></div>${curveSVG()}<div class="figure-bottom"><span>y² ≡ x³ + 7 (mod 17)</span><span><i class="dot orange"></i>6G = (5, 8)</span></div><div class="floating-note">PRIVATE INPUT <b>6</b><span>→</span> PUBLIC POINT <b>(5, 8)</b></div></div></section><section class="chapter-section">${sectionHead("YOUR LEARNING PATH", "Two chapters. One connected story.", "Start with the algebra, then follow the same idea into a real wallet pipeline.")}<div class="chapter-cards"><a href="#hw1" class="chapter-card"><div class="chapter-top"><span class="chapter-number">01</span><span class="pill">ELLIPTIC CURVES</span></div><h3>From private key<br>to public point.</h3><p>Add points on a tiny curve, inspect every step, and measure the structure behind the outputs.</p><div class="chapter-bottom"><span>Finite fields · scalar multiplication · statistics</span><b>↗</b></div></a><a href="#hw2" class="chapter-card dark"><div class="chapter-top"><span class="chapter-number">02</span><span class="pill">ETHEREUM WALLETS</span></div><h3>From recovery phrase<br>to Ethereum address.</h3><p>Trace the standards, inspect real intermediate values, and test how a single bit changes a hash.</p><div class="chapter-bottom"><span>HD derivation · Keccak · checksums</span><b>↗</b></div></a></div></section><section class="method-strip"><span class="eyebrow">HOW TO USE THIS NOTEBOOK</span><div>${[
    ["01", "Understand", "Read the idea in plain language."],
    ["02", "Experiment", "Change an input. Follow the calculation."],
    ["03", "Measure", "Inspect the data, charts, and denominators."],
    ["04", "Interpret", "Separate observations from security claims."],
  ]
    .map(
      ([n, h, p]) =>
        `<article><span>${n}</span><h3>${h}</h3><p>${p}</p></article>`,
    )
    .join(
      "",
    )}</div></section>${note("A laboratory for learning", "The small curve is deliberately insecure. All wallet examples are publicly known test data. This site is a learning tool; never use its example keys or addresses to hold funds.")}</main>`;
}
function chapterIntro(n, title, desc, tags) {
  return `<div class="chapter-intro"><a href="#home" class="back">← THE NOTEBOOK</a><span class="eyebrow">HOMEWORK ${n} <span class="separator">/</span> ${tags}</span><h1>${title}</h1><p>${desc}</p></div>`;
}
function hw1() {
  return `<main id="main">${chapterIntro("01", "A private number.<br><em>A public point.</em>", "Scalar multiplication is repeated point addition. On this small curve, every calculation is visible—and every statistical claim can be checked.", "TOY ECC LAB")}<nav class="section-nav" aria-label="Chapter sections"><a href="#idea1">The idea</a><a href="#lab1">Curve laboratory</a><a href="#stats1">Statistical exploration</a><a href="#conclusion1">Interpretation</a></nav><section id="idea1" class="content-section">${sectionHead("01 / UNDERSTAND", "A curve made of individual points.")}<div class="two-col prose"><div><p>A <strong>private key</strong> is a number, k. A <strong>public key</strong> is a point, Q = kG, obtained by repeatedly adding a base point G. In a real system, the private key signs messages and the public key verifies signatures.</p><p>Here we work modulo 17: every calculation wraps into the integers 0–16. For example, 20 mod 17 = 3. This is a finite field, so the plot contains discrete points, rather than a continuous curve.</p></div><div class="formula-box"><span class="eyebrow">OUR TOY CURVE</span><p class="formula">y² ≡ x³ + 7 <small>(mod 17)</small></p><p>p = 17 &nbsp; · &nbsp; a = 0 &nbsp; · &nbsp; b = 7</p><p>G = (1, 5) lies on the curve:<br>5² mod 17 = 8 = (1³ + 7) mod 17.</p></div></div></section><section id="lab1" class="content-section">${sectionHead("02 / EXPERIMENT", "Build the public point.", "Change the scalar or the base point. Play the calculation slowly, or inspect one operation at a time.")}<div class="lab-layout"><div class="panel controls"><h3>The inputs</h3><label for="base">Base point G</label><select id="base">${points.map((q) => `<option value="${q}" ${String(q) === String(state.g) ? "selected" : ""}>${formatPoint(q)} · order ${pointOrder(q)}</option>`).join("")}</select><label for="scalar">Private scalar k <span id="scalar-label">${state.k}</span></label><input id="scalar" type="range" min="1" max="36" value="${state.k}"><div class="inline-input"><input aria-label="Private scalar as integer" id="scalar-number" type="number" min="1" max="36" value="${state.k}"><span>integer · 1 to 36</span></div><label for="algorithm">Multiplication method</label><select id="algorithm"><option value="repeated" ${state.algorithm === "repeated" ? "selected" : ""}>Repeated addition</option><option value="binary" ${state.algorithm === "binary" ? "selected" : ""}>Double-and-add</option></select><label for="speed">Animation speed</label><select id="speed"><option value="1500">Slow · 1.5 s</option><option value="900" selected>Normal · 0.9 s</option><option value="350">Fast · 0.35 s</option></select><div class="playback"><button id="play" class="button">▶ Play</button><button id="step" class="secondary">Step →</button><button id="reset" class="icon-button" aria-label="Reset animation">↺</button></div><p class="muted small">No autoplay. The chart and operation log follow the same calculation.</p><p id="input-error" role="alert"></p></div><div class="panel plot-panel"><div class="panel-heading"><h3>The finite field</h3><span class="pill">17 AFFINE POINTS + O</span></div><div id="curve-plot"></div><div class="legend"><span><i class="dot"></i>Curve point</span><span><i class="dot green"></i>Base G</span><span><i class="dot orange"></i>Current result</span></div></div><div class="panel result-panel"><span class="eyebrow">TOY PUBLIC KEY</span><div id="toy-result" class="big-result" aria-live="polite"></div><div id="cycle-summary"></div><hr><h3>Inside the current operation</h3><div id="operation"></div></div></div><div class="panel log-panel"><div class="panel-heading"><h3>Calculation log</h3><span id="operation-count" class="muted"></span></div><div class="table-scroll"><table><thead><tr><th>Step</th><th>Operation</th><th>Left point</th><th>Right point</th><th>Result</th></tr></thead><tbody id="step-table"></tbody></table></div></div><details><summary>The point-addition rules, explained</summary><div class="two-col prose"><div><p>For two distinct points P = (x₁,y₁), R = (x₂,y₂), with x₁ ≠ x₂:</p><code>λ = (y₂ − y₁) · (x₂ − x₁)⁻¹ mod 17</code><p>For doubling P = R, with y₁ ≠ 0:</p><code>λ = (3x₁² + a) · (2y₁)⁻¹ mod 17</code><p>Division means multiplication by a modular inverse. For example, 10⁻¹ = 12 since 10 × 12 mod 17 = 1.</p></div><div><code>x₃ = λ² − x₁ − x₂ mod 17<br>y₃ = λ(x₁ − x₃) − y₁ mod 17</code><p>The identity O satisfies P + O = P. A point and its opposite (x, −y mod 17) add to O. Doubling a point with y = 0 also gives O.</p><p>These modular formulas implement the group law. Lines drawn between plotted points would not be ordinary geometric addition, so this plot does not invent connecting curves.</p></div></div></details></section><section id="stats1" class="content-section">${sectionHead("03 / MEASURE", "Read the structure in the data.", "A deterministic finite dataset, with explicit scope. These are descriptive statistics, not a test of cryptographic security.")}<div class="experiment-toolbar"><div><label for="scope">Dataset</label><select id="scope"><option value="census" ${state.mode === "census" ? "selected" : ""}>Full nonzero subgroup census</option><option value="sequence" ${state.mode === "sequence" ? "selected" : ""}>Current sequence: k = 1…selected scalar</option></select></div><button id="toy-csv" class="secondary">Export data ↓ CSV</button></div><div id="toy-statistics"></div></section><section id="conclusion1" class="content-section">${sectionHead("04 / INTERPRET", "Structure is not a security proof.")}<div class="two-col prose"><article><h3>Why is the real operation one-way?</h3><p>Forward multiplication k → kG is efficient. Recovering k from Q is the elliptic-curve discrete logarithm problem (ECDLP). For appropriately chosen real curves this is computationally infeasible using known classical methods. Here, at most 18 trials reveal every point: the toy curve is easy to invert.</p><p>The algebra remains visible: <strong>(a + b)G = aG + bG</strong>. This structure is useful for public-key cryptography and signatures.</p></article><article><h3>Why is this not a hash?</h3><p>A cryptographic hash maps variable-length inputs to a fixed-length digest and targets preimage, second-preimage and collision resistance. Avalanche is a useful hash behavior to explore. It is not a universal requirement for scalar multiplication.</p><p>Balanced bits, small Pearson correlations or a large Hamming distance cannot establish one-wayness. On this toy group the periodicity and symmetries are mathematical consequences, not implementation failures.</p></article></div><a class="button next-chapter" href="#hw2">Continue to Homework 02: the wallet pipeline →</a></section></main>`;
}
function steps() {
  return state.algorithm === "repeated"
    ? repeated(state.k, state.g)
    : doubleAndAdd(state.k, state.g);
}
function stop() {
  clearInterval(timer);
  timer = null;
  if ($("#play")) $("#play").textContent = "▶ Play";
}
function drawLab() {
  const log = steps();
  state.cursor = Math.min(state.cursor, log.length);
  const current = state.cursor ? log[state.cursor - 1].point : null,
    final = multiply(state.k, state.g),
    order = pointOrder(state.g),
    d = log[state.cursor - 1];
  $("#curve-plot").innerHTML = curveSVG(
    state.g,
    current,
    log
      .slice(0, state.cursor)
      .map((s) => s.point)
      .filter(Boolean),
  );
  $("#toy-result").textContent = formatPoint(final);
  $("#cycle-summary").innerHTML =
    `<p><strong>${state.k}G = ${formatPoint(final)}</strong></p><p class="small">Order of G: <b>${order}</b><br>${order}G = O · ${order + 1}G = G</p>${final === null ? '<p class="notice">O is the identity, not an affine public key.</p>' : ""}<p class="small muted">Animation: operation ${state.cursor} / ${log.length}. Current point: ${formatPoint(current)}.</p>`;
  $("#operation").innerHTML = !d
    ? "<p>Start at O, the identity. Step forward to add the base point.</p>"
    : d.kind === "identity"
      ? `<p>${formatPoint(d.before)} + ${formatPoint(d.operand)} = ${formatPoint(current)}</p><p class="muted small">Identity rule: O + P = P.</p>`
      : d.kind === "inverse"
        ? `<p>${formatPoint(d.before)} + ${formatPoint(d.operand)} = O</p><p class="muted small">Opposite points have equal x and opposite y modulo 17.</p>`
        : `<span class="pill">${d.kind.toUpperCase()}</span><p class="mono">${formatPoint(d.before)} + ${formatPoint(d.operand)}</p><p class="mono small">${d.denominator}⁻¹ mod 17 = ${d.inverse}<br>λ = ${d.numerator} × ${d.inverse} mod 17 = ${d.slope}</p><p class="mono small">x₃ = (${d.slope}² − ${d.before[0]} − ${d.operand[0]}) mod 17 = ${current[0]}<br>y₃ = (${d.slope}(${d.before[0]} − ${current[0]}) − ${d.before[1]}) mod 17 = ${current[1]}</p>`;
  $("#operation-count").textContent =
    `${log.length} operations · both methods agree: ${formatPoint(multiply(state.k, state.g))}`;
  $("#step-table").innerHTML = log
    .map(
      (s, i) =>
        `<tr class="${i === state.cursor - 1 ? "selected-row" : ""}"><td>${i + 1}</td><td>${s.label}</td><td>${formatPoint(s.before)}</td><td>${formatPoint(s.operand)}</td><td><strong>${formatPoint(s.point)}</strong>${i < state.cursor ? ' <span class="complete">✓</span>' : ""}</td></tr>`,
    )
    .join("");
}
function computeToyStats() {
  const d = toyDataset(state.g, state.mode, state.k),
    n = d.affine.length;
  const entropy = (counts) =>
    -counts.filter(Boolean).reduce((s, c) => s + (c / n) * Math.log2(c / n), 0);
  $("#toy-statistics").innerHTML =
    `<p class="dataset-caption">${state.mode === "census" ? `Exact census: k = 1…${d.order - 1}, each visited once; ${d.order}G = O shown separately.` : `Sequence: k = 1…${state.k}. Repeated points count again.`} ${d.rows.length} scalars; ${n} affine outputs; ${d.rows.length - n} identities excluded from coordinate and bit statistics. G = ${formatPoint(state.g)}.</p><div class="metric-grid"><div><span>AFFINE OBSERVATIONS</span><b>${n}</b><small>denominator for marginal frequencies</small></div><div><span>SUBGROUP ORDER</span><b>${d.order}</b><small>includes the identity O</small></div><div><span>PEARSON r(k, x)</span><b>${num(d.rx)}</b><small>affine rows only</small></div><div><span>PEARSON r(k, y)</span><b>${num(d.ry)}</b><small>affine rows only</small></div></div><div class="two-col"><article class="panel"><h3>x-coordinate frequency</h3>${bars(d.fx, { expected: n / 17, title: "x frequency across all field values 0 to 16" })}<p class="small">Counts on all 17 field values, including zeros. Dashed line: ${num(n / 17, 2)} per value under a uniform field marginal.</p><p class="interpretation">${d.fx.filter(Boolean).length} of 17 x-values occur. Points P and −P share x; uniform sampling of distinct group points does not make x uniform on the field.</p></article><article class="panel"><h3>y-coordinate frequency</h3>${bars(d.fy, { expected: n / 17, color: "orange", title: "y frequency across all field values 0 to 16" })}<p class="small">The same ${n} affine outputs and the same 0–16 support. Frequencies count observations, including repeats in sequence mode.</p><p class="interpretation">Empirical marginal entropy: H(x) = ${num(entropy(d.fx))} bits, H(y) = ${num(entropy(d.fy))} bits. Field-uniform reference: log₂17 = 4.087 bits. Descriptive entropy is not key entropy.</p></article></div><div class="two-col"><article class="panel"><h3>One-bits by encoded position</h3>${bars(d.bitCounts, { labels: ["x₄", "x₃", "x₂", "x₁", "x₀", "y₄", "y₃", "y₂", "y₁", "y₀"], expected: n / 2, title: "One bit counts in 5 bit x and 5 bit y encoding" })}<p class="small">Each coordinate uses 5 bits, most significant first. Each bar has denominator n = ${n}; 50% reference = ${num(n / 2, 1)}.</p><p class="interpretation">Only 0–16 of the 32 possible 5-bit codes belong to the field. Unequal bit frequencies partly reflect the encoding and subgroup constraints.</p></article><article class="panel"><h3>Change exactly one input bit</h3><p class="small">Separate complete comparison set for this G: valid keys 1…${d.order - 1}. Unique unordered pairs (a, a XOR 2ᵇ); both keys nonzero and below the subgroup order. This set follows G and does not depend on the selected sequence length.</p><div class="inline-metrics"><b>${d.flips.length}<small>valid pairs</small></b><b>${num(mean(d.flips.map((f) => f.distance)), 2)}<small>mean changed bits / 10</small></b></div><div class="table-scroll compact-table"><table><thead><tr><th>Key pair</th><th>Flipped bit</th><th>Hamming / 10</th></tr></thead><tbody>${d.flips.map((f) => `<tr><td>${f.a} ↔ ${f.b}</td><td>${f.bit} (LSB = 0)</td><td>${f.distance}</td></tr>`).join("") || '<tr><td colspan="3">No valid one-bit pairs for this subgroup.</td></tr>'}</tbody></table></div><p class="interpretation">This measures distances between 10-bit coordinate encodings. A large change in a few toy examples does not establish the avalanche property of a hash.</p></article></div><details><summary>Inspect the dataset and its interpretation</summary><p>Under a uniform draw from k = 1…${d.order - 1}, each nonidentity subgroup point has probability 1/${d.order - 1}. The census visits each once. Sequence mode is a deterministic prefix and may contain full cycles and unequal repetitions. No p-values are attached: the tiny finite population and low expected cell counts do not justify an asymptotic chi-square claim.</p><p>r(k,x) and r(k,y) describe linear association only. A zero value does not prove independence; undefined means too few observations or zero variance.</p><div class="table-scroll"><table><thead><tr><th>k</th><th>kG</th><th>x (5 bits)</th><th>y (5 bits)</th></tr></thead><tbody>${d.rows.map((r) => `<tr><td>${r.k}</td><td>${formatPoint(r.q)}</td><td>${r.q ? bits(r.q).slice(0, 5) : "excluded"}</td><td>${r.q ? bits(r.q).slice(5) : "excluded"}</td></tr>`).join("")}</tbody></table></div></details>`;
}
function scatter(rows) {
  const w = 660,
    h = 210,
    l = 38,
    r = 20,
    t = 15,
    b = 36,
    end = Math.max(...rows.map((r) => r.k), 1);
  const x = (k) => l + ((k - 1) / Math.max(end - 1, 1)) * (w - l - r),
    y = (v) => h - b - (v / 16) * (h - t - b);
  return `<div class="chart-scroll"><svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Input scalar k versus output coordinates, x in green and y in orange"><title>Input-output scatter plot; affine observations only</title>${[0, 4, 8, 12, 16].map((v) => `<line x1="${l}" x2="${w - r}" y1="${y(v)}" y2="${y(v)}" class="gridline"/><text x="${l - 8}" y="${y(v) + 4}" class="axis" text-anchor="end">${v}</text>`).join("")}${rows.map((row) => `<g><circle cx="${x(row.k)}" cy="${y(row.q[0])}" r="4" fill="#426d53"><title>k=${row.k}; x=${row.q[0]}</title></circle><circle cx="${x(row.k)}" cy="${y(row.q[1])}" r="3" fill="#c66b3e"><title>k=${row.k}; y=${row.q[1]}</title></circle></g>`).join("")}${Array.from(
    new Set([1, Math.ceil(end / 2), end]),
  )
    .map(
      (k) =>
        `<text x="${x(k)}" y="${h - 16}" class="axis" text-anchor="middle">${k}</text>`,
    )
    .join(
      "",
    )}<text x="${w - 4}" y="${h - 16}" class="axis">k</text></svg></div>`;
}
function toyStats() {
  computeToyStats();
  const d = toyDataset(state.g, state.mode, state.k);
  document
    .getElementById("toy-statistics")
    .insertAdjacentHTML(
      "beforeend",
      `<article class="panel"><h3>Input scalar versus output coordinates</h3>${scatter(d.affine)}<div class="legend"><span><i class="dot green"></i>x-coordinate</span><span><i class="dot orange"></i>y-coordinate</span></div><p class="interpretation">Each dot uses the selected dataset: ${d.affine.length} affine observations, with O excluded. Cycles and symmetries can be visible even when linear correlation is small. Pearson r is a summary of linear association; it does not measure cryptographic one-wayness.</p></article>`,
    );
}

function download(name, rows) {
  const csv = rows
    .map((row) =>
      row
        .map((v) => '"' + String(v ?? "").replaceAll('"', '""') + '"')
        .join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function bindHW1() {
  drawLab();
  toyStats();
  function update() {
    stop();
    state.cursor = steps().length;
    drawLab();
    toyStats();
  }
  $("#base").onchange = (e) => {
    state.g = e.target.value.split(",").map(Number);
    update();
  };
  function scalar(e) {
    const k = Number(e.target.value);
    if (!Number.isInteger(k) || k < 1 || k > 36) {
      $("#input-error").textContent = "Choose an integer from 1 to 36.";
      return;
    }
    $("#input-error").textContent = "";
    state.k = k;
    $("#scalar").value = k;
    $("#scalar-number").value = k;
    $("#scalar-label").textContent = k;
    update();
  }
  $("#scalar").oninput = scalar;
  $("#scalar-number").oninput = scalar;
  $("#algorithm").onchange = (e) => {
    state.algorithm = e.target.value;
    update();
  };
  $("#speed").value = state.speed;
  $("#speed").onchange = (e) => {
    state.speed = Number(e.target.value);
    stop();
  };
  $("#reset").onclick = () => {
    stop();
    state.cursor = 0;
    drawLab();
  };
  $("#step").onclick = () => {
    stop();
    state.cursor = Math.min(state.cursor + 1, steps().length);
    drawLab();
  };
  $("#play").onclick = () => {
    if (timer) {
      stop();
      return;
    }
    if (state.cursor >= steps().length) state.cursor = 0;
    $("#play").textContent = "Ⅱ Pause";
    drawLab();
    timer = setInterval(() => {
      state.cursor++;
      drawLab();
      if (state.cursor >= steps().length) stop();
    }, state.speed);
  };
  $("#scope").onchange = (e) => {
    state.mode = e.target.value;
    toyStats();
  };
  $("#toy-csv").onclick = () => {
    const d = toyDataset(state.g, state.mode, state.k);
    download("toy-ecc-data.csv", [
      [
        "base_x",
        "base_y",
        "subgroup_order",
        "scope",
        "k",
        "x",
        "y",
        "identity",
        "encoding_x5_y5",
      ],
      ...d.rows.map((r) => [
        ...state.g,
        d.order,
        state.mode,
        r.k,
        ...(r.q ?? ["", ""]),
        r.q === null,
        r.q ? bits(r.q) : "",
      ]),
    ]);
  };
}

const standards = [
  [
    "BIP-39",
    "RECOVERY & DERIVATION",
    "Entropy becomes words with a checksum. PBKDF2-HMAC-SHA512 then derives a 64-byte seed, with 2,048 iterations and salt “mnemonic” + passphrase. Text uses Unicode NFKD normalization.",
  ],
  [
    "BIP-32",
    "HIERARCHICAL DERIVATION",
    "A seed becomes a master private key and chain code via HMAC-SHA512, keyed by “Bitcoin seed”. Child keys and chain codes form a deterministic tree; the chain code is part of the extended key.",
  ],
  [
    "BIP-44",
    "PATH CONVENTION",
    "m / 44′ / 60′ / 0′ / 0 / i means purpose / Ethereum coin type / account / external chain / address index. An apostrophe denotes hardened derivation, which requires parent private material. This is a common Ethereum path, not the only wallet convention.",
  ],
  [
    "secp256k1",
    "PUBLIC-KEY CRYPTOGRAPHY",
    "Q = kG on a real 256-bit prime field. The private scalar signs; the public point verifies ECDSA signatures. Same group-law idea as Homework 01, with secure parameters and a large prime-order group.",
  ],
  [
    "Keccak-256",
    "HASHING & TRUNCATION",
    "Hash the 64 coordinate bytes X || Y of the uncompressed public key; remove the 0x04 byte prefix first. Keep the last 20 bytes of the 32-byte digest: the address value.",
  ],
  [
    "EIP-55",
    "CHECKSUM ENCODING",
    "Hash the lowercase 40-digit address text (ASCII, without 0x) using Keccak-256. For each a–f letter, uppercase it if the corresponding hash nibble is at least 8. This preserves the same 20 bytes.",
  ],
];
function hw2() {
  return `<main id="main">${chapterIntro("02", "One seed.<br><em>Many distinct roles.</em>", "Follow a public test example through the Ethereum wallet pipeline. Then measure hash diffusion, output frequencies, and checksum behavior.", "ETHEREUM WALLET PIPELINE")}<nav class="section-nav" aria-label="Chapter sections"><a href="#pipeline">The pipeline</a><a href="#standards">The standards</a><a href="#hash-lab">Statistical exploration</a><a href="#checksum">Checksum lab</a><a href="#history">History & interpretation</a></nav><section id="pipeline" class="content-section">${sectionHead("01 / FOLLOW THE DATA", "From words to an address.", "Every value below is computed locally using ethers. The input is fixed public test entropy, with a choice of public test passphrases.")}<div class="safety-banner"><strong>PUBLIC TEST DATA</strong><span>These words and keys are known to everyone. Never send funds to these addresses. No real recovery phrase is requested.</span></div><div class="experiment-toolbar"><div><label for="address-index">Address index i</label><select id="address-index">${Array.from({ length: 6 }, (_, i) => `<option value="${i}" ${i === state.index ? "selected" : ""}>${i} · m/44′/60′/0′/0/${i}</option>`).join("")}</select></div><div><label for="passphrase">Public test passphrase</label><select id="passphrase"><option value="">Empty string (default)</option><option value="TREZOR" ${state.passphrase === "TREZOR" ? "selected" : ""}>TREZOR (BIP-39 test vector)</option></select></div><button class="secondary" id="pipeline-export">Export walkthrough ↓</button></div><div id="pipeline-values"></div></section><section id="standards" class="content-section">${sectionHead("02 / UNDERSTAND", "Six standards. Different jobs.")}<div class="standard-grid">${standards.map(([name, role, text], i) => `<article><span class="eyebrow">0${i + 1} / ${role}</span><h3>${name}</h3><p>${text}</p></article>`).join("")}</div><details><summary>The real curve, and the BIP-32 derivation rules</summary><p>secp256k1 uses y² = x³ + 7 over Fₚ, with p = 2²⁵⁶ − 2³² − 977. Private scalars range from 1 to n − 1, where n is the generator order. Arithmetic on coordinates is modulo p; arithmetic on private scalars is modulo n.</p><p>BIP-32 splits HMAC-SHA512 output into I_L and I_R: the master scalar comes from I_L, and I_R is the chain code. For private child derivation, the scalar is (parse(I_L) + parent scalar) mod n. Non-hardened derivation hashes the compressed parent public key and child index; hardened derivation hashes 0x00, parent private key, and the hardened index. Invalid scalars are rejected following BIP-32. These operations are handled by the library, not by JavaScript Number arithmetic.</p></details><div class="entropy-band"><div><span class="eyebrow">12-WORD BIP-39 EXAMPLE</span><h3>128 bits of entropy ≠ 512 new random bits.</h3><p>128 random bits + 4 checksum bits = 132 bits, encoded as 12 × 11-bit word indices from a 2,048-word list. The seed is 512 bits long, but deterministic stretching does not create new entropy.</p></div><div class="entropy-visual"><span style="flex:128">128 entropy bits</span><span style="flex:4" title="4 checksum bits">4</span></div><p class="small">A uniformly generated valid 12-word mnemonic has 2¹²⁸ possibilities. Among arbitrary independent 12-word sequences, only 1/16 pass the 4-bit checksum. For 24 words: 256 entropy bits + 8 checksum bits, so 1/256 pass. Our fixed public example has no secrecy.</p></div></section><section id="hash-lab" class="content-section">${sectionHead("03 / MEASURE", "Flip one bit. Measure the difference.", "Each trial hashes a 32-byte message and a copy with exactly one bit inverted. The experiment uses Keccak-256, not SHA3-256.")}<div class="experiment-toolbar"><div><label for="sample-size">Number of message pairs</label><select id="sample-size">${[64, 256, 1024].map((n) => `<option ${n === state.n ? "selected" : ""}>${n}</option>`).join("")}</select></div><button id="run-hashes" class="button">Run next reproducible batch ↻</button><button id="hash-csv" class="secondary">Export pairs ↓ CSV</button></div><div id="hash-statistics" aria-live="polite"></div><details><summary>Experimental protocol & limitations</summary><p>Protocol v1: trial j uses the 32 bytes Keccak-256(UTF-8("statistics-lab/v1/batch/j")). Flip bit b = j mod 256: byte floor(b/8), mask 1 &lt;&lt; (b mod 8). Hash both byte strings and count differing digest bits. CSV exports both messages, hashes, and Hamming distances so the result can be reproduced independently.</p><p>The test inputs are deterministic and reproducible, not independent random observations. Under the ideal independent-output-bit model, D ~ Binomial(256, 0.5), with mean 128 and standard deviation 8. The reported standard error s/√n is a descriptive model-based benchmark, not a validated confidence interval. Good diffusion on these inputs does not prove preimage or collision resistance.</p><p>Hex frequencies use each original digest once (64 digits per trial). The 20-byte-tail comparison uses its last 40 digits, like address truncation, but these messages are not wallet public keys; do not interpret the tails as sampled wallet accounts. Tail and full-digest frequencies overlap and are not independent samples. Bit balance uses 256n original output bits.</p></details><article class="panel hash-compare"><h3>Same text. Different hash functions.</h3><label for="hash-message">Public example text (UTF-8)</label><input id="hash-message" type="text" maxlength="256" value="hello"><div id="hash-comparison"></div><p class="interpretation">SHA-512 is in SHA-2 and uses a different design from the Keccak sponge construction. Ethereum Keccak-256 and standardized SHA3-256 share the underlying permutation but use different padding/domain-separation conventions: their outputs differ. SHA-512 serves HMAC/PBKDF2 here; Keccak-256 produces the address hash.</p></article></section><section id="checksum" class="content-section">${sectionHead("04 / TEST A REPRESENTATION", "A checksum detects mistakes.", "EIP-55 changes letter case without changing the underlying 20-byte address. Test an exact encoding, then introduce an error.")}<div class="panel"><label for="checksum-input">Public demo address · exact EIP-55 validator</label><input id="checksum-input" class="mono" spellcheck="false" maxlength="44"><div class="checksum-actions"><button id="checksum-reset" class="secondary">Restore computed address</button><button id="checksum-case" class="secondary">Flip one letter’s case</button><button id="checksum-digit" class="secondary">Change one hex value</button></div><div id="checksum-result" role="status"></div><p class="small">This lab compares the exact EIP-55 encoding, including case. Some wallet APIs accept all-lowercase or all-uppercase strings as unchecked addresses; that acceptance does not mean a checksum was verified. A changed value can occasionally still have a valid checksum. Passing is not proof of ownership or intended recipient.</p></div></section><section id="history" class="content-section">${sectionHead("05 / CONNECT THE IDEAS", "Why not use one algorithm?")}<div class="table-scroll"><table class="roles-table"><thead><tr><th>Operation</th><th>Purpose</th><th>In this pipeline</th></tr></thead><tbody>${[
    [
      "Key generation",
      "Sample an unpredictable secret",
      "CSPRNG produces initial entropy",
    ],
    [
      "Key derivation",
      "Deterministically derive related secrets",
      "PBKDF2 / BIP-32",
    ],
    [
      "Public-key cryptography",
      "Sign and publicly verify",
      "secp256k1 / ECDSA",
    ],
    ["Hashing", "Produce a fixed-size digest", "Keccak-256"],
    ["Checksum", "Detect accidental errors", "BIP-39 checksum / EIP-55"],
    [
      "Encoding",
      "Represent the same information",
      "Words, hexadecimal, mixed case",
    ],
  ]
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join(
      "",
    )}</tbody></table></div><p class="closing-prose">Each stage solves a different problem. A hash cannot replace the key pair needed to verify signatures. A checksum cannot provide secrecy or authentication. A derivation function cannot manufacture fresh entropy. The pipeline combines complementary tools instead of asking one primitive to do every job.</p><div class="timeline">${[
    ["1977", "RSA", "Public-key system"],
    ["2001", "SHA-2", "SHA-512 family"],
    ["2012", "BIP-32", "HD key tree"],
    ["2013", "BIP-39", "Mnemonic & seed"],
    ["2014", "BIP-44", "Path conventions"],
    ["2015", "SHA-3", "NIST standard"],
    ["2016", "EIP-55", "Address checksum"],
  ]
    .map(([y, h, p]) => `<div><span>${y}</span><h4>${h}</h4><p>${p}</p></div>`)
    .join(
      "",
    )}</div><p class="small muted">Approximate introduction / standardization dates from the assignment. SHA-3 standardized the Keccak-based family; Ethereum retains the earlier Keccak-256 convention.</p>${note("What can these experiments establish?", "They describe diffusion, bit balance and frequency patterns in a specified dataset. Security additionally requires sound standards, unpredictable secret generation, safe implementations, and resistance to known attacks. A histogram cannot certify any of those on its own.")}<a href="#references" class="text-link">Read the sources and verification method →</a></section></main>`;
}
function pipeline() {
  const d = deriveDemo(state.index, state.passphrase);
  const cards = [
    [
      "00",
      "Public entropy",
      "BIP-39 · 128 input bits",
      "SECRET IN A REAL WALLET",
      "0x00000000000000000000000000000000",
      "Fixed zero entropy creates a public reference example. Real generation requires an unpredictable CSPRNG.",
    ],
    [
      "01",
      "Recovery phrase",
      "BIP-39 · words + checksum",
      "SECRET IN A REAL WALLET",
      d.mnemonic,
      "The checksum protects transcription, not confidentiality. The optional public passphrase here is " +
        (state.passphrase || "the empty string") +
        ".",
    ],
    [
      "02",
      "Seed",
      "PBKDF2-HMAC-SHA512 · 64 bytes",
      "SECRET IN A REAL WALLET",
      d.seed,
      "2,048 iterations; salt = “mnemonic” + passphrase; NFKD text normalization. Same inputs always produce the same seed.",
    ],
    [
      "03",
      "Derived private key",
      "BIP-32 / BIP-44 · 32 bytes",
      "SECRET IN A REAL WALLET",
      d.privateKey,
      "Path: " +
        d.path +
        ". The address index chooses a different child of the same deterministic tree.",
    ],
    [
      "04",
      "Uncompressed public key",
      "secp256k1 · Q = kG",
      "PUBLIC",
      d.publicKey,
      "65 bytes = 0x04 prefix + 32-byte X + 32-byte Y. The prefix is removed before hashing.",
    ],
    [
      "05",
      "Digest → 20-byte address",
      "Keccak-256 · hash 64 coordinate bytes",
      "PUBLIC",
      d.digest,
      "Keep the last 40 hex digits (20 bytes): " + d.address,
    ],
    [
      "06",
      "Checksummed address",
      "EIP-55 · same address value",
      "PUBLIC",
      d.checksum,
      "Letter case carries the checksum. The byte value is unchanged. This is not a signature.",
    ],
  ];
  $("#pipeline-values").innerHTML =
    cards
      .map(
        ([n, h, tag, role, v, p]) =>
          `<article class="pipeline-step"><span class="step-number">${n}</span><div class="pipeline-body"><div class="panel-heading"><h3>${h}</h3><span class="data-role ${role === "PUBLIC" ? "public" : ""}">${role}</span></div><span class="eyebrow">${tag}</span><code class="data-value">${esc(v)}</code><p>${esc(p)}</p></div></article>`,
      )
      .join("") +
    `<details><summary>Inspect the HD tree and chain codes</summary><p>Master private key (public test example):</p><code class="data-value">${d.masterPrivate}</code><p>Every extended node contains a key and a 32-byte chain code. The following compressed public keys belong to the derivation tree; address hashing above uses the uncompressed final key.</p><div class="table-scroll"><table><thead><tr><th>Path</th><th>Chain code</th><th>Compressed public key</th></tr></thead><tbody>${d.branches.map((b) => `<tr><td class="mono">${b.path}</td><td class="mono wrap">${b.chainCode}</td><td class="mono wrap">${b.publicKey}</td></tr>`).join("")}</tbody></table></div></details>`;
  $("#checksum-input").value = d.checksum;
  validateChecksum();
}
function hashStats() {
  const e = (state.experiment ??= hashExperiment(state.n, state.run));
  const bins = Array(17).fill(0);
  e.distances.forEach((v) => bins[Math.min(16, Math.floor(v / 16))]++);
  $("#hash-statistics").innerHTML =
    `<p class="dataset-caption">Protocol v1 · batch ${e.run} · n = ${e.n} message pairs · 32 input bytes · exactly 1 flipped input bit per pair · 256 output bits per digest.</p><div class="metric-grid"><div><span>MEAN HAMMING DISTANCE</span><b>${num(e.avg, 2)}<small>/ 256</small></b><small>ideal-model expectation: 128</small></div><div><span>SAMPLE STANDARD DEVIATION</span><b>${num(e.sd, 2)}</b><small>ideal-model reference: 8 bits</small></div><div><span>ORIGINAL OUTPUT ONE-BITS</span><b>${num((e.ones / (256 * e.n)) * 100, 2)}<small>%</small></b><small>${e.ones} / ${256 * e.n} output bits</small></div><div><span>DESCRIPTIVE STANDARD ERROR</span><b>${num(e.se, 3)}</b><small>s / √n · model-based benchmark</small></div></div><div class="panel"><h3>Distribution of changed output bits</h3>${bars(bins, { labels: Array.from({ length: 17 }, (_, i) => (i === 16 ? "256" : `${16 * i}–${16 * i + 15}`)), title: "Hamming distance histogram in 16-bit bins" })}<p class="interpretation">Observed range ${Math.min(...e.distances)}–${Math.max(...e.distances)} bits. The ideal model expects a distribution around 128, not exactly 128 in every trial. This experiment describes diffusion on these test inputs; it cannot prove cryptographic strength.</p></div><div class="two-col"><article class="panel"><h3>Hex digits · full 32-byte digests</h3>${bars(e.hexCounts, { labels: [..."0123456789abcdef"], expected: (64 * e.n) / 16, title: "Hex frequencies of original full digests" })}<p class="small">${64 * e.n} digits = 64 × ${e.n}. Uniform-digit expectation: ${4 * e.n} occurrences per digit.</p><p class="interpretation">The bars describe observed frequencies. Small deviations occur even under a uniform model; closeness alone is not evidence of unpredictability.</p></article><article class="panel"><h3>Hex digits · last 20 bytes</h3>${bars(e.addressCounts, { labels: [..."0123456789abcdef"], expected: (40 * e.n) / 16, color: "orange", title: "Hex frequencies of truncated digest tails" })}<p class="small">${40 * e.n} digits = 40 × ${e.n}. Uniform-digit expectation: ${2.5 * e.n} occurrences per digit.</p><p class="interpretation">Truncation changes 256 bits to 160 bits. This is an address-shaped hash-tail experiment, not a sample of wallet-derived addresses. A shorter representation has a smaller output space.</p></article></div><details><summary>Inspect per-position bit balance and the first 12 trials</summary><p>One-bit counts at each of the 256 output positions, MSB first (denominator ${e.n} each):</p><div class="bit-heatmap">${e.bitCounts.map((v, i) => `<span style="--balance:${v / e.n}" title="Position ${i}: ${v}/${e.n} one-bits">${v}</span>`).join("")}</div><div class="table-scroll"><table><thead><tr><th>Trial j</th><th>Flipped input bit</th><th>Changed output bits</th></tr></thead><tbody>${e.rows
      .slice(0, 12)
      .map(
        (r) =>
          `<tr><td>${r.i}</td><td>${r.bit}</td><td>${r.distance} / 256</td></tr>`,
      )
      .join(
        "",
      )}</tbody></table></div><p>Export CSV for all input bytes, paired digests and distances.</p></details>`;
}
function validateChecksum() {
  const d = checkChecksum($("#checksum-input").value.trim());
  $("#checksum-result").innerHTML =
    `<p class="validation ${d.valid ? "valid" : "invalid"}">${d.valid ? "✓" : "!"} ${esc(d.message)}</p>${d.expected ? `<p class="small">Computed encoding for these 20 bytes:<br><code class="wrap">${d.expected}</code></p>` : ""}`;
}
function compare() {
  const h = compareHashes($("#hash-message").value);
  $("#hash-comparison").innerHTML = [
    ["Keccak-256 · Ethereum", h.keccak],
    ["SHA3-256 · FIPS 202", h.sha3],
    ["SHA-512 · SHA-2", h.sha512],
  ]
    .map(
      ([name, value]) =>
        `<div class="hash-output"><span>${name}</span><code>${value}</code></div>`,
    )
    .join("");
}
function bindHW2() {
  pipeline();
  hashStats();
  compare();
  $("#address-index").onchange = (e) => {
    state.index = Number(e.target.value);
    pipeline();
  };
  $("#passphrase").onchange = (e) => {
    state.passphrase = e.target.value;
    pipeline();
  };
  $("#pipeline-export").onclick = () => {
    const d = deriveDemo(state.index, state.passphrase);
    download("public-wallet-walkthrough.csv", [
      ["field", "public_test_value"],
      ...Object.entries(d)
        .filter(([k, v]) => typeof v === "string")
        .map(([k, v]) => [k, v]),
    ]);
  };
  $("#sample-size").onchange = (e) => {
    state.n = Number(e.target.value);
    state.experiment = hashExperiment(state.n, state.run);
    hashStats();
  };
  $("#run-hashes").onclick = () => {
    state.run++;
    state.experiment = hashExperiment(state.n, state.run);
    hashStats();
  };
  $("#hash-csv").onclick = () => {
    const e = state.experiment;
    download("keccak-experiment.csv", [
      [
        "protocol",
        "batch",
        "trial",
        "flipped_bit",
        "input32",
        "changed32",
        "original_digest",
        "changed_digest",
        "hamming",
      ],
      ...e.rows.map((r) => [
        "v1",
        e.run,
        r.i,
        r.bit,
        r.input,
        r.changed,
        r.original,
        r.flipped,
        r.distance,
      ]),
    ]);
  };
  $("#hash-message").oninput = compare;
  $("#checksum-input").oninput = validateChecksum;
  $("#checksum-reset").onclick = () => {
    $("#checksum-input").value = deriveDemo(
      state.index,
      state.passphrase,
    ).checksum;
    validateChecksum();
  };
  $("#checksum-case").onclick = () => {
    const v = $("#checksum-input").value;
    const i = [...v].findIndex((c, j) => j > 1 && /[a-f]/i.test(c));
    if (i !== -1) {
      $("#checksum-input").value =
        v.slice(0, i) +
        (v[i] === v[i].toUpperCase()
          ? v[i].toLowerCase()
          : v[i].toUpperCase()) +
        v.slice(i + 1);
    }
    validateChecksum();
  };
  $("#checksum-digit").onclick = () => {
    const v = $("#checksum-input").value;
    if (v.length >= 3)
      $("#checksum-input").value =
        v.slice(0, 2) + (v[2] === "0" ? "1" : "0") + v.slice(3);
    validateChecksum();
  };
}
const sources = [
  [
    "BIP-39",
    "Mnemonic encoding, entropy, seed derivation and vectors",
    "https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki",
  ],
  [
    "BIP-32",
    "Extended keys, child derivation and test vector 1",
    "https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki",
  ],
  [
    "BIP-44",
    "Purpose / coin type / account / change / index",
    "https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki",
  ],
  [
    "SLIP-44",
    "Registered coin type 60: Ethereum",
    "https://github.com/satoshilabs/slips/blob/master/slip-0044.md",
  ],
  [
    "Ethereum accounts",
    "Private keys, public keys and address derivation",
    "https://ethereum.org/en/developers/docs/accounts/",
  ],
  [
    "EIP-55",
    "Checksum algorithm and published address vectors",
    "https://eips.ethereum.org/EIPS/eip-55",
  ],
  [
    "Keccak specifications",
    "Permutation, sponge construction and parameters",
    "https://keccak.team/keccak_specs_summary.html",
  ],
  [
    "NIST FIPS 202",
    "Standardized SHA-3 functions",
    "https://csrc.nist.gov/pubs/fips/202/final",
  ],
  ["SEC 2", "secp256k1 domain parameters", "https://www.secg.org/sec2-v2.pdf"],
  [
    "BIP-39 reference vectors",
    "TREZOR mnemonic/seed vectors",
    "https://github.com/trezor/python-mnemonic/blob/master/vectors.json",
  ],
  [
    "ethers documentation",
    "HD wallets, mnemonic, signing keys and utilities",
    "https://docs.ethers.org/v6/",
  ],
  [
    "noble-hashes",
    "SHA3-256 implementation and test suite",
    "https://github.com/paulmillr/noble-hashes",
  ],
];
function references() {
  return `<main id="main">${chapterIntro("01 + 02", "Evidence behind<br><em>the experiments.</em>", "Original explanations and application code, grounded in primary specifications. Computed results are separated from ideal-model expectations.", "SOURCES & METHODOLOGY")}<section class="content-section">${sectionHead("THE METHOD", "Observe. Reproduce. Interpret.")}<div class="two-col prose"><article><h3>What is measured?</h3><p>Homework 01 enumerates a small finite group. Census mode covers the nonidentity subgroup exactly; sequence mode counts every visit and reports excluded identities. Coordinates use 5 bits each. One-bit comparisons enumerate unique valid key pairs within the subgroup.</p><p>Homework 02 uses deterministic byte messages, a documented bit-flip schedule, Keccak-256 digests and explicit denominators. Dataset exports include inputs, outputs and protocol parameters. Model references are teaching benchmarks, not certificates of randomness.</p></article><article><h3>What is verified?</h3><p>Automated tests check all toy-curve points, inverse and identity cases, associativity, periodicity, and agreement of both multiplication algorithms. Reference tests cover BIP-39, BIP-32, published EIP-55 addresses, Keccak-256 and SHA3-256 known outputs, and the public-key serialization used for Ethereum addresses.</p><p>The cryptographic pipeline uses ethers 6.17.0, and SHA3-256 uses noble-hashes 1.8.0. Dependencies are bundled at build time. Experiment inputs stay in the browser; no wallet connection or analytics is used.</p></article></div></section><section class="content-section">${sectionHead("PRIMARY REFERENCES", "Read the specifications.")}<div class="source-list">${sources.map(([name, desc, url], i) => `<a href="${url}" target="_blank" rel="noopener noreferrer"><span>${String(i + 1).padStart(2, "0")}</span><div><h3>${name}</h3><p>${desc}</p></div><b>↗</b></a>`).join("")}</div></section><section class="content-section">${note("Scope of the submission", "The required core is the toy-curve application, statistical exploration, and explanation of the wallet standards. Slow animation, two multiplication methods, computed wallet walkthroughs and CSV exports are supporting additions. This notebook does not claim cryptographic security from statistical appearance.")}<p class="small muted">Historical dates are approximate introduction/standardization dates, as in the assignment. Other students’ work is not imported; primary standards inform the mathematics and reference vectors.</p></section></main>`;
}
function render() {
  stop();
  const route = location.hash.slice(1);
  if (!["home", "hw1", "hw2", "references"].includes(route)) {
    if (route && document.getElementById(route)) return;
  }
  const sectionPage = {
    idea1: "hw1",
    lab1: "hw1",
    stats1: "hw1",
    conclusion1: "hw1",
    pipeline: "hw2",
    standards: "hw2",
    "hash-lab": "hw2",
    checksum: "hw2",
    history: "hw2",
  };
  state.page = ["hw1", "hw2", "references"].includes(route)
    ? route
    : (sectionPage[route] ?? "home");
  $("#app").innerHTML =
    header() + { home, hw1, hw2, references }[state.page]() + footer();
  document.title =
    {
      home: "Cryptography, observed",
      hw1: "Homework 01 · Toy ECC lab",
      hw2: "Homework 02 · Ethereum pipeline",
      references: "Sources & methodology",
    }[state.page] + " · Fieldnotes";
  if (state.page === "hw1") bindHW1();
  if (state.page === "hw2") bindHW2();
  if (sectionPage[route]) document.getElementById(route)?.scrollIntoView();
  else window.scrollTo(0, 0);
}
window.addEventListener("hashchange", render);
render();
