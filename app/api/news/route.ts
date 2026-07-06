import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Shared macro/market/crypto/world tail used across the fallback tape (2026-07-06 12:00 UTC)
const CORE = 'MONDAY-JULY-6 12:00-UTC-PRE-OPEN — US-CASH-MARKETS-REOPEN-IN-~90-MINUTES-AT-13:30-UTC-AFTER-INDEPENDENCE-DAY-WEEKEND / US-EQUITY-FUTURES-GREEN-AND-STEADY-LED-BY-CHIPS-STABILIZING — Q2-2026-BOOKED-AS-STRONGEST-QUARTER-FOR-US-INDEXES-SINCE-2020 / LAST-CASH-PRINT THURSDAY-JULY-2 DOW-RECORD-CLOSE 52,900.07 +594.83 +1.14% (INTRADAY-ATH 52,903.85) / S&P-500 7,483.24 / NASDAQ 25,832.67 -0.8% + MEGACAP-CROWN-RACE APPLE-CLOSES-TO-WITHIN-~4%-OF-OVERTAKING-NVIDIA-AS-WORLDS-MOST-VALUABLE-COMPANY AAPL-~$4.55T-VS-NVDA-~$4.7T / AAPL-+~5%-THURSDAY-ON-EXPANDED-IPHONE-LINEUP-REPORTS / NVDA-STILL-#1-WITH-NO-COMPANY-CATALYST-UNTIL-LATE-AUGUST / TSLA-~$399-AFTER-A--7.5%-WEEK-DESPITE-A-Q2-DELIVERY-BEAT-480,126 + RATE-PATH-WATCH FED-HELD-FUNDS-RATE-3.50%-3.75%-FOR-A-FOURTH-STRAIGHT-MEETING / FED-CHAIR-KEVIN-WARSH-SAYS-INFLATION-STILL-TOO-HIGH / COOLER-THAN-EXPECTED-JUNE-JOBS-DAMPEN-HIKE-ODDS / US-CPI-+4.2%-Y/Y-TO-MAY / WEEK-AHEAD-EYES-JULY-28-29-FOMC + CRYPTO-COHORT-LIVE-MON-JULY-6-12:00-UTC BTC $62,287 -0.48% / ETH $1,757.60 -0.03% / SOL $80.49 +0.02% / XRP $1.1342 +0.35% — GLOBAL-CRYPTO-MCAP-~$2.23T / MILD-RISK-OFF-DRIFT-BTC-EASES-OFF-THE-WEEKEND-HIGH-XRP-THE-RELATIVE-OUTPERFORMER + WORLD VATICAN-SSPX-SCHISM-HARDENS-AFTER-THE-JULY-2-DECREE-EXCOMMUNICATED-BISHOPS-CALL-IT-OBJECTIVELY-UNJUST-AND-INVALID + XI-JINPING-PROMOTES-ZHANG-SHUGUANG-AND-WANG-GANG-TO-FULL-GENERAL-CMC-EFFECTIVELY-DOWN-TO-2-SEATS + VENEZUELA-SHIFTS-FROM-RESCUE-TO-RECONSTRUCTION-AFTER-TWIN-EARTHQUAKES-CARACAS-HOSPITALS-FLAG-MEDICINE-SHORTAGES + POPE-LEO-AMERICA-250-CALL-TO-WELCOME-IMMIGRANTS-ECHOES-PAST-THE-250TH-BIRTHDAY-WEEKEND + FIFA-WORLD-CUP-2026-QUARTERFINAL-BRACKET-LOCKS-IN FRANCE-1-0-PARAGUAY-MBAPPE-TIES-MESSI-ON-7-GOALS / MOROCCO-3-0-CANADA — DOW LAST-CASH-PRINT-RECORD 52,900.07 +1.14% per CNBC / TheStreet.';

