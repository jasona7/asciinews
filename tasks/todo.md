# Task: News scan + content refresh + deploy — 2026-07-10 00:00 UTC

## Context
- Site content was stamped `2026-07-09 12:00 UTC` — 12 hours stale.
- The live tape says **"PRE-BELL / US-CASH-REOPENS-TODAY-13:30-UTC"**. That session has since opened,
  run, and **closed**. Every "pre-bell" framing on the site is now false.
- Recon (`esat-erginsoy-recon`) mapped the plumbing; a direct sweep of all four Finnhub endpoints
  (general, crypto, 11 company feeds, Binance spot) plus CoinGecko `/global` and alternative.me `/fng`
  supplied the live figures.

## The pivot
Yesterday's tape: *overnight risk-off, Iran fires back, cohort steadying.*
Tonight's tape: **risk-ON into the close.** Trump said Iran "wants to make a deal", BTC broke $63K on
those comments, and a chip surge (SK Hynix's 7x-oversubscribed $28B ADR, AMD's gigascale AI campus)
drove the Nasdaq sharply higher — *even as* Iran struck Gulf targets and fired ten ballistic missiles
at Jordan's Azraq air base, and Khamenei was buried.

## Plan
- [x] Scan configured sources: Finnhub general + crypto + company feeds + Binance spot quotes
- [x] Fetch CoinGecko `/global` + alternative.me `/fng` live
- [x] Verify epoch→UTC on the quote snapshot
- [x] Baseline `npm run build` green *before* touching content
- [x] Source the gaps Finnhub doesn't carry (index closes, oil settle, gold, megacaps, sports, world)
- [x] Rewrite `app/api/news/route.ts` CORE + FALLBACK_NEWS
- [x] Rewrite `app/api/crypto/route.ts` FALLBACK_QUOTES from one atomic spot snapshot
- [x] `npm run build` — green
- [x] Verify routes actually *serve* the new content (not just that it compiles)
- [x] Commit + push to main (Vercel auto-deploys)

## Live figures captured this cycle (traceable)
| Fact | Value | Source |
|---|---|---|
| BTC / ETH / SOL / XRP spot | 63,220.00 / 1,744.31 / 78.03 / 1.0925 | Finnhub Binance spot, t=1783641910 → 2026-07-10 00:05 UTC |
| Global crypto mcap | $2.253T, +0.96% 24h | CoinGecko `/global` (live) |
| BTC dominance | 56.29% | CoinGecko `/global` (live) |
| Fear & Greed | 23 (Extreme Fear), up from 22 | alternative.me `/fng` (live) |
| Nasdaq Thursday | "ends sharply higher; chip surge offsets Iran worries" | Reuters, 2026-07-09 22:10 UTC |
| Iran → Jordan | Ten ballistic missiles on Azraq military base | Reuters, 2026-07-09 13:31 UTC |
| Iran → Gulf | "Iran says it hits U.S. military targets in Gulf, buries slain leader Khamenei" | Reuters, 2026-07-09 22:12 UTC |
| Khamenei burial | Body arrived at Shi'ite shrine for burial | Reuters, 2026-07-09 18:33 UTC |
| BTC > $63K driver | Trump said Iran "wants to make a deal" | Cointelegraph, 2026-07-09 15:56 UTC |
| Hormuz | Tanker traffic "at near standstill" | Reuters, 2026-07-09 12:45 UTC |
| Fed / Williams | Expects energy prices to abate even as Iran war flares | Reuters, 2026-07-09 16:51 UTC |
| AMD | Shares soar on gigascale AI campus collaboration | Yahoo, 2026-07-09 18:34 UTC |
| Meta | Paid Muse Spark 1.1 API, $1.25/M in, $4.25/M out | Yahoo, 2026-07-09 20:58 UTC |
| Anthropic | Appoints ex-Fed Chair Ben Bernanke to independent trust (no equity) | CNBC, 2026-07-09 17:23 UTC |
| Goldman | Wins $70B asset-management deals with Verizon, Lockheed Martin | CNBC, 2026-07-09 14:11 UTC |
| Coinbase | CLO Paul Grewal resigns after 6-year tenure | Yahoo/CoinDesk, 2026-07-09 21:14 UTC |
| MARA | +~15% on Texas site with up to 2 GW capacity | Cointelegraph, 2026-07-09 16:26 UTC |
| Bitdeer | +14% on $36M Nevada SEALMINER facility | Cointelegraph, 2026-07-09 20:19 UTC |
| Arbitrum | +19% on Robinhood's $568M onchain trading | CoinDesk, 2026-07-09 20:28 UTC |
| BTC options | Friday $1.4B Deribit expiry | Cointelegraph, 2026-07-09 16:31 UTC |
| June home sales | Disappoint; prices at an all-time high | CNBC, 2026-07-09 14:00 UTC |

