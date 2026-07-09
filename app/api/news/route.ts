import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Shared macro/market/crypto/world tail used across the fallback tape (2026-07-09 00:00 UTC)
const CORE = 'THURSDAY-JULY-9 00:00-UTC-OVERNIGHT — US-CASH-CLOSED-FOR-WEDNESDAY-JULY-8-REOPENS-THURSDAY-13:30-UTC / WEDNESDAY-ENDED-MIXED-IN-AN-IRAN-WAR-RISK-OFF AFTER-TRUMP-DECLARED-THE-INTERIM-IRAN-ACCORD-OVER-AND-THE-US-LAUNCHED-FRESH-STRIKES / WEDNESDAY-JULY-8-CASH-CLOSE DOW 52,348.39 -576.76 -1.09% (WORST-DAY-IN-4-WEEKS) / S&P-500 7,482.71 -21.14 -0.28% / NASDAQ 25,870.65 +51.96 +0.20% — THE-NASDAQ-CLOSED-GREEN-EVEN-AS-NVIDIA-MICRON-AND-AMD-LED-A-CHIP-SELLOFF / BRENT-CRUDE-JUMPED-+5.43%-TO-~$78.19 / RECORD-CLOSE-STILL-MONDAY-JULY-6 DOW 53,055.91 (FIRST-EVER-ABOVE-53,000) + MEGACAP-CROWN-RACE NVIDIA-STILL-#1-AT-~$4.94T / APPLE-~$4.60T / ALPHABET-~$4.38T / MICROSOFT-~$2.85T + RATE-PATH-WATCH FED-HELD-FUNDS-RATE-3.50%-3.75%-AT-THE-JUNE-16-17-FOMC / FED-CHAIR-KEVIN-WARSH-SAYS-INFLATION-STILL-TOO-HIGH / FOMC-MINUTES-SHOW-A-FAMILY-FIGHT-OVER-RATES / MARKETS-NOW-PRICE-A-POSSIBLE-SEPTEMBER-HIKE-NOT-A-CUT / NEXT-FOMC-JULY-28-29 / JUNE-CPI-DUE-JULY-14 + CRYPTO-COHORT-LIVE-THU-JULY-9-00:00-UTC BTC $62,252.95 -1.71% / ETH $1,742.71 -1.62% / SOL $77.77 -3.52% / XRP $1.0907 -1.91% — GLOBAL-CRYPTO-MCAP-~$2.25T / RISK-OFF-COHORT-RED-ACROSS-THE-BOARD-FEAR-&-GREED-20-EXTREME-FEAR + WORLD IRAN-CEASEFIRE-COLLAPSE-CENTCOM-SAYS-80+-TARGETS-STRUCK-AS-TRUMP-CALLS-THE-ACCORD-OVER + STRAIT-OF-HORMUZ-DISRUPTED-WAR-INSURERS-ADVISE-SHIPOWNERS-TO-PAUSE-VOYAGES-AND-A-QATARI-LNG-TANKER-AWAITS-SALVAGE-OFF-OMAN + KHAMENEIS-FUNERAL-PROCESSION-CROSSES-INTO-IRAQ-MONTHS-AFTER-HE-WAS-KILLED-IN-FEBRUARY + NATO-ANKARA-SUMMIT-TRUMP-ORDERS-A-HALT-TO-ALL-US-TRADE-WITH-SPAIN-AND-RENEWS-HIS-GREENLAND-DEMAND-WHILE-RUTTE-SAYS-THE-ALLIANCE-IS-REUNITED + IMF-CUTS-2026-GLOBAL-GROWTH-TO-3.0%-FROM-3.1%-AND-SEES-A-3.4%-REBOUND-IN-2027 + UKRAINE-RUSSIAN-BARRAGE-ON-KYIV-68-MISSILES-351-DRONES-~19-KILLED-IN-KYIV-PLUS-8-IN-THE-REGION + FIFA-WORLD-CUP-2026-QUARTERFINALS-JULY-9-11 FRANCE-VS-MOROCCO-THU-20:00-GMT-BOSTON / SPAIN-VS-BELGIUM-FRI / ENGLAND-VS-NORWAY-SAT / ARGENTINA-VS-SWITZERLAND-SAT — BELGIUM-AND-NORWAY-BOTH-ADVANCED-FROM-THE-ROUND-OF-16 — DOW WEDNESDAY-CASH-CLOSE 52,348.39 -1.09% per Reuters / Motley Fool.';

