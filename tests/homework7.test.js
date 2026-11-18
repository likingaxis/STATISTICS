import test from 'node:test';
import assert from 'node:assert/strict';
import {
  logGamma,
  regularizedGammaP,
  regularizedGammaQ,
  chiSquareCDF,
  chiSquarePValue,
  chiSquarePDF,
  chiSquareCritical,
  parseBivariateData,
  buildContingencyTable,
  expectedFrequencies,
  chiSquareTest,
  analyzeBivariateDataset,
  getPresetDataset,
  generateBivariateDataset,
  getConfounderAnalyses,
} from '../src/independence.js';
import { adaptiveCDF } from '../src/normal-cdf.js';

test('Contingency table construction preserves grand total, marginals, conditionals, and row-order invariance', () => {
  const preset = getPresetDataset('attack-outcome');
  const tbl = buildContingencyTable(preset.pairs, {
    xOrder: preset.xOrder,
    fOrder: preset.fOrder,
  });

  assert.equal(tbl.N, 400);
  assert.equal(tbl.R, 4);
  assert.equal(tbl.C, 3);
  assert.deepEqual(tbl.rowTotals, [120, 100, 100, 80]);
  assert.deepEqual(tbl.colTotals, [160, 120, 120]);

  const sumObs = tbl.observed.flat().reduce((a, b) => a + b, 0);
  assert.equal(sumObs, tbl.N);

  const sumJoint = tbl.jointFreq.flat().reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sumJoint - 1) < 1e-14);

  const sumRowMarg = tbl.rowMarginals.reduce((a, b) => a + b, 0);
  const sumColMarg = tbl.colMarginals.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sumRowMarg - 1) < 1e-14);
  assert.ok(Math.abs(sumColMarg - 1) < 1e-14);

  for (let i = 0; i < tbl.R; i++) {
    const rowSum = tbl.condFGivenX[i].reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(rowSum - 1) < 1e-14);
  }
  for (let j = 0; j < tbl.C; j++) {
    let colSum = 0;
    for (let i = 0; i < tbl.R; i++) colSum += tbl.condXGivenF[i][j];
    assert.ok(Math.abs(colSum - 1) < 1e-14);
  }

  // Reversing the order of raw observations must yield the exact same contingency table
  const reversed = buildContingencyTable([...preset.pairs].reverse());
  const canonical = buildContingencyTable(preset.pairs);
  assert.deepEqual(reversed.observed, canonical.observed);
  assert.deepEqual(reversed.xLabels, canonical.xLabels);
  assert.deepEqual(reversed.fLabels, canonical.fLabels);
});

test('Expected frequencies preserve all row, column, and grand totals and have zero-sum deviations', () => {
  const preset = getPresetDataset('attack-outcome');
  const tbl = buildContingencyTable(preset.pairs, {
    xOrder: preset.xOrder,
    fOrder: preset.fOrder,
  });
  const { expected, expectedFreq, deviations } = expectedFrequencies(tbl);

  const totalExpected = expected.flat().reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(totalExpected - tbl.N) < 1e-12);

  const totalExpectedFreq = expectedFreq.flat().reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(totalExpectedFreq - 1) < 1e-14);

  for (let i = 0; i < tbl.R; i++) {
    const rowExp = expected[i].reduce((a, b) => a + b, 0);
    const rowDev = deviations[i].reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(rowExp - tbl.rowTotals[i]) < 1e-12);
    assert.ok(Math.abs(rowDev) < 1e-12);
  }
  for (let j = 0; j < tbl.C; j++) {
    let colExp = 0;
    let colDev = 0;
    for (let i = 0; i < tbl.R; i++) {
      colExp += expected[i][j];
      colDev += deviations[i][j];
    }
    assert.ok(Math.abs(colExp - tbl.colTotals[j]) < 1e-12);
    assert.ok(Math.abs(colDev) < 1e-12);
  }
});

