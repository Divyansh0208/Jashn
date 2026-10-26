import test from "node:test";
import assert from "node:assert/strict";
import { normalize, parseInput, split, scaler, addDays, today } from "./plan.js";
import { buildFallback } from "./fallback.js";

const ok = { type: "wedding", guests: 100, budget: 500000, city: "Lucknow", date: "2099-01-01" };
const sum = (p) => p.budget.reduce((a, r) => a + r.amount, 0);

test("split is exact and survives zero weights", () => {
  assert.equal(split(100001, [3, 3, 3]).reduce((a, x) => a + x, 0), 100001);
  assert.equal(split(7, [0, 0, 0]).reduce((a, x) => a + x, 0), 7);
});
test("normalize makes budget sum exact", () => {
  assert.equal(sum(normalize({ budget: [{ amount: 300001 }, { amount: 150000 }, { amount: 99 }] }, ok)), 500000);
  assert.equal(sum(normalize({ budget: [{ amount: 0 }, { amount: 0 }] }, ok)), 500000);
});
test("parseInput accepts good, rejects bad", () => {
  assert.equal(parseInput(ok).guests, 100);
  assert.deepEqual(parseInput({ ...ok, focus: ["Food", "x"] }).focus, ["Food"]);
  assert.throws(() => parseInput({ ...ok, type: "x" }));
  assert.throws(() => parseInput({ ...ok, budget: 5 }));
  assert.throws(() => parseInput({ ...ok, date: "2001-01-01" }));
  assert.throws(() => parseInput({ ...ok, city: "  " }));
});
test("built-in plan: exact budget, dated, ordered, every type", () => {
  for (const type of ["wedding", "birthday", "community", "other"]) {
    const i = parseInput({ ...ok, type, focus: ["Food"] });
    const p = normalize(buildFallback(i), i);
    assert.equal(sum(p), i.budget);
    assert.ok(p.timeline.every((t, k) => k === 0 || t.due >= p.timeline[k - 1].due));
    assert.ok(p.vendors.every((v) => v.bookBy >= today() && v.questions.length));
  }
});
test("short notice compresses but never dates before today", () => {
  const i = parseInput({ ...ok, date: addDays(today(), 10) });
  const p = normalize(buildFallback(i), i);
  assert.ok(p.compressed);
  assert.ok(p.timeline.every((t) => t.due >= today()));
  assert.equal(scaler(i.date, today(), 300).due(0), i.date);
});
