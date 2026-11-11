import { renderHomework6, bindHomework6, disposeHomework6 } from "./homework6.js";
import { renderHomework5, bindHomework5, disposeHomework5 } from "./homework5.js";
import { renderHomework4, bindHomework4, disposeHomework4 } from "./homework4.js";
import {
  renderHomework3,
  bindHomework3,
  disposeHomework3,
} from "./homework3.js";
import "./style.css";
import { bindAppearance, themeControl, reducedMotion } from "./appearance.js";
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

/*
 * CENTRAL HOMEWORK REGISTRY
 * To add a homework, append one entry to HOMEWORKS below with:
 *   id, number, navTitle, subject, pageTitle, title, desc, formula, detail, topics, date, sections, render, bind, dispose
 * Topbar tabs, home folder library, chapter counts, left/right notebook pagination, and routing update automatically.
 */
const HOMEWORKS = [
  {
    id: "hw1",
    number: "01",
    navTitle: "Homework 1",
    subject: "Elliptic curves",
    pageTitle: "Homework 1 · Finite-field ECC lab",
    title: "Scalar multiplication on a finite-field curve",
    desc: "Implement the group law on y² ≡ x³ + 7 (mod 17), trace point additions step by step, and analyze coordinate frequencies and bit-level correlations.",
    formula: "y² ≡ x³ + 7 (mod 17)",
    detail: "Q = kG",
    topics: "Finite fields · scalar multiplication",
    date: "October 15, 2026",
    sections: ["idea1", "lab1", "stats1", "conclusion1"],
    render: () => hw1(),
    bind: () => bindHW1(),
    dispose: () => stop(),
  },
  {
    id: "hw2",
    number: "02",
    navTitle: "Homework 2",
    subject: "Ethereum wallets",
    pageTitle: "Homework 2 · Ethereum wallet pipeline",
    title: "Cryptographic pipeline of an Ethereum wallet",
    desc: "Follow deterministic key derivation from BIP-39 entropy to an EIP-55 address, and evaluate Keccak-256 diffusion under single-bit perturbations.",
    formula: "Mnemonic → seed → key",
    detail: "Keccak-256 · EIP-55",
    topics: "HD derivation · hashes · checksums",
    date: "October 15, 2026",
    sections: ["pipeline", "standards", "hash-lab", "checksum", "history"],
    render: () => hw2(),
    bind: () => bindHW2(),
    dispose: null,
  },
  {
    id: "hw3",
    number: "03",
    navTitle: "Homework 3",
    subject: "Cryptanalysis",
    pageTitle: "Homework 3 · Encryption & cryptanalysis",
    title: "EC-ElGamal encryption and Caesar cryptanalysis",
    desc: "Compare byte-wise EC-ElGamal on secp256k1 with the Caesar cipher, rank shifts via corpus letter statistics, and recover restricted private scalars.",
    formula: "R = rG · C = M + rQ",
    detail: "26 Caesar shifts",
    topics: "Encryption · language statistics",
    date: "",
    sections: ["hw3-idea", "hw3-ciphers", "hw3-statistics", "hw3-key-search", "hw3-discussion"],
    render: () => hw3(),
    bind: () => bindHomework3(),
    dispose: () => disposeHomework3(),
  },
  {
    id: "hw4",
    number: "04",
    navTitle: "Homework 4",
    subject: "Stochastic processes",
    pageTitle: "Homework 4 · Stochastic processes, LLN & CLT",
    title: "Random walks, the Law of Large Numbers, and the CLT",
    desc: "Simulate Bernoulli and Rademacher penetration trajectories across n systems and m attackers under unscaled, averaged, and square-root normalizations.",
    formula: "Sₙ = X₁ + … + Xₙ",
    detail: "Sₙ/n · Sₙ/√n",
    topics: "Sample paths · LLN · CLT",
    date: "",
    sections: ["hw4-model", "hw4-lab", "hw4-limits", "hw4-clt", "hw4-interpret"],
    render: () => hw4(),
    bind: () => bindHomework4(),
    dispose: () => disposeHomework4(),
  },
  {
    id: "hw5",
    number: "05",
    navTitle: "Homework 5",
    subject: "Welford & sampling",
    pageTitle: "Homework 5 · Welford & sampling statistics",
    title: "Welford’s online recurrence and sampling distributions",
    desc: "Derive the one-pass updates for the mean and corrected sum of squares, then examine the empirical distributions of the sample mean and variance as n grows.",
    formula: "μ = 5 · σ² = 8.6",
    detail: "Mean · SS · variance",
    topics: "Online statistics · inference",
    date: "",
    sections: ["hw5-derive", "hw5-code", "hw5-model", "hw5-lab", "hw5-inference"],
    render: () => hw5(),
    bind: () => bindHomework5(),
    dispose: () => disposeHomework5(),
  },
  {
    id: "hw6",
    number: "06",
    navTitle: "Homework 6",
    subject: "Integration & normal CDF",
    pageTitle: "Homework 6 · Integration & normal CDF",
    title: "Riemann–Lebesgue integration and the normal CDF",
    desc: "Compare domain partitions against level-set preimage measures across regular and pathological functions, and compute Φ(z) via adaptive quadrature.",
    formula: "Φ(z) = ½[1 + erf(z/√2)]",
    detail: "Riemann · Lebesgue",
    topics: "Numerical integration · normal CDF",
    date: "",
    sections: ["hw6-integration", "hw6-pathologies", "hw6-normal", "hw6-liouville", "hw6-methods"],
    render: () => renderHomework6({ chapterIntro, sectionHead, note, download, esc }),
    bind: () => bindHomework6(),
    dispose: () => disposeHomework6(),
  },
];

