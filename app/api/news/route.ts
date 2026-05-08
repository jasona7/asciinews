import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-05-08 01:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'Coinbase (COIN) cratered ~4% in Thursday May 7 AMC trading after a wide Q1 miss — $1.41B revenue (cons $1.48B, -31% YoY from $2.03B Q1 2025) and a $394M GAAP net loss / -$1.49 EPS hammered by $482M of unrealized losses on crypto held for investment after BTC slid through Q1 — vs the Street\'s $0.04 normalized EPS bar — though adjusted EBITDA $303M kept the 13-quarter consecutive-positive streak alive and the bright spot was 8.6% global trading-volume market share (a fresh ATH in both spot and derivatives) plus stablecoin revenue $305M (+11% YoY from $274M) on USDC market-cap growth; the print landed alongside Brian Armstrong\'s ~700-employee 14% workforce cut announced last week and the April 21 NY-AG Letitia James suit against Coinbase + Gemini alleging the prediction-market platforms constitute illegal gambling under state law — the after-hours -4% drop adding to the COIN -57%-from-peak draw-down with the CLARITY Act May 21 markup deadline (Senate Banking Chair Tim Scott under pressure from Senator Tillis to schedule the markup before Memorial Day recess) the structural overhang into 2H', category: 'company', related: 'COIN' },
  { headline: 'US tape closed mixed Thursday May 7 with the post-Wednesday-record digestion as crypto rolled hard into the Coinbase AMC print — BTC fell through $80K to a $79,893 print (-1.35% on the session, -3.1% from Wednesday\'s $82,580 high after rejecting $82,500), ETH -1.65% to $2,288 (range $2,280-$2,347) and XRP -2.17% to $1.3862 — the de-risking accelerated on the Israel-Beirut strike Wednesday night (Hezbollah Radwan-force commander Malek Ballout killed in Haret Hreik, the first Beirut bombing since the mid-April ceasefire) plus the Pentagon disclosure that US forces struck an Iranian oil tanker in the Sea of Oman attempting to breach the naval blockade as France\'s Charles de Gaulle carrier moved toward the Hormuz; jobless claims 200K (+10K WoW vs 205K cons, prior 190K the lowest since 1969) reinforcing the historically-tight labor backdrop into Friday\'s April BLS payrolls (cons now +62K after upward March revision to +178K), the four-dissent April 29 FOMC hold (3.50-3.75%) leaves June 16-17 the next live decision; Trump told reporters at the White House "very good talks last 24 hours, very possible we\'ll make a deal" with Iran\'s response to the 14-point MoU expected within 48 hours per Axios', category: 'general', related: '' },
  { headline: 'Iran-MoU framework hit a key inflection Thursday May 7 with US officials telling Axios that Tehran is expected to formally reply within 48 hours to the one-page 14-point memorandum — terms include a moratorium on Iranian nuclear enrichment, lifting of US sanctions, and the release of billions in frozen Iranian funds globally, with the document creating a 30-day window for the more-detailed implementation framework; the negotiations are running through Trump envoys Jared Kushner and Steve Witkoff via both direct and indirect channels, and the White House wants a diplomatic breakthrough before Trump wraps the May 14-15 Beijing summit with Xi (his first China trip in eight years) — if no deal in hand by then Trump could "again consider ordering military action," telling reporters Wednesday "We\'ve had very good talks over the last 24 hours, and it\'s very possible that we\'ll make a deal." The Pentagon confirmed Wednesday US forces struck an Iranian oil tanker in the Sea of Oman attempting to breach the naval blockade, France\'s nuclear-powered Charles de Gaulle carrier en route to the Strait of Hormuz for a "possible defensive mission" — the war premium that had carried Brent to $126/bbl during the Hormuz peak now fully unwound below $100', category: 'general', related: '' },
  { headline: 'Strategy (MSTR) Q1 Tuesday May 5 print continues to weigh through Thursday with the BTC slide back below $80K Thursday (-1.35% to $79,893 on the Crypto.com tape) flipping the rebound math — at $79,893 spot the 818,334-BTC position (~3.9% of the 21M hard cap) at $75,537 cost / $61.81B basis is back to ~$3.6B unrealized gain (vs ~$4.4B at Wednesday\'s $80.9K), still well above the February-trough mark-to-market but the Q1 reported $14.46B unrealized BTC hit / $12.54B GAAP net loss / -$38.25 EPS framework re-asserts itself if BTC slips into the mid-70s; Q1 revenue $124.3M had beaten $120.8M cons (+11.9% YoY), Saylor raised $7.37B via Q1 ATM plus $4.32B April 1-May 3 (~$11.7B YTD vs $20B FY26 capital-issuance plan, Texas Capital Binner $225 PT Buy reiterated) — Coinbase\'s -4% AMC reaction Thursday and the broader crypto re-de-risking on the Israel-Beirut strike + Iran-tanker disable + Pentagon escalation pull MSTR\'s convertible/perpetual-preferred stack (0% 2027/28/30/31/32 converts, STRK/STRF/STRD) back into focus into the 1M-BTC FY26 target line', category: 'company', related: 'MSTR' },
  { headline: 'Bitcoin broke back below $80K Thursday May 7, printing $79,893 on the Crypto.com tape (-1.35% on the session, range $79,484-$81,722, 24h volume value ~$309M, -3.3% from the Wednesday $82,580 high) after sellers rejected the $82,500 zone twice in the prior 36 hours — the de-risking compounded by the COIN -4% AMC reaction to the Q1 miss ($1.41B rev vs $1.48B cons, $394M GAAP net loss / -$1.49 EPS, hammered by $482M unrealized crypto-investment losses), the Israel strike on Beirut\'s Haret Hreik suburb killing Hezbollah Radwan-force commander Malek Ballout (first Beirut strike since the mid-April ceasefire), and the Pentagon disclosure that US forces struck an Iranian oil tanker in the Sea of Oman attempting to breach the naval blockade as France\'s Charles de Gaulle moved toward Hormuz; the $2.44B April US-spot-ETF inflow tape (strongest month since October 2025) faces its first real test as IBIT\'s ~812K-BTC position at ~$66.8B and the BlackRock+Fidelity-led complex absorbs the rolling de-risking — CLARITY Act May 21 markup deadline (Senate Banking Chair Tim Scott schedule TBD before Memorial Day recess) the next major structural catalyst', category: 'crypto', related: 'BTC' },
  { headline: 'Ether dropped to $2,288 Thursday May 7 (-1.65% 24h on the Crypto.com tape, range $2,279-$2,347, 24h volume value ~$124M) as the BTC roll-over below $80K dragged the whole majors complex lower into and through the Coinbase AMC print — the $2,300 floor lost on the second test of the session with the Israel-Beirut strike + Iran-tanker disable + Pentagon naval-blockade enforcement re-pricing geopolitical risk back into the tape; April had finished at +$356M net inflow for US spot ETH ETFs (first monthly net-inflow gain since October 2025 though still -$413M YTD) but Thursday\'s sell-off tested whether the May 1-3 whale buying spree (140K ETH added, total whale holdings 13.78M→13.98M ETH) provides a real bid floor — the four-dissent April 29 FOMC hold (3.50-3.75%) leaves June 16-17 the next live decision with updated SEP, with Friday\'s April BLS payrolls (cons +62K post-March +178K revision) and Iran\'s response to the 14-point MoU (expected within 48 hours per Axios) the next macro tells, plus the Trump-Xi May 14-15 Beijing summit framing the cross-asset risk into mid-month', category: 'crypto', related: 'ETH' },
  { headline: 'XRP fell hardest of the majors Thursday May 7 to $1.3862 on the Crypto.com tape (-2.17% 24h, range $1.3802-$1.4216, the $1.40 support lost on the second-half session push lower and the $1.45 ceiling rejected for the third time in 72 hours) — the altcoin beta amplifying the BTC break below $80K and the broader de-risking flow into and through the Coinbase AMC print where the Q1 miss + $394M GAAP loss + 14% workforce-cut backdrop pulled exchange/altcoin sentiment lower; structurally the US spot XRP ETF complex still tracking $1.29B cumulative inflows across 7 products with combined AUM ~$1B and 828.3M XRP locked (Goldman Sachs largest disclosed institutional holder at $153.8M), but the April 30 inflow-streak break ($5.83M outflow ending the zero-outflow run April 10-29) reads as the first crack in the bid — the CLARITY Act May 21 markup deadline now the binding structural catalyst with Senator Tillis pressing Chairman Tim Scott to schedule before Memorial Day recess or the bill likely shelves into 2030, into the Trump-Xi May 14-15 Beijing summit and Iran\'s pending 48-hour MoU response per Axios', category: 'crypto', related: 'XRP' },
  { headline: 'Solana held flat Thursday May 7 at $88.32 on the Crypto.com tape (+0.05% 24h, range $87.63-$90.44 with the $90.44 high failing on the AMC test and the $87.60 base holding through the broader majors-sell-off) the relative-strength outperformer of the four big-cap alts — outperforming BTC (-1.35%) and ETH (-1.65%) and XRP (-2.17%) on the session as the Wednesday $14.2M US spot SOL ETF net inflow (first positive day since April 25, breaking the six-month outflow streak that ran November 2025 $419.38M → April 2026 $39.93M) carried a residual bid through the Coinbase Q1 miss/-4% AMC reaction and BTC sub-$80K break; AUM held above $1B with Goldman disclosed at $108M, late-April catalysts re-pricing into the bid: Visa and Meta expanding Solana payments, Solana Swiss Research Institute launch, the April 28 quantum-resistant signature migration live alongside Israel CMA\'s BILS approval (1:1 ILS-pegged stablecoin) deploying on Solana with sub-400ms settlement, EY-audited reserves and Fireblocks custody — Iran-MoU 48-hour response window per Axios + Friday\'s April BLS payrolls + the Trump-Xi May 14-15 Beijing summit the macro overlay into mid-month', category: 'crypto', related: 'SOL' },
  { headline: 'Apple (AAPL) Bloomberg Apple-Intel-Samsung foundry scoop (May 5) keeps repricing through Thursday May 7 with Intel hitting an all-time high of $113.01 Tuesday (+13% session) before pulling back marginally — the stock now +174% YTD 2026 and +433% from the year-ago $18.96 trough on the strategic angle that Apple is courting US-fab capacity for A-series and M-series silicon to provide a "secondary option beyond longtime partner Taiwan Semiconductor" per Bloomberg, with talks "exploratory" and "early stage" but the contract path could land CPUs for Macs and iPads by 2027; Apple executives have visited the Samsung Texas fab still under development with Samsung Electronics closing at a record KRW232,500 (+5.4%), the AAPL Q2 print already booked the bull case ($111.18B rev +16.6% YoY March-quarter record, $2.01 EPS +22%, iPhone $57B +22%, Greater China +28%, Services $31B +16%, June guide rev +14-17%, $100B buyback re-up and dividend +4% to $0.27 ex-date May 11) — Wedbush $350 / BofA $330 / JPMorgan $325 OW / Morgan Stanley\'s Eric Woodring $330 / Citi $315 Buy / Wells Fargo $310 / UBS $296 the post-print PT cohort, with the Trump-Xi May 14-15 Beijing summit the next direct US-China-supply-chain catalyst', category: 'company', related: 'AAPL' },
  { headline: 'Nvidia (NVDA) holds firm into the May 20 AMC fiscal-Q1 print with the AMD +18.6% post-blowout Wednesday follow-through ($10.25B rev / $1.37 EPS beat vs $1.30 cons / DC +57% / Q2 $11.2B guide vs $10.50B cons / Meta 6GW MI450 deal floor) still the cleanest GPU-demand read-through into the setup as broader AI-tape beta digests Thursday\'s crypto/geopolitical re-de-risking — Wall Street modeling $78.8B revenue (~80% YoY growth), Blackwell now ~70% of data-center compute and the Hopper-to-Blackwell transition "nearly complete" per Jensen, Rubin platform shipments slated 2H 2026 (4x efficiency gain, inference-heavy positioning); the cumulative ~$710B FY26 hyperscaler capex envelope (AMZN ~$200B / MSFT $190B / GOOGL ~$185B / META $130B) empirically translating into chip operating leverage after the four-print super-week, with Jensen\'s GTC 2026 $1T combined Blackwell-plus-Vera-Rubin sales target through 2027 the 14-day overhang into the print and the Trump-Xi Beijing summit May 14-15 the cross-asset risk overlay (US Trade Rep Greer flagged "stable" relationship and "not looking for a massive confrontation," Boeing/agricultural purchase commitments and a bilateral "Board of Trade" expected)', category: 'company', related: 'NVDA' },
  { headline: 'Disney (DIS) Q2 Wednesday May 6 BMO blowout still anchoring the streaming/parks cohort into Thursday — $25.17B revenue (cons $24.85B) / $1.57 adj EPS (cons $1.50, the $0.07 beat outpacing consensus by ~$320M of operating contribution) / DTC SVOD operating income +88% YoY to $582M on Disney+/Hulu well clear of the ~$500M / ~10% DTC-margin target the Street was modeling, Parks & Experiences a Q2 record with revenue +7% YoY and segment OI +5%, sequential streaming revenue growth accelerated 11% Q1 → 13% Q2 driven by both rate and volume, FY adjusted-EPS guide raised to ~+12% growth and FY buyback authorization raised to at least $8B from $7B prior — Josh D\'Amaro\'s first call as CEO post-Iger transition delivered hard with the streaming-margin trajectory now firmly inside the 10% DTC target before fiscal year-end and the ad-tier traction (60%+ ad-supported new-sub mix in markets where available) the cleanest direct read-through to NFLX\'s $3B FY26 ad-revenue ramp; D\'Amaro flagged Hulu-Disney+ unification economics tailwind post-Comcast settlement plus the Cars Land + Avatar/Coco park expansion capex update — the cohort relative-strength bid through Thursday\'s crypto roll-over and Coinbase miss', category: 'company', related: 'DIS' },
  { headline: 'Tesla (TSLA) Cybercab volume production continues at Giga Texas through Thursday May 7 with the late-April Q1-call confirmation and the May 5-7 Robotaxi-expansion tape (Austin/Dallas/Houston live, Phoenix/Miami/Orlando/Tampa/Las Vegas next as 60 Model Ys spotted staged in Phoenix, ~12 US states by year-end) running into the broader market\'s Thursday risk-off rotation as the BTC sub-$80K break + COIN-Q1-miss + Israel-Beirut-strike + Iran-tanker-disable repricing pulled the AI-beta complex lower; the strategic AI/silicon angle still constructive — Intel 14A Terafab Austin locked in for vehicle/robot/SpaceX-orbital-datacenter silicon and the Apple-Intel-Samsung foundry-talks scoop (Bloomberg May 5) reinforces the US-fab-capacity competition narrative that Musk has been positioning Tesla\'s long-tail silicon supply against, with Intel +174% YTD; VP Lars Moravy confirmed no NHTSA 2,500-vehicle annual cap on Cybercab (FMVSS-compliant on its own — no waiver needed), Musk\'s "probably Q4" timeline for unsupervised FSD reaching customers and material Cybercab revenue not before at least 2027, Optimus Gen-3 unveil pushed later into 2026, into the Trump-Xi Beijing summit May 14-15 (Boeing/agricultural commitments expected) and the Friday April BLS payrolls (cons +62K)', category: 'company', related: 'TSLA' },
  { headline: 'AMD (AMD) Wednesday +18.6% rip ($1.37 EPS vs $1.30 cons / $10.25B rev / DC +57% / Q2 $11.2B guide vs $10.50B cons / Meta 6GW MI450 deal floor / server-CPU TAM doubled to $120B) carried into Thursday with the Tuesday-AMC blowout still the cleanest near-term GPU/AI-demand catalyst on the tape — the 11M-share Wednesday-volume print the highest single-session since 2018 and the post-print PT cohort hitting the wires through the day with DA Davidson upgrade and a wave of street upgrades; Lisa Su told the call "Data Center is now the primary driver of our revenue and earnings growth" and the existing Meta 6-gigawatt MI450 deal (signed Feb 24, 160M-share performance warrant structured to vest as Instinct shipments scale) is now the floor not the ceiling, MI350 ramp through 2H 2026 and MI450 1GW deployments tracking — the print resets the bar materially higher into NVDA fiscal-Q1 May 20 AMC and the cumulative ~$710B FY26 hyperscaler capex envelope (AMZN ~$200B / MSFT $190B / GOOGL ~$185B / META $130B) now demonstrably translating into chip operating leverage, the Wednesday move also lifting the broader AI-tape with Industrials Select Sector SPDR (XLI) +2.6% and Information Technology Select Sector SPDR (XLK) +2.7% the cohort beneficiaries', category: 'company', related: 'AMD' },
  { headline: 'Microsoft (MSFT) Q3 print continues to digest through Thursday May 7 with the $190B calendar-2026 capex headline (+61% YoY, includes ~$25B from higher component pricing, vs $154.6B Visible Alpha cons) still the binding overhang despite the underlying Azure +40% cc beat (vs 37-38% guide, well above the 39.3% Visible Alpha bar) and Microsoft Cloud $54.5B +29%, $4.27 EPS / $82.89B rev (cons $4.06 / $81.39B), commercial RPO +99% to $627B, 365 Copilot seats 20M (+5M QoQ) — Wall Street splits hold with Barclays at $545 from $600 OW, Wells Fargo $625 OW; the $710B four-hyperscaler total (AMZN/MSFT/GOOGL/META) now demonstrably ratified by AMD\'s Tuesday post-close blowout (Q2 guide $11.2B vs $10.50B cons, DC +57%) confirming the chip operating leverage on the other side of the capex pipe, with NVDA fiscal-Q1 May 20 AMC the next-gating AI-hardware print into the broader Q2 cycle and the Trump-Xi Beijing summit May 14-15 the cross-asset overlay (US-China stable per USTR Greer "not looking for a massive confrontation," Boeing/agricultural commitments expected, bilateral "Board of Trade" identifying non-sensitive purchase-commitment sectors)', category: 'company', related: 'MSFT' },
  { headline: 'Israel struck Beirut\'s southern Haret Hreik suburb Wednesday night May 6 — the first bombing of Beirut since the mid-April Israel-Hezbollah ceasefire — killing senior Hezbollah Radwan-force operations commander Malek Ballout per a source close to Hezbollah, with Prime Minister Benjamin Netanyahu personally ordering the strikes per Israeli officials; Israeli forces also carried out numerous strikes across southern and eastern Lebanon Wednesday despite the truce killing at least 13 (four killed in the eastern Bekaa Valley), and issued new evacuation orders Thursday for three southern towns — Deir al-Zahrani, Bafroa and Habush — after accusing Hezbollah of violating the ceasefire — the report sequence threatens the ceasefire arrangement that has underpinned the broader US-Iran truce framework and adds direct pressure to the Trump-Iran-MoU 48-hour response window per Axios; the Israel/Hezbollah escalation lands as the Pentagon disclosed Wednesday that US forces struck an Iranian oil tanker in the Sea of Oman that attempted to breach the US naval blockade of Iran\'s ports, France\'s nuclear-powered Charles de Gaulle carrier en route to the Strait of Hormuz for "a possible defensive mission" — the cumulative escalation risk feeding the BTC sub-$80K break + ETH/XRP -1.65%/-2.17% Thursday tape', category: 'general', related: '' },
  { headline: 'US weekly jobless claims rose 10K to 200K for the week ending May 2 (vs 205K cons, prior 190K the lowest since 1969 revised up by 1K) per the Thursday May 7 Labor Department release — continuing claims fell 10K to 1.77M for the week ending April 25, the four-week moving average dropped 4,500 to 203,250 — keeping the labor backdrop historically tight despite elevated headline inflation and the Iran-war supply-chain overhang; the data sets up Friday\'s April BLS nonfarm payrolls release with consensus now ~+62K (after the upward March revision to +178K from prior +49K), the anticipated slowdown reflecting the fading boost from warmer weather and the return-of-striking-health-workers normalization — the four-dissent April 29 FOMC hold (3.50-3.75%) leaves June 16-17 the next live decision with updated SEP, gas-pump prices having surged to a $4.45/gal national average (a four-year high) on the Iran/Hormuz/Brent spike now partially unwinding with Brent back below $100 the first time since the war began; the rate-path probability matrix re-prices off Friday\'s payrolls into the Trump-Xi May 14-15 Beijing summit and the Iran-MoU 48-hour response window per Axios', category: 'general', related: '' },
  { headline: 'Trump confirmed Thursday May 7 he will travel to Beijing for a May 14-15 summit with Chinese President Xi Jinping — his first trip to China in eight years and arriving "amid one of the most turbulent periods in modern US-China trade relations" — with US Trade Rep Jamieson Greer flagging the relationship is "stable" and the US is "not looking for a massive confrontation" with both leaders likely to announce Chinese purchases of American products including Boeing airplanes and agricultural goods plus a bilateral "Board of Trade" identifying non-sensitive sectors for purchase commitments and limited tariff adjustments; both leaders agreed to the trade-war truce on the sidelines of October\'s Busan APEC, Beijing views the high-stakes summit as a singular opportunity to secure a more stable long-term relationship — the deadline overlay constrains the Iran-MoU response window with Iran expected to formally reply to the 14-point memorandum within 48 hours per Axios and the White House wanting a diplomatic breakthrough before Trump wraps the China trip Friday May 15 ("if no deal in hand by then the president could again consider ordering military action" per officials), the Trump-Xi summit also the next direct US-China-tech-supply-chain catalyst after the May 5 Bloomberg Apple-Intel-Samsung foundry-talks scoop sent Intel +13% to a $113.01 ATH', category: 'general', related: '' },
  { headline: 'Intel (INTC) hit an all-time high of $113.01 Tuesday May 5 (+13% session, +174% YTD 2026 and +433% from the year-ago $18.96 trough) on the Bloomberg scoop that Apple has held exploratory discussions about using Intel and Samsung to produce the main processors for its devices in the US — a strategic move that would offer Apple a "secondary option beyond longtime partner Taiwan Semiconductor"; talks remain "early stage" with no orders in place but the report repriced "possible" into "probable" with the contract path potentially landing CPUs for Macs and iPads by 2027, Apple executives have already visited the Samsung Texas fab still under development, Samsung Electronics closed a record KRW232,500 +5.4% Wednesday on the same scoop and crossed the $1T market cap Tuesday on the Korean Kospi (first Korean firm into the trillion-dollar club, shares +15% Tuesday); the rally adds 170% to Intel\'s share price post-trough but leaves the valuation at a crossroads — bears point to no executed contracts, the 2nm GAA Phase 2 Hwaseong fab as the longer-tail catalyst into Apple A20 Pro and Qualcomm Snapdragon 8 Elite Gen 5 silicon awards, the Trump-Xi May 14-15 Beijing summit the next direct US-China-supply-chain framework catalyst', category: 'company', related: 'INTC' },
  { headline: 'Palantir (PLTR) Q1 Monday May 4 AMC blowout still anchoring AI-software leadership through Thursday May 7 — $1.63B revenue (cons $1.54B, +85% YoY the fastest growth since the 2020 IPO and the 11th consecutive quarter of accelerating revenue growth), $0.33 adj EPS (cons $0.28), net income $870.5M roughly quadrupled from $214M YoY — US revenue +104% YoY / +19% QoQ to $1.282B, US commercial +133% YoY / +18% QoQ to $595M, 1,007 trailing-12-month commercial customers +31% YoY; raised FY26 guide to $7.65-7.66B revenue (cons $7.27B, +71% YoY) and $4.2-4.4B adj FCF (cons $4.05B), Q2 guide $1.8B vs $1.68B cons — the print blew through the ~10% implied move and Polymarket\'s 96% beat odds, with PLTR holding the multiple-expansion grade through the broader-tape rally even as Thursday\'s crypto/geopolitical de-risking pulled select AI-beta lower; the AMD-AMC-Tuesday-blowout follow-through ($10.25B rev / $1.37 EPS beat / DC +57% / Q2 $11.2B guide) re-anchors AI-hardware leadership behind PLTR\'s software grade into Disney Wednesday\'s clear-bar, the Coinbase Thursday miss, and NVDA fiscal-Q1 May 20 AMC the next-gating super-print', category: 'company', related: 'PLTR' },
  { headline: 'Netflix (NFLX) digesting the Disney Wednesday Q2 BMO blowout through Thursday as the cohort comp re-rates — Disney\'s DTC SVOD operating income +88% YoY to $582M / sequential streaming revenue growth 11% Q1 → 13% Q2 / 60%+ ad-supported new-sub mix in markets where available — directly read-through to NFLX\'s $3B FY26 ad-revenue ramp (+100% YoY from $1.5B 2025) and the >60% ad-supported new-sign-ups mix Netflix has already disclosed; NFLX board buyback authorization $25B (more than the $20B FY26 content budget), Q1 print earlier landed $12.25B rev +16.2% YoY beat / $1.23 EPS beat with mobile-app redesign introducing the "Clips" vertical short-form feed for original-programming highlights, post-1:10 split the stock trades in the ~$94 zone with $384B+ market cap and ~30% off last year\'s peak — Wall Street median PT $114.38 across 51 analysts (32 Buy ratings) implying ~21% upside; the streaming-cohort relative-strength bid through Thursday\'s broader risk-off rotation as the BTC sub-$80K break + COIN-Q1-miss + Israel-Beirut-strike + Iran-tanker-disable repricing pulled crypto and altcoin-beta lower while the megacap-streaming complex held the higher-quality bid', category: 'company', related: 'NFLX' },
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