test('Exact independence produces zero Chi-square, unit p-value, and zero Cramer V', () => {
  // 2x2 table with exact product counts: row totals 60, 40; col totals 50, 50 -> cells 30, 30 and 20, 20
  const pairs = [
    ...Array.from({ length: 30 }, () => ['A', 'X']),
    ...Array.from({ length: 30 }, () => ['A', 'Y']),
    ...Array.from({ length: 20 }, () => ['B', 'X']),
    ...Array.from({ length: 20 }, () => ['B', 'Y']),
  ];
  const { table: tbl, test: res } = analyzeBivariateDataset(pairs);
  assert.equal(res.df, 1);
  assert.ok(Math.abs(res.chiSquare) < 1e-15);
  assert.ok(Math.abs(res.pValue - 1) < 1e-15);
  assert.ok(Math.abs(res.cramersV) < 1e-15);
  assert.equal(res.rejectH0, false);
  for (let i = 0; i < tbl.R; i++) {
    for (let j = 0; j < tbl.C; j++) {
      assert.ok(Math.abs(tbl.condFGivenX[i][j] - tbl.colMarginals[j]) < 1e-15);
      assert.ok(Math.abs(tbl.condXGivenF[i][j] - tbl.rowMarginals[i]) < 1e-15);
    }
  }
});

test('Chi-square, df, p-value, and Cramer V are invariant under X <-> F transposition, and scale predictably with sample size', () => {
  const preset = getPresetDataset('attack-outcome');
  const forward = analyzeBivariateDataset(preset.pairs);
  const transposed = analyzeBivariateDataset(preset.pairs.map(([x, f]) => [f, x]));

  assert.equal(forward.test.df, 6);
  assert.equal(transposed.test.df, 6);
  assert.ok(Math.abs(forward.test.chiSquare - transposed.test.chiSquare) < 1e-12);
  assert.ok(Math.abs(forward.test.pValue - transposed.test.pValue) < 1e-15);
  assert.ok(Math.abs(forward.test.cramersV - transposed.test.cramersV) < 1e-14);

  // Doubling every observation doubles chiSquare while keeping conditional frequencies and Cramer's V unchanged
  const doubled = analyzeBivariateDataset([...preset.pairs, ...preset.pairs]);
  assert.ok(Math.abs(doubled.test.chiSquare - 2 * forward.test.chiSquare) < 1e-11);
  assert.ok(Math.abs(doubled.test.cramersV - forward.test.cramersV) < 1e-14);
});

test('Incomplete gamma and Chi-square tail probabilities match exact normal, exponential, Erlang, and published benchmarks', () => {
  // Gamma(n) = (n-1)! for positive integers
  assert.ok(Math.abs(Math.exp(logGamma(1)) - 1) < 1e-14);
  assert.ok(Math.abs(Math.exp(logGamma(5)) - 24) < 1e-12);
  assert.ok(Math.abs(Math.exp(logGamma(0.5)) - Math.sqrt(Math.PI)) < 1e-14);

  // Complementarity P(a, x) + Q(a, x) = 1
  for (const [a, x] of [[0.5, 0.3], [0.5, 4.2], [2, 1.5], [3, 9.8], [5.5, 12.4]]) {
    assert.ok(Math.abs(regularizedGammaP(a, x) + regularizedGammaQ(a, x) - 1) < 1e-14);
  }

  // df = 1: P(Chi^2_1 >= x) = 2 * (1 - Phi(sqrt(x)))
  for (const x of [0.25, 1, 3.841458820694124, 6.634896601021214, 12.25]) {
    const pChi = chiSquarePValue(x, 1);
    const pNorm = 2 * (1 - adaptiveCDF(Math.sqrt(x), 1e-12).value);
    assert.ok(Math.abs(pChi - pNorm) < 2e-10, `Mismatch at x=${x}: ${pChi} vs ${pNorm}`);
  }

  // df = 2: P(Chi^2_2 >= x) = exp(-x / 2) and critical value = -2 ln(alpha)
  for (const x of [0.5, 2, 5.991464547107979, 10]) {
    assert.ok(Math.abs(chiSquarePValue(x, 2) - Math.exp(-x / 2)) < 1e-14);
    assert.ok(Math.abs(chiSquareCDF(x, 2) - (1 - Math.exp(-x / 2))) < 1e-14);
  }
  assert.ok(Math.abs(chiSquareCritical(0.05, 2) - -2 * Math.log(0.05)) < 1e-12);

  // df = 4: P(Chi^2_4 >= x) = (1 + x / 2) * exp(-x / 2)
  for (const x of [1.2, 4.0, 9.487729036781154]) {
    const exact = (1 + x / 2) * Math.exp(-x / 2);
    assert.ok(Math.abs(chiSquarePValue(x, 4) - exact) < 1e-14);
  }

  // Standard critical values and round-trip inversion
  assert.ok(Math.abs(chiSquareCritical(0.05, 1) - 3.841458820694124) < 1e-9);
  assert.ok(Math.abs(chiSquareCritical(0.01, 1) - 6.634896601021214) < 1e-9);
  assert.ok(Math.abs(chiSquareCritical(0.05, 6) - 12.591587243743977) < 1e-9);
  for (const df of [1, 2, 4, 6, 9]) {
    for (const alpha of [0.1, 0.05, 0.01, 0.001]) {
      const crit = chiSquareCritical(alpha, df);
      assert.ok(Math.abs(chiSquarePValue(crit, df) - alpha) < 1e-12);
    }
  }
  assert.ok(chiSquarePDF(2, 2) > 0);
});

