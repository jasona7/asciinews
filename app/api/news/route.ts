import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Shared macro/market/crypto/world tail used across the fallback tape (2026-07-05 12:00 UTC)
const CORE = 'SUNDAY-JULY-5 US-MARKETS-CLOSED-WEEKEND / REOPEN-MON-JULY-6 — Q2-2026-BOOKED-AS-STRONGEST-QUARTER-FOR-US-INDEXES-SINCE-2020 / LAST-PRINT THURSDAY-JULY-2 DOW-SECOND-STRAIGHT-RECORD-CLOSE 52,900.07 +594.83 +1.14% / S&P-500 7,483.24 / NASDAQ 25,832.67-SEMI-DRAG + MEGACAP-CROWN-RACE APPLE-WITHIN-~4%-OF-OVERTAKING-NVIDIA-AS-WORLDS-MOST-VALUABLE-COMPANY AAPL-~$4.5T-VS-NVDA-~$4.7T / AAPL-+4.8%-ON-REPORTS-OF-EXPANDED-IPHONE-LINEUP / NVDA-SLIPS-ON-BROAD-CHIP-STOCK-SELLOFF-STILL-#1 / TSLA--7.5% + RATE-PATH-WATCH FED-HELD-FUNDS-RATE-3.50%-3.75%-FOR-A-FOURTH-STRAIGHT-MEETING / FED-CHAIR-KEVIN-WARSH-SAYS-INFLATION-STILL-TOO-HIGH-DECLINES-TO-HINT-JULY-28-29-FOMC-DECISION / US-CPI-+4.2%-Y/Y-TO-MAY-LARGEST-12-MONTH-INCREASE-SINCE-APRIL-2023 + CRYPTO-COHORT-LIVE-SUN-JULY-5-12:00-UTC BTC $62,733 +0.45% / ETH $1,764.54 +0.62% / SOL $80.40 -2.47% / XRP $1.14 -0.06% — GLOBAL-CRYPTO-MCAP-~$2.22T +0.8% / SOFTER-WEEKEND-TAPE-SOL-THE-LAGGARD + WORLD VATICAN-DECLARES-SOCIETY-OF-ST-PIUS-X-IN-SCHISM / EXCOMMUNICATES-BISHOPS-AFTER-UNAUTHORIZED-CONSECRATIONS + XI-JINPING-PROMOTES-SEVERAL-GENERALS-TO-SHORE-UP-PLA-LOYALTY-TO-THE-PARTY + VENEZUELA-THOUSANDS-STILL-MISSING-A-WEEK-AFTER-TWIN-EARTHQUAKES-RESCUE-SHIFTS-TO-RECOVERY + POPE-LEO-URGES-US-TO-WELCOME-IMMIGRANTS-IN-AMERICA-250-ADDRESS + FIFA-WORLD-CUP-2026-R16 FRANCE-1-0-PARAGUAY-MBAPPE-TIES-MESSI-ON-7-GOALS / MOROCCO-3-0-CANADA-REACH-QF — DOW SECOND-STRAIGHT-RECORD-CLOSE 52,900.07 +1.14% per CNBC / TheStreet.';

