import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-04-23 13:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'Tesla Q1 beat fades as Musk guides capex $5B above prior plan to $25B for AI, robotaxi and Optimus push', category: 'company', related: 'TSLA' },
  { headline: 'Tesla gross margin jumps 478bps YoY to 21.1% on mix as 50K inventory build and 8.8 GWh storage drag sentiment', category: 'company', related: 'TSLA' },
  { headline: 'Google Cloud debuts TPU 8t training pods scaling to 9,600 chips at 3x Ironwood, plus TPU 8i inference at 1,152 chips', category: 'company', related: 'GOOGL' },
  { headline: 'Alphabet rolls out Gemini Enterprise Agent Platform and $750M AI adoption fund as Cloud Next targets Nvidia, AWS', category: 'company', related: 'GOOGL' },
  { headline: 'Nvidia breaks out above $195 into bull flag near $202 as TPU 8t reveal tests custom silicon narrative', category: 'company', related: 'NVDA' },
  { headline: 'Intel reports Q1 after the bell with Street at $0.01-0.02 EPS on $12.4B rev; stock up 74% YTD near $68 into print', category: 'company', related: 'INTC' },
  { headline: 'IBM slides 6% afterhours despite Q1 beat at $1.91 EPS and $15.9B rev as full-year guide held and AI book omitted', category: 'company', related: 'IBM' },
  { headline: 'ServiceNow dives 14% after Middle East deal delays clip subscription growth 75bps and margin guide eases', category: 'company', related: 'NOW' },
  { headline: 'Coinbase jumps 5.9% as Nium USDC partnership, tGBP and DIEM listings offset NY AG suit moved to federal court', category: 'company', related: 'COIN' },
  { headline: 'Bitcoin holds $77.8K, BTC/USDT down 0.6% on 24h as Strategy adds $2.54B lifting holdings past 815K BTC', category: 'crypto', related: 'BTC' },
  { headline: 'Spot BTC ETFs extend inflow streak to five sessions with $238M added Monday as Saylor prints largest buy since 2024', category: 'crypto', related: 'BTC' },
  { headline: 'Ether slides 3.2% to $2,328 on ETH/BTC weakness as rotation favors Bitcoin; 24h range $2,305-$2,424', category: 'crypto', related: 'ETH' },
  { headline: 'XRP ETFs pull $55M over seven straight sessions, strongest week of 2026, as Wrapped XRP goes live on Solana via LayerZero', category: 'crypto', related: 'XRP' },
  { headline: 'Solana fades 3% to $85.94 after tagging $89.33; DeFi TVL steady as wXRP bridge launch drives cross-chain volume', category: 'crypto', related: 'SOL' },
  { headline: 'Iran seizes two more ships in Strait of Hormuz hours after Trump extends ceasefire, Brent settles $101.91 up 3%', category: 'general', related: '' },
  { headline: 'AG Pirro vows appeal after Judge Boasberg blocks Powell subpoenas, starting May 4 clock as Powell term ends May 15', category: 'general', related: '' },
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
