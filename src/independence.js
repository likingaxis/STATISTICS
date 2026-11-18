/**
 * Statistical independence, contingency tables, and Pearson's chi-square test.
 * Pure mathematical and data-processing module with zero DOM dependencies.
 */

export const PROTOCOL_VERSION = 'independence-v1';

/**
 * Reproducible 32-bit PRNG (Mulberry32) used solely for teaching simulations
 * and deterministic shuffling of preset observation logs.
 */
export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Natural Lanczos approximation for ln(Gamma(z)), z > 0.
 * Coefficients by Paul Godfrey (g = 7, 9 terms), accurate to ~15 digits.
 */
const LANCZOS_COEFFS = [
  0.99999999999980993,
  676.5203681218851,
  -1259.1392167224028,
  771.32342877765313,
  -176.61502916214059,
  12.507343278686905,
  -0.13857109526572012,
  9.9843695780195716e-6,
  1.5056327351493116e-7,
];

export function logGamma(z) {
  if (!Number.isFinite(z) || z <= 0) {
    throw new RangeError('logGamma requires a finite positive argument.');
  }
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  const shifted = z - 1;
  let sum = LANCZOS_COEFFS[0];
  for (let i = 1; i < LANCZOS_COEFFS.length; i++) {
    sum += LANCZOS_COEFFS[i] / (shifted + i);
  }
  const t = shifted + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(sum);
}

const GAMMA_EPS = 1e-15;
const GAMMA_TINY = 1e-300;
const GAMMA_MAX_ITER = 600;

function gammaSeriesP(a, x) {
  let ap = a;
  let sum = 1 / a;
  let del = sum;
  for (let n = 1; n <= GAMMA_MAX_ITER; n++) {
    ap += 1;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) <= Math.abs(sum) * GAMMA_EPS) {
      const logPrefactor = -x + a * Math.log(x) - logGamma(a);
      if (logPrefactor < -745) return 0;
      return Math.min(1, Math.max(0, sum * Math.exp(logPrefactor)));
    }
  }
  throw new Error('Gamma series failed to converge.');
}

function gammaContinuedFractionQ(a, x) {
  let b = x + 1 - a;
  let c = 1 / GAMMA_TINY;
  let d = 1 / (Math.abs(b) < GAMMA_TINY ? GAMMA_TINY : b);
  let h = d;
  for (let i = 1; i <= GAMMA_MAX_ITER; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < GAMMA_TINY) d = GAMMA_TINY;
    c = b + an / c;
    if (Math.abs(c) < GAMMA_TINY) c = GAMMA_TINY;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) <= GAMMA_EPS) {
      const logPrefactor = -x + a * Math.log(x) - logGamma(a);
      if (logPrefactor < -745) return 0;
      return Math.min(1, Math.max(0, Math.exp(logPrefactor) * h));
    }
  }
  throw new Error('Gamma continued fraction failed to converge.');
}

/**
 * Regularized lower incomplete gamma function P(a, x) = gamma(a, x) / Gamma(a).
 */
export function regularizedGammaP(a, x) {
  if (!Number.isFinite(a) || a <= 0) throw new RangeError('Shape parameter a must be > 0.');
  if (!Number.isFinite(x) || x < 0) throw new RangeError('Argument x must be >= 0.');
  if (x === 0) return 0;
  if (x < a + 1) return gammaSeriesP(a, x);
  return Math.min(1, Math.max(0, 1 - gammaContinuedFractionQ(a, x)));
}

/**
 * Regularized upper incomplete gamma function Q(a, x) = Gamma(a, x) / Gamma(a) = 1 - P(a, x).
 */
export function regularizedGammaQ(a, x) {
  if (!Number.isFinite(a) || a <= 0) throw new RangeError('Shape parameter a must be > 0.');
  if (!Number.isFinite(x) || x < 0) throw new RangeError('Argument x must be >= 0.');
  if (x === 0) return 1;
  if (x < a + 1) return Math.min(1, Math.max(0, 1 - gammaSeriesP(a, x)));
  return gammaContinuedFractionQ(a, x);
}

