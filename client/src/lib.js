const DAY = 864e5;
const ms = (s) => Date.parse(s + "T00:00:00Z");

export const inr = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
// Plans are dated in India; the browser's own zone must not shift "today".
export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
export const addDays = (iso, n) => new Date(ms(iso) + n * DAY).toISOString().slice(0, 10);
export const diffDays = (a, b) => Math.round((ms(b) - ms(a)) / DAY);
export const dmy = (iso, year) =>
  new Date(ms(iso)).toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" });

export const words = (n) =>
  n >= 1e7 ? `${+(n / 1e7).toFixed(2)} crore` : n >= 1e5 ? `${+(n / 1e5).toFixed(2)} lakh` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)} thousand` : "";

// Which stretch of the plan a task sits in, by how early it is relative to the longest lead time.
export function phase(t) {
  const n = t.daysBefore;
  if (typeof n !== "number") return "Timeline";
  if (n < 0) return "After the event";
  if (n <= 7) return "Event week";
  const p = n / (t.span || n);
  return p >= 2 / 3 ? "Early planning" : p >= 1 / 3 ? "Booking and design" : "Final preparations";
}

// Chip for a dated item: null when it is comfortably in the future.
export function status(due, done, now) {
  if (done) return { k: "done", l: "Done" };
  if (!due) return null;
  const d = diffDays(now, due);
  if (d < 0) return { k: "late", l: `Overdue ${-d}d` };
  if (d === 0) return { k: "soon", l: "Today" };
  if (d <= 7) return { k: "soon", l: `In ${d}d` };
  return null;
}

export function toText({ plan, input }, done, spent) {
  const L = [plan.title, plan.summary, "", `BUDGET (total ${inr(input.budget)})`];
  plan.budget.forEach((b) => L.push(`- ${b.category}: ${inr(b.amount)}${spent[b.category] ? ` (spent ${inr(spent[b.category])})` : ""}`));
  L.push("", "TIMELINE");
  plan.timeline.forEach((t) => L.push(`[${done.has("t:" + t.task) ? "x" : " "}] ${t.due ? dmy(t.due, 1) : t.when}  ${t.task}`));
  L.push("", "VENDORS");
  plan.vendors.forEach((v) => {
    L.push(`[${done.has("v:" + v.type) ? "x" : " "}] ${v.type} (est ${inr(v.estCost)}${v.bookBy ? `, book by ${dmy(v.bookBy, 1)}` : ""})`, `    Tip: ${v.tip}`);
    (v.questions ?? []).forEach((q) => L.push(`    Ask: ${q}`));
  });
  L.push("", "IDEAS");
  plan.ideas.forEach((x) => L.push(`- ${x.title}: ${x.desc}`));
  L.push("", "AI estimates, not quotes. Confirm every price and date with the vendor.");
  return L.join("\n");
}
