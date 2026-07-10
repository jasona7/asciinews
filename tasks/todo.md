# Task: News scan + content refresh + deploy — 2026-07-10 12:00 UTC

## Plan
- [x] Review `tasks/lessons.md` before touching anything
- [x] Re-frame before re-numbering: establish what *happened* between 00:00 and 12:00 UTC
- [x] Recon all beats live (markets/macro, megacap tech, world/geopolitics, crypto + World Cup)
- [x] Take ONE atomic Binance snapshot; assert a shared `t` and that `dp` reconciles with `d/pc`
- [x] Rewrite `CORE` + `FALLBACK_NEWS` (news route) and `FALLBACK_QUOTES` (crypto route)
- [x] Delete the invented client-side emergency fallback (carried over as a known issue)
- [x] Verify: build, fallback path, live path, homepage, retired-claim scan
- [x] Deploy

## The frame moved, so everything moved
Last stamp was `FRIDAY-JULY-10 00:00-UTC-POST-CLOSE`. At 12:00 UTC Friday the US cash session has *not*
reopened (13:30 UTC), so the tape is now **PRE-BELL** and leads with futures, Asia's close and Europe's
midday — not Thursday's close. Thursday's cash close is retained but demoted to reference.

## What changed
**Frame:** post-close → pre-bell; futures (ES −0.05% / YM +0.14% / NQ −0.35%, VIX 15.90 @ 11:47 UTC).

**Corrections to figures that were simply wrong:**
- SK Hynix raised **$26.5B** (177.9M ADS @ $149, ~7× oversubscribed), not `$28B`. Largest-ever US
  listing by a foreign company; debuts on Nasdaq **today** as SKHYV, regular trading as SKHY Monday.
- Megacap crown gap is **~$266B**, not `~$263B` — rebuilt as shares × price (NVDA 24.22B × $202.78 =
  $4.911T; AAPL 14.69B × $316.22 = $4.645T). The $4.91T NVDA cap reconciles exactly.
- The BTC-ETF line was backwards: Thursday's outflow (**−$95.3M**, Farside) **ended a ~3-day, ~$510M
  inflow streak**. It did not end a "$2.7B sell-off streak."
- Coinbase's Grewal is a **transition**, not a resignation: steps down as CLO effective Jul 31, adviser
  through Oct 31, Molly Abraham expected as GC.
- Tim Cook's actual words are "this new phase of our partnership…", not "to the next level."

**Reversed a prior DROP:** Apple's **>$30B** Broadcom spend (>15B US-made chips, $1.5B Fort Collins) was
dropped last cycle as unverifiable. It is on Apple's own newsroom (Jul 8). Restored.

**New:** ceasefire collapse + second night of US strikes on Iran (South Pars / Asaluyeh; IRNA reports the
Tehran–Mashhad railway bombed); Iran's press office *says* ≥14 killed, 78 injured; Pakistan and Qatar
reportedly mediating. Oil reversed back **up** (Brent ~$77.06 +1.0%, WTI ~$72.63 +0.8%). Ukraine struck
deep into Russia (Russia's MoD *says* 376 drones downed; Ilsky refinery and Taganrog port ablaze).
NVDA China H200 import cap (<200k chips, training only). Crypto cohort rallied — ETH leads at +3.27%.

## Dropped, and why (do not resurrect)
| Claim | Reason |
|---|---|
| Azraq "10 missiles, 8 intercepted, no damage" | Only Jordan's general intercept claim re-sourced |
| Iran hit Patriots in Kuwait / Qatar site / Bahrain depot | Not re-sourced in the last 12h |
| Russia attacked Ukraine, ~100 drones, 72 downed | Could not re-source; the fresh event runs the *other* way |
| Hormuz "two transits in early hours", "~40/day", "125–140 pre-war" | Superseded by straits.live current figures |
| MSFT "Frontier Company" $2.5B | Announced **Jul 2** — recirculated, not news |
| Williams "energy near peak"; Warsh's five task forces | Not re-sourced this cycle |
| Goldman's $70B retirement mandates; Bernanke→Anthropic; June home sales | Not re-sourced |
| UBS "App Store ~3%" | Verified but days old; cut for space over fresher items |
| TSLA's Thursday pop attributed to a UBS target hike | Unsourced causation |
| iPhone 17 demand-cut rumor | Single Weibo leaker, explicitly unverified |
| Amazon $24.9B notes offering | Source 403'd; unverified at SEC |
| Alphabet/Blackstone TPU venture; Alphabet capex $180–190B | Snippet-only, no dated primary |
| Burnham nominations, Almería fire, EAC dismissals, Abbas election decree | Single aggregated briefing |

## Fixed: the invented client-side fallback
`components/FinancialTerminal.tsx` carried a browser-side emergency fallback with **fabricated** content
(BTC $94,521, ETH $3,245.50, SOL $187.25, "Fed hints at rate cut in March", "NVDA surges 8%", "AAPL
announces record $110B buyback"). It rendered whenever *both* `/api/news` and `/api/crypto` threw in the
browser, which is why it went unnoticed. It was model-authored and violated the live-sourced-content rule.

Replaced with a two-line, **non-numeric** status state. The banner also lied — it said "USING CACHE" while
serving invented data; it now reads `FEED INTERRUPTED - LIVE DATA UNAVAILABLE`. The
`setCryptoLastUpdated(new Date())` call was removed: it stamped "updated just now" on data that had never
been fetched, and its only consumer (`CryptoQuoteDisplay`) no longer renders in that path.
**A placeholder that states no facts cannot go stale.**

## Verification (all assertions on the *response*, never on the launch command)
- [x] `npm run build` — compiled successfully, 4/4 static pages
- [x] `npx tsc --noEmit` — exit 0
- [x] Fallback path (`FINNHUB_API_KEY="" npx next dev`): `/api/crypto` and `/api/news` both report
      `source: "fallback"` — asserted from the payload
- [x] Crypto payload **byte-matches** the atomic snapshot `t=1783685005` (2026-07-10 12:03:25 UTC)
- [x] Automated scan of the served payload: **18/18** retired claims absent, **26/26** required new facts
      present (44 checks, all green)
- [x] Live path (real key): `source: finnhub`, 8 fresh headlines, live BTC $64,542 vs snapshot $64,386
      (~$156 drift over ~25 min — expected; the snapshot only renders when the API is down)
- [x] Homepage HTTP 200
- [x] Invented values absent from both source **and** the built client bundle

## Snapshot provenance
One Finnhub/Binance poll, `t=1783685005` identical across all four symbols; every `changePercent`
reconciles against `d/pc` to four decimals. BTC $64,386.01 +2.62% / ETH $1,799.87 +3.27% /
SOL $79.24 +2.14% / XRP $1.1112 +1.65%.
