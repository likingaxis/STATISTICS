import {
  PROTOCOL_VERSION,
  PRESET_DATASETS,
  getPresetDataset,
  parseBivariateData,
  analyzeBivariateDataset,
  generateBivariateDataset,
  chiSquarePDF,
  getConfounderAnalyses,
} from './independence.js';

const $ = (s) => document.querySelector(s);

const initialPreset = getPresetDataset('attack-outcome');
const state = {
  presetId: 'attack-outcome',
  alpha: 0.05,
  hasHeader: false,
  rawText: initialPreset.pairs.map(([x, f]) => `${x}, ${f}`).join('\n'),
  xName: initialPreset.xName,
  fName: initialPreset.fName,
  xOrder: initialPreset.xOrder,
  fOrder: initialPreset.fOrder,
  summaryText: initialPreset.summary,
  synth: { n: 300, dims: '3x3', strength: 0, seed: 20261118 },
  analysis: null,
};

let ui;
let active = false;

const fmt = (x, d = 4) =>
  x === null || !Number.isFinite(x)
    ? '—'
    : x !== 0 && Math.abs(x) < Math.max(1e-5, 10 ** -d)
      ? x.toExponential(Math.min(d, 6))
      : x.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: d });

const fmtFixed = (x, d = 3) =>
  x === null || !Number.isFinite(x) ? '—' : x.toFixed(d);

const fmtPct = (x, d = 1) =>
  x === null || !Number.isFinite(x) ? '—' : `${(x * 100).toFixed(d)}%`;

