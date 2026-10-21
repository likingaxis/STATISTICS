// Language statistics and reproducible experiments. No wallet secrets belong here.
export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
export const METHODS = ["chi2", "trigram", "dominant"];
export const METHOD_LABELS = {
  chi2: "Letter χ² score",
  trigram: "Trigram log score",
  dominant: "Most frequent → E",
};
export const DEFAULT_LENGTHS = [5, 10, 20, 40, 80, 160, 320, 640];
export const lettersOnly = (text) =>
  String(text)
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
export function caesar(text, key) {
  if (!Number.isInteger(key))
    throw new RangeError("The Caesar key must be an integer.");
  const shift = ((key % 26) + 26) % 26;
  return String(text).replace(/[A-Za-z]/g, (c) => {
    const base = c >= "a" && c <= "z" ? 97 : 65;
    return String.fromCharCode(base + ((c.charCodeAt(0) - base + shift) % 26));
  });
}
export function letterCounts(text) {
  const counts = Array(26).fill(0);
  for (const c of lettersOnly(text)) counts[c.charCodeAt(0) - 65]++;
  return counts;
}
export function distributionStats(counts) {
  const n = counts.reduce((a, b) => a + b, 0);
  return {
    n,
    entropy: n
      ? counts
          .filter(Boolean)
          .reduce((s, c) => s - (c / n) * Math.log2(c / n), 0)
      : null,
    ic:
      n > 1
        ? counts.reduce((s, c) => s + c * (c - 1), 0) / (n * (n - 1))
        : null,
  };
}
export function trainLanguage(text) {
  const letters = lettersOnly(text),
    counts = letterCounts(letters),
    n = letters.length;
  if (n < 1000)
    throw new RangeError(
      "The training corpus must contain at least 1,000 A–Z letters.",
    );
  const probabilities = counts.map((c) => (c + 0.5) / (n + 13));
  const trigrams = new Float64Array(26 ** 3);
  for (let i = 0; i < letters.length - 2; i++)
    trigrams[gramIndex(letters, i)]++;
  const denominator = n - 2 + 0.1 * 26 ** 3;
  for (let i = 0; i < trigrams.length; i++)
    trigrams[i] = Math.log((trigrams[i] + 0.1) / denominator);
  return { n, counts, probabilities, trigrams };
}
function gramIndex(s, i) {
  return (
    (s.charCodeAt(i) - 65) * 676 +
    (s.charCodeAt(i + 1) - 65) * 26 +
    s.charCodeAt(i + 2) -
    65
  );
}
export function rankCaesar(ciphertext, model) {
  const ciphertextLetters = lettersOnly(ciphertext),
    n = ciphertextLetters.length;
  if (!n)
    throw new RangeError(
      "Enter ciphertext containing at least one A–Z letter.",
    );
  const counts = letterCounts(ciphertextLetters),
    peak = counts.indexOf(Math.max(...counts));
  const dominantKey = (peak - 4 + 26) % 26;
  const rows = Array.from({ length: 26 }, (_, key) => {
    const plain = caesar(ciphertextLetters, -key);
    const chi2 = model.probabilities.reduce((sum, p, i) => {
      const observed = counts[(i + key) % 26],
        expected = n * p;
      return sum + (observed - expected) ** 2 / expected;
    }, 0);
    let logScore = 0;
    for (let i = 0; i < plain.length - 2; i++)
      logScore += model.trigrams[gramIndex(plain, i)];
    // All rankings sort ascending. Negative log-likelihood gives that order.
    return {
      key,
      chi2,
      trigram: -logScore,
      dominant: key === dominantKey ? 0 : 1,
      preview: caesar(ciphertext, -key).slice(0, 110),
    };
  });
  const ranked = Object.fromEntries(
    METHODS.map((method) => [
      method,
      [...rows].sort((a, b) => a[method] - b[method] || a.key - b.key),
    ]),
  );
  const tied = Object.fromEntries(
    METHODS.map((method) => [
      method,
      rows.filter(
        (row) => Math.abs(row[method] - ranked[method][0][method]) < 1e-9,
      ).length,
    ]),
  );
  return { n, rows, ranked, tied, dominantKey };
}
// Mulberry32 supplies reproducible test sampling only; never use it for EC scalars.
export function seededRandom(seed) {
  if (!Number.isInteger(seed) || seed < 1 || seed > 0xffffffff)
    throw new RangeError("Use a seed between 1 and 4294967295.");
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
}
export function randomIndex(next, n) {
  if (!Number.isInteger(n) || n < 1 || n > 0x100000000)
    throw new RangeError("Invalid sampling range.");
  const limit = Math.floor(0x100000000 / n) * n;
  let x;
  do {
    x = next();
  } while (x >= limit);
  return x % n;
}
export function wilson(successes, n) {
  if (!Number.isInteger(n) || n < 1 || successes < 0 || successes > n)
    throw new RangeError("Invalid binomial counts.");
  const z = 1.959963984540054,
    p = successes / n,
    den = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / den,
    half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}
export function runCaesarExperiment(
  {
    trainText,
    testText,
    trialCount = 100,
    seed = 20261021,
    lengths = DEFAULT_LENGTHS,
  },
  progress = () => {},
) {
  if (!Number.isInteger(trialCount) || trialCount < 10 || trialCount > 500)
    throw new RangeError("Use 10–500 trials per length.");
  const model = trainLanguage(trainText),
    test = lettersOnly(testText),
    next = seededRandom(seed),
    trials = [],
    summary = [];
  if (
    !lengths.length ||
    lengths.some((l) => !Number.isInteger(l) || l < 3 || l > test.length)
  )
    throw new RangeError(
      "Every test length must be between 3 and the test corpus length.",
    );
  for (const length of lengths) {
    const group = [];
    for (let trial = 0; trial < trialCount; trial++) {
      const start = randomIndex(next, test.length - length + 1),
        trueKey = randomIndex(next, 26);
      const cipher = caesar(test.slice(start, start + length), trueKey),
        result = rankCaesar(cipher, model);
      for (const method of METHODS) {
        const ranked = result.ranked[method],
          trueScore = result.rows[trueKey][method];
        const better = ranked.filter(
          (row) => row[method] < trueScore - 1e-9,
        ).length;
        const ties = ranked.filter(
          (row) => Math.abs(row[method] - trueScore) < 1e-9,
        ).length;
        const row = {
          length,
          trial,
          start,
          trueKey,
          method,
          predictedKey: ranked[0].key,
          success: ranked[0].key === trueKey,
          bestTies: result.tied[method],
          trueMidRank: 1 + better + (ties - 1) / 2,
        };
        group.push(row);
        trials.push(row);
      }
    }
    for (const method of METHODS) {
      const rows = group.filter((r) => r.method === method),
        successes = rows.filter((r) => r.success).length;
      const interval = wilson(successes, trialCount);
      summary.push({
        length,
        method,
        trials: trialCount,
        successes,
        rate: successes / trialCount,
        low: interval[0],
        high: interval[1],
        meanRank: rows.reduce((s, r) => s + r.trueMidRank, 0) / trialCount,
      });
    }
    progress({
      completed: lengths.indexOf(length) + 1,
      total: lengths.length,
      length,
    });
  }
  return {
    protocol: "caesar-v1",
    seed,
    trialCount,
    lengths,
    trainingLetters: model.n,
    testLetters: test.length,
    summary,
    trials,
  };
}