// Fallback headlines when API fails or no key (updated 2026-07-06 12:00 UTC)
const FALLBACK_NEWS = [
  { headline: `Monday July 6 12:00 UTC PRE-OPEN-TAPE / US-CASH-MARKETS-REOPEN-IN-~90-MINUTES-AT-13:30-UTC-AFTER-INDEPENDENCE-DAY-WEEKEND — US-EQUITY-FUTURES-GREEN-AND-STEADY-LED-BY-CHIPS-STABILIZING as Q2-2026-STAYS-BOOKED-AS-STRONGEST-QUARTER-FOR-US-INDEXES-SINCE-2020 with ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Monday July 6 12:00 UTC MACRO-TAPE / RATE-PATH-WATCH — FED-HELD-FUNDS-RATE-3.50%-3.75%-FOR-A-FOURTH-STRAIGHT-MEETING / FED-CHAIR-WARSH-SAYS-INFLATION-STILL-TOO-HIGH / COOLER-THAN-EXPECTED-JUNE-JOBS-DAMPEN-HIKE-ODDS / WEEK-AHEAD-EYES-JULY-28-29-FOMC / US-CPI-+4.2%-Y/Y-TO-MAY as ${CORE}`, category: 'general', related: '' },
  { headline: `Monday July 6 12:00 UTC AAPL-FOCUS-TAPE / MEGACAP-CROWN-WATCH — APPLE-CLOSES-TO-WITHIN-~4%-OF-OVERTAKING-NVIDIA-AS-WORLDS-MOST-VALUABLE-COMPANY (AAPL-~$4.55T-VS-NVDA-~$4.7T) / AAPL-+~5%-THURSDAY-ON-EXPANDED-IPHONE-LINEUP-REPORTS the one megacap with a near-term catalyst as ${CORE}`, category: 'general', related: 'AAPL' },
  { headline: `Monday July 6 12:00 UTC NVDA-FOCUS-TAPE / SEMI-DESK-WATCH — NVDA-STILL-#1-AT-~$4.7T-MARKET-CAP but WITH-NO-COMPANY-CATALYST-UNTIL-LATE-AUGUST as APPLE-CLOSES-THE-GAP-TO-~4% into the reopen as ${CORE}`, category: 'general', related: 'NVDA' },
  { headline: `Monday July 6 12:00 UTC TSLA-FOCUS-TAPE / EV-DESK-WATCH — TSLA-~$399-EYED-AT-THE-REOPEN-AFTER-A--7.5%-WEEK-DESPITE-A-Q2-DELIVERY-BEAT-480,126 the standout megacap decliner ahead of JULY-22-EARNINGS as ${CORE}`, category: 'general', related: 'TSLA' },
  { headline: `Monday July 6 12:00 UTC AMD-FOCUS-TAPE / SEMI-DESK-WATCH — AMD-EYED-AT-THE-REOPEN-AS-CHIPS-STABILIZE-IN-FUTURES after the prior selloff even as US-INDEXES-BOOKED-STRONGEST-QUARTER-SINCE-2020 as ${CORE}`, category: 'general', related: 'AMD' },
  { headline: `Monday July 6 12:00 UTC MSFT-FOCUS-TAPE / MAG-7-WATCH — MSFT-CARRIES-THE-Q2-RECORD-QUARTER into the reopen as the MEGACAP-CROWN-RACE narrows to APPLE-VS-NVIDIA at the top of the tape as ${CORE}`, category: 'general', related: 'MSFT' },
  { headline: `Monday July 6 12:00 UTC META-FOCUS-TAPE / MAG-7-WATCH — META-IN-THE-MAG-7-COHORT into the reopen after Q2-2026-BOOKED-AS-STRONGEST-QUARTER-FOR-US-INDEXES-SINCE-2020 as ${CORE}`, category: 'general', related: 'META' },
  { headline: `Monday July 6 12:00 UTC COIN-FOCUS-TAPE / EXCHANGE-DESK-WATCH — COIN-TRACKS-A-SOFTER-CRYPTO-TAPE-INTO-MID-MONDAY with GLOBAL-CRYPTO-MCAP-~$2.23T while BTC-EASES-TO-~$62.3K off the weekend high as ${CORE}`, category: 'general', related: 'COIN' },
  { headline: `Monday July 6 12:00 UTC MSTR-FOCUS-TAPE / TREASURY-DESK-WATCH — MSTR-CARRIES-THE-BITCOIN-TREASURY-ANGLE as BTC-EASES-TO-~$62.3K-INTO-MID-MONDAY in a mild risk-off drift as ${CORE}`, category: 'general', related: 'MSTR' },
  { headline: `Monday July 6 12:00 UTC BTC-FOCUS-TAPE / CRYPTO-DESK-WATCH — BTC $62,287 -0.48%-EASES-OFF-THE-WEEKEND-HIGH holding above $62K as GLOBAL-CRYPTO-MCAP-~$2.23T as ${CORE}`, category: 'general', related: 'BTC' },
  { headline: `Monday July 6 12:00 UTC ETH-FOCUS-TAPE / CRYPTO-DESK-WATCH — ETH $1,757.60 -0.03%-FLAT-WITH-BTC holding near $1,758 into mid-Monday as ${CORE}`, category: 'general', related: 'ETH' },
  { headline: `Monday July 6 12:00 UTC SOL-FOCUS-TAPE / CRYPTO-DESK-WATCH — SOL $80.49 +0.02%-FLAT-INTO-MID-MONDAY holding $80 as the cohort drifts as ${CORE}`, category: 'general', related: 'SOL' },
  { headline: `Monday July 6 12:00 UTC XRP-FOCUS-TAPE / CRYPTO-DESK-WATCH — XRP $1.1342 +0.35%-THE-RELATIVE-OUTPERFORMER holding above $1.13 as the cohort drifts into mid-Monday as ${CORE}`, category: 'general', related: 'XRP' },
  { headline: `Macro Monday July 6 12:00 UTC WORLD-DESK-TAPE / VATICAN-WATCH — VATICAN-SSPX-SCHISM-HARDENS as the EXCOMMUNICATED-BISHOPS-CALL-THE-JULY-2-DECREE-OBJECTIVELY-UNJUST-AND-INVALID defying POPE-LEO-XIV as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Monday July 6 12:00 UTC WORLD-DESK-TAPE / CHINA-WATCH — XI-JINPING-PROMOTES-ZHANG-SHUGUANG-AND-WANG-GANG-TO-FULL-GENERAL leaving the CMC-EFFECTIVELY-DOWN-TO-2-SEATS after purges as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Monday July 6 12:00 UTC WORLD-DESK-TAPE / VENEZUELA-WATCH — VENEZUELA-SHIFTS-FROM-RESCUE-TO-RECONSTRUCTION-AFTER-TWIN-EARTHQUAKES as CARACAS-HOSPITALS-FLAG-MEDICINE-SHORTAGES with reconstruction pegged at 4-5-YEARS as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Monday July 6 12:00 UTC WORLD-DESK-TAPE / AMERICA-250-WATCH — POPE-LEO-AMERICA-250-CALL-TO-WELCOME-IMMIGRANTS echoes past the nation's 250TH-BIRTHDAY-WEEKEND as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Monday July 6 12:00 UTC WORLD-DESK-TAPE / SPORTS-WATCH — FIFA-WORLD-CUP-2026-QUARTERFINAL-BRACKET-LOCKS-IN — FRANCE-1-0-PARAGUAY (MBAPPE-TIES-MESSI-ON-7-GOALS) / MOROCCO-3-0-CANADA-REACH-QF as ${CORE}`, category: 'general', related: '' },
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
