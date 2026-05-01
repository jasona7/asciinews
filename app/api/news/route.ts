import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-05-01 13:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'Nvidia -4.63% Thursday close to $199.57 breaking back below the $200 shelf (first sub-$200 print in two weeks) as the Mag-7 GPU read-throughs digest — MSFT -5% on $190B FY26 capex / $40B+ Q4 record, META -9% on raised $125-145B FY26 capex without cloud-rev offset — even though MSFT/GOOGL/AMZN/META cumulatively ratify the ~$725B FY26 hyperscaler envelope; May 20 NVDA fiscal Q1 print (Street modeling 79-81% YoY rev growth) the next gating event with AMD May 5 AMC and AAPL Friday +3% premarket bid on $111.2B/$2.01 beat reinforcing the broader compute-spend thesis as Brent fades to $109.95 off Thursday\'s $126 four-year peak', category: 'company', related: 'NVDA' },
  { headline: 'Intel $94.48 holding ~ATH zone (vs Wed\'s $94.75 fresh ATH after +12.1% session) as Tesla 14A Terafab "first major external customer" thesis converges with Apple reportedly exploring 18A-P and Google evaluating advanced packaging — multiple 18AP/14A engagements flagged by Lip-Bu Tan; foundry inflection now anchored by the ratified ~$725B FY26 hyperscaler capex envelope through MSFT $190B / GOOGL $180-190B / META $125-145B / AMZN $200B prints and AAPL\'s June +14-17% guide, INTC up >35% in 6 sessions with DA Davidson flagging structural CPU-demand shift post-Q1 even as NVDA breaks back below $200', category: 'company', related: 'INTC' },
  { headline: 'AMD ~$350 fresh ATH (April closing >+59% MTD, intraday peak $353) into May 5 AMC Q1 print at $1.28 EPS / $9.85B rev cons (non-GAAP GM expanding ~100bps to 55%); META Q1 reaffirms 6GW Instinct deployment with custom MI450/Venice EPYC ramp 2H 2026 (>$100B deal value incl. 160M-share warrant), OpenAI 6GW capacity also slated — DA Davidson reset to Buy/$375, Susquehanna $300→$375, Q1 backlog visibility on MI400 cadence and 1GW MI450 milestone the gating items into the Monday print as NVDA -4.63% Thursday cracks the $200 shelf and rotates marginal-buyer narrative further toward AMD', category: 'company', related: 'AMD' },
  { headline: 'Tesla holding ~$372-376 zone YTD -15% (worst Mag-7 performer 2026) even as Cybercab volume production now ramping at Giga Texas (mass-production began April, ~25 units on the lot, frequent road sightings Austin/Silicon Valley) and Optimus first large-scale factory prep begins Q2 (1M units/yr line target); Intel 14A Terafab equipment orders already placed for the Austin chip+solar fab making Tesla the marquee external 14A customer, JPM still at $145 sell post-mixed Q1 ($2.49B capex ~40% below model, FY $25B reaffirmed) — robotaxi commercial scale still gated by FSD-Unsupervised regulator approval push as Brent fades to $109.95 from the $126 spike, easing the EV-demand-pull tailwind', category: 'company', related: 'TSLA' },
  { headline: 'Apple +3% premarket Friday (after +4.3% AH Thursday to ~$282.94) cementing the fiscal Q2 blowout — $111.18B rev +17% YoY (cons $109.66B, beat the high end of guide despite supply constraints), $2.01 EPS +22% YoY (cons $1.95), iPhone $56.99B +22% on iPhone 17 strength / second straight quarter >20% growth (Greater China +28% / record March / 1H +33%), Services $30.97B all-time record +16% (vs $30.37B cons), Mac $8.4B / iPad $6.91B both above; June guide rev +14-17% (vs 9.1% cons) / GM 47.5-48.5%, $100B buyback re-up and 4% dividend hike to $0.27 — first call since the Cook-to-Ternus succession announcement', category: 'company', related: 'AAPL' },
  { headline: 'Microsoft -5% Thursday close on $190B FY26 capex headline (Q4 capex to exceed $40B record, Q3 capex jumped to $30.88B +84% YoY) even though FY26 Q3 beat top/bottom and Azure printed +40% cc (vs 37-38% guide) — $4.27 EPS / $82.89B rev (cons $4.06 / $81.39B), Intelligent Cloud $34.68B +30%, Microsoft Cloud $54.5B +29%, commercial RPO +99% to $627B, 365 Copilot seats 20M (+5M QoQ); Wall Street splits — Barclays $545 from $600 OW, Wells Fargo $625 from $615 OW — capex-fatigue reflex outweighed Azure re-acceleration on the tape even as the print directly rebuts the OpenAI compute-demand reset thesis', category: 'company', related: 'MSFT' },
  { headline: 'Meta -9% Thursday close (steepest one-day drop since October) on Q1 beat overshadowed by capex revise — $7.31 EPS / $56.31B rev +33% YoY (cons $6.78 / $55.45B, fastest growth since 2021), net income $26.77B +61%, FoA ad rev $55.0B +33% (impressions +19%, price/ad +12%), Reality Labs -$4.03B; FY26 capex guide raised to $125-145B (from $115-135B prior) on memory/component pricing, AMD 6GW Instinct deployment confirmed marquee GPU mix, softer DAU read-through (Iran internet disruptions cited) compounding the gap-down — no cloud rev offset to amortize the AI-spend like GOOGL/AMZN/MSFT enjoy as Friday tape opens with NVDA -4.63% drag still in the air', category: 'company', related: 'META' },
  { headline: 'Amazon $265.06 close +0.77% Thursday after Q1 blowout — $181.51B rev +17% YoY (cons $177.30B), AWS $37.59B +28% (15-quarter high, smashed mid-20s bar), $2.78 diluted EPS vs $1.64 cons; Q2 guide $194-199B / OI $20-24B, FY26 capex $200B reaffirmed (Q1 cash capex $43.2B for AWS+gen-AI), Q1 backlog $364B excluding the $100B Anthropic deal — the AH capex-fear reflex (-1.6% Wed) faded by Thursday\'s bell as AWS re-acceleration alongside GOOGL Cloud +63% cemented the absorption-of-AI-infrastructure thesis vs META\'s no-cloud-offset overhang into Friday\'s open', category: 'company', related: 'AMZN' },
  { headline: 'Alphabet GOOG/GOOGL +~8% Thursday close to fresh ATHs, capping +34% April (best month since Google\'s 2004 IPO) on Q1 print of $109.9B rev +22% YoY, $5.11 adj EPS, NI $62.6B +81%, 11th straight double-digit quarter; Cloud $20.02B +63% YoY blew past $18.05B cons (off Q4 48%), backlog nearly doubled QoQ to >$460B, Pichai flagging enterprise-AI as "primary growth driver for cloud for the first time"; FY26 capex raised to $180-190B (from $175-185B prior), CFO Ashkenazi signaling 2027 "significant increase" — clean winner of the four-print Mag-7 super-week as MSFT/META gap down and AAPL +3% premarket carries into Friday', category: 'company', related: 'GOOGL' },
  { headline: 'Bitcoin $78,055 +2.3% 24h reclaiming the $78K handle (range $76,088-$78,194) bouncing hard off the $76K shelf into Friday\'s open as US spot BTC ETFs closed April at ~$2.4B net inflows (strongest month of 2026, IBIT +$2.1-3B / >70% share, nine-day inflow streak Apr 14-24 broken by Apr 29 -$137.77M); cumulative ETF AUM ~$102B, lifetime net inflows $58.5B, with the BTC bid front-running Friday\'s 60-day War Powers deadline expiry on the Iran action, UAE OPEC exit going live, and AAPL\'s +3% premarket / +4.3% AH risk-on cover into the May tape', category: 'crypto', related: 'BTC' },
  { headline: 'Ether $2,304 +1.7% 24h (range $2,247-$2,313) snapping back through the $2,300 line as the BTC bid pulls the complex higher into Friday\'s open — Ethereum spot ETFs printed -$87.7M Apr 29 net outflow but the spot tape now ignoring the lagged ETF flow signal; ETH/BTC ratio steadier as the four-dissent FOMC dot plot still leaves only one 2026 cut and Q1 quarterly core PCE index +4.3% locks higher-for-longer, taker buy/sell ratio still highest since January 2023 on-chain, with AAPL +3% premarket and Brent fading to $109.95 off the $126 spike combining for risk-on cover into the May tape and 60-day War Powers deadline today', category: 'crypto', related: 'ETH' },
  { headline: 'XRP $1.385 +1.1% 24h finally cracking the $1.40 cap area (range $1.363-$1.388) as the BTC reclaim of $78K pulls the complex through resistance — US-listed spot XRP ETFs closed April at $81.63M net inflows (best monthly print of 2026 and longest unbroken positive streak in product history, zero outflow days since April 9, though weekly cadence cooled $55M→$15M in the final week); cumulative ETF base $1.29B across seven products, total NAV >$1.53B, Goldman Sachs largest disclosed institutional holder at $153.8M across four funds with retail demand still anchoring the bid into Friday\'s tape', category: 'crypto', related: 'XRP' },
  { headline: 'Solana $84.36 +1.4% 24h (range $82.69-$84.58) breaking out of the low-$83s consolidation as the BTC reclaim of $78K and ETH back through $2,300 lift the complex into Friday\'s open — spot SOL ETFs printed ~$35.17M net inflows over the trailing week (cooling to $9M weekly cadence into late April but five straight positive sessions, AUM through $1B), Goldman Sachs disclosed at $108M; April 28 quantum-resistant signature migration now live alongside Israel CMA\'s BILS approval (1:1 ILS-pegged stablecoin from Bits of Gold) deploying on Solana with sub-400ms settlement, EY-audited reserves, Fireblocks custody, QEDIT ZK privacy layer', category: 'crypto', related: 'SOL' },
  { headline: 'Brent fades to $109.95 -0.4% Friday morning (off Thursday\'s $126/bbl four-year intraday peak) and WTI $105.07 -1% as Trump administration argues the three-week-old ceasefire "terminated" hostilities ahead of today\'s 60-day War Powers Resolution deadline (March 2 notification, May 1 expiry); UAE OPEC/OPEC+ exit goes LIVE today (first major departure since 1967, drops cartel from 12 to 11 members and supply control from ~30% to ~26%, UAE targeting 5M bpd capacity 2027 vs 3.2M quota), but Hormuz exports still ~4% of normal under dual US-Iran blockade — Tehran refuses to reopen the strait unless US lifts naval blockade of Iranian ports, structural impasse holds', category: 'general', related: '' },
  { headline: 'Exxon Q1 adj EPS $1.16 / rev $85.14B beat ($82.18B cons) but NI $4.2B / $1.00 GAAP -45% YoY (vs $7.7B/$1.76 prior) as undisclosed hedge charges weigh; Chevron adj $1.41 beat 95c cons but rev $48.61B miss ($52.1B cons) and profit $2.2B / $1.11 -36% YoY on $2.9B hedge charge — surging crude on the Iran war did not deliver a windfall as both majors booked significant derivative losses against the price run; Friday tape digesting the integrated-oil read-through alongside Brent\'s $126→$110 round-trip, UAE OPEC exit going live, and the 60-day War Powers deadline as Trump maintains the Iran naval blockade', category: 'company', related: 'XOM' },
  { headline: 'S&P 500 closed +1.02% at record 7,209.01 Thursday (first close above 7,200), Nasdaq +0.89% to 24,892.31 (intraday and closing records), Dow boosted by Caterpillar +9.2% to $889 ATH on Q1 blowout ($17.4B sales +22%, $5.54 EPS, $63B record backlog +79%, tariff hit trimmed to $2.2-2.4B from $2.6B) offsetting MSFT -5% / META -9%; futures mixed Friday open — S&P +0.21% / Dow +0.29% / Nasdaq -0.05% — as AAPL +3% premarket and Moderna +7% (intl COVID rev $311M vs $78M US) bid the tape vs SanDisk -5% profit-taking after EPS $23.41 vs $14.51 cons; April capped S&P +10.4% / Nasdaq +15.3% / GOOGL +34% best month since 2004 IPO, JPY +3% on government intervention', category: 'general', related: '' },
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
