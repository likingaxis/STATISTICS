// penetration-v1: seeded Monte Carlo teaching model; not a cryptographic PRNG.
export const PROTOCOL = "penetration-v1";
export const CHECKPOINTS = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
export const MODELS = ["bernoulli", "rademacher"];
export function parameters(model, p = 0.3) {
  if (!MODELS.includes(model)) throw new Error("Unknown score model.");
  if (!Number.isFinite(p) || p < 0 || p > 1) throw new Error("Choose p between 0 and 1.");
  return model === "bernoulli" ? { mu: p, variance: p * (1 - p), q: p } : { mu: 0, variance: 1, q: 0.5 };
}
export function theory(model, n, p = 0.3) {
  const { mu, variance } = parameters(model, p);
  return { total: { mean: n * mu, variance: n * variance }, average: { mean: mu, variance: variance / n }, normalized: { mean: Math.sqrt(n) * mu, variance }, mu, variance };
}
function stream(seed, model, attacker) {
  let a = (seed ^ Math.imul(attacker + 1, 0x9e3779b9) ^ (model === "bernoulli" ? 0x85ebca6b : 0xc2b2ae35)) >>> 0;
  a ^= a >>> 16; a = Math.imul(a, 0x7feb352d); a ^= a >>> 15;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export function validateConfig({ n, m, p, seed }) {
  if (!Number.isInteger(n) || n < 1 || n > 10000) throw new Error("Systems n must be an integer from 1 to 10,000.");
  if (!Number.isInteger(m) || m < 2 || m > 2000) throw new Error("Attackers m must be an integer from 2 to 2,000.");
  if (!Number.isInteger(seed) || seed < 1 || seed > 4294967295) throw new Error("Seed must be an integer from 1 to 4,294,967,295.");
  parameters("bernoulli", p);
}
export async function simulate(config, progress = () => {}) {
  validateConfig(config);
  const { n, m, p, seed } = config;
  const checkpoints = [...new Set([...CHECKPOINTS.filter(k => k <= n), n])].sort((a, b) => a - b);
  const result = { protocol: PROTOCOL, config: { ...config }, checkpoints, models: {} };
  for (const model of MODELS) {
    const totals = checkpoints.map(() => new Int32Array(m));
    const paths = [];
    for (let j = 0; j < m; j++) {
      const random = stream(seed, model, j);
      let sum = 0, ci = 0;
      const path = j < Math.min(24, m) ? new Int32Array(n + 1) : null;
      for (let k = 1; k <= n; k++) {
        const hit = random() < (model === "bernoulli" ? p : 0.5);
        sum += model === "bernoulli" ? Number(hit) : hit ? 1 : -1;
        if (path) path[k] = sum;
        if (k === checkpoints[ci]) totals[ci++][j] = sum;
      }
      if (path) paths.push(path);
      if ((j + 1) % 128 === 0) {
        progress({ model, completed: j + 1, m });
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    result.models[model] = { totals, paths };
  }
  return result;
}
export function moments(values) {
  let mean = 0, ss = 0, n = 0;
  for (const x of values) { n++; const delta = x - mean; mean += delta / n; ss += delta * (x - mean); }
  return { mean: n ? mean : null, variance: n > 1 ? ss / (n - 1) : null, n };
}
export function scaleValue(total, n, kind) {
  return kind === "total" ? total : kind === "average" ? total / n : total / Math.sqrt(n);
}
// Stable finite-n binomial mass by recursion from its mode, then normalization.
export function exactLaw(model, n, p = 0.3) {
  const { q } = parameters(model, p), mass = new Float64Array(n + 1);
  if (q === 0) mass[0] = 1;
  else if (q === 1) mass[n] = 1;
  else {
    const mode = Math.floor((n + 1) * q); mass[mode] = 1;
    for (let k = mode; k > 0; k--) mass[k - 1] = mass[k] * k / (n - k + 1) * (1 - q) / q;
    for (let k = mode; k < n; k++) mass[k + 1] = mass[k] * (n - k) / (k + 1) * q / (1 - q);
    let sum = 0; for (const v of mass) sum += v;
    for (let k = 0; k <= n; k++) mass[k] /= sum;
  }
  return { mass, scores: Int32Array.from(mass, (_, k) => model === "bernoulli" ? k : 2 * k - n) };
}
export function normalCDF(x) {
  if (x === Infinity) return 1;
  if (x === -Infinity) return 0;
  if (x === 0) return 0.5;
  const a = Math.abs(x), t = 1 / (1 + 0.2316419 * a);
  const tail = Math.exp(-a * a / 2) / Math.sqrt(2 * Math.PI) * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - tail : tail;
}
export function standardized(total, n, model, p = 0.3) {
  const { mu, variance } = parameters(model, p);
  return variance ? (total - n * mu) / Math.sqrt(n * variance) : null;
}
export function cdfDistance(values) {
  const xs = [...values].sort((a, b) => a - b);
  let d = 0;
  for (let i = 0; i < xs.length; i++) d = Math.max(d, Math.abs(normalCDF(xs[i]) - i / xs.length), Math.abs((i + 1) / xs.length - normalCDF(xs[i])));
  return d;
}
export function normalLawDistance(law, n, model, p) {
  if (!parameters(model, p).variance) return null;
  let c = 0, d = 0;
  for (let i = 0; i < law.mass.length; i++) {
    const f = normalCDF(standardized(law.scores[i], n, model, p));
    d = Math.max(d, Math.abs(c - f), Math.abs(c + law.mass[i] - f)); c += law.mass[i];
  }
  return d;
}
export function outside(total, n, mu, epsilon) {
  // Strict deviation event; tolerance only handles floating-point equality at the boundary.
  return Math.abs(total - n * mu) > n * epsilon + 1e-12 * Math.max(1, n);
}
export function wilson(successes, m) {
  const z = 1.959963984540054, q = successes / m, a = z * z / m;
  const center = (q + a / 2) / (1 + a), radius = z / (1 + a) * Math.sqrt(q * (1 - q) / m + a / (4 * m));
  return [successes === 0 ? 0 : Math.max(0, center - radius), successes === m ? 1 : Math.min(1, center + radius)];
}
export function summarize(values, model, n, p, epsilon, law = exactLaw(model, n, p)) {
  const t = theory(model, n, p), stats = moments(values);
  const count = Array.from(values).filter(s => outside(s, n, t.mu, epsilon)).length;
  let exactTail = 0;
  for (let i = 0; i < law.mass.length; i++) if (outside(law.scores[i], n, t.mu, epsilon)) exactTail += law.mass[i];
  const z = t.variance ? Array.from(values, s => standardized(s, n, model, p)) : null;
  return { ...stats, count, fraction: count / values.length, interval: wilson(count, values.length), exactTail, bound: Math.min(1, t.variance / (n * epsilon * epsilon)), empiricalD: z ? cdfDistance(z) : null, exactD: normalLawDistance(law, n, model, p) };
}
export function histogram(values, law, n, kind, maxBins = 28) {
  let min = Infinity, max = -Infinity;
  for (const x of values) { min = Math.min(min, x); max = Math.max(max, x); }
  // Extend beyond observed endpoints until omitted theoretical tail is below 1e-8 per side.
  let c = 0, lo = law.scores[0], hi = law.scores.at(-1);
  for (let i = 0; i < law.mass.length; i++) { c += law.mass[i]; if (c >= 1e-8) { lo = law.scores[i]; break; } }
  c = 0;
  for (let i = law.mass.length - 1; i >= 0; i--) { c += law.mass[i]; if (c >= 1e-8) { hi = law.scores[i]; break; } }
  min = Math.min(min, lo); max = Math.max(max, hi);
  const width = Math.max(1, Math.ceil((max - min + 1) / maxBins));
  const left = min - 0.5, count = Math.ceil((max - min + 1) / width);
  const bins = Array.from({ length: count }, (_, i) => ({ lo: scaleValue(left + i * width, n, kind), hi: scaleValue(left + (i + 1) * width, n, kind), count: 0, probability: 0 }));
  for (const x of values) bins[Math.min(count - 1, Math.floor((x - left) / width))].count++;
  for (let i = 0; i < law.mass.length; i++) {
    const index = Math.floor((law.scores[i] - left) / width);
    if (index >= 0 && index < count) bins[index].probability += law.mass[i];
  }
  return bins;
}