// Fallback headlines when API fails or no key (updated 2026-07-09 00:00 UTC)
const FALLBACK_NEWS = [
  { headline: `Thursday July 9 00:00 UTC OVERNIGHT-TAPE / US-CASH-CLOSED-FOR-WEDNESDAY-REOPENS-THURSDAY-13:30-UTC — WEDNESDAY-ENDED-MIXED-IN-AN-IRAN-WAR-RISK-OFF DOW 52,348.39 -576.76 -1.09%-ITS-WORST-DAY-IN-4-WEEKS / S&P-500 7,482.71 -21.14 -0.28% / NASDAQ 25,870.65 +51.96 +0.20%-CLOSING-GREEN-EVEN-AS-CHIPS-SOLD-OFF after TRUMP-DECLARED-THE-INTERIM-IRAN-ACCORD-OVER-AND-THE-US-LAUNCHED-FRESH-STRIKES with ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Thursday July 9 00:00 UTC MACRO-TAPE / RATE-PATH-WATCH — FED-HELD-FUNDS-RATE-3.50%-3.75%-AT-THE-JUNE-16-17-FOMC / FED-CHAIR-WARSH-SAYS-INFLATION-STILL-TOO-HIGH / FOMC-MINUTES-SHOW-A-FAMILY-FIGHT-OVER-RATES-THAT-COULD-DRAG-ON / MARKETS-NOW-PRICE-A-POSSIBLE-SEPTEMBER-HIKE-NOT-A-CUT / NEXT-FOMC-JULY-28-29 / JUNE-CPI-DUE-JULY-14 as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Thursday July 9 00:00 UTC ENERGY-DESK-TAPE / OIL-SHOCK-WATCH — BRENT-CRUDE-JUMPED-+5.43%-TO-~$78.19 as the US-LAUNCHED-FRESH-STRIKES-ON-IRAN with WAR-INSURERS-ADVISING-SHIPOWNERS-TO-PAUSE-HORMUZ-VOYAGES / FOUR-TANKERS-TURNED-BACK-FROM-THE-STRAIT / A-QATARI-LNG-TANKER-AWAITS-SALVAGE-OFF-OMAN — investors call it an INFLATION-WAKE-UP-CALL as ${CORE}`, category: 'general', related: '' },
  { headline: `Thursday July 9 00:00 UTC AAPL-FOCUS-TAPE / SUPPLY-DESK-WATCH — APPLE-TO-SPEND-$30B-ON-US-MADE-CHIPS-FROM-BROADCOM extending the custom-silicon deal THROUGH-2031 and expanding a COLORADO-FACTORY as it holds ~$4.60T-THE-NEAREST-CHALLENGER-TO-NVIDIA ahead of Q3-EARNINGS-JULY-30 as ${CORE}`, category: 'general', related: 'AAPL' },
  { headline: `Thursday July 9 00:00 UTC NVDA-FOCUS-TAPE / SEMI-DESK-WATCH — NVIDIAS-VALUATION-JUST-HIT-A-MULTIYEAR-LOW-EVEN-AS-REVENUE-SETS-RECORDS with its FORWARD-P/E-THE-LOWEST-SINCE-2019 as it LED-A-CHIP-SELLOFF-WITH-MICRON-AND-AMD on the IRAN-TRUCE-COLLAPSE while still holding #1-AT-~$4.94T as ${CORE}`, category: 'general', related: 'NVDA' },
  { headline: `Thursday July 9 00:00 UTC TSLA-FOCUS-TAPE / EV-DESK-WATCH — TSLA-STOCK-SANK-7%-DESPITE-A-RECORD-Q2-DELIVERY-BEAT-480,126-+25%-Y/Y-+34%-Q/Q as the AI-CHIEF-CONFIRMED-VOICE-COMMANDS-FOR-FSD-ARE-IN-THE-WORKS ahead of JULY-22-EARNINGS as ${CORE}`, category: 'general', related: 'TSLA' },
  { headline: `Thursday July 9 00:00 UTC AMD-FOCUS-TAPE / SEMI-DESK-WATCH — NVIDIA-MICRON-AND-AMD-LED-A-CHIP-STOCK-SELLOFF after TRUMP-SAID-THE-US-IRAN-TRUCE-IS-OVER with AMD-SETTING-ITS-FISCAL-Q2-2026-EARNINGS-DATE as ${CORE}`, category: 'general', related: 'AMD' },
  { headline: `Thursday July 9 00:00 UTC MSFT-FOCUS-TAPE / MAG-7-WATCH — MICROSOFT-IS-DOWNSIZING-ITS-XBOX-UNIT following the MICROSOFT-FRONTIER-AI-DEPLOYMENT-UNIT-LAUNCH ($2.5B-6,000-STAFF) and ~4,800-JOB-CUTS as it sits ~$2.85T-IN-THE-THIRD-MEGACAP-TIER as ${CORE}`, category: 'general', related: 'MSFT' },
  { headline: `Thursday July 9 00:00 UTC META-FOCUS-TAPE / AI-CAPEX-WATCH — META-TO-BUILD-A-C$13B-1-GIGAWATT-ALBERTA-DATA-CENTER-ITS-FIRST-IN-CANADA weeks after LAYING-OFF-~8,000-~10%-IN-AN-AI-RESTRUCTURING as BIG-TECH-2026-CAPEX-RUNS-~$725B-+77%-Y/Y as ${CORE}`, category: 'general', related: 'META' },
  { headline: `Thursday July 9 00:00 UTC AMZN-FOCUS-TAPE / CREDIT-DESK-WATCH — AMAZONS-$25B-SURPRISE-BOND-SALE-DANGLED-EXTRA-YIELD-TO-LURE-BUYERS in what reporters call a WARNING-SIGN-ABOUT-THE-AI-BOOM as ${CORE}`, category: 'general', related: 'AMZN' },
  { headline: `Thursday July 9 00:00 UTC GOOGL-FOCUS-TAPE / MAG-7-WATCH — GOOGLE-BANS-PREDICTION-MARKET-TRANSACTIONS-AMID-BACKLASH as ALPHABET-HOLDS-~$4.38T-CROWDING-THE-MEGACAP-PODIUM as ${CORE}`, category: 'general', related: 'GOOGL' },
  { headline: `Thursday July 9 00:00 UTC NFLX-FOCUS-TAPE / STREAMING-DESK-WATCH — NETFLIX-DISNEY-AND-YOUTUBE-EYE-WORLD-CUP-RIGHTS as the FIFA-WORLD-CUP-2026-QUARTERFINALS-OPEN-JULY-9 as ${CORE}`, category: 'general', related: 'NFLX' },
  { headline: `Thursday July 9 00:00 UTC COIN-FOCUS-TAPE / EXCHANGE-DESK-WATCH — UK-AUTHORIZATION-STRENGTHENS-COINBASES-GLOBAL-GROWTH-STRATEGY even as the COHORT-TURNED-RISK-OFF and the COINBASE-PREMIUM-HIT-RECORD-LOWS as ${CORE}`, category: 'general', related: 'COIN' },
  { headline: `Thursday July 9 00:00 UTC MSTR-FOCUS-TAPE / TREASURY-DESK-WATCH — STRATEGY-MSTR-SOLD-3,588-BTC-FOR-~$216M cutting holdings to 843,775-BTC as LYN-ALDEN-SAYS-BITCOIN-NEEDS-NO-SAVIOR and JPMORGAN-WARNS-OF-AVOIDABLE-TWO-WAY-RISK as ${CORE}`, category: 'general', related: 'MSTR' },
  { headline: `Thursday July 9 00:00 UTC BTC-FOCUS-TAPE / CRYPTO-DESK-WATCH — BTC $62,252.95 -1.71%-TUMBLES-TOWARD-KEY-$60K-SUPPORT on an OIL-PRICE-SURGE-JAPAN-CONTAGION-RISK-AND-FRESH-STRATEGY-SELLING as FEAR-&-GREED-READS-20-EXTREME-FEAR with GLOBAL-CRYPTO-MCAP-~$2.25T as ${CORE}`, category: 'general', related: 'BTC' },
  { headline: `Thursday July 9 00:00 UTC ETH-FOCUS-TAPE / CRYPTO-DESK-WATCH — ETH $1,742.71 -1.62%-SLIDES-FURTHER-BELOW-$1,800 as FED-WARY-FUTURES-TRADERS-CUT-RISK into the Thursday overnight as ${CORE}`, category: 'general', related: 'ETH' },
  { headline: `Thursday July 9 00:00 UTC SOL-FOCUS-TAPE / CRYPTO-DESK-WATCH — SOL $77.77 -3.52%-LEADS-THE-COHORT-LOWER losing $80 in the IRAN-DRIVEN-RISK-OFF-TURN as ${CORE}`, category: 'general', related: 'SOL' },
  { headline: `Thursday July 9 00:00 UTC XRP-FOCUS-TAPE / CRYPTO-DESK-WATCH — XRP $1.0907 -1.91%-SLIPS-BELOW-$1.10 as the majors turn RED-ACROSS-THE-BOARD into Thursday as ${CORE}`, category: 'general', related: 'XRP' },
  { headline: `Macro Thursday July 9 00:00 UTC WORLD-DESK-TAPE / IRAN-WATCH — TRUMP-SAYS-THE-INTERIM-ACCORD-TO-END-THE-WAR-IS-OVER as CENTCOM-SAYS-THE-US-STRUCK-80+-TARGETS-IN-IRAN in response to ATTACKS-ON-COMMERCIAL-VESSELS-IN-THE-STRAIT-OF-HORMUZ with FRESH-STRIKES-UNDERWAY as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Thursday July 9 00:00 UTC WORLD-DESK-TAPE / IRAN-WATCH — THOUSANDS-MARCH-AS-KHAMENEIS-FUNERAL-PROCESSION-CROSSES-INTO-IRAQ months after the SUPREME-LEADER-WAS-KILLED-IN-FEBRUARY-AIRSTRIKES with IRAN-EXPECTING-15-20M-MOURNERS as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Thursday July 9 00:00 UTC WORLD-DESK-TAPE / NATO-WATCH — AT-THE-ANKARA-SUMMIT-TRUMP-ORDERS-A-HALT-TO-ALL-US-TRADE-WITH-SPAIN over NATO-SPENDING-AND-IRAN and RENEWS-HIS-DEMAND-THAT-THE-US-TAKE-OVER-GREENLAND while SECRETARY-GENERAL-RUTTE-SAYS-THE-ALLIANCE-IS-REUNITED as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Thursday July 9 00:00 UTC WORLD-DESK-TAPE / GROWTH-WATCH — THE-IMF-LOWERS-ITS-2026-GLOBAL-GROWTH-FORECAST-TO-3.0%-FROM-3.1% citing MIDDLE-EAST-ENERGY-DISRUPTION and sees a REBOUND-TO-3.4%-IN-2027 with the US-AT-+2.3%-AND-EUROPE-AT-+0.9% as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Thursday July 9 00:00 UTC WORLD-DESK-TAPE / UKRAINE-WATCH — RUSSIAN-BARRAGE-ON-KYIV-68-MISSILES-351-DRONES-~19-KILLED-IN-KYIV-PLUS-8-IN-THE-REGION as CZECHIA-OPTS-OUT-OF-THE-EUROPEAN-70B-EURO-UKRAINE-PACKAGE as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Thursday July 9 00:00 UTC WORLD-DESK-TAPE / SPORTS-WATCH — FIFA-WORLD-CUP-2026-QUARTERFINALS-BEGIN-TODAY FRANCE-VS-MOROCCO-THU-20:00-GMT-IN-BOSTON / SPAIN-VS-BELGIUM-FRI / ENGLAND-VS-NORWAY-SAT / ARGENTINA-VS-SWITZERLAND-SAT after BELGIUM-AND-NORWAY-BOTH-ADVANCED-FROM-THE-ROUND-OF-16 as ${CORE}`, category: 'general', related: '' },
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
      `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_API_KEY}`,
      { cache: 'no-store' }
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
    // Fetch general news, crypto news, and company-specific news in parallel.
    // `cache: 'no-store'` on every outbound call — see fetchQuote in ../crypto/route.ts:
    // Next's Data Cache otherwise pins these responses with a 1-year revalidate.
    // The 5-minute in-memory cache above is the only caching layer we want.
    const [generalResponse, cryptoResponse, ...companyNews] = await Promise.all([
      fetch(
        `https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`,
        { cache: 'no-store' }
      ),
      fetch(
        `https://finnhub.io/api/v1/news?category=crypto&token=${FINNHUB_API_KEY}`,
        { cache: 'no-store' }
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