test('Confounded audit demonstrates strong marginal association alongside exact conditional independence within strata', () => {
  const conf = getConfounderAnalyses();
  // Marginally: N = 480, chi^2 = 14.4, df = 1, p < 0.001
  assert.equal(conf.pooled.table.N, 480);
  assert.ok(Math.abs(conf.pooled.test.chiSquare - 14.4) < 1e-12);
  assert.equal(conf.pooled.test.rejectH0, true);
  assert.ok(conf.pooled.test.pValue < 0.0002);

  // Within both strata of Z: exact conditional independence (chi^2 = 0, p = 1)
  assert.equal(conf.publicStratum.table.N, 240);
  assert.ok(Math.abs(conf.publicStratum.test.chiSquare) < 1e-14);
  assert.ok(Math.abs(conf.publicStratum.test.pValue - 1) < 1e-14);
  assert.equal(conf.publicStratum.test.rejectH0, false);

  assert.equal(conf.internalStratum.table.N, 240);
  assert.ok(Math.abs(conf.internalStratum.test.chiSquare) < 1e-14);
  assert.ok(Math.abs(conf.internalStratum.test.pValue - 1) < 1e-14);
  assert.equal(conf.internalStratum.test.rejectH0, false);
});

test('Presets, Cochran expected-count diagnostics, degenerate tables, parser, and synthetic generator behave as specified', () => {
  const dep = analyzeBivariateDataset(getPresetDataset('attack-outcome').pairs);
  assert.equal(dep.test.rejectH0, true);
  assert.equal(dep.test.allAtLeast5, true);
  assert.equal(dep.test.cochranValid, true);

  const ind = analyzeBivariateDataset(getPresetDataset('protocol-zone').pairs);
  assert.equal(ind.test.rejectH0, false);
  assert.equal(ind.test.allAtLeast5, true);

  const sparse = analyzeBivariateDataset(getPresetDataset('sparse-table').pairs);
  assert.equal(sparse.test.allAtLeast5, false);
  assert.equal(sparse.test.cochranValid, false);
  assert.equal(sparse.test.cellsBelow5, 9);

  // Degenerate 1x3 table (df = 0)
  const degen = analyzeBivariateDataset([
    ['OnlyRow', 'C1'],
    ['OnlyRow', 'C2'],
    ['OnlyRow', 'C3'],
  ]);
  assert.equal(degen.test.df, 0);
  assert.equal(degen.test.degenerate, true);
  assert.equal(degen.test.pValue, null);
  assert.equal(degen.test.criticalValue, null);

  // Parser with header, semicolons, and invalid lines
  const parsed = parseBivariateData('Attack; Outcome\nPhishing; Blocked\nMalware; Alerted', {
    hasHeader: true,
  });
  assert.equal(parsed.xName, 'Attack');
  assert.equal(parsed.fName, 'Outcome');
  assert.equal(parsed.pairs.length, 2);
  assert.throws(() => parseBivariateData(''), /Enter at least one/);
  assert.throws(() => parseBivariateData('SingleValueOnly'), /Line 1 must contain/);

  // Reproducible synthetic generator
  const g1 = generateBivariateDataset({ seed: 42, n: 500, rows: 3, cols: 3, strength: 0 });
  const g2 = generateBivariateDataset({ seed: 42, n: 500, rows: 3, cols: 3, strength: 0 });
  const gStrong = generateBivariateDataset({ seed: 42, n: 500, rows: 3, cols: 3, strength: 0.85 });
  assert.deepEqual(g1.pairs, g2.pairs);

  const aWeak = analyzeBivariateDataset(g1.pairs);
  const aStrong = analyzeBivariateDataset(gStrong.pairs);
  assert.ok(aStrong.test.cramersV > aWeak.test.cramersV + 0.3);
  assert.equal(aStrong.test.rejectH0, true);
});