/**
 * Cumulative distribution function P(Chi^2_df <= x).
 */
export function chiSquareCDF(x, df) {
  if (!Number.isInteger(df) || df < 1) throw new RangeError('Degrees of freedom must be an integer >= 1.');
  if (!Number.isFinite(x)) throw new RangeError('x must be finite.');
  if (x <= 0) return 0;
  return regularizedGammaP(df / 2, x / 2);
}

/**
 * Upper-tail p-value P(Chi^2_df >= x) = Q(df / 2, x / 2).
 */
export function chiSquarePValue(x, df) {
  if (!Number.isInteger(df) || df < 1) throw new RangeError('Degrees of freedom must be an integer >= 1.');
  if (!Number.isFinite(x)) throw new RangeError('x must be finite.');
  if (x <= 0) return 1;
  return regularizedGammaQ(df / 2, x / 2);
}

/**
 * Probability density function of Chi^2_df at x >= 0.
 */
export function chiSquarePDF(x, df) {
  if (!Number.isInteger(df) || df < 1) throw new RangeError('Degrees of freedom must be an integer >= 1.');
  if (!Number.isFinite(x) || x < 0) return 0;
  if (x === 0) {
    if (df === 1) return Infinity;
    if (df === 2) return 0.5;
    return 0;
  }
  const k = df / 2;
  const logPdf = (k - 1) * Math.log(x) - x / 2 - k * Math.LN2 - logGamma(k);
  return logPdf < -745 ? 0 : Math.exp(logPdf);
}

/**
 * Upper-tail critical value c such that P(Chi^2_df >= c) = alpha.
 */
export function chiSquareCritical(alpha, df) {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new RangeError('Significance level alpha must lie in (0, 1).');
  }
  if (!Number.isInteger(df) || df < 1) {
    throw new RangeError('Degrees of freedom must be an integer >= 1.');
  }
  let lo = 0;
  let hi = Math.max(1, df + 10 * Math.sqrt(2 * df));
  while (chiSquarePValue(hi, df) > alpha) {
    hi *= 2;
    if (hi > 1e9) break;
  }
  for (let i = 0; i < 90; i++) {
    const mid = 0.5 * (lo + hi);
    if (chiSquarePValue(mid, df) > alpha) lo = mid;
    else hi = mid;
  }
  return 0.5 * (lo + hi);
}

function splitRow(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  for (const sep of ['\t', ';', ',']) {
    if (trimmed.includes(sep)) {
      const parts = trimmed.split(sep).map((s) => s.trim().replace(/^"(.*)"$/, '$1').trim());
      return parts;
    }
  }
  return trimmed.split(/\s+/);
}

/**
 * Parses raw bivariate (X, F) observations from delimited text.
 * Supports comma, semicolon, tab, or single-pair whitespace separation.
 */
export function parseBivariateData(text, { hasHeader = false, maxRows = 10000 } = {}) {
  if (typeof text !== 'string') throw new TypeError('Dataset input must be text.');
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  if (!rawLines.length) {
    throw new Error('Enter at least one (X, F) observation pair.');
  }

  let xName = 'X';
  let fName = 'F';
  let start = 0;
  if (hasHeader) {
    const headerParts = splitRow(rawLines[0]);
    if (!headerParts || headerParts.length !== 2 || !headerParts[0] || !headerParts[1]) {
      throw new Error('Header row must contain exactly two non-empty variable names.');
    }
    xName = headerParts[0];
    fName = headerParts[1];
    start = 1;
  }

  const pairs = [];
  for (let i = start; i < rawLines.length; i++) {
    const parts = splitRow(rawLines[i]);
    if (!parts || parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error(`Line ${i + 1} must contain exactly two non-empty values (X and F).`);
    }
    pairs.push([parts[0], parts[1]]);
    if (pairs.length > maxRows) {
      throw new Error(`Dataset exceeds the maximum limit of ${maxRows.toLocaleString('en')} rows.`);
    }
  }

  if (!pairs.length) {
    throw new Error('No observation rows found after the header.');
  }
  return { pairs, xName, fName };
}

