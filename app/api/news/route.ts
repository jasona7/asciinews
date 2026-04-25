import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-04-25 13:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'Nvidia consolidates above $5T market cap at $209.58 as BofA hikes 2026 chip TAM forecast to $1.3T, naming NVDA top driver alongside Broadcom, Marvell and AMD', category: 'company', related: 'NVDA' },
  { headline: 'Intel digests 23.6% Friday rip with $82.55 close as Q2 guide $13.8-14.8B rev and $0.20 EPS vs $0.09 consensus reframes foundry turnaround into multi-quarter story', category: 'company', related: 'INTC' },
  { headline: 'AMD closes $347.77 +13.9% as CPU/GPU ratio thesis flips from 1:8 toward 1:1 on AI agent workloads, with SOX 18-day win streak now most stretched vs 200DMA since June 2000', category: 'company', related: 'AMD' },
  { headline: 'Tesla settles $376.30 into weekend after Q1 print of $0.41 adj EPS vs $0.37 on $22.39B rev (miss vs $22.64B), with $25B 2026 capex hike and Optimus ramp setting Monday tone', category: 'company', related: 'TSLA' },
  { headline: 'Apple holds $270.12 with five sessions to April 30 Q2 print; sell-side previews split between Cook September exit overhang and 18% Services growth as offset to China softness', category: 'company', related: 'AAPL' },
  { headline: 'Microsoft into Wednesday April 29 print with consensus $3.42 EPS on $73.8B rev as Street probes $146B FY26 capex against Azure AI revenue acceleration past 35%', category: 'company', related: 'MSFT' },
  { headline: 'Meta Q1 consensus $7.51 EPS / $55.5B rev +31% YoY ahead of April 29 close as $115-135B 2026 capex range and Llama 4 monetization framing dominate buy-side notes', category: 'company', related: 'META' },
  { headline: 'Amazon April 29 print pegged at $1.38 EPS on $158B rev with AWS growth re-acceleration and $125B 2026 capex the swing factors after Microsoft and Google print same evening', category: 'company', related: 'AMZN' },
  { headline: 'Alphabet into April 29 close as new TPU v7 lineup positions Google to lift hyperscaler chip share past 15%; Search ad rev resilience versus AI Overviews remains the bear case', category: 'company', related: 'GOOGL' },
  { headline: 'Coinbase $199.76 into Thursday Q1 print as XRP tier-one classification flows through trading take rates and May 1 trade-at-settlement futures launch nears go-live', category: 'company', related: 'COIN' },
  { headline: 'Bitcoin $77,573 on weekend tape, range $77,262-$78,480 last 24h, as IBIT Friday $167M inflow caps eighth straight day of net-in totaling $2.1B; spot ETF cumulative tops $58B', category: 'crypto', related: 'BTC' },
  { headline: 'Ether $2,314 trades down 0.61% on 24h, holding $2,300 floor as Bitmine 4.98M ETH treasury and 8.2% staking yield underpin institutional bid into May FOMC setup', category: 'crypto', related: 'ETH' },
  { headline: 'XRP $1.4292 fades 0.37% on 24h after midweek $1.45 high, as Coinbase tier-one inclusion and Solana wrapped-XRP via LayerZero deepen cross-venue liquidity profile', category: 'crypto', related: 'XRP' },
  { headline: 'Solana $86.41 flat on 24h, range $85.54-$86.96, as wrapped-XRP launch via LayerZero pushes weekly bridge volume past $480M and Jito MEV tips reach 14-week high', category: 'crypto', related: 'SOL' },
  { headline: 'S&P 500 closed Friday +0.80% to 7,165 record, Nasdaq +1.63% to 24,837 record, Dow -0.16% to 49,231; weekly: SPX +0.6%, NDX +1.5%, INDU -0.4% into Big Tech earnings week', category: 'general', related: '' },
  { headline: 'Brent settles $105.30 Friday after intraday $107 print, up 16% on the week as US-Iran Hormuz blockade enters day 12 and Trump signals no rush to end standoff', category: 'general', related: '' },
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
