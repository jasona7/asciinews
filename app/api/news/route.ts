import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-05-01 01:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'Nvidia $209.25 close (-4.1% Wed reaction to softer Mag-7 GPU read-throughs, then steadying ~$211 AH Thursday) as the four-Mag-7 capex prints ratify ~$725B FY26 hyperscaler envelope — MSFT $190B/Azure +40% cc, GOOGL $180-190B/Cloud +63%, META $125-145B raised, AMZN $200B reaffirmed/AWS +28% — but the marginal-buyer narrative now spreads across AMD\'s 6GW Instinct ramp, Intel 14A foundry traction, and memory-cost pass-through; May 20 NVDA fiscal Q1 print (Street modeling 79-81% YoY rev growth) the next gating event with AAPL\'s $100B buyback re-up and June +14-17% guide reinforcing the broader compute-spend thesis', category: 'company', related: 'NVDA' },
  { headline: 'Intel $94.48 holding ~ATH zone (vs Wed\'s $94.75 fresh ATH after +12.1% session) as Tesla 14A Terafab "first major external customer" thesis converges with Apple reportedly exploring 18A-P, Google evaluating advanced packaging, multiple 18AP/14A engagements flagged by Lip-Bu Tan; foundry inflection now anchored by ratified ~$725B FY26 hyperscaler capex envelope — agentic-CPU re-rating sustained through MSFT/GOOGL/AMZN/META prints and AAPL\'s June +14-17% guide, INTC up >35% in 6 sessions with DA Davidson flagging structural CPU-demand shift post-Q1', category: 'company', related: 'INTC' },
  { headline: 'AMD ~$350 fresh ATH (April closing >+59% MTD, intraday peak $353) into May 5 AMC Q1 print at $1.28 EPS / $9.85B rev cons (non-GAAP GM expanding ~100bps to 55%); META Q1 reaffirms 6GW Instinct deployment with custom MI450/Venice EPYC ramp 2H 2026 (>$100B deal value incl. 160M-share warrant), OpenAI 6GW capacity also slated — DA Davidson reset to Buy/$375, Susquehanna $300→$375, Q1 backlog visibility on MI400 cadence and 1GW MI450 milestone the gating items into the print', category: 'company', related: 'AMD' },
  { headline: 'Tesla holding ~$372-376 zone YTD -15% (worst Mag-7 performer 2026) even as Cybercab volume production confirmed starting Giga Texas this month and Optimus first large-scale factory prep begins Q2 (1M units/yr line target); Intel 14A Terafab equipment orders already placed for the Austin chip+solar fab making Tesla the marquee external 14A customer, JPM still at $145 sell post-mixed Q1 ($2.49B capex ~40% below model, FY $25B reaffirmed) — robotaxi commercial scale still gated by FSD-Unsupervised regulator approval push as Brent\'s $126 spike Thursday revives EV-demand-pull narrative', category: 'company', related: 'TSLA' },
  { headline: 'Apple +4.3% AH to ~$282.94 after fiscal Q2 blowout — $111.18B rev +17% YoY (cons $109.66B, beat the high end of guide despite supply constraints), $2.01 EPS +22% YoY (cons $1.95), iPhone $57B +22% on iPhone 17 strength (Greater China +28% / record March / 1H +33%), Services $30.98B all-time record +16%, Mac $8.4B / iPad $6.91B both above; June quarter guide rev +14-17% / GM 47.5-48.5%, board authorizes additional $100B buyback and 4% dividend hike to $0.27 — first call since the Cook-to-Ternus succession announcement, supply constraints on iPhone/Mac mini/Studio/MacBook Neo and memory pass-through the lone overhangs', category: 'company', related: 'AAPL' },
  { headline: 'Microsoft -5% Thursday close on $190B FY26 capex headline (incl. ~$25B memory cost pass-through) even though FY26 Q3 beat top/bottom and Azure printed +40% cc (vs 37-38% guide) — $4.27 EPS / $82.89B rev (cons $4.06 / $81.39B), Microsoft Cloud $54.5B +29%, commercial RPO +99% to $627B, 365 Copilot seats 20M (from 15M Jan); the capex-fatigue reflex outweighed Azure re-acceleration on the tape even as the print directly rebuts the OpenAI compute-demand reset thesis, with AAPL\'s after-hours +4.3% pop giving back some of the Mag-7 group drag into Friday', category: 'company', related: 'MSFT' },
  { headline: 'Meta -9% Thursday close (steepest one-day drop since October) on Q1 beat overshadowed by capex revise — $7.31 EPS / $56.31B rev +33% YoY (cons $6.78 / $55.45B, fastest growth since 2021), net income $26.77B +61%, FoA ad rev $55.0B +33% (impressions +19%, price/ad +12%), Reality Labs -$4.03B; FY26 capex guide raised to $125-145B (from $115-135B prior) on memory/component pricing, AMD 6GW Instinct deployment confirmed marquee GPU mix, softer DAU read-through (Iran internet disruptions cited) compounding the gap-down — no cloud rev offset to amortize the AI-spend like GOOGL/AMZN/MSFT enjoy', category: 'company', related: 'META' },
  { headline: 'Amazon $265.06 close +0.77% Thursday after Q1 blowout — $181.51B rev +17% YoY (cons $177.30B), AWS $37.59B +28% (15-quarter high, smashed mid-20s bar), $2.78 diluted EPS vs $1.64 cons; Q2 guide $194-199B / OI $20-24B, FY26 capex $200B reaffirmed (Q1 cash capex $43.2B for AWS+gen-AI), Q1 backlog $364B excluding the $100B Anthropic deal — the AH capex-fear reflex (-1.6% Wed) faded by Thursday\'s bell as AWS re-acceleration alongside GOOGL Cloud +63% cemented the absorption-of-AI-infrastructure thesis vs META\'s no-cloud-offset overhang', category: 'company', related: 'AMZN' },
  { headline: 'Alphabet GOOG/GOOGL +~8% Thursday close to fresh ATHs, capping +34% April (best month since Google\'s 2004 IPO) on Q1 print of $109.9B rev +22% YoY, $5.11 adj EPS, NI $62.6B +81%, 11th straight double-digit quarter; Cloud $20.02B +63% YoY blew past $18.05B cons (off Q4 48%), backlog nearly doubled QoQ to >$460B, Pichai flagging enterprise-AI as "primary growth driver for cloud for the first time"; FY26 capex raised to $180-190B (from $175-185B prior), CFO Ashkenazi signaling 2027 "significant increase" — clean winner of the four-print Mag-7 super-week', category: 'company', related: 'GOOGL' },
  { headline: 'Bitcoin $76,401 +0.2% 24h holding the $76K shelf into Friday\'s tape after the GDP Q1 advance landed soft (+2.0% vs +2.3% cons, March core PCE +3.5%, quarterly core PCE index +4.3%) — April spot ETF tape closed strongest month of 2026 at ~$2.4B net inflows (best since Oct 2025, IBIT +$2.1-3B / >70% share), but Apr 29 printed -$137.77M (third straight outflow day) breaking the 9-day inflow run; cumulative ETF AUM ~$102B, lifetime net inflows $58.5B, with Brent\'s $126 spike-then-fade and Thursday\'s S&P record close (+1.02% to 7,209.01) leaving the inflation-pass-through reflex contained for now', category: 'crypto', related: 'BTC' },
  { headline: 'Ether $2,259 -0.5% 24h (range $2,254-$2,275) softer at the $2,260 floor as Ethereum spot ETFs printed -$87.7M Apr 29 net outflow alongside the BTC tape; ETH/BTC ratio still grinding lower as the four-dissent FOMC dot plot leaves only one 2026 cut and Q1 quarterly core PCE index +4.3% reinforces the higher-for-longer reflex — taker buy/sell ratio remains highest since January 2023 on-chain but the spot tape still discounts the Aave TVL hangover (-$28.6B / -37% post-exploit), with AAPL\'s +4.3% AH pop and S&P record close giving risk-on cover into Friday', category: 'crypto', related: 'ETH' },
  { headline: 'XRP $1.37 -1.1% 24h holding the $1.36-$1.38 channel as US-listed spot XRP ETFs close out April at $81.63M net inflows — strongest monthly print of 2026 and longest unbroken positive streak in product history (zero outflow days since April 9); cumulative ETF base $1.29B across seven products, total NAV >$1.53B, Goldman Sachs the largest disclosed institutional holder at $153.8M across four funds; $1.40 cap unbroken through the AAPL-AMC blowout and GDP/PCE double-print, with the post-FOMC fade now flattening as Brent retreats off the $126 Hormuz-blockade peak', category: 'crypto', related: 'XRP' },
  { headline: 'Solana $83.16 -0.8% 24h (range $82.31-$83.87) consolidating as spot SOL ETFs print ~$35.17M net inflows over the trailing week (five straight positive sessions, AUM through $1B), Goldman Sachs disclosed at $108M; April 28 quantum-resistant signature migration now live alongside Israel CMA\'s BILS approval (1:1 ILS-pegged stablecoin from Bits of Gold) deploying on Solana with sub-400ms settlement, EY-audited segregated reserves, Fireblocks custody, QEDIT ZK privacy layer — utility narrative deepening as the spot tape steadies into Friday\'s Mag-7 hangover and AAPL +4.3% AH risk-on bid', category: 'crypto', related: 'SOL' },
  { headline: 'Brent intraday spike to $126/bbl Thursday (highest in four years) before fading to ~$111 on a US-military-briefing-Trump report as Goldman Sachs flagged Hormuz exports collapsed to 4% of normal under the dual US-Iran blockade; UAE OPEC/OPEC+ exit goes live Friday May 1 (first major departure since 1967, drops cartel from 12 to 11 members and supply control from ~30% to ~26%, Saudi/UAE quota friction now structural) — ING flags "big blow to OPEC", IEA calling the Hormuz disruption an unprecedented supply shock, with WTI ~$107-108 keeping the inflation-pass-through reflex live into May tape', category: 'general', related: '' },
  { headline: 'Thursday\'s 8:30am macro stack landed Q1 GDP advance at +2.0% (vs +2.3% cons, accelerating from prior +0.5% — upturns in govt spending/exports, deceleration in consumer spending), March core PCE +3.5% YoY (Fed-preferred gauge), quarterly core PCE price index +4.3% (vs +2.7% Q4) — the higher-for-longer signal still anchored by the 8-4 four-dissent FOMC hold (Miran cut, Hammack/Kashkari/Logan against easing, first four-dissent meeting since Oct 1992), one 2026 cut still in dot plot with Brent $126 pass-through and AAPL\'s June +14-17% guide the next macro variables to digest', category: 'general', related: '' },
  { headline: 'S&P 500 closed +1.02% at record 7,209.01 Thursday (first close above 7,200), Nasdaq +0.89% to 24,892.31 (intraday and closing records), Dow boosted by Caterpillar +9.2% to $889 ATH on Q1 blowout ($17.4B sales +22%, $5.54 EPS, $63B record backlog +79%, tariff hit trimmed to $2.2-2.4B from $2.6B) offsetting MSFT -5% / META -9%; April capped S&P +10.4% / Nasdaq +15.3% (best months since 2020), GOOGL +34% (best month since 2004 IPO) the marquee Mag-7 winner, AAPL +4.3% AH on $111.18B / $2.01 beat plus $100B buyback re-up setting up Friday\'s bid', category: 'general', related: '' },
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