const table = (head, rows, foot = null) =>
  `<div class="table-scroll"><table><thead><tr>${head.map((x) => `<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((x) => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody>${foot ? `<tfoot><tr>${foot.map((x) => `<td><strong>${x}</strong></td>`).join('')}</tr></tfoot>` : ''}</table></div>`;

const select = (id, label, options, current) =>
  `<div><label for="${id}">${label}</label><select id="${id}">${options
    .map((opt) => {
      const [val, text] = Array.isArray(opt) ? opt : [opt, opt];
      return `<option value="${val}" ${String(val) === String(current) ? 'selected' : ''}>${text}</option>`;
    })
    .join('')}</select></div>`;

const link = (url, label) =>
  `<a href="${url}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`;

const legend = (items) =>
  `<div class="h7-legend">${items.map(([color, text, dash]) => `<span><i style="--series:${color}" class="${dash ? 'dashed' : ''}"></i>${text}</span>`).join('')}</div>`;

function ensureAnalysis() {
  if (!state.analysis) {
    const parsed = parseBivariateData(state.rawText, { hasHeader: state.hasHeader });
    state.analysis = analyzeBivariateDataset(parsed.pairs, {
      alpha: state.alpha,
      xOrder: state.xOrder,
      fOrder: state.fOrder,
      xName: state.hasHeader ? parsed.xName : state.xName,
      fName: state.hasHeader ? parsed.fName : state.fName,
    });
  }
  return state.analysis;
}

/**
 * Grouped bar chart comparing conditional distributions P(F = f_j | X = x_i)
 * across rows against the marginal reference P(F = f_j).
 */
function conditionalChart(tbl) {
  const { R, C, xLabels, fLabels, condFGivenX, colMarginals } = tbl;
  const w = 860;
  const h = 285;
  const l = 64;
  const r = 24;
  const t = 28;
  const b = 56;
  const innerW = w - l - r;
  const innerH = h - t - b;
  const maxVal = Math.min(
    1,
    Math.max(...condFGivenX.flat(), ...colMarginals, 0.2) * 1.18,
  );
  const Y = (v) => h - b - (v / maxVal) * innerH;
  const groupW = innerW / C;
  const barSlotW = (groupW * 0.76) / Math.max(1, R);
  const groupPad = groupW * 0.12;
  const colors = [
    'var(--series-main)',
    'var(--series-reference)',
    'var(--series-third)',
    'var(--ink)',
    'var(--point-muted)',
    'var(--accent)',
  ];

  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((q) => {
      const v = q * maxVal;
      const py = Y(v);
      return `<line x1="${l}" x2="${w - r}" y1="${py.toFixed(2)}" y2="${py.toFixed(2)}" class="gridline"/><text x="${l - 8}" y="${(py + 4).toFixed(2)}" text-anchor="end" class="axis">${(v * 100).toFixed(0)}%</text>`;
    })
    .join('');

  const groups = fLabels
    .map((fLab, j) => {
      const gx = l + j * groupW;
      const margY = Y(colMarginals[j]);
      const barsSvg = xLabels
        .map((xLab, i) => {
          const val = condFGivenX[i][j];
          const bx = gx + groupPad + i * barSlotW + barSlotW * 0.08;
          const bw = Math.max(4, barSlotW * 0.84);
          const by = Y(val);
          const bh = Math.max(1, h - b - by);
          const fill = colors[i % colors.length];
          return `<rect x="${bx.toFixed(2)}" y="${by.toFixed(2)}" width="${bw.toFixed(2)}" height="${bh.toFixed(2)}" rx="2" fill="${fill}" opacity="0.9"><title>P(F = ${ui.esc(fLab)} | X = ${ui.esc(xLab)}) = ${fmtFixed(val, 4)} (${fmtPct(val, 1)}), marginal P(F = ${ui.esc(fLab)}) = ${fmtFixed(colMarginals[j], 4)}</title></rect>`;
        })
        .join('');
      const refLine = `<line x1="${(gx + groupPad * 0.6).toFixed(2)}" x2="${(gx + groupW - groupPad * 0.6).toFixed(2)}" y1="${margY.toFixed(2)}" y2="${margY.toFixed(2)}" stroke="var(--ink)" stroke-width="2" stroke-dasharray="5 4"><title>Marginal P(F = ${ui.esc(fLab)}) = ${fmtFixed(colMarginals[j], 4)} (${fmtPct(colMarginals[j], 1)})</title></line>`;
      const label = `<text x="${(gx + groupW / 2).toFixed(2)}" y="${h - b + 22}" text-anchor="middle" class="axis">${ui.esc(fLab)}</text>`;
      return `${barsSvg}${refLine}${label}`;
    })
    .join('');

  const legendItems = [
    ...xLabels.map((xLab, i) => [colors[i % colors.length], `P(F | X = ${ui.esc(xLab)})`, false]),
    ['var(--ink)', 'Marginal P(F) under independence', true],
  ];

  return `<div class="chart-scroll"><svg class="chart h7-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Conditional probabilities P(F given X) compared against marginal probabilities P(F)"><title>Conditional distributions P(F | X = xᵢ) versus marginal baseline P(F)</title>${grid}${groups}<text x="${l}" y="15" class="axis">Conditional probability P(F = fⱼ | X = xᵢ)</text><text x="${(w + l - r) / 2}" y="${h - 8}" text-anchor="middle" class="axis">Categories of ${ui.esc(tbl.fName)}</text></svg></div>${legend(legendItems)}`;
}

/**
 * Plots the Chi-square reference density f(x; df), critical threshold, and observed statistic.
 */
function chiSquareDistributionChart(test) {
  if (test.degenerate) {
    return '<p class="small">The Chi-square reference distribution is undefined when df = 0 (at least 2 rows and 2 columns are required).</p>';
  }
  const { df, chiSquare, criticalValue, alpha, pValue } = test;
  const w = 860;
  const h = 265;
  const l = 64;
  const r = 26;
  const t = 28;
  const b = 52;
  const innerW = w - l - r;
  const innerH = h - t - b;

  const upperQuantile = Math.max(
    df + 6 * Math.sqrt(2 * df),
    criticalValue * 1.45,
    Math.min(chiSquare * 1.15, criticalValue * 3.5),
    8,
  );
  const xMin = df === 1 ? 0.04 : 0;
  const xMax = upperQuantile;
  const steps = 180;
  const curvePts = [];
  let maxY = 0;
  for (let i = 0; i <= steps; i++) {
    const x = xMin + (i / steps) * (xMax - xMin);
    const y = Math.min(chiSquarePDF(x, df), 1.6);
    if (y > maxY) maxY = y;
    curvePts.push([x, y]);
  }
  maxY = Math.max(maxY * 1.15, 0.05);

  const X = (x) => l + ((Math.min(x, xMax) - xMin) / (xMax - xMin)) * innerW;
  const Y = (y) => h - b - (y / maxY) * innerH;

  const tailPts = curvePts.filter(([x]) => x >= criticalValue);
  const tailAreaPath =
    tailPts.length > 1
      ? `M${X(criticalValue).toFixed(2)},${(h - b).toFixed(2)} ` +
        tailPts.map(([x, y]) => `L${X(x).toFixed(2)},${Y(y).toFixed(2)}`).join(' ') +
        ` L${X(tailPts.at(-1)[0]).toFixed(2)},${(h - b).toFixed(2)} Z`
      : '';

  const linePath = curvePts
    .map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(2)},${Y(y).toFixed(2)}`)
    .join(' ');

  const critX = X(criticalValue);
  const obsClamped = Math.min(chiSquare, xMax);
  const obsX = X(obsClamped);
  const gridY = [0, 0.5, 1]
    .map((q) => {
      const v = q * maxY;
      const py = Y(v);
      return `<line x1="${l}" x2="${w - r}" y1="${py.toFixed(2)}" y2="${py.toFixed(2)}" class="gridline"/><text x="${l - 8}" y="${(py + 4).toFixed(2)}" text-anchor="end" class="axis">${v.toFixed(3)}</text>`;
    })
    .join('');

  const gridX = [0, 0.25, 0.5, 0.75, 1]
    .map((q) => {
      const v = xMin + q * (xMax - xMin);
      const px = X(v);
      return `<text x="${px.toFixed(2)}" y="${h - b + 20}" text-anchor="middle" class="axis">${v.toFixed(1)}</text>`;
    })
    .join('');

  return `<div class="chart-scroll"><svg class="chart h7-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Chi-square distribution with ${df} degrees of freedom, critical threshold ${criticalValue.toFixed(3)}, and observed statistic ${chiSquare.toFixed(3)}"><title>Asymptotic χ²(${df}) density under H₀, critical region α = ${alpha}, and observed χ² = ${chiSquare.toFixed(4)}</title>${gridY}${gridX}${tailAreaPath ? `<path d="${tailAreaPath}" fill="var(--series-main)" opacity="0.22"/>` : ''}<path d="${linePath}" fill="none" stroke="var(--series-reference)" stroke-width="2.4"/><line x1="${critX.toFixed(2)}" x2="${critX.toFixed(2)}" y1="${t}" y2="${h - b}" stroke="var(--ink)" stroke-width="1.8" stroke-dasharray="6 4"/><text x="${Math.min(w - r - 4, Math.max(l + 4, critX - 6)).toFixed(2)}" y="${t + 14}" text-anchor="end" class="axis">χ²_α = ${criticalValue.toFixed(2)}</text><line x1="${obsX.toFixed(2)}" x2="${obsX.toFixed(2)}" y1="${t}" y2="${h - b}" stroke="var(--series-main)" stroke-width="2.6"/><circle cx="${obsX.toFixed(2)}" cy="${(h - b).toFixed(2)}" r="4.2" fill="var(--series-main)"/><text x="${Math.min(w - r - 4, Math.max(l + 60, obsX + (obsX > w - 160 ? -8 : 8))).toFixed(2)}" y="${t + 30}" text-anchor="${obsX > w - 160 ? 'end' : 'start'}" class="axis">Observed χ² = ${chiSquare.toFixed(2)}${chiSquare > xMax ? ' (off-scale →)' : ''}</text><text x="${l}" y="15" class="axis">Density f(x; df = ${df}) · optional p-value = ${fmt(pValue, 5)}</text><text x="${(w + l - r) / 2}" y="${h - 8}" text-anchor="middle" class="axis">Chi-square value x</text></svg></div>${legend([
    ['var(--series-reference)', `Theoretical χ²(df = ${df}) density under H₀`, false],
    ['var(--ink)', `Critical threshold χ²_${alpha} = ${criticalValue.toFixed(3)}`, true],
    ['var(--series-main)', `Observed χ² = ${chiSquare.toFixed(3)} (rejection region shaded)`, false],
  ])}`;
}

/**
 * Diverging horizontal/vertical bar chart of standardized Pearson residuals r_ij = (O_ij - E_ij)/sqrt(E_ij).
 */
function residualsChart(test) {
  const cells = test.cellDetails;
  const w = 860;
  const h = 260;
  const l = 64;
  const r = 24;
  const t = 28;
  const b = 62;
  const innerW = w - l - r;
  const innerH = h - t - b;
  const maxAbs = Math.max(2.2, ...cells.map((c) => Math.abs(c.residual))) * 1.15;
  const Y = (v) => t + ((maxAbs - v) / (2 * maxAbs)) * innerH;
  const zeroY = Y(0);
  const step = innerW / cells.length;

  const grid = [-maxAbs, -maxAbs / 2, 0, maxAbs / 2, maxAbs]
    .map((v) => {
      const py = Y(v);
      return `<line x1="${l}" x2="${w - r}" y1="${py.toFixed(2)}" y2="${py.toFixed(2)}" class="${v === 0 ? 'expected' : 'gridline'}"/><text x="${l - 8}" y="${(py + 4).toFixed(2)}" text-anchor="end" class="axis">${v.toFixed(2)}</text>`;
    })
    .join('');

  const barsSvg = cells
    .map((c, idx) => {
      const bx = l + idx * step + step * 0.14;
      const bw = Math.max(8, step * 0.72);
      const val = c.residual;
      const py = Y(val);
      const top = Math.min(zeroY, py);
      const bh = Math.max(1.5, Math.abs(py - zeroY));
      const fill = val >= 0 ? 'var(--series-main)' : 'var(--series-reference)';
      const shortLabel = `${c.xLabel.slice(0, 6)}×${c.fLabel.slice(0, 6)}`;
      return `<g><rect x="${bx.toFixed(2)}" y="${top.toFixed(2)}" width="${bw.toFixed(2)}" height="${bh.toFixed(2)}" rx="2" fill="${fill}"><title>(${ui.esc(c.xLabel)}, ${ui.esc(c.fLabel)}): O = ${c.observed}, E = ${c.expected.toFixed(2)}, Pearson residual r = ${val.toFixed(3)}, χ² contribution = ${c.contribution.toFixed(3)}</title></rect><text x="${(l + (idx + 0.5) * step).toFixed(2)}" y="${h - b + 20}" text-anchor="middle" class="axis">${ui.esc(shortLabel)}</text></g>`;
    })
    .join('');

  return `<div class="chart-scroll"><svg class="chart h7-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Standardized Pearson residuals across all contingency cells"><title>Pearson residuals rᵢⱼ = (Oᵢⱼ − Eᵢⱼ) / √Eᵢⱼ sorted by χ² contribution</title>${grid}${barsSvg}<text x="${l}" y="15" class="axis">Pearson residual rᵢⱼ = (Oᵢⱼ − Eᵢⱼ) / √Eᵢⱼ</text><text x="${(w + l - r) / 2}" y="${h - 8}" text-anchor="middle" class="axis">Cells (X × F) ordered from largest to smallest χ² contribution</text></svg></div>${legend([
    ['var(--series-main)', 'Positive residual (Oᵢⱼ > Eᵢⱼ · over-represented)', false],
    ['var(--series-reference)', 'Negative residual (Oᵢⱼ < Eᵢⱼ · under-represented)', false],
  ])}`;
}

export function renderHomework7(helpers) {
  ui = helpers;
  const { chapterIntro, sectionHead, note } = ui;
  const conf = getConfounderAnalyses();

  return `<main id="main" class="homework-seven">${chapterIntro(
    '7',
    'Statistical Independence<br><em>and Contingency Analysis</em>',
    'Given any bivariate dataset (X, F), programmatically construct the contingency table, compute marginal and conditional distributions, evaluate expected frequencies under independence and Pearson’s χ² statistic (along with the optional exact p-value and Cramér’s V), and distinguish statistical association from causality.',
    'CONTINGENCY TABLES · CHI-SQUARE TEST',
  )}
  <nav class="section-nav" aria-label="Chapter sections"><a href="#hw7-theory">01 · Independence theory</a><a href="#hw7-lab">02 · Bivariate laboratory</a><a href="#hw7-frequencies">03 · Contingency &amp; conditionals</a><a href="#hw7-test">04 · Chi-square &amp; diagnostics</a><a href="#hw7-causality">05 · Association vs causality</a></nav>

  <section id="hw7-theory" class="content-section">${sectionHead(
    '01 / THEORETICAL FOUNDATIONS',
    'Statistical independence in probability theory and contingency tables',
    'Two random variables are statistically independent when learning the value of one carries zero information about the probability distribution of the other.',
  )}
  <div class="two-col prose"><div><h3>1. Probabilistic definition of independence</h3><p>On a probability space (Ω, ℱ, P), two events A and B are independent if and only if their joint probability factorizes as <strong>P(A ∩ B) = P(A) P(B)</strong>. Whenever P(B) &gt; 0, this is equivalent to the conditional identity <strong>P(A | B) = P(A)</strong>.</p><p>For two discrete random variables X (taking values x₁, …, x<sub>R</sub>) and F (taking values f₁, …, f<sub>C</sub>), statistical independence requires that the joint probability mass function equal the product of the marginal mass functions in every cell (i, j):</p><p><strong>p<sub>X,F</sub>(xᵢ, fⱼ) = P(X = xᵢ, F = fⱼ) = p<sub>X</sub>(xᵢ) · p<sub>F</sub>(fⱼ) &nbsp; for all i, j.</strong></p><p>Equivalently, every row conditional distribution must coincide with the column marginal distribution, <strong>p<sub>F|X</sub>(fⱼ | xᵢ) = p<sub>F</sub>(fⱼ)</strong>, and every column conditional distribution must coincide with the row marginal distribution, <strong>p<sub>X|F</sub>(xᵢ | fⱼ) = p<sub>X</sub>(xᵢ)</strong>.</p></div>
  <div class="formula-box"><span class="eyebrow">EMPIRICAL CONTINGENCY TABLE &amp; CHI-SQUARE TEST</span><p>Observed joint counts: Oᵢⱼ, &nbsp; Row marginals: Rᵢ = Σⱼ Oᵢⱼ, &nbsp; Column marginals: Cⱼ = Σᵢ Oᵢⱼ, &nbsp; Total: N = Σᵢⱼ Oᵢⱼ</p><p>Conditional frequencies: f(fⱼ | xᵢ) = Oᵢⱼ / Rᵢ, &nbsp; f(xᵢ | fⱼ) = Oᵢⱼ / Cⱼ</p><p>Expected frequencies under H₀ (independence): <strong>Eᵢⱼ = N · (Rᵢ / N)(Cⱼ / N) = (Rᵢ Cⱼ) / N</strong></p><p class="formula">χ² = Σᵢ₌₁<sup>R</sup> Σⱼ₌₁<sup>C</sup> (Oᵢⱼ − Eᵢⱼ)² / Eᵢⱼ</p><p>Degrees of freedom: <strong>df = (R − 1)(C − 1)</strong> &nbsp; · &nbsp; Optional upper-tail p-value: <strong>p = Q(df / 2, χ² / 2)</strong></p></div></div>
  <div class="two-col prose"><div><h3>2. Expected frequencies and degrees of freedom</h3><p>In a finite sample of N observations, the true marginal probabilities p<sub>X</sub>(xᵢ) and p<sub>F</sub>(fⱼ) are unknown and are replaced by their maximum-likelihood empirical estimates f<sub>i·</sub> = Rᵢ / N and f<sub>·j</sub> = Cⱼ / N. Multiplying these empirical marginals by N gives the expected cell frequency <strong>Eᵢⱼ = Rᵢ Cⱼ / N</strong> that would prevail if X and F were exactly independent in the sample.</p><p>Because the expected frequencies are constrained to match all R row totals and all C column totals (with Σᵢ Rᵢ = Σⱼ Cⱼ = N providing one shared grand-total identity), estimating (R − 1) free row probabilities and (C − 1) free column probabilities leaves exactly <strong>RC − 1 − (R − 1) − (C − 1) = (R − 1)(C − 1)</strong> free cell deviations. As established by R. A. Fisher (1922) in correcting Karl Pearson’s original 1900 derivation, under H₀ and multinomial sampling the statistic χ² converges in distribution as N → ∞ to a central Chi-square law with df = (R − 1)(C − 1) degrees of freedom.</p></div>
  <div><h3>3. Mandatory χ² versus optional p-value and effect size</h3><p>Following the assignment specification, our programmatic pipeline always computes the exact contingency table Oᵢⱼ, marginal frequencies, row and column conditional distributions, expected frequencies Eᵢⱼ, and Pearson’s <strong>χ² statistic</strong>. As clearly marked optional extensions, the laboratory also evaluates:</p><p>1. The exact asymptotic <strong>p-value = P(χ²<sub>df</sub> ≥ χ²<sub>obs</sub>) = Γ(df/2, χ²/2) / Γ(df/2)</strong> via the regularized upper incomplete gamma function (${link('https://dlmf.nist.gov/8.2', 'NIST DLMF §8.2')});<br>2. <strong>Cramér’s V = √[χ² / (N · min(R − 1, C − 1))] ∈ [0, 1]</strong>, which normalizes χ² for sample size N and table dimensions so association strength can be compared across datasets of different sizes.</p></div></div>
  <details><summary>Programmatic JavaScript implementation: from raw (X, F) pairs to contingency table and χ²</summary><pre class="h5-code"><code>// 1. Programmatically accumulate joint counts O_ij and marginals R_i, C_j from raw [x, f] pairs
for (const [x, f] of pairs) {
  const i = xIndex.get(x), j = fIndex.get(f);
  observed[i][j] += 1;
  rowTotals[i] += 1;
  colTotals[j] += 1;
}

// 2. Conditional frequencies P(F = f_j | X = x_i) and P(X = x_i | F = f_j)
const condFGivenX = observed.map((row, i) =&gt; row.map((o) =&gt; o / rowTotals[i]));
const condXGivenF = observed.map((row) =&gt; row.map((o, j) =&gt; o / colTotals[j]));

// 3. Expected frequencies under independence E_ij = (R_i * C_j) / N and Pearson's Chi-square
let chiSquare = 0;
for (let i = 0; i &lt; R; i++) {
  for (let j = 0; j &lt; C; j++) {
    const E = (rowTotals[i] * colTotals[j]) / N;
    chiSquare += ((observed[i][j] - E) ** 2) / E;
  }
}</code></pre></details></section>

  <section id="hw7-lab" class="content-section">${sectionHead(
    '02 / BIVARIATE DATASET LABORATORY',
    'Select, generate, or paste any bivariate dataset (X, F)',
    'Switch between curated cybersecurity datasets, generate synthetic samples with controlled dependence strength, or paste custom raw (X, F) observation pairs.',
  )}
  <form id="h7-preset-form" class="panel"><div class="h7-controls">${select(
    'h7-preset',
    'Curated bivariate dataset (X, F)',
    [
      ...PRESET_DATASETS.map((p) => [p.id, p.label]),
      ['custom', 'Custom / Synthetic raw (X, F) pairs (edit below)'],
    ],
    state.presetId,
  )}${select(
    'h7-alpha',
    'Significance threshold α',
    [
      [0.1, 'α = 0.10 (90% confidence)'],
      [0.05, 'α = 0.05 (95% confidence · standard)'],
      [0.01, 'α = 0.01 (99% confidence)'],
      [0.001, 'α = 0.001 (99.9% confidence)'],
    ],
    state.alpha,
  )}</div><p id="h7-dataset-summary" class="small"></p>
  <details id="h7-raw-details"><summary>Inspect or edit raw bivariate (X, F) observations &amp; synthetic generator</summary>
  <div class="h7-synth-box"><span class="eyebrow">SYNTHETIC BIVARIATE GENERATOR (MULBERRY32)</span>
  <div class="experiment-toolbar">${select(
    'h7-synth-n',
    'Sample size N',
    [60, 150, 300, 600, 1200],
    state.synth.n,
  )}${select(
    'h7-synth-dims',
    'Dimensions R × C',
    [
      ['2x2', '2 × 2 (df = 1)'],
      ['3x3', '3 × 3 (df = 4)'],
      ['4x3', '4 × 3 (df = 6)'],
      ['4x4', '4 × 4 (df = 9)'],
    ],
    state.synth.dims,
  )}${select(
    'h7-synth-strength',
    'True dependence strength s',
    [
      [0, 's = 0.00 (Exact independence H₀)'],
      [0.15, 's = 0.15 (Weak association)'],
      [0.35, 's = 0.35 (Moderate association)'],
      [0.65, 's = 0.65 (Strong association)'],
      [0.9, 's = 0.90 (Near-deterministic)'],
    ],
    state.synth.strength,
  )}<div><label for="h7-synth-seed">Seed</label><input id="h7-synth-seed" type="number" min="1" max="4294967295" step="1" value="${state.synth.seed}"></div><button id="h7-synth-btn" class="secondary" type="button">Generate synthetic (X, F) →</button></div></div>
  <label for="h7-raw-input">Raw bivariate observations (one <code>X, F</code> pair per line · comma, semicolon, or tab separated)</label>
  <textarea id="h7-raw-input" rows="8" spellcheck="false">${ui.esc(state.rawText)}</textarea>
  <label class="h7-checkbox"><input id="h7-has-header" type="checkbox" ${state.hasHeader ? 'checked' : ''}> First line is a column header (e.g. <code>Attack_Vector, Outcome</code>)</label>
  <div class="checksum-actions"><button id="h7-run-custom" class="button" type="submit">Construct table &amp; compute χ²</button><button id="h7-swap-axes" class="secondary" type="button">Swap variables (X ↔ F)</button></div>
  </details>
  <p id="h7-status" class="small" role="status" aria-live="polite"></p></form>
  <div id="h7-metrics" aria-live="polite"></div></section>

  <section id="hw7-frequencies" class="content-section">${sectionHead(
    '03 / CONTINGENCY TABLE, MARGINALS & CONDITIONALS',
    'Programmatic cross-tabulation and relative frequency distributions',
    'Compare observed joint counts Oᵢⱼ against independence expectations Eᵢⱼ, and inspect how row conditional distributions P(F | X) and column conditional distributions P(X | F) relate to the marginal distributions.',
  )}
  <div id="h7-tables"></div></section>

  <section id="hw7-test" class="content-section">${sectionHead(
    '04 / CHI-SQUARE TEST, RESIDUALS & INTERPRETATION',
    'Evaluating statistical independence versus dependence',
    'Compare the computed χ² statistic against the theoretical χ²(df) reference distribution, inspect standardized Pearson residuals rᵢⱼ, and verify Cochran’s expected-frequency adequacy rules.',
  )}
  <div id="h7-test-results"></div>
  <div class="checksum-actions"><button id="h7-export-contingency" class="secondary" type="button">Export contingency &amp; cell diagnostics ↓ CSV</button><button id="h7-export-raw" class="secondary" type="button">Export raw (X, F) observations ↓ CSV</button></div></section>

  <section id="hw7-causality" class="content-section">${sectionHead(
    '05 / CONCLUSIONS & CRITICAL DISCUSSION',
    'Distinguishing statistical association from causality',
    'Rejecting the null hypothesis of independence establishes that X and F co-vary in the observed joint distribution, but never suffices on its own to prove a causal mechanism X → F.',
  )}
  <div class="two-col prose"><div><h3>1. Why statistical dependence does not imply causation</h3><p>Pearson’s χ² statistic and Cramér’s V are algebraically symmetric with respect to rows and columns: swapping X and F transposes the contingency table Oᵢⱼ and Eᵢⱼ without altering χ², df, the p-value, or V (you can verify this directly with the <strong>Swap variables (X ↔ F)</strong> button above). Because the joint distribution P(X, F) contains no directional arrow, a statistically significant rejection of H₀ is equally compatible with four fundamentally distinct data-generating structures:</p><p>1. <strong>Direct causation (X → F):</strong> intervening on X physically alters the probability distribution of F;<br>2. <strong>Reverse causation (F → X):</strong> the outcome F triggers the classification X (for instance, severe incidents prompting deeper forensic logging);<br>3. <strong>Common-cause confounding (X ← Z → F):</strong> an unobserved third variable Z simultaneously influences both X and F (Reichenbach’s Common Cause Principle);<br>4. <strong>Collider / selection bias (X → S ← F):</strong> conditioning on a common effect S (such as analyzing only escalated tickets) induces a spurious correlation between two genuinely independent factors (Berkson’s paradox).</p></div>
  <div><h3>2. Observational conditioning P(F | X) versus intervention P(F | do(X))</h3><p>In causal inference (Pearl, 2009), the conditional probability <strong>P(F = fⱼ | X = xᵢ)</strong> measured in a contingency table describes passive observation: what distribution of F do we see among units that happen to exhibit X = xᵢ? By contrast, a causal claim asserts what would happen under an external intervention <strong>P(F = fⱼ | do(X = xᵢ))</strong> that sets X to xᵢ while holding all background factors fixed.</p><p>Moreover, with large sample sizes N, even trivial background imbalances produce large χ² values because <strong>χ² = N · min(R − 1, C − 1) · V²</strong> grows linearly with N. Conversely, when N is small, failing to reject H₀ means only that the sample lacks statistical power to rule out independence—not that X and F are proven to have zero causal or statistical relationship.</p></div></div>

  <article class="panel h7-gap"><h3>3. Empirical proof by stratification: confounding in the 480-server audit (X ← Z → F)</h3><p>To see concretely how a lurking variable Z fabricates strong statistical dependence without any causal effect, inspect the stratified breakdown of our <strong>Confounded Audit</strong> preset below. Here X denotes the monitoring agent version (<code>Agent v1</code> vs <code>Agent v2</code>), F denotes whether a security breach occurred (<code>Breach</code> vs <code>No Breach</code>), and Z denotes the server’s network exposure tier (<code>Public-facing</code> vs <code>Internal-only</code>):</p>
  ${table(
    [
      'Dataset / Stratum',
      'Sample size N',
      'Agent v1 breach rate',
      'Agent v2 breach rate',
      'Mandatory χ² (df = 1)',
      'Optional p-value',
      'Cramér’s V',
      'Statistical conclusion',
    ],
    [
      [
        '<strong>Pooled marginal table (X, F)</strong> (ignoring Z)',
        conf.pooled.table.N,
        `${conf.pooled.table.observed[0][0]} / ${conf.pooled.table.rowTotals[0]} (${fmtPct(conf.pooled.table.condFGivenX[0][0], 1)})`,
        `${conf.pooled.table.observed[1][0]} / ${conf.pooled.table.rowTotals[1]} (${fmtPct(conf.pooled.table.condFGivenX[1][0], 1)})`,
        `<strong>${fmtFixed(conf.pooled.test.chiSquare, 4)}</strong>`,
        fmt(conf.pooled.test.pValue, 5),
        fmtFixed(conf.pooled.test.cramersV, 4),
        'Reject H₀ (p &lt; 0.001 · strong marginal association)',
      ],
      [
        '<strong>Stratum Z = Public-facing</strong> (X, F | Z = Public)',
        conf.publicStratum.table.N,
        `${conf.publicStratum.table.observed[0][0]} / ${conf.publicStratum.table.rowTotals[0]} (${fmtPct(conf.publicStratum.table.condFGivenX[0][0], 1)})`,
        `${conf.publicStratum.table.observed[1][0]} / ${conf.publicStratum.table.rowTotals[1]} (${fmtPct(conf.publicStratum.table.condFGivenX[1][0], 1)})`,
        `<strong>${fmtFixed(conf.publicStratum.test.chiSquare, 4)}</strong>`,
        fmtFixed(conf.publicStratum.test.pValue, 4),
        fmtFixed(conf.publicStratum.test.cramersV, 4),
        'Exact conditional independence (P(F | X, Z) = 40.0%)',
      ],
      [
        '<strong>Stratum Z = Internal-only</strong> (X, F | Z = Internal)',
        conf.internalStratum.table.N,
        `${conf.internalStratum.table.observed[0][0]} / ${conf.internalStratum.table.rowTotals[0]} (${fmtPct(conf.internalStratum.table.condFGivenX[0][0], 1)})`,
        `${conf.internalStratum.table.observed[1][0]} / ${conf.internalStratum.table.rowTotals[1]} (${fmtPct(conf.internalStratum.table.condFGivenX[1][0], 1)})`,
        `<strong>${fmtFixed(conf.internalStratum.test.chiSquare, 4)}</strong>`,
        fmtFixed(conf.internalStratum.test.pValue, 4),
        fmtFixed(conf.internalStratum.test.cramersV, 4),
        'Exact conditional independence (P(F | X, Z) = 10.0%)',
      ],
    ],
  )}
  <p class="interpretation">Within public-facing servers, both agents experience an identical 40.0% breach rate (χ² = 0). Within internal servers, both agents experience an identical 10.0% breach rate (χ² = 0). Thus X and F are conditionally independent given Z (<strong>X ⊥ F | Z</strong>), and upgrading Agent v1 to Agent v2 without changing network exposure has zero causal effect on breaches. The pooled χ² = 14.4 arises solely because 75% of public-facing servers (180 / 240) still run legacy Agent v1, whereas 75% of internal servers (180 / 240) run Agent v2.</p></article>

  ${note(
    'Summary of methodological rules',
    '1. Always verify how marginal totals Rᵢ and Cⱼ constrain expected frequencies Eᵢⱼ = Rᵢ Cⱼ / N. 2. Check Cochran’s rule (at least 80% of cells with Eᵢⱼ ≥ 5 and all Eᵢⱼ ≥ 1) before relying on asymptotic χ² p-values. 3. Pair χ² significance with Cramér’s V and cell residuals rᵢⱼ to separate sample-size effects from substantive association. 4. Never infer a causal mechanism X → F from a contingency table without controlling for confounding variables or randomized assignment.',
  )}
  <div class="chapter-footer-actions"><a class="button next-chapter" href="#hw8">Continue to Homework 8</a><a class="text-link" href="#hw6">← Back to Homework 6</a></div></section></main>`;
}

function draw() {
  if (!active) return;
  const { table: tbl, test } = ensureAnalysis();
  const { R, C, N, xName, fName, xLabels, fLabels, observed, rowTotals, colTotals, jointFreq, rowMarginals, colMarginals, condFGivenX, condXGivenF } = tbl;
  const { expected, expectedFreq, chiSquare, df, pValue, criticalValue, cramersV, phi, yatesChiSquare, alpha, rejectH0, degenerate, cochranValid, allAtLeast5, cellsBelow5, cellsBelow1, minExpected, totalCells, cellDetails } = test;

  $('#h7-dataset-summary').textContent = state.summaryText;

  $('#h7-metrics').innerHTML = `<div class="metric-grid"><div><span>SAMPLE SIZE &amp; TABLE DIMENSIONS</span><b>${N.toLocaleString('en')}<small>${R} × ${C}</small></b><small>df = (R − 1)(C − 1) = ${df}</small></div><div><span>MANDATORY CHI-SQUARE χ²</span><b>${fmtFixed(chiSquare, 4)}</b><small>${degenerate ? 'Degenerate table (df = 0)' : `Critical χ²_${alpha} = ${fmtFixed(criticalValue, 4)}`}</small></div><div><span>OPTIONAL UPPER-TAIL P-VALUE</span><b>${degenerate ? '—' : fmt(pValue, 5)}</b><small>${degenerate ? 'Requires R ≥ 2 and C ≥ 2' : `Q(${df}/2, ${fmtFixed(chiSquare / 2, 3)}) at α = ${alpha}`}</small></div><div><span>INDEPENDENCE DECISION &amp; EFFECT</span><b>${degenerate ? 'Undefined' : rejectH0 ? 'Dependent' : 'Independent'}<small>${cramersV !== null ? `V = ${fmtFixed(cramersV, 3)}` : ''}</small></b><small>${degenerate ? 'Add categories to test H₀' : rejectH0 ? `Reject H₀ (χ² ≥ ${fmtFixed(criticalValue, 2)}, p < ${alpha})` : `Fail to reject H₀ (χ² < ${fmtFixed(criticalValue, 2)}, p ≥ ${alpha})`}</small></div></div>`;

  // 1. Observed counts O_ij + Expected E_ij + Marginals
  const obsExpHead = [
    `${ui.esc(xName)} \\ ${ui.esc(fName)}`,
    ...fLabels.map((f) => `${ui.esc(f)}<br><small>Oᵢⱼ (expected Eᵢⱼ)</small>`),
    'Row marginal Rᵢ (fᵢ·)',
  ];
  const obsExpRows = xLabels.map((xLab, i) => [
    `<strong>${ui.esc(xLab)}</strong>`,
    ...fLabels.map((_, j) => `<strong>${observed[i][j]}</strong> <span class="muted">(${fmtFixed(expected[i][j], 2)})</span>`),
    `<strong>${rowTotals[i]}</strong> <span class="muted">(${fmtPct(rowMarginals[i], 1)})</span>`,
  ]);
  const obsExpFoot = [
    'Column marginal Cⱼ (f·ⱼ)',
    ...colTotals.map((c, j) => `${c} (${fmtPct(colMarginals[j], 1)})`),
    `N = ${N} (100.0%)`,
  ];

  // 2. Joint relative frequencies f_ij = O_ij / N vs independence product f_i. * f_.j
  const jointHead = [
    `${ui.esc(xName)} \\ ${ui.esc(fName)}`,
    ...fLabels.map((f) => `${ui.esc(f)}<br><small>fᵢⱼ = Oᵢⱼ/N (indep. fᵢ·f·ⱼ)</small>`),
    'Marginal fᵢ· = Rᵢ/N',
  ];
  const jointRows = xLabels.map((xLab, i) => [
    `<strong>${ui.esc(xLab)}</strong>`,
    ...fLabels.map((_, j) => `${fmtFixed(jointFreq[i][j], 4)} <span class="muted">(${fmtFixed(expectedFreq[i][j], 4)})</span>`),
    fmtFixed(rowMarginals[i], 4),
  ]);
  const jointFoot = [
    'Marginal f·ⱼ = Cⱼ/N',
    ...colMarginals.map((m) => fmtFixed(m, 4)),
    '1.0000',
  ];

  // 3. Row conditional frequencies P(F = f_j | X = x_i) = O_ij / R_i
  const rowCondHead = [
    `Given ${ui.esc(xName)} (row i)`,
    ...fLabels.map((f) => `P(${ui.esc(f)} | X = xᵢ)`),
    'Row sum',
  ];
  const rowCondRows = xLabels.map((xLab, i) => [
    `<strong>${ui.esc(xLab)}</strong> <span class="muted">(Rᵢ = ${rowTotals[i]})</span>`,
    ...fLabels.map((_, j) => `${fmtFixed(condFGivenX[i][j], 4)} <span class="muted">(${fmtPct(condFGivenX[i][j], 1)})</span>`),
    '1.0000 (100%)',
  ]);
  const rowCondFoot = [
    'Marginal P(F = fⱼ) = Cⱼ / N',
    ...colMarginals.map((m) => `${fmtFixed(m, 4)} (${fmtPct(m, 1)})`),
    '1.0000 (100%)',
  ];

  // 4. Column conditional frequencies P(X = x_i | F = f_j) = O_ij / C_j
  const colCondHead = [
    `${ui.esc(xName)} \\ Given ${ui.esc(fName)}`,
    ...fLabels.map((f, j) => `P(X = xᵢ | ${ui.esc(f)})<br><small>Cⱼ = ${colTotals[j]}</small>`),
    'Marginal P(X = xᵢ) = Rᵢ / N',
  ];
  const colCondRows = xLabels.map((xLab, i) => [
    `<strong>${ui.esc(xLab)}</strong>`,
    ...fLabels.map((_, j) => `${fmtFixed(condXGivenF[i][j], 4)} <span class="muted">(${fmtPct(condXGivenF[i][j], 1)})</span>`),
    `<strong>${fmtFixed(rowMarginals[i], 4)}</strong> <span class="muted">(${fmtPct(rowMarginals[i], 1)})</span>`,
  ]);
  const colCondFoot = [
    'Column sum',
    ...fLabels.map(() => '1.0000 (100%)'),
    '1.0000 (100%)',
  ];

  $('#h7-tables').innerHTML = `
    <article class="panel"><h3>1. Contingency table: observed counts Oᵢⱼ, expected counts Eᵢⱼ = (Rᵢ Cⱼ)/N, and marginal totals</h3>
    ${table(obsExpHead, obsExpRows, obsExpFoot)}
    <p class="small">Each interior cell reports the observed count <strong>Oᵢⱼ</strong> followed in parentheses by the expected frequency <strong>Eᵢⱼ = (Rᵢ × Cⱼ) / N</strong> under H₀ (statistical independence). Notice that the expected frequencies preserve every row total Rᵢ, every column total Cⱼ, and the grand total N = ${N}.</p></article>

    <article class="panel h7-gap"><h3>2. Conditional distributions P(F | X = xᵢ) compared against marginal P(F)</h3>
    ${conditionalChart(tbl)}
    <p class="small">Under statistical independence, the conditional probability bars P(F = fⱼ | X = xᵢ) for every row xᵢ would align with the dashed horizontal marginal reference P(F = fⱼ) = Cⱼ / N (up to random sampling variation). Systematic vertical departures from the dashed reference lines indicate dependence between ${ui.esc(xName)} and ${ui.esc(fName)}.</p>
    <div class="two-col h7-gap"><div><h4>Row conditional frequencies f(F = fⱼ | X = xᵢ) = Oᵢⱼ / Rᵢ</h4>${table(rowCondHead, rowCondRows, rowCondFoot)}</div>
    <div><h4>Column conditional frequencies f(X = xᵢ | F = fⱼ) = Oᵢⱼ / Cⱼ</h4>${table(colCondHead, colCondRows, colCondFoot)}</div></div></article>

    <details><summary>Inspect joint relative frequencies fᵢⱼ = Oᵢⱼ / N versus independence product fᵢ· f·ⱼ</summary>
    ${table(jointHead, jointRows, jointFoot)}
    <p class="small">Dividing Oᵢⱼ and Eᵢⱼ by N = ${N} expresses the contingency table on the probability scale, comparing empirical joint proportions fᵢⱼ against the product of marginal proportions (Rᵢ / N)(Cⱼ / N).</p></details>
  `;

  const topCell = cellDetails[0];
  const cochranText = allAtLeast5
    ? `All ${totalCells} cells satisfy Eᵢⱼ ≥ 5 (minimum expected frequency = ${fmtFixed(minExpected, 2)}). Cochran’s adequacy condition holds, so the asymptotic χ²(df = ${df}) reference distribution is well-calibrated.`
    : cochranValid
      ? `${cellsBelow5} of ${totalCells} cells (${fmtPct(cellsBelow5 / totalCells, 1)}) have Eᵢⱼ &lt; 5, with minimum Eᵢⱼ = ${fmtFixed(minExpected, 2)} ≥ 1. Cochran’s relaxed rule (≤ 20% of cells below 5 and none below 1) is satisfied.`
      : `Warning: ${cellsBelow5} of ${totalCells} cells (${fmtPct(cellsBelow5 / totalCells, 1)}) have expected frequency Eᵢⱼ &lt; 5 (${cellsBelow1} cells below 1; minimum Eᵢⱼ = ${fmtFixed(minExpected, 2)}). Cochran’s rule is violated, so the asymptotic χ²(${df}) tail approximation and p-value should be interpreted with caution (consider pooling sparse categories or using Fisher’s exact test).`;

  $('#h7-test-results').innerHTML = `
    <div class="two-col"><article class="panel"><h3>1. Asymptotic χ²(df = ${df}) distribution and critical region</h3>
    ${chiSquareDistributionChart(test)}
    <p class="small">Mandatory statistic: <strong>χ² = ${fmtFixed(chiSquare, 4)}</strong> with <strong>df = (${R} − 1)(${C} − 1) = ${df}</strong>. At significance level α = ${alpha}, the upper-tail critical threshold is <strong>χ²_${alpha} = ${fmtFixed(criticalValue, 4)}</strong> and the optional upper-tail p-value is <strong>p = ${fmt(pValue, 6)}</strong>.</p></article>
    <article class="panel"><h3>2. Standardized Pearson residuals rᵢⱼ = (Oᵢⱼ − Eᵢⱼ) / √Eᵢⱼ</h3>
    ${residualsChart(test)}
    <p class="small">Each squared Pearson residual rᵢⱼ² = (Oᵢⱼ − Eᵢⱼ)² / Eᵢⱼ is that cell’s additive contribution to χ² = Σᵢⱼ rᵢⱼ². Cells with |rᵢⱼ| &gt; 2 depart by more than two standard errors from their independence expectation.</p></article></div>

    <article class="panel h7-gap"><h3>3. Statistical interpretation of the active dataset (${ui.esc(xName)} × ${ui.esc(fName)})</h3>
    ${
      degenerate
        ? `<p>Because this dataset contains only ${R} row category and ${C} column category (df = 0), marginal totals completely determine the cell counts and no test of independence can be performed.</p>`
        : `<p><strong>Hypothesis test decision (α = ${alpha}):</strong> Testing the null hypothesis <strong>H₀: ${ui.esc(xName)} and ${ui.esc(fName)} are statistically independent</strong> against <strong>H₁: ${ui.esc(xName)} and ${ui.esc(fName)} are statistically dependent</strong> yields <strong>χ² = ${fmtFixed(chiSquare, 4)}</strong> on <strong>df = ${df}</strong> degrees of freedom, compared with the critical threshold <strong>χ²_${alpha},${df} = ${fmtFixed(criticalValue, 4)}</strong> (optional p-value = <strong>${fmt(pValue, 6)}</strong>). Because χ² ${rejectH0 ? '≥' : '&lt;'} χ²_${alpha},${df} (equivalently, p ${rejectH0 ? '&lt;' : '≥'} ${alpha}), we <strong>${rejectH0 ? 'reject H₀ and conclude that the two variables are statistically dependent' : 'fail to reject H₀; the observed frequencies are statistically compatible with independence'}</strong> at the ${(alpha * 100).toFixed(1)}% significance level.</p>
        <p><strong>Effect size and largest cell drivers:</strong> Cramér’s normalized association index is <strong>V = ${fmtFixed(cramersV, 4)}</strong>${phi !== null ? ` (identical to the 2 × 2 φ coefficient = ${fmtFixed(phi, 4)}; Yates’ continuity-corrected χ² = ${fmtFixed(yatesChiSquare, 4)})` : ''}. The single largest contribution to χ² comes from cell <strong>(${ui.esc(topCell.xLabel)}, ${ui.esc(topCell.fLabel)})</strong>, where Oᵢⱼ = ${topCell.observed} versus Eᵢⱼ = ${fmtFixed(topCell.expected, 2)} (signed deviation ${topCell.deviation >= 0 ? '+' : ''}${fmtFixed(topCell.deviation, 2)}, Pearson residual rᵢⱼ = ${topCell.residual >= 0 ? '+' : ''}${fmtFixed(topCell.residual, 3)}, contributing ${fmtFixed(topCell.contribution, 4)} or ${chiSquare > 0 ? fmtPct(topCell.contribution / chiSquare, 1) : '0.0%'} of total χ²).</p>`
    }
    <p class="${cochranValid ? 'small' : 'interpretation'}"><strong>Validity of the asymptotic χ² approximation (Cochran’s check):</strong> ${cochranText}</p></article>

    <details><summary>Complete cell-by-cell diagnostic table (Oᵢⱼ, Eᵢⱼ, Oᵢⱼ − Eᵢⱼ, Pearson residual rᵢⱼ, and χ² contribution)</summary>
    ${table(
      [
        'Cell (X, F)',
        'Observed Oᵢⱼ',
        'Expected Eᵢⱼ',
        'Deviation Oᵢⱼ − Eᵢⱼ',
        'Pearson residual rᵢⱼ',
        'Contribution (Oᵢⱼ − Eᵢⱼ)² / Eᵢⱼ',
        'Share of χ²',
      ],
      cellDetails.map((c) => [
        `<strong>(${ui.esc(c.xLabel)}, ${ui.esc(c.fLabel)})</strong>`,
        c.observed,
        fmtFixed(c.expected, 3),
        `${c.deviation >= 0 ? '+' : ''}${fmtFixed(c.deviation, 3)}`,
        `${c.residual >= 0 ? '+' : ''}${fmtFixed(c.residual, 4)}`,
        fmtFixed(c.contribution, 4),
        chiSquare > 0 ? fmtPct(c.contribution / chiSquare, 1) : '0.0%',
      ]),
      [
        `Total (${totalCells} cells)`,
        N,
        fmtFixed(N, 3),
        '0.000',
        '—',
        fmtFixed(chiSquare, 4),
        '100.0%',
      ],
    )}</details>
  `;
}

function setStatus(message, isError = false) {
  const el = $('#h7-status');
  if (!el) return;
  el.textContent = message;
  el.classList.toggle('error-text', isError);
}

function loadPreset(id) {
  if (id === 'custom') {
    state.presetId = 'custom';
    return;
  }
  const preset = getPresetDataset(id);
  state.presetId = preset.id;
  state.hasHeader = false;
  state.xName = preset.xName;
  state.fName = preset.fName;
  state.xOrder = preset.xOrder;
  state.fOrder = preset.fOrder;
  state.summaryText = preset.summary;
  state.rawText = preset.pairs.map(([x, f]) => `${x}, ${f}`).join('\n');
  state.analysis = analyzeBivariateDataset(preset.pairs, {
    alpha: state.alpha,
    xOrder: state.xOrder,
    fOrder: state.fOrder,
    xName: state.xName,
    fName: state.fName,
  });
  if ($('#h7-raw-input')) $('#h7-raw-input').value = state.rawText;
  if ($('#h7-has-header')) $('#h7-has-header').checked = false;
  draw();
  setStatus(`Loaded preset "${preset.label}" (${preset.pairs.length} bivariate observations).`);
}

function exportContingencyCSV() {
  const { table: tbl, test } = ensureAnalysis();
  const rows = [
    [
      'protocol',
      'preset_id',
      'N',
      'R',
      'C',
      'df',
      'alpha',
      'row_index',
      'col_index',
      'x_category',
      'f_category',
      'observed_Oij',
      'expected_Eij',
      'deviation_O_minus_E',
      'joint_freq_Oij_over_N',
      'expected_joint_freq',
      'row_total_Ri',
      'row_marginal_freq',
      'col_total_Cj',
      'col_marginal_freq',
      'cond_F_given_X',
      'cond_X_given_F',
      'pearson_residual',
      'chi2_contribution',
      'total_chi2',
      'optional_p_value',
      'critical_value',
      'cramers_v',
      'reject_H0',
    ],
  ];
  for (let i = 0; i < tbl.R; i++) {
    for (let j = 0; j < tbl.C; j++) {
      rows.push([
        PROTOCOL_VERSION,
        state.presetId,
        tbl.N,
        tbl.R,
        tbl.C,
        test.df,
        test.alpha,
        i + 1,
        j + 1,
        tbl.xLabels[i],
        tbl.fLabels[j],
        tbl.observed[i][j],
        test.expected[i][j],
        test.deviations[i][j],
        tbl.jointFreq[i][j],
        test.expectedFreq[i][j],
        tbl.rowTotals[i],
        tbl.rowMarginals[i],
        tbl.colTotals[j],
        tbl.colMarginals[j],
        tbl.condFGivenX[i][j],
        tbl.condXGivenF[i][j],
        test.residuals[i][j],
        test.contributions[i][j],
        test.chiSquare,
        test.pValue,
        test.criticalValue,
        test.cramersV,
        test.rejectH0,
      ]);
    }
  }
  ui.download('homework7-contingency-table.csv', rows);
}

function exportRawCSV() {
  const { pairs, table: tbl } = ensureAnalysis();
  ui.download('homework7-raw-dataset.csv', [
    ['protocol', 'observation_id', tbl.xName, tbl.fName],
    ...pairs.map(([x, f], idx) => [PROTOCOL_VERSION, idx + 1, x, f]),
  ]);
}

export function bindHomework7() {
  active = true;
  ensureAnalysis();
  draw();
  setStatus(`Ready · ${state.analysis.table.N} observations cross-classified into a ${state.analysis.table.R} × ${state.analysis.table.C} contingency table.`);

  $('#h7-preset').onchange = (e) => {
    loadPreset(e.target.value);
  };

  $('#h7-alpha').onchange = (e) => {
    state.alpha = Number(e.target.value);
    const { pairs, table: tbl } = ensureAnalysis();
    state.analysis = analyzeBivariateDataset(pairs, {
      alpha: state.alpha,
      xOrder: tbl.xLabels,
      fOrder: tbl.fLabels,
      xName: tbl.xName,
      fName: tbl.fName,
    });
    draw();
    setStatus(`Updated significance threshold to α = ${state.alpha}.`);
  };

  $('#h7-synth-btn').onclick = () => {
    try {
      const n = Number($('#h7-synth-n').value);
      const dims = $('#h7-synth-dims').value;
      const [rows, cols] = dims.split('x').map(Number);
      const strength = Number($('#h7-synth-strength').value);
      const seed = Number($('#h7-synth-seed').value);
      if (!Number.isInteger(seed) || seed < 1) throw new Error('Enter a positive integer seed.');
      const gen = generateBivariateDataset({ seed, n, rows, cols, strength });
      state.synth = { n, dims, strength, seed };
      state.presetId = 'custom';
      state.hasHeader = false;
      state.xName = 'Synthetic X';
      state.fName = 'Synthetic F';
      state.xOrder = gen.xLabels;
      state.fOrder = gen.fLabels;
      state.rawText = gen.pairs.map(([x, f]) => `${x}, ${f}`).join('\n');
      state.summaryText = `Synthetic dataset (${n} observations, ${rows} × ${cols} table, seed ${seed}, dependence strength s = ${strength.toFixed(2)}).`;
      $('#h7-preset').value = 'custom';
      $('#h7-raw-input').value = state.rawText;
      $('#h7-has-header').checked = false;
      state.analysis = analyzeBivariateDataset(gen.pairs, {
        alpha: state.alpha,
        xOrder: gen.xLabels,
        fOrder: gen.fLabels,
        xName: state.xName,
        fName: state.fName,
      });
      draw();
      setStatus(`Generated ${n} synthetic (X, F) pairs with dependence strength s = ${strength.toFixed(2)} (seed ${seed}).`);
    } catch (err) {
      setStatus(err.message, true);
    }
  };

  $('#h7-preset-form').onsubmit = (e) => {
    e.preventDefault();
    try {
      const text = $('#h7-raw-input').value;
      const hasHeader = $('#h7-has-header').checked;
      const parsed = parseBivariateData(text, { hasHeader });
      state.rawText = text;
      state.hasHeader = hasHeader;
      state.presetId = 'custom';
      $('#h7-preset').value = 'custom';
      state.xName = hasHeader ? parsed.xName : 'Variable X';
      state.fName = hasHeader ? parsed.fName : 'Variable F';
      state.xOrder = null;
      state.fOrder = null;
      state.summaryText = `Custom bivariate dataset (${parsed.pairs.length} observations parsed from raw input).`;
      state.analysis = analyzeBivariateDataset(parsed.pairs, {
        alpha: state.alpha,
        xName: state.xName,
        fName: state.fName,
      });
      draw();
      setStatus(`Constructed ${state.analysis.table.R} × ${state.analysis.table.C} contingency table from ${parsed.pairs.length} raw (X, F) pairs.`);
    } catch (err) {
      setStatus(err.message, true);
    }
  };

  $('#h7-swap-axes').onclick = () => {
    try {
      const current = ensureAnalysis();
      const swappedPairs = current.pairs.map(([x, f]) => [f, x]);
      const prevXName = current.table.xName;
      const prevFName = current.table.fName;
      const prevXOrder = current.table.xLabels;
      const prevFOrder = current.table.fLabels;
      state.xName = prevFName;
      state.fName = prevXName;
      state.xOrder = prevFOrder;
      state.fOrder = prevXOrder;
      state.rawText = swappedPairs.map(([x, f]) => `${x}, ${f}`).join('\n');
      $('#h7-raw-input').value = state.rawText;
      $('#h7-has-header').checked = false;
      state.hasHeader = false;
      state.analysis = analyzeBivariateDataset(swappedPairs, {
        alpha: state.alpha,
        xOrder: state.xOrder,
        fOrder: state.fOrder,
        xName: state.xName,
        fName: state.fName,
      });
      draw();
      setStatus(`Swapped X ↔ F (${state.analysis.table.R} × ${state.analysis.table.C} table). Notice that χ², df, p-value, and Cramér’s V remain invariant.`);
    } catch (err) {
      setStatus(err.message, true);
    }
  };

  $('#h7-export-contingency').onclick = exportContingencyCSV;
  $('#h7-export-raw').onclick = exportRawCSV;
}

export function disposeHomework7() {
  active = false;
}
