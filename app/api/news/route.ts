import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-04-27 13:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'Nvidia carries $5T cap into Sunday futures session after Friday +4.32% close to $208.27 on Intel data-center read-through; Mag-7 hyperscaler capex commentary at Wed April 29 prints sets up May 27 NVDA tape', category: 'company', related: 'NVDA' },
  { headline: 'Intel +24% Friday (best session since 1987) after Q1 $13.6B rev (+7% YoY) tops Street, 18A "high-volume ready" with PowerVia/RibbonFET; foundry still bleeds $2.4B operating loss but bookings inflect', category: 'company', related: 'INTC' },
  { headline: 'AMD into May 5 Q1 print after Friday +11.83% rip to $341.62 as analyst hikes target to $375 citing OpenAI 6GW Instinct deal and MI400 H2 ramp; Street looking for 32% YoY rev guide', category: 'company', related: 'AMD' },
  { headline: 'Tesla closes -7% on week as Q1 print and $25B 2026 capex guide (3x historical) digest; Optimus Fremont line ramps late July/August on 10,000-part BOM, robotaxi adds Dallas/Houston', category: 'company', related: 'TSLA' },
  { headline: 'Apple into Thursday April 30 Q2 print at $2.65 EPS / $137.5B rev consensus (+10.4/10.6% YoY); Services ~$30B at 70% gross margin and Section 301 supply-chain probe headline the call', category: 'company', related: 'AAPL' },
  { headline: 'Microsoft into Wednesday April 29 FY26 Q3 print at $3.88 EPS / $80.2B rev consensus (+20.1/15.2% YoY); Azure constant-currency guide and Copilot seat metrics carry FY26 ~$146B AI/cloud capex debate', category: 'company', related: 'MSFT' },
  { headline: 'Meta into April 29 close at $8.15 EPS / $58.4B rev consensus (+1.6/20.7% YoY); $115-135B 2026 capex, Llama 5 enterprise traction and "Avocado" frontier model anchor the narrative', category: 'company', related: 'META' },
  { headline: 'Amazon April 29 print at $2.11 EPS / $177.2B rev (+14% YoY) consensus with BofA/KeyBanc forecasting AWS reaccel to 28-30% from Q4 24%; $200B 2026 capex (+60% YoY) the swing factor', category: 'company', related: 'AMZN' },
  { headline: 'Alphabet April 29 print at $2.83 EPS / $107B rev consensus (+11% YoY), GCP estimate lifted 5% to $84.8B (+44%); $175-185B FY26 capex doubles 2025 spend on Broadcom TPU and Cadence/Marvell tie-ups', category: 'company', related: 'GOOGL' },
  { headline: 'Bitcoin pulls back to $77,679 on Monday Asia/Europe tape (-0.20% 24h, $79,491 high) after US spot BTC ETFs notch 4th straight weekly inflow at +$824M (Apr 20-24), IBIT alone +$733M; total ETF AUM tops $102B', category: 'crypto', related: 'BTC' },
  { headline: 'Ether $2,314.42 -0.64% on 24h, range $2,309-$2,405 as risk-off Monday tape pares Friday rally; staking ratio holds 32.33% (39M ETH locked) and BlackRock ETHB cumulative inflows extend past $311M into Mag-7 earnings week', category: 'crypto', related: 'ETH' },
  { headline: 'XRP $1.4119 -0.91% on 24h, range $1.4101-$1.4467 as Monday session unwinds weekend bid; Coinbase XRP/USD volume holds $100M+/24h and wXRP via LayerZero/Hex Trust pushes past $100M Solana liquidity since bridge live', category: 'crypto', related: 'XRP' },
  { headline: 'Solana $85.13 -1.12% on 24h, range $84.91-$88.07, giving back weekend gains as Mag-7 print week opens risk-off; wrapped-XRP via LayerZero OFT lands on chain and validator MEV fee tips push weekly bridge throughput past prior records', category: 'crypto', related: 'SOL' },
  { headline: 'Monday Apr 27 earnings docket front-loads pre-Mag-7 week with Verizon, Nucor, Domino\'s, Public Storage, AvalonBay, Cincinnati Financial, UHS and Ventas reporting; Intel-Tesla 14A/Terafab foundry partnership stays in focus after Friday +25% INTC rip', category: 'general', related: '' },
  { headline: 'Trump cancels Witkoff/Kushner Pakistan trip Saturday, says Iran sent "much better" proposal within 10 minutes; Brent +2% Sunday to $107.89 and WTI to $96.63 after IRGC boards two cargo ships near Hormuz', category: 'general', related: '' },
  { headline: 'FOMC May 6-7 in focus with CME FedWatch pricing 100% hold and 8% odds of a 2026 hike as Hormuz oil shock complicates the dovish path; Iran FM Araghchi shuttles Islamabad-Moscow as Pakistan races to revive talks', category: 'general', related: '' },
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
