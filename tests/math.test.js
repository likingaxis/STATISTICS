import test from "node:test";
import assert from "node:assert/strict";
import {
  points,
  mod,
  modInverse,
  isOnCurve,
  pointAdd,
  pointDouble,
  repeated,
  doubleAndAdd,
  multiply,
  pointOrder,
  toyDataset,
  hamming,
  bits,
  pearson,
} from "../src/math.js";
const G = [1, 5],
  all = [null, ...points];
test("field and all 18 group elements", () => {
  assert.equal(points.length, 17);
  assert.equal(mod(-1), 16);
  assert.equal(modInverse(10), 12);
  assert.throws(() => modInverse(0));
  assert.equal(isOnCurve([0, 0]), false);
  assert.equal(isOnCurve([18, 5]), false);
  assert.equal(isOnCurve([1, 5]), true);
  assert.throws(() => pointAdd([0, 0], G));
});
test("assignment reference sequence, order and periodicity", () => {
  assert.deepEqual(
    repeated(10, G).map((s) => s.point),
    [
      [1, 5],
      [2, 10],
      [5, 9],
      [12, 1],
      [12, 16],
      [5, 8],
      [2, 7],
      [1, 12],
      null,
      [1, 5],
    ],
  );
  assert.equal(pointOrder(G), 9);
  assert.deepEqual(multiply(6, G), [5, 8]);
});
test("identity, inverses, y=0 doubling, closure and associativity exhaustively", () => {
  for (const p of all) {
    assert.deepEqual(pointAdd(p, null), p);
    assert.deepEqual(pointAdd(null, p), p);
    if (p) assert.equal(pointAdd(p, [p[0], mod(-p[1])]), null);
    for (const q of all) {
      assert.ok(isOnCurve(pointAdd(p, q)));
      assert.deepEqual(pointAdd(p, q), pointAdd(q, p));
      for (const r of all)
        assert.deepEqual(
          pointAdd(pointAdd(p, q), r),
          pointAdd(p, pointAdd(q, r)),
        );
    }
  }
  assert.equal(pointDouble(points.find((q) => q[1] === 0)), null);
});
test("both algorithms agree for every base and k=0…100", () => {
  for (const g of all)
    for (let k = 0; k <= 100; k++) {
      assert.deepEqual(
        repeated(k, g).at(-1)?.point ?? null,
        doubleAndAdd(k, g).at(-1)?.point ?? null,
      );
      assert.deepEqual(multiply(k + pointOrder(g), g), multiply(k, g));
    }
  assert.throws(() => multiply(-1, G));
  assert.throws(() => multiply(1.5, G));
});
test("census frequencies, denominator, correlations and one-bit pair protocol", () => {
  const d = toyDataset(G, "census", 6);
  assert.deepEqual(d.x, [1, 2, 5, 12, 12, 5, 2, 1]);
  assert.equal(d.affine.length, 8);
  assert.equal(d.fx.filter(Boolean).length, 4);
  assert.equal(
    d.fx.reduce((a, b) => a + b),
    8,
  );
  assert.equal(d.rx, 0);
  for (const f of d.flips) {
    assert.equal(
      hamming(
        f.a.toString(2).padStart(4, "0"),
        f.b.toString(2).padStart(4, "0"),
      ),
      1,
    );
    assert.equal(
      f.distance,
      hamming(bits(multiply(f.a, G)), bits(multiply(f.b, G))),
    );
  }
  const seq = toyDataset(G, "sequence", 18);
  assert.equal(seq.rows.length - seq.affine.length, 2);
  assert.equal(seq.affine.length, 16);
  assert.equal(pearson([1, 2], [3, 3]), null);
});
