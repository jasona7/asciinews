# Task: News scan + content refresh + deploy — 2026-07-09 00:00 UTC

## Context
- Site content was stamped `2026-07-08 00:00 UTC` — one full day (and one full US cash session) stale.
- Recon (2x esat-erginsoy-recon) found the market narrative has **flipped**: the Samsung-AI-miss /
  DeepSeek-chip-report rout the site was running is dead, superseded by a **US–Iran war re-escalation**.

## Plan
- [x] Confirm Finnhub key is live; snapshot all configured feeds to `/tmp/asciinews-scan/`
- [x] Recon #1: scan Finnhub general + crypto + 10 company feeds for new/emerging stories
- [x] Recon #2: web-source the gaps Finnhub doesn't carry (index closes, oil, world desk, sports)
- [x] Verify epoch→UTC conversions (caught a local-tz slip in recon #1's quote timestamps)
- [x] Reconcile the index point-change conflict arithmetically against Tuesday's closes
- [ ] Rewrite `app/api/news/route.ts` CORE + FALLBACK_NEWS
- [ ] Rewrite `app/api/crypto/route.ts` FALLBACK_QUOTES from live spot
- [ ] `npm run build` — fix any errors, retry until green
- [ ] Verify routes actually serve the new content (not just that it compiles)
- [ ] Commit + push to main (Vercel auto-deploys)

## Verified facts used (every figure traceable)
| Fact | Value | Source |
|---|---|---|
| Wed Jul 8 DOW | 52,348.39 / −576.76 / −1.09% | Reuters, Motley Fool, Investing.com (levels agree 3/3) |
| Wed Jul 8 S&P 500 | 7,482.71 / −21.14 / −0.28% | same |
| Wed Jul 8 NASDAQ | 25,870.65 / +51.96 / **+0.20% (GREEN)** | same |
| Brent | +5.43% → ~$78.19 | Reuters via US News |
| BTC/ETH/SOL/XRP | 62,252.95 / 1,742.71 / 77.77 / 1.0907 | Finnhub live spot, t=2026-07-09 00:01 UTC |
| Fear & Greed | 20 (Extreme Fear), was 23 | CoinMarketCap / feargreedmeter |
| Megacaps | NVDA 4.94T, AAPL 4.60T, GOOGL 4.38T, MSFT **2.85T** | CompaniesMarketCap (live) |
| Fed | 3.50–3.75%, Warsh, FOMC Jul 28–29, CPI Jul 14 | Fed statement + BLS schedule |
| Khamenei | Confirmed dead (killed Feb 28 2026); funeral procession into Iraq | Al Jazeera, NPR, The Hill |
| IMF | 2026 growth cut to 3.0% from 3.1%; 3.4% in 2027 | Reuters/Yahoo/Taipei Times |

### Corrections made to previously-published claims
1. **Nasdaq closed UP +0.20%** — a naive "everything fell" tape would have been wrong.
2. **MSFT ~$2.85T**, not $3.28T (site overstated by ~$430B).
3. **NVDA ~$4.94T**, not $4.7T.
4. **Fear & Greed 20**, not 23.

### Deliberately NOT asserted (unverified — dropped rather than guessed)
- Exact WTI settlement (sources spread $73.52–$74.29). Used Brent only.
- R16 scorelines (Belgium 4–1 USA; Norway–Brazil). Advancement confirmed; scores not. Dropped scores.
- **France vs Morocco has NOT been played** (kicks off Jul 9 20:00 GMT). Reported as upcoming.
- NVDA "denies Kyber NVL144 slips to 2028" + Samsung/DeepSeek — no refreshing source; retired.
- China sub missile test / Venezuela quake / Vatican SSPX — not refreshed this cycle; retired rather
  than re-asserted as current.

## Review

### Content refresh
Rewrote `CORE` + all 24 `FALLBACK_NEWS` items and `FALLBACK_QUOTES` for 2026-07-09 00:00 UTC.
The tape's driver changed completely: the Samsung-AI-miss / DeepSeek-chip rout was retired and
replaced with the Iran ceasefire collapse, the oil/Hormuz shock, NATO Ankara, and the IMF downgrade.
Added AMZN + GOOGL + NFLX desk items (previously uncovered tickers).

### Bug found and fixed while verifying (not in the original scope)
`npm run build` passed, but exercising the **live** API path revealed `/api/crypto` serving
**BTC $95,269.52 (+4.31%)** — a real quote from **2026-01-14**, ~6 months stale.

Root cause: both routes called `fetch()` with no cache directive. Next.js stored those responses in
its **Data Cache with `revalidate: 31536000` (one year)**. `export const dynamic = 'force-dynamic'`
governs route rendering and did *not* suppress it. Once populated, the routes served January prices
indefinitely — silently, since `source` still reported `"finnhub"`.

Confirmed by decoding `.next/cache/fetch-cache`: the served payload matched the cached body byte for
byte. Clearing the cache restored live prices; that isolated the cache as the sole cause.

Fix: `{ cache: 'no-store' }` on all four outbound Finnhub fetches (1 in crypto, 3 in news). Each
route already maintains its own in-memory cache (15 min / 5 min) — that is the intended and only
caching layer. Verified by restoring the poisoned cache and confirming the fixed code returns live
prices anyway.

**Scope of the impact — do not overstate.** Checked production *before* deploying: `asciinews.vercel.app`
was serving live, correct prices (BTC 62,163.59) on the old code. So this was **not** a live production
outage. The 6-month-stale reproduction was local, where `.next/cache/fetch-cache` had persisted on disk
since 2026-01-14. Vercel's build cache behaves differently and prod was evidently repopulating.

The fix is still worth it: a `revalidate: 31536000` entry sitting under a route whose whole purpose is
live prices is a latent trap that depends on cache-lifetime behavior nobody controls, and it fails
*silently* (`source` still reads `"finnhub"`). Making the intent explicit costs one option object.
Verified post-deploy: prod still serves live prices, homepage 200.

### Verification performed
- [x] `npm run build` green (twice: after content, after fix)
- [x] Fallback path (no key): 24 headlines, 0 stale date stamps, quotes match live spot
- [x] Live path (real key): `source: finnhub`, fresh Iran/Broadcom headlines, no runtime errors
- [x] Live path with a *deliberately poisoned* fetch-cache: returns live prices → fix holds
- [x] Index point-changes reconciled arithmetically against Tuesday's closes (resolved a source conflict)
