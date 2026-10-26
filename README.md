# Jashn: AI event run-sheet planner (MERN, 100% free)

Wedding / birthday / community event in, budget + timeline + vendor WhatsApp drafts out. Then re-plan live ("caterer costs ₹1L more").

## What v3 adds
- **Works with no key.** Gemini down, out of quota or missing? A built-in planner returns the same plan shape (budget, dated timeline, vendors, ideas). Re-planning by sentence still needs Gemini.
- **Real dates.** Tasks and vendor booking deadlines get dates counted back from the event, squeezed in order when time is short. Overdue and due-soon chips.
- **Spend tracker.** Type what you spent per category; see left or over.
- **Re-plan diff.** After "caterer costs ₹1L more", each budget row shows what moved.
- **Priorities.** Pick up to 3 categories to give a larger share. Contingency reserve always included.
- **Vendor questions** to ask, beside the WhatsApp draft.
- **Print / .txt / native share.** Print outputs every section.
- **UI.** New type (Bricolage Grotesque + Geist), one sindoor accent, light and dark. three.js removed (bundle roughly a third of before).
- Fixes: "today" now India time, bad JSON body returns JSON.

## Free stack
| Part | Service | Cost |
|---|---|---|
| AI | Gemini API via Google AI Studio (free tier) | ₹0, rate-limited |
| DB | MongoDB Atlas M0 (optional) | ₹0, 512 MB |
| Host | Render free web service | ₹0, sleeps when idle |
| Fonts, icons | npm packages, self-hosted | ₹0 |

## Run locally
1. `npm install`
2. `cp .env.example .env`, paste key from https://aistudio.google.com/apikey
3. Terminal 1: `npm run dev:server`  Terminal 2: `npm run dev:client`
4. Open http://localhost:5173
No MONGO_URI = plans live in memory (share links die on restart). Fine for dev.

## Deploy (Render free)
1. Push to GitHub.
2. Atlas: create free M0 cluster, DB user, Network Access allow 0.0.0.0/0, copy connection string.
3. Render: New Web Service, connect repo. Build: `npm install && npm run build`. Start: `npm start`.
4. Env vars: GEMINI_API_KEY, MONGO_URI.
5. First hit after idle takes ~30s (free tier wake-up). Warm it before demo.

## Tests
`npm test` (exact budget split, validation, built-in plan for every type, short-notice date squeeze).
