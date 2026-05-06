import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-05-06 13:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'AMD obliterated Q1 Tuesday May 5 AMC with $10.25B revenue (cons $9.89B, +38% YoY vs $7.44B prior-year) / $1.37 adj EPS (cons $1.29, +56% YoY) / data-center revenue $5.8B +57% YoY (cons $5.56B), net income $1.38B / $0.84 GAAP EPS more than double the $709M / $0.44 prior-year — Q2 guide the headline shock with $11.2B ±$300M revenue (cons $10.50B, ~$700M above-Street midpoint) signaling the MI350 ramp continuing through 2H and the MI450 1GW deployments still on track; stock +15% in extended trading hitting ATH $379.90 (Tuesday close $330.40, +1.4% on the day into the print, the ~10% implied move blown through), Lisa Su on the call: "we delivered an outstanding first quarter, driven by accelerating demand for AI infrastructure, with Data Center now the primary driver of our revenue and earnings growth" — the print the cleanest rebuttal to the "OpenAI behind internal targets" narrative and resets the bar materially higher into NVDA fiscal-Q1 May 20 AMC, with ARM Wednesday May 6 AMC the next-day chip read and the $710B FY26 hyperscaler capex envelope (AMZN ~$200B / MSFT $190B / GOOGL ~$185B / META $130B) now demonstrably translating into chip operating leverage', category: 'company', related: 'AMD' },
  { headline: 'US tape extended the record run into Wednesday May 6 with S&P 500 / Nasdaq holding above Tuesday\'s ATH closes (S&P 7,259.22 / Nasdaq 25,326.13 / Dow 49,298.25) on the Trump-Project-Freedom-pause de-escalation tailwind and the AMD post-close blowout ($10.25B rev / $1.37 EPS / DC +57% / Q2 $11.2B guide vs $10.50B cons) feeding back into AI-hardware leadership, with Disney Wednesday BMO clearing the bar (rev $25.2B +7% YoY beat / DTC streaming operating income +88% to $582M / Parks record $9.5B with guest-spend per cap +5%) and stock +5% to ~$107 — energy continued lower with WTI hovering ~$101 and Brent ~$108 (off Monday\'s 2026-high $114.44 close) as the Iran-deal momentum builds, 10Y at 4.32%, Samsung Electronics crossing $1T market cap on the Korean Kospi (first Korean firm into the trillion-dollar club, shares +15% on the AI-chip frenzy) the overnight Asia-tape highlight; the gating docket through Friday: Coinbase Thursday May 7 AMC ($1.5B rev / $0.26 EPS cons, -26% YoY, 14% workforce cut last week) and Friday\'s April BLS payrolls 8:30am ET (cons +49K vs +178K March, unemployment 4.3%) with the four-dissent April 29 FOMC hold (3.50-3.75%) leaving June 16-17 the next live decision', category: 'general', related: '' },
  { headline: 'Trump paused Project Freedom Tuesday "for a short period of time" citing "Great Progress has been made toward a Complete and Final Agreement with Representatives of Iran" and "based on the request of Pakistan and other Countries," with the naval blockade explicitly remaining "in full force and effect" — Secretary of State Rubio at the White House confirmed Operation Epic Fury is over and the US is now in a "defensive" posture seeking to reopen the Strait, the pause coming one day after USCENTCOM\'s Adm. Brad Cooper-led day-one operation that escorted two US-flagged merchant vessels through Hormuz under guided-missile-destroyer cover (100+ aircraft, 15,000 service members) and saw the US Navy sink seven IRGC fast boats while UAE intercepted 15 missiles + 4 drones with one igniting the Fujairah oil zone; Iran\'s drone-and-missile strike on the UAE was the first since the April 8 Pakistan-mediated ceasefire and the Fujairah hit (three Indian nationals hospitalized, terminus of the Abu Dhabi Crude Oil Pipeline that bypasses Hormuz) the symbolic escalation — markets priced relief Tuesday with Brent and WTI selling off hard, the S&P/Nasdaq printing fresh records, and Iran-headline beta unwinding through the energy/defense complex into Wednesday\'s Disney print and Friday\'s payrolls', category: 'general', related: '' },
  { headline: 'Strategy (MSTR) printed Q1 Tuesday May 5 with the $12.54B GAAP net loss / -$38.25 EPS the headline (a $14.46B unrealized BTC mark-to-market hit drove a $14.47B operating loss as BTC crashed below $62K during the February sell-off, vs $5.92B operating loss Q1 2025) but revenue $124.3M beat the $120.8M cons (+11.9% YoY from $111.1M) and bitcoin holdings 818,334 BTC (~3.9% of the 21M hard cap) at $75,537 average cost / $61.81B basis, market value ~$66.2B at $80.9K spot ($+4.4B unrealized gain on the rebound from February lows) — Strategy raised $7.37B via Q1 ATM offerings plus $4.32B from April 1 through May 3 (~$11.7B YTD vs $20B FY26 capital-issuance plan, Texas Capital\'s Binner $225 PT Buy reiterated), the Q1 buying spree adding 103,690 BTC at $7.5B+ between early Feb and late April; Saylor\'s "no acquisitions in the trailing reporting window" stance held into the print with treasury-team focus on capital-structure work and the 0% 2027/2028/2030/2031/2032 converts plus the STRK/STRF/STRD perpetual-preferred stack continuing to fund the 1M-BTC FY26 target — options pricing 8.07% implied move with Coinbase Thursday May 7 AMC the gating exchange print right behind', category: 'company', related: 'MSTR' },
  { headline: 'Bitcoin reclaimed $82,205 Wednesday May 6 (+1.15% 24h, intraday range $80,300-$82,580 as buyers ran the $80K hold from Tuesday\'s post-AMD softness back through the $81,800 prior rejection zone, 24h volume robust ~$58B) on the Trump-Project-Freedom-pause Iran de-escalation tape with the $2.44B April US-spot-ETF inflow context (strongest month since October 2025, +$629.7M single-day May 1) and IBIT ~812K BTC valued ~$66.7B holding 62% spot-ETF market share, total spot-BTC-ETF AUM $103.78B record — Strategy\'s Q1 print Tuesday confirmed 818,334 BTC at $75,537 cost (now ~+$5.5B unrealized gain on the rebound from $62K February lows) with the BlackRock+Fidelity-led ETF complex absorbing the corporate buying overhang as Coinbase Thursday May 7 AMC ($1.5B rev / $0.26 EPS cons, -26% YoY) the next gating exchange print and the CLARITY Act May 21 markup deadline (Senate Banking Chair Tim Scott under pressure from Senator Tillis to schedule the markup before Memorial Day recess or the bill likely shelves into 2030) the structural overhang into the back half', category: 'crypto', related: 'BTC' },
  { headline: 'Ether $2,404 Wednesday +0.67% 24h (range $2,388-$2,418, the $2,400 reclaim through the AMD/Disney post-print + Trump-pause Tuesday-Wednesday tape with $137M 24h volume on Crypto.com alone) lagging BTC on relative strength even with US spot ETH ETFs flipping to a $101.2M net inflow May 1 — that print reversed the four-day $183.7M outflow stretch April 27-30, April finished at +$356M (first monthly net-inflow gain since October 2025 though still -$413M YTD), whales added 140K ETH in a four-day buying spree May 1-3 (total whale holdings 13.78M→13.98M ETH); the four-dissent FOMC vote 8-4 (Miran for cut, three dissents on the language) at the April 29 Powell-final-meeting hold (3.50-3.75%) leaves June 16-17 the next live decision with updated SEP, the Trump-paused Project Freedom de-escalation Tuesday plus Disney clear-bar Wednesday capping the geopolitical/earnings risk-bid that had supported BTC over ETH through the prior 72 hours and the question whether the BTC/ETH ratio compresses on a Coinbase-print-driven altcoin bid Thursday', category: 'crypto', related: 'ETH' },
  { headline: 'XRP $1.4400 Wednesday +2.29% 24h (range $1.4078-$1.4520, the $1.45 leg cleared as buyers ran the $1.40 reclaim from Tuesday into the AMD/Disney post-print tape, $1.50 the next watched zone) as US spot XRP ETFs snapped their longest 2026 inflow streak Apr 30 with $5.83M outflow (zero outflow days April 10-29, ~20 trading days, monthly gross $82M) — cumulative net inflows $1.29B across 7 products with combined AUM ~$1B and 828.3M XRP locked, Goldman Sachs the largest disclosed institutional holder at $153.8M, and the CLARITY Act calendar collapsing fast: 120 crypto firms petitioned the Senate Banking Committee, Senator Tillis pledged to press Chairman Tim Scott to schedule the markup when the Senate returned May 11, Memorial Day recess starts May 21 — if Scott doesn\'t markup before recess the bill likely shelves until 2030 per multiple Hill sources; the Trump-Iran de-escalation Tuesday plus the AMD blowout plus Disney clear-bar Wednesday combine for the cleanest macro+sector tailwind into Coinbase Thursday May 7 AMC and the structural altcoin re-rating thesis', category: 'crypto', related: 'XRP' },
  { headline: 'Solana $89.63 Wednesday +5.05% 24h (range $85.32-$90.18, leading the major-coin tape on relative strength as buyers cleared the $88-90 resistance zone with the $92 next watched leg into Wednesday\'s broader risk-on continuation) firming alongside the Trump-Project-Freedom-pause Iran de-escalation tape and AMD-blowout follow-through — US spot SOL ETFs went the other way with SOLZ posting a -$585K outflow May 1 (~0.57% of AUM) as the sixth straight monthly decline played out (November 2025 $419.38M → April 2026 $39.93M, weakest month since October 2025 launch), AUM still through $1B with Goldman disclosed at $108M; the late-April catalysts still in the bid: Visa and Meta expanding Solana payments, Solana Swiss Research Institute launch, the April 28 quantum-resistant signature migration live alongside Israel CMA\'s BILS approval (1:1 ILS-pegged stablecoin) deploying on Solana with sub-400ms settlement, EY-audited reserves and Fireblocks custody — Coinbase Q1 earnings Thursday May 7 AMC the next gating event for the broader exchange/altcoin tape and the SOL-vs-ETH relative-strength thesis', category: 'crypto', related: 'SOL' },
  { headline: 'Apple (AAPL) closed Tuesday at $276.83 (intraday $275.23-$284.57) trading below the $280.14 May 1 post-earnings close as the consensus PT held the $295.23 28-analyst Buy median and the post-print mark-up cohort stayed intact: Wedbush $350 (Street-high May 1), BofA $330, JPMorgan $325 OW, Morgan Stanley\'s Eric Woodring $330, Citi $315 Buy, Wells Fargo $310, UBS $296 — the Q2 print itself ($111.18B rev +16.6% YoY March-quarter record, $2.01 EPS +22%, iPhone $57B +22%, Greater China +28%, Services $31B +16%, June guide rev +14-17% with "significantly higher" memory the swing factor, $100B buyback re-up and dividend +4% to $0.27 ex-date May 11) the bull-case anchor with 49.3% gross margin still beating guidance; the AMD blowout post-close steals AI-hardware oxygen Wednesday but the AAPL Services attach + record $397B Berkshire cash backdrop (Buffett "take a bow" callout to Cook at the Saturday meeting) keeps the high-quality megacap bid intact through Disney Wednesday and Coinbase Thursday', category: 'company', related: 'AAPL' },
  { headline: 'Nvidia (NVDA) closed Tuesday at $198.25 (intraday $195.80-$200.24, off the April 27 ATH $216.61, ~$5T market cap held) into Wednesday May 20 AMC fiscal-Q1 with the AMD post-close blowout ($10.25B rev / $1.37 EPS / +57% DC / Q2 $11.2B guide vs $10.50B cons) the cleanest near-term GPU-demand read-through and a tailwind for the NVDA setup — Wall Street modeling $78.8B revenue (~80% YoY growth), Blackwell now ~70% of data-center compute and the Hopper-to-Blackwell transition "nearly complete" per Jensen, Rubin platform shipments slated 2H 2026 (4x efficiency gain, inference-heavy positioning); the cumulative ~$710B FY26 hyperscaler capex envelope (AMZN ~$200B / MSFT $190B / GOOGL ~$185B / META $130B) now empirically demonstrating its read-through into chip operating leverage after the four-print super-week, with Jensen\'s GTC 2026 $1T combined Blackwell-plus-Vera-Rubin sales target through 2027 the 14-day overhang into the print as the Project-Freedom-pause de-risk Tuesday lifted broader AI-tape beta back toward record highs', category: 'company', related: 'NVDA' },
  { headline: 'Disney (DIS) cleared the Q2 bar Wednesday May 6 BMO with $25.2B revenue (+7% YoY, vs $24.84B cons the headline beat) / $1.49 EPS in line / DTC streaming operating income surging +88% YoY to $582M on Disney+/Hulu — well clear of the ~$500M ~10% DTC-margin target the Street was modeling — and Parks & Experiences segment a record $9.5B with guest spend per cap +5% (Domestic strength offsetting International visitation softness), free cash flow $4.5B trailing-12-month — Josh D\'Amaro\'s first call as CEO post-Iger transition delivered with stock +5% to ~$107 at the Wednesday open, the streaming-margin trajectory now firmly inside the 10% DTC target before fiscal year-end and the ad-tier traction (60%+ ad-supported new-sub mix in markets where available) the cleanest direct read-through to NFLX\'s $3B FY26 ad-revenue ramp; D\'Amaro flagged Hulu-Disney+ unification economics tailwind post-Comcast settlement plus the Cars Land + Avatar/Coco park expansion capex update, with Coinbase Thursday May 7 AMC the next gating earnings event after the AMD AMC blowout Tuesday lit AI-tape beta back to record highs', category: 'company', related: 'DIS' },
  { headline: 'Tesla (TSLA) Cybercab volume production now confirmed underway at Giga Texas after Musk\'s late-April Q1-call confirmation — first steering-wheel-less unit rolled off February 17, the Cybercab made its public-relations debut at the Miami F1 Grand Prix Fan Fest (April 29-May 3 "Autonomy Pop-Up" at Lummus Park, Cybertruck towing the two-seater inside a glass display marked "Future is Autonomous"), VP Lars Moravy confirmed no NHTSA 2,500-vehicle annual cap (designed FMVSS-compliant on its own — no waiver needed); 60 Model Ys spotted staged in Phoenix as the Robotaxi expansion (Austin/Dallas/Houston live, Phoenix/Miami/Orlando/Tampa/Las Vegas next, ~12 US states by year-end) ramps before mid-year, Musk\'s "probably Q4" timeline for unsupervised FSD reaching customers and material Cybercab revenue not before at least 2027, Optimus Gen-3 unveil pushed later into 2026 and Intel 14A Terafab Austin still locked in for vehicle/robot/SpaceX-orbital-datacenter silicon — Polymarket pricing 97% odds of TSLA hitting $375 in May with the stock in the $380-395 zone post-AMD-blowout-induced AI-beta lift', category: 'company', related: 'TSLA' },
  { headline: 'Coinbase (COIN) into Thursday May 7 AMC Q1 print with Wall Street consensus $0.26 EPS (-86% YoY, -60% QoQ) and $1.5B revenue (-26.1% YoY, vs $2.03B Q1 2025) — Bitcoin fell 22% / Ether -41% during Q1 with global crypto-exchange volume cratering ~48% from October 2025 peak to $4.3T in March (lowest since October 2024) compressing the take-rate line, transaction-revenue modeled $837M (-33.7% YoY on Q1 trading volume of 233M, -40.7%) and the durability tell on the $550-630M company subscription-and-services guide ($617M cons, leaning on blockchain rewards/stablecoin income/Coinbase One growth); Brian Armstrong announced last week a 14% workforce cut just days ahead of the print, the institutional-vs-retail mix the second key read (retail ~1.5% take, institutional <5bps), with COIN -57% from peak and the print the cleanest read on whether the regulatory-thaw narrative (CLARITY Act May markup window closing into Memorial Day recess May 21) is translating into operating leverage — the AMD blowout Tuesday and Trump-paused Project Freedom Tuesday the macro/AI tailwinds into Thursday\'s exchange print', category: 'company', related: 'COIN' },
  { headline: 'Microsoft (MSFT) Q3 print delivered $4.27 EPS / $82.89B rev (cons $4.06 / $81.39B), Azure +40% cc (vs 37-38% guide, well above the 39.3% Visible Alpha bar), Microsoft Cloud $54.5B +29%, commercial RPO +99% to $627B, 365 Copilot seats 20M (+5M QoQ) — but tape closed -~4% the Thursday after the print on the $190B calendar-2026 capex headline (+61% YoY, includes ~$25B from higher component pricing, vs $154.6B Visible Alpha cons) as Q4 capex set to exceed the $40B Q3 record; Wall Street splits — Barclays cut to $545 from $600 OW, Wells Fargo $625 OW — the capex-fatigue reflex outweighing the Azure re-acceleration as the $710B four-hyperscaler total (AMZN/MSFT/GOOGL/META) now demonstrably ratifies the spend after AMD\'s Tuesday post-close blowout (Q2 guide $11.2B vs $10.50B cons, DC +57%) confirms the chip operating leverage on the other side of the capex pipe, with NVDA fiscal-Q1 May 20 AMC the next-gating AI-hardware print into the broader Q2 cycle', category: 'company', related: 'MSFT' },
  { headline: 'Samsung Electronics crossed the $1T market cap Wednesday May 6 on the Korean Kospi — first Korean firm into the trillion-dollar club — with shares +15% on the AI-chip-frenzy bid as Samsung\'s HBM3e memory ramp into the NVDA Blackwell + AMD MI350 hyperscaler-deployment cycle ratifies the Q1 capex-pipe operating-leverage read-through that AMD\'s Tuesday post-close blowout ($10.25B rev / $1.37 EPS / DC +57% / Q2 $11.2B guide vs $10.50B cons) confirmed; Kospi printed a record high on the lift, SK Hynix the cohort beneficiary as the HBM duopoly tightens through 2026 with TSMC CoWoS-L capacity the binding constraint and Samsung 2nm GAA Phase 2 Hwaseong fab the longer-tail catalyst into the Apple A20 Pro and Qualcomm Snapdragon 8 Elite Gen 5 silicon awards — Korean-tape fund flows compounding the move with the Won-USD pair firming through the 1,300 zone and the AI-megacap-vs-rest dispersion now extending across geographies into NVDA fiscal-Q1 May 20 AMC and Friday\'s April BLS payrolls (cons +49K) the next gating prints', category: 'general', related: '' },
  { headline: 'Brent reversed sharply lower Tuesday to ~$109.85 -2.8% (WTI -3.9% to settle $102.27 per barrel, off Monday\'s 2026-high $114.44 close and Wednesday\'s $126/bbl four-year intraday peak) as Trump\'s Project Freedom pause and "Great Progress" Iran-deal language collapsed the war-premium that had spiked crude +5.8% Monday — OPEC+ Sunday May 3 confirmed a +188,000 bpd June output increase across the seven-country bloc (Saudi +62K / Russia +62K / Iraq +26K / Kuwait +16K / Kazakhstan +10K / Algeria +6K / Oman +5K, slightly below the 206K May bump and explicitly without UAE participation post-exit), Barclays raised 2026 Brent forecast to $100/bbl on the supply-response math even as Strait exports remain ~4% of normal under the persisting blockade and ~2M bpd of UAE offshore production stays shut-in; 10Y yield slipped to 4.32% as the energy-driven inflation re-acceleration risk faded, with the four-dissent April 29 FOMC hold (3.50-3.75%) leaving June 16-17 the next live decision and Friday\'s April BLS payrolls (cons +49K) the labor-market tell into that meeting', category: 'general', related: '' },
  { headline: 'Berkshire Hathaway 2026 annual meeting wrapped Saturday in Omaha as Greg Abel\'s first as CEO under the "Legacy Continues" theme — Abel opened the Q&A by responding to a deepfake Warren Buffett asking why investors should hold the stock and pivoted it into an AI-cybersecurity discussion, explicitly RULED OUT a Berkshire break-up ("absolutely not, we see our conglomerate structure working without the bureaucracy and bloated costs") and signaled "AI for the sake of AI" is off the table; Buffett took the front row to a standing ovation as a "60" jersey was raised to the CHI Health Center rafters marking 60 years as CEO with Buffett telling the room "Greg is doing everything I did and then some, and he\'s doing it better in all cases" — Q1 operating earnings $11.34B +18% YoY (insurance underwriting +28%), net income $10.1B more than double last year\'s $4.6B, cash pile a fresh record $397B; arena only ~half-full vs prior-year 40K+ capacity (BRK.B traded lower into Monday despite the across-the-board good marks but recovered Tuesday with the broader tape on the Iran de-escalation)', category: 'company', related: 'BRK.B' },
  { headline: 'Spirit Airlines wind-down day five with all flights cancelled May 2 and ~17,000 employees out of work after the $500M federal bailout collapsed Friday — the airline filed for bankruptcy twice since 2024 and the rising-fuel-cost / industry-shift combination proved too much, the Trump-administration cash-for-stake deal falling through at the eleventh hour; Southwest moved 20,000 stranded passengers across the prior weekend (United/Delta/JetBlue capped rescue fares ~$200 one-way), restructuring assumptions had been jet fuel $2.24/gal for 2026 vs the ~$4.51/gal end-April reality on the Iran-war Brent spike — JetBlue, Frontier and Allegiant the structural slot-and-gate beneficiaries with ULCC consolidation pulled forward, the Tuesday Brent reversal to ~$109.85 (-2.8% on the Project Freedom pause) reduces the fuel-cost squeeze on the survivors but doesn\'t reverse Spirit\'s collapse — bondholders pursuing an orderly asset sale through bankruptcy court with airframes/slots/gates the saleable inventory', category: 'general', related: '' },
  { headline: 'Palantir (PLTR) crushed Q1 Monday May 4 AMC with $1.63B revenue (cons $1.54B, +85% YoY the fastest growth since the 2020 IPO and the 11th consecutive quarter of accelerating revenue growth), $0.33 adj EPS (cons $0.28), net income $870.5M roughly quadrupled from $214M YoY — US revenue +104% YoY / +19% QoQ to $1.282B, US commercial +133% YoY / +18% QoQ to $595M, 1,007 trailing-12-month commercial customers +31% YoY; raised FY26 guide to $7.65-7.66B revenue (cons $7.27B, +71% YoY) and $4.2-4.4B adj FCF (cons $4.05B), Q2 guide $1.8B vs $1.68B cons — the print blew through the ~10% implied move and Polymarket\'s 96% beat odds, with PLTR closing Tuesday in the $148-152 zone holding the multiple expansion through the broader-tape rally; AMD AMC Tuesday delivered the AI-hardware blowout right behind ($10.25B rev / $1.37 EPS / DC +57% / Q2 $11.2B guide), the back-to-back super-prints anchoring AI-software-and-hardware leadership into Disney Wednesday, Coinbase Thursday and NVDA fiscal-Q1 May 20 AMC', category: 'company', related: 'PLTR' },
  { headline: 'Netflix (NFLX) closed Tuesday at ~$94.50 (post-1:10 split, $384B+ market cap) trading slightly higher with the broader record-tape lift even as the stock remains ~30% off last year\'s peak after the board\'s $25B buyback authorization (more than the $20B FY26 content budget) — ad-tier guided to $3B FY26 revenue (+100% YoY from $1.5B 2025) with the ad-supported plan now >60% of new sign-ups in markets where it\'s available and 190M monthly-active-viewers globally as of November 2025 (325M+ total subs), Q1 print landed $12.25B rev +16.2% YoY beat / $1.23 EPS beat, mobile-app redesign introducing "Clips" vertical short-form feed for original-programming highlights; Wall Street median PT $114.38 across 51 analysts (32 Buy ratings) implying ~21% upside, with Disney Q2 print Wednesday May 6 BMO the next direct streaming-cohort comp on Disney+/Hulu/ESPN+ ARPU and ad-tier traction (cons $24.85B / $1.49 EPS, ~$500M SVOD operating-income target, D\'Amaro\'s first call as CEO)', category: 'company', related: 'NFLX' },
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
