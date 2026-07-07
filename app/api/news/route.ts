import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Shared macro/market/crypto/world tail used across the fallback tape (2026-07-07 00:00 UTC)
const CORE = 'TUESDAY-JULY-7 00:00-UTC-OVERNIGHT — US-CASH-MARKETS-CLOSED-AFTER-MONDAYS-RECORD-SESSION-REOPEN-TUE-13:30-UTC / MONDAY-JULY-6-CLOSE DOW-53,055.91 +155.84 +0.29% (FIRST-EVER-CLOSE-ABOVE-53,000-NEW-RECORD) / S&P-500 7,537.43 +0.72% / NASDAQ 26,121.16 +1.12% — REVIVED-AI-OPTIMISM-LIFTS-MEGACAPS-CHIPS-FIRM / Q2-2026-STILL-BOOKED-AS-STRONGEST-QUARTER-FOR-US-INDEXES-SINCE-2020 + MEGACAP-CROWN-RACE NVIDIA-STILL-#1-AT-~$4.7T-VS-APPLE-~$4.5T GAP-~$190B-~4% / APPLE-THE-NEAREST-CHALLENGER-ON-IPHONE-SALES-MOMENTUM / TSLA-Q2-DELIVERIES-480,126-+25%-Y/Y-BEST-EVER-Q2-AHEAD-OF-JULY-22-EARNINGS + RATE-PATH-WATCH FED-HELD-FUNDS-RATE-3.50%-3.75%-AT-THE-JUNE-16-17-FOMC / FED-CHAIR-KEVIN-WARSH-SAYS-INFLATION-STILL-TOO-HIGH / JUNE-JOBS-+57K-MISS-UNEMPLOYMENT-4.2%-QUIETS-HIKE-TALK / NEXT-FOMC-JULY-28-29 / JUNE-CPI-DUE-JULY-14 + CRYPTO-COHORT-LIVE-TUE-JULY-7-00:00-UTC BTC $63,989.69 +0.63% / ETH $1,797.92 +0.80% / SOL $81.90 +0.58% / XRP $1.1455 -0.97% — GLOBAL-CRYPTO-MCAP-~$2.2T / MILDLY-RISK-ON-BTC-BOUNCES-OFF-LAST-WEEKS-DIP-XRP-THE-COHORT-LAGGARD + WORLD UKRAINE-RUSSIA-MISSILE-AND-DRONE-STRIKE-ON-KYIV-KILLS-AT-LEAST-12-EXPOSES-AIR-DEFENSE-GAPS + CHINA-BEGINS-ENFORCING-A-NEW-ETHNIC-UNITY-LAW-AS-XI-JINPING-PROMOTES-NEW-PLA-GENERALS + VENEZUELA-THOUSANDS-STILL-MISSING-A-WEEK-AFTER-TWIN-EARTHQUAKES-SHIFT-FROM-RESCUE-TO-RECOVERY + POPE-LEO-URGES-US-AND-EUROPE-TO-EASE-INHUMANE-TREATMENT-OF-MIGRANTS + FIFA-WORLD-CUP-2026-ROUND-OF-16-WRAPS SPAIN-1-0-PORTUGAL-MERINO-90-INTO-QF / USA-BELGIUM-LIVE-IN-SEATTLE / QUARTERFINALS-JULY-9-11 — DOW MONDAY-RECORD-CLOSE 53,055.91 +0.29% per CNBC / TheStreet.';