const naturalCompare = (a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });

function resolveOrder(observedSet, preferredOrder) {
  const ordered = [];
  const seen = new Set();
  if (Array.isArray(preferredOrder)) {
    for (const label of preferredOrder) {
      if (observedSet.has(label) && !seen.has(label)) {
        ordered.push(label);
        seen.add(label);
      }
    }
  }
  const remaining = [...observedSet].filter((label) => !seen.has(label)).sort(naturalCompare);
  return [...ordered, ...remaining];
}

/**
 * Programmatically constructs the R x C contingency table, marginal frequencies,
 * joint relative frequencies, and conditional distributions P(F|X) and P(X|F)
 * from any array of bivariate pairs [x, f].
 */
export function buildContingencyTable(pairs, { xOrder = null, fOrder = null, xName = 'X', fName = 'F' } = {}) {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    throw new Error('At least one bivariate observation (x, f) is required.');
  }

  const xSet = new Set();
  const fSet = new Set();
  const cleaned = [];
  for (let i = 0; i < pairs.length; i++) {
    const item = pairs[i];
    if (!Array.isArray(item) || item.length !== 2) {
      throw new Error(`Observation at index ${i} must be a [x, f] pair.`);
    }
    const x = String(item[0]).trim();
    const f = String(item[1]).trim();
    if (!x || !f) {
      throw new Error(`Observation at index ${i} has an empty category label.`);
    }
    xSet.add(x);
    fSet.add(f);
    cleaned.push([x, f]);
  }

  const xLabels = resolveOrder(xSet, xOrder);
  const fLabels = resolveOrder(fSet, fOrder);
  const R = xLabels.length;
  const C = fLabels.length;
  const xIndex = new Map(xLabels.map((label, i) => [label, i]));
  const fIndex = new Map(fLabels.map((label, j) => [label, j]));

  const observed = Array.from({ length: R }, () => Array(C).fill(0));
  const rowTotals = Array(R).fill(0);
  const colTotals = Array(C).fill(0);
  const N = cleaned.length;

  for (const [x, f] of cleaned) {
    const i = xIndex.get(x);
    const j = fIndex.get(f);
    observed[i][j] += 1;
    rowTotals[i] += 1;
    colTotals[j] += 1;
  }

  const jointFreq = observed.map((row) => row.map((o) => o / N));
  const rowMarginals = rowTotals.map((r) => r / N);
  const colMarginals = colTotals.map((c) => c / N);
  const condFGivenX = observed.map((row, i) => row.map((o) => o / rowTotals[i]));
  const condXGivenF = observed.map((row) => row.map((o, j) => o / colTotals[j]));

  return {
    xName,
    fName,
    xLabels,
    fLabels,
    R,
    C,
    N,
    observed,
    rowTotals,
    colTotals,
    jointFreq,
    rowMarginals,
    colMarginals,
    condFGivenX,
    condXGivenF,
  };
}

/**
 * Computes expected counts E_ij = (R_i * C_j) / N under H0: X and F are independent,
 * together with expected relative frequencies and raw signed deviations O_ij - E_ij.
 */
export function expectedFrequencies(table) {
  const { R, C, N, observed, rowTotals, colTotals, rowMarginals, colMarginals } = table;
  const expected = Array.from({ length: R }, (_, i) =>
    Array.from({ length: C }, (_, j) => (rowTotals[i] * colTotals[j]) / N),
  );
  const expectedFreq = Array.from({ length: R }, (_, i) =>
    Array.from({ length: C }, (_, j) => rowMarginals[i] * colMarginals[j]),
  );
  const deviations = Array.from({ length: R }, (_, i) =>
    Array.from({ length: C }, (_, j) => observed[i][j] - expected[i][j]),
  );
  return { expected, expectedFreq, deviations };
}

/**
 * Runs Pearson's Chi-square test of statistical independence on a constructed contingency table.
 * Computes mandatory Chi-square statistic, degrees of freedom, expected frequencies,
 * residuals, Cochran cell-count diagnostics, and optional p-value, critical value, and Cramer's V.
 */
