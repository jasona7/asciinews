import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-05-13 01:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'US equities closed Tuesday May 12 mixed-to-red after the hot April CPI print — S&P 500 -0.16% to 7,400.96, Nasdaq -0.71% to 26,088.20, Dow +0.11% to 49,760.56 per TheStreet / 24/7 Wall St. / Motley Fool — chip stocks the proximate drag with Micron -3.6%, AMD -2%, Qualcomm -11%, Intel still digesting the prior-week run (six consecutive record sessions through Monday May 11 $129.44 close, +114% in April alone); WTI June settled +4.19% to $102.18 / Brent $107.58 on Trump\'s Tuesday "massive life support" escalation of the Iran ceasefire framing, the 10-year Treasury yield touched a one-year high on the CPI print, CME FedWatch now pricing ~98% June hold and ~30% probability of a December rate HIKE (not cut), BofA pushing its first-cut call into 2027 per TheStreet — Hims & Hers Health -15% on Q1 miss the standout single-name move, Trump physically departed for Beijing Tuesday afternoon with AAPL CEO Tim Cook and TSLA CEO Elon Musk confirmed on the plane while NVDA CEO Jensen Huang was conspicuously OMITTED from the 16-CEO China-trip list per CNBC, the Senate Banking CLARITY Act 309-page substitute markup Thursday May 14 10:30 AM ET in Dirksen Room 538 the same-week structural overlay and NVDA fiscal-Q1 May 20 AMC the next-gating AI-hardware print', category: 'general', related: '' },
  { headline: 'April CPI printed Tuesday May 12 at 8:30 ET hotter than expected — headline +0.6% MoM / +3.8% YoY (vs +3.7% Wall Street consensus) the highest annual print since May 2023, core +0.4% MoM / +2.8% YoY per Kiplinger / TheStreet / Motley Fool — energy index +3.8% MoM accounting for >40% of the monthly all-items increase, energy +17.9% YoY, gasoline +28.4% YoY (vs +18.9% prior reading), fuel oil +54.3%, drivers explicitly tied to the Strait-of-Hormuz / Iran energy pass-through with shelter +3.3% (vs +3.0% prior) and food +2.3% (vs +2.7% prior); BofA dropped its first-Fed-cut call to 2027 per TheStreet — CME FedWatch now showing ~98% June hold (May meeting hold priced ~83% as essentially done), 2026 broadly priced for zero cuts and roughly a 30% probability of a December rate HIKE rather than a cut; Saudi Aramco CEO Amin Nasser flagged the market losing ~100M barrels of supply per week with prolonged disruption pushing normalization into 2027 per Fortune, Brent July $107.58 +3.2% / WTI June settled +4.19% at $102.18, the four-dissent April 29 Fed hold (3.50-3.75% target range) with Boston Fed\'s Collins among the dissenters citing "war-fueled inflation risks" outweighing labor concerns the policy backdrop, full-Senate vote on Kevin Warsh expected the week of May 11 with Warsh likely handling the June FOMC if confirmed', category: 'general', related: '' },
  { headline: 'Nvidia (NVDA) closed Tuesday May 12 at $216.07 (-3.4% from intraday high $223.75, +0.5% off the $214.92 low) sliding after CEO Jensen Huang was conspicuously omitted from the 16-CEO list traveling with Trump on the Beijing summit (Apple\'s Tim Cook and Tesla\'s Elon Musk both confirmed onboard) per CNBC / Fortune — the May 20 AMC fiscal-Q1 print remains the next-gating AI catalyst with Wells Fargo raising its PT to $315 ahead of the print per GuruFocus and Citi modeling revenue upside of ~+$1.4B versus the ~$80B consensus (~78% YoY); sell-side aggressively positioned long with the analyst tally 40 Buys / 1 Hold / 1 Sell and Goldman Sachs flagging NVDA "meaningfully undervalued" projecting a "major re-rating" post-print, the cumulative $725B FY26 hyperscaler capex envelope per FT compilation (+77% YoY from $410B) the demand pipe with MSFT directing two-thirds of its $190B calendar-2026 capex toward GPUs/CPUs for Azure and Copilot per CFO Amy Hood — Blackwell + Grace Blackwell capacity-constrained through 2026; Q1 guide explicitly excludes all China DC compute revenue (~$50B effective-zero per Jensen) with Trump pressing Xi on Chinese financial support and weapons exports to Iran at the May 13-15 Beijing summit, US sanctions on five Chinese refiners processing Iranian oil triggering China\'s blocking statute the new bilateral friction, AMD\'s blowout May 5 Q1 print (EPS $1.37 vs $1.29, revenue $10.25B +38% YoY, Data Center $5.8B +57%, Q2 guide raised to $11.2B, stock +20%+ next day, market cap >$690B) the read-through that elevates the bar for NVDA May 20', category: 'company', related: 'NVDA' },
  { headline: 'Apple (AAPL) extended into Tuesday May 12 with CEO Tim Cook joining Trump and a 16-CEO delegation on the May 13-15 Beijing trip per CNBC / Spectrum / Fox News alongside Tesla\'s Elon Musk — the high-profile attendance keeping AAPL\'s Trump-administration alignment intact 4 days after the WSJ May 8 scoop confirmed Apple and Intel reached a preliminary chip-making agreement with Intel\'s foundry the secondary option to longtime TSMC partner for chips based on Apple\'s own designs, early indications pointing to lower-end M-series silicon for select iPad and Mac models with chips potentially landing by 2027 (the M7 expected to start showing up in MacBook Pro, MacBook Air, iPad Pro by late 2027, the A21 for the 2027 iPhone per MacRumors); WSJ flagging Apple "has concerns about using non-TSMC technology and may not ultimately move forward with another partner" if Intel 18A/14A yields disappoint preserving execution risk, per CNBC the US government as Intel\'s largest shareholder (10% stake under CEO Lip-Bu Tan) played the major role bringing Apple to the table with Commerce Secretary Lutnick meetings encouraging Intel-foundry work; AAPL closed Monday May 11 at $292.68 (-0.22%) just below the Friday May 8 ATH of $293.32 with Monday intraday hitting $294.45 per Yahoo Finance, the Beijing summit overlapping the hot April CPI 3.8% YoY print Tuesday (Nasdaq -0.71%, S&P -0.16%) and Trump\'s "massive life support" escalation of the Iran ceasefire framing — prior-quarter print already booked the bull case ($111.18B rev +16.6% YoY March-quarter record, $2.01 EPS +22%, iPhone $57B +22%, Greater China +28%, $100B buyback re-up)', category: 'company', related: 'AAPL' },
  { headline: 'Intel (INTC) opened Tuesday May 12 ~3.55% lower in pre-market at $124.84 (-$4.60) after Monday\'s May 11 close at $129.44 — the sixth consecutive record-territory session with intraday range $122.36-$129.76 per Meyka / Foreign Policy Journal / CoinCentral — the first material pullback in the multi-week ATH run that has the stock +114% in April alone, market cap past $470B and Foundry break-even pulled forward to 2027 on the cumulative Amazon, Microsoft, US Government, Tesla and now Apple capacity commits, the Trump-administration-shepherded Apple chip-making preliminary agreement (WSJ May 8 scoop) framed by CoinCentral as "Trump-backed" with Commerce Secretary Lutnick the orchestrating actor; the fresh leg in the rally has been Google EMIB-packaging reporting for next-gen TPUs giving the foundry pipe a second hyperscaler anchor beyond Apple, Bank of America\'s raised $96 PT (from $56) still in place after the deal would add ~$10B annual sales by 2030 per Stocktwits with US government as Intel\'s largest shareholder (10% stake under CEO Lip-Bu Tan) the structural Trump-administration alignment running directly into the Trump-Xi May 13-15 Beijing summit — Iran "center stage" per CNBC after Trump escalated Monday\'s "life support" framing to "massive life support" Tuesday, US sanctions on five Chinese refiners processing Iranian oil now triggering China\'s blocking statute (the first invocation), the April CPI 3.8% YoY hot print (vs 3.7% cons, 0.6% MoM headline) and Nasdaq -0.71% close the cross-asset risk-off the rally is digesting, AMD-comparison overhang fresh with AMD\'s May 5 Q1 blowout (EPS $1.37, Data Center +57% to $5.8B, market cap >$690B) the read-through', category: 'company', related: 'INTC' },
  { headline: 'Tesla (TSLA) crashed ~4% Tuesday May 12 per Invezz as Reuters reporting flagged Robotaxi service issues across Austin, Dallas and Houston — wait times exceeded 15 minutes about half the time, were 25+ minutes late more than a quarter of the time, and 27% of attempts had no cars available at all — Tesla operating ~50 Robotaxis in Austin (city population >1M) with the "convenience issues" framed by Musk as direct manifestations of safety-validation bottlenecks per Electrek, Musk having walked the H1 2026 multi-city ramp framing back to "a dozen or so states by end of 2026" on the Q1 call from the earlier "half the US population by year-end 2025" target; Musk confirmed joining Trump\'s May 13-15 Beijing state visit per Heygotrade with full FSD approval in China the central TSLA-specific objective, Tesla seeking regulatory approval for FSD in Europe and encountering resistance the parallel friction; production cadence ~2,000 Cybercabs/week now targeting 10,000/week by year-end, unit cost <$25K, deployed exclusively to Tesla-owned fleet (not sold), management reiterating negative FCF for the rest of 2026 and capex guided above $25B per Heygotrade — TSLA still +60% YTD before the Tuesday move, the AI/robot/Optimus optionality keeping the bid into the $725B FY26 hyperscaler capex envelope, the NVDA fiscal-Q1 May 20 AMC the next-gating AI-hardware print and the Trump-Xi Beijing summit the cross-asset overlay against the hot April CPI 3.8% YoY print and WTI settled +4.19% at $102.18 Tuesday tape', category: 'company', related: 'TSLA' },
  { headline: 'AWS published its official Post-Event Summary Monday May 11 attributing the May 7-8 US-East-1 outage to a "thermal event resulting in a loss of power" at a single Northern Virginia data center — cooling system failure overheated servers cascading into EC2 instance impairment and EBS storage volume failures per Network World / Yahoo Tech / Computerworld, Coinbase named again among the impacted customers with the disruption hitting core exchange functions and order matching, FanDuel sportsbook operations and the CME Group trading platform for roughly seven hours, total incident duration 12+ hours; Computerworld\'s critique flagged the post-mortem "more revealing in what it doesn\'t say" — single-AZ concentration risk and thermal-design redundancy questions still in the open as the AI-infrastructure-capex narrative bumps against the cumulative $725B four-hyperscaler envelope (AMZN $200B / GOOGL $180-190B / META $125-145B / MSFT $190B calendar-2026 +61% YoY per Hood, total +77% YoY from last year\'s $410B record), AWS itself running $37.6B Q1 +28% YoY at 37.7% segment OI margin (15-quarter-fastest); AMZN held the prior week\'s ~1% Thursday drop through Monday\'s S&P 500 / Nasdaq record close (7,412.84 / 26,274.13) before Tuesday\'s -0.16% / -0.71% pullback on the hot April CPI print, the May 7 thermal-event post-mortem now closing one loop into the Trump-Xi May 13-15 Beijing summit (Bessent confirmed Iran on the agenda, Trump pushing Xi on Chinese financial support / weapons exports to Iran) and the April CPI 3.8% YoY hot print pricing the next risk-off leg', category: 'company', related: 'AMZN' },
  { headline: 'Coinbase (COIN) caught a fresh bid Monday after Senate Banking Chair Tim Scott + Sens. Lummis and Tillis released the 309-page Digital Asset Market Clarity Act substitute text Tuesday morning ahead of Thursday May 14 10:30 AM ET markup in Dirksen Room 538 — the stablecoin yield ban preserved ("economically or functionally equivalent to interest on a bank deposit") but with an explicit carve-out for rewards tied to "bona fide activities or bona fide transactions," Coinbase\'s compromise language structurally intact per CoinDesk / CryptoTimes / Stocktwits, nine titles total with NFT safe harbors and zero crypto ethics provisions, White House targeting July 4 for final passage per Bitcoin Magazine; CEO Brian Armstrong did an X live event Tuesday morning stating "not everyone got everything they wanted, but they got the must-haves" and is hosting lunch with Senate Republicans Wednesday May 13 to whip the vote, COIN Chief Legal Officer Paul Grewal publicly clashed on X with American Bankers Association CEO Rob Nichols who is lobbying for an eleventh-hour stablecoin-loophole closure, Sen. Bernie Moreno: "the banking cartel is in full panic mode"; structurally Coinbase resumed after the AWS US-East-1 thermal outage now formally pinned by AWS post-mortem to a Northern Virginia DC cooling failure, the $394M Q1 GAAP net loss / -$1.49 EPS hammered by $482M unrealized losses on crypto held for investment and the 700-layoff Monday still weighing — the CLARITY substitute pulling the next 48 hours of catalyst-flow with Lummis "almost 99% sorted out" on stablecoin language and the Memorial-Day-recess deadline tightening, Trump-Xi May 13-15 Beijing Day-1 overlap the macro cross-asset frame', category: 'company', related: 'COIN' },
  { headline: 'AMD\'s May 5 Q1 blowout setting the bar into the NVDA fiscal-Q1 May 20 AMC print — AMD reported EPS $1.37 vs $1.29 consensus and revenue $10.25B (+38% YoY) vs $9.92B estimate per CNBC / Yahoo Finance / Trading Key, the Data Center segment hitting $5.8B (+57% YoY) with CEO Lisa Su flagging Data Center as AMD\'s "main growth engine" driven by EPYC server CPUs and Instinct GPUs for AI inference; AMD raised Q2 revenue guide to $11.2B and the stock soared more than 20% the next day pushing market cap past $690B before Tuesday\'s -2% cohort pullback (Micron -3.6%, Qualcomm -11%) on the hot April CPI print, Wells Fargo raised NVDA\'s PT to $315 and Citi modeled +$1.4B revenue upside to the ~$80B NVDA Q1 consensus (~78% YoY) per GuruFocus — sell-side aggressively positioned long into the May 20 print with 40 Buys / 1 Hold / 1 Sell on NVDA per TipRanks and Goldman Sachs calling the stock "meaningfully undervalued"; cumulative $725B FY26 hyperscaler capex envelope per FT compilation (AMZN $200B / GOOGL $180-190B / META $125-145B / MSFT $190B, +77% YoY from $410B record) the demand pipe with MSFT directing two-thirds toward GPUs/CPUs per CFO Amy Hood, AWS US-East-1 thermal-event post-mortem Monday adding DC-cooling design overhang to the AI-infra story, Trump-Xi May 13-15 Beijing the cross-asset overlay with NVDA CEO Jensen Huang conspicuously OMITTED from the 16-CEO delegation flying with Trump (Cook and Musk confirmed onboard)', category: 'company', related: 'AMD' },
  { headline: 'Microsoft (MSFT) digesting the $190B calendar-2026 capex headline (+61% YoY, 23% above $154.6B FactSet consensus, ~$25B of that from higher component pricing per CFO Amy Hood per Seeking Alpha / Motley Fool framing) through Tuesday\'s hot April CPI 3.8% YoY print — Azure +40% nominal / +39% cc and Microsoft Cloud crossing $50B holding the bull case alongside annualized AI revenue $37B (+123% YoY) but MSFT now -12% YTD on the latest weekly tape, the worst quarterly performance since 2008 with the capex shock the proximate cause; Hood specifically directing two-thirds of the capex envelope to GPUs and CPUs for Azure and Copilot, FY26 Q3 capex hitting $30.9B (+49% YoY) compressing FCF to $15.8B even as operating cash flow stayed strong at $46.7B; the $725B four-hyperscaler total per FT compilation now tested by the AWS US-East-1 thermal-event post-mortem published Monday May 11 pinning the May 7-8 outage to a single Northern Virginia DC cooling failure (Coinbase / FanDuel / CME hit for 12+ hours) and adding redundancy / cooling-design questions to the AI-infrastructure-capex narrative — the NVDA fiscal-Q1 May 20 AMC the next-gating AI-hardware print (Wells Fargo PT raised to $315, Citi modeling +$1.4B revenue upside vs ~$80B consensus), Trump-Xi May 13-15 Beijing summit and Senate Banking Committee CLARITY Act markup Thursday May 14 the same-week cross-asset overlay; BofA pushed its first Fed cut into 2027 per TheStreet on the CPI hot print, June FOMC now ~98% hold per CME FedWatch with 2026 essentially priced for zero cuts and a ~30% probability of a December HIKE', category: 'company', related: 'MSFT' },
  { headline: 'Strategy (MSTR) is +10% on the week after confirming Monday May 11 it had acquired 535 BTC for $43M at an $80,340 average price — total holdings now 818,869 BTC at $75,540 company-wide average cost basis, total cost $61.86B across MSTR + STRC per CoinDesk / Bitcoin Magazine / Investing.com — BTC Yield YTD 9.4% with the buy funded via the sale of 231,324 shares under the ATM offering ($42.9M MSTR + $0.1M STRC), six days after executive chairman Michael Saylor told the Q1 call (May 5) Strategy was prepared to sell a portion of its bitcoin holdings for the first time and the Sunday May 10 "Back to work, BTC" X post / "Orange Dots" chart presaging the resumption of accumulation; the 818,869-BTC position (~3.9% of the 21M hard cap) is back UNDERWATER versus the $80,340 May purchase price after BTC slipped to $80,699 Wednesday May 13 01:00 UTC per Crypto.com tape (-1.04% 24h, intraday low $79,841.47), even as Q1 had booked a $12.54B unrealized loss under FASB fair-value rules (BTC -23% Q1) generating a $2.2B deferred-tax asset to offset future gains; Saylor told CoinDesk the prospect of selling BTC to fund dividends is "inconsequential" / "a big nothing-burger" — describing the model on video as "buy 10 Bitcoin, sell one to fund dividends, buy 10 more, sell one more" — proceeds-of-sale earmarked to retire $8.2B in convertible debt, buy MSTR when mNAV < 1.22x or fund the $1.5B annual perpetual-preferred dividend stack (STRC, STRK/STRF/STRD); Saylor told Fortune the prior "sell" remarks were intended "to jam short-sellers and haters," Polymarket has priced meaningful odds Strategy sells some of its position this year per Decrypt', category: 'company', related: 'MSTR' },
  { headline: 'Bitcoin slipped under $81K Wednesday May 13 01:00 UTC trading $80,699.20 on the Crypto.com tape (-1.04% 24h, range $79,841.47-$81,625.71, 24h volume value ~$252.1M) — intraday low broke under $80K for the first time this week as the hot April CPI 3.8% YoY print (vs +3.7% cons, headline +0.6% MoM, core +2.8% / +0.4% MoM, energy +3.8% MoM accounting for >40% of the all-items rise driven by Strait-of-Hormuz pass-through with gasoline +28.4%) pushed BofA to delay the first Fed cut to 2027 per TheStreet, CME FedWatch now showing ~98% June hold with 2026 essentially priced for zero cuts and roughly a 30% probability of a December HIKE; structurally Strategy\'s confirmed 535-BTC / $43M Monday purchase at $80,340 (818,869-BTC total, 9.4% BTC Yield YTD) reasserted treasury demand and the position is now back underwater versus the May average, US-spot-BTC-ETF flows ended their six-week streak on May 7 with -$268.5M outflows (IBIT -$27.2M, FBTC -$97.6M, ARKB -$26.6M; Morgan Stanley\'s MSBT the only positive at +$5.7M, $194M AUM in first month with no net daily outflows per The Block); Trump escalated Monday\'s Iran-ceasefire framing to "massive life support" Tuesday with WTI settled +4.19% at $102.18 / Brent $107.58, Pentagon now pegging total Iran-war cost at $29B per CNN, Russia resumed strikes on Kyiv hours after the 3-day Victory-Day ceasefire expired Monday with 6 killed in Dnipropetrovsk overnight, Senate Banking CLARITY Act 309-page substitute text dropped Tuesday morning ahead of Thursday May 14 markup the structural catalyst alongside Trump-Xi Beijing Day-1 overlap', category: 'crypto', related: 'BTC' },
  { headline: 'Ether broke under $2,300 Wednesday May 13 01:00 UTC trading $2,281.35 on the Crypto.com tape (-2.24% 24h, range $2,256.07-$2,335.59, 24h volume value ~$119.2M) — the biggest 24h loser among the four majors with the leaderboard now BTC -1.04% > ETH -2.24% > XRP -2.74% > SOL -3.08%, the relative weakness extending after the hot April CPI 3.8% YoY print (headline +0.6% MoM, core +2.8% YoY, energy +3.8% MoM accounting for >40% of the all-items rise) priced June FOMC at ~98% hold and BofA delayed first cut to 2027 per TheStreet, Nasdaq closed -0.71% / S&P -0.16% Tuesday with chip stocks the cohort drag (Micron -3.6%, AMD -2%, Qualcomm -11%); structurally BlackRock\'s ETHA still holds $10B+ AUM (third-fastest US ETF to that mark) and Fidelity\'s FETH matches the 0.25% sponsor fee but May 7 spot-ETH-ETF complex flipped -$103.5M (no fund posting positive flows, FETH -$62.26M / ETHA -$26.31M) erasing most of the $271.61M cumulative from the May 1-6 four-positive run, a single whale deposited 78,000 ETH (~$178M) to Binance Friday May 8 while BlackRock and Fidelity moved 35,394 ETH to Coinbase Prime — institutional distribution / accumulation split keeping the May tape range-bound; Trump-Xi May 13-15 Beijing the macro overlay with Iran "center stage" per CNBC after Trump\'s Tuesday "massive life support" escalation of the ceasefire framing and Pentagon pegging total Iran-war cost at $29B, Senate Banking CLARITY Act 309-page substitute text dropped Tuesday morning ahead of the Thursday May 14 10:30 AM ET markup the structural catalyst', category: 'crypto', related: 'ETH' },
  { headline: 'Solana flipped negative and dropped to $94.52 Wednesday May 13 01:00 UTC on the Crypto.com tape (-3.08% 24h, range $93.60-$97.66, 24h volume value ~$13.9M) — now the WORST performer among the four majors after being the lone gainer in Tuesday\'s session, the leaderboard now BTC -1.04% > ETH -2.24% > XRP -2.74% > SOL -3.08%, the tape rejected the $98 round-figure overhead and broke back UNDER the $93 descending-resistance trendline that had capped upside since early March per CoinPedia; the roughly $33M weekly inflow into US spot Solana ETFs per CoinPedia / MEXC sustained institutional interest into the breakout but monthly US-spot-SOL-ETF inflows have declined six straight months (November 2025 ATH $419.38M → April 2026 $39.93M, weakest print since the October 2025 launch) with combined SOL spot ETF holdings now approaching ~2% of circulating supply per CoinDesk, the late-April catalyst stack still anchoring the longer-term bid (Visa and Meta expanding Solana payments, Solana Swiss Research Institute launch, April 28 quantum-resistant signature migration, Israel CMA BILS approval — 1:1 ILS-pegged stablecoin on Solana with sub-400ms settlement, EY-audited reserves, Fireblocks custody) plus the Alpenglow upgrade pushing transaction finality toward sub-150ms; SOL market cap dropped to ~$55.3B per OKX, hot April CPI 3.8% YoY print and BofA delaying the first Fed cut to 2027 the macro overlay with Senate Banking CLARITY Act 309-page substitute dropped Tuesday morning ahead of Thursday May 14 markup the same-week structural catalyst and Trump-Xi Beijing Day-1 overlap', category: 'crypto', related: 'SOL' },
  { headline: 'XRP broke under $1.44 to $1.4394 Wednesday May 13 01:00 UTC on the Crypto.com tape (-2.74% 24h, range $1.4186-$1.4821, 24h volume value ~$10.8M) — after touching $1.50 intraday Sunday on the CLARITY-markup confirmation but the cohort has rolled with the leaderboard BTC -1.04% > ETH -2.24% > XRP -2.74% > SOL -3.08% as the Senate Banking Committee CLARITY Act markup countdown tightens to T-minus 36 hours (Thursday May 14 at 10:30 AM ET in Dirksen Room 538) with the 309-page substitute text dropped Tuesday morning preserving the explicit carve-out for rewards tied to "bona fide activities or bona fide transactions" — the bill would permanently classify XRP a digital commodity with 24/7 Wall St projecting a committee-pass scenario lifting XRP into the $1.70-$2 range and Standard Chartered projecting $4-8B cumulative ETF inflows by year-end if the bill passes (XRP still +400% YTD 2026, market cap ~$89.3B, circulating supply 62B), White House targeting July 4 for final passage per Bitcoin Magazine; structurally the US spot XRP ETF complex pulled in $28.1M across May 4-6 with cumulative inflows now ~$1.32B since launch, but ~$3B of sell-wall sits parked above $1.45 per FXLeaders triangle-apex framing so the committee pass alone may not be enough to absorb the full overhead and the move under $1.44 has now broken the apex on the downside; American Bankers Association CEO Rob Nichols clashed publicly with Coinbase CLO Paul Grewal on X over an eleventh-hour stablecoin-loophole closure, Sen. Bernie Moreno: "the banking cartel is in full panic mode" — Trump-Xi Beijing Day-1 overlap and the April CPI 3.8% hot print the macro frame', category: 'crypto', related: 'XRP' },
  { headline: 'US spot Bitcoin ETFs broke their six-week, $3.4B-cumulative inflow streak on May 7 with -$268.5M of outflows per AInvest — the longest streak since August 2025 snapped after IBIT -$27.2M / FBTC -$97.6M / ARKB -$26.6M turned the tape negative, May 4 had been a +$532.21M inflow day (IBIT +$335.49M, FBTC +$184.57M) with Morgan Stanley\'s MSBT ($MSBT) the only positive May 7 fund at +$5.7M and now holding $194M AUM in its first month with no net daily outflows per The Block; cumulative net inflow since launch still holding above $58.5B with IBIT the largest spot BTC ETF (>$66B AUM, ~810K-BTC holdings, larger by AUM than most of BlackRock\'s gold and EM ETFs combined), BlackRock\'s European bitcoin ETP crossing $1.1B AUM holding 14,200 BTC as of May 4, April closed at $2.44B net inflow per Coinglass — strongest monthly since October 2025; the ETH complex turned negative the same May 7 session at -$103.52M (FETH -$62.26M, ETHA -$26.31M) erasing most of the $271.61M cumulative from the May 1-6 four-positive run; flow-tape pricing now flips through Wednesday with Strategy\'s confirmed 535-BTC / $43M Monday purchase at $80,340 (818,869-BTC total, 9.4% BTC Yield YTD) reasserting treasury demand while BTC printed $80,699 (-1.04%) and ETH $2,281.35 (-2.24%) on the hot April CPI 3.8% print, BofA pushing first Fed cut to 2027 and Trump escalating Iran-ceasefire framing to "massive life support" pushing WTI settled +4.19% at $102.18 / Brent $107.58', category: 'crypto', related: 'BTC' },
  { headline: 'The Trump-orchestrated three-day Russia-Ukraine Victory Day ceasefire (May 9-11, 1,000-for-1,000 prisoner exchange) formally expired Monday May 11 with Russia resuming strikes within hours — Russian drone strikes targeted Kyiv after the expiry prompting city-wide air-raid alerts per Daily Post / US News / Al Jazeera, Moscow launching a series of overnight attacks killing six people in the Dnipropetrovsk region overnight, Ukrainian authorities reporting drone, artillery and airstrikes on Kharkiv and Kherson regions killing at least 2 and wounding 7 including a 14-year-old boy and Russia citing more than 1,000 Ukrainian breaches during the May 9-11 window; Zelensky reiterated "no silence at Ukraine front" Tuesday and accused Russia of "not even particularly trying" to observe the truce while pledging retaliation, Putin separately hinted Saturday May 10 at ending the war (Al Jazeera) but the Institute for the Study of War noted military activity had decreased but did not stop during the truce and concluded "ceasefires without explicit enforcement mechanisms, credible monitoring, and defined dispute resolution processes are unlikely to hold"; Ukraine struck distant Russian gas facilities Tuesday in retaliation per Al Jazeera with Russia having launched 8,037 kamikaze drones and 6,380 attacks May 10 alone — the de-facto collapse of the truce stacks on top of the now-rejected US-Iran 14-point MoU (Trump escalating to "massive life support" Tuesday) into the Trump-Xi May 13-15 Beijing summit where Treasury Secretary Bessent confirmed Iran is on the agenda and Trump will press Xi on Chinese financial support and weapons exports to Iran', category: 'general', related: '' },
  { headline: 'Israeli forces and Hezbollah traded fire again Tuesday May 12 with the April 17 truce visibly unraveling per Times of Israel / CNN — Hezbollah launched explosive drones at Israeli troops in southern Lebanon and fired a surface-to-air missile at an Israeli drone (IDF: launch "failed"), the Israeli Air Force striking the SAM operator fleeing on motorcycle, additional strikes hitting positions in Nabatieh, Ebba, Haris (Bint Jbeil), Sajd and Kfar Rumman across the Monday-Tuesday window with at least 3 killed and 6 injured in Monday strikes alone per Express Tribune / Al Jazeera, on top of the weekend escalation (Saksakiyeh strike 7 killed incl. a child and 15 wounded, the worst single-day toll since the April 17 truce); the IDF intercepted an apparent Houthi drone near Eilat Tuesday — the first drone attack on Eilat since the Iran AND Lebanon ceasefires took effect last month, opening a fresh kinetic vector, per Times of Israel liveblog; total deaths since March 2 reached 2,846 with 8,693 injured and over 1 million displaced per Palinfo / Al Jazeera, the April 17 truce now extended through mid-May but analysts openly say it\'s unraveling — the Lebanon-front escalation runs alongside the US-Iran "massive life support" ceasefire breakdown, the Russia-Ukraine ceasefire collapse Monday and the US-hosted Lebanon-Israel peace talks set for Washington May 14-15 overlapping directly with the Trump-Xi Beijing summit and the Senate Banking CLARITY Act markup', category: 'general', related: '' },
  { headline: 'Trump told reporters Tuesday May 12 the US-Iran ceasefire is now on "massive life support" — escalating Monday\'s "life support" / "garbage" framing of Iran\'s counterproposal to end the 10-week war per CNBC / Fortune / Investing.com, with Brent July $107.58 +3.2% and WTI June settled +4.19% at $102.18 from Monday\'s $104.21/$100.20 settle, Saudi Aramco CEO Amin Nasser flagging the market losing ~100M barrels of supply per week with prolonged disruption pushing normalization into 2027 and Citi analysts noting risks remain tilted upside; Pentagon now pegs total Iran-war cost at $29B per CNN, Tehran framed the US 14-point MoU negotiated by Witkoff and Kushner as amounting to "surrender" and instead demanded US war reparations, full Iranian sovereignty over the Strait of Hormuz, an end to all sanctions, release of seized Iranian assets, agreed to suspend uranium enrichment for a shorter window than the 20-year US-proposed moratorium and rejected outright dismantling of nuclear facilities, vowing Tehran would "never bow" — Iran has put forward a staggered, phased approach to negotiations with initial stages focused on declaring an end to the war on all fronts, lifting sanctions and ending any US naval blockade while deferring talks on nuclear program to later stages per CNN, also offering to transfer enriched-uranium stockpile to a third country per Bloomberg; the kinetic-and-diplomatic standoff prolongs the effective closure of the Strait of Hormuz in place since late February, Trump physically departed for Beijing Tuesday afternoon with Treasury Secretary Bessent confirming Iran is on the May 13-15 summit agenda and Trump set to press Xi on Chinese financial support and weapons exports to Iran', category: 'general', related: '' },
  { headline: 'Trump physically departed Tuesday afternoon May 12 for the May 13-15 Beijing summit — Iran taking "center stage" per CNBC with Treasury Secretary Scott Bessent publicly confirming Iran is a topic, Trump set to press Xi specifically on Chinese financial support for Iran AND Chinese weapons exports to Iran, Strait-of-Hormuz reopening the top US ask after Trump\'s Tuesday "massive life support" escalation of the ceasefire framing and the Pentagon pegging total Iran-war cost at $29B; the 16-CEO delegation traveling with Trump includes Apple\'s Tim Cook, Tesla\'s Elon Musk, Boeing\'s Kelly Ortberg (with a potential 500-aircraft package), Citigroup and Mastercard CEOs — NVDA\'s Jensen Huang was conspicuously OMITTED from the list per CNBC, NVDA sliding marginally Tuesday morning on the absence; the Trump administration imposed fresh sanctions on Chinese companies linked to Iran Friday May 8 — blacklisting five Chinese refiners for processing Iranian oil — and China responded by publicly barring its companies from complying with US sanctions per Fortune / Foreign Policy, the first invocation of China\'s blocking statute, with China having hosted Iran\'s foreign minister earlier this week (first time since the war began in late February); expected summit announcements include bilateral "Board of Trade" identifying non-sensitive sectors for purchase commitments, limited tariff adjustments, Chinese purchases of US Boeing aircraft and agricultural goods per CSIS / Brookings / WEF — Senate Banking CLARITY Act 309-page substitute markup falls on Day 1 of the summit (Thursday May 14 at 10:30 AM ET in Dirksen Room 538) the same-week catalyst stack into hot April CPI 3.8% and BofA pushing first Fed cut to 2027', category: 'general', related: '' },
];

