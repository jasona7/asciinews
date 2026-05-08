import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-05-08 13:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'April BLS nonfarm payrolls printed +115K Friday May 8 8:30 ET — well above the +62K Bloomberg consensus and notably the first back-to-back monthly hiring gain in nearly a year — with March revised up to +185K (from prior +178K) and unemployment unchanged at 4.3%; sector breakdown saw health care +37K, transportation and warehousing +30K, retail trade +22K, while federal government employment continued to decline (-9K), information (-13K) and manufacturing (-2K) shed jobs — average hourly earnings rose 0.3% MoM and 3.8% YoY, labor force participation held 62.5%; the upside surprise reasserts the historically-tight-but-cooling labor narrative against the four-dissent April 29 FOMC hold (3.50-3.75%, June 16-17 the next live decision with updated SEP), tempering the rate-cut path that had been re-pricing higher into the print on the Iran-war demand-shock channel, and immediately weighing on crypto risk-off into the Friday session as BTC slipped to $80,045 (-1.28% 24h on the Crypto.com tape) into the Iran-MoU 48-hour response window per Axios and the Trump-Xi May 14-15 Beijing summit', category: 'general', related: '' },
  { headline: 'Bitcoin slipped to $80,045 Friday May 8 13:00 UTC on the Crypto.com tape (-1.28% 24h, range $79,169-$81,160, last $80,045.09, 24h volume value ~$298.96M) holding the $80K psychological line by a thread as the April BLS payrolls beat (+115K vs +62K cons, March revised up to +185K) tempered the rate-cut probability matrix that had been re-pricing higher all week — wage growth 3.8% YoY firmer than feared, labor force participation steady 62.5% — though the move is contained vs Thursday\'s break ($79,893 Crypto.com close) as the nine-day US-spot-BTC-ETF inflow streak ($2.7B cumulative through May 7) and the IBIT $66B+ AUM ~812K-BTC position keep absorbing supply; the BTC ETF complex took $1.1B over the May 5-6 two-day window (first $1B+ week since January) with IBIT capturing $871.3M across May 1/4/5 alone, BlackRock-Fidelity-led complex now soaking up >100% of fresh issuance, the CLARITY Act May 21 markup deadline (Senate Banking Chair Tim Scott schedule TBD before Memorial Day recess) the next major structural catalyst into the Iran-MoU 48-hour reply window per Axios', category: 'crypto', related: 'BTC' },
  { headline: 'Coinbase (COIN) -4% AMC Thursday May 7 reaction continues into Friday as the Q1 miss digests — $1.41B revenue (cons $1.48B, -31% YoY from $2.03B Q1 2025) and a $394.1M GAAP net loss / -$1.49 EPS hammered by $482M of unrealized losses on crypto held for investment after BTC slid through Q1, transaction revenue $755.8M (cons $805.2M, spot trading volumes -37% QoQ, transaction revenue -23% QoQ / -40% YoY) — though adjusted EBITDA $303M kept the 13-quarter consecutive-positive streak alive and the bright spot was 8.6% global trading-volume market share (a fresh ATH in both spot and derivatives) plus stablecoin revenue $305M (+11% YoY from $274M) on USDC market-cap growth and ~$4.2B Q1 derivatives volume +169% YoY; the print landed alongside Brian Armstrong\'s ~700-employee 14% workforce cut announced last week and the April 21 NY-AG Letitia James suit against Coinbase + Gemini alleging the prediction-market platforms constitute illegal gambling under state law — the after-hours reaction adds to the COIN -57%-from-peak draw-down with the CLARITY Act May 21 markup deadline (Senator Tillis pressing Chairman Tim Scott for the markup before Memorial Day recess) the structural overhang into 2H', category: 'company', related: 'COIN' },
  { headline: 'Iranian senior lawmaker Friday May 8 dismissed the Axios-reported one-page 14-point MoU framework as "more of an American wish list than a reality," telling state media "Americans will not gain anything in a war they are losing that they have not gained in face-to-face negotiations" — pushing back on the 48-hour-response timeline US officials had publicly floated Thursday — even as the framework reportedly contains a moratorium on Iranian nuclear enrichment, lifting of US sanctions, the release of billions in frozen Iranian funds globally, Iran lifting restrictions on Strait of Hormuz transit, and the US lifting the naval blockade on Iranian ports, with a 30-day window for the more-detailed implementation framework; negotiations run through Trump envoys Jared Kushner and Steve Witkoff via direct and indirect channels, the White House wants a diplomatic breakthrough before Trump wraps the May 14-15 Beijing summit ("if no deal in hand by then the president could again consider ordering military action" per officials) — China\'s FM Wang Yi told Iranian counterpart Abbas Araghchi at Beijing this week "a resumption of hostilities is inadvisable," and Iran said it appreciated a four-point Chinese proposal — Brent crude -5%+ Friday on the diplomatic-progress hopes', category: 'general', related: '' },
  { headline: 'Ether traded $2,285.60 Friday May 8 13:00 UTC on the Crypto.com tape (-1.92% 24h, range $2,265.48-$2,331.46, last $2,285.60, 24h volume value ~$118.6M) extending Thursday\'s $2,300-floor break with the April BLS payrolls upside surprise (+115K vs +62K cons, March revised up to +185K) tempering the rate-cut probability matrix and weighing on duration-sensitive crypto-risk through the Friday session — the print landing as the BTC slip to $80,045 dragged the majors complex lower for a second straight session; April had finished at +$356M net inflow for US spot ETH ETFs (first monthly net-inflow gain since October 2025 though still -$413M YTD) but the May 1-3 whale buying spree (140K ETH added, total whale holdings 13.78M→13.98M ETH) is being tested as the bid floor — Iran-MoU 48-hour reply window per Axios with senior Iranian lawmaker Friday calling the framework "an American wish list," and the Trump-Xi May 14-15 Beijing summit the cross-asset risk overlay; the four-dissent April 29 FOMC hold (3.50-3.75%) leaves June 16-17 the next live decision with updated SEP and post-payrolls fed-funds futures pricing repriced toward fewer 2026 cuts', category: 'crypto', related: 'ETH' },
  { headline: 'Solana traded $88.46 Friday May 8 13:00 UTC on the Crypto.com tape (-1.26% 24h, range $87.62-$89.64, last $88.46, 24h volume value ~$10.7M) re-joining the broader majors decline after Thursday\'s relative-strength flat session as the April BLS payrolls upside (+115K vs +62K cons / March revised +185K) re-priced rate-cut expectations lower into the Friday tape — the SOL move contained vs the BTC -1.28% / ETH -1.92% complex on the May 6 +$21.3M US-spot-SOL-ETF net inflow tape (second positive day after the November 2025 $419.38M outflow streak broke Wednesday), AUM still above $1.1B with Goldman disclosed at $108M; the late-April catalyst stack still re-pricing into the bid: Visa and Meta expanding Solana payments, Solana Swiss Research Institute launch, the April 28 quantum-resistant signature migration live alongside Israel CMA\'s BILS approval (1:1 ILS-pegged stablecoin) deploying on Solana with sub-400ms settlement, EY-audited reserves and Fireblocks custody — the Iran-MoU 48-hour reply window per Axios with Iranian lawmaker Friday pushback, and the Trump-Xi May 14-15 Beijing summit the macro overlay into mid-month', category: 'crypto', related: 'SOL' },
  { headline: 'XRP traded $1.3874 Friday May 8 13:00 UTC on the Crypto.com tape (-1.82% 24h, range $1.3778-$1.4143, last $1.3874, 24h volume value ~$6.66M) extending the Thursday $1.40-support break for a second session as the April BLS payrolls upside surprise (+115K vs +62K cons, March revised up to +185K, unemployment 4.3% steady) re-priced the rate-cut probability matrix lower and the BTC sub-$80K $80,045 print (-1.28% 24h) dragged the altcoin beta — the $1.45 ceiling now rejected for the fourth time in 96 hours; structurally the US spot XRP ETF complex still tracking $1.5B AUM across 7 products with 833.7M XRP locked (Goldman Sachs largest disclosed institutional holder at $153.8M) and on May 6 XRP-specific spot ETFs gathered +$13.03M (vs BTC +$46.33M, SOL +$21.3M, ETH negative) — the CLARITY Act May 21 markup deadline now the binding structural catalyst with Senator Tillis pressing Chairman Tim Scott to schedule before Memorial Day recess or the bill likely shelves into 2030, into the Trump-Xi May 14-15 Beijing summit and the Iran-MoU 48-hour reply window per Axios with senior Iranian lawmaker Friday pushback', category: 'crypto', related: 'XRP' },
  { headline: 'Strategy (MSTR) Q1 Tuesday May 5 print continues to weigh through Friday May 8 with BTC at $80,045 on the Crypto.com tape (-1.28% 24h) — at $80,045 spot the 818,334-BTC position (~3.9% of the 21M hard cap) at $75,537 cost / $61.81B basis is back to ~$3.7B unrealized gain, still well above the February-trough mark-to-market but the Q1 reported $14.46B unrealized BTC hit / $12.5B GAAP net loss / -$38.25 EPS framework re-asserts itself if BTC slips into the mid-70s; Q1 revenue $124.3M had beaten $120.8M cons (+11.9% YoY), Saylor raised $7.37B via Q1 ATM plus $4.32B April 1-May 3 (~$11.7B YTD vs $20B FY26 capital-issuance plan, Texas Capital Brinker $225 PT Buy reiterated) — the May 5 conference-call pivot where Saylor for the first time since the August 2020 corporate-Bitcoin-model adoption acknowledged the firm "would consider selling Bitcoin" to actively manage the balance sheet for per-share value remains the structural narrative shift, with the convertible/perpetual-preferred stack (0% 2027/28/30/31/32 converts, STRK/STRF/STRD) back into focus into the 1M-BTC FY26 target line and the BTC Yield 9.6% YTD against the post-payrolls macro repricing', category: 'company', related: 'MSTR' },
  { headline: 'Tesla (TSLA) Cybercab volume production continues at Giga Texas through Friday May 8 with Musk targeting hundreds of units per week ramp toward at least 2 million units annually at full capacity — Robotaxi service expanding in 1H 2026 to Dallas/Houston/Phoenix/Miami/Orlando/Tampa/Las Vegas with the Austin Bay-Area unsupervised service the live anchor; F1 Miami Grand Prix Fan Fest April 29-May 3 hosted the Tesla "Autonomy Pop-Up" at Lummus Park (Cybertruck + Cybercab glass-display "Future is Autonomous"), Musk telling reporters he expects robotaxis to cover "between a quarter and half of the United States by end of year"; the strategic AI/silicon angle still constructive — Intel 14A Terafab Austin locked in for vehicle/robot/SpaceX-orbital-datacenter silicon and the Apple-Intel-Samsung foundry-talks scoop (Bloomberg May 5) reinforces the US-fab-capacity competition narrative, with Intel +174% YTD; VP Lars Moravy confirmed no NHTSA 2,500-vehicle annual cap on Cybercab (FMVSS-compliant on its own — no waiver needed), Musk\'s "probably Q4" timeline for unsupervised FSD reaching customers and material Cybercab revenue not before at least 2027, Optimus Gen-3 unveil pushed later into 2026, into the Trump-Xi Beijing summit May 14-15 and the post-April-payrolls (+115K vs +62K cons) macro repricing', category: 'company', related: 'TSLA' },
  { headline: 'Apple (AAPL) Bloomberg Apple-Intel-Samsung foundry scoop (May 5) keeps repricing through Friday May 8 with Intel hitting an all-time high of $113.01 Tuesday (+13% session) before pulling back marginally — the stock now +174% YTD 2026 and +433% from the year-ago $18.96 trough on the strategic angle that Apple is courting US-fab capacity for A-series and M-series silicon to provide a "secondary option beyond longtime partner Taiwan Semiconductor" per Bloomberg, with talks "exploratory" and "early stage" but the contract path could land CPUs for Macs and iPads by 2027; Apple executives have visited the Samsung Texas fab still under development with Samsung Electronics closing at a record KRW232,500 (+5.4%) Wednesday and crossing the $1T market cap on the Korean Kospi Tuesday, the AAPL Q2 print already booked the bull case ($111.18B rev +16.6% YoY March-quarter record, $2.01 EPS +22%, iPhone $57B +22%, Greater China +28%, Services $31B +16%, June guide rev +14-17%, $100B buyback re-up and dividend +4% to $0.27 ex-date May 11) — Wedbush $350 / BofA $330 / JPMorgan $325 OW / Morgan Stanley\'s Eric Woodring $330 / Citi $315 Buy / Wells Fargo $310 / UBS $296 the post-print PT cohort, with the Trump-Xi May 14-15 Beijing summit the next direct US-China-supply-chain catalyst', category: 'company', related: 'AAPL' },
  { headline: 'Nvidia (NVDA) closed Thursday May 7 at $211.50 (+1.85%, day range $206.50-$214.20, ATH $216.83 set April 27, +21.5% MoM and +87% YoY) and holds firm into the May 20 AMC fiscal-Q1 print with the AMD +18.6% post-blowout follow-through ($10.3B rev / $1.37 EPS beat / DC +57% to $5.8B / Q2 $11.2B guide vs $10.50B cons / Meta 6GW MI450 deal floor) still the cleanest GPU-demand read-through — Wall Street modeling $78.8B revenue (~80% YoY growth), Blackwell now ~70% of data-center compute and the Hopper-to-Blackwell transition "nearly complete" per Jensen, Rubin platform shipments slated 2H 2026 (4x efficiency gain, inference-heavy positioning); the cumulative ~$710B FY26 hyperscaler capex envelope (AMZN ~$200B / MSFT $190B / GOOGL ~$185B / META $130B) empirically translating into chip operating leverage after the four-print super-week, with Jensen\'s GTC 2026 $1T combined Blackwell-plus-Vera-Rubin sales target through 2027 the 12-day overhang into the print and the Trump-Xi Beijing summit May 14-15 the cross-asset risk overlay (US Trade Rep Greer flagged "stable" relationship and "not looking for a massive confrontation," Boeing/agricultural purchase commitments and a bilateral "Board of Trade" expected) — IREN AI-Cloud expansion deal also lifting the broader AI-infrastructure tape', category: 'company', related: 'NVDA' },
  { headline: 'AMD (AMD) Tuesday May 5 +16% AMC blowout ($10.3B rev +38% YoY / $1.37 non-GAAP EPS / $0.84 GAAP / DC $5.8B +57% vs $3.67B PY / Q2 $11.2B guide ±$300M vs $10.50B cons / server-CPU TAM doubled to $120B) carried through Friday with Lisa Su\'s "Data Center is now the primary driver of our revenue and earnings growth" framing the new normal — gross margin 53% GAAP / 55% non-GAAP, operating income $1.5B GAAP / $2.5B non-GAAP, net income $1.4B GAAP / $2.3B non-GAAP — and the existing Meta 6-gigawatt MI450 deal (signed Feb 24, 160M-share performance warrant structured to vest as Instinct shipments scale) now the floor not the ceiling, with "customer engagement around MI450 Series and Helios strengthening, leading customer forecasts exceeding initial expectations," MI350 ramp through 2H 2026 and MI450 1GW deployments tracking; the print resets the bar materially higher into NVDA fiscal-Q1 May 20 AMC and the cumulative ~$710B FY26 hyperscaler capex envelope (AMZN ~$200B / MSFT $190B / GOOGL ~$185B / META $130B) demonstrably translating into chip operating leverage, the Tuesday move also lifting the broader AI-tape with XLI +2.6% / XLK +2.7% the cohort beneficiaries — DA Davidson upgrade and a wave of street upgrades hit the wires through Wednesday-Thursday', category: 'company', related: 'AMD' },
  { headline: 'Disney (DIS) Q2 Wednesday May 6 BMO blowout still anchoring the streaming/parks cohort into Friday — $25.17B revenue (cons $24.85B) / $1.57 adj EPS (cons $1.50, the $0.07 beat outpacing consensus by ~$320M of operating contribution) / DTC SVOD operating income +88% YoY to $582M on Disney+/Hulu well clear of the ~$500M / ~10% DTC-margin target the Street was modeling, Parks & Experiences a Q2 record with revenue +7% YoY and segment OI +5%, sequential streaming revenue growth accelerated 11% Q1 → 13% Q2 driven by both rate and volume, FY adjusted-EPS guide raised to ~+12% growth and FY buyback authorization raised to at least $8B from $7B prior — Josh D\'Amaro\'s first call as CEO post-Iger transition delivered hard with the streaming-margin trajectory now firmly inside the 10% DTC target before fiscal year-end and the ad-tier traction (60%+ ad-supported new-sub mix in markets where available) the cleanest direct read-through to NFLX\'s $3B FY26 ad-revenue ramp; D\'Amaro flagged Hulu-Disney+ unification economics tailwind post-Comcast settlement plus the Cars Land + Avatar/Coco park expansion capex update — the cohort relative-strength bid through the Friday April-payrolls upside surprise', category: 'company', related: 'DIS' },
  { headline: 'Microsoft (MSFT) Q3 print continues to digest through Friday May 8 with the $190B calendar-2026 capex headline (+61% YoY, includes ~$25B from higher component pricing, vs $154.6B Visible Alpha cons) still the binding overhang despite the underlying Azure +40% cc beat (vs 37-38% guide, well above the 39.3% Visible Alpha bar) and Microsoft Cloud $54.5B +29%, $4.27 EPS / $82.89B rev (cons $4.06 / $81.39B), commercial RPO +99% to $627B, 365 Copilot seats 20M (+5M QoQ) — Wall Street splits hold with Barclays at $545 from $600 OW, Wells Fargo $625 OW; the $710B four-hyperscaler total (AMZN/MSFT/GOOGL/META) now demonstrably ratified by AMD\'s Tuesday post-close blowout (Q2 guide $11.2B vs $10.50B cons, DC $5.8B +57%) confirming the chip operating leverage on the other side of the capex pipe, with NVDA fiscal-Q1 May 20 AMC the next-gating AI-hardware print into the broader Q2 cycle and the Trump-Xi Beijing summit May 14-15 the cross-asset overlay (US-China stable per USTR Greer "not looking for a massive confrontation," Boeing/agricultural commitments expected, bilateral "Board of Trade" identifying non-sensitive purchase-commitment sectors) — the Friday April-payrolls upside surprise (+115K vs +62K cons / March revised +185K) tempering the rate-cut path that had been re-pricing higher all week', category: 'company', related: 'MSFT' },
  { headline: 'Israel struck Beirut\'s southern Haret Hreik suburb Wednesday night May 6 — the first bombing of Beirut since the mid-April Israel-Hezbollah ceasefire — killing senior Hezbollah Radwan-force operations commander Malek Ballout per a source close to Hezbollah, with PM Benjamin Netanyahu personally ordering the strikes per Israeli officials; Israeli forces also carried out numerous strikes across southern and eastern Lebanon Wednesday-Thursday despite the truce killing at least 13 (four killed in the eastern Bekaa Valley), and issued new evacuation orders for three southern towns — Deir al-Zahrani, Bafroa and Habush — after accusing Hezbollah of violating the ceasefire — the IDF spokesperson reporting the army has killed more than 220 Hezbollah fighters since the April 16 ceasefire took effect, with the three-week extension Trump announced April 23 still nominally in force; the report sequence threatens the ceasefire arrangement that has underpinned the broader US-Iran truce framework and adds direct pressure to the Iran-MoU 48-hour reply window per Axios; the Israel/Hezbollah escalation lands as the Pentagon disclosed Wednesday US forces struck an Iranian oil tanker in the Sea of Oman attempting to breach the US naval blockade, France\'s Charles de Gaulle carrier en route to Hormuz', category: 'general', related: '' },
  { headline: 'Trump confirmed he will travel to Beijing for a May 14-15 summit with Chinese President Xi Jinping — his first trip to China in eight years and arriving "amid one of the most turbulent periods in modern US-China trade relations" — with US Trade Rep Jamieson Greer flagging the relationship is "stable" and the US is "not looking for a massive confrontation"; both leaders likely to announce Chinese purchases of American products including Boeing airplanes and agricultural goods plus a bilateral "Board of Trade" identifying non-sensitive sectors for purchase commitments and limited tariff adjustments — both leaders agreed to the trade-war truce on the sidelines of October\'s Busan APEC, Beijing views the high-stakes summit as a singular opportunity to secure a more stable long-term relationship; the deadline overlay constrains the Iran-MoU response window with senior Iranian lawmaker Friday May 8 dismissing the framework as "an American wish list," the White House wanting a diplomatic breakthrough before Trump wraps the China trip Friday May 15 ("if no deal in hand by then the president could again consider ordering military action" per officials) — the Trump-Xi summit also the next direct US-China-tech-supply-chain catalyst after the May 5 Bloomberg Apple-Intel-Samsung foundry-talks scoop sent Intel +13% to a $113.01 ATH', category: 'general', related: '' },
  { headline: 'Intel (INTC) hit an all-time high of $113.01 Tuesday May 5 (+13% session, +174% YTD 2026 and +433% from the year-ago $18.96 trough) on the Bloomberg scoop that Apple has held exploratory discussions about using Intel and Samsung to produce the main processors for its devices in the US — a strategic move that would offer Apple a "secondary option beyond longtime partner Taiwan Semiconductor"; talks remain "early stage" with no orders in place but the report repriced "possible" into "probable" with the contract path potentially landing CPUs for Macs and iPads by 2027, Apple executives have already visited the Samsung Texas fab still under development, Samsung Electronics closed a record KRW232,500 +5.4% Wednesday on the same scoop and crossed the $1T market cap Tuesday on the Korean Kospi (first Korean firm into the trillion-dollar club, shares +15% Tuesday); the rally adds 170% to Intel\'s share price post-trough but leaves the valuation at a crossroads — bears point to no executed contracts, the 2nm GAA Phase 2 Hwaseong fab as the longer-tail catalyst into Apple A20 Pro and Qualcomm Snapdragon 8 Elite Gen 5 silicon awards, the Trump-Xi May 14-15 Beijing summit the next direct US-China-supply-chain framework catalyst', category: 'company', related: 'INTC' },
  { headline: 'Palantir (PLTR) traded $135.99 Friday May 8 (intraday range $134.50-$140.95) holding the Q1 Monday May 4 AMC blowout multiple — $1.63B revenue (cons $1.54B, +85% YoY the fastest growth since the 2020 IPO and the 11th consecutive quarter of accelerating revenue growth), $0.33 adj EPS (cons $0.28, +18% beat), net income $870.5M roughly quadrupled from $214M YoY — US revenue +104% YoY / +19% QoQ to $1.282B, US commercial +133% YoY / +18% QoQ to $595M, 1,007 trailing-12-month commercial customers +31% YoY; raised FY26 guide to $7.65-7.66B revenue (cons $7.27B, +71% YoY) and $4.2-4.4B adj FCF (cons $4.05B), Q2 guide $1.8B vs $1.68B cons — the print blew through the ~10% implied move and Polymarket\'s 96% beat odds, but PLTR is still ~20% off the YTD high amid sector rotation with mixed analyst sentiment (Michael Burry sell rating citing valuation); the AMD-AMC-Tuesday-blowout follow-through ($10.3B rev / $1.37 EPS beat / DC $5.8B +57% / Q2 $11.2B guide) re-anchors AI-hardware leadership behind PLTR\'s software grade into Disney Wednesday\'s clear-bar, the Coinbase Thursday miss, and NVDA fiscal-Q1 May 20 AMC the next-gating super-print', category: 'company', related: 'PLTR' },
  { headline: 'US spot Bitcoin ETFs logged their nine-day inflow streak through Thursday May 7 totaling ~$2.7B with BlackRock\'s IBIT capturing the lion\'s share — the May 5-6 two-day window alone pulled in $1.1B (first $1B+ week since January), IBIT $871.3M across May 1/4/5 (May 4 the strongest day at $335.5M) and Fidelity\'s FBTC $184.57M on May 4, May 1 alone $629M; IBIT now stands as the largest spot Bitcoin ETF with >$66B AUM and ~812,000 BTC holdings (~3.8% of total Bitcoin supply), capturing $2.1-3.0B of April\'s aggregate inflows on the BlackRock complex side — the relentless bid against the BTC sub-$80K Thursday break ($79,893 Crypto.com close) and Friday $80,045 (-1.28% 24h) reads as the structural absorption that has consistently dampened correction depth in this cycle, ETF supply demand against the ~450/day net new BTC issuance roughly 2-3x the post-halving daily creation through the inflow streak; CLARITY Act May 21 markup deadline (Senate Banking Chair Tim Scott schedule TBD before Memorial Day recess) the next major structural overhang into the Iran-MoU 48-hour reply window per Axios with senior Iranian lawmaker Friday pushback', category: 'crypto', related: 'BTC' },
  { headline: 'Netflix (NFLX) digesting the Disney Wednesday Q2 BMO blowout through Friday as the cohort comp re-rates — Disney\'s DTC SVOD operating income +88% YoY to $582M / sequential streaming revenue growth 11% Q1 → 13% Q2 / 60%+ ad-supported new-sub mix in markets where available — directly read-through to NFLX\'s $3B FY26 ad-revenue ramp (+100% YoY from $1.5B 2025) and the >60% ad-supported new-sign-ups mix Netflix has already disclosed; NFLX board buyback authorization $25B (more than the $20B FY26 content budget), Q1 print earlier landed $12.25B rev +16.2% YoY beat / $1.23 EPS beat with mobile-app redesign introducing the "Clips" vertical short-form feed for original-programming highlights, post-1:10 split the stock trades in the ~$94 zone with $384B+ market cap and ~30% off last year\'s peak — Wall Street median PT $114.38 across 51 analysts (32 Buy ratings) implying ~21% upside; the streaming-cohort relative-strength bid through Friday\'s April-payrolls upside surprise (+115K vs +62K cons, March revised +185K) and the cross-asset risk-off rotation as the BTC sub-$80K break and Coinbase Q1 miss pulled crypto/altcoin-beta lower while the megacap-streaming complex held the higher-quality bid', category: 'company', related: 'NFLX' },
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