export function chiSquareTest(table, alpha = 0.05) {
  if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
    throw new RangeError('Significance level alpha must lie strictly between 0 and 1.');
  }
  const { R, C, N, observed, xLabels, fLabels } = table;
  const { expected, expectedFreq, deviations } = expectedFrequencies(table);
  const df = (R - 1) * (C - 1);

  const residuals = Array.from({ length: R }, () => Array(C).fill(0));
  const contributions = Array.from({ length: R }, () => Array(C).fill(0));
  let chiSquare = 0;
  let yatesChiSquare = R === 2 && C === 2 ? 0 : null;
  let cellsBelow5 = 0;
  let cellsBelow1 = 0;
  let minExpected = Infinity;
  const cellDetails = [];

  for (let i = 0; i < R; i++) {
    for (let j = 0; j < C; j++) {
      const o = observed[i][j];
      const e = expected[i][j];
      if (e < minExpected) minExpected = e;
      if (e < 5) cellsBelow5 += 1;
      if (e < 1) cellsBelow1 += 1;
      const diff = deviations[i][j];
      const r = e > 0 ? diff / Math.sqrt(e) : 0;
      const c = e > 0 ? (diff * diff) / e : 0;
      residuals[i][j] = r;
      contributions[i][j] = c;
      chiSquare += c;
      if (yatesChiSquare !== null && e > 0) {
        const adj = Math.max(0, Math.abs(diff) - 0.5);
        yatesChiSquare += (adj * adj) / e;
      }
      cellDetails.push({
        row: i,
        col: j,
        xLabel: xLabels[i],
        fLabel: fLabels[j],
        observed: o,
        expected: e,
        deviation: diff,
        residual: r,
        contribution: c,
      });
    }
  }

  cellDetails.sort((a, b) => b.contribution - a.contribution);
  const totalCells = R * C;
  const pctBelow5 = cellsBelow5 / totalCells;
  const cochranValid = cellsBelow1 === 0 && pctBelow5 <= 0.2;
  const allAtLeast5 = cellsBelow5 === 0;

  if (df <= 0) {
    return {
      alpha,
      df,
      degenerate: true,
      chiSquare: 0,
      pValue: null,
      criticalValue: null,
      cramersV: null,
      phi: null,
      yatesChiSquare: null,
      rejectH0: false,
      expected,
      expectedFreq,
      deviations,
      residuals,
      contributions,
      cellDetails,
      minExpected,
      cellsBelow5,
      cellsBelow1,
      totalCells,
      pctBelow5,
      cochranValid,
      allAtLeast5,
    };
  }

  const pValue = chiSquarePValue(chiSquare, df);
  const criticalValue = chiSquareCritical(alpha, df);
  const rejectH0 = chiSquare >= criticalValue;
  const minDim = Math.min(R - 1, C - 1);
  const cramersV = Math.sqrt(chiSquare / (N * minDim));
  const phi = R === 2 && C === 2 ? Math.sqrt(chiSquare / N) : null;

  return {
    alpha,
    df,
    degenerate: false,
    chiSquare,
    pValue,
    criticalValue,
    cramersV,
    phi,
    yatesChiSquare,
    rejectH0,
    expected,
    expectedFreq,
    deviations,
    residuals,
    contributions,
    cellDetails,
    minExpected,
    cellsBelow5,
    cellsBelow1,
    totalCells,
    pctBelow5,
    cochranValid,
    allAtLeast5,
  };
}

/**
 * End-to-end analysis pipeline from raw (X, F) pairs to contingency table,
 * marginals, conditionals, expected counts, and Chi-square test.
 */
export function analyzeBivariateDataset(pairs, options = {}) {
  const { alpha = 0.05, xOrder = null, fOrder = null, xName = 'X', fName = 'F' } = options;
  const table = buildContingencyTable(pairs, { xOrder, fOrder, xName, fName });
  const test = chiSquareTest(table, alpha);
  return { pairs, table, test };
}

