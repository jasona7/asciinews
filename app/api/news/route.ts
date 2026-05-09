import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-05-09 01:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'Intel (INTC) closed Friday May 8 at a fresh ATH $130.57 (+15% session, +200%+ from the year-ago $18.96 trough and ~74% above the August 2000 dot-com peak of $74.88) on the WSJ Friday scoop that Apple and Intel have reached a preliminary chip-making agreement after more than a year of intensive talks — a meaningful step beyond the Bloomberg May 5 "exploratory" framing that had already lifted the stock to $113.01 Tuesday — with the deal landing Intel as a secondary foundry option to longtime partner TSMC for A-series and M-series silicon, contract path potentially landing CPUs for Macs and iPads by 2027 (WSJ noting Apple "has concerns about using non-TSMC technology and may not ultimately move forward with another partner" if 18A/14A yields disappoint and discussions remain "early stage" with no firm orders); per WSJ, Commerce Secretary Howard Lutnick met repeatedly with Tim Cook over the past year — alongside Musk and Jensen Huang — to encourage Intel-foundry work, the strategic angle of strengthening US-fab capacity feeds the cleanest tech-supply-chain narrative into the Trump-Xi May 14-15 Beijing summit (Boeing CEO Kelly Ortberg confirmed traveling per CNBC for a potential 500-aircraft package); Samsung Electronics also touched a record KRW232,500 +5.4% Wednesday on the same foundry-talks track, Korean trillion-dollar-club entrant', category: 'company', related: 'INTC' },
  { headline: 'Apple (AAPL) +~1.7% Friday May 8 on the WSJ Friday scoop that Apple and Intel have reached a preliminary chip-making agreement after more than a year of intensive talks — a meaningful step up from the Bloomberg May 5 "exploratory" framing — with Intel surging +15% to a $130.57 ATH on the same wire; the deal would give Apple a secondary foundry option to longtime partner Taiwan Semiconductor for A-series and M-series silicon, contract path potentially landing CPUs for Macs and iPads by 2027, though WSJ specifically flags Apple "has concerns about using non-TSMC technology and may not ultimately move forward with another partner" if 18A/14A yields disappoint, preserving execution risk; Commerce Secretary Howard Lutnick has met repeatedly with Tim Cook over the past year (alongside Musk and Jensen) to encourage Intel-foundry work, the strategic angle of strengthening AAPL\'s ties with the Trump administration into the May 14-15 Beijing summit now the cleanest tech-supply-chain narrative — the Q2 print already booked the bull case ($111.18B rev +16.6% YoY March-quarter record, $2.01 EPS +22%, iPhone $57B +22%, Greater China +28%, June guide rev +14-17%, $100B buyback re-up and dividend +4% to $0.27 ex-date May 11), Wedbush $350 / BofA $330 / JPMorgan $325 OW the post-print PT cohort', category: 'company', related: 'AAPL' },
  { headline: 'AWS suffered a thermal-event outage in its US-East-1 northern Virginia region Thursday May 7 evening into Friday May 8 — engineers detecting overheating in availability zone use1-az4 at ~5:25 PM PDT Thursday, the cooling failure triggering power loss that damaged EC2 instances and EBS volumes across affected hardware racks, total incident duration ~18-20 hours from detection to full resolution per AWS Health Dashboard updates; the disruption hit Coinbase core exchange functions for more than five hours during the Asia-overnight window, FanDuel sportsbook operations, and the CME Group trading platform, with AWS "making progress" toward bringing additional cooling capacity online to recover remaining affected hardware through Friday — the operational hit to AMZN ($200B FY26 capex, AWS $37.6B Q1 +28% YoY 15-quarter-fastest at 37.7% segment OI margin) lands a counterweight to the cumulative ~$710B four-hyperscaler AI-capex envelope (AMZN ~$200B / MSFT $190B / GOOGL ~$185B / META $130-145B) that the Q1 cycle ratified, with Q2 thermal-design and redundancy questions now in scope for analysts as the May super-week conference circuit continues into NVDA fiscal-Q1 May 20 AMC and the Trump-Xi May 14-15 Beijing summit', category: 'company', related: 'AMZN' },
  { headline: 'Coinbase (COIN) exchange functions were knocked offline for more than five hours overnight Thursday May 7 into Friday May 8 by the AWS US-East-1 thermal outage in northern Virginia (use1-az4 availability zone power loss after a cooling-system failure, ~18-20 hour total incident duration also impacting FanDuel sportsbook and the CME Group trading platform) — adding operational friction to a tape already reckoning with the Q1 miss reaction ($1.41B revenue cons $1.48B / -31% YoY, $394.1M GAAP net loss / -$1.49 EPS hammered by $482M unrealized losses on crypto held for investment, transaction revenue $755.8M cons $805.2M with spot volumes -37% QoQ), and the spot-BTC-ETF flow flip Thursday (-$277.5M out, ending the nine-day $2.7B inflow streak); adjusted EBITDA $303M kept the 13-quarter consecutive-positive streak alive and 8.6% global trading-volume market share held the ATH read, but the back-to-back cyclical/operational hits compound the COIN -57%-from-peak draw with the CLARITY Act May 21 markup deadline (Lummis publicly committed "we are going to mark up the Clarity Act in May," Tim Scott "nearing consensus, working toward a bipartisan markup") the next structural catalyst into Memorial Day recess and the post-payrolls less-dovish rate path', category: 'company', related: 'COIN' },
  { headline: 'Nvidia (NVDA) traded ~$198 Friday May 8 (37 covering analysts at Strong Buy with $270.73 mean PT implying ~26% upside) holding into the May 20 AMC fiscal-Q1 print — Wall Street modeling $78.8B revenue (~78-79% YoY growth) and $1.77 adj EPS +118.5% YoY — through the AWS US-East-1 thermal outage that took down Coinbase / FanDuel / CME and the WSJ Apple-Intel preliminary chip-making agreement that sent INTC +15% to a $130.57 ATH; the AAPL-Intel deal a structural-positive read-through to US-fab-policy momentum that NVDA has been increasingly aligned with (Jensen-Lutnick repeated White House meetings over the past year, US-fab orders the Trump-administration favored stance), the cumulative ~$710B FY26 hyperscaler capex envelope (AMZN $200B / MSFT $190B / GOOGL ~$185B / META $130-145B) the demand pipe and AMD\'s Tuesday May 5 Q2 guide ($11.2B vs $10.50B cons / DC $5.8B +57%) the cleanest read-through; Wall Street has already baked ~79% growth so a beat needs to print 80%+ revenue growth for a meaningful post-print pop, Q1 guide explicitly excludes all China DC compute revenue (Jensen estimates ~$50B effective-zero stream) — the Trump-Xi May 14-15 Beijing summit the cross-asset risk overlay with Boeing CEO Kelly Ortberg confirmed traveling per CNBC', category: 'company', related: 'NVDA' },
  { headline: 'Microsoft (MSFT) digesting the $190B calendar-2026 capex headline (+61% YoY, ~$25B from higher component pricing, vs $154.6B Visible Alpha cons) through Friday May 8 with the underlying Azure +40% cc print (vs 37-38% guide, well above the 39.3% Visible Alpha bar) and Microsoft Cloud $54.5B +29%, $4.27 EPS / $82.89B rev (cons $4.06 / $81.39B), commercial RPO +99% to $627B and 20M 365 Copilot seats (+5M QoQ) holding the bull case — Wall Street splits hold with Barclays at $545 from $600 OW, Wells Fargo $625 OW; the $710B four-hyperscaler total now tested by the Friday AWS US-East-1 thermal outage that knocked Coinbase / FanDuel / CME offline for ~18-20 hours and adds redundancy / cooling-design questions to the AI-infrastructure-capex narrative — but AMD\'s Tuesday post-close blowout (Q2 guide $11.2B vs $10.50B cons, DC $5.8B +57%) confirms the chip operating leverage on the other side of the capex pipe, with NVDA fiscal-Q1 May 20 AMC the next-gating AI-hardware print and the Trump-Xi May 14-15 Beijing summit (Boeing CEO Ortberg confirmed traveling per CNBC) the cross-asset overlay', category: 'company', related: 'MSFT' },
  { headline: 'Disney (DIS) traded ~$107.78 Friday May 8 (intraday $107.54-$109.32) holding the Wednesday May 6 Q2 BMO blowout multiple two sessions on — Entertainment DTC operating income $582M +88% YoY on $5.49B revenue with margins reaching 11% (segment\'s first double-digit operating margin), Entertainment-segment revenue +10% to $11.72B, subscription-and-affiliate fees +14% to $7.8B on streaming price hikes and ad revenue +5% on higher impressions, total Q2 revenue $25.17B (cons $24.85B) / $1.57 adj EPS (cons $1.50), Parks & Experiences Q2-record revenue +7% YoY / segment OI +5%, FY adj-EPS guide reiterated at ~+12% growth, FY buyback authorization raised to at least $8B from $7B prior; Josh D\'Amaro\'s first call as CEO post-Iger transition delivered hard with the streaming-margin trajectory firmly inside the 10% DTC target before fiscal year-end, ad-tier traction (60%+ ad-supported new-sub mix in markets where available) the cleanest direct read-through to NFLX\'s $3B FY26 ad-revenue ramp — the cohort relative-strength bid through Friday\'s S&P 500 record close 7,398.93 (+0.84%) and Nasdaq record 26,247.08 (+1.71%)', category: 'company', related: 'DIS' },
  { headline: 'Tesla (TSLA) traded ~$409 Friday May 8 (intraday $402.12-$415.83) holding the Cybercab volume-production ramp narrative through the broader records-day tape — Giga Texas now running ~2,000 units per week with year-end target of 10,000 weekly, Robotaxi service expanded to 12 major US cities by Q2 with a fleet of 5,000+ purpose-built no-steering-wheel-no-pedals Cybercab vehicles after the late-2025 Austin launch, Musk targeting "a quarter to half of the United States covered by end of year"; the strategic AI/silicon-policy angle reinforced Friday by the WSJ Apple-Intel preliminary chip-making agreement (INTC +15% to $130.57 ATH) — Musk one of the named CEOs Commerce Secretary Lutnick repeatedly met with over the past year to encourage Intel-foundry work — keeping Tesla aligned with the US-fab-policy track as the Intel 14A Texas Terafab ramps for vehicle/robot/SpaceX-orbital-datacenter silicon; analyst coverage 5 Strong Buy / 18 Buy / 17 Hold / 4 Sell / 3 Strong Sell across 47 names, bullish 49% / bearish 15%, with Cybercab/Tesla Semi/Megapack 3 on schedule for volume production in 2026 per management commentary and Optimus first-generation lines being installed', category: 'company', related: 'TSLA' },
  { headline: 'Strategy (MSTR) Q1 Tuesday May 5 print continues to weigh through Friday May 8 with BTC reclaiming above $80K on the Crypto.com tape ($80,250 +0.53% 24h after the Thursday $79,168 24h-low test) — at current spot the 818,334-BTC position (~3.9% of the 21M hard cap) at $75,532 cost / ~$61.83B basis sits at ~$3.86B unrealized gain, well above the February-trough mark-to-market though the Q1 reported $14.46B unrealized BTC hit / $12.54B GAAP net loss / -$38.25 EPS framework re-asserts itself if BTC slips into the mid-70s; the AWS US-East-1 thermal outage Thursday-Friday taking Coinbase exchange functions offline >5 hours and the spot-BTC-ETF flow flip Thursday (-$277.5M out, ending the nine-day $2.7B inflow streak) compound the operational overhang — Saylor\'s May 5 conference-call pivot acknowledging the firm "would consider selling Bitcoin" to actively manage the balance sheet for per-share value remains the structural narrative shift, with the convertible / perpetual-preferred stack (0% 2027/28/30/31/32 converts, STRK/STRF/STRD) back into focus into the 1M-BTC FY26 target line and the BTC Yield 9.6% YTD; CLARITY Act May 21 markup deadline now the binding next catalyst', category: 'company', related: 'MSTR' },
  { headline: 'Bitcoin reclaimed above the $80K psychological line Friday May 8 closing the US session at $80,250.30 on the Crypto.com tape (+0.53% 24h, range $79,168.70-$80,514.00, last $80,250.30, 24h volume value ~$241.5M) bouncing the Thursday $79,168 24h-low test as the records-day risk-on tape (S&P 500 record 7,398.93 +0.84%, Nasdaq record 26,247.08 +1.71%) and the WSJ Apple-Intel preliminary chip-making agreement scoop overrode the ETF-flow reversal — Thursday May 7 the nine-day $2.7B inflow streak ended with -$277.5M out (FBTC -$128.99M / IBIT -$98.02M), cumulative net inflow since launch sliding to $59.49B and total net assets across the funds falling to $106.77B from $108.76B prior session; the AWS US-East-1 thermal outage knocking Coinbase exchange functions offline >5 hours during the Asia-overnight window adds operational friction to the exchange-flow data, IBIT remains the largest spot Bitcoin ETF with >$66B AUM and ~812K-BTC holdings (~3.8% of total Bitcoin supply); Iran-MoU still under review via Pakistani mediators with Tehran considering the framework after parliamentary "American wish list" pushback, US Navy disabling two more Iranian tankers Friday and Iran striking the UAE wounding three keeping the geopolitical-risk overlay live into the Trump-Xi May 14-15 Beijing summit; CLARITY Act May 21 markup deadline binding into Memorial Day recess', category: 'crypto', related: 'BTC' },
  { headline: 'Ether reclaimed above $2,300 Friday May 8 closing the US session at $2,309.58 on the Crypto.com tape (+1.05% 24h, range $2,265.48-$2,321.40, last $2,309.58, 24h volume value ~$91.4M) outperforming BTC modestly as the records-day risk-on tape (S&P 500 record close 7,398.93 +0.84%, Nasdaq record 26,247.08 +1.71%) absorbed the Thursday May 7 spot-ETH-ETF flow flip (-$103.52M, no fund posting positive flows — Fidelity FETH -$62.26M largest outflow, BlackRock ETHA -$26.31M, erasing most of the $271.61M cumulative gain from the May 1-6 four-positive-session run) — the bid validating the May 1-3 whale-buying spree (140K ETH added, total whale holdings 13.78M→13.98M ETH) as the bid-floor narrative; the AWS US-East-1 thermal outage Thursday-Friday taking Coinbase exchange functions offline >5 hours adds operational friction to exchange-flow data, the April BLS payrolls upside surprise (+115K vs +65K cons, unemployment 4.3%) tempering the rate-cut probability matrix into June 16-17 FOMC — Iran-MoU 48-hour reply window still active via Pakistani mediators, US Navy disabling two more Iranian tankers Friday and Iran striking the UAE wounding three keeping the geopolitical overlay live into the Trump-Xi May 14-15 Beijing summit', category: 'crypto', related: 'ETH' },
  { headline: 'Solana led the majors complex higher Friday May 8 closing the US session at $92.57 on the Crypto.com tape (+4.90% 24h, range $87.62-$92.81, last $92.57, 24h volume value ~$12.07M) reclaiming the low-$90s for the first time in two weeks — the SOL outperformance vs BTC +0.53% / ETH +1.05% / XRP +3.15% the cleanest sign of altcoin-beta recovering on the records-day risk-on tape (S&P 500 record close 7,398.93 +0.84%, Nasdaq record 26,247.08 +1.71%) and the WSJ Apple-Intel preliminary chip-making agreement scoop; structurally the monthly US-spot-SOL-ETF inflow trend has now declined six straight months — November 2025 ATH $419.38M → April $39.93M (weakest monthly print since the October 2025 launch) — but the late-April catalyst stack still anchors the bid (Visa and Meta expanding Solana payments, Solana Swiss Research Institute launch, April 28 quantum-resistant signature migration, Israel CMA BILS approval — 1:1 ILS-pegged stablecoin deploying on Solana with sub-400ms settlement, EY-audited reserves, Fireblocks custody); the AWS US-East-1 thermal outage knocking Coinbase exchange functions offline >5 hours adds exchange-side friction, the Iran-MoU still under Iranian review via Pakistani mediators and the Trump-Xi May 14-15 Beijing summit the macro overlay', category: 'crypto', related: 'SOL' },
  { headline: 'XRP reclaimed $1.40+ Friday May 8 closing the US session at $1.4294 on the Crypto.com tape (+3.15% 24h, range $1.3778-$1.4300, last $1.4294, 24h volume value ~$6.7M) breaking out of the four-rejection $1.40-resistance pattern of the prior 96 hours as the records-day risk-on tape (S&P 500 record close 7,398.93 +0.84%, Nasdaq record 26,247.08 +1.71%) and the WSJ Apple-Intel preliminary chip-making agreement scoop drove altcoin-beta higher (SOL +4.90% leader / XRP +3.15% / ETH +1.05% / BTC +0.53%); structurally the US spot XRP ETF complex still tracks $1.5B AUM across 7 products with 833.7M XRP locked (Goldman Sachs largest disclosed institutional holder at $153.8M), May 6 inflows +$13.03M held the bid through the broader May 7 BTC -$277.5M / ETH -$103.52M ETF flow flip — CLARITY Act May 21 markup deadline now the binding structural catalyst with Senator Lummis publicly committing "we are going to mark up the Clarity Act in May" and Banking Chair Tim Scott "nearing consensus, working toward a bipartisan markup," Polymarket odds for Clarity-signed-this-year ~47% (down from 82% February), Kalshi ~15% before July / ~37% before August, Tillis-Alsobrooks stablecoin-yield compromise (banning bank-equivalent yield, allowing "bona fide activities") backed by Coinbase and Circle keeps the bipartisan path live', category: 'crypto', related: 'XRP' },
  { headline: 'US spot Bitcoin ETFs flipped to net outflow Thursday May 7 — $277.5M leaving the complex and ending a five-day inflow run that had pulled in ~$2.7B over nine sessions through Wednesday — Fidelity\'s FBTC led withdrawals at -$128.99M followed by BlackRock\'s IBIT -$98.02M, cumulative net inflow since launch sliding to $59.49B and total net assets across the funds falling to $106.77B from $108.76B the prior session; the ETH ETF complex turned negative the same day at -$103.52M with no fund posting positive flows (Fidelity FETH -$62.26M, BlackRock ETHA -$26.31M), erasing most of the $271.61M cumulative gain from the May 1-6 four-positive-session run — the flow flip lands as the AWS US-East-1 thermal-event outage in northern Virginia (use1-az4) takes Coinbase exchange functions offline >5 hours during the Thursday-evening to Friday-morning window (FanDuel and CME Group also affected, ~18-20 hour total incident) but the spot-crypto tape recovered Friday with BTC reclaiming $80K (+0.53% 24h to $80,250) and altcoins outperforming on the records-day risk-on rotation; CLARITY Act May 21 markup deadline now binding into Memorial Day recess, Lummis confirming "we are going to mark up the Clarity Act in May" and Banking Chair Tim Scott "nearing consensus, working toward a bipartisan markup"', category: 'crypto', related: 'BTC' },
  { headline: 'S&P 500 closed Friday May 8 at a record 7,398.93 (+0.84%) and the Nasdaq Composite at a record 26,247.08 (+1.71%) — both posting fresh all-time intraday and closing highs as the April BLS payrolls upside surprise (+115K vs ~+65K cons, unemployment 4.3% steady) and the WSJ Friday scoop that Apple and Intel have reached a preliminary chip-making agreement after more than a year of intensive talks drove tech-led leadership into the close — the Dow inched up just 12.19 points / +0.02% to 49,609.16 with rotation into the AI-hardware complex (INTC +15% to $130.57 ATH, AAPL +~1.7%) absorbing most of the index-level upside; the bid persisted through fresh US-Iran exchange of fire in the Strait of Hormuz overnight (US Navy disabling two more Iranian tankers — M/T Sea Star III and M/T Sevda — attempting to breach the blockade, Iran launching ballistic missiles and drones at the UAE wounding three in Fujairah) as Trump insisted the April 8 ceasefire remains in place and characterized the strikes as "just a love tap" in an ABC News call — Iran still reviewing the Axios-reported MoU framework via Pakistani mediators with Tehran considering the proposal, the diplomatic-progress hopes overriding the kinetic risk into the Trump-Xi May 14-15 Beijing summit countdown', category: 'general', related: '' },
  { headline: 'April BLS nonfarm payrolls printed +115K Friday May 8 8:30 ET — well above the ~+65K Wall Street consensus and notably the first back-to-back monthly hiring gain in nearly a year — with March revised up to +185K (from prior +178K) and unemployment unchanged at 4.3%; sector breakdown saw health care +37K, transportation and warehousing +30K, retail trade +22K, while federal government employment continued to decline (-9K), information (-13K) and manufacturing (-2K) shed jobs — average hourly earnings rose 0.3% MoM and 3.8% YoY, labor force participation held 62.5%, the Trump White House Council of Economic Advisers framing emphasizing 12,600 factory-construction jobs propelled by trillions in advanced-manufacturing and data-center investments; the upside surprise reasserts the historically-tight-but-cooling labor narrative against the four-dissent April 29 FOMC hold (3.50-3.75%, June 16-17 the next live decision with updated SEP), markets re-pricing the path toward fewer 2026 cuts and per Reuters the data "bolstered financial market views that the Fed would leave interest rates unchanged into 2027" — the print closing at S&P 500 record 7,398.93 (+0.84%) and Nasdaq record 26,247.08 (+1.71%) with rotation into the AI-hardware complex (INTC +15% on the WSJ Apple-deal scoop, AAPL +~1.7%) absorbing most of the upside', category: 'general', related: '' },
  { headline: 'US Navy CENTCOM disabled two more Iranian oil tankers Friday May 8 — M/T Sea Star III and M/T Sevda — attempting to breach the US naval blockade of Iranian Gulf-of-Oman ports, after exchanging fire with Iranian forces in the Strait of Hormuz overnight; Iran retaliated with a fresh missile-and-drone strike on the UAE wounding three in Fujairah (UAE air defense engaging two ballistic missiles and three drones) — the second cross-Hormuz UAE attack of the week — even as Iranian FM Abbas Araghchi said Iran "will never bow to pressure" and condemned the US "reckless military adventure," Pakistani FM spokesman Tahir Andrabi remained "hopeful" that the parties strike a deal soon and that Tehran\'s consideration of the latest US proposal was a "good sign"; Trump insisted the April 8 ceasefire remains in effect, calling the strikes "just a love tap" in an ABC News call — Secretary Rubio told reporters Iran was expected to respond to the MoU proposal Friday, parliamentary spokesperson Ebrahim Rezaei dismissed the framework this week as "more of an American wish list than a reality," Iranian Foreign Ministry spokesman Esmaeil Baghaei said authorities are still considering and would relay their response via Pakistani mediators when complete', category: 'general', related: '' },
  { headline: 'Trump announced Friday May 8 that Russia and Ukraine will enter a three-day Victory Day ceasefire beginning Saturday May 9 through Monday May 11 with a 1,000-for-1,000 prisoner exchange, framing it as a US-diplomacy result on Truth Social ("the request was made directly by me") and thanking both Putin and Zelensky for agreeing to the pause — the announcement followed a Putin-Trump phone call earlier in the week where the two leaders "emphasised our countries were allies during World War II and discussed the possibility of a ceasefire during the Victory Day celebrations" per the Kremlin readout, Putin spokesman Peskov framing the truce extension as "Trump\'s initiative"; the surprise three-day pause stacks on top of the live US-Iran ceasefire framework (April 8) and the Israel-Hezbollah April 16 truce that Israel has selectively breached this week (Beirut Haret Hreik strike Wednesday killing Radwan-force operations commander Malek Ballout, southern Lebanon strikes Friday killing 10 in four locations) — geopolitical-de-escalation tape into the Trump-Xi May 14-15 Beijing summit, with Boeing CEO Kelly Ortberg now confirmed joining the China trip per CNBC for a potential 500-aircraft mega-order spread across multiple programs', category: 'general', related: '' },
  { headline: 'Trump-Xi Beijing summit countdown into the May 14-15 dates with the President-Trump trip lineup expanding — CNBC Thursday May 7 reporting Boeing CEO Kelly Ortberg has been invited and is set to join the trip alongside Citigroup and Mastercard CEOs, the SCMP reporting a potential package of as many as 500 Boeing aircraft spread across multiple programs as the focal commercial deliverable (Ortberg told Reuters in April: "without the administration\'s support, I don\'t think we\'ll see any near-term large orders out of China"); per CNBC analysis the Iran war is now "likely to take center stage" at the summit — Trump seeking Beijing\'s cooperation to press Tehran to accept the MoU framework — leaving "less scope to resolve issues like tariffs and rare earth supplies," Beijing pressing Washington to ease export controls on advanced semiconductors and chipmaking equipment while the US is seeking expanded rare-earth access; both leaders likely to announce purchase commitments plus a bilateral "Board of Trade" identifying non-sensitive sectors, the WSJ Apple-Intel preliminary chip-making agreement Friday adds a fresh US-fab-policy data point into the trade-track framework, the Trump-orchestrated Russia-Ukraine three-day ceasefire (May 9-11, 1,000-prisoner exchange) the diplomatic-de-escalation backdrop', category: 'general', related: '' },
  { headline: 'Israel struck southern Lebanon and the eastern Bekaa region intensively through Friday May 8 — Israeli airstrikes killing 10 people in four locations across southern Lebanon per official tallies (Lebanon MoH cumulative since March 2 now 2,759 killed / 8,512 injured), villages north of Bint Jbeil including Jumeijma, Beit Yahon and Baraashit "particularly heavily hit," IDF intercepting a suspicious aerial target over southern Lebanon and evacuating wounded troops near the eastern border sector, multiple strikes also reported in rural districts including the outskirts of Nabatieh and Tyre and mountain areas around Nabi Sheet, Khreibeh and Brital — Hezbollah retaliated with a swarm of drones at the Israeli Mount Meron air-traffic-control base ~8km from the border at ~12:50 PM and rocket-and-artillery strikes at IDF vehicle concentrations near Bint Jbeil, citing the Wednesday Beirut Haret Hreik strike that killed Radwan-force operations commander Malek Ballout (the first Beirut bombing since the April 16 ceasefire) as justification; the Lebanon-front escalation runs alongside the US-Iran Strait of Hormuz exchange of fire Friday and the still-pending Iranian response to the Axios MoU framework via Pakistani mediation, complicating the Trump-orchestrated Russia-Ukraine three-day Victory Day ceasefire (May 9-11) de-escalation tape into the Trump-Xi Beijing summit', category: 'general', related: '' },
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
