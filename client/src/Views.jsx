import { useEffect, useState } from "react";
import { CopySimple, WhatsappLogo } from "@phosphor-icons/react";
import { inr, dmy, diffDays, phase, status } from "./lib.js";

const Chip = ({ s }) => (s ? <span className={"chip " + s.k}>{s.l}</span> : null);

// Static, decorative sample of the product's own output. Shown before the first plan.
export function Preview() {
  const rows = [["Food and catering", "₹4,35,000", 100], ["Venue and rentals", "₹2,90,000", 67], ["Decor and flowers", "₹1,45,000", 33], ["Contingency", "₹1,30,500", 30]];
  return (
    <div className="preview" aria-hidden="true">
      <div className="sheet">
        <div className="sheet-head"><b>Wedding in Lucknow</b><span>220 guests · ₹14,50,000</span></div>
        <ul>
          {rows.map(([n, a, w], i) => (
            <li key={n} style={{ "--i": i }}><span>{n}</span><b>{a}</b><i style={{ "--w": w + "%" }} /></li>
          ))}
        </ul>
        <ol className="mini">
          <li className="done"><i />12 Dec<span>Book venue and photographer</span></li>
          <li><i />19 Jan<span>Tasting, then book the caterer</span></li>
          <li><i />02 Mar<span>Print and send invitations</span></li>
        </ol>
      </div>
      <div className="bubble"><small>Message to caterer</small>Namaste, I am planning a wedding in Lucknow on 26 Feb for about 220 guests. Could you share availability and a quote?</div>
    </div>
  );
}

const STEPS = ["Splitting the budget", "Dating the timeline", "Drafting vendor messages", "Checking the numbers add up"];
export function Loading({ skeleton }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x + 1) % STEPS.length), 2600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="loading" role="status">
      {skeleton && <><div className="skel" style={{ width: "55%", height: 40 }} /><div className="skel" style={{ width: "88%" }} /><div className="skel" style={{ width: "72%" }} /></>}
      <p><i className="dot" />{STEPS[n]}… <span>Usually 5 to 15 seconds.</span></p>
    </div>
  );
}

export function Budget({ plan, total, spent, setSpent, prev }) {
  const max = Math.max(...plan.budget.map((b) => b.amount), 1);
  const used = plan.budget.reduce((a, b) => a + (spent[b.category] || 0), 0);
  const was = prev && Object.fromEntries(prev.map((b) => [b.category, b.amount]));
  const left = total - used;
  return (
    <>
      <dl className="stats">
        <div><dt>Total</dt><dd>{inr(total)}</dd></div>
        <div><dt>Spent so far</dt><dd>{inr(used)}</dd></div>
        <div className={left < 0 ? "over" : ""}><dt>{left < 0 ? "Over by" : "Left"}</dt><dd>{inr(Math.abs(left))}</dd></div>
      </dl>
      <ul className="rows budget">
        {plan.budget.map((b, i) => {
          const s = spent[b.category] || 0;
          const d = was && b.category in was ? b.amount - was[b.category] : 0;
          return (
            <li key={b.category} style={{ "--i": i }}>
              <div className="line">
                <span className="nm">{b.category}{/contingency/i.test(b.category) && <em>Reserve</em>}</span>
                <b>{inr(b.amount)}</b>
                <span className="pct">{Math.round((b.amount / total) * 100)}%</span>
              </div>
              <div className="track"><i style={{ width: (b.amount / max) * 100 + "%" }} /></div>
              <div className="sub">
                <small>{b.note}{d !== 0 && <span className={"delta " + (d > 0 ? "up" : "down")}> {d > 0 ? "+" : "−"}{inr(Math.abs(d))} since last plan</span>}</small>
                <label className="spent">
                  <span>Spent</span>
                  <input type="number" min="0" step="500" inputMode="numeric" placeholder="₹0" aria-label={"Spent on " + b.category} value={s || ""} onChange={(e) => setSpent(b.category, Math.max(0, Math.round(+e.target.value || 0)))} />
                </label>
                {s > 0 && <span className={"rest" + (s > b.amount ? " over" : "")}>{s > b.amount ? `Over by ${inr(s - b.amount)}` : `${inr(b.amount - s)} left`}</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function Timeline({ plan, done, toggle, now }) {
  const groups = [];
  plan.timeline.forEach((t) => {
    const p = phase(t), g = groups.at(-1);
    g?.p === p ? g.items.push(t) : groups.push({ p, items: [t] });
  });
  const next = plan.timeline.find((t) => !done.has("t:" + t.task))?.task;
  return (
    <>
      {plan.compressed && <p className="note">The event is close, so earlier tasks were squeezed into the time you have left. Order is kept.</p>}
      {groups.map((g) => (
        <section key={g.p} className="phase">
          <h3>{g.p}<span>{g.items.filter((t) => done.has("t:" + t.task)).length}/{g.items.length}</span></h3>
          <ol className="rows">
            {g.items.map((t, i) => {
              const k = "t:" + t.task, isDone = done.has(k);
              return (
                <li key={k} className={t.task === next ? "next" : ""} style={{ "--i": i }}>
                  <label className="check">
                    <input type="checkbox" checked={isDone} onChange={() => toggle(k)} />
                    <span className="when">{t.due ? dmy(t.due) : t.when}</span>
                    <span className="txt">{t.task}</span>
                    <Chip s={status(t.due, isDone, now)} />
                  </label>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </>
  );
}

export function Vendors({ plan, total, done, toggle, copy, now }) {
  const est = plan.vendors.reduce((a, v) => a + (+v.estCost || 0), 0);
  const over = est > total;
  return (
    <>
      <p className={"note" + (over ? " warn" : "")}>
        Estimates add up to {inr(est)}, {Math.round((est / total) * 100)}% of budget{over ? ". Over budget: trim or re-plan." : "."}
      </p>
      <ul className="rows vend">
        {plan.vendors.map((v, i) => {
          const k = "v:" + v.type, booked = done.has(k);
          const d = v.bookBy ? diffDays(now, v.bookBy) : null;
          return (
            <li key={k} style={{ "--i": i }}>
              <label className="check">
                <input type="checkbox" checked={booked} onChange={() => toggle(k)} />
                <span className="vt">{v.type}</span>
                <span className="est">{inr(v.estCost)}</span>
                <Chip s={booked ? { k: "done", l: "Booked" } : d !== null && d < 0 ? { k: "late", l: `Book now, ${-d}d late` } : null} />
              </label>
              <p className="tip">{v.bookBy && <b>Book by {dmy(v.bookBy)}. </b>}{v.tip}</p>
              <details>
                <summary>Questions and message draft</summary>
                {v.questions?.length > 0 && <ul className="qs">{v.questions.map((q) => <li key={q}>{q}</li>)}</ul>}
                <p className="draft">{v.draft}</p>
                <div className="acts">
                  <button type="button" className="ghost" onClick={() => copy(v.draft, "Draft copied")}><CopySimple /> Copy</button>
                  <a className="ghost" href={"https://wa.me/?text=" + encodeURIComponent(v.draft)} target="_blank" rel="noopener noreferrer"><WhatsappLogo /> WhatsApp</a>
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function Ideas({ plan }) {
  return (
    <ol className="ideas">
      {plan.ideas.map((x, i) => (
        <li key={x.title} style={{ "--i": i }}><span className="no">{String(i + 1).padStart(2, "0")}</span><h3>{x.title}</h3><p>{x.desc}</p></li>
      ))}
    </ol>
  );
}