function expandCountsToPairs(xLabels, fLabels, counts, seed) {
  const pairs = [];
  for (let i = 0; i < xLabels.length; i++) {
    for (let j = 0; j < fLabels.length; j++) {
      const k = counts[i][j];
      for (let t = 0; t < k; t++) pairs.push([xLabels[i], fLabels[j]]);
    }
  }
  const rng = mulberry32(seed);
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs;
}

export const PRESET_DATASETS = [
  {
    id: 'attack-outcome',
    label: 'Cybersecurity Incident Logs · Attack Vector (X) × Outcome (F) [Dependent, N = 400]',
    xName: 'Attack Vector (X)',
    fName: 'Outcome (F)',
    xOrder: ['Phishing', 'Malware', 'Credential', 'Injection'],
    fOrder: ['Blocked', 'Alerted', 'Compromised'],
    counts: [
      [50, 46, 24],
      [62, 22, 16],
      [25, 35, 40],
      [23, 17, 40],
    ],
    seed: 20261118,
    summary:
      '400 simulated SOC triage events cross-classifying initial attack vector (X) against defensive outcome (F). Malware payloads are frequently blocked by endpoint signatures, whereas credential abuse and injection exhibit much higher compromise proportions.',
  },
  {
    id: 'protocol-zone',
    label: 'Network Telemetry · Protocol (X) × Server Zone (F) [Independent, N = 360]',
    xName: 'Protocol (X)',
    fName: 'Server Zone (F)',
    xOrder: ['TCP', 'UDP', 'ICMP'],
    fOrder: ['Zone A', 'Zone B', 'Zone C'],
    counts: [
      [54, 55, 41],
      [35, 54, 31],
      [31, 35, 24],
    ],
    seed: 20261119,
    summary:
      '360 sampled packet logs classified by transport protocol (X) and physical rack zone (F). Row conditional distributions P(F | X) closely track the overall marginal proportions of Zone A, B, and C, illustrating sampling fluctuations consistent with independence.',
  },
  {
    id: 'confounded-patch',
    label: 'Confounded Audit · Agent Version (X) × Breach (F) [Spurious via Exposure Z, N = 480]',
    xName: 'Monitoring Agent (X)',
    fName: 'Security Breach (F)',
    xOrder: ['Agent v1', 'Agent v2'],
    fOrder: ['Breach', 'No Breach'],
    counts: [
      [78, 162],
      [42, 198],
    ],
    seed: 20261120,
    summary:
      '480 servers categorized by monitoring agent version (X) and breach occurrence (F). Marginally, Agent v1 shows a 32.5% breach rate versus 17.5% for Agent v2 (χ² = 14.4), yet stratifying by lurking exposure tier Z reveals exact conditional independence in both strata.',
  },
  {
    id: 'sparse-table',
    label: 'Small-Sample Triage · Threat Source (X) × Escalation (F) [Sparse, N = 28]',
    xName: 'Threat Source (X)',
    fName: 'Escalation (F)',
    xOrder: ['Zero-day', 'Misconfig', 'Insider'],
    fOrder: ['Contained', 'Escalated', 'Outage'],
    counts: [
      [2, 3, 4],
      [6, 3, 1],
      [3, 4, 2],
    ],
    seed: 20261121,
    summary:
      '28 rare incidents distributed across a 3 × 3 table. Every cell has expected frequency E_ij < 5, demonstrating why Cochran’s cell-count assumption fails and asymptotic χ² p-values become unreliable on sparse samples.',
  },
];

export function getPresetDataset(id) {
  const preset = PRESET_DATASETS.find((p) => p.id === id) || PRESET_DATASETS[0];
  const pairs = expandCountsToPairs(preset.xOrder, preset.fOrder, preset.counts, preset.seed);
  return { ...preset, pairs };
}

/**
 * Generates a deterministic synthetic (X, F) dataset of size n with R x C categories
 * and tunable dependence strength s in [0, 1].
 * At strength = 0, draws come from the exact product distribution P(X=i, F=j) = p_i * q_j.
 */