test('Bayes and multiplication rules link joint, marginal, and conditional frequencies in every cell', () => {
  for (const id of ['attack-outcome', 'protocol-zone', 'confounded-patch', 'sparse-table']) {
    const { table: tbl } = analyzeBivariateDataset(getPresetDataset(id).pairs);
    for (let i = 0; i < tbl.R; i++) {
      for (let j = 0; j < tbl.C; j++) {
        const joint = tbl.jointFreq[i][j];
        const viaRow = tbl.condFGivenX[i][j] * tbl.rowMarginals[i];
        const viaCol = tbl.condXGivenF[i][j] * tbl.colMarginals[j];
        assert.ok(Math.abs(joint - viaRow) < 1e-15);
        assert.ok(Math.abs(joint - viaCol) < 1e-15);
      }
    }
  }
});

test('Default attack-outcome preset matches independent manual cell-by-cell Chi-square calculation', () => {
  const preset = getPresetDataset('attack-outcome');
  const { table: tbl, test: res } = analyzeBivariateDataset(preset.pairs, {
    xOrder: preset.xOrder,
    fOrder: preset.fOrder,
  });
  // Row totals: [120, 100, 100, 80], Col totals: [160, 120, 120], N = 400
  // Expected row 0 (120): [48, 36, 36]; row 1 (100): [40, 30, 30]; row 2 (100): [40, 30, 30]; row 3 (80): [32, 24, 24]
  const manualExpected = [
    [48, 36, 36],
    [40, 30, 30],
    [40, 30, 30],
    [32, 24, 24],
  ];
  assert.deepEqual(res.expected, manualExpected);

  let manualChi2 = 0;
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      manualChi2 += (tbl.observed[i][j] - manualExpected[i][j]) ** 2 / manualExpected[i][j];
    }
  }
  assert.ok(Math.abs(res.chiSquare - manualChi2) < 1e-12);
  assert.equal(res.yatesChiSquare, null);
  assert.equal(res.phi, null);
});

test('2x2 tables report phi coefficient and Yates continuity-corrected Chi-square', () => {
  const conf = getConfounderAnalyses().pooled;
  assert.ok(conf.test.phi !== null);
  assert.ok(Math.abs(conf.test.phi - conf.test.cramersV) < 1e-15);
  assert.ok(conf.test.yatesChiSquare !== null);
  assert.ok(conf.test.yatesChiSquare < conf.test.chiSquare);
  // For [[78, 162], [42, 198]], E = [[60, 180], [60, 180]], |O - E| - 0.5 = 17.5
  const expectedYates = 2 * (17.5 ** 2 / 60 + 17.5 ** 2 / 180);
  assert.ok(Math.abs(conf.test.yatesChiSquare - expectedYates) < 1e-12);
});

test('Independence and special-function APIs reject invalid parameters cleanly', () => {
  assert.throws(() => logGamma(0), RangeError);
  assert.throws(() => regularizedGammaP(-1, 2), RangeError);
  assert.throws(() => regularizedGammaQ(1, -0.1), RangeError);
  assert.throws(() => chiSquareCDF(2, 0), RangeError);
  assert.throws(() => chiSquarePValue(2, 1.5), RangeError);
  assert.throws(() => chiSquareCritical(1.2, 2), RangeError);
  assert.throws(() => buildContingencyTable([]), /At least one/);
  assert.throws(() => buildContingencyTable([['A', '']]), /empty category/);
  assert.throws(() => generateBivariateDataset({ n: 2 }), RangeError);
  assert.throws(() => generateBivariateDataset({ strength: 1.5 }), RangeError);
});

