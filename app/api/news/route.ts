import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-04-30 13:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'Nvidia $215.12 (ATH $216.61 Apr 27) firms into Thursday\'s tape with the four-Mag-7 AMC capex prints now ratifying ~$725B aggregate hyperscaler envelope — MSFT $190B/Azure 40% cc, GOOGL $180-190B/Cloud 63%, META $125-145B raised/AMD 6GW Instinct deployment confirmed, AMZN $200B reaffirmed/AWS 28%; the prints directly rebut Tuesday\'s OpenAI compute-demand reset and Wednesday\'s chip washout, with the May 20 NVDA fiscal Q1 print (Street modeling 79-81% YoY rev growth) the next gating event for the AI silicon TAM thesis', category: 'company', related: 'NVDA' },
  { headline: 'Intel $94.75 fresh all-time high (+12.1% Wed session, eclipsing prior $85.98 ATH and August 2000 peak) as Tesla 14A Terafab "first major external customer" thesis converges with Apple reportedly exploring 18A-P, Google evaluating advanced packaging, Lip-Bu Tan flagging multiple 18AP/14A engagements; foundry inflection now anchored by ~$725B FY26 hyperscaler capex envelope — agentic-CPU thesis (1:8 to 1:1 CPU:GPU ratio rebound) re-rating sustained through MSFT/GOOGL/AMZN/META prints, INTC up >35% in 6 sessions', category: 'company', related: 'INTC' },
  { headline: 'AMD $337.11 +4.30% Wednesday close (April +59% MTD, fresh ATHs ahead of May 5 AMC Q1 print at $1.29 EPS / $9.89B rev cons), DA Davidson resetting target on data-center GPU demand read-through; META Q1 reaffirms 6GW Instinct deployment with custom MI450/Venice EPYC ramp 2H 2026 (deal value >$100B incl. 160M-share warrant) — MI400 cadence and 1GW MI450 milestone the gating items, AMZN AWS +28% / GOOGL Cloud +63% re-anchoring sovereign-AI GPU demand into the print', category: 'company', related: 'AMD' },
  { headline: 'Tesla ~$376 holding YTD -15% (worst Mag-7 performer 2026) as JPMorgan reiterates $145 sell target post-mixed Q1 (capex $2.49B for the quarter ~40% below model, FY guide $25B reaffirmed); Cybercab volume production confirmed starting Giga Texas this month, Optimus first large-scale factory prep begins Q2 (1M units/yr line target), Intel 14A Terafab equipment orders already placed for Austin chip+solar fab — robotaxi commercial scale still gated by FSD-Unsupervised regulator approval push', category: 'company', related: 'TSLA' },
  { headline: 'Apple $270.17 close (range $267.04-$271.04) into Thursday 4:30pm EDT Q2 print at $1.95 EPS / $109.69B rev cons (range $107.08-$115.37B, JPM Street-high $112.7B/$2.05); first call since Tim Cook executive-chairman / John Ternus CEO succession (effective Sept 1), iPhone cons ~$56.5B (JPM $59.5B on iPhone 17 strength), Services ~$30B (>70% GM), China momentum off Q1\'s record after +20% calendar Q1 shipments — memory/SSD cost pass-through from $725B hyperscaler buildout still the margin overhang front of tape', category: 'company', related: 'AAPL' },
  { headline: 'Microsoft -1% premarket Thursday after initially -2% AH Wednesday on $190B FY26 capex print (incl. ~$25B memory cost pass-through), but FY26 Q3 beats top/bottom and Azure prints +40% cc (vs 37-38% guide) — $4.27 EPS / $82.89B rev (cons $4.06 / $81.39B), Microsoft Cloud $54.5B +29%, commercial RPO +99% to $627B, 365 Copilot seats now 20M (from 15M Jan); pre-mkt fade reflects capex-fatigue reflex even as Azure re-acceleration directly rebuts the OpenAI compute-demand reset thesis', category: 'company', related: 'MSFT' },
  { headline: 'Meta -8% to -9% premarket Thursday on Q1 beat overshadowed by capex revision — $7.31 EPS / $56.31B rev +33% YoY (cons $6.78 / $55.45B, fastest growth since 2021), net income $26.77B +61%, FoA ad rev $55.0B +33% (impressions +19%, price/ad +12%), Reality Labs -$4.03B; FY26 capex guide raised to $125-145B (from $115-135B prior) on memory/component pricing, AMD 6GW Instinct deployment confirmed marquee GPU mix, softer DAU read-through compounding the gap-down', category: 'company', related: 'META' },
  { headline: 'Amazon +2% premarket Thursday on Q1 blowout — $181.52B rev +17% YoY (cons $177.30B), AWS $37.59B +28% (15-quarter high, smashed mid-20s bar, Jefferies "solid Q1 rev beat w/ AWS re-accelerating"); Q2 guide $194-199B / OI $20-24B, FY26 capex $200B reaffirmed including Project Kuiper, Q1 backlog $364B excluding the $100B Anthropic deal — AWS the marquee tell on AI-infrastructure absorption alongside GOOGL Cloud +63% reinforcing the aggregate envelope', category: 'company', related: 'AMZN' },
  { headline: 'Alphabet GOOG/GOOGL +5.78% AH to ~$367.38 (fresh ATH) on Q1 print of $109.9B rev +22% YoY, $5.11 adj EPS, NI $62.6B +81%, 11th straight double-digit growth quarter; Cloud $20.02B +63% YoY blew past $18.05B cons (off Q4 48%), backlog nearly doubled QoQ to >$460B, Pichai flagging enterprise-AI as "primary growth driver for cloud for the first time"; FY26 capex raised to $180-190B (from $175-185B prior), CFO Ashkenazi signaling 2027 capex "significant increase" — Pivotal raising target to Street-high $470', category: 'company', related: 'GOOGL' },
  { headline: 'Bitcoin $76,282 -1.1% 24h (range $75,103-$77,191) extending the post-FOMC fade as ETF tape printed -$148.4M Apr 29 net (third straight outflow day, IBIT -$54.7M / FBTC -$36.1M / ARKB -$30.0M), ending the 9-day inflow streak that had stacked $2.1-2.12B; April still a net +$2.44B on the month (best of 2026), but $75K the immediate test ahead of 8:30am GDP Q1 advance (cons +2.2% vs +0.5% prior) and core PCE prints with Brent retracement off $126 still leaving inflation-pass-through reflex live', category: 'crypto', related: 'BTC' },
  { headline: 'Ether $2,265 -2.2% 24h (range $2,224-$2,316) underperforming the BTC tape and breaking through Wednesday\'s $2,266 floor on a wider risk-off reflex post-Mag-7 capex prints and the Brent $126 spike; ETH/BTC ratio softening further as the four-dissent Fed dot plot still shows only one 2026 cut — taker buy/sell ratio hit highest level since January 2023 on the on-chain side, but spot tape still discounting the Aave TVL hangover (-$28.6B / -37% post-exploit) into Thursday\'s GDP/PCE double-print', category: 'crypto', related: 'ETH' },
  { headline: 'XRP $1.37 -0.9% 24h (range $1.35-$1.38) softening but holding the $1.35 shelf as US-listed spot XRP ETFs close out April at $81.63M net inflows — the strongest monthly print of 2026 and longest unbroken positive streak in product history (zero outflow days since April 9); cumulative ETF base $1.29B across seven products, total NAV >$1.53B, Goldman Sachs the largest disclosed institutional holder at $153.8M across four funds; $1.40 cap unbroken into the GDP/PCE/AAPL-AMC stack', category: 'crypto', related: 'XRP' },
  { headline: 'Solana $83.17 -1.2% 24h (range $81.57-$84.22) consolidating as spot SOL ETFs print ~$35.17M net inflows over the trailing week (five straight positive sessions, AUM through $1B), Goldman Sachs disclosed at $108M; April 28 quantum-resistant signature migration now live alongside Israel CMA\'s BILS approval (1:1 ILS-pegged stablecoin from Bits of Gold) deploying on Solana with sub-400ms settlement, EY-audited segregated reserves, Fireblocks custody, QEDIT ZK privacy layer — utility narrative deepening even as the spot tape softens with the broader risk complex', category: 'crypto', related: 'SOL' },
  { headline: 'Brent intraday-spike to $126/bbl Thursday (highest since 2022) before paring to ~$114.70 -2.8% as Goldman Sachs flags Hormuz exports collapsed to 4% of normal, Iran refusing to reopen until US lifts naval blockade pending nuclear deal; UAE OPEC exit goes live May 1 (first major departure in six decades, ~4 mbpd capacity vs ~3 mbpd quota) — ING flags "big blow to OPEC" but medium-term ramp doesn\'t offset near-term tightness, WTI ~$107 with the inflation-pass-through reflex still live into the 8:30am GDP+PCE double-print', category: 'general', related: '' },
  { headline: 'Thursday 8:30am ET pre-mkt economic stack lands GDP Q1 2026 advance (cons +2.2% vs +0.5% prior reading), Initial Jobless Claims, and core PCE — the Fed\'s preferred inflation gauge — the same morning four-week (3.595% prior) and eight-week (3.605% prior) bill auctions clear; tape still digesting the 8-4 FOMC hold (first four-dissent meeting since October 1992 — Miran cut, Hammack/Kashkari/Logan against the easing bias) with one 2026 cut still in the dot plot and Brent shock pass-through the marquee variable', category: 'general', related: '' },
  { headline: 'Dow futures +303 (+0.6%), S&P 500 futures +0.4%, Nasdaq 100 futures +0.5% pre-bell Thursday with Caterpillar +6% on Q1 beat boosting Dow tape and AMZN +2% on AWS re-acceleration, offset by META -8% to -9% on $125-145B capex revise and MSFT -1% to -2% on $190B capex despite Azure +40%; April still tracking S&P +9.3% / Nasdaq +14.3% (best month since 2020), GOOGL +5.78% AH to ~$367 ATH the marquee Mag-7 winner ahead of AAPL\'s 4:30pm EDT print', category: 'general', related: '' },
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