export function generateBivariateDataset({
  seed = 20261118,
  n = 300,
  rows = 3,
  cols = 3,
  strength = 0,
} = {}) {
  if (!Number.isInteger(n) || n < 5 || n > 10000) {
    throw new RangeError('Sample size n must be an integer between 5 and 10,000.');
  }
  if (!Number.isInteger(rows) || rows < 2 || rows > 6) {
    throw new RangeError('Rows R must be an integer between 2 and 6.');
  }
  if (!Number.isInteger(cols) || cols < 2 || cols > 6) {
    throw new RangeError('Columns C must be an integer between 2 and 6.');
  }
  if (!Number.isFinite(strength) || strength < 0 || strength > 1) {
    throw new RangeError('Dependence strength must lie between 0 and 1.');
  }

  const xLabels = Array.from({ length: rows }, (_, i) => `X${i + 1}`);
  const fLabels = Array.from({ length: cols }, (_, j) => `F${j + 1}`);

  const baseWeightsX = Array.from({ length: rows }, (_, i) => 1 + 0.35 * ((i * 2) % rows));
  const baseWeightsF = Array.from({ length: cols }, (_, j) => 1 + 0.35 * (((j + 1) * 2) % cols));
  const sumX = baseWeightsX.reduce((a, b) => a + b, 0);
  const sumF = baseWeightsF.reduce((a, b) => a + b, 0);
  const pX = baseWeightsX.map((w) => w / sumX);
  const qF = baseWeightsF.map((w) => w / sumF);

  const depMatrix = Array.from({ length: rows }, () => Array(cols).fill(0));
  let depSum = 0;
  for (let i = 0; i < rows; i++) {
    const targetJ = Math.min(cols - 1, Math.floor((i * cols) / rows));
    for (let j = 0; j < cols; j++) {
      const w = j === targetJ ? 1 : 0.05;
      depMatrix[i][j] = w;
      depSum += w;
    }
  }

  const cdf = [];
  const entries = [];
  let running = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const prob = (1 - strength) * (pX[i] * qF[j]) + strength * (depMatrix[i][j] / depSum);
      running += prob;
      cdf.push(running);
      entries.push([xLabels[i], fLabels[j]]);
    }
  }
  cdf[cdf.length - 1] = 1;

  const rng = mulberry32(seed >>> 0);
  const pairs = [];
  for (let k = 0; k < n; k++) {
    const u = rng();
    let idx = cdf.findIndex((c) => u <= c);
    if (idx === -1) idx = entries.length - 1;
    pairs.push(entries[idx]);
  }
  return { pairs, xLabels, fLabels, xName: 'X', fName: 'F' };
}

/**
 * Stratified confounding example (Simpson-style conditional independence):
 * Marginally, Agent v1 and Breach are strongly dependent (chi^2 = 14.4, df = 1, p ~ 0.000148).
 * Within each exposure stratum Z (Public-facing vs Internal-only), P(Breach | Agent, Z)
 * is identical for Agent v1 and Agent v2 (chi^2 = 0, p = 1).
 */
export function getConfounderAnalyses() {
  const xOrder = ['Agent v1', 'Agent v2'];
  const fOrder = ['Breach', 'No Breach'];
  const publicPairs = expandCountsToPairs(xOrder, fOrder, [[72, 108], [24, 36]], 101);
  const internalPairs = expandCountsToPairs(xOrder, fOrder, [[6, 54], [18, 162]], 102);
  const pooledPairs = [...publicPairs, ...internalPairs];
  return {
    pooled: analyzeBivariateDataset(pooledPairs, { xOrder, fOrder, xName: 'Monitoring Agent (X)', fName: 'Security Breach (F)' }),
    publicStratum: analyzeBivariateDataset(publicPairs, { xOrder, fOrder, xName: 'Monitoring Agent (X)', fName: 'Security Breach (F)' }),
    internalStratum: analyzeBivariateDataset(internalPairs, { xOrder, fOrder, xName: 'Monitoring Agent (X)', fName: 'Security Breach (F)' }),
  };
}