// Fallback headlines when API fails or no key (updated 2026-07-05 12:00 UTC)
const FALLBACK_NEWS = [
  { headline: `Sunday July 5 12:00 UTC WEEKEND-RECAP-TAPE / US-MARKETS-CLOSED-INDEPENDENCE-DAY-WEEKEND — Q2-2026-BOOKED-AS-STRONGEST-QUARTER-FOR-US-INDEXES-SINCE-2020 with the equity tape frozen at ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Sunday July 5 12:00 UTC MACRO-TAPE / RATE-PATH-WATCH — FED-HELD-FUNDS-RATE-3.50%-3.75%-FOR-A-FOURTH-STRAIGHT-MEETING / FED-CHAIR-WARSH-SAYS-INFLATION-STILL-TOO-HIGH-DECLINES-TO-HINT-JULY-28-29-DECISION / US-CPI-+4.2%-Y/Y-TO-MAY-LARGEST-SINCE-APRIL-2023 as ${CORE}`, category: 'general', related: '' },
  { headline: `Sunday July 5 12:00 UTC AAPL-FOCUS-TAPE / MEGACAP-CROWN-WATCH — APPLE-WITHIN-~4%-OF-OVERTAKING-NVIDIA-AS-WORLDS-MOST-VALUABLE-COMPANY (AAPL-~$4.5T-VS-NVDA-~$4.7T) / AAPL-+4.8%-ON-REPORTS-OF-EXPANDED-IPHONE-LINEUP as ${CORE}`, category: 'general', related: 'AAPL' },
  { headline: `Sunday July 5 12:00 UTC NVDA-FOCUS-TAPE / SEMI-DESK-WATCH — NVDA-SLIPS-ON-BROAD-CHIP-STOCK-SELLOFF-STILL-#1-AT-~$4.7T-MARKET-CAP as APPLE-CLOSES-THE-GAP-TO-~4% as ${CORE}`, category: 'general', related: 'NVDA' },
  { headline: `Sunday July 5 12:00 UTC TSLA-FOCUS-TAPE / EV-DESK-WATCH — TSLA--7.5% the standout megacap decliner into the HOLIDAY-CLOSE / MARKETS-REOPEN-MON-JULY-6 as ${CORE}`, category: 'general', related: 'TSLA' },
  { headline: `Sunday July 5 12:00 UTC AMD-FOCUS-TAPE / SEMI-DESK-WATCH — AMD-CAUGHT-IN-THE-BROAD-CHIP-STOCK-SELLOFF that dinged NVDA even as US-INDEXES-BOOKED-STRONGEST-QUARTER-SINCE-2020 as ${CORE}`, category: 'general', related: 'AMD' },
  { headline: `Sunday July 5 12:00 UTC MSFT-FOCUS-TAPE / MAG-7-WATCH — MSFT-RIDES-THE-Q2-RECORD-QUARTER as the MEGACAP-CROWN-RACE narrows to APPLE-VS-NVIDIA at the top of the tape as ${CORE}`, category: 'general', related: 'MSFT' },
  { headline: `Sunday July 5 12:00 UTC META-FOCUS-TAPE / MAG-7-WATCH — META-IN-THE-MAG-7-COHORT after Q2-2026-BOOKED-AS-STRONGEST-QUARTER-FOR-US-INDEXES-SINCE-2020 as ${CORE}`, category: 'general', related: 'META' },
  { headline: `Sunday July 5 12:00 UTC COIN-FOCUS-TAPE / EXCHANGE-DESK-WATCH — COIN-TRACKS-A-SOFTER-WEEKEND-CRYPTO-TAPE with GLOBAL-CRYPTO-MCAP-~$2.22T-+0.8% while BTC-HOLDS-~$62.7K as ${CORE}`, category: 'general', related: 'COIN' },
  { headline: `Sunday July 5 12:00 UTC MSTR-FOCUS-TAPE / TREASURY-DESK-WATCH — MSTR-CARRIES-THE-BITCOIN-TREASURY-ANGLE as BTC-EASES-TO-~$62.7K-ON-A-QUIET-WEEKEND as ${CORE}`, category: 'general', related: 'MSTR' },
  { headline: `Sunday July 5 12:00 UTC BTC-FOCUS-TAPE / CRYPTO-DESK-WATCH — BTC $62,733 +0.45%-STEADY-ON-A-QUIET-WEEKEND-TAPE as GLOBAL-CRYPTO-MCAP-~$2.22T-+0.8% as ${CORE}`, category: 'general', related: 'BTC' },
  { headline: `Sunday July 5 12:00 UTC ETH-FOCUS-TAPE / CRYPTO-DESK-WATCH — ETH $1,764.54 +0.62%-FIRMER-WITH-BTC on a light weekend tape as ${CORE}`, category: 'general', related: 'ETH' },
  { headline: `Sunday July 5 12:00 UTC SOL-FOCUS-TAPE / CRYPTO-DESK-WATCH — SOL $80.40 -2.47%-THE-COHORT-LAGGARD slipping below $81 on the softer weekend tape as ${CORE}`, category: 'general', related: 'SOL' },
  { headline: `Sunday July 5 12:00 UTC XRP-FOCUS-TAPE / CRYPTO-DESK-WATCH — XRP $1.14 -0.06%-ESSENTIALLY-FLAT holding ~$1.14 on a quiet weekend as ${CORE}`, category: 'general', related: 'XRP' },
  { headline: `Macro Sunday July 5 12:00 UTC WORLD-DESK-TAPE / VATICAN-WATCH — VATICAN-DECLARES-SOCIETY-OF-ST-PIUS-X-IN-SCHISM / EXCOMMUNICATES-BISHOPS after UNAUTHORIZED-CONSECRATIONS-DEFY-POPE-LEO-XIV as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Sunday July 5 12:00 UTC WORLD-DESK-TAPE / CHINA-WATCH — XI-JINPING-PROMOTES-SEVERAL-GENERALS in a move to SHORE-UP-PLA-LOYALTY-TO-THE-PARTY as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Sunday July 5 12:00 UTC WORLD-DESK-TAPE / VENEZUELA-WATCH — VENEZUELA-THOUSANDS-STILL-MISSING-A-WEEK-AFTER-TWIN-EARTHQUAKES / RESCUE-SHIFTS-TO-RECOVERY as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Sunday July 5 12:00 UTC WORLD-DESK-TAPE / AMERICA-250-WATCH — POPE-LEO-URGES-US-TO-WELCOME-IMMIGRANTS in an AMERICA-250-ADDRESS as the nation marks its 250TH-BIRTHDAY-WEEKEND as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Sunday July 5 12:00 UTC WORLD-DESK-TAPE / SPORTS-WATCH — FIFA-WORLD-CUP-2026-R16 FRANCE-1-0-PARAGUAY (MBAPPE-TIES-MESSI-ON-7-GOALS) / MOROCCO-3-0-CANADA-REACH-QF as ${CORE}`, category: 'general', related: '' },
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
