import { useEffect, useState } from "react";
import { IconContext, ShareNetwork, Printer, DownloadSimple, ArrowClockwise, Warning, Sun, Moon, Sparkle, CalendarCheck, Coins, WhatsappLogo, ArrowsClockwise } from "@phosphor-icons/react";
import { inr, today, addDays, diffDays, dmy, words, toText } from "./lib.js";
import { Preview, Loading, Budget, Timeline, Vendors, Ideas } from "./Views.jsx";

const TYPES = [["wedding", "Wedding"], ["birthday", "Birthday"], ["community", "Community"], ["other", "Other"]];
const FOCUS = ["Food", "Venue", "Decor", "Photography", "Music", "Attire", "Travel and stay"];
const TABS = [["budget", "Budget"], ["timeline", "Timeline"], ["vendors", "Vendors"], ["ideas", "Ideas"]];
const CHIPS = ["Venue costs ₹40,000 more", "Cut the total by 15%", "Make it outdoors", "Add live music"];
const SHARE = /^\/plan\/([0-9a-f]{10})$/;
const WHY = {
  "no-key": "This is the built-in plan. Add a Gemini key on the server for AI plans and re-planning.",
  quota: "AI quota is used up for now, so this is the built-in plan. Try again in a minute.",
  error: "The AI could not answer, so this is the built-in plan. Try again for an AI plan.",
};

async function call(url, opts) {
  const r = await fetch(url, opts);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.error || "Something broke. Try again."), { status: r.status });
  return j;
}

