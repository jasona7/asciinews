import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Shared macro/market/crypto/world tail used across the fallback tape (2026-07-09 12:00 UTC)
const CORE = 'THURSDAY-JULY-9 12:00-UTC-PRE-BELL — US-CASH-REOPENS-TODAY-13:30-UTC-AFTER-WEDNESDAYS-IRAN-DRIVEN-SELLOFF / WEDNESDAY-JULY-8-CASH-CLOSE DOW 52,348.39 -576.76 -1.09% (WORST-DAY-IN-4-WEEKS) / S&P-500 7,482.71 -21.14 -0.28% / NASDAQ 25,870.65 +51.96 +0.20% / RECORD-DOW-CLOSE-STILL-MONDAY-JULY-6 53,055.91 (FIRST-EVER-ABOVE-53,000) + OVERNIGHT IRAN-FIRES-BACK-AT-US-TARGETS-IN-BAHRAIN-KUWAIT-AND-QATAR-AFTER-THE-US-STRUCK-~90-SITES-ACROSS-IRAN / ASIA-MIXED NIKKEI +1.6%-TO-67,849.98-ON-CHIP-STRENGTH / HANG-SENG -0.7%-TO-24,030.18 / BRENT-~$78.21-AFTER-WEDNESDAYS-~+5%-SURGE / GOLD-TICKS-HIGHER / DOLLAR-STANDS-TALL-ON-FED-HIKE-BETS + MEGACAP-CROWN-RACE NVIDIA-STILL-#1-AT-~$4.74T / APPLE-~$4.59T-CLOSING-FAST-AND-POISED-TO-RECLAIM-THE-CROWN / ALPHABET-#3 + RATE-PATH-WATCH FED-HELD-FUNDS-RATE-3.50%-3.75%-AT-THE-JUNE-16-17-FOMC / FED-CHAIR-KEVIN-WARSH-SAYS-INFLATION-STILL-TOO-HIGH / MARKETS-PRICE-A-POSSIBLE-SEPTEMBER-HIKE-NOT-A-CUT / NEXT-FOMC-JULY-28-29 / JUNE-CPI-DUE-JULY-14 + CRYPTO-COHORT-LIVE-THU-JULY-9-12:00-UTC BTC $62,776.16 +0.88% / ETH $1,743.56 -0.16% / SOL $77.62 +0.21% / XRP $1.0931 +0.66% — GLOBAL-CRYPTO-MCAP-~$2.24T-+0.72%-24H / BTC-DOMINANCE-56.1% / FEAR-&-GREED-22-EXTREME-FEAR-EVEN-AS-THE-COHORT-STEADIES + WORLD IRAN-BURIES-ITS-SLAIN-SUPREME-LEADER-TODAY-IN-THE-CULMINATION-OF-A-MASS-FUNERAL + STRAIT-OF-HORMUZ-THREE-TANKERS-ATTACKED-AL-REKAYYAT-WEDYAN-AND-CYPRUS-PROSPERITY-AS-TEHRAN-SAYS-THE-STRAIT-REOPENS-ONLY-UNDER-IRANIAN-ARRANGEMENTS + NATO-ANKARA-SUMMIT-TRUMP-ORDERS-A-HALT-TO-ALL-US-TRADE-WITH-SPAIN-AND-RENEWS-HIS-GREENLAND-DEMAND-WHILE-RUTTE-SAYS-THE-ALLIANCE-IS-REUNITED + IMF-CUTS-2026-GLOBAL-GROWTH-TO-3.0%-FROM-3.1%-AND-SEES-A-3.4%-REBOUND-IN-2027 + UKRAINE-RUSSIA-FIRED-169-DRONES-AND-7-MISSILES-KILLING-4-AND-HITTING-KYIV-A-SECOND-STRAIGHT-DAY-AS-KYIV-STRUCK-SARATOV-AND-TATARSTAN-REFINERIES + FIFA-WORLD-CUP-2026-QUARTERFINALS-JULY-9-11 FRANCE-VS-MOROCCO-TODAY-20:00-UTC-BOSTON / SPAIN-VS-BELGIUM-FRI / ENGLAND-VS-NORWAY-SAT / ARGENTINA-VS-SWITZERLAND-SAT — DOW WEDNESDAY-CASH-CLOSE 52,348.39 -1.09% per Reuters / AP.';

