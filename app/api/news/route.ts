import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-05-02 13:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'US tape shut for the weekend after S&P 500 closed Friday at a fresh record 7,230.12 +0.29% and Nasdaq Composite +0.89% to an all-time high 25,114.44, capping the strongest monthly gain since 2020 (S&P +~10%/Nasdaq +~15% April) — Dow lagged -0.31% to 49,499.27 on the Apple-led mega-cap rotation; AAPL closed +3% post-Q2 blowout, NVDA closed $201.22 reclaiming the $200 shelf, Brent cooled to $108.17 on the Iran peace-proposal headlines and the AI trade re-engaged with GOOGL holding the +34% April gain; AMD\'s May 5 AMC print and the April BLS payrolls (now slated Friday May 8) the next two gating events as the Mag-7 super-week settles and the cash market reopens Monday', category: 'general', related: '' },
  { headline: 'Apple closed Friday +3% to ~$291 (consensus PT now $305.81 implying ~12% upside) as Wall Street raced to mark up post-Q2: Morgan Stanley\'s Eric Woodring took target to $330 from $315 (Buy, citing higher confidence in cost-pressure management), Wells Fargo\'s Aaron Rakers $310 from $300 (Buy on guide upside), UBS to $287 from $280 (citing US/China demand and supply-chain strength); the print itself — $111.18B rev +16.6% YoY (cons $109.66B, March-quarter record), $2.01 EPS +22% (cons $1.95), iPhone $57B +22%, Greater China +28%, Services $31B record +16%, June guide rev +14-17% with "significantly higher" memory as the swing factor, $100B buyback re-up and dividend +4% to $0.27 payable May 14', category: 'company', related: 'AAPL' },
  { headline: 'Nvidia closed Friday at $201.22 (intraday $200.12-$201.57) finally reclaiming the $200 shelf as the AI capex math gets ratified by the Mag-4 super-week — the cumulative ~$710B FY26 envelope (AMZN ~$200B / MSFT ~$190B / GOOGL ~$180-190B / META $125-145B) frames NVDA\'s May 20 fiscal Q1 print where Street is modeling 79-81% YoY revenue growth and watching for any Hopper-to-Blackwell mix commentary; Sherwood and others flag the marginal narrative shift to memory/networking as "no longer the missing ingredient" but the cumulative $710B+ capex pipe remains the fundamental support and AMD May 5 AMC the cleanest near-term read-through to AI GPU demand', category: 'company', related: 'NVDA' },
  { headline: 'Intel still riding above $100 into the weekend at ~$470B market cap (stock more than tripled in a year) as the foundry-revival cements: 18A in high-volume manufacturing running ahead of plan, 14A maturing faster than 18A did at the comparable stage, Q1 foundry rev +16% YoY to $5.4B (vs ~4% Q4 growth), Data Center & AI +22% YoY to $5.05B (vs $4.41B cons); Tesla locked in as marquee 14A external customer for vehicle/robot/orbital-datacenter silicon, CEO Lip-Bu Tan flagging "multiple customers" actively evaluating, DA Davidson and others now arguing for a structural CPU-demand shift post-Q1 — Intel the cleanest beneficiary of the on-shoring policy backdrop and the chip-sovereignty premium baked into the $710B hyperscaler capex pipe', category: 'company', related: 'INTC' },
  { headline: 'AMD into Tuesday May 5 AMC print with consensus rev $9.84-9.87B (+~32% YoY, +33% EPS YoY) and gross-margin guide ~55% (-2pts QoQ on the absence of one-time inventory benefit) — record Instinct revenue continuing off the Q4 MI350 ramp, OpenAI 6GW and Meta 6GW deals both confirmed with first 1GW MI450 deployments scheduled 2H 2026 (custom MI450 + 6th-gen Venice EPYC for META), MI308 China contribution capped at ~$100M Q1 on US export curbs; the gating call items Tuesday: MI400 cadence, the 1GW MI450 milestone, gross-margin trajectory, and any rebuttal to the "OpenAI missing internal targets" narrative that has analysts modeling a 2027 AI infrastructure spend deceleration', category: 'company', related: 'AMD' },
  { headline: 'Microsoft Q3 print delivered $4.27 EPS / $82.89B rev (cons $4.06 / $81.39B), Azure +40% cc (vs 37-38% guide), Microsoft Cloud $54.5B +29%, commercial RPO +99% to $627B and 365 Copilot seats 20M (+5M QoQ) — but tape closed -~4% Thursday on the $190B FY26 capex headline as Q4 capex set to exceed the $40B Q3 record (+84% YoY); Wall Street splits — Barclays cut to $545 from $600 OW, Wells Fargo $625 OW — with the capex-fatigue reflex outweighing the Azure re-acceleration even as the print directly rebuts the OpenAI compute-demand reset thesis, and the $710B four-hyperscaler total now ratifying the spend rather than punishing it', category: 'company', related: 'MSFT' },
  { headline: 'Meta closed Thursday -~9% (steepest one-day drop since October) on Q1 beat overshadowed by capex revise — $7.31 EPS / $56.31B rev +33% YoY (cons $6.78 / $55.45B, fastest growth since 2021), net income $26.77B +61%, FoA ad rev $55.0B +33%; FY26 capex raised to $125-145B (from $115-135B) on memory/component pricing, AMD 6GW Instinct deployment confirmed as marquee GPU mix and softer DAU read-through (Iran internet disruptions cited) compounding the gap-down — Meta the only Mag-4 print without a cloud-rev offset to amortize the AI-spend, drawing the toughest sell-side reaction of the super-week and entering the weekend as the laggard story going into AMD Tuesday', category: 'company', related: 'META' },
  { headline: 'Amazon Q1 blowout — $181.51B rev +17% YoY (cons $177.30B), AWS $37.59B +28% (15-quarter high, smashing the mid-20s bar), $2.78 diluted EPS vs $1.64 cons (beat by $1.10); Q2 guide $194-199B / OI $20-24B, FY26 capex $200B reaffirmed (Q1 cash capex $43.2B for AWS + gen-AI), Q1 backlog $364B excluding the $100B Anthropic deal — stock closed +~0.7% as AWS re-acceleration alongside GOOGL Cloud +63% cemented the absorption-of-AI-infrastructure thesis versus META\'s no-cloud-offset overhang, with AMZN now the largest single line-item in the $710B four-hyperscaler FY26 capex pipe and the cleanest absorption story going into Q2', category: 'company', related: 'AMZN' },
  { headline: 'Alphabet closed Friday holding the +~10% Thursday gap and fresh ATHs after capping +34% April (best month since Google\'s 2004 IPO) on Q1 of $109.9B rev +22% YoY, $5.11 adj EPS, net income $62.6B +81%, 11th straight double-digit quarter; Cloud $20.02B +63% YoY blew past $18.05B cons (off the Q4 +48%), backlog nearly doubled QoQ to >$460B with Pichai calling enterprise-AI the "primary growth driver for cloud for the first time"; FY26 capex raised to $180-190B (from $175-185B), CFO Ashkenazi signaling 2027 "significant increase" — GOOGL the clean winner of the four-print Mag-4 super-week and the AI-trade re-engagement vehicle going into the weekend', category: 'company', related: 'GOOGL' },
  { headline: 'Tesla Cybercab production confirmed underway at Giga Texas — first steering-wheel-less unit rolled off in February, frequent test units now spotted on Silicon Valley and Austin public roads with 25 units staged at the facility, no NHTSA 2,500-vehicle cap (designed to comply with all FMVSS standards on its own — no waiver needed), Tesla ramping toward "hundreds of units per week" with full-capacity target of at least 2M units annually and Robotaxi service expansion to dozens of US cities by year-end; Optimus Gen-3 reveal pushed later in 2026 again with mass-production-ready unveiling and Fremont pilot line standalone Optimus production starting late July/August — Intel 14A Terafab still locked in for Tesla vehicle/robot chips and SpaceX orbital datacenters', category: 'company', related: 'TSLA' },
  { headline: 'Bitcoin $78,239 +0.4% 24h (range $77,744-$78,941) consolidating in the high-$78Ks into Saturday after US spot BTC ETFs closed April at ~$1.97-2.44B net inflows (the strongest month of 2026), BlackRock\'s IBIT alone pulling in $2.1-3.0B and now holding ~809-812K BTC valued ~$62B (49-62% of spot ETF market share, ~3.8% of total BTC supply); the late-April four-day outflow stretch (April 27-30, >$400M) cooled the streak with FBTC/ARKB/GBTC driving redemptions while IBIT held flat — cumulative lifetime ETF inflows now $58.5B with AUM ~$102B, BTC closing April +12% (best month since April 2025) and weekend tape quiet as the May super-week earnings cycle settles', category: 'crypto', related: 'BTC' },
  { headline: 'Ether $2,304 flat 24h (range $2,278-$2,326) holding above the $2,300 reclaim into Saturday as US spot Ethereum ETFs posted their first monthly net-inflow gain since October 2025 in April but the weekly tape cooled $275M→$155M into month-end (Bitcoin ETFs $996M→$823M, XRP $55M→$15M, SOL $35M→$9M — broad ETF-bid softening across the complex); ETH/BTC ratio steadier as the four-dissent FOMC dot plot still leaves only one 2026 cut and Q1 core PCE +4.3% locks higher-for-longer, on-chain taker buy/sell ratio remains the highest since January 2023, with the AAPL post-print bid and Brent cooling on Iran peace-proposal headlines combining for residual risk-on cover into the May 5 AMD print', category: 'crypto', related: 'ETH' },
  { headline: 'XRP $1.387 +0.3% 24h holding just below the $1.40 cap (range $1.381-$1.400) as the broader complex consolidates into the weekend after Friday\'s S&P/Nasdaq record close — US-listed spot XRP ETFs closed April at $81.63M net inflows (best monthly print of 2026 and longest unbroken positive streak in product history, zero outflow days since April 9 even as weekly cadence cooled $55M→$15M into month-end and Monday-Friday weekly window saw no trading); cumulative ETF base $1.29B across seven products with NAV >$1.53B, Goldman Sachs the largest disclosed institutional holder at $153.8M across four funds with retail demand still anchoring the bid into the May open and the CLARITY Act delay pushed into May with no confirmed date', category: 'crypto', related: 'XRP' },
  { headline: 'Solana $83.87 -0.5% 24h (range $83.33-$84.84) consolidating in the low-$80s as the broader complex stays quiet into Saturday — US spot SOL ETFs printed only ~$9M weekly net inflows (down from $35M the prior week, the sixth straight monthly decline from $419.38M in November 2025 to just $39.93M in April 2026 — the weakest month since the products launched October 2025), AUM through $1B with Goldman disclosed at $108M; the late-April catalysts still in the bid: Visa and Meta expanding Solana payments, Solana Swiss Research Institute launch, the April 28 quantum-resistant signature migration live alongside Israel CMA\'s BILS approval (1:1 ILS-pegged stablecoin) deploying on Solana with sub-400ms settlement, EY-audited reserves and Fireblocks custody', category: 'crypto', related: 'SOL' },
  { headline: 'Trump publicly "not happy" after Friday Iran call, telling reporters Iranian leadership is "very disjointed" and "argumentative with each other" — Tehran sent an updated peace proposal through Pakistan mediators that Trump rejected as containing demands he "can\'t agree to," US Central Command confirming 45 commercial vessels turned around or returned to port under the naval blockade of Iranian ports as the standoff enters Day 64 of the broader Middle East conflict; the April 8 Pakistan-mediated ceasefire still holds (no exchange of fire since), the Senate\'s fourth bipartisan War Powers Resolution challenge having failed 52-47 on April 15, and a new statement attributed to Iran\'s Supreme Leader Mojtaba Khamenei published Friday for Labor/Teachers Day with Khamenei still not seen in public more than seven weeks after his ascension', category: 'general', related: '' },
  { headline: 'Brent crude $108.17 -2% Friday on the updated Iran peace-proposal headlines reaching mediators in Pakistan (WTI -3% to $101.94 — off Wednesday\'s $126/bbl four-year intraday peak), still set for a second weekly gain as Strait of Hormuz exports remain ~4% of normal under the dual US-Iran blockade and prospects of a near-term reopening fade; UAE OPEC exit went LIVE Thursday May 1 (first major departure since 1967, drops the cartel from 12 to 11 members and supply control from ~30% to ~26%, UAE targeting 5M bpd capacity by 2027 vs the 3.2M quota) — initial 2-3% futures dip on supply-glut fears reversed within 24 hours as WTI cleared $105 and Brent $112, the structural take muted because UAE can\'t pump what it can\'t ship behind the Hormuz crisis', category: 'general', related: '' },
  { headline: 'Spirit Airlines ceased operations after 34 years, the second carrier failure of 2026 as the post-Iran-war fuel-cost spike (Brent peaked $126/bbl Wednesday) compounded the legacy ULCC margin compression and the carrier\'s second post-pandemic Chapter 11 emerged from earlier this year; the immediate ground-stop affects scheduled service across the eastern US and Caribbean leisure routes with passenger refunds and crew layoffs the open near-term items, while the wider read-through is to JetBlue (which had its 2024 Spirit acquisition blocked on antitrust grounds), Frontier and Allegiant on slot-and-gate redistribution at FLL, MCO, LAS and ATL — the Spirit failure also pulls forward consolidation talk in a US ULCC space that has now lost two operators in 2026 alone', category: 'general', related: '' },
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
