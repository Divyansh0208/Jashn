import dns from "node:dns";
// Atlas SRV lookups fail on some home/ISP resolvers; public DNS avoids that.
dns.setServers(["8.8.8.8", "1.1.1.1"]);

import express from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";
import { schema, SYSTEM, parseInput, prompt, normalize, bad, cleanPrev } from "./plan.js";
import { buildFallback } from "./fallback.js";

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
// Primary model first, then backups used when Google is overloaded or the model is unavailable.
const MODELS = [MODEL, "gemini-3.6-flash", "gemini-2.5-flash"].filter((m, i, a) => a.indexOf(m) === i);
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
const ID = /^[0-9a-f]{10}$/;

// Storage: Mongo Atlas free tier if it connects, else in-memory (lost on restart).
const mem = new Map();
let Plan = null;
if (process.env.MONGO_URI) {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    Plan = mongoose.model("Plan", new mongoose.Schema({ _id: String, input: Object, plan: Object }, { timestamps: true }));
    console.log("Mongo connected");
  } catch (e) {
    console.error("Mongo failed, using memory instead:", e.message);
  }
}
const save = (id, doc) =>
  Plan ? Plan.findByIdAndUpdate(id, { $set: doc }, { upsert: true }) : mem.set(id, doc);
const load = (id) => (Plan ? Plan.findById(id).lean() : mem.get(id));

// Gemini call with retry. Transient errors (429/500/503): retry the same model once,
// then move to the next backup model. Other errors skip straight to the next model.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TRANSIENT = [429, 500, 503];
async function generate(contents) {
  let last;
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await ai.models.generateContent({
          model,
          contents,
          config: { systemInstruction: SYSTEM, responseMimeType: "application/json", responseSchema: schema, temperature: 0.7 },
        });
        return { r, model };
      } catch (e) {
        last = e;
        console.error(`Gemini ${model} attempt ${attempt + 1} failed:`, e.status ?? "", String(e.message).slice(0, 200));
        if (!TRANSIENT.includes(e.status)) break; // not transient: try next model
        await sleep(800 * (attempt + 1));
      }
    }
  }
  throw last;
}

// Protect the free Gemini quota: 8 plans per minute per IP (in-memory, per instance).
const hits = new Map();
setInterval(() => hits.clear(), 10 * 60_000).unref();
const limit = (req, res, next) => {
  const now = Date.now();
  const recent = (hits.get(req.ip) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= 8) return res.status(429).json({ error: "Slow down: 8 plans per minute." });
  hits.set(req.ip, [...recent, now]);
  next();
};

const app = express();
app.set("trust proxy", 1);
// CSP off: the page uses an inline theme script. Other helmet headers stay on.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "50kb" }));

app.post("/api/plan", limit, async (req, res) => {
  try {
    const body = req.body ?? {};
    const input = parseInput(body.input);
    const { prev, tweak, id: given } = body;
    let safePrev;
    if (tweak !== undefined) {
      if (typeof tweak !== "string" || tweak.length > 300) throw bad("Change request: max 300 characters.");
      if (!prev || typeof prev !== "object" || JSON.stringify(prev).length > 20000) throw bad("Missing current plan.");
      if (!ai) throw bad("Re-planning needs the AI key. Add GEMINI_API_KEY on the server.");
      safePrev = cleanPrev(prev); // whitelist fields and lengths before it reaches the prompt
    }
    let plan, source = "ai", why;
    try {
      if (!ai) throw Object.assign(new Error("no key"), { why: "no-key" });
      const { r, model } = await generate(prompt(input, safePrev, tweak));
      plan = normalize(JSON.parse(r.text), input);
      plan.model = model;
    } catch (e) {
      if (tweak !== undefined) throw e; // a sentence can't be re-planned without the AI
      why = e.why ?? (e.status === 429 ? "quota" : "error");
      if (why !== "no-key") console.error("AI failed, using built-in plan:", e.message);
      plan = normalize(buildFallback(input), input);
      source = "builtin";
    }
    const id = ID.test(given) ? given : crypto.randomBytes(5).toString("hex");
    plan = { ...plan, source, why };
    await save(id, { input, plan });
    res.json({ id, input, plan });
  } catch (e) {
    if (e.client) return res.status(400).json({ error: e.message });
    console.error(e);
    if (e.status === 429) return res.status(429).json({ error: "Free AI quota hit. Wait a minute and retry." });
    if (e.status === 503) return res.status(503).json({ error: "AI is busy right now. Try again in a few seconds." });
    res.status(502).json({ error: "The planner stumbled. Try again." });
  }
});

app.get("/api/plan/:id", async (req, res) => {
  const doc = ID.test(req.params.id) && (await load(req.params.id));
  if (!doc) return res.status(404).json({ error: "Plan not found. Free hosting may have restarted." });
  res.json({ id: req.params.id, input: doc.input, plan: doc.plan });
});

app.use((e, _req, res, next) => (e.type === "entity.parse.failed" ? res.status(400).json({ error: "Bad request body." }) : next(e)));
app.use(express.static(dist));
app.use((_, res) => res.sendFile(path.join(dist, "index.html")));

app.listen(process.env.PORT || 3000, () => console.log("Jashn on :" + (process.env.PORT || 3000)));
