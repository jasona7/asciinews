import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Shared macro/market/crypto/world tail used across the fallback tape (2026-07-05 00:00 UTC)
const CORE = 'SUNDAY-JULY-5 US-MARKETS-STILL-CLOSED-WEEKEND (CLOSED-ALL-DAY-FRIDAY-JULY-3-FULL-HOLIDAY + WEEKEND) / REOPEN-MON-JULY-6 — LAST-PRINT THURSDAY-JULY-2 DOW-RECORD-CLOSE 52,900.07 +594.83 +1.14% / S&P-500 7,483.24 FLAT / NASDAQ 25,832.67 -0.8%-SEMI-DRAG + WEAK-JUNE-PAYROLLS-+57K-VS-~115K-EXP / UNEMPLOYMENT-4.2%-REVIVE-RATE-CUT-HOPES + FED-CHAIR-KEVIN-WARSH-SIGNALS-INFLATION-RISKS-EASED (FIRST-DOVISH-TILT-SINCE-HAWKISH-JUNE-FOMC-THAT-SCRAPPED-GUIDANCE / 9-OF-18-HAD-PENCILED-2026-HIKE) + AI-CHIP-VALUATION-WOBBLE MICRON--13%-~$138B-ERASED-ONE-SESSION / SK-HYNIX-SLOWS-HBM-EXPANSION even as HBM-MEMORY-SHORTAGE-DEEPENS-RELIEF-NOT-UNTIL-2027 + OPENAI-MICROSOFT-PROJECT-STARGATE / OPENAI-TO-TAKE-UP-TO-10%-AMD-STAKE-TO-SECURE-GPUS + ARM -7% CEO-RENE-HAAS-SMARTPHONE-UNIT-GROWTH-NEGATIVE + INTC-+10%-APPLE-EARLY-TALKS-US-CHIPMAKING-VIA-INTEL-SAMSUNG + TSLA-RECORD-Q2-DELIVERIES-480,126 / MIAMI-ROBOTAXI-LAUNCH + COIN-LAUNCHES-24/7-STOCK-PERPETUAL-FUTURES-10X-MAG-7-NON-US + CRYPTO-ETF-NARRATIVE-FLIPS BTC-ETFs-+$221.7M-THU-JULY-2-LARGEST-IN-2-MONTHS / END-10-DAY-OUTFLOW-STREAK / NOW-5-STRAIGHT-DAYS-INFLOWS / BLACKROCK-STAKED-ETH-FUND-$100M-DAY-ONE though YTD-NET-STILL-~-$5.4B-NEGATIVE + CITI-STILL-CUTS-BTC-$112K-TO-$82K / ETH-$3,175-TO-$2,240 + CRYPTO-COHORT-LIVE-SUN-JULY-5-00:00-UTC BTC $63,062 +0.74% / ETH $1,777 +1.04% / SOL $81.58 -0.98% / XRP $1.16 +1.85% SOL-THE-LONE-RED even as BTC-CREEPS-BACK-TOWARD-$63K + IRAN-2026-CEASEFIRE-STRAINED IRAN-REFUSES-TO-MEET-US-ENVOYS / OIL-TICKS-UP / BRENT-FIRMER-~$73-OFF-PRE-WAR-$70.65 + VATICAN-JULY-2-DECLARES-SSPX-IN-SCHISM-AFTER-JULY-1-ECONE-CONSECRATIONS-DEFY-POPE-LEO-XIV + FIFA-WORLD-CUP-2026-R16-RESULTS FRANCE-1-0-PARAGUAY-PHILADELPHIA / MOROCCO-3-0-CANADA-HOUSTON (CANADA-OUT / MOROCCO-VS-FRANCE-QF) + SUNDAY-JULY-5-R16 BRAZIL-VS-NORWAY-METLIFE / MEXICO-VS-ENGLAND-ESTADIO-AZTECA + US-JULY-4-AFTERMATH HEAT-DOME-260M+-EXPOSED / 300+-RECORDS / PHILADELPHIA-CANCELED-JULY-4-PARADE / ONE-OF-HOTTEST-JULY-4THS-ON-RECORD — DOW RECORD-CLOSE 52,900.07 +1.14% per CNBC / TheStreet.';

