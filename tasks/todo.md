# Task: News scan + content refresh + deploy — 2026-07-09 12:00 UTC

## Context
- Site content was stamped `2026-07-09 00:00 UTC` — 12 hours stale, one full overnight session.
- Recon (`esat-erginsoy-recon`) + a direct sweep of all four configured Finnhub endpoints found two
  genuinely new drivers, plus **five factual errors already live on the site**.
- The two meaningful changes: **Iran retaliated**, firing on US targets in Bahrain/Kuwait/Qatar; and
  the **crypto cohort flipped from "red across the board" to steadying** (BTC +0.88%, back above $62.7K).

## Plan
- [x] Scan configured sources: Finnhub general + crypto + 10 company feeds + Binance spot quotes
- [x] Recon: web-source the gaps Finnhub doesn't carry (Asia/Europe closes, oil, world desk, sports)
- [x] Verify epoch→UTC on the quote snapshot (t=1783598478 → 2026-07-09 12:01 UTC ✓)
- [x] Reconcile the megacap-gap arithmetic against the two sourced caps
- [x] Rewrite `app/api/news/route.ts` CORE + FALLBACK_NEWS
- [x] Rewrite `app/api/crypto/route.ts` FALLBACK_QUOTES from live spot
- [x] `npm run build` — green
- [x] Verify routes actually serve the new content (not just that it compiles)
- [x] Commit + push to main (Vercel auto-deploys)

## Verified facts used (every figure traceable)
| Fact | Value | Source |
|---|---|---|
| Wed Jul 8 DOW / S&P / NASDAQ | 52,348.39 −1.09% / 7,482.71 −0.28% / 25,870.65 +0.20% | Reuters, Yahoo, TheStreet (unchanged, re-verified) |
| Iran retaliation | Fired at Bahrain, Kuwait, Qatar; "hit US military targets in Gulf" | Reuters 10:33 UTC + AP wire + Al Jazeera (3 independent) |
| US strikes | ~90 targets incl. Chabahar port, Bushehr | Al Jazeera, Gulf News |
| Khamenei | **Buried today**, culmination of mass funeral | Reuters 11:25 UTC |
| Nikkei / Hang Seng | +1.6% → 67,849.98 / −0.7% → 24,030.18 | AP wire |
| Brent | ~$78.21 now; Wed ~+5% → ~$77.92 | Trading Economics |
| BTC/ETH/SOL/XRP | 62,776.16 / 1,743.56 / 77.62 / 1.0931 | Finnhub live spot, t=2026-07-09 12:01 UTC |
| Global crypto mcap | $2.239T, +0.72% 24h, BTC dom 56.1% | CoinGecko `/global` (live) |
| Fear & Greed | 22 (Extreme Fear) | alternative.me `/fng` (live) |
| Megacaps | NVDA ~$4.74T, AAPL ~$4.59T, GOOGL #3 | Motley Fool research, Yahoo, Qz |
| Ukraine (Jul 8) | 169 drones, 7 missiles, 4 killed; Kyiv hit 2nd straight day | Washington Times / WaPo (AP) |
| Apple–Broadcom | $30B US chip-production deal | Yahoo via Finnhub company-news, 09:18 UTC |

### Corrections made to previously-published claims
1. **NVDA ~$4.74T, not $4.94T.** Last cycle took $4.94T from CompaniesMarketCap. Two independent
   sources now put it at $4.736–4.75T, and the widely-reported "Apple ~$190B / ~4% behind" gap only
   reconciles with NVDA ≈ $4.75T against AAPL $4.592T — it does *not* reconcile with $4.94T (that
   would imply a $350B gap). Went with the two directly-sourced caps.
2. **Ukraine barrage figures were stale.** "68 missiles / 351 drones / ~19 killed" describes the
   **Jul 2** attack, not the current one. Jul 8: 169 drones, 7 missiles (5 ballistic), 4 killed.
3. **Brent** ~+5% to ~$77.92 (Wed settle), not +5.43% to $78.19.
4. **CENTCOM target count** now reported as ~90, not "80+".
5. **Khamenei** — procession → **burial today**. Superseded, not merely restated.

### Arithmetic reconciliation
Yahoo's "$190B gap" and Motley Fool's caps disagree by ~$40B (measured at different intraday moments).
Rather than publish a derived figure that contradicts my own two sourced numbers, the gap is stated
qualitatively ("closing fast" / "closing the gap") and only the two caps are asserted.

### Deliberately NOT asserted (unverified — dropped rather than guessed)
Each of these was live on the site and could **not** be re-sourced this cycle. Dropped, not repeated:
- "War insurers advise shipowners to pause voyages" / "four tankers turned back" / "Qatari LNG tanker
  awaits salvage off Oman" → replaced with the three tankers named by Gulf News (Al Rekayyat, Wedyan,
  Cyprus Prosperity) and Tehran's "Iranian arrangements" line.
- **"Czechia opts out of the European €70B Ukraine package"** — no source. Live reporting references a
  €90B Ukraine Support Loan instead. Retired entirely.
- NVDA "forward P/E lowest since 2019" — no refreshing source.
- "Big tech 2026 capex ~$725B +77% Y/Y" — no source.
- Meta Alberta C$13B data center / Amazon $25B bond sale / Google prediction-market ban / Netflix–Disney
  World Cup rights / Coinbase premium record lows — none re-sourced; swapped for same-ticker items that
  *are* sourced (Meta–Capital Power 250MW, Anthropic IPO early investors, Netflix lifestyle content).
- IMF US +2.3% / Europe +0.9% country splits — one outlet says the US forecast held steady. Kept only
  the headline 3.0% / 3.1% / 3.4% figures.
- US equity futures levels — Esat's readings were internally inconsistent (S&P fut +0.22% vs Nasdaq fut
  +0.84%, and the Nasdaq futures level quoted was NDX, not the Composite the tape carries). Futures also
  move minute-to-minute. Left out entirely rather than published stale.
- **France vs Morocco has NOT been played** (kicks off Jul 9 20:00 UTC, Boston). Reported as upcoming.

## Review

### Content refresh
Rewrote `CORE` + all 24 `FALLBACK_NEWS` items and `FALLBACK_QUOTES` for 2026-07-09 12:00 UTC. The tape
pivots from "overnight risk-off, cohort red across the board" to a **pre-bell tape**: US cash reopens
13:30 UTC, Iran has fired back at Gulf targets, Asia closed mixed on chip strength, and crypto is
steadying despite Fear & Greed still reading 22. Eight unverified claims were retired (see above) and
replaced with sourced same-ticker items.

### Note on the standing Data Cache fix
The `{ cache: 'no-store' }` guard added last cycle still holds: the live path returned fresh spot
(BTC 62,768.91) rather than a months-old cached quote. No regression.

### Verification performed
- [x] `npm run build` green (twice: after content, after the megacap-arithmetic fix)
- [x] Fallback path (key blanked): `source: fallback`, 24 headlines, **0** stale `00:00 UTC` stamps,
      24/24 correct `12:00 UTC` stamps, quotes match the 12:01 UTC live spot
- [x] Automated check that all 8 retired claims are absent from the served payload
- [x] Live path (real key): `source: finnhub`, fresh Reuters Iran headlines, spot within a few dollars
      of the snapshot (drift over ~10 min, as expected), no runtime errors in the server log
- [x] Homepage HTTP 200
- [x] Megacap gap reconciled arithmetically; contradictory derived figure dropped rather than published
