import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-04-23 01:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'Tesla beats Q1 EPS at $0.41 vs $0.37, revenue $22.4B tops $21.4B; shares fade as capex guide lifts to $25B', category: 'company', related: 'TSLA' },
  { headline: 'Tesla Q1 deliveries of 358K miss view; inventory builds 50K units as energy storage slides 38% to 8.8 GWh', category: 'company', related: 'TSLA' },
  { headline: 'Alphabet unveils McKinsey-Google Transformation Group at Cloud Next; two new TPUs and Merck drug-AI deal headline', category: 'company', related: 'GOOGL' },
  { headline: 'Apple holds above $195 into Cloud Next week as Street leaves April 30 earnings estimates unchanged', category: 'company', related: 'AAPL' },
  { headline: 'Nvidia pares premarket gain to flat as Brent back above $100 keeps macro risk-off bid on mega-cap tech', category: 'company', related: 'NVDA' },
  { headline: 'Microsoft trades $428 into April 29 fiscal Q3; Street models Azure growth reaccel to 34-35% constant currency', category: 'company', related: 'MSFT' },
  { headline: 'Amazon and Broadcom draw upgrades after Anthropic commits to Trainium2 clusters, AWS silicon roadmap through 2027', category: 'company', related: 'AMZN' },
  { headline: 'Coinbase holds gains as GSR debuts actively-managed BESO ETF pairing BTC, ETH, SOL exposure with staking yield', category: 'company', related: 'COIN' },
  { headline: 'Bitcoin holds $78K as BlackRock IBIT vacuums $906M in a week, crossing 800K BTC and 3.8% of circulating supply', category: 'crypto', related: 'BTC' },
  { headline: 'Spot BTC ETFs log $996M weekly inflow, strongest seven-day stretch since mid-January as institutional bid returns', category: 'crypto', related: 'BTC' },
  { headline: 'Ether climbs to $2,370, up 1.9% on 24h as GSR Core3 ETF and LayerZero bridge reform headlines drive rotation', category: 'crypto', related: 'ETH' },
  { headline: 'XRP slips 0.2% to $1.43 as post-rally consolidation continues; CME open interest flattens after Tuesday highs', category: 'crypto', related: 'XRP' },
  { headline: 'Solana flat near $87 as Drift and Kelp DAO exploits push April DeFi losses past $606M across 12 incidents', category: 'crypto', related: 'SOL' },
  { headline: 'Iran fires on three ships in Strait of Hormuz and seizes MSC Francesca, Epaminondas despite Trump ceasefire extension', category: 'general', related: '' },
  { headline: 'Brent crude tops $100 intraday, settles near $101.91 as Hormuz attacks reopen war premium; WTI follows higher', category: 'general', related: '' },
  { headline: 'Tillis signals Warsh Fed chair vote possible if Congress opens own Powell probe and DOJ drops criminal inquiry', category: 'general', related: '' },
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