// Fallback headlines when API fails or no key (updated 2026-07-07 00:00 UTC)
const FALLBACK_NEWS = [
  { headline: `Tuesday July 7 00:00 UTC OVERNIGHT-TAPE / US-CASH-MARKETS-CLOSED-AFTER-MONDAYS-RECORD-SESSION-REOPEN-TUE-13:30-UTC — DOW-CLOSES-AT-A-RECORD-53,055.91-+0.29%-FIRST-EVER-ABOVE-53,000 as REVIVED-AI-OPTIMISM-LIFTS-MEGACAPS with ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Tuesday July 7 00:00 UTC MACRO-TAPE / RATE-PATH-WATCH — FED-HELD-FUNDS-RATE-3.50%-3.75%-AT-THE-JUNE-16-17-FOMC / FED-CHAIR-WARSH-SAYS-INFLATION-STILL-TOO-HIGH / JUNE-JOBS-+57K-MISS-UNEMPLOYMENT-4.2%-QUIETS-HIKE-TALK / NEXT-FOMC-JULY-28-29 / JUNE-CPI-DUE-JULY-14 as ${CORE}`, category: 'general', related: '' },
  { headline: `Tuesday July 7 00:00 UTC AAPL-FOCUS-TAPE / MEGACAP-CROWN-WATCH — APPLE-~$4.5T-THE-NEAREST-CHALLENGER-TO-NVIDIA-~$4.7T with the GAP-AT-~$190B-~4% on IPHONE-SALES-MOMENTUM after Mondays record close as ${CORE}`, category: 'general', related: 'AAPL' },
  { headline: `Tuesday July 7 00:00 UTC NVDA-FOCUS-TAPE / SEMI-DESK-WATCH — NVDA-STILL-#1-AT-~$4.7T-MARKET-CAP holding the megacap crown as APPLE-CLOSES-THE-GAP-TO-~4% and CHIPS-FIRM-INTO-THE-TUESDAY-REOPEN as ${CORE}`, category: 'general', related: 'NVDA' },
  { headline: `Tuesday July 7 00:00 UTC TSLA-FOCUS-TAPE / EV-DESK-WATCH — TSLA-CARRIES-A-Q2-DELIVERY-BEAT-480,126-+25%-Y/Y-BEST-EVER-Q2 that ended a two-year decline streak ahead of JULY-22-EARNINGS as ${CORE}`, category: 'general', related: 'TSLA' },
  { headline: `Tuesday July 7 00:00 UTC AMD-FOCUS-TAPE / SEMI-DESK-WATCH — AMD-EYED-INTO-THE-TUESDAY-REOPEN-AS-CHIPS-FIRM after Mondays RECORD-SESSION lifted the semis on REVIVED-AI-OPTIMISM as ${CORE}`, category: 'general', related: 'AMD' },
  { headline: `Tuesday July 7 00:00 UTC MSFT-FOCUS-TAPE / MAG-7-WATCH — MSFT-~$3.28T-IN-THE-THIRD-MEGACAP-TIER carries the Q2-RECORD-QUARTER as the CROWN-RACE-NARROWS-TO-NVIDIA-VS-APPLE at the top of the tape as ${CORE}`, category: 'general', related: 'MSFT' },
  { headline: `Tuesday July 7 00:00 UTC META-FOCUS-TAPE / MAG-7-WATCH — META-RALLIES-WITH-THE-MEGACAP-COHORT into Mondays RECORD-CLOSE as REVIVED-AI-OPTIMISM-LIFTS-THE-MAG-7 as ${CORE}`, category: 'general', related: 'META' },
  { headline: `Tuesday July 7 00:00 UTC COIN-FOCUS-TAPE / EXCHANGE-DESK-WATCH — COIN-TRACKS-A-STEADIER-CRYPTO-TAPE with GLOBAL-CRYPTO-MCAP-~$2.2T as BTC-BOUNCES-TO-~$64K off last weeks dip as ${CORE}`, category: 'general', related: 'COIN' },
  { headline: `Tuesday July 7 00:00 UTC MSTR-FOCUS-TAPE / TREASURY-DESK-WATCH — MSTR-CARRIES-THE-BITCOIN-TREASURY-ANGLE as BTC-BOUNCES-TO-~$64K-INTO-TUESDAY in a mildly risk-on tone as ${CORE}`, category: 'general', related: 'MSTR' },
  { headline: `Tuesday July 7 00:00 UTC BTC-FOCUS-TAPE / CRYPTO-DESK-WATCH — BTC $63,989.69 +0.63%-BOUNCES-OFF-LAST-WEEKS-DIP holding ~$64K as GLOBAL-CRYPTO-MCAP-~$2.2T as ${CORE}`, category: 'general', related: 'BTC' },
  { headline: `Tuesday July 7 00:00 UTC ETH-FOCUS-TAPE / CRYPTO-DESK-WATCH — ETH $1,797.92 +0.80%-LEADS-THE-COHORT-GREEN holding near $1,800 into Tuesday as ${CORE}`, category: 'general', related: 'ETH' },
  { headline: `Tuesday July 7 00:00 UTC SOL-FOCUS-TAPE / CRYPTO-DESK-WATCH — SOL $81.90 +0.58%-FIRMS-WITH-THE-COHORT holding above $80 into Tuesday as ${CORE}`, category: 'general', related: 'SOL' },
  { headline: `Tuesday July 7 00:00 UTC XRP-FOCUS-TAPE / CRYPTO-DESK-WATCH — XRP $1.1455 -0.97%-THE-COHORT-LAGGARD easing back toward $1.14 as the majors firm into Tuesday as ${CORE}`, category: 'general', related: 'XRP' },
  { headline: `Macro Tuesday July 7 00:00 UTC WORLD-DESK-TAPE / UKRAINE-WATCH — RUSSIA-MISSILE-AND-DRONE-STRIKE-ON-KYIV-KILLS-AT-LEAST-12 and EXPOSES-AIR-DEFENSE-GAPS in an overnight barrage as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Tuesday July 7 00:00 UTC WORLD-DESK-TAPE / CHINA-WATCH — CHINA-BEGINS-ENFORCING-A-NEW-ETHNIC-UNITY-LAW as XI-JINPING-PROMOTES-NEW-PLA-GENERALS-TO-SHORE-UP-MILITARY-LOYALTY as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Tuesday July 7 00:00 UTC WORLD-DESK-TAPE / VENEZUELA-WATCH — VENEZUELA-THOUSANDS-STILL-MISSING-A-WEEK-AFTER-TWIN-EARTHQUAKES as the response SHIFTS-FROM-RESCUE-TO-RECOVERY as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Tuesday July 7 00:00 UTC WORLD-DESK-TAPE / VATICAN-WATCH — POPE-LEO-URGES-US-AND-EUROPE-TO-EASE-INHUMANE-TREATMENT-OF-MIGRANTS-AND-REFUGEES in his latest appeal as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Tuesday July 7 00:00 UTC WORLD-DESK-TAPE / SPORTS-WATCH — FIFA-WORLD-CUP-2026-ROUND-OF-16-WRAPS — SPAIN-1-0-PORTUGAL (MERINO-90) / USA-BELGIUM-LIVE-IN-SEATTLE / QUARTERFINALS-JULY-9-11 as ${CORE}`, category: 'general', related: '' },
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
