// The identity O is null; affine coordinates are canonical integers in F_17.
export const P = 17;
export const mod = (n, p = P) => ((n % p) + p) % p;
export function modInverse(n, p = P) {
  n = mod(n, p);
  for (let i = 1; i < p; i++) if (mod(n * i, p) === 1) return i;
  throw new RangeError("No multiplicative inverse exists.");
}
export const isOnCurve = (q) =>
  q === null ||
  (Array.isArray(q) &&
    q.length === 2 &&
    q.every((v) => Number.isInteger(v) && v >= 0 && v < P) &&
    mod(q[1] ** 2) === mod(q[0] ** 3 + 7));
export const points = Array.from({ length: P }, (_, x) =>
  Array.from({ length: P }, (_, y) => [x, y]),
)
  .flat()
  .filter(isOnCurve);
export const formatPoint = (q) => (q === null ? "O" : `(${q[0]}, ${q[1]})`);
export function addition(p, q) {
  if (!isOnCurve(p) || !isOnCurve(q))
    throw new RangeError("Point is not on the curve.");
  if (p === null || q === null) return { point: p ?? q, kind: "identity" };
  const [x1, y1] = p,
    [x2, y2] = q;
  if (x1 === x2 && mod(y1 + y2) === 0) return { point: null, kind: "inverse" };
  const kind = x1 === x2 ? "doubling" : "addition";
  const numerator = kind === "doubling" ? 3 * x1 * x1 : y2 - y1;
  const denominator = kind === "doubling" ? 2 * y1 : x2 - x1;
  const inverse = modInverse(denominator),
    slope = mod(numerator * inverse);
  const x3 = mod(slope * slope - x1 - x2),
    y3 = mod(slope * (x1 - x3) - y1);
  return {
    point: [x3, y3],
    kind,
    numerator,
    denominator: mod(denominator),
    inverse,
    slope,
  };
}
export const pointAdd = (p, q) => addition(p, q).point;
export const pointDouble = (p) => pointAdd(p, p);
function validateScalar(k, g) {
  if (!Number.isSafeInteger(k) || k < 0 || k > 10000)
    throw new RangeError("Use an integer k between 0 and 10000.");
  if (!isOnCurve(g)) throw new RangeError("Invalid base point.");
}
export function repeated(k, g) {
  validateScalar(k, g);
  let q = null;
  return Array.from({ length: k }, (_, i) => {
    const before = q,
      detail = addition(q, g);
    q = detail.point;
    return { label: `${i + 1}G`, before, operand: g, ...detail };
  });
}
export function doubleAndAdd(k, g) {
  validateScalar(k, g);
  let q = null;
  const steps = [];
  if (k === 0) return steps;
  for (const bit of k.toString(2)) {
    const before = q,
      d = addition(q, q);
    q = d.point;
    steps.push({ label: "Double", before, operand: before, ...d });
    if (bit === "1") {
      const before = q,
        d = addition(q, g);
      q = d.point;
      steps.push({ label: "Add G", before, operand: g, ...d });
    }
  }
  return steps;
}
export const multiply = (k, g) => doubleAndAdd(k, g).at(-1)?.point ?? null;
export function pointOrder(g) {
  if (g === null) return 1;
  for (let n = 1; n <= 18; n++) if (multiply(n, g) === null) return n;
  throw new Error("Invalid subgroup.");
}
export const mean = (values) =>
  values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
export function pearson(x, y) {
  if (x.length < 2) return null;
  const mx = mean(x),
    my = mean(y);
  let a = 0,
    b = 0,
    c = 0;
  x.forEach((v, i) => {
    a += (v - mx) * (y[i] - my);
    b += (v - mx) ** 2;
    c += (y[i] - my) ** 2;
  });
  return b * c ? a / Math.sqrt(b * c) : null;
}
export const bits = (q) =>
  q.map((v) => v.toString(2).padStart(5, "0")).join("");
export const hamming = (a, b) =>
  [...a].reduce((n, v, i) => n + Number(v !== b[i]), 0);
export const frequency = (values, size) =>
  Array.from({ length: size }, (_, v) => values.filter((x) => x === v).length);
export function toyDataset(g, mode, k) {
  const order = pointOrder(g),
    end = mode === "census" ? order - 1 : k;
  const rows = Array.from({ length: end }, (_, i) => ({
    k: i + 1,
    q: multiply(i + 1, g),
  }));
  const affine = rows.filter((r) => r.q !== null);
  const x = affine.map((r) => r.q[0]),
    y = affine.map((r) => r.q[1]);
  const flips = [];
  // Unique unordered pairs, only nonzero scalars within this subgroup.
  const width = Math.ceil(Math.log2(order));
  for (let a = 1; a < order; a++)
    for (let bit = 0; bit < width; bit++) {
      const b = a ^ (1 << bit);
      if (b > a && b < order)
        flips.push({
          a,
          b,
          bit,
          distance: hamming(bits(multiply(a, g)), bits(multiply(b, g))),
        });
    }
  return {
    order,
    rows,
    affine,
    x,
    y,
    fx: frequency(x, 17),
    fy: frequency(y, 17),
    rx: pearson(
      affine.map((r) => r.k),
      x,
    ),
    ry: pearson(
      affine.map((r) => r.k),
      y,
    ),
    bitCounts: Array.from({ length: 10 }, (_, i) =>
      affine.reduce((n, r) => n + Number(bits(r.q)[i]), 0),
    ),
    flips,
  };
}
