import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-05-07 13:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'AMD ripped +16.85% Wednesday May 6 — best post-earnings session in seven years — closing the day in the $385-390 zone after the Tuesday AMC blowout ($10.25B rev / cons $9.89B / +38% YoY / $1.37 adj EPS / cons $1.29 / +56% YoY / DC revenue $5.8B +57% YoY / Q2 guide $11.2B ±$300M vs $10.50B cons, ~$700M above-Street midpoint) ratified by the call disclosure that the existing Meta 6-gigawatt MI450 deal (signed Feb 24, includes 160M-share performance warrant structured to vest as Instinct shipments scale) is now the floor not the ceiling and Lisa Su doubled the server-CPU TAM forecast to $120B on AI-driven demand — DA Davidson and a wave of street upgrades hit the wires, the 11M-share volume the highest single-session print since 2018, MI350 ramp through 2H and MI450 1GW deployments tracking; the print resets the bar materially higher into NVDA fiscal-Q1 May 20 AMC and the cumulative ~$710B FY26 hyperscaler capex envelope (AMZN ~$200B / MSFT $190B / GOOGL ~$185B / META $130B) now demonstrably translating into chip operating leverage as Lisa Su told the call "Data Center is now the primary driver of our revenue and earnings growth"', category: 'company', related: 'AMD' },
  { headline: 'US tape into Thursday May 7 AM with futures pointing to follow-through after Wednesday\'s record print — S&P 500 closed +1.46% to 7,365.12 (first close above 7,300), Nasdaq Composite +2.02% to 25,838.94, Dow +1.24% / +612.34 to 49,910.59, Russell 2000 also at a new ATH — on the Trump-Iran 14-point MoU framework, the WTI/Brent crude rout extending Thursday (WTI -3.5% to $91.73, Brent -3.3% to $97.93, both extending Wednesday\'s -7%/-8% rip lower) and AMD\'s post-print follow-through (+16.85% Wednesday best post-earnings session in seven years) plus Disney +5% close to ~$108 on the BMO beat ($1.57 EPS vs $1.50 cons / $25.17B rev / SVOD operating income +88% to $582M / FY adjusted EPS +12% guide / $8B FY buyback raised from $7B); 10Y holding 4.36% (-7bps cumulative on the Iran-de-escalation tape), Apple +2.6% Wednesday approaching its fall ATH on the Bloomberg Apple-Intel-Samsung foundry-talks scoop, NVDA +2% on the Corning AI-infrastructure manufacturing partnership — gating docket: Coinbase tonight May 7 AMC ($1.5B rev / $0.26-0.36 EPS cons, -26% YoY, 14% workforce cut last week) and Friday\'s April BLS payrolls 8:30am ET (cons +49K vs +178K March, unemployment 4.3%) with the four-dissent April 29 FOMC hold (3.50-3.75%) leaving June 16-17 the next live decision', category: 'general', related: '' },
  { headline: 'Iran-MoU framework moved into late-stage Thursday May 7 with Tehran expected to formally reply to the one-page 14-point memorandum today per CNN/Axios/Al Jazeera reporting — the document specifies a 30-day negotiation window for the more detailed implementation framework and a 12-15 year enrichment moratorium with IAEA verification, with Pakistani mediators carrying drafts back-and-forth and Revolutionary Guard guaranteeing safe Hormuz passage in writing; Trump publicly imposed a "one week" deadline at the White House Wednesday afternoon ("they have one week, that\'s it, no more games") while threatening "the bombing starts, and it will be, sadly, at a much higher level and intensity than before" if Iran walks — Project Freedom remains paused but the naval blockade on Iranian ports stays "in full force and effect" until ratification, oil priced in the deal momentum with WTI -3.5% Thursday to $91.73 (-10% cumulative from Monday\'s $114.44 Brent peak) and Brent -3.3% to $97.93, the war premium that spiked crude +5.8% Monday now nearly fully unwound, 10Y at 4.36% (-7bps cumulative); the Iran response window plus Friday\'s April BLS payrolls (cons +49K) the next macro tells into the June 16-17 FOMC', category: 'general', related: '' },
  { headline: 'Strategy (MSTR) printed Q1 Tuesday May 5 with the $12.54B GAAP net loss / -$38.25 EPS the headline (a $14.46B unrealized BTC mark-to-market hit drove a $14.47B operating loss as BTC crashed below $62K during the February sell-off, vs $5.92B operating loss Q1 2025) but revenue $124.3M beat the $120.8M cons (+11.9% YoY from $111.1M) and bitcoin holdings 818,334 BTC (~3.9% of the 21M hard cap) at $75,537 average cost / $61.81B basis, market value ~$66.2B at $80.9K spot ($+4.4B unrealized gain on the rebound from February lows) — Strategy raised $7.37B via Q1 ATM offerings plus $4.32B from April 1 through May 3 (~$11.7B YTD vs $20B FY26 capital-issuance plan, Texas Capital\'s Binner $225 PT Buy reiterated), the Q1 buying spree adding 103,690 BTC at $7.5B+ between early Feb and late April; Saylor\'s "no acquisitions in the trailing reporting window" stance held into the print with treasury-team focus on capital-structure work and the 0% 2027/2028/2030/2031/2032 converts plus the STRK/STRF/STRD perpetual-preferred stack continuing to fund the 1M-BTC FY26 target — options pricing 8.07% implied move with Coinbase Thursday May 7 AMC the gating exchange print right behind', category: 'company', related: 'MSTR' },
  { headline: 'Bitcoin printed $82,320 Wednesday May 6 (the highest spot since January 31, 24h range $80,901-$82,580 as buyers cleared the $82K resistance through the Trump-Iran-MoU and oil-crash tape, +5.4% over the trailing 5 sessions, 24h volume ~$58B) on the combined Trump-Project-Freedom-pause + 14-point MoU + WTI -7% to $95 risk-on cocktail with the $2.44B April US-spot-ETF inflow context (strongest month since October 2025, +$629.7M single-day May 1) and IBIT ~812K BTC valued ~$66.8B holding 62% spot-ETF market share, total spot-BTC-ETF AUM $103.78B record — Strategy\'s Q1 print Tuesday confirmed 818,334 BTC at $75,537 cost (now ~+$5.5B unrealized gain on the rebound from $62K February lows) with the BlackRock+Fidelity-led ETF complex absorbing the corporate buying overhang as Coinbase Thursday May 7 AMC ($1.5B rev / $0.26-0.36 EPS cons range, -26% YoY) the next gating exchange print and the CLARITY Act May 21 markup deadline (Senate Banking Chair Tim Scott under pressure from Senator Tillis to schedule the markup before Memorial Day recess or the bill likely shelves into 2030) the structural overhang into the back half', category: 'crypto', related: 'BTC' },
  { headline: 'Ether $2,412 Wednesday +2.18% 24h (range $2,360-$2,418, +5.61% trailing five sessions, the $2,400 reclaim through the AMD-Disney-Iran-MoU triple-tailwind Wednesday tape on $137M 24h Crypto.com volume and BTC-correlated risk-on after the $80,901 open) closing the relative-strength gap to BTC as US spot ETH ETFs flipped to a $101.2M net inflow May 1 (reversing the four-day $183.7M outflow stretch April 27-30, April finished at +$356M for the first monthly net-inflow gain since October 2025 though still -$413M YTD), whales added 140K ETH in a four-day buying spree May 1-3 (total whale holdings 13.78M→13.98M ETH); the four-dissent FOMC vote 8-4 (Miran for cut, three dissents on the language) at the April 29 Powell-final-meeting hold (3.50-3.75%) leaves June 16-17 the next live decision with updated SEP, the Trump 14-point Iran MoU framework Wednesday plus Disney clear-bar Wednesday plus oil -7% feeding the broader risk-on bid that pulled the BTC/ETH ratio in tighter, with Coinbase Thursday AMC the next gating altcoin/exchange catalyst', category: 'crypto', related: 'ETH' },
  { headline: 'XRP $1.4200 Wednesday +1.50% 24h (range $1.40-$1.45, +2.70% trailing seven sessions, $2B 24h trading volume as buyers held the $1.40 base through the AMD/Disney/Iran-MoU triple tape but the $1.45 zone capped the upside on the second test of the session, $1.50 the next watched leg) as US spot XRP ETFs snapped their longest 2026 inflow streak Apr 30 with $5.83M outflow (zero outflow days April 10-29, ~20 trading days, monthly gross $82M) — cumulative net inflows $1.29B across 7 products with combined AUM ~$1B and 828.3M XRP locked, Goldman Sachs the largest disclosed institutional holder at $153.8M, and the CLARITY Act calendar collapsing fast: 120 crypto firms petitioned the Senate Banking Committee, Senator Tillis pledged to press Chairman Tim Scott to schedule the markup when the Senate returned May 11, Memorial Day recess starts May 21 — if Scott doesn\'t markup before recess the bill likely shelves until 2030 per multiple Hill sources; the Trump-Iran 14-point MoU framework Wednesday plus the AMD +16.85% rip plus Disney +8.6% clear-bar combine for the cleanest macro+sector tailwind into Coinbase Thursday May 7 AMC and the structural altcoin re-rating thesis', category: 'crypto', related: 'XRP' },
  { headline: 'Solana $89.60 Thursday May 7 +5.17% 24h (range $84.20-$90.10, the leader of the majors on a sharp reversal as buyers reclaimed the $85-86 zone Wednesday overnight and ripped through Tuesday\'s $89.63 high on the second push, $90 the watched breakout) outperforming BTC (+1.48%) and ETH (+0.99%) on the session with the Iran-MoU follow-through tape lifting risk-on altcoin beta — US spot SOL ETFs caught a $14.2M net inflow Wednesday May 6 (first positive day since April 25) as the six-month outflow streak (November 2025 $419.38M → April 2026 $39.93M) showed the first sign of bottoming, AUM held above $1B with Goldman disclosed at $108M; the late-April catalysts re-pricing into the bid: Visa and Meta expanding Solana payments, Solana Swiss Research Institute launch, the April 28 quantum-resistant signature migration live alongside Israel CMA\'s BILS approval (1:1 ILS-pegged stablecoin) deploying on Solana with sub-400ms settlement, EY-audited reserves and Fireblocks custody — Coinbase Q1 earnings tonight May 7 AMC the next gating event for the broader exchange/altcoin tape and the SOL relative-strength reversal thesis', category: 'crypto', related: 'SOL' },
  { headline: 'Apple (AAPL) ripped +2.6% Wednesday May 6 toward the prior fall ATH on the Bloomberg Apple-Intel-Samsung foundry-talks scoop (Tim Cook on the Q2 call had flagged advanced-node availability as the binding supply-chain constraint hitting Mac mini and Mac Studio) — the report sent Intel +13% Tuesday + ~4% Wednesday, Samsung Electronics closed at a record KRW232,500 +5.4%, the strategic angle being Apple courting US-fab capacity for A-series and M-series silicon as TSMC CoWoS and 2nm capacity tightens through 2026, talks "early stage" with no orders in place per the report; the Q2 print itself ($111.18B rev +16.6% YoY March-quarter record, $2.01 EPS +22%, iPhone $57B +22%, Greater China +28%, Services $31B +16%, June guide rev +14-17%, $100B buyback re-up and dividend +4% to $0.27 ex-date May 11) the bull-case anchor with 49.3% gross margin still beating guidance, Wedbush $350 / BofA $330 / JPMorgan $325 OW / Morgan Stanley\'s Eric Woodring $330 / Citi $315 Buy / Wells Fargo $310 / UBS $296 the post-print PT cohort, with the record $397B Berkshire cash backdrop (Buffett "take a bow" callout to Cook at the Saturday meeting) keeping the high-quality megacap bid intact through Coinbase Thursday', category: 'company', related: 'AAPL' },
  { headline: 'Nvidia (NVDA) ripped +2% Wednesday May 6 on the Corning long-term US-manufacturing-for-AI-infrastructure partnership announcement (the cohort move helped lift the Nasdaq +2.02% to its 25,838.94 record) into the May 20 AMC fiscal-Q1 print with the AMD +16.85% post-blowout follow-through ($10.25B rev / $1.37 EPS / +57% DC / Q2 $11.2B guide vs $10.50B cons / Meta 6GW MI450 deal floor / server-CPU TAM doubled to $120B) the cleanest near-term GPU-demand read-through and a tailwind for the setup — Wall Street modeling $78.8B revenue (~80% YoY growth), Blackwell now ~70% of data-center compute and the Hopper-to-Blackwell transition "nearly complete" per Jensen, Rubin platform shipments slated 2H 2026 (4x efficiency gain, inference-heavy positioning); the cumulative ~$710B FY26 hyperscaler capex envelope (AMZN ~$200B / MSFT $190B / GOOGL ~$185B / META $130B) now empirically demonstrating its read-through into chip operating leverage after the four-print super-week, with Jensen\'s GTC 2026 $1T combined Blackwell-plus-Vera-Rubin sales target through 2027 the 14-day overhang into the print as the Iran-MoU-framework de-risk Wednesday plus oil -7% lifted broader AI-tape beta to record highs', category: 'company', related: 'NVDA' },
  { headline: 'Disney (DIS) crushed Q2 Wednesday May 6 BMO with $25.17B revenue (cons $24.85B) / $1.57 adj EPS (cons $1.50, the $0.07 beat outpacing the consensus by ~$320M of operating contribution) / DTC SVOD operating income +88% YoY to $582M on Disney+/Hulu — well clear of the ~$500M ~10% DTC-margin target the Street was modeling — Parks & Experiences a Q2 record with revenue +7% YoY and segment OI +5%, sequential streaming revenue growth accelerated 11% Q1 → 13% Q2 driven by both rate and volume, FY adjusted-EPS guide raised to ~+12% growth and FY buyback authorization raised to at least $8B from $7B prior — stock +8.6% intraday to ~$110 zone (+5.49% pre-market), Josh D\'Amaro\'s first call as CEO post-Iger transition delivered hard with the streaming-margin trajectory now firmly inside the 10% DTC target before fiscal year-end and the ad-tier traction (60%+ ad-supported new-sub mix in markets where available) the cleanest direct read-through to NFLX\'s $3B FY26 ad-revenue ramp; D\'Amaro flagged Hulu-Disney+ unification economics tailwind post-Comcast settlement plus the Cars Land + Avatar/Coco park expansion capex update, with Coinbase Thursday May 7 AMC the next gating earnings event', category: 'company', related: 'DIS' },
  { headline: 'Tesla (TSLA) Cybercab volume production now confirmed underway at Giga Texas after Musk\'s late-April Q1-call confirmation — first steering-wheel-less unit rolled off February 17, the Cybercab made its public-relations debut at the Miami F1 Grand Prix Fan Fest (April 29-May 3 "Autonomy Pop-Up" at Lummus Park, Cybertruck towing the two-seater inside a glass display marked "Future is Autonomous"), VP Lars Moravy confirmed no NHTSA 2,500-vehicle annual cap (designed FMVSS-compliant on its own — no waiver needed); 60 Model Ys spotted staged in Phoenix as the Robotaxi expansion (Austin/Dallas/Houston live, Phoenix/Miami/Orlando/Tampa/Las Vegas next, ~12 US states by year-end) ramps before mid-year, Musk\'s "probably Q4" timeline for unsupervised FSD reaching customers and material Cybercab revenue not before at least 2027, Optimus Gen-3 unveil pushed later into 2026 and Intel 14A Terafab Austin still locked in for vehicle/robot/SpaceX-orbital-datacenter silicon — Polymarket pricing 97% odds of TSLA hitting $375 in May with the stock in the $380-395 zone post-AMD-blowout-induced AI-beta lift', category: 'company', related: 'TSLA' },
  { headline: 'Coinbase (COIN) prints Q1 tonight Thursday May 7 AMC with Wall Street consensus $0.26 EPS (-86% YoY, -60% QoQ) and $1.5B revenue (-26.1% YoY, vs $2.03B Q1 2025) — Bitcoin fell 22% / Ether -41% during Q1 with global crypto-exchange volume cratering ~48% from October 2025 peak to $4.3T in March (lowest since October 2024) compressing the take-rate line, transaction-revenue modeled $837M (-33.7% YoY on Q1 trading volume of 233M, -40.7%) and the durability tell on the $550-630M company subscription-and-services guide ($617M cons, leaning on blockchain rewards/stablecoin income/Coinbase One growth); Brian Armstrong announced last week a 14% workforce cut just days ahead of the print, the institutional-vs-retail mix the second key read (retail ~1.5% take, institutional <5bps), with COIN -57% from peak and the print the cleanest read on whether the regulatory-thaw narrative (CLARITY Act May markup window closing into Memorial Day recess May 21) is translating into operating leverage — Wednesday\'s AMD post-blowout follow-through (+16.85%) and Iran-MoU framework de-risk plus oil -7% delivered the macro/AI tailwinds into the exchange print, options pricing 9.4% implied move with the Polymarket beat-odds at 71% into the close', category: 'company', related: 'COIN' },
  { headline: 'Microsoft (MSFT) Q3 print delivered $4.27 EPS / $82.89B rev (cons $4.06 / $81.39B), Azure +40% cc (vs 37-38% guide, well above the 39.3% Visible Alpha bar), Microsoft Cloud $54.5B +29%, commercial RPO +99% to $627B, 365 Copilot seats 20M (+5M QoQ) — but tape closed -~4% the Thursday after the print on the $190B calendar-2026 capex headline (+61% YoY, includes ~$25B from higher component pricing, vs $154.6B Visible Alpha cons) as Q4 capex set to exceed the $40B Q3 record; Wall Street splits — Barclays cut to $545 from $600 OW, Wells Fargo $625 OW — the capex-fatigue reflex outweighing the Azure re-acceleration as the $710B four-hyperscaler total (AMZN/MSFT/GOOGL/META) now demonstrably ratifies the spend after AMD\'s Tuesday post-close blowout (Q2 guide $11.2B vs $10.50B cons, DC +57%) confirms the chip operating leverage on the other side of the capex pipe, with NVDA fiscal-Q1 May 20 AMC the next-gating AI-hardware print into the broader Q2 cycle', category: 'company', related: 'MSFT' },
  { headline: 'Samsung Electronics closed at a record KRW232,500 Wednesday May 6 +5.4% on the Bloomberg Apple-Intel-Samsung foundry-talks scoop (Apple executives have visited the Samsung Texas fab still under development for advanced-node A-series and M-series silicon, talks "early stage" with no orders in place but the report repriced "possible" into "probable") — the move came after Samsung crossed the $1T market cap Tuesday on the Korean Kospi (first Korean firm into the trillion-dollar club, shares +15% Tuesday) on the underlying AI-chip-frenzy + HBM3e ramp thesis that the AMD blowout ($10.25B rev / $1.37 EPS / DC +57% / Q2 $11.2B guide / Meta 6GW MI450 deal floor) ratified; Kospi printed back-to-back record closes, SK Hynix the cohort beneficiary as the HBM duopoly tightens through 2026 with TSMC CoWoS-L capacity the binding constraint and Samsung 2nm GAA Phase 2 Hwaseong fab the longer-tail catalyst into the Apple A20 Pro and Qualcomm Snapdragon 8 Elite Gen 5 silicon awards — Korean-tape fund flows compounding the move with the Won-USD pair firming through the 1,300 zone and the AI-megacap-vs-rest dispersion now extending across geographies into NVDA fiscal-Q1 May 20 AMC and Friday\'s April BLS payrolls (cons +49K) the next gating prints', category: 'general', related: '' },
  { headline: 'Crude extended its rout into Thursday May 7 with WTI -3.5% to $91.73 and Brent -3.3% to $97.93 — both down ~10% cumulatively from Monday\'s $114.44 Brent 2026-high — on the Trump "one week" deadline framing the Iran-MoU close, the war premium that had carried Brent to $126/bbl during the Hormuz blockade peak now fully unwound and Brent below $100 for the first time since the war began; Barclays cut 2026 Brent forecast to $95/bbl from $100/bbl on the supply-response math, OPEC+ Sunday May 3 confirmed a +188,000 bpd June output increase across the seven-country bloc (Saudi +62K / Russia +62K / Iraq +26K / Kuwait +16K / Kazakhstan +10K / Algeria +6K / Oman +5K, slightly below the 206K May bump and explicitly without UAE participation post-exit) feeding the bearish-supply tape; Strait exports still ~4% of normal under the persisting blockade and ~2M bpd of UAE offshore production stays shut-in but the deal-momentum overrode the constrained-physical reality, 10Y yield holding 4.36% as the energy-driven inflation re-acceleration risk faded, with the four-dissent April 29 FOMC hold (3.50-3.75%) leaving June 16-17 the next live decision and Friday\'s April BLS payrolls (cons +49K) the labor-market tell into that meeting', category: 'general', related: '' },
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