function getNavItems() {
  return [
    ["home", "00", "Overview", "Notebook index"],
    ...HOMEWORKS.map((h) => [h.id, h.number, h.navTitle, h.subject]),
    ["references", "REF", "Sources", "Methodology & references"],
  ];
}
function header() {
  return `<header class="topbar"><a class="brand" href="#home">${icon}<span>Statistics Homeworks<span class="brand-sub">SAPIENZA · CYBERSECURITY</span></span></a><nav aria-label="Main navigation">${getNavItems()
    .map(
      ([id, code, label, sub]) =>
        `<a class="nav-folder" href="#${id}" title="${esc(label + " · " + sub)}" ${state.page === id ? 'aria-current="page"' : ""}><span class="nav-folder-back" aria-hidden="true"></span><span class="nav-folder-sheets" aria-hidden="true"><i class="nav-sheet nav-sheet-back"></i><i class="nav-sheet nav-sheet-front"></i></span><span class="nav-folder-pocket"><span class="nav-folder-ear" aria-hidden="true"><b>${code}</b></span><span class="nav-folder-title">${label}</span></span></a>`,
    )
    .join(
      "",
    )}</nav>${themeControl()}</header>`;
}
function footer() {
  return `<footer><a href="#home">Statistics Homeworks <span> / Luca Gugliotta · 2149056</span></a><p>Sapienza · Cybersecurity · Statistics · Prof. Tommaso Gastaldi</p><a href="#references">Sources & methodology ↗</a></footer>`;
}
function sectionHead(n, title, desc) {
  return `<div class="section-heading"><div><h2>${title}</h2><span class="section-index">${n}</span></div>${desc ? `<p>${desc}</p>` : ""}</div>`;
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
function homeworkFolders() {
  return `<div class="homework-library">${HOMEWORKS.map((h) => `<a class="homework-folder" href="#${h.id}" aria-label="Open ${h.navTitle}: ${h.subject}">
    <div class="folder-visual" aria-hidden="true">
      <div class="folder-back"></div>
      <div class="folder-sheet sheet-back"><div class="sheet-head"><span>STATISTICS / ${h.number}</span></div><b>${h.detail}</b></div>
      <div class="folder-sheet sheet-middle"><div class="sheet-head"><span>LUCA GUGLIOTTA</span></div><b>${h.subject}</b></div>
      <div class="folder-sheet sheet-front"><div class="sheet-head"><span>HOMEWORK ${h.number}</span></div><b class="sheet-formula">${h.formula}</b><small>${h.detail}</small></div>
      <div class="folder-pocket">
        <span class="folder-label">Homework ${h.number}</span>
        <strong>${h.subject}</strong>
        <div class="folder-open">
          <span class="folder-open-cta"><i class="folder-open-ring"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 6 6 6-6 6"/></svg></i><span>Open chapter</span></span>
        </div>
      </div>
    </div>
    <h3>${h.title}</h3><p>${h.desc}</p><div class="folder-meta"><span>${h.topics}</span>${h.date ? `<time datetime="2026-10-15">${h.date}</time>` : ""}</div>
  </a>`).join("")}</div>`;
}
function heroOverview() {
  return `<div class="hero-overview-grid">${HOMEWORKS.map(
    (h) =>
      `<a class="hero-overview-item" href="#${h.id}"><div class="hero-overview-top"><span>HW ${h.number}</span><small>${esc(h.subject)}</small></div><strong>${esc(h.formula)}</strong><span>${esc(h.detail)}</span></a>`,
  ).join("")}</div>`;
}
function home() {
  const count = HOMEWORKS.length;
  return `<main id="main"><section class="hero"><div class="hero-copy"><h1>Statistics<br><em>Homeworks</em></h1><p class="author-byline">Luca Gugliotta <span>Student ID 2149056</span></p><p class="hero-lead">Coursework notebook for the MSc in Cybersecurity at Sapienza University of Rome. Each chapter pairs theoretical derivations with interactive browser-based simulations, examining how algebraic structures, cryptographic primitives, stochastic processes, and numerical estimators behave in finite experiments.</p><div class="hero-actions"><a class="button" href="#homework-folders">Browse the ${count} homeworks <span>↓</span></a><a class="text-link" href="#hw6">Latest: Homework 6 (Integration &amp; Normal CDF) →</a></div><div class="hero-meta"><span>${count} coursework chapters</span><span>Client-side execution</span><span>Reproducible CSV exports</span></div></div><div class="hero-figure"><div class="figure-top"><span>COURSEWORK SYNOPSIS · HOMEWORKS 01–0${count}</span><span>STAT-01/A</span></div>${heroOverview()}<div class="figure-bottom"><span>From finite-field algebra to measure theory</span><span><i class="dot orange"></i>59 verification tests</span></div></div></section><section class="academic-context" aria-label="Academic information"><div><span class="eyebrow">UNIVERSITY &amp; PROGRAMME</span><strong>Sapienza University</strong><p>MSc in Cybersecurity</p></div><div><span class="eyebrow">COURSE</span><strong>Statistics</strong><p>10628637 · STAT-01/A · ENG</p></div><div><span class="eyebrow">INSTRUCTOR</span><strong>Prof. Tommaso Gastaldi</strong><p>Department of Statistical Sciences</p></div><div><span class="eyebrow">SCOPE &amp; FORMAT</span><strong>6 Interactive Labs</strong><p>Browser simulations &amp; data exports</p></div></section><section id="homework-folders" class="chapter-section">${sectionHead("COURSEWORK INDEX", "Homework laboratories and mathematical topics", "The six assignments progress from discrete group operations and wallet key derivation to statistical cryptanalysis, random walks, online variance recurrences, and numerical integration.")}${homeworkFolders()}</section><section class="method-strip"><span class="eyebrow">STRUCTURE OF EACH REPORT</span><div>${[
    ["01", "Mathematical formulation", "State the governing definitions, group laws, or probabilistic models before running numerical code."],
    ["02", "Interactive laboratory", "Modify parameters, sample sizes, and random seeds directly in the browser to inspect finite-sample behavior."],
    ["03", "Empirical diagnostics", "Compare observed histograms, sample moments, and error bounds against exact analytical references."],
    ["04", "Critical interpretation", "Distinguish between descriptive properties of a finite sample and formal mathematical or security guarantees."],
  ]
    .map(
      ([n, h, p]) =>
        `<article><span>${n}</span><h3>${h}</h3><p>${p}</p></article>`,
    )
    .join(
      "",
    )}</div></section>${note("Execution environment and reproducibility", "All simulations, cryptographic primitives, and numerical quadratures execute locally in the browser with no external network requests. Stochastic experiments use explicitly seeded generators so trajectories and summary tables can be reproduced and exported as CSV. The cryptographic examples in Homeworks 1–3 rely exclusively on public test vectors and deliberately restricted parameters.")}</main>`;
}
function chapterIntro(n, title, desc, tags) {
  const label = String(n).includes("–") || String(n).includes("+") ? `HOMEWORKS ${n}` : `HOMEWORK ${n}`;
  return `<div class="chapter-back-row"><a href="#home" class="back">← OVERVIEW · NOTEBOOK INDEX</a></div><div class="notebook-meta-strip"><span>SAPIENZA UNIVERSITY · CYBERSECURITY</span><span>STATISTICS · PROF. TOMMASO GASTALDI</span></div><div class="chapter-intro"><span class="eyebrow">${label} <span class="separator">/</span> ${tags}</span><h1>${title}</h1><p>${desc}</p><div class="chapter-author"><span>Luca Gugliotta · Student ID 2149056</span>${n === "1" || n === "2" ? '<span>Homework date: <time datetime="2026-10-15">October 15, 2026</time></span>' : "<span>Academic coursework notebook</span>"}</div></div>`;
}
function hw1() {
  return `<main id="main">${chapterIntro("1", "Scalar Multiplication<br><em>on a Finite-Field Curve</em>", "Elliptic-curve public keys are generated by repeated group addition Q = kG. Working over the prime field F₁₇ makes every point operation explicit and allows an exact census of the resulting coordinate and bit distributions.", "FINITE-FIELD ECC LAB")}<nav class="section-nav" aria-label="Chapter sections"><a href="#idea1">Group law</a><a href="#lab1">Curve laboratory</a><a href="#stats1">Statistical exploration</a><a href="#conclusion1">Interpretation</a></nav><section id="idea1" class="content-section">${sectionHead("01 / FORMULATION", "Discrete points over a prime field", "Reducing the Weierstrass equation modulo 17 replaces a continuous curve with a finite abelian group.")}<div class="two-col prose"><div><p>In elliptic-curve cryptography, a <strong>private key</strong> is an integer scalar k, and the corresponding <strong>public key</strong> is the curve point Q = kG obtained by adding a generator point G to itself k times. In full-scale protocols such as ECDSA, the private scalar authorizes signatures while the public point allows anyone to verify them.</p><p>To inspect the algebra directly, this laboratory restricts the curve to the prime field F₁₇, where all arithmetic is reduced modulo 17 into the set {0, 1, …, 16}. Instead of a smooth geometric curve over the real numbers, the equation defines a finite collection of 17 affine points together with the point at infinity O, which acts as the group identity.</p></div><div class="formula-box"><span class="eyebrow">CURVE PARAMETERS OVER F₁₇</span><p class="formula">y² ≡ x³ + 7 <small>(mod 17)</small></p><p>p = 17 &nbsp; · &nbsp; a = 0 &nbsp; · &nbsp; b = 7</p><p>Verifying that G = (1, 5) belongs to the curve:<br>5² mod 17 = 25 mod 17 = 8, and (1³ + 7) mod 17 = 8.</p></div></div></section><section id="lab1" class="content-section">${sectionHead("02 / LABORATORY", "Scalar multiplication and subgroup cycles", "Select a base point G and a private scalar k to compare repeated addition with the binary double-and-add algorithm.")}<div class="lab-layout"><div class="panel controls"><h3>Parameters</h3><label for="base">Base point G</label><select id="base">${points.map((q) => `<option value="${q}" ${String(q) === String(state.g) ? "selected" : ""}>${formatPoint(q)} · order ${pointOrder(q)}</option>`).join("")}</select><label for="scalar">Private scalar k <span id="scalar-label">${state.k}</span></label><input id="scalar" type="range" min="1" max="36" value="${state.k}"><div class="inline-input"><input aria-label="Private scalar as integer" id="scalar-number" type="number" min="1" max="36" value="${state.k}"><span>integer · 1 to 36</span></div><label for="algorithm">Multiplication method</label><select id="algorithm"><option value="repeated" ${state.algorithm === "repeated" ? "selected" : ""}>Repeated addition</option><option value="binary" ${state.algorithm === "binary" ? "selected" : ""}>Double-and-add</option></select><label for="speed">Animation speed</label><select id="speed"><option value="1500">Slow · 1.5 s</option><option value="900" selected>Normal · 0.9 s</option><option value="350">Fast · 0.35 s</option></select><div class="playback"><button id="play" class="button">▶ Play</button><button id="step" class="secondary">Step →</button><button id="reset" class="icon-button" aria-label="Reset animation">↺</button></div><p class="muted small">Step through the sequence manually or play the animation to follow each modular slope calculation.</p><p id="input-error" role="alert"></p></div><div class="panel plot-panel"><div class="panel-heading"><h3>Affine points in F₁₇ × F₁₇</h3><span class="pill">17 AFFINE POINTS + O</span></div><div id="curve-plot"></div><div class="legend"><span><i class="dot"></i>Curve point</span><span><i class="dot green"></i>Base G</span><span><i class="dot orange"></i>Current result</span></div></div><div class="panel result-panel"><span class="eyebrow">COMPUTED PUBLIC POINT</span><div id="toy-result" class="big-result" aria-live="polite"></div><div id="cycle-summary"></div><hr><h3>Current group operation</h3><div id="operation"></div></div></div><div class="panel log-panel"><div class="panel-heading"><h3>Operation trace</h3><span id="operation-count" class="muted"></span></div><div class="table-scroll"><table><thead><tr><th>Step</th><th>Operation</th><th>Left point</th><th>Right point</th><th>Result</th></tr></thead><tbody id="step-table"></tbody></table></div></div><details><summary>Algebraic formulas for point addition and point doubling</summary><div class="two-col prose"><div><p>For two distinct affine points P = (x₁, y₁) and R = (x₂, y₂) with x₁ ≠ x₂, the chord slope is computed in F₁₇ as:</p><code>λ = (y₂ − y₁) · (x₂ − x₁)⁻¹ mod 17</code><p>When doubling a point P = R with y₁ ≠ 0, the tangent slope is:</p><code>λ = (3x₁² + a) · (2y₁)⁻¹ mod 17</code><p>Division is replaced by multiplication by the modular inverse in F₁₇ (for instance, 10⁻¹ ≡ 12 mod 17 because 10 × 12 = 120 ≡ 1 mod 17).</p></div><div><code>x₃ = λ² − x₁ − x₂ mod 17<br>y₃ = λ(x₁ − x₃) − y₁ mod 17</code><p>The point at infinity O serves as the neutral element: P + O = O + P = P. Every affine point P = (x, y) has an additive inverse −P = (x, −y mod 17) such that P + (−P) = O; in particular, doubling a point with y = 0 yields O.</p><p>Because all coordinates wrap modulo 17, the group law is purely algebraic and we avoid drawing continuous secant or tangent lines across the discrete grid.</p></div></div></details></section><section id="stats1" class="content-section">${sectionHead("03 / STATISTICAL EXPLORATION", "Coordinate frequencies, bit balance, and input flips", "Examine the empirical properties of the generated points across either a single subgroup cycle or a prefix sequence.")}<div class="experiment-toolbar"><div><label for="scope">Dataset scope</label><select id="scope"><option value="census" ${state.mode === "census" ? "selected" : ""}>Full nonzero subgroup census (k = 1…ord(G)−1)</option><option value="sequence" ${state.mode === "sequence" ? "selected" : ""}>Prefix sequence (k = 1…selected scalar)</option></select></div><button id="toy-csv" class="secondary">Export data ↓ CSV</button></div><div id="toy-statistics"></div></section><section id="conclusion1" class="content-section">${sectionHead("04 / INTERPRETATION", "Algebraic structure versus cryptographic hash properties")}<div class="two-col prose"><article><h3>One-wayness and the Discrete Logarithm Problem</h3><p>Computing Q = kG requires only O(log k) group operations via double-and-add, whereas recovering k from Q and G is the Elliptic Curve Discrete Logarithm Problem (ECDLP). Over a 256-bit prime field such as secp256k1, the best known classical attacks require O(√n) ≈ 2¹²⁸ operations. Over F₁₇, the entire group contains only 18 elements, so exhaustive search is trivial and the toy curve provides no security.</p><p>Unlike a hash function, scalar multiplication preserves linear group structure: <strong>(a + b)G = aG + bG</strong>. Digital signature schemes and Diffie–Hellman key exchange rely directly on this homomorphism.</p></article><article><h3>Why scalar multiplication is not a hash function</h3><p>Cryptographic hash functions map arbitrary-length inputs to fixed-size digests and are designed to satisfy preimage resistance, second-preimage resistance, and collision resistance, exhibiting a strict avalanche effect when a single input bit changes.</p><p>On our finite-field curve, the output is a structured group element rather than an unstructured bit string. Because P and −P share the same x-coordinate, at most half of the non-identity subgroup points can have distinct x-values, and the sequence kG repeats with period ord(G). Apparent scatter or low linear correlation r(k, x) is simply a reflection of modular arithmetic, not a statistical proof of cryptographic security.</p></article></div><div class="chapter-footer-actions"><a class="button next-chapter" href="#hw2">Continue to Homework 2: Ethereum wallet pipeline →</a><a class="text-link" href="#references">Sources &amp; methodology →</a></div></section></main>`;
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
    `<p class="dataset-caption">${state.mode === "census" ? `Subgroup census: k = 1…${d.order - 1}, visiting each non-identity point once (${d.order}G = O is tracked separately).` : `Prefix sequence: k = 1…${state.k}, where periodic wrap-around counts repeated points multiple times.`} Total scalars: ${d.rows.length}; affine points: ${n}; identity occurrences excluded from coordinate statistics: ${d.rows.length - n}. Base point G = ${formatPoint(state.g)}.</p><div class="metric-grid"><div><span>AFFINE OBSERVATIONS</span><b>${n}</b><small>denominator for coordinate &amp; bit stats</small></div><div><span>SUBGROUP ORDER</span><b>${d.order}</b><small>smallest positive m with mG = O</small></div><div><span>PEARSON r(k, x)</span><b>${num(d.rx)}</b><small>linear correlation on affine rows</small></div><div><span>PEARSON r(k, y)</span><b>${num(d.ry)}</b><small>linear correlation on affine rows</small></div></div><div class="two-col"><article class="panel"><h3>Distribution of x-coordinates</h3>${bars(d.fx, { expected: n / 17, title: "x frequency across all field values 0 to 16" })}<p class="small">Frequencies across all 17 elements of F₁₇. The dashed line indicates the uniform reference level ${num(n / 17, 2)} = n / 17.</p><p class="interpretation">Only ${d.fx.filter(Boolean).length} out of 17 field elements appear as x-coordinates. Because every affine point P = (x, y) and its inverse −P = (x, −y mod 17) share the same x-value, even a full subgroup census pairs up x-coordinates and cannot be uniform over F₁₇.</p></article><article class="panel"><h3>Distribution of y-coordinates</h3>${bars(d.fy, { expected: n / 17, color: "orange", title: "y frequency across all field values 0 to 16" })}<p class="small">Frequencies across 0–16 for the same ${n} affine points, compared against the uniform reference ${num(n / 17, 2)}.</p><p class="interpretation">Descriptive Shannon entropy: H(x) = ${num(entropy(d.fx))} bits and H(y) = ${num(entropy(d.fy))} bits, compared to log₂(17) ≈ 4.087 bits for a uniform draw over F₁₇. Here H(x) is strictly smaller than H(y) because of the two-to-one symmetry in x.</p></article></div><div class="two-col"><article class="panel"><h3>Bit frequencies by position (5-bit encoding)</h3>${bars(d.bitCounts, { labels: ["x₄", "x₃", "x₂", "x₁", "x₀", "y₄", "y₃", "y₂", "y₁", "y₀"], expected: n / 2, title: "One bit counts in 5 bit x and 5 bit y encoding" })}<p class="small">Each coordinate in 0–16 is represented as a 5-bit unsigned binary integer (MSB first), with reference line n / 2 = ${num(n / 2, 1)}.</p><p class="interpretation">Because field elements never exceed 16, any 5-bit pattern between 17 and 31 is structurally impossible. The most significant bits x₄ and y₄ can only be 1 when the coordinate equals 16, skewing bit balance independently of the scalar k.</p></article><article class="panel"><h3>Single-bit flips in the private scalar k</h3><p class="small">All unordered pairs of valid non-zero scalars (a, b) in 1…${d.order - 1} that differ in exactly one binary bit (b = a ⊕ 2ʲ), comparing the 10-bit encodings of aG and bG.</p><div class="inline-metrics"><b>${d.flips.length}<small>valid 1-bit pairs</small></b><b>${num(mean(d.flips.map((f) => f.distance)), 2)}<small>mean Hamming distance / 10</small></b></div><div class="table-scroll compact-table"><table><thead><tr><th>Key pair</th><th>Flipped bit</th><th>Hamming / 10</th></tr></thead><tbody>${d.flips.map((f) => `<tr><td>${f.a} ↔ ${f.b}</td><td>${f.bit} (LSB = 0)</td><td>${f.distance}</td></tr>`).join("") || '<tr><td colspan="3">No valid one-bit pairs for this subgroup.</td></tr>'}</tbody></table></div><p class="interpretation">Flipping bit j of k adds or subtracts 2ʲG on the curve. While the binary encodings of the coordinates change by several bits on average, this reflects a deterministic group translation rather than a cryptographic avalanche effect.</p></article></div><details><summary>Complete tabular dataset and statistical notes</summary><p>In census mode, each non-identity element of the cyclic subgroup generated by G is listed once. In sequence mode, extending k beyond ord(G) repeats the cycle and weights the frequencies toward the prefix length. Because the population is tiny and completely deterministic, we report exact counts and descriptive moments rather than asymptotic chi-square p-values.</p><p>Similarly, the Pearson correlation coefficients r(k, x) and r(k, y) measure only linear association between the integer index k and the canonical residue in {0, …, 16}; a near-zero linear correlation does not imply statistical independence.</p><div class="table-scroll"><table><thead><tr><th>k</th><th>kG</th><th>x (5 bits)</th><th>y (5 bits)</th></tr></thead><tbody>${d.rows.map((r) => `<tr><td>${r.k}</td><td>${formatPoint(r.q)}</td><td>${r.q ? bits(r.q).slice(0, 5) : "excluded"}</td><td>${r.q ? bits(r.q).slice(5) : "excluded"}</td></tr>`).join("")}</tbody></table></div></details>`;
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
  return `<div class="chart-scroll"><svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Input scalar k versus output coordinates, larger circles show x and smaller circles show y"><title>Input-output scatter plot; affine observations only</title>${[0, 4, 8, 12, 16].map((v) => `<line x1="${l}" x2="${w - r}" y1="${y(v)}" y2="${y(v)}" class="gridline"/><text x="${l - 8}" y="${y(v) + 4}" class="axis" text-anchor="end">${v}</text>`).join("")}${rows.map((row) => `<g><circle cx="${x(row.k)}" cy="${y(row.q[0])}" r="4" fill="var(--series-main)"><title>k=${row.k}; x=${row.q[0]}</title></circle><circle cx="${x(row.k)}" cy="${y(row.q[1])}" r="3" fill="var(--series-reference)"><title>k=${row.k}; y=${row.q[1]}</title></circle></g>`).join("")}${Array.from(
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
      `<article class="panel"><h3>Input scalar k versus output coordinates (x, y)</h3>${scatter(d.affine)}<div class="legend"><span><i class="dot green"></i>x-coordinate</span><span><i class="dot orange"></i>y-coordinate</span></div><p class="interpretation">Plotting both coordinates against k highlights the algebraic symmetry of the cyclic subgroup: as k approaches ord(G), the x-coordinates form a palindrome while the y-coordinates reflect around 17 / 2 because (ord(G) − k)G = −kG.</p></article>`,
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
    "Q = kG on a real 256-bit prime field. The private scalar signs; the public point verifies ECDSA signatures. Same group-law idea as Homework 1, with secure parameters and a large prime-order group.",
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
  return `<main id="main">${chapterIntro("2", "From Mnemonic Entropy<br><em>to an Ethereum Address</em>", "An Ethereum wallet combines key derivation, elliptic-curve cryptography, sponge hashing, and mixed-case encoding. Each primitive addresses a distinct requirement in the pipeline from initial entropy to a checksummed account address.", "ETHEREUM WALLET PIPELINE")}<nav class="section-nav" aria-label="Chapter sections"><a href="#pipeline">Derivation pipeline</a><a href="#standards">Standards &amp; primitives</a><a href="#hash-lab">Keccak-256 diffusion</a><a href="#checksum">EIP-55 checksum</a><a href="#history">Historical context</a></nav><section id="pipeline" class="content-section">${sectionHead("01 / DERIVATION PIPELINE", "Step-by-step wallet walkthrough", "All intermediate values below are computed locally in the browser with ethers.js from fixed public BIP-39 test entropy.")}<div class="safety-banner"><strong>PUBLIC TEST VECTOR</strong><span>This walkthrough uses the standard all-zero entropy vector. The resulting keys and addresses are publicly known and must never be used to hold real funds.</span></div><div class="experiment-toolbar"><div><label for="address-index">BIP-44 address index i</label><select id="address-index">${Array.from({ length: 6 }, (_, i) => `<option value="${i}" ${i === state.index ? "selected" : ""}>${i} · m/44′/60′/0′/0/${i}</option>`).join("")}</select></div><div><label for="passphrase">BIP-39 passphrase</label><select id="passphrase"><option value="">Empty string (default)</option><option value="TREZOR" ${state.passphrase === "TREZOR" ? "selected" : ""}>TREZOR (BIP-39 reference vector)</option></select></div><button class="secondary" id="pipeline-export">Export walkthrough ↓ CSV</button></div><div id="pipeline-values"></div></section><section id="standards" class="content-section">${sectionHead("02 / STANDARDS & PRIMITIVES", "Specifications governing the wallet pipeline", "Modern hierarchical deterministic wallets rely on six complementary specifications, each responsible for a specific transformation.")}<div class="standard-grid">${standards.map(([name, role, text], i) => `<article><span class="eyebrow">0${i + 1} / ${role}</span><h3>${name}</h3><p>${text}</p></article>`).join("")}</div><details><summary>Domain parameters of secp256k1 and BIP-32 child key derivation</summary><p>Like the modulo-17 curve in Homework 1, secp256k1 is defined by y² = x³ + 7, but over the 256-bit prime field Fₚ with p = 2²⁵⁶ − 2³² − 977. The base point G generates a prime-order group of size n ≈ 1.158 × 10⁷⁷; coordinate arithmetic is performed modulo p, whereas private scalars are reduced modulo n.</p><p>In BIP-32, an HMAC-SHA512 digest is split into two 32-byte halves I_L and I_R. The left half I_L is parsed as a 256-bit integer and added to the parent private key modulo n to obtain the child private key, while I_R becomes the 32-byte chain code. Hardened steps (marked with an apostrophe, indices ≥ 2³¹) hash the parent private key so that a leaked child key and chain code cannot compromise the parent branch.</p></details><div class="entropy-band"><div><span class="eyebrow">ENTROPY VERSUS KEY STRETCHING</span><h3>A 512-bit BIP-39 seed still contains at most 128 bits of entropy</h3><p>A 12-word recovery phrase encodes 128 bits of initial entropy plus a 4-bit SHA-256 checksum (132 bits in total, split into twelve 11-bit indices for a 2,048-word dictionary). Although PBKDF2-HMAC-SHA512 stretches the mnemonic into a 512-bit seed, deterministic hashing cannot increase Shannon entropy beyond the original 128-bit secret.</p></div><div class="entropy-visual"><span style="flex:128">128 entropy bits</span><span style="flex:4" title="4 checksum bits">4</span></div><p class="small">A uniformly sampled 12-word phrase is drawn from 2¹²⁸ valid combinations; if 12 words are chosen at random without recomputing the checksum, only 1 in 16 sequences is valid (and 1 in 256 for a 24-word phrase with 256 entropy bits and an 8-bit checksum).</p></div></section><section id="hash-lab" class="content-section">${sectionHead("03 / STATISTICAL EXPLORATION", "Avalanche effect and hex-digit uniformity in Keccak-256", "In each trial we hash a 32-byte input message alongside a copy with exactly one bit inverted, measuring the Hamming distance between the two 256-bit Keccak-256 digests.")}<div class="experiment-toolbar"><div><label for="sample-size">Number of message pairs n</label><select id="sample-size">${[64, 256, 1024].map((n) => `<option ${n === state.n ? "selected" : ""}>${n}</option>`).join("")}</select></div><button id="run-hashes" class="button">Run next reproducible batch ↻</button><button id="hash-csv" class="secondary">Export pairs ↓ CSV</button></div><div id="hash-statistics" aria-live="polite"></div><details><summary>Reproducible batch protocol and statistical interpretation</summary><p>In batch b, trial j constructs a 32-byte input message as Keccak-256(UTF-8("statistics-lab/v1/b/j")) and flips input bit j mod 256. Both 32-byte inputs are then hashed with Keccak-256, and we count the number of differing bits out of 256.</p><p>If a hash function behaves like an ideal random oracle on these inputs, the number of flipped output bits follows a Binomial(256, 0.5) distribution with theoretical mean μ = 128 and standard deviation σ = √(256 × 0.25) = 8 bits. We also inspect the marginal frequency of the 16 hexadecimal nibbles across the full 32-byte digests (64n hex digits) and across their last 20 bytes (40n hex digits, corresponding to the slice retained for Ethereum addresses).</p></details><article class="panel hash-compare"><h3>Comparing Keccak-256, NIST SHA3-256, and SHA-512 on the same input</h3><label for="hash-message">Input string (UTF-8)</label><input id="hash-message" type="text" maxlength="256" value="hello"><div id="hash-comparison"></div><p class="interpretation">SHA-512 belongs to the SHA-2 family (Merkle–Damgård construction) and is used inside BIP-39 and BIP-32. Both Ethereum’s Keccak-256 and NIST’s standardized SHA3-256 (FIPS 202) use the Keccak-f[1600] sponge permutation, but FIPS 202 appends the domain-separation bits 01 before padding, so the two functions produce completely different digests for the same input.</p></article></section><section id="checksum" class="content-section">${sectionHead("04 / ERROR DETECTION", "EIP-55 mixed-case address checksum", "Because Ethereum addresses do not include base58 checksum bytes, EIP-55 embeds a 40-bit error-detection pattern into the capitalization of hexadecimal letters a–f.")}<div class="panel"><label for="checksum-input">Ethereum address · strict EIP-55 check</label><input id="checksum-input" class="mono" spellcheck="false" maxlength="44"><div class="checksum-actions"><button id="checksum-reset" class="secondary">Restore derived address</button><button id="checksum-case" class="secondary">Flip one letter’s case</button><button id="checksum-digit" class="secondary">Alter one hex character</button></div><div id="checksum-result" role="status"></div><p class="small">To compute EIP-55, the 40 lowercase ASCII hex characters of the address (without 0x) are hashed with Keccak-256; each alphabetic character a–f is capitalized if and only if the corresponding nibble of the hash is ≥ 8. Changing letter case leaves the underlying 20-byte address intact, whereas altering a hex character changes the destination account and almost always invalidates the capitalization pattern.</p></div></section><section id="history" class="content-section">${sectionHead("05 / SYNTHESIS & CHRONOLOGY", "Division of cryptographic roles and historical timeline")}<div class="table-scroll"><table class="roles-table"><thead><tr><th>Operation</th><th>Cryptographic / engineering purpose</th><th>Primitive in the Ethereum pipeline</th></tr></thead><tbody>${[
    [
      "Key generation",
      "Sample unpredictable initial secret bits",
      "OS CSPRNG (128 or 256 bits of entropy)",
    ],
    [
      "Key derivation",
      "Stretch phrases and derive a tree of child keys",
      "PBKDF2-HMAC-SHA512 (BIP-39) & HMAC-SHA512 (BIP-32/44)",
    ],
    [
      "Public-key cryptography",
      "Compute a public verification point from a private scalar",
      "secp256k1 scalar multiplication (Q = kG) & ECDSA",
    ],
    ["Cryptographic hashing", "Compress public keys into fixed-size one-way digests", "Keccak-256 (retaining the final 20 bytes)"],
    ["Error-detection checksum", "Catch accidental typing or transcription mistakes", "BIP-39 word checksum & EIP-55 mixed-case encoding"],
    [
      "Data encoding",
      "Represent binary secrets and addresses for human use",
      "BIP-39 wordlist, hexadecimal strings, and ASCII case",
    ],
  ]
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join(
      "",
    )}</tbody></table></div><p class="closing-prose">No single algorithm can fulfill all of these requirements simultaneously. Asymmetric signatures require the algebraic group structure of secp256k1, whereas address derivation and key trees require the one-wayness and diffusion of cryptographic hash functions. Conversely, encodings and checksums such as BIP-39 and EIP-55 are designed to be publicly reversible and protect only against accidental corruption, never against an adversary.</p><div class="timeline">${[
    ["1977", "RSA", "Public-key cryptography"],
    ["2001", "SHA-2", "NIST SHA-512 standard"],
    ["2012", "BIP-32", "HD key derivation"],
    ["2013", "BIP-39", "Mnemonic recovery words"],
    ["2014", "BIP-44", "Multi-account path tree"],
    ["2015", "SHA-3", "NIST FIPS 202 (Keccak)"],
    ["2016", "EIP-55", "Mixed-case checksum"],
  ]
    .map(([y, h, p]) => `<div><span>${y}</span><h4>${h}</h4><p>${p}</p></div>`)
    .join(
      "",
    )}</div><p class="small muted">Chronological milestones from foundational public-key and hash standards to the Bitcoin and Ethereum wallet specifications.</p>${note("Scope of statistical diffusion tests", "Observing a mean Hamming distance near 128 bits and balanced hexadecimal nibbles confirms that Keccak-256 diffuses single-bit differences across our test batches. While such statistical behavior is expected of any sound hash function, formal security relies on cryptanalytic resistance against preimage and collision attacks rather than empirical histograms.")}<div class="chapter-footer-actions"><a class="button next-chapter" href="#hw3">Continue to Homework 3: encryption &amp; cryptanalysis →</a><a class="text-link" href="#references">Sources &amp; methodology →</a></div></section></main>`;
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
    `<p class="dataset-caption">Batch ${e.run} · n = ${e.n} message pairs (32 bytes each, 1 inverted input bit per pair) · 256 output bits per Keccak-256 digest.</p><div class="metric-grid"><div><span>MEAN HAMMING DISTANCE</span><b>${num(e.avg, 2)}<small>/ 256</small></b><small>Binomial(256, 0.5) mean: 128</small></div><div><span>SAMPLE STANDARD DEVIATION</span><b>${num(e.sd, 2)}</b><small>Binomial(256, 0.5) SD: 8.00 bits</small></div><div><span>OUTPUT ONE-BIT SHARE</span><b>${num((e.ones / (256 * e.n)) * 100, 2)}<small>%</small></b><small>${e.ones} / ${256 * e.n} total bits</small></div><div><span>STANDARD ERROR OF MEAN</span><b>${num(e.se, 3)}</b><small>s / √n across ${e.n} pairs</small></div></div><div class="panel"><h3>Distribution of changed output bits (Hamming distance)</h3>${bars(bins, { labels: Array.from({ length: 17 }, (_, i) => (i === 16 ? "256" : `${16 * i}–${16 * i + 15}`)), title: "Hamming distance histogram in 16-bit bins" })}<p class="interpretation">Across the ${e.n} pairs, the number of flipped output bits ranges from ${Math.min(...e.distances)} to ${Math.max(...e.distances)}, clustering tightly around the 50% benchmark of 128 bits with sample dispersion close to σ = 8.</p></div><div class="two-col"><article class="panel"><h3>Hexadecimal digit frequencies · full 32-byte digests</h3>${bars(e.hexCounts, { labels: [..."0123456789abcdef"], expected: (64 * e.n) / 16, title: "Hex frequencies of original full digests" })}<p class="small">Total of ${64 * e.n} hex nibbles (64 per digest × ${e.n} trials), compared against the uniform expectation of ${4 * e.n} per nibble.</p><p class="interpretation">All 16 hexadecimal values occur near the expected frequency 64n / 16, with only minor sampling fluctuations across batches.</p></article><article class="panel"><h3>Hexadecimal digit frequencies · final 20 bytes</h3>${bars(e.addressCounts, { labels: [..."0123456789abcdef"], expected: (40 * e.n) / 16, color: "orange", title: "Hex frequencies of truncated digest tails" })}<p class="small">Total of ${40 * e.n} hex nibbles from the last 20 bytes of each digest, with uniform expectation ${2.5 * e.n} per nibble.</p><p class="interpretation">Truncating a 256-bit Keccak digest to its final 160 bits (as in Ethereum address derivation) preserves the flat marginal distribution of hexadecimal characters while reducing the output space from 2²⁵⁶ to 2¹⁶⁰.</p></article></div><details><summary>Per-bit balance across the 256 digest positions and sample rows</summary><p>Count of 1-bits at each of the 256 bit positions across all n = ${e.n} unflipped digests (MSB first):</p><div class="bit-heatmap">${e.bitCounts.map((v, i) => `<span style="--balance:${v / e.n}" title="Position ${i}: ${v}/${e.n} one-bits">${v}</span>`).join("")}</div><div class="table-scroll"><table><thead><tr><th>Trial j</th><th>Flipped input bit</th><th>Changed output bits</th></tr></thead><tbody>${e.rows
      .slice(0, 12)
      .map(
        (r) =>
          `<tr><td>${r.i}</td><td>${r.bit}</td><td>${r.distance} / 256</td></tr>`,
      )
      .join(
        "",
      )}</tbody></table></div><p>Use the CSV export button above to download the complete table of 32-byte input pairs, digests, and Hamming distances.</p></details>`;
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
  ["MIT · Riemann and Lebesgue integration", "Measure, simple functions and comparison of integrals", "https://ocw.mit.edu/courses/18-125-measure-and-integration-fall-2003/resources/18125_lec3/"],
  ["NIST · standard normal table", "Trusted five-decimal web reference; areas from zero converted to the CDF", "https://www.itl.nist.gov/div898/handbook/eda/section3/eda3671.htm"],
  ["NIST DLMF · error functions", "Exact definitions and representations of erf and erfc", "https://dlmf.nist.gov/7.2"],
  ["NIST DLMF · series", "Power-series representations of error functions", "https://dlmf.nist.gov/7.6"],
  ["Brian Conrad · elementary integration", "Liouville’s theorem and the non-elementary Gaussian antiderivative", "https://math.stanford.edu/~conrad/papers/elemint.pdf"],
  ["Assigned reading · normal distribution", "ETSU notes on Hogg–McKean–Craig, section 3.4", "https://faculty.etsu.edu/gardnerr/4047/notes-Hogg-McKean-Craig/Hogg-McKean-Craig-3-4.pdf"],
  ["Welford (1962)", "Original article on corrected sums of squares and products", "https://doi.org/10.1080/00401706.1962.10490022"],
  ["SAS · one-pass statistics", "Derivation and implementation of online mean and variance updates", "https://blogs.sas.com/content/iml/2026/04/06/welford-mean-var.html"],
  ["Sample-variance moments", "Benhamou: expectations and variance of the sample variance, including the iid fourth-moment formula", "https://arxiv.org/abs/1809.03774"],
  ["Law of Large Numbers", "Finite-variance iid averages, Chebyshev inequality and convergence in probability", "https://www.statlect.com/asymptotic-theory/law-of-large-numbers"],
  ["Central Limit Theorem", "Centering, standardization and the iid normal limit", "https://www.statlect.com/asymptotic-theory/central-limit-theorem"],
  [
    "SEC 1",
    "Curve arithmetic, point encoding and integrated encryption",
    "https://www.secg.org/sec1-v2.pdf",
  ],
  [
    "Handbook of Applied Cryptography · chapter 8",
    "ElGamal encryption and the limits of unauthenticated public-key encryption",
    "https://cacr.uwaterloo.ca/hac/about/chap8.pdf",
  ],
  [
    "Handbook of Applied Cryptography · chapter 3",
    "Discrete logarithms and baby-step giant-step",
    "https://cacr.uwaterloo.ca/hac/about/chap3.pdf",
  ],
  [
    "noble-curves 1.9.7",
    "Library used for secp256k1 point arithmetic in Homework 3",
    "https://github.com/paulmillr/noble-curves/tree/1.9.7",
  ],
  [
    "NLTK Gutenberg corpus",
    "Local public-domain English narrative excerpts: Emma for training and Alice for evaluation",
    "https://github.com/nltk/nltk_data/blob/gh-pages/packages/corpora/gutenberg.zip",
  ],
  [
    "Homework 3 corpus manifest",
    "Exact source excerpts, preprocessing description and SHA-256 hashes",
    `${import.meta.env.BASE_URL}corpora/manifest.json`,
  ],
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
  return `<main id="main">${chapterIntro("01–06", "Methodology, Protocols<br><em>and Primary Sources</em>", "Documentation of the mathematical models, simulation protocols, cryptographic standards, and automated verification tests used across all six coursework chapters.", "SOURCES & METHODOLOGY")}<nav class="section-nav" aria-label="Chapter sections"><a href="#ref-method">Experimental methodology</a><a href="#ref-sources">Primary references</a><a href="#ref-scope">Coursework overview</a></nav><section id="ref-method" class="content-section">${sectionHead("01 / METHODOLOGY", "Design and verification of the six laboratories", "Every chapter separates exact analytical benchmarks from finite-sample or numerical observations.")}<div class="two-col prose"><article><h3>What each laboratory measures</h3><p><strong>Homeworks 1–3 (Cryptography &amp; Cryptanalysis):</strong> Homework 1 performs an exact census of the cyclic subgroups of y² ≡ x³ + 7 (mod 17), tracking coordinate frequencies, 5-bit encodings, and single-bit scalar flips. Homework 2 traces BIP-39/32/44 wallet derivation and measures Keccak-256 bit diffusion and hex uniformity across reproducible 32-byte message pairs. Homework 3 compares byte-wise EC-ElGamal on secp256k1 against the Caesar cipher, evaluating chi-square and trigram key recovery on disjoint literary corpora (Jane Austen’s <em>Emma</em> for training, Lewis Carroll’s <em>Alice</em> for testing) alongside exhaustive and baby-step giant-step key searches.</p><p><strong>Homeworks 4–6 (Stochastic Processes, Inference &amp; Numerical Analysis):</strong> Homework 4 simulates m independent attacker trajectories across n systems with Bernoulli(p) and symmetric Rademacher increments, comparing Sₙ, Sₙ/n, and Sₙ/√n against exact binomial distributions, Chebyshev bounds, and the standard normal CDF. Homework 5 derives Welford’s one-pass recurrences and studies the sampling distributions and variances Var(<span class="overline">x</span>) and Var(s²) under a fixed discrete severity law (μ = 5, σ² = 8.6). Homework 6 compares midpoint Riemann sums against Lebesgue simple-function bounds across seven regular and pathological functions, and computes Φ(z) via adaptive tail Simpson quadrature, uniform rules, and Taylor series.</p></article><article><h3>Automated test suite and dependencies</h3><p>The project includes an automated suite of <strong>59 unit and integration tests</strong> (executed via Node’s built-in test runner) covering all six chapters. The tests verify closure, associativity, and double-and-add equivalence on F₁₇; official BIP-39, BIP-32, EIP-55, Keccak-256, and SHA3-256 test vectors; Caesar entropy invariance, corpus SHA-256 integrity, and EC-ElGamal round-trip decryption and malleability; exact finite-n binomial laws and seeded prefix consistency for the random-walk and Welford simulators; and analytical error bounds, Thomae rational reductions, and high-precision normal CDF reference values down to z = −8.</p><p>All calculations run client-side in the browser. Cryptographic primitives in Homeworks 2 and 3 use pinned versions of <code>ethers</code> (6.17.0), <code>@noble/hashes</code> (1.8.0), and <code>@noble/curves</code> (1.9.7), while stochastic simulations and numerical quadratures in Homeworks 4–6 are implemented from scratch in plain JavaScript and Web Workers.</p></article></div></section><section id="ref-sources" class="content-section">${sectionHead("02 / PRIMARY REFERENCES", "Standards, papers, and lecture notes")}<div class="source-list">${sources.map(([name, desc, url], i) => `<a href="${url}" target="_blank" rel="noopener noreferrer"><span>${String(i + 1).padStart(2, "0")}</span><div><h3>${name}</h3><p>${desc}</p></div><b>↗</b></a>`).join("")}</div></section><section id="ref-scope" class="content-section">${note("Note on chapter numbering", "In this notebook, the initial finite-field curve lab and the Ethereum wallet pipeline are presented as two separate chapters (Homework 1 and Homework 2). Consequently, chapters 3 through 6 correspond to Homeworks 2 through 5 in the classroom schedule, while preserving stable URLs (#hw1 to #hw6) across submissions.")}<div class="chapter-footer-actions"><a class="button next-chapter" href="#home">← Back to Overview &amp; homework folders</a></div></section></main>`;
}
function hw3() {
  return renderHomework3({
    chapterIntro,
    sectionHead,
    note,
    bars,
    download,
    esc,
  });
}
function hw4() { return renderHomework4({ chapterIntro, sectionHead, note, download, esc }); }
function hw5() { return renderHomework5({ chapterIntro, sectionHead, note, download, esc }); }

let scrollObserver;
function setupScrollReveal() {
  scrollObserver?.disconnect();
  if (typeof IntersectionObserver === "undefined" || reducedMotion()) return;
  const targets = document.querySelectorAll(
    "#main .academic-context > div, #main .section-heading, #main .homework-folder, #main .method-strip article, #main .content-section > .two-col, #main .lab-layout, #main .log-panel, #main .content-section > .panel, #main .content-section > .formula-box, #main .content-section > .metric-grid, #main .pipeline-step, #main .standard-grid article, #main .timeline > div, #main .source-list > a, #main .content-section > .note, #main > .note, #main .content-section > details"
  );
  const vh = window.innerHeight || 800;
  scrollObserver = new IntersectionObserver(
    (entries) => {
      let batch = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        el.style.setProperty("--reveal-delay", `${Math.min(batch * 45, 160)}ms`);
        batch++;
        el.classList.add("is-visible");
        scrollObserver.unobserve(el);
      }
    },
    { rootMargin: "0px 0px 45px 0px", threshold: 0.04 }
  );
  for (const el of targets) {
    const rect = el.getBoundingClientRect();
    if (rect.top >= vh * 0.96) {
      el.classList.add("reveal-item");
      scrollObserver.observe(el);
    }
  }
}
window.addEventListener("scroll", () => {
  document.documentElement.classList.toggle("is-scrolled", window.scrollY > 14);
}, { passive: true });

let routeTransition;
function applyRender(route, sectionPage) {
  for (const hw of HOMEWORKS) hw.dispose?.();
  const activeHwIndex = HOMEWORKS.findIndex((h) => h.id === state.page);
  const activeHw = activeHwIndex !== -1 ? HOMEWORKS[activeHwIndex] : null;
  const viewHtml = activeHw
    ? activeHw.render()
    : state.page === "references"
      ? references()
      : home();
  $("#app").innerHTML = header() + viewHtml + footer();
  if (activeHw || state.page === "references") {
    const mainEl = document.getElementById("main");
    if (mainEl) {
      mainEl.classList.add("notebook-sheet");
    }
  }
  bindAppearance();
  document.querySelector(".topbar nav a[aria-current]")?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
  document.title = activeHw
    ? `${activeHw.pageTitle} · Statistics Homeworks`
    : state.page === "references"
      ? "Sources & methodology · Statistics Homeworks"
      : "Statistics Homeworks · Luca Gugliotta";
  activeHw?.bind?.();
  if (sectionPage[route]) document.getElementById(route)?.scrollIntoView({ behavior: "instant" });
  else window.scrollTo({ top: 0, behavior: "instant" });
  setupScrollReveal();
}

function getSectionPageMap() {
  const map = {
    "homework-folders": "home",
    "ref-method": "references",
    "ref-sources": "references",
    "ref-scope": "references",
  };
  for (const hw of HOMEWORKS) {
    for (const sec of hw.sections) map[sec] = hw.id;
  }
  return map;
}

function render(event) {
  stop();
  const route = location.hash.slice(1);
  const validPages = ["home", ...HOMEWORKS.map((h) => h.id), "references"];
  if (!validPages.includes(route)) {
    if (route && document.getElementById(route)) return;
  }
  const sectionPage = getSectionPageMap();
  const nextPage = validPages.includes(route)
    ? route
    : (sectionPage[route] ?? "home");
  const prevPage = state.page;
  const pageChanged = event && nextPage !== prevPage;
  state.page = nextPage;
  routeTransition?.skipTransition();
  if (pageChanged && document.startViewTransition && !reducedMotion()) {
    routeTransition = document.startViewTransition(() => applyRender(route, sectionPage));
  } else {
    applyRender(route, sectionPage);
  }
}

window.addEventListener("hashchange", render);
render();
