# AIgnited Terminal — Bloomberg Killer Upgrade Plan
_Written by Jarvis, 2026-03-27_

## Vision
Build Indonesia's Bloomberg Terminal. One product. Everything integrated.
`terminal.aignited.id` is the hub — every feature we build lives here.

**Current state:** React + Cloudflare Worker + Market API (Rust)
**Target:** Full-featured equities terminal rivaling Bloomberg/Refinitiv for IDX

---

## What's Already Live

| Feature | Status | Location |
|---------|--------|----------|
| Market Dashboard | ✅ Live | `/` |
| Stock Detail + Charts | ✅ Live | `/stock/:symbol` |
| Financials | ✅ Live | `/stock/:symbol/financials` |
| IDX Screener | ✅ Live | `/idx/screener` |
| IDX Insiders (Power Map) | ✅ Live | `/idx/insiders`, `/idx/entities` |
| Broker Flow Analysis | ✅ Live | `/idx/flow` |
| Market Movers | ✅ Live | `/idx/movers` |
| Watchlist | ✅ Live | `/watchlist` |
| Charts | ✅ Live | `/charts` |
| **Signal Radar** | ✅ Live | `/signals` |

---

## Upgrade Roadmap

### Phase 1 — Signal Intelligence (DONE ✅)
- 15-strategy consensus engine (Rust, 956 tickers)
- API: `fiskal-api.aignited.id/api/v1/consensus/*`
- `/signals` page: summary cards, buy/sell tables, ticker detail
- Daily cron: 16:15 WIB Mon-Fri

### Phase 2 — Macro Intelligence (Fiskal Integration)
**Goal:** Add Indonesia fiscal/macro data as a tab

**What to build:**
- New route: `/macro`
- Debt clock widget (embeds `fiskal.aignited.id` data)
- Key macro indicators: GDP growth, inflation, debt-to-GDP, APBN realization
- K/L budget vs realization chart
- Source: `fiskal-api.aignited.id`

**Effort:** 3-4 days

---

### Phase 4 — Consensus Engine Upgrade (15 → 50 strategies)
**Goal:** Deeper signal quality

**New strategies to add:**
- Volume spike anomaly
- Foreign net buy/sell accumulation (from broker flow data)
- Insider accumulation (from IDX insider data)
- Sector rotation momentum
- Market breadth divergence
- Options-implied volatility skew (when data available)
- Price/volume divergence
- 52-week high/low proximity
- Gap-up/down follow-through

**Effort:** 1 week per 5 strategies

---

### Phase 5 — Real-Time Signals (WebSocket push)
**Goal:** Signals update live during trading hours

**Architecture:**
```
Market API (price feed WebSocket)
    ↓
Consensus Engine sidecar (systemd service)
    ↓ recomputes on price change
Market API /api/v1/consensus/stream (WebSocket)
    ↓
Terminal /signals page (live updates, no polling)
```

**New endpoints needed on Market API:**
- `GET /api/v1/consensus/stream` — WebSocket for real-time signal updates

**Effort:** 1 week

---

### Phase 6 — Paper Trading League
**Goal:** Gamified competition using signals as strategy basis

**Architecture:**
- Backend: Hono on Cloudflare Workers → `play-api.aignited.id`
- Frontend: New section at `/play` in Terminal
- DB: Neon PostgreSQL — portfolios, trades, leaderboard
- Auth: Telegram login (OAuth via bot)
- Data: Market API for prices, consensus engine for strategy performance

**Features:**
- Create virtual portfolio (Rp 100M starting capital)
- Trade any IDX stock (market/limit orders, simulated fills)
- Leaderboard: weekly + all-time
- "Strategy mode": auto-trade based on consensus signals
- Weekly summary video (ReelForge → YouTube)

**Effort:** 4-5 weeks

---

### Phase 7 — Premium Tier + Paywall
**Goal:** Monetize the terminal

**Free tier:**
- Dashboard, basic charts, top 10 signals, movers
- IDX City (basic view)

**Premium (Rp 99K/month):**
- Full 956-ticker signal radar
- Real-time signals (WebSocket)
- Broker flow analysis
- Insider data
- Paper Trading League
- Fiskal macro data
- Historical signal performance / backtest

**Payment:** Xendit (Indonesian payment gateway, supports VA/QRIS/cards)

**Auth:** Telegram OAuth or email magic link (Resend)

**Effort:** 2-3 weeks

---

## Tech Stack (current + planned)

| Layer | Current | Planned |
|-------|---------|---------|
| Frontend | React + Vite + Tailwind | Same + more pages |
| Deployment | Cloudflare Worker | Same |
| Market data | Rust market-api (Docker) | Same + signal endpoints |
| Consensus | Rust consensus-engine (VPS) | Same + RT WebSocket |
| Macro data | Rust fiskal-api (Docker) | Same |
| Auth | None | Telegram OAuth |
| Payments | None | Xendit |
| DB | Neon PostgreSQL | Same |

---

## Priority Order (what to build next)

1. ✅ **Signals tab** — DONE
2. 🔲 **Macro tab** — Phase 2, quick win (3-4 days)
3. 🔲 **More strategies** — Phase 3, ongoing
4. 🔲 **Real-time signals** — Phase 4
5. 🔲 **Paper Trading** — Phase 5
6. 🔲 **Paywall** — Phase 6, last (need users first)

---

## Repo
- Terminal: `galohot/terminal-aignited`
- IDX City: `galohot/idx-city`
- Market API: `~/market-api/` (Docker container on VPS)
- Consensus Engine: `~/consensus-engine/` (binary on VPS)
- Fiskal API: `~/fiskal-api/` (Docker container on VPS)

---

## Notes
- Always deploy terminal via `wrangler deploy` (not Pages — it's a Worker with assets)
- `terminal.aignited.id` CNAME → Cloudflare Worker
- Never break existing pages when adding new ones
- Match existing dark terminal theme for all new pages