export default function App() {
  const [form, setForm] = useState({ type: "wedding", guests: 150, budget: 800000, city: "", date: "", vibe: "", focus: [] });
  const [data, setData] = useState(null); // { id, input, plan }
  const [tab, setTab] = useState("budget");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // { message, gone }
  const [saved, setSaved] = useState({ done: [], spent: {} });
  const [flash, setFlash] = useState("");
  const [tweak, setTweak] = useState("");
  const [prev, setPrev] = useState(null);
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark");

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try { localStorage.setItem("jashn:theme", dark ? "dark" : "light"); } catch {}
  }, [dark]);

  // Open a shared link.
  useEffect(() => {
    const m = location.pathname.match(SHARE);
    if (!m) return;
    setBusy(true);
    call("/api/plan/" + m[1])
      .then((d) => { setData(d); setForm({ focus: [], ...d.input }); })
      .catch((e) => setError({ message: e.message, gone: e.status === 404 }))
      .finally(() => setBusy(false));
  }, []);

  // Ticks and spend live in this browser, per plan.
  const key = data && "jashn:" + data.id;
  useEffect(() => {
    if (!key) return;
    try {
      const j = JSON.parse(localStorage.getItem(key) || "{}");
      setSaved({ done: Array.isArray(j) ? j : j.done ?? [], spent: (!Array.isArray(j) && j.spent) || {} });
    } catch { setSaved({ done: [], spent: {} }); }
  }, [key]);
  const persist = (next) => {
    setSaved(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
  };
  const done = new Set(saved.done);
  const toggle = (k) => persist({ ...saved, done: done.has(k) ? saved.done.filter((x) => x !== k) : [...saved.done, k] });
  const setSpent = (cat, v) => {
    const spent = { ...saved.spent };
    v > 0 ? (spent[cat] = v) : delete spent[cat];
    persist({ ...saved, spent });
  };

  const now = today();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const pick = (f) => setForm({ ...form, focus: form.focus.includes(f) ? form.focus.filter((x) => x !== f) : [...form.focus, f] });
  const example = () => setForm({ type: "wedding", guests: 220, budget: 1450000, city: "Lucknow", date: addDays(now, 150), vibe: "Garden, evening, live music", focus: ["Food", "Decor"] });

  async function run(extra = {}) {
    const before = data?.plan.budget;
    setBusy(true);
    setError(null);
    try {
      const d = await call("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: form, ...extra }),
      });
      setData(d);
      setPrev(extra.tweak ? before : null);
      setTweak("");
      if (location.pathname !== "/plan/" + d.id) history.pushState(null, "", "/plan/" + d.id);
    } catch (e) {
      setError({ message: e.message });
    } finally {
      setBusy(false);
    }
  }
  const generate = (e) => { e.preventDefault(); run(data ? { id: data.id } : {}); };
  const replan = (text) => {
    const t = (text ?? tweak).trim();
    if (t && data) run({ id: data.id, prev: data.plan, tweak: t });
  };

  async function copy(text, label) {
    try { await navigator.clipboard.writeText(text); setFlash(label); } catch { setFlash("Copy blocked by browser"); }
    setTimeout(() => setFlash(""), 1800);
  }
  const share = () => (navigator.share ? navigator.share({ title: plan.title, url: location.href }).catch(() => {}) : copy(location.href, "Link copied"));
  function download() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([toText(data, done, saved.spent)], { type: "text/plain" }));
    a.download = plan.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  const onTabKey = (e) => {
    const i = TABS.findIndex(([k]) => k === tab);
    const n = { ArrowRight: (i + 1) % TABS.length, ArrowLeft: (i + TABS.length - 1) % TABS.length, Home: 0, End: TABS.length - 1 }[e.key];
    if (n === undefined) return;
    e.preventDefault();
    setTab(TABS[n][0]);
    document.getElementById("t-" + TABS[n][0])?.focus();
  };

  const plan = data?.plan;
  const total = data?.input.budget;
  const count = plan && {
    timeline: `${plan.timeline.filter((t) => done.has("t:" + t.task)).length}/${plan.timeline.length}`,
    vendors: `${plan.vendors.filter((v) => done.has("v:" + v.type)).length}/${plan.vendors.length}`,
  };
  const daysLeft = data && diffDays(now, data.input.date);

  return (
    <IconContext.Provider value={{ weight: "bold", size: "1.1em" }}>
      <div className="app">
        <a className="skip" href="#main">Skip to content</a>
        <header className="top">
          <span className="mark"><i aria-hidden="true" />Jashn<span className="deva" lang="hi" aria-hidden="true">जश्न</span></span>
          <span className="tag">Event run-sheet planner</span>
          <button type="button" className="theme" onClick={() => setDark(!dark)} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
            {dark ? <Sun /> : <Moon />}
          </button>
        </header>

        <main className="grid" id="main">
          <form className="brief" onSubmit={generate}>
            <div className="brief-head">
              <h2>The brief</h2>
              <button type="button" className="link" onClick={example}><Sparkle /> Fill an example</button>
            </div>
            <fieldset className="seg">
              <legend>Occasion</legend>
              {TYPES.map(([v, l]) => (
                <label key={v}>
                  <input type="radio" name="type" value={v} checked={form.type === v} onChange={set("type")} />
                  <span>{l}</span>
                </label>
              ))}
            </fieldset>
            <div className="pair">
              <label className="field">Guests
                <input type="number" min="1" max="5000" inputMode="numeric" required value={form.guests} onChange={set("guests")} />
              </label>
              <label className="field">Event date
                <input type="date" required min={now} value={form.date} onChange={set("date")} />
              </label>
            </div>
            <label className="field">Total budget (₹)
              <input type="number" min="1000" step="1000" inputMode="numeric" required value={form.budget} onChange={set("budget")} />
              <small>{inr(form.budget)}{words(form.budget) && ` · ${words(form.budget)}`}</small>
            </label>
            <label className="field">City
              <input type="text" required maxLength="60" placeholder="e.g. Lucknow" value={form.city} onChange={set("city")} />
            </label>
            <label className="field"><span>Vibe <span className="opt">optional</span></span>
              <input type="text" maxLength="120" placeholder="Intimate, garden, live music…" value={form.vibe} onChange={set("vibe")} />
            </label>
            <fieldset className="focus">
              <legend>Spend more on <span className="opt">pick up to 3</span></legend>
              {FOCUS.map((f) => (
                <label key={f}>
                  <input type="checkbox" checked={form.focus.includes(f)} disabled={!form.focus.includes(f) && form.focus.length >= 3} onChange={() => pick(f)} />
                  <span>{f}</span>
                </label>
              ))}
            </fieldset>
            <button className="primary" disabled={busy}>{busy ? "Planning…" : data ? "Rebuild from brief" : "Build my run-sheet"}</button>
          </form>

          <section className="out" aria-busy={busy}>
            {error && (
              <p className="err" role="alert">
                <Warning /> <span>{error.message}{error.gone && <> <a href="/">Start a new plan</a></>}</span>
              </p>
            )}

            {!plan && !busy && !error?.gone && (
              <div className="empty">
                <div className="copy">
                  <span className="eyebrow">Weddings, birthdays, community events</span>
                  <h1>Tell us the occasion. Get the <span className="nb">run-sheet.</span></h1>
                  <p>A budget split that adds up, a timeline with real dates, vendor messages ready for WhatsApp. Then change your mind as often as real life does.</p>
                  <button type="button" className="ghost" onClick={example}><Sparkle /> Try it with an example</button>
                </div>
                <Preview />
                <ul className="points">
                  <li><Coins /><b>Adds up</b><span>Every rupee of the budget is placed.</span></li>
                  <li><CalendarCheck /><b>Real dates</b><span>Overdue and due-soon flagged.</span></li>
                  <li><WhatsappLogo /><b>Vendor messages</b><span>Drafts and questions to ask.</span></li>
                  <li><ArrowsClockwise /><b>Re-plan</b><span>"Caterer wants ₹1L more" is enough.</span></li>
                </ul>
              </div>
            )}

            {busy && !plan && <Loading skeleton />}

            {plan && (
              <div className={busy ? "dim" : ""}>
                {busy && <Loading />}
                <div className="head">
                  <div>
                    <h1>{plan.title}</h1>
                    <p className="sum">{plan.summary}</p>
                    <dl className="facts">
                      <div><dt>Date</dt><dd>{dmy(data.input.date, 1)}</dd></div>
                      <div><dt>{daysLeft < 0 ? "Passed" : "To go"}</dt><dd>{Math.abs(daysLeft)} days</dd></div>
                      <div><dt>Guests</dt><dd>{data.input.guests}</dd></div>
                      <div><dt>Per guest</dt><dd>{inr(Math.round(total / data.input.guests))}</dd></div>
                    </dl>
                  </div>
                  <div className="tools">
                    <button type="button" className="ghost" onClick={share}><ShareNetwork /> Share</button>
                    <button type="button" className="ghost" onClick={() => window.print()}><Printer /> Print</button>
                    <button type="button" className="ghost" onClick={download}><DownloadSimple /> .txt</button>
                  </div>
                </div>

                {plan.source === "builtin" && <p className="note">{WHY[plan.why] ?? WHY.error}</p>}
                {plan.changes?.length > 0 && (
                  <aside className="changes" aria-label="What changed">
                    <strong>What changed</strong>
                    <ul>{plan.changes.map((c, i) => <li key={i}>{c}</li>)}</ul>
                  </aside>
                )}

                <div className="tabs" role="tablist" onKeyDown={onTabKey}>
                  {TABS.map(([k, l]) => (
                    <button key={k} type="button" role="tab" id={"t-" + k} aria-selected={tab === k} aria-controls={"p-" + k} tabIndex={tab === k ? 0 : -1} onClick={() => setTab(k)}>
                      {l}{count?.[k] && <small>{count[k]}</small>}
                    </button>
                  ))}
                </div>

                {[
                  ["budget", <Budget plan={plan} total={total} spent={saved.spent} setSpent={setSpent} prev={prev} />],
                  ["timeline", <Timeline plan={plan} done={done} toggle={toggle} now={now} />],
                  ["vendors", <Vendors plan={plan} total={total} done={done} toggle={toggle} copy={copy} now={now} />],
                  ["ideas", <Ideas plan={plan} />],
                ].map(([k, view]) => (
                  <div key={k} id={"p-" + k} role="tabpanel" aria-labelledby={"t-" + k} hidden={tab !== k}>
                    <h2 className="print-h">{TABS.find(([x]) => x === k)[1]}</h2>
                    {view}
                  </div>
                ))}

                <form className="replan" onSubmit={(e) => { e.preventDefault(); replan(); }}>
                  <div className="chips">
                    {CHIPS.map((c) => <button type="button" key={c} disabled={busy} onClick={() => replan(c)}>{c}</button>)}
                  </div>
                  <div className="bar-row">
                    <input type="text" maxLength="300" aria-label="What changed?" placeholder="Something changed? e.g. caterer wants ₹1L more" value={tweak} onChange={(e) => setTweak(e.target.value)} />
                    <button className="primary" disabled={busy || !tweak.trim()}><ArrowClockwise /> Re-plan</button>
                  </div>
                </form>
              </div>
            )}
            <p className="foot">AI estimates, not quotes. Confirm every price and date with the vendor. Ticks and spend stay in this browser.</p>
          </section>
        </main>
        <p className="toast" role="status" aria-live="polite">{flash}</p>
      </div>
    </IconContext.Provider>
  );
}
