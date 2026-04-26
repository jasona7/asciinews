import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-04-26 13:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'Nvidia closes Friday $208.27 +4.32% to retake $5T cap as Intel data-center beat lifts AI chip read-through; Motley Fool flags 1,100% post-ChatGPT run into May 27 print', category: 'company', related: 'NVDA' },
  { headline: 'Intel digests $85+ premarket print after Q1 $13.6B rev (+7% YoY) tops Street, 18A "high-volume ready" with PowerVia/RibbonFET, but foundry still bleeds $2.4B operating loss', category: 'company', related: 'INTC' },
  { headline: 'AMD closes $341.62 +11.83% Friday on no-news rip as analyst hikes target to $375 citing OpenAI 6GW Instinct deal and MI400 H2 ramp; Q1 print May 5 with 32% YoY rev guide', category: 'company', related: 'AMD' },
  { headline: 'Tesla -7% on the week into weekend after Q1 print and $25B 2026 capex guide (3x historical); Optimus Fremont line ramps late July/August on 10,000-part BOM, robotaxi adds Dallas/Houston', category: 'company', related: 'TSLA' },
  { headline: 'Apple into Thursday April 30 Q2 print with consensus rev $109.3B, Services ~$30B at 70% gross margin; Greater China +30% sustainability and Section 301 supply-chain probe in focus', category: 'company', related: 'AAPL' },
  { headline: 'Microsoft into Wednesday April 29 FY26 Q3 print at $4.04 EPS / $81.4B rev consensus (+16/17% YoY); Azure constant-currency guide and FY26 ~$146B AI/cloud capex envelope drive Street debate', category: 'company', related: 'MSFT' },
  { headline: 'Meta Q1 consensus pushed to $7.51 EPS / $55.5B rev (+31% YoY) ahead of April 29 close as $115-135B 2026 capex, Llama 5 enterprise traction and "Avocado" frontier model anchor narrative', category: 'company', related: 'META' },
  { headline: 'Amazon April 29 print pegged at $2.11 EPS / $177.2B rev (+14% YoY) with BofA/KeyBanc forecasting AWS reaccel to 28-30% from Q4 24%; $200B 2026 capex (+60% YoY) the swing factor', category: 'company', related: 'AMZN' },
  { headline: 'Alphabet April 29 print at $2.83 EPS / $107B rev consensus (+11% YoY), GCP estimate lifted 5% to $84.8B (+44%); $175-185B FY26 capex doubles 2025 spend on Broadcom TPU and Cadence/Marvell tie-ups', category: 'company', related: 'GOOGL' },
  { headline: 'Bitcoin $77,851 on Sunday Asia tape, 24h range $77,141-$78,221 (+0.36%), as April spot ETF inflows hit $2.43B (best run since Oct 2025) with IBIT absorbing 91% of April 13-17 net flow; AUM $105.3B', category: 'crypto', related: 'BTC' },
  { headline: 'Ether $2,330.51 +0.71% on 24h, reclaiming $2,300 floor as staking ratio hits record 32.33% (39M ETH locked, $90.3B) and BlackRock ETHB pulls $311M cumulative since March debut', category: 'crypto', related: 'ETH' },
  { headline: 'XRP $1.4245 -0.31% on 24h, range $1.4180-$1.4324 as Coinbase XRP/USD volume holds $100M+/24h and wXRP via LayerZero/Hex Trust pushes past $100M Solana liquidity in first weeks of bridge live', category: 'crypto', related: 'XRP' },
  { headline: 'Solana $86.08 -0.38% on 24h, range $85.55-$86.76, as wrapped-XRP via LayerZero OFT lands on chain and validator MEV fee tips push weekly bridge throughput past prior records', category: 'crypto', related: 'SOL' },
  { headline: 'S&P 500 closed Friday +0.80% to 7,165.08 record, Nasdaq +1.63% to 24,836.60 record on Intel 23% rip and Nvidia $5T retake; weekly: SPX +0.6%, NDX +1.5% into 5-of-Mag-7 earnings week', category: 'general', related: '' },
  { headline: 'Witkoff and Kushner land in Pakistan Saturday for direct US-Iran Hormuz talks as Brent settles Friday $105.33 (+16% on week) and Iranian negotiator Qalibaf ties full ceasefire to Navy blockade lift', category: 'general', related: '' },
  { headline: 'FOMC May 6-7 in focus with CME FedWatch at 55% odds of a cut; March SEP keeps one 2026 cut, with Feb core PCE 3.0% and total PCE 2.8% staff estimate complicating dovish path into Big Tech print week', category: 'general', related: '' },
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
