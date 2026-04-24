import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-04-24 01:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'Tesla closes down 3.6% at $373.60 as Musk raises 2026 capex $5B to $25B for AI and Optimus; 50K inventory build weighs', category: 'company', related: 'TSLA' },
  { headline: 'Tesla Q1 EPS $0.41 tops $0.36 on $22.4B rev +16% YoY; gross margin 21.1% up 478bps, storage margin record 39.5%', category: 'company', related: 'TSLA' },
  { headline: 'Intel Q1 smashes Street at $0.29 adj EPS vs $0.01 on $13.6B rev; data center +22%, AI mix 60% of sales, stock +20% AH', category: 'company', related: 'INTC' },
  { headline: 'Intel guides Q2 rev $13.8-14.8B, EPS $0.20 vs $0.09 Street as Xeon ramp and process nodes extend sixth straight beat', category: 'company', related: 'INTC' },
  { headline: 'Meta confirms 10% workforce cut, 8,000 jobs starting May 20, as 2026 capex guide reaches $135B on AI infra push', category: 'company', related: 'META' },
  { headline: 'IBM tumbles ~9% despite Q1 beat at $1.91 EPS on $15.92B rev as unchanged FY26 guide and AI book silence spark sell', category: 'company', related: 'IBM' },
  { headline: 'ServiceNow craters 18%, worst day on record, as CFO flags Middle East conservatism on subscription guide despite beat', category: 'company', related: 'NOW' },
  { headline: 'Nvidia unveils open-source Ising quantum AI models as HBM supplier says AI memory demand still outstripping capacity', category: 'company', related: 'NVDA' },
  { headline: 'Texas Instruments surges 18%, best day since Oct 2000, as analog recovery and China demand lift FY26 guide', category: 'company', related: 'TXN' },
  { headline: 'Bitcoin steadies near $78.3K, down 0.11% on 24h, as IBIT pulls $246.9M and FBTC adds $56.7M to extend inflow streak', category: 'crypto', related: 'BTC' },
  { headline: 'Bitmine discloses 4.98M ETH treasury worth $11.5B, buying 101,627 ETH last week in largest 7-day accumulation of 2026', category: 'crypto', related: 'ETH' },
  { headline: 'Ether holds $2,329, off 1.8% on 24h, as institutional accumulation targets $2,500 resistance; $2,285-$2,373 session range', category: 'crypto', related: 'ETH' },
  { headline: 'XRP trades $1.44, up 0.7% on 24h, after MACD flips bullish; seven spot ETFs book $55.2M weekly inflows, biggest of 2026', category: 'crypto', related: 'XRP' },
  { headline: 'Solana steady at $86.11, off 0.8% on 24h, holding ascending channel as wXRP bridge on LayerZero drives cross-chain flow', category: 'crypto', related: 'SOL' },
  { headline: 'Brent tops $105 as Iran refuses to reopen Strait of Hormuz under US naval blockade; top negotiator Ghalibaf resigns', category: 'general', related: '' },
  { headline: 'S&P 500 -0.41% to 7,108, Nasdaq -0.89% to 24,438 as software rout from IBM, ServiceNow and Iran oil jolt hit risk', category: 'general', related: '' },
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