## Traps identified this cycle
1. **Quote-rollover artifact.** At 00:00 UTC the daily candle rolls; Finnhub's `o`/`pc` reset, so
   `changePercent` jumped +1.51% → +1.66% in four minutes while BTC's price moved $8. Must take ONE
   atomic snapshot for `FALLBACK_QUOTES`, not stitch two polls together.
2. **"Microsoft Frontier Company" is not Thursday news.** Yahoo recirculated it on Jul 9; the summary
   states the announcement was **July 2**. Date it correctly or drop it.
3. **Oil direction is contested.** Reuters "Oil prices settle 2% lower" is stamped Jul 9 01:04 UTC
   (i.e. Wednesday's settle, published late ET), which contradicts last cycle's "+5% surge". Separately,
   Yahoo (20:42) and Benzinga (14:24) both say oil FELL Thursday. Only publish a sourced Thursday figure.
4. **Reuters items arrive via Google News RSS** with the headline echoed as the summary — no body text.
   They cannot be used to source numeric levels. Index closes must come from a fetched page.

## Additional figures sourced this cycle
| Fact | Value | Source |
|---|---|---|
| Thu Jul 9 DOW | 52,487.41 +139.02 +0.27% | Motley Fool; corroborated by BBN Times |
| Thu Jul 9 S&P 500 | 7,543.64 +60.93 +0.81% | Motley Fool |
| Thu Jul 9 NASDAQ | 26,206.89 +336.24 +1.30% | Motley Fool; BBN Times quotes the identical print |
| Brent settle | ~$76.10, −2.46% | Trading Economics; Oilprice.com ($76.30, −2.20%) |
| WTI settle | ~$71.93, −2.17% | Trading Economics |
| NVDA / AAPL / GOOGL caps | $4.907T / $4.644T / $4.369T | Finnhub `profile2` **and** CompaniesMarketCap, agreeing |
| Thu closes (cash, t=1783627200 = 20:00 UTC) | AMD +5.67% $546.72 / MU +4.52% / AVGO +3.20% / NVDA −0.66% $202.78 / AAPL +0.90% $316.22 / META +4.70% / TSLA +3.17% / GOOGL −0.84% | Finnhub `/quote` |
| Azraq strike | 10 ballistic missiles; Jordan intercepted 8; no injuries/damage | Reuters wire via US News; Iran International |
| Gulf strikes | Patriot systems (Kuwait), early-warning site (Qatar), fuel depot (Bahrain); 1 hurt by shrapnel | Reuters via Al-Monitor |
| Khamenei burial | Thursday, at a shrine in Mashhad; killed on the war's first day, Feb 28 | Reuters via Al-Monitor; Rappler |
| Trump remark (the risk-on trigger) | Aboard Air Force One: Iran "want to make a deal so badly… They called a little while ago" | Stocktwits; Coingape |
| Hormuz | 2 transits in the early hours vs ~40 two-week avg, 125–140 pre-war; *Al Rekayyat* stranded off Oman | Reuters via US News; Bloomberg |
| France 2–0 Morocco | Mbappé 60', Dembélé; France into SF vs Spain/Belgium winner, Tue Jul 14, Dallas | FOX Sports boxscore + CBS Sports live (two fetched pages) |
| Next FOMC | July 28–29, 2026 | federalreserve.gov FOMC calendar (primary, fetched) |

### Corrections made to previously-published claims
1. **The entire "PRE-BELL / US-CASH-REOPENS-TODAY-13:30-UTC" frame was false.** That session opened, ran,
   and closed hours ago. Whole tape re-pivoted to a post-close Friday-00:00-UTC read.
2. **Oil direction was backwards.** The live tape carried "BRENT-~$78.21 AFTER-WEDNESDAYS-~+5%-SURGE".
   Brent actually *fell* ~2.5% Thursday to ~$76.10 as traders looked past the Gulf. Two sources agree.
3. **NVDA's cap was understated.** Last cycle published ~$4.74T and reasoned CompaniesMarketCap's higher
   figure must be wrong. This cycle Finnhub `profile2` ($4.907T) and CMC ($4.911T) agree *independently*,
   and both reconcile against shares × close (24,200M × $202.78 = $4.907T). The gap to Apple is ~$263B —
   not the "poised to reclaim the crown" framing that was live. Apple did close the gap Thursday, but only
   because **NVIDIA fell −0.66% while the rest of the chip complex surged**.
4. **"Apple signs a $30B Broadcom deal"** — this cycle's sourcing (Yahoo, 21:31 UTC) supports only "Tim Cook
   took the partnership to the next level". The $30B figure could not be re-sourced; dropped, not restated.
5. **Ukraine barrage figures replaced.** "169 drones / 7 missiles / 4 killed" was Wednesday. Thursday:
   2 missiles + ~100 drones, 72 UAVs downed (Ukrainska Pravda).
6. **World Cup result published, schedule corrected.** France beat Morocco 2–0; the tape had it as an
   upcoming 20:00 UTC kickoff. Argentina vs Switzerland is **Sun 01:00 UTC**, not "Sat".

### A trap that nearly published a wrong schedule
One source asserted **all four quarterfinals were played Thursday July 9**. A dedicated verification pass
(ESPN game IDs, a FOX pre-match boxscore with no score, Sky Sports' team-by-team preview) established that
only France–Morocco was played; the other three are Jul 10/11/12 UTC. Had that snippet been trusted, the
tape would have invented three scorelines. **Single-snippet schedule claims get a second fetch.**

### Deliberately NOT asserted (unverified — dropped rather than guessed)
- **Record Dow close 53,055.91 on Monday July 6.** Carried by the previous tape; not re-sourced this cycle.
  A "record" claim requires knowing the full history, which no page I fetched established. Retired.
- IMF 3.0%/3.1%/3.4% growth forecasts — not re-sourced this cycle.
- NATO Ankara summit / halt to US–Spain trade / Greenland — Wednesday's news, superseded.
- Apple's "$30B Broadcom deal" dollar figure, India smartphone duties, Cerebras, Meta–Capital Power 250MW,
  Xbox job cuts, Tesla's 480,126 deliveries, Strategy's 3,588-BTC sale, Paradigm's $1.2B fund — none
  re-sourced; each replaced with a same-ticker item that *is* sourced to Thursday's feeds.
- **Gold**: spot trades 24h with no cash close. Sources span $4,110–$4,123 (Fortune morning snapshot,
  Yahoo, Trading Economics). Published as "GOLD-FIRMER-NEAR-$4,120" — direction asserted, precision not.
- **Dembélé's goal minute**: FOX says 66', CBS says 65'. Neither minute published; the goal is.
- **June CPI on July 14**: BLS returns HTTP 403 to fetch. A bls.gov-restricted search surfaced BLS's own
  schedule text, and the current release on bls.gov is the May report — consistent. Kept, flagged as the
  weakest primary-sourced item on the tape.

## Review

### Content refresh
Rewrote `CORE`, all 24 `FALLBACK_NEWS` items, and `FALLBACK_QUOTES` for 2026-07-10 00:00 UTC. The tape
pivots from "pre-bell, cohort steadying" to **risk-on into the close**: Trump said Iran "wants to make a
deal", a chip surge (AMD, Micron, Broadcom; SK Hynix's $28B ADR 7× oversubscribed) drove the Nasdaq
+1.30%, oil gave back its war premium, and BTC broke $63K on the same headline — all while Iran fired ten
ballistic missiles at Jordan's Azraq air base and buried Khamenei. The sharpest detail on the tape is that
**Nvidia sat out its own sector's rally**, which is exactly what let Apple close the crown gap.

### Verification performed
- [x] `npm run build` green — and green on a **baseline run before any edit**, so the diff is the only variable
- [x] Fallback path (`FINNHUB_API_KEY=""`): `source: fallback`, 24 headlines, 24/24 new stamps, **0** stale
      `12:00 UTC` stamps
- [x] Automated scan: all **18** retired claims absent from the served payload; all **18** required new
      facts present
- [x] Crypto payload byte-matches the atomic snapshot (t=1783642141)
- [x] Live path (real key): `source: finnhub`, fresh Reuters "Nasdaq ends sharply higher" + Iran/Khamenei
      headlines, spot within ~$9 of the snapshot, no runtime errors in the server log
- [x] Homepage HTTP 200

### Method note: the fallback test that wasn't
`env -u FINNHUB_API_KEY npx next dev` does **not** exercise the fallback path — Next loads `.env.local`
from disk regardless of the shell environment, so the route served `source: finnhub`. Use
`FINNHUB_API_KEY="" npx next dev`: dotenv won't override a key already present in `process.env`, so the
empty string survives and `if (!process.env.FINNHUB_API_KEY)` takes the fallback branch. Any future cycle
claiming "verified the fallback path" must assert on `source === 'fallback'` in the response, not on how
the server was launched.

### Quote-snapshot hazard (new this cycle)
The Binance daily candle rolls at 00:00 UTC, and this cycle ran at 00:00 UTC exactly. Finnhub's `o`/`pc`
reset underneath consecutive polls: `changePercent` read +1.51%, then +1.66%, then +1.59% across three
polls in nine minutes while BTC's price moved ~$40. `FALLBACK_QUOTES` is therefore taken from a **single
poll** whose four quotes share one timestamp, asserted in the fetch script. Never stitch two polls.

### Known issue, NOT touched this cycle
`components/FinancialTerminal.tsx:363+` holds a **client-side emergency fallback with invented content**
(BTC $94,521, ETH $3,245.50, SOL $187.25, "Fed hints at rate cut in March", "NVDA surges 8%",
"AAPL announces record $110B buyback"). It renders only if *both* `/api/news` and `/api/crypto` throw in
the browser, which is why it has gone unnoticed. It is model-authored, wildly stale, and violates the
project's live-sourced-content rule. Fixing it means deleting the numbers, not refreshing them — a
non-numeric "FEED INTERRUPTED" state cannot go stale. Left alone here because it is a behavior change
unrelated to a content refresh; raised for a separate change.