// Fallback headlines when API fails or no key (updated 2026-07-05 00:00 UTC)
const FALLBACK_NEWS = [
  { headline: `Sunday July 5 00:00 UTC WEEKEND-RECAP-TAPE / US-MARKETS-STILL-CLOSED-INDEPENDENCE-DAY-WEEKEND — AMERICAS-250TH-BIRTHDAY-LONG-WEEKEND with the equity tape frozen at ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Sunday July 5 00:00 UTC MACRO-TAPE / RATE-PATH-WATCH — WEAK-JUNE-PAYROLLS-+57K-VS-~115K-EXP-HALF-CONSENSUS / UNEMPLOYMENT-4.2% + FED-CHAIR-WARSH-SIGNALS-INFLATION-RISKS-EASED-FIRST-DOVISH-TILT reviving rate-cut hopes as ${CORE}`, category: 'general', related: '' },
  { headline: `Sunday July 5 00:00 UTC NVDA-FOCUS-TAPE / SEMI-DESK-WATCH — NVDA-AI-INFRASTRUCTURE-PARTNERSHIPS-ROLL-ON but AI-CHIP-VALUATION-WOBBLE (MICRON--13%-~$138B-ERASED / SK-HYNIX-SLOWS-HBM-EXPANSION) FRONT-AND-CENTER as ${CORE}`, category: 'general', related: 'NVDA' },
  { headline: `Sunday July 5 00:00 UTC AAPL-FOCUS-TAPE / MEGACAP-WATCH — AAPL-IN-EARLY-TALKS-TO-MAKE-CHIPS-IN-US-VIA-INTEL-SAMSUNG (INTC-+10%-ON-THE-BLOOMBERG-REPORT) as ${CORE}`, category: 'general', related: 'AAPL' },
  { headline: `Sunday July 5 00:00 UTC INTC-FOCUS-TAPE / FOUNDRY-DESK-WATCH — INTC-+10% on BLOOMBERG-REPORT-APPLE-EARLY-TALKS-US-CHIPMAKING-VIA-INTEL-SAMSUNG the standout single-stock tick as ${CORE}`, category: 'general', related: 'INTC' },
  { headline: `Sunday July 5 00:00 UTC TSLA-FOCUS-TAPE / DELIVERIES-DESK-WATCH — TSLA-RECORD-Q2-DELIVERIES-480,126 + MIAMI-ROBOTAXI-LAUNCH (missed first-half target) as ${CORE}`, category: 'general', related: 'TSLA' },
  { headline: `Sunday July 5 00:00 UTC BA-FOCUS-TAPE / INDUSTRIALS-DESK-WATCH — BOEING-INDUSTRIALS-RODE-THE-DOW-RECORD into the FRIDAY-HOLIDAY-CLOSE / MARKETS-REOPEN-MON-JULY-6 as ${CORE}`, category: 'general', related: 'BA' },
  { headline: `Sunday July 5 00:00 UTC COIN-FOCUS-TAPE / EXCHANGE-DESK-WATCH — COIN-LAUNCHES-24/7-STOCK-PERPETUAL-FUTURES-UP-TO-10X on MAG-7 (TSLA/AAPL/NVDA) for NON-US-USERS while CRYPTO-ETF-FLOWS-FLIP-BACK-POSITIVE (+$221.7M-THU / 5-DAY-INFLOW-STREAK) as ${CORE}`, category: 'general', related: 'COIN' },
  { headline: `Sunday July 5 00:00 UTC AMD-FOCUS-TAPE / SEMI-DESK-WATCH — AMD-IN-FOCUS-ON OPENAI-TO-TAKE-UP-TO-10%-EQUITY-STAKE-TO-SECURE-GPU-SUPPLY as ${CORE}`, category: 'general', related: 'AMD' },
  { headline: `Sunday July 5 00:00 UTC META-FOCUS-TAPE / MAG-7-WATCH — META-IN-THE-MAG-7-COHORT after H1-2026-TECH-LED-BUT-MAG-7-SOLD-OFF-SHARPLY-LATE-JUNE with MSFT-THE-BIG-H1-UNDERPERFORMER as ${CORE}`, category: 'general', related: 'META' },
  { headline: `Sunday July 5 00:00 UTC MSTR-FOCUS-TAPE / TREASURY-DESK-WATCH — MSTR-CARRIES-THE-BITCOIN-TREASURY-ANGLE as CRYPTO-ETF-FLOWS-FLIP-BACK-POSITIVE-5-DAY-STREAK yet CITI-STILL-CUTS-BTC-$112K-TO-$82K as ${CORE}`, category: 'general', related: 'MSTR' },
  { headline: `Sunday July 5 00:00 UTC BTC-FOCUS-TAPE / CRYPTO-DESK-WATCH — BTC $63,062 +0.74%-CREEPS-BACK-TOWARD-$63K as BTC-ETFs-+$221.7M-THU-END-10-DAY-OUTFLOW-STREAK as ${CORE}`, category: 'general', related: 'BTC' },
  { headline: `Sunday July 5 00:00 UTC ETH-FOCUS-TAPE / CRYPTO-DESK-WATCH — ETH $1,777 +1.04%-FIRMER-ON-THE-WEEKEND as BLACKROCK-STAKED-ETH-FUND-DREW-$100M-DAY-ONE though CITI-STILL-AT-ETH-$3,175-TO-$2,240 as ${CORE}`, category: 'general', related: 'ETH' },
  { headline: `Sunday July 5 00:00 UTC SOL-FOCUS-TAPE / CRYPTO-DESK-WATCH — SOL $81.58 -0.98%-THE-LONE-RED-IN-THE-COHORT on a quiet weekend tape as ${CORE}`, category: 'general', related: 'SOL' },
  { headline: `Sunday July 5 00:00 UTC XRP-FOCUS-TAPE / CRYPTO-DESK-WATCH — XRP $1.16 +1.85%-BACK-ABOVE-$1.15 a steady weekend cohort gainer as ${CORE}`, category: 'general', related: 'XRP' },
  { headline: `Macro Sunday July 5 00:00 UTC WORLD-DESK-TAPE / IRAN-WATCH — IRAN-2026-CEASEFIRE-STRAINED IRAN-REFUSES-TO-MEET-US-ENVOYS / OIL-TICKS-UP / BRENT-FIRMER-~$73-OFF-PRE-WAR-$70.65 as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Sunday July 5 00:00 UTC WORLD-DESK-TAPE / VATICAN-WATCH — VATICAN-JULY-2-DECLARES-SSPX-IN-FORMAL-SCHISM / EXCOMMUNICATES-BISHOPS after 4-BISHOPS-CONSECRATED-JULY-1-ECONE-DEFY-POPE-LEO-XIV as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Sunday July 5 00:00 UTC WORLD-DESK-TAPE / HEAT-DOME-WATCH — US-JULY-4-AFTERMATH HEAT-DOME 260M+-EXPOSED / 300+-RECORDS / PHILLY-DC-~106F / HEAT-INDEX-115F / PHILADELPHIA-CANCELED-JULY-4-PARADE / ONE-OF-HOTTEST-JULY-4THS-ON-RECORD as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Sunday July 5 00:00 UTC WORLD-DESK-TAPE / SPORTS-WATCH — FIFA-WORLD-CUP-2026-R16-RESULTS FRANCE-1-0-PARAGUAY-PHILADELPHIA / MOROCCO-3-0-CANADA-HOUSTON (CANADA-OUT / MOROCCO-VS-FRANCE-QF) + SUNDAY-JULY-5-R16 BRAZIL-VS-NORWAY-METLIFE / MEXICO-VS-ENGLAND-ESTADIO-AZTECA as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Sunday July 5 00:00 UTC TECH-DESK-TAPE / AI-CHIPS-WATCH — OPENAI-MICROSOFT-PROJECT-STARGATE + OPENAI-TO-TAKE-UP-TO-10%-AMD-STAKE-TO-SECURE-GPUS but AI-CHIP-VALUATION-WOBBLE MICRON--13%-~$138B-ERASED / SK-HYNIX-SLOWS-HBM-EXPANSION as ${CORE}`, category: 'general', related: '' },
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