// Get date string in YYYY-MM-DD format
function getDateString(daysAgo = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

// Fetch company-specific news
async function fetchCompanyNews(symbol: string): Promise<any[]> {
  try {
    const to = getDateString(0);
    const from = getDateString(3); // Last 3 days
    const response = await fetch(
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`
    );
    if (!response.ok) return [];
    const data = await response.json();
    // Take top 2 per company, tag with ticker
    return data.slice(0, 2).map((item: any) => ({
      ...item,
      related: symbol, // Ensure ticker is set
    }));
  } catch {
    return [];
  }
}

export async function GET() {
  // If no API key, return fallback immediately
  if (!process.env.FINNHUB_API_KEY) {
    return NextResponse.json({
      headlines: FALLBACK_NEWS,
      source: 'fallback',
      message: 'Set FINNHUB_API_KEY in .env.local for live news'
    });
  }

  const now = Date.now();
  if (cachedHeadlines && (now - cacheTimestamp) < CACHE_DURATION) {
    return NextResponse.json({
      headlines: cachedHeadlines,
      source: 'finnhub',
      cached: true,
    });
  }

  try {
    // Fetch general news, crypto news, and company-specific news in parallel
    const [generalResponse, cryptoResponse, ...companyNews] = await Promise.all([
      fetch(
        `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`
      ),
      fetch(
        `https://finnhub.io/api/v1/news?category=crypto&token=${FINNHUB_API_KEY}`
      ),
      ...KEY_TICKERS.slice(0, 5).map(ticker => fetchCompanyNews(ticker)) // Limit to 5 to avoid rate limits
    ]);

    if (!generalResponse.ok) {
      throw new Error(`Finnhub API error: ${generalResponse.status}`);
    }

    const generalData = await generalResponse.json();
    const cryptoData = cryptoResponse.ok ? await cryptoResponse.json() : [];

    // Combine all news
    const allNews: any[] = [];

    // Add crypto news with ticker detection (using word boundaries to avoid false matches)
    const cryptoPatterns = [
      { pattern: /\b(xrp|ripple)\b/i, ticker: 'XRP' },      // Check XRP first (less common words)
      { pattern: /\b(solana|sol)\b/i, ticker: 'SOL' },       // SOL as word boundary
      { pattern: /\b(doge|dogecoin)\b/i, ticker: 'DOGE' },
      { pattern: /\b(ethereum|eth)\b/i, ticker: 'ETH' },     // ETH as word boundary
      { pattern: /\b(bitcoin|btc)\b/i, ticker: 'BTC' },      // BTC last (most common, catch-all)
    ];

    cryptoData.slice(0, 6).forEach((item: any) => {
      const headline = item.headline || '';
      // Find matching crypto ticker
      let ticker = '';
      for (const { pattern, ticker: t } of cryptoPatterns) {
        if (pattern.test(headline)) {
          ticker = t;
          break;
        }
      }

      allNews.push({
        headline: item.headline,
        category: 'crypto',
        related: ticker,
        source: item.source,
        url: item.url,
        image: item.image,
        datetime: item.datetime,
      });
    });

    // Add company news (they have tickers)
    companyNews.flat().forEach((item: any) => {
      if (item && item.headline) {
        allNews.push({
          headline: item.headline,
          category: item.category || 'company',
          related: item.related || '',
          source: item.source,
          url: item.url,
          image: item.image,
          datetime: item.datetime,
        });
      }
    });

    // Add general news
    generalData.slice(0, 10).forEach((item: any) => {
      allNews.push({
        headline: item.headline,
        category: item.category || 'general',
        related: item.related || '',
        source: item.source,
        url: item.url,
        image: item.image,
        datetime: item.datetime,
      });
    });

    // Deduplicate by headline
    const seen = new Set();
    const unique = allNews.filter(item => {
      const key = item.headline.toLowerCase().slice(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Separate news with tickers from general news
    const withTickers = unique.filter(item => item.related && item.related.length > 0);
    const withoutTickers = unique.filter(item => !item.related || item.related.length === 0);

    // Sort each group by datetime
    withTickers.sort((a, b) => (b.datetime || 0) - (a.datetime || 0));
    withoutTickers.sort((a, b) => (b.datetime || 0) - (a.datetime || 0));

    // Take up to 5 ticker news + fill rest with general news (total 8)
    const sorted = [
      ...withTickers.slice(0, 5),
      ...withoutTickers.slice(0, 8 - Math.min(withTickers.length, 5))
    ];

    cachedHeadlines = sorted;
    cacheTimestamp = now;

    return NextResponse.json({
      headlines: sorted,
      source: 'finnhub',
      cached: false,
    });
  } catch (error) {
    console.error('News API error:', error);
    if (cachedHeadlines) {
      return NextResponse.json({
        headlines: cachedHeadlines,
        source: 'finnhub',
        cached: true,
        stale: true,
      });
    }
    return NextResponse.json({
      headlines: FALLBACK_NEWS,
      source: 'fallback',
      error: 'Failed to fetch live news',
    });
  }
}