// Fallback headlines when API fails or no key (updated 2026-07-09 12:00 UTC)
const FALLBACK_NEWS = [
  { headline: `Thursday July 9 12:00 UTC PRE-BELL-TAPE / US-CASH-REOPENS-TODAY-13:30-UTC — WEDNESDAY-CLOSED-IN-AN-IRAN-DRIVEN-SELLOFF DOW 52,348.39 -576.76 -1.09%-ITS-WORST-DAY-IN-4-WEEKS / S&P-500 7,482.71 -21.14 -0.28% / NASDAQ 25,870.65 +51.96 +0.20%-CLOSING-GREEN-EVEN-AS-CHIPS-SOLD-OFF and OVERNIGHT-IRAN-FIRED-BACK-AT-US-TARGETS-IN-BAHRAIN-KUWAIT-AND-QATAR while ASIA-CLOSED-MIXED-AND-BRENT-HELD-~$78 with ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Thursday July 9 12:00 UTC MACRO-TAPE / RATE-PATH-WATCH — THE-DOLLAR-STANDS-TALL-AND-FED-HIKE-BETS-BUILD as the NEW-GULF-ATTACKS-FUEL-AN-OIL-PRICE-SURGE with the FED-HOLDING-3.50%-3.75%-SINCE-THE-JUNE-16-17-FOMC / CHAIR-KEVIN-WARSH-SAYS-INFLATION-IS-STILL-TOO-HIGH / NEXT-FOMC-JULY-28-29 / JUNE-CPI-DUE-JULY-14 — the BANK-OF-JAPAN-ALSO-SEES-GROWING-INFLATION-PRESSURE-FROM-THE-IRAN-WAR as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Thursday July 9 12:00 UTC ENERGY-DESK-TAPE / OIL-SHOCK-WATCH — BRENT-HOLDS-~$78.21-AFTER-WEDNESDAYS-~+5%-SURGE with prices CHOPPY-OVERNIGHT as markets weigh the US-STRIKES-ON-IRAN-AND-TEHRANS-RETALIATION — THREE-TANKERS-AL-REKAYYAT-WEDYAN-AND-CYPRUS-PROSPERITY-WERE-ATTACKED-IN-HORMUZ and TEHRAN-SAYS-THE-STRAIT-REOPENS-ONLY-UNDER-IRANIAN-ARRANGEMENTS while GOLD-TICKS-HIGHER as ${CORE}`, category: 'general', related: '' },
  { headline: `Thursday July 9 12:00 UTC AAPL-FOCUS-TAPE / SUPPLY-DESK-WATCH — APPLE-SIGNS-A-$30B-BROADCOM-DEAL-TO-BOOST-US-CHIP-PRODUCTION as it closes to ~$4.59T-JUST-BEHIND-NVIDIA-AND-POISED-TO-RECLAIM-THE-MOST-VALUABLE-COMPANY-CROWN ahead of Q3-EARNINGS-JULY-30 — INDIA-ALSO-REMOVED-IMPORT-DUTIES-ON-SOME-SMARTPHONE-PARTS as ${CORE}`, category: 'general', related: 'AAPL' },
  { headline: `Thursday July 9 12:00 UTC NVDA-FOCUS-TAPE / SEMI-DESK-WATCH — NVIDIA-CLINGS-TO-#1-AT-~$4.74T-WITH-APPLE-~$4.59T-CLOSING-THE-GAP as CEREBRAS-TARGETS-EUROPE-WITH-A-MULTIBILLION-DOLLAR-AI-EXPANSION-CHALLENGING-NVIDIA and REUTERS-CALLS-THE-TAPE-CHIP-EUPHORIA-VIES-WITH-WAR-WEARINESS as ${CORE}`, category: 'general', related: 'NVDA' },
  { headline: `Thursday July 9 12:00 UTC TSLA-FOCUS-TAPE / EV-DESK-WATCH — TESLA-STOCK-GETS-A-SURPRISING-SPACEX-RESET after a RECORD-Q2-DELIVERY-BEAT-480,126-+25%-Y/Y-+34%-Q/Q ahead of JULY-22-EARNINGS as ${CORE}`, category: 'general', related: 'TSLA' },
  { headline: `Thursday July 9 12:00 UTC AMD-FOCUS-TAPE / SEMI-DESK-WATCH — AMD-SETS-ITS-FISCAL-Q2-2026-EARNINGS-DATE after NVIDIA-MICRON-AND-AMD-LED-A-CHIP-STOCK-SELLOFF on the IRAN-TRUCE-COLLAPSE while CATHIE-WOOD-SOLD-$8M-OF-AMD-STOCK-IN-A-SINGLE-DAY as ${CORE}`, category: 'general', related: 'AMD' },
  { headline: `Thursday July 9 12:00 UTC MSFT-FOCUS-TAPE / MAG-7-WATCH — MICROSOFT-IS-DOWNSIZING-ITS-XBOX-UNIT-WITH-~1,600-ROLES-CUT-OF-~4,800-COMPANYWIDE as the CONSOLE-BUSINESS-SHIFTS and PLAYSTATION-SAYS-IT-WILL-STOP-MAKING-PHYSICAL-GAMES as ${CORE}`, category: 'general', related: 'MSFT' },
  { headline: `Thursday July 9 12:00 UTC META-FOCUS-TAPE / AI-CAPEX-WATCH — META-AND-CAPITAL-POWER-SEAL-A-250MW-ENERGY-SUPPLY-AGREEMENT to feed the AI-DATA-CENTER-BUILDOUT as ${CORE}`, category: 'general', related: 'META' },
  { headline: `Thursday July 9 12:00 UTC AMZN-FOCUS-TAPE / AI-DESK-WATCH — ANTHROPICS-IPO-IS-SEEN-DELIVERING-WINDFALL-PROFITS-TO-ITS-EARLY-INVESTORS with AMAZON-AMONG-THE-BACKERS-IN-FOCUS as ${CORE}`, category: 'general', related: 'AMZN' },
  { headline: `Thursday July 9 12:00 UTC GOOGL-FOCUS-TAPE / MAG-7-WATCH — ALPHABET-HOLDS-THE-#3-MEGACAP-SLOT-BEHIND-NVIDIA-AND-APPLE as ANTHROPICS-IPO-PUTS-ITS-EARLY-INVESTORS-IN-LINE-FOR-WINDFALL-PROFITS as ${CORE}`, category: 'general', related: 'GOOGL' },
  { headline: `Thursday July 9 12:00 UTC NFLX-FOCUS-TAPE / STREAMING-DESK-WATCH — NETFLIX-IS-ADDING-LIFESTYLE-CONTENT-TO-WIN-VIEWERS-ATTENTION as the FIFA-WORLD-CUP-2026-QUARTERFINALS-OPEN-TODAY as ${CORE}`, category: 'general', related: 'NFLX' },
  { headline: `Thursday July 9 12:00 UTC COIN-FOCUS-TAPE / EXCHANGE-DESK-WATCH — UK-AUTHORIZATION-STRENGTHENS-COINBASES-GLOBAL-GROWTH-STRATEGY as CRYPTO-REMAINS-RESILIENT-IN-THE-FACE-OF-RENEWED-MIDDLE-EAST-TENSIONS and PARADIGM-RAISES-A-$1.2B-FUND as ${CORE}`, category: 'general', related: 'COIN' },
  { headline: `Thursday July 9 12:00 UTC MSTR-FOCUS-TAPE / TREASURY-DESK-WATCH — STRATEGY-MSTR-SOLD-3,588-BTC-FOR-~$216M cutting holdings to 843,775-BTC as BTC-STEADIES-BACK-ABOVE-$62.7K as ${CORE}`, category: 'general', related: 'MSTR' },
  { headline: `Thursday July 9 12:00 UTC BTC-FOCUS-TAPE / CRYPTO-DESK-WATCH — BTC $62,776.16 +0.88%-STEADIES-BACK-ABOVE-$62.7K after Wednesdays slide as CRYPTO-PROVES-RESILIENT-TO-RENEWED-MIDDLE-EAST-TENSIONS — FEAR-&-GREED-STILL-READS-22-EXTREME-FEAR with GLOBAL-CRYPTO-MCAP-~$2.24T-+0.72%-24H and BTC-DOMINANCE-56.1% as ${CORE}`, category: 'general', related: 'BTC' },
  { headline: `Thursday July 9 12:00 UTC ETH-FOCUS-TAPE / CRYPTO-DESK-WATCH — ETH $1,743.56 -0.16%-HOLDS-FLAT-NEAR-$1,745 lagging the cohort bounce as SWIFT-ROLLS-OUT-A-BLOCKCHAIN-LEDGER-BRINGING-24/7-BANKING-TO-17-GLOBAL-GIANTS as ${CORE}`, category: 'general', related: 'ETH' },
  { headline: `Thursday July 9 12:00 UTC SOL-FOCUS-TAPE / CRYPTO-DESK-WATCH — SOL $77.62 +0.21%-CLAWS-BACK-TOWARD-$78 as LATIN-AMERICAS-BIGGEST-STOCK-EXCHANGE-LISTS-OPTIONS-ON-BITCOIN-ETHER-AND-SOLANA-FUTURES as ${CORE}`, category: 'general', related: 'SOL' },
  { headline: `Thursday July 9 12:00 UTC XRP-FOCUS-TAPE / CRYPTO-DESK-WATCH — XRP $1.0931 +0.66%-RECLAIMS-$1.09 leading the majors off the overnight lows as ${CORE}`, category: 'general', related: 'XRP' },
  { headline: `Macro Thursday July 9 12:00 UTC WORLD-DESK-TAPE / IRAN-WATCH — IRAN-SAYS-IT-HIT-US-MILITARY-TARGETS-IN-THE-GULF-FIRING-AT-BAHRAIN-KUWAIT-AND-QATAR after the US-STRUCK-~90-TARGETS-ACROSS-IRAN-INCLUDING-CHABAHAR-PORT-AND-BUSHEHR — TRUMP-DECLARED-THE-INTERIM-ACCORD-OVER-BUT-GREEN-LIT-CONTINUED-TALKS-WHILE-WARNING-OF-EVEN-STRONGER-ACTION as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Thursday July 9 12:00 UTC WORLD-DESK-TAPE / IRAN-WATCH — IRAN-BURIES-ITS-SLAIN-SUPREME-LEADER-TODAY-IN-THE-CULMINATION-OF-A-MASS-FUNERAL months after KHAMENEI-WAS-KILLED-IN-FEBRUARY-AIRSTRIKES as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Thursday July 9 12:00 UTC WORLD-DESK-TAPE / NATO-WATCH — AT-THE-ANKARA-SUMMIT-TRUMP-ORDERS-A-HALT-TO-ALL-US-TRADE-WITH-SPAIN over NATO-SPENDING-AND-IRAN and RENEWS-HIS-DEMAND-THAT-THE-US-TAKE-OVER-GREENLAND while SECRETARY-GENERAL-RUTTE-SAYS-THE-ALLIANCE-IS-REUNITED as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Thursday July 9 12:00 UTC WORLD-DESK-TAPE / GROWTH-WATCH — THE-IMF-LOWERS-ITS-2026-GLOBAL-GROWTH-FORECAST-TO-3.0%-FROM-3.1% citing MIDDLE-EAST-ENERGY-DISRUPTION and sees a REBOUND-TO-3.4%-IN-2027 while REUTERS-WARNS-THE-NEXT-GULF-CONFLICT-COULD-TRIGGER-A-FOOD-CRISIS as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Thursday July 9 12:00 UTC WORLD-DESK-TAPE / UKRAINE-WATCH — RUSSIA-FIRED-169-DRONES-AND-7-MISSILES-KILLING-4-ACROSS-UKRAINE-AND-STRIKING-KYIV-A-SECOND-STRAIGHT-DAY as UKRAINE-HIT-OIL-REFINERIES-IN-SARATOV-AND-TATARSTAN as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Thursday July 9 12:00 UTC WORLD-DESK-TAPE / SPORTS-WATCH — FIFA-WORLD-CUP-2026-QUARTERFINALS-BEGIN-TODAY FRANCE-VS-MOROCCO-KICKS-OFF-20:00-UTC-IN-BOSTON / SPAIN-VS-BELGIUM-FRI / ENGLAND-VS-NORWAY-SAT / ARGENTINA-VS-SWITZERLAND-SAT as ${CORE}`, category: 'general', related: '' },
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
