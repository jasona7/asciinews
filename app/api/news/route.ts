import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-05-11 13:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'Intel (INTC) closed Friday May 8 at a fresh ATH $130.57 (+15% session close, +19% intraday peak — the fourth consecutive intraday record per Foreign Policy Journal / GuruFocus, +200%+ from the year-ago $18.96 trough and ~74% above the August 2000 dot-com peak of $74.88, YTD now +240% per Intellectia) on the WSJ Friday scoop confirmed by CNBC, MacRumors and 9to5Mac that Apple and Intel have reached a preliminary chip-making agreement after more than a year of intensive talks — a structural step beyond the Bloomberg May 5 "exploratory" framing that had already lifted the stock to $113.01 Tuesday — with the deal landing Intel\'s foundry services as a secondary option to longtime partner TSMC for chips based on Apple\'s own designs (much like TSMC currently does), early indications pointing to lower-end M-series silicon for select iPad and Mac models with the contract path potentially landing CPUs by 2027 (WSJ noting Apple "has concerns about using non-TSMC technology and may not ultimately move forward with another partner" if 18A/14A yields disappoint, discussions remain "early stage" with no firm orders); Bank of America raised its INTC PT to $96 from $56 saying a potential deal would add $10B in annual sales by 2030 per Stocktwits — per CNBC the US government, Intel\'s largest shareholder since last year\'s 10% stake under CEO Lip-Bu Tan, played a major role bringing Apple to the table, Commerce Secretary Lutnick meeting repeatedly with Cook (alongside Musk and Jensen) to encourage Intel-foundry work, the strategic US-fab angle feeding the cleanest tech-supply-chain narrative into the Trump-Xi May 14-15 Beijing summit where Iran now takes "center stage" per CNBC after Sunday\'s "TOTALLY UNACCEPTABLE" rejection of Tehran\'s counter-offer', category: 'company', related: 'INTC' },
  { headline: 'Apple (AAPL) finished Friday May 8 up ~1.7% on the WSJ Friday scoop confirmed by CNBC, MacRumors and 9to5Mac that Apple and Intel have reached a preliminary chip-making agreement after more than a year of intensive talks — a structural step up from the Bloomberg May 5 "exploratory" framing — with Intel surging 15% to a fresh $130.57 ATH on the same wire (peak +19% intraday, 200%+ above the year-ago $18.96 trough); the deal would give Apple a secondary foundry option to longtime partner Taiwan Semiconductor for chips based on Apple\'s own designs, early indications pointing squarely at lower-end M-series silicon for select iPad and Mac models with chips potentially landing by 2027, though WSJ specifically flags Apple "has concerns about using non-TSMC technology and may not ultimately move forward with another partner" if Intel 18A/14A yields disappoint, preserving execution risk on the foundry side; per CNBC the US government — Intel\'s largest shareholder since last year\'s 10% stake under CEO Lip-Bu Tan — played a major role bringing Apple to the table, Lutnick meetings with Cook (alongside Musk and Jensen) over the past year encouraging Intel-foundry work the strategic angle of strengthening AAPL\'s ties with the Trump administration into the May 14-15 Beijing summit now the cleanest tech-supply-chain narrative — the prior quarter print already booked the bull case ($111.18B rev +16.6% YoY March-quarter record, $2.01 EPS +22%, iPhone $57B +22%, Greater China +28%, June guide rev +14-17%, $100B buyback re-up and dividend +4% to $0.27), Wedbush $350 / BofA $330 / JPMorgan $325 OW the post-print PT cohort', category: 'company', related: 'AAPL' },
  { headline: 'AWS confirmed Friday May 8 the May 7-8 thermal event in its US-East-1 northern Virginia region was triggered by failed chillers in availability zone use1-az4 — engineers detecting overheating at ~5:25 PM PDT Thursday with the cooling failure cascading into power interruptions and hardware failures across EC2 instances and EBS storage volumes, total incident duration 12+ hours per AWS Health Dashboard updates per IT Pro / GuruFocus / CrowdFund Insider with full restoration extending into Friday; the disruption hit Coinbase core exchange functions and order matching for roughly seven hours, FanDuel sportsbook operations and the CME Group trading platform — AMZN slipped ~1% Thursday on the disclosure with the operational hit to a $200B FY26 capex pipe (AWS $37.6B Q1 +28% YoY 15-quarter-fastest at 37.7% segment OI margin) landing a counterweight to the cumulative $725B four-hyperscaler AI-capex envelope per FT compilation (AMZN $200B / GOOGL $180-190B / META $125-145B / MSFT $190B calendar-2026 +61% YoY per Hood\'s May 2 framing, total +77% YoY from last year\'s $410B record) that the Q1 cycle ratified, with thermal-design and redundancy questions now firmly in scope as the May super-week conference circuit continues into NVDA fiscal-Q1 May 20 AMC and the Trump-Xi May 14-15 Beijing summit, the bounce-back tested again Monday after the Friday records-day close masked the underlying single-region single-AZ concentration risk', category: 'company', related: 'AMZN' },
  { headline: 'Coinbase (COIN) caught fresh policy crosswinds into the Senate Banking Committee CLARITY Act markup firmed for Thursday May 14 at 10:30 AM ET per CryptoSlate / CoinDesk / Phemex — the three largest US bank trade groups formally rejected the Tillis-Alsobrooks stablecoin-yield compromise Friday May 9, four days before Chair Tim Scott gavels in, the compromise banning yield equivalent to bank deposits but allowing "bona fide activities" with Coinbase chief legal officer Paul Grewal saying the language "preserves activity-based rewards tied to real participation on crypto platforms and networks" and the company "focused on getting a bill done"; structurally Coinbase resumed full trading after the AWS US-East-1 thermal outage that knocked exchange functions offline for ~5-7 hours Thursday-Friday (use1-az4 cooling failure cascading into EC2/EBS hardware failure, AWS confirming the duration also hit FanDuel and the CME Group platform), CEO Brian Armstrong calling the outage "never acceptable" and promising a full root-cause analysis as the week packaged with 700 layoffs Monday, the $394M GAAP net loss Thursday and the Friday outage into "the worst week" framing per The Next Web; the Q1 miss reaction ($1.41B revenue cons $1.48B / -31% YoY, $394.1M GAAP net loss / -$1.49 EPS hammered by $482M unrealized losses on crypto held for investment, transaction revenue $755.8M cons $805.2M, spot volumes -37% QoQ) prompted Clear Street, Barclays, Piper Sandler and BofA to trim PTs with the stock still down ~15% YTD — Trump-Xi May 14-15 Beijing summit Day 1 overlap the macro cross-asset frame', category: 'company', related: 'COIN' },
  { headline: 'Nvidia (NVDA) holding into the May 20 AMC fiscal-Q1 print — management $78B ±2% revenue guide implying ~77% YoY growth, Visible Alpha modeling consensus in line with the midpoint, Wall Street expecting Q2 FY27 guidance at $86.6B implying further acceleration to ~85% — through the AWS US-East-1 thermal outage that took down Coinbase / FanDuel / CME, the WSJ Apple-Intel preliminary chip-making agreement that sent INTC +15% to a $130.57 ATH, and the S&P 500 / Nasdaq Friday record-day close on the +115K April BLS payrolls upside surprise; the AAPL-Intel deal a structural-positive read-through to US-fab-policy momentum that NVDA has been increasingly aligned with (Jensen-Lutnick repeated White House meetings over the past year, US-fab orders the Trump-administration favored stance), the cumulative $725B FY26 hyperscaler capex envelope per FT compilation (+77% YoY) the demand pipe with MSFT specifically directing two-thirds of its $190B calendar-2026 capex toward GPUs and CPUs for Azure and Copilot per CFO Amy Hood — Wall Street has already baked roughly 77% growth so a beat needs to print 80%+ revenue growth for a meaningful post-print pop, Q1 guide explicitly excludes all China DC compute revenue (Jensen estimates ~$50B effective-zero stream) and the Trump-Xi May 14-15 Beijing summit the cross-asset risk overlay with the Iran war expected to take "center stage" per CNBC summit analysis, US sanctioning fresh Chinese companies linked to Iran days ahead of the trip the binding bilateral irritant', category: 'company', related: 'NVDA' },
  { headline: 'Microsoft (MSFT) digesting the $190B calendar-2026 capex headline (+61% YoY, ~$25B from higher component pricing per CFO Amy Hood per Vaasblock / CNBC framing, vs $154.6B FactSet cons running roughly $55B below the guide) through Friday May 8 with the underlying FY26 Q3 Azure +39% cc print and Microsoft Cloud crossing $50B holding the bull case alongside annualized AI revenue $37B (+123% YoY) — Hood specifically directing two-thirds of the capex envelope to GPUs and CPUs for Azure and Copilot, FY26 Q3 capex hitting $30.9B (+49% YoY) compressing FCF to $15.8B even as operating cash flow stayed strong at $46.7B; the $725B four-hyperscaler total per FT compilation now tested by the Friday AWS US-East-1 thermal outage that knocked Coinbase / FanDuel / CME offline 12+ hours and adds redundancy / cooling-design questions to the AI-infrastructure-capex narrative — but the WSJ Apple-Intel preliminary chip-making agreement that lifted INTC +15% to $130.57 ATH (Microsoft already counted by TheStreet alongside Amazon and Tesla as prior Intel-foundry customers) reinforces the US-fab-policy tailwind, and the NVDA fiscal-Q1 May 20 AMC the next-gating AI-hardware print with the Trump-Xi May 14-15 Beijing summit and the Senate Banking Committee CLARITY Act markup Thursday May 14 the same-week cross-asset overlay into the June 16-17 FOMC where Boston Fed\'s Collins sided with the four April-29 dissenters and CME FedWatch shows ~70% probability of another hold', category: 'company', related: 'MSFT' },
  { headline: 'Disney (DIS) holding the Wednesday May 6 Q2 BMO blowout into the weekend — Entertainment DTC operating income $582M +88% YoY on streaming SVOD revenue +13%, the segment\'s first sustained double-digit DTC operating margin per Variety / CNBC, Entertainment-segment revenue +10%, total Q2 revenue $25.17B (cons $24.85B) / $1.57 adj EPS (cons $1.50), Parks & Experiences revenue ~$9.5B +7% YoY / segment OI +5%, FY26 adj-EPS guide reiterated at ~+12% growth, FY buyback authorization raised to at least $8B from $7B prior; CEO Josh D\'Amaro\'s first call post-Iger transition delivered hard with the streaming-margin trajectory firmly inside the FY26 DTC target, ESPN DTC the standout new contributor per Variety with digital subscriber revenue more than offsetting traditional-TV declines — shares popped ~7% post-print Wednesday and the cohort relative-strength bid held through Friday\'s S&P 500 record close 7,398.93 (+0.84%) and Nasdaq record 26,247.08 (+1.71%) on the +115K April BLS payrolls upside surprise; the streaming-margin print the cleanest direct read-through to NFLX\'s ad-revenue trajectory and the parks-segment +7% the consumer-discretionary tell against the Brent-$100-plus Strait-of-Hormuz overlay running into Trump-Xi May 14-15 Beijing', category: 'company', related: 'DIS' },
  { headline: 'Tesla (TSLA) traded between $414.50 and $431.20 with last around $428 by end-week per Tikr / 247WallSt — recovered sharply from the post-Q1 $373 April 23 low — holding the Cybercab volume-production ramp narrative through the broader records-day tape and the WSJ Apple-Intel preliminary chip-making agreement that lifted INTC +15% to $130.57 ATH (Musk one of the named CEOs Commerce Secretary Lutnick repeatedly met with over the past year to encourage Intel-foundry work, TheStreet specifically listing Tesla alongside Microsoft and Amazon as prior Intel-foundry customers); Cybercab production began at Giga Texas in April after the February prototype with H1 2026 expansion targeted across Dallas, Houston, Phoenix, Miami, Orlando, Tampa and Las Vegas per Bloomberg / Nasdaq, Robotaxi ride-hailing already operational in Austin, Dallas and Houston with plans for roughly a dozen US states by year-end and Musk targeting unsupervised FSD to customers "probably Q4"; the capex angle remains the bear-case pinch — management reiterated negative FCF for the rest of 2026 and capex guided above $25B per Heygotrade — but the AI/robot/Optimus optionality keeps the cohort bid alongside the $725B FY26 hyperscaler capex envelope per FT compilation, NVDA fiscal-Q1 May 20 AMC the next-gating AI-hardware print and the Trump-Xi May 14-15 Beijing summit the cross-asset overlay with US sanctions on fresh Chinese companies linked to Iran landing six days before the trip', category: 'company', related: 'TSLA' },
  { headline: 'Strategy (MSTR) Saylor signaled fresh BTC accumulation Sunday May 10 with the "Back to work, BTC" post on X alongside the company\'s signature "Orange Dots" chart per CoinCentral / MEXC / Stocktwits — a tell that has reliably preceded purchase announcements with a new acquisition potentially disclosed as early as Monday May 11 — reasserting the buy-side after the Saturday May 9 "BPS is EPS on the Bitcoin Standard" framing crowned Bitcoin-per-share as the principal capital-decision metric; the 818,334-BTC position (~3.9% of the 21M hard cap) at $75,537 avg cost / ~$61.83B basis sits on roughly +7.5% unrealized gain at BTC $81,204 Monday 13:00 UTC per The Block / Strategy.com, even as Q1 booked a $12.54B unrealized loss under FASB fair-value rules (BTC -23% Q1) generating a $2.2B deferred-tax asset to offset future gains; Saylor told Fortune his earlier remarks about selling Bitcoin were "intended to jam short-sellers and haters" — walking back the May 5 conference-call "would consider selling Bitcoin" pivot — but CFO Phong Le confirmed BTC will be sold to finance STRC dividends when mNAV falls below 1.0, Saylor publicly describing the model on video as "buy 10 Bitcoin, sell one to fund dividends, buy 10 more, sell one more"; Polymarket has priced meaningful odds Strategy sells some of its position this year per Decrypt, the convertible / perpetual-preferred stack (0% 2027/28/30/31/32 converts, STRK/STRF/STRD) back into focus into the 1M-BTC FY26 target', category: 'company', related: 'MSTR' },
  { headline: 'Bitcoin held above $81K Monday May 11 13:00 UTC trading $81,204.00 on the Crypto.com tape (+0.35% 24h, range $80,273.39-$82,472.65, last $81,204.00, 24h volume value ~$262.6M) — but the bid has narrowed sharply from the Friday US-session record-day +0.81% pace after Trump\'s Sunday Truth Social post called Iran\'s counter-offer "TOTALLY UNACCEPTABLE" (Iran framing the US 14-point MoU as "surrender" and demanding war reparations, full Hormuz sovereignty, sanctions removal and seized-asset release, vowing to "never bow" per CNBC / Bloomberg / Times of Israel), invalidating the late-week Project Freedom Hormuz-de-escalation narrative and prolonging the effective Strait closure with Brent surging as much as 3.5% to $104.80; weekly US-spot-BTC-ETF flows still tracked ~$1B net inflow for the week ending Friday May 9 per Cointelegraph / Coinpaper — the sixth consecutive week of net inflows, longest streak since August 2025 with $3.4B cumulative since early April — even after the May 7 single-session flip negative at -$277.5M (FBTC -$128.99M / IBIT -$98.02M); the Russia-Ukraine three-day ceasefire ran its final day Monday with Russia\'s MoD now citing 16,071 cumulative Ukrainian violations since Friday and Ukraine\'s General Staff reporting 180 front-line engagements in 24 hours, Senate Banking CLARITY Act markup firmed Thursday May 14 at 10:30 AM ET (three top US bank trade groups rejected the Tillis-Alsobrooks stablecoin compromise May 9) the same-week structural catalyst alongside Trump-Xi Beijing', category: 'crypto', related: 'BTC' },
  { headline: 'Ether pulled back to $2,330 Monday May 11 13:00 UTC trading $2,330.84 on the Crypto.com tape (+0.24% 24h, range $2,311.69-$2,382.49, last $2,330.84, 24h volume value ~$110.0M) — losing relative momentum vs BTC as Trump\'s Sunday "TOTALLY UNACCEPTABLE" Truth Social rejection of Iran\'s counter-offer (Tehran framing the US 14-point MoU as "surrender" and demanding war reparations, full Hormuz sovereignty, sanctions removal and seized-asset release while vowing to "never bow" per CNBC / Bloomberg) flipped the late-week Project Freedom de-escalation narrative and pushed Brent up 3.5% to $104.80 — altcoin-beta now ranking XRP +2.62% > SOL +1.84% > BTC +0.35% > ETH +0.24%; structurally BlackRock\'s ETHA has crossed $10B AUM in 251 days (third-fastest US ETF to that mark per Datawallet) and Fidelity\'s FETH matches the 0.25% sponsor fee with frequent waivers, but May 7 spot-ETH-ETF complex flipped -$103.5M (no fund posting positive flows, FETH -$62.26M / ETHA -$26.31M erasing most of the $271.61M cumulative from the May 1-6 four-positive run), a single whale deposited 78,000 ETH (~$178M) to Binance Friday May 8 while BlackRock and Fidelity moved 35,394 ETH to Coinbase Prime — institutional distribution / accumulation split keeping the May tape range-bound; +115K April BLS payrolls upside surprise prices CME FedWatch at ~70% probability of a June 16-17 hold, Senate Banking CLARITY Act markup Thursday May 14 (top US bank trade groups rejected the Tillis-Alsobrooks stablecoin compromise May 9) the structural catalyst', category: 'crypto', related: 'ETH' },
  { headline: 'Solana held above $95 Monday May 11 13:00 UTC trading $95.10 on the Crypto.com tape (+1.84% 24h, range $93.27-$96.90, last $95.10, 24h volume value ~$18.7M) — still above the $93 descending-resistance trendline that had capped upside since early March per CoinPedia even as Sunday\'s Trump rejection of Iran ("TOTALLY UNACCEPTABLE") compressed altcoin-beta vs the Friday early-UTC pace, the leaderboard now reading XRP +2.62% > SOL +1.84% > BTC +0.35% > ETH +0.24% on the Monday 13:00 UTC tape; the roughly $33M weekly inflow into US spot Solana ETFs per CoinPedia / MEXC reasserted institutional interest into the breakout but monthly US-spot-SOL-ETF inflows have declined six straight months (November 2025 ATH $419.38M → April 2026 $39.93M, the weakest print since the October 2025 launch) — combined SOL spot ETF holdings now approaching ~2% of circulating supply per CoinDesk, the late-April catalyst stack still anchoring the bid (Visa and Meta expanding Solana payments, Solana Swiss Research Institute launch, April 28 quantum-resistant signature migration, Israel CMA BILS approval — 1:1 ILS-pegged stablecoin on Solana with sub-400ms settlement, EY-audited reserves, Fireblocks custody) plus the Alpenglow upgrade pushing transaction finality toward sub-150ms; Trump-Xi May 14-15 Beijing the cross-asset overlay with Iran taking "center stage" per CNBC after the counter-offer rejection, Senate Banking CLARITY Act markup firmed Thursday May 14 the same-week structural catalyst with the bank-trade-group rejection of the Tillis-Alsobrooks stablecoin compromise May 9 the new friction', category: 'crypto', related: 'SOL' },
  { headline: 'XRP cleared $1.46 Monday May 11 13:00 UTC trading $1.4622 on the Crypto.com tape (+2.62% 24h, range $1.4234-$1.5079 with a Sunday wick to $1.51, last $1.4622, 24h volume value ~$18.0M) — green-leading the majors with rankings now XRP +2.62% > SOL +1.84% > BTC +0.35% > ETH +0.24% as the Senate Banking Committee CLARITY Act markup countdown tightens (Chair Tim Scott firmed Thursday May 14 at 10:30 AM ET per CoinDesk / 247WallSt / CryptoSlate — the bill that would permanently classify XRP a digital commodity, 24/7 Wall St projecting a committee-pass scenario lifts XRP into the $1.70-$2 range with full-Senate passage targeting $3-$4 year-end and $5+ on ~$5B cumulative ETF inflow); structurally the US spot XRP ETF complex pulled in $28.1M across just three days May 4-6 with cumulative inflows now ~$1.32B since launch and Standard Chartered projecting $4-8B cumulative inflows by year-end if the bill passes — but ~$3B of sell-wall sits parked above $1.45 per FXLeaders triangle-apex framing so the committee pass alone may not be enough to absorb the full overhead; the three largest US bank trade groups formally rejected the Tillis-Alsobrooks stablecoin-yield compromise Friday May 9 per Phemex / CryptoSlate adding a fresh CLARITY-friction layer four days before the gavel, the Trump-Xi May 14-15 Beijing summit Day 1 overlap the macro cross-asset frame with Iran taking "center stage" per CNBC after Sunday\'s "TOTALLY UNACCEPTABLE" Truth Social rejection of Tehran\'s counter-offer', category: 'crypto', related: 'XRP' },
  { headline: 'US spot Bitcoin ETFs tracked roughly $1B in net inflows for the week ending Friday May 9 per Cointelegraph / Coinpaper — the sixth consecutive week of net inflows and the longest sustained streak since August 2025, $3.4B cumulative since early April — even after the May 7 single-session flip negative at -$277.5M (FBTC -$128.99M / IBIT -$98.02M) and the latest week ending with sharp Thursday-Friday outflows partly offset by stronger inflows earlier ($622.75M net for the week per Coinpaper); cumulative net inflow since launch holding above $59.5B and IBIT still the largest spot BTC ETF (>$66B AUM, ~810K-BTC holdings, now larger by AUM than most of BlackRock\'s gold and EM ETFs combined), BlackRock\'s European bitcoin ETP crossing $1.1B AUM holding 14,200 BTC as of May 4; April closed at $2.44B net inflow per Coinglass / SpotedCrypto — the strongest monthly figure since October 2025 — with the week ending April 24 delivering $823.70M; the ETH complex turned negative the same May 7 session at -$103.52M (FETH -$62.26M, ETHA -$26.31M) erasing most of the $271.61M cumulative from the May 1-6 four-positive run; the flow-tape momentum compressed Monday May 11 with BTC at $81,204 13:00 UTC (+0.35%) and ETH $2,330.84 (+0.24%) after Trump\'s Sunday Truth Social rejection of Iran\'s counter-offer ("TOTALLY UNACCEPTABLE") flipped the Project Freedom de-escalation narrative, IBIT having crossed $10B AUM in 251 days the third-fastest US ETF to that mark per Datawallet', category: 'crypto', related: 'BTC' },
  { headline: 'US equity futures paused Monday May 11 after Wall Street\'s sixth straight winning week — S&P 500 futures 7,407.25 (-0.16% / -11.75), Nasdaq futures 29,284.75 (-0.16% / -47.75), Dow futures 49,614 (-0.15% / -77) per Yahoo Finance / CNBC pre-market — as Trump\'s Sunday Truth Social rejection of Iran\'s counter-offer ("TOTALLY UNACCEPTABLE") prolonged the effective closure of the Strait of Hormuz and Brent crude surged as much as 3.5% to $104.80/bbl with WTI near $99, flipping the late-week "Project Freedom" de-escalation narrative that had powered Friday\'s record closes; the cash tape Friday May 8 still anchors the structural bid — S&P 500 record 7,398.93 (+0.84%) and Nasdaq Composite record 26,247.08 (+1.71%, first ever 26,000 crossing) on the +115K April BLS payrolls upside surprise (vs ~+65K cons, unemployment 4.3% steady) and the WSJ Apple-Intel preliminary chip-making agreement, with S&P +2.3% / Nasdaq +4.5% on the week the longest weekly win streak since 2024; Monday premarket movers Moderna (MRNA) +8% on hantavirus-vaccine speculation, Nintendo (NTDOY) -7% Tokyo on Switch 2 price-hike concerns, Fox / Barrick Mining / Constellation Energy on the earnings card, INTC fresh-ATH cohort (4th straight) and AAPL holding the Friday gains into the Trump-Xi May 14-15 Beijing summit countdown and the NVDA fiscal-Q1 May 20 AMC print', category: 'general', related: '' },
  { headline: 'April BLS nonfarm payrolls printed +115K Friday May 8 8:30 ET — well above the ~+65K Wall Street consensus and the first back-to-back monthly hiring gain in nearly a year — with unemployment unchanged at 4.3%; the upside surprise reasserts the historically-tight-but-cooling labor narrative against the four-dissent April 29 FOMC hold (3.50-3.75% target range), CME FedWatch now showing roughly 28% probability of a 25bp cut at the June 16-17 FOMC and 70% probability of another hold per TradingEconomics / Schwab framing, with a small but growing contingent betting on zero 2026 cuts — Boston Fed\'s Susan Collins told Bloomberg May 7 she sided with the three other regional-bank-president dissenters at April 29 over wording suggesting eventual resumption of cuts, "war-fueled inflation risks" now outweighing labor concerns per JPMorgan Global Research framing; the print closed at S&P 500 record 7,398.93 (+0.84%) and Nasdaq record 26,247.08 (+1.71%, 26,000 first crossing) with rotation into the AI-hardware complex (INTC +15% on the WSJ Apple-deal scoop, AAPL +1.7%) absorbing most of the upside — fresh layoff cycle continues (Cloudflare -1,100 / -20%, BILL -30%, Upwork ~-25%) underscoring the AI-displacement counter-narrative, full-Senate vote on Kevin Warsh expected the week of May 11 with Warsh likely handling the June FOMC if confirmed', category: 'general', related: '' },
  { headline: 'The Trump-orchestrated three-day Russia-Ukraine Victory Day ceasefire (May 9-11, 1,000-for-1,000 prisoner exchange) ran its final day Monday May 11 with both sides accusing each other of mass violations per Kyiv Independent / PBS / RT / Al Jazeera — Russia\'s Ministry of Defense putting the cumulative count of Ukrainian breaches at 16,071 since Friday (a sharp escalation from the prior daily-briefing figure of "more than 1,000") with claimed drone and artillery strikes on civilian sites in Crimea and the Belgorod, Kursk, Kaluga, Rostov and Krasnodar regions; Ukraine\'s General Staff reported 180 combat engagements across the front line in the past 24 hours alone, said Russia launched 8,037 kamikaze drones and 6,380 attacks on Ukrainian military positions and settlements May 10, Russian attacks killing 3 civilians and wounding 16 — Zelensky reiterating Russia was "not even particularly trying" to observe the truce and pledging retaliation while Putin again said the war was "heading to an end"; the Saturday Red Square parade played out as the most pared-back in nearly two decades (first time without heavy military hardware in ~20 years amid Ukrainian-drone-strike concerns), Trump on Truth Social framing the pause as "the beginning of the end" — the de-facto collapse of the truce stacks on top of the now-rejected US-Iran 14-point MoU into the Trump-Xi May 14-15 Beijing summit', category: 'general', related: '' },
  { headline: 'Israeli strikes on Lebanon escalated sharply over the weekend — at least 39-41 killed in 24 hours per Al Jazeera / Euronews / EasternHerald with airstrikes across several southern Lebanon towns including Saksakiyeh (Sidon district, seven killed including a child and 15 wounded per Lebanon\'s Health Ministry — the deadliest single strike), Nabatieh, Bourj Rahhal and Maifadoun, plus three drone strikes south of Beirut Saturday killing 4 (two on the Beirut-Sidon coastal highway, one on a road leading to the Chouf region) per the Washington Times / PBS / CBC — the worst single-day Lebanon toll since the April 17 Israel-Hezbollah ceasefire took effect; Hezbollah claimed cross-border retaliation Saturday firing drones at Israeli military posts in northern Israel on at least two occasions, the daily kinetic exchange continuing despite the three-week-old truce per Al Jazeera with strikes also reported across rural Nabatieh and Tyre and mountain areas around Nabi Sheet, Khreibeh and Brital; the Lebanon-front escalation runs alongside the US-Iran Strait of Hormuz exchange of fire Thursday-Friday (US CENTCOM strikes after three Navy destroyers attacked, Brent reclaimed $100) and the still-pending Iranian response to the Witkoff-Kushner 14-point MoU framework via Pakistani mediation, complicating the Russia-Ukraine three-day ceasefire de-escalation tape into the Trump-Xi Beijing summit', category: 'general', related: '' },
  { headline: 'Trump rejected Iran\'s counterproposal to end the 10-week war Sunday May 10 — posting on Truth Social "I have just read the response from Iran\'s so-called \'Representatives.\' I don\'t like it — TOTALLY UNACCEPTABLE!" per CNBC / Washington Post / Times of Israel / Bloomberg / Las Vegas Sun — after Iranian state TV framed the US 14-point MoU negotiated by Witkoff and Kushner as amounting to "surrender" and insisted instead on US war reparations, full Iranian sovereignty over the Strait of Hormuz, an end to all sanctions, and release of seized Iranian assets, agreeing to suspend uranium enrichment but for a shorter window than the 20-year moratorium the US had proposed and rejecting outright dismantling of nuclear facilities; Tehran vowed it would "never bow," with Iran also offering to transfer its enriched-uranium stockpile to a third country per Bloomberg framing — the kinetic-and-diplomatic standoff prolonging the effective closure of the Strait of Hormuz that has been in place since late February, Brent crude advancing as much as 3.5% to $104.80/bbl in early Monday trade and WTI climbing to near $99 per Yahoo Finance / CNBC, the rejection invalidating the late-week "Project Freedom" Hormuz-de-escalation narrative that had helped fuel the S&P 500 / Nasdaq Friday record-day close; US-Iran talks now in limbo after the April 11 Islamabad 21-hour Vance-Witkoff-Kushner meeting also failed to reach agreement and Trump cancelled the planned April 25 Kushner-Witkoff trip as "time wasted" — the rejection landing four days before the Trump-Xi May 14-15 Beijing summit where Iran is now expected to take "center stage"', category: 'general', related: '' },
  { headline: 'The Trump administration imposed fresh sanctions on Chinese companies linked to Iran Friday May 8 — landing six days before Trump\'s scheduled May 14-15 Beijing summit with Xi and adding a sharp new bilateral irritant to a trip already operating against the backdrop of Chinese-officials\' unease about proceeding before the Iran war is resolved per CNBC / Bloomberg / Fortune; China has publicly barred its companies from complying with US sanctions after the US blacklisted five Chinese refiners for processing Iranian oil — the first invocation of China\'s blocking statute, one of its strongest tools for countering foreign sanctions per Fortune / Foreign Policy — even as Treasury Secretary Bessent confirmed Iran will be on the agenda and CNBC frames Iran as taking "center stage" potentially crowding out tariffs and rare earths; the summit nonetheless remains on track per a White House official with Boeing CEO Kelly Ortberg confirmed traveling for a potential 500-aircraft package, Citigroup and Mastercard CEOs joining, expected announcements including bilateral "Board of Trade" identifying non-sensitive sectors for purchase commitments, limited tariff adjustments and likely Chinese purchases of US Boeing aircraft and agricultural goods per CSIS / Brookings / WEF analysis; Senate Banking CLARITY Act markup falls on Day 1 of the summit (Thursday May 14 at 10:30 AM ET per CoinDesk) — Lummis "almost 99% sorted out" on stablecoin language, the binding Memorial Day recess deadline tightening', category: 'general', related: '' },
  { headline: 'UK Prime Minister Keir Starmer rejected resignation calls into Sunday May 10 after Labour suffered historic local-election losses to a surging Reform UK per NPR / Al Jazeera / CBS News — Nigel Farage\'s party gaining more than 1,400 council seats and taking control of councils including Essex, Havering (its first London local authority), Sunderland, Newcastle-under-Lyme and Suffolk, Labour losing 1,496 councillors and control of 38 councils and getting "booted from power in Wales after 27 years" — Starmer telling reporters he would "not walk away and plunge the country into chaos," describing his government as a "10-year project of renewal" and committing to lead Labour into the next general election, Farage in a newspaper column calling the results "the end of the old establishment\'s two-party system"; in parallel the FAO global-food-price index rose 1.6% in April for the third consecutive monthly gain (vegetable-oil index +5.9% to a fresh highest-since-July-2022 mark on biofuel demand and Hormuz pass-through, Meat Index a fresh record), reasserting inflation-stickiness against the Fed\'s four-dissent April 29 hold and the JPMorgan Research framing that "war-fueled inflation risks" now outweigh labor concerns — Brent reclaimed $100 / $101.12 Friday on the US-CENTCOM Hormuz exchange (three Navy destroyers attacked, US strikes in response), the Russia-Ukraine three-day ceasefire (May 9-11) entering its final day with both sides trading violation accusations the diplomatic backdrop into Trump-Xi May 14-15', category: 'general', related: '' },
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
