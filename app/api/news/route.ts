import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Shared macro/market/crypto/world tail used across the fallback tape (2026-07-04 12:00 UTC)
const CORE = 'THURSDAY-JULY-2 DOW-RECORD-CLOSE 52,900.07 +594.83 +1.14% / S&P-500 7,483.24 FLAT / NASDAQ 25,832.67 -0.8%-SEMI-DRAG the last print before US-MARKETS-CLOSED-ALL-DAY-FRIDAY-JULY-3 (FULL-HOLIDAY-NOT-HALF-DAY) / REOPEN-MON-JULY-6 + WEAK-JUNE-PAYROLLS-+57K-VS-~115K-EXP / UNEMPLOYMENT-4.2%-REVIVE-RATE-CUT-HOPES + FED-CHAIR-KEVIN-WARSH-JULY-1-SINTRA-INFLATION-STILL-TOO-HIGH / DECLINED-JULY-HINT after JUNE-FOMC-HELD / RAISED-2026-OUTLOOK-3.6%-HEADLINE-3.3%-CORE + HBM-MEMORY-SHORTAGE-DEEPENS (B300-NEEDS-8-HBM-CHIPS / RELIEF-NOT-UNTIL-2027) + OPENAI-MICROSOFT-PROJECT-STARGATE SAMSUNG-SK-HYNIX-~900K-WAFER-STARTS-MO / OPENAI-TO-TAKE-UP-TO-10%-AMD-STAKE-TO-SECURE-GPUS / ALTMAN-BINDING-CONSTRAINT-NOW-CHIPS + ARM -7% CEO-RENE-HAAS-SMARTPHONE-UNIT-GROWTH-FLIPS-NEGATIVE + INTC-+10%-APPLE-EARLY-TALKS-US-CHIPMAKING-VIA-INTEL-SAMSUNG + TSLA-RECORD-Q2-DELIVERIES-480,126 / MIAMI-ROBOTAXI-LAUNCH + COIN-LAUNCHES-24/7-STOCK-PERPETUAL-FUTURES-10X-MAG-7-NON-US + CRYPTO-ETF-CAPITULATION BTC-ETFs-~$4B-JUNE-OUTFLOWS-RECORD / 13-DAY-REDEMPTION-STREAK / YTD-FLOWS-NEGATIVE-FIRST-TIME + CITI-CUTS-BTC-$112K-TO-$82K / ETH-$3,175-TO-$2,240 / NET-ETF-INFLOW-TO-ZERO + CRYPTO-COHORT-LIVE-JULY-4 BTC $62,508 +0.75% / ETH $1,759 +0.94% / SOL $81.85 +0.26% / XRP $1.14 +2.66% XRP-THE-WEEKEND-MOVER-ON-QUIET-GREEN-TAPE but BTC-WELL-OFF-MAY-$73K-HIGH + IRAN-2026-CEASEFIRE-HOLDS SHIPS-BEGIN-STRAIT-OF-HORMUZ-CROSSINGS / BRENT-$70.65-PRE-WAR-LEVELS / MOJTABA-KHAMENEI-AGREED-JUNE-17-MoU-60-DAY + VATICAN-JULY-2-DECLARES-SSPX-IN-SCHISM-AFTER-JULY-1-ECONE-CONSECRATIONS-DEFY-POPE-LEO-XIV + FIFA-WORLD-CUP-2026-ROUND-OF-16 FRANCE-VS-PARAGUAY-PHILADELPHIA / CANADA-VS-MOROCCO-JULY-4 + US-HEAT-DOME-260M+-EXPOSED / 300+-RECORDS / PHILADELPHIA-CANCELS-JULY-4-PARADE / POSSIBLY-HOTTEST-JULY-4TH-ON-RECORD — DOW RECORD-CLOSE 52,900.07 +1.14% per CNBC / TheStreet.';

// Fallback headlines when API fails or no key (updated 2026-07-04 12:00 UTC)
const FALLBACK_NEWS = [
  { headline: `Saturday July 4 12:00 UTC HOLIDAY-RECAP-TAPE / US-MARKETS-CLOSED-INDEPENDENCE-DAY — AMERICAS-250TH-BIRTHDAY-LONG-WEEKEND with the equity tape frozen at ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Saturday July 4 12:00 UTC MACRO-TAPE / RATE-PATH-WATCH — WEAK-JUNE-PAYROLLS-+57K-VS-~115K-EXP-HALF-CONSENSUS / UNEMPLOYMENT-4.2% the concrete number reviving rate-cut hopes as ${CORE}`, category: 'general', related: '' },
  { headline: `Saturday July 4 12:00 UTC NVDA-FOCUS-TAPE / SEMI-DESK-WATCH — NVDA-AI-INFRASTRUCTURE-PARTNERSHIPS-ROLL-ON with HBM-DEMAND-VS-SUPPLY-CRUNCH-FRONT-AND-CENTER as ${CORE}`, category: 'general', related: 'NVDA' },
  { headline: `Saturday July 4 12:00 UTC AAPL-FOCUS-TAPE / MEGACAP-WATCH — AAPL-IN-EARLY-TALKS-TO-MAKE-CHIPS-IN-US-VIA-INTEL-SAMSUNG (INTC-+10%-ON-THE-BLOOMBERG-REPORT) as ${CORE}`, category: 'general', related: 'AAPL' },
  { headline: `Saturday July 4 12:00 UTC INTC-FOCUS-TAPE / FOUNDRY-DESK-WATCH — INTC-+10% on BLOOMBERG-REPORT-APPLE-EARLY-TALKS-US-CHIPMAKING-VIA-INTEL-SAMSUNG the standout single-stock tick as ${CORE}`, category: 'general', related: 'INTC' },
  { headline: `Saturday July 4 12:00 UTC TSLA-FOCUS-TAPE / DELIVERIES-DESK-WATCH — TSLA-RECORD-Q2-DELIVERIES-480,126 + MIAMI-ROBOTAXI-LAUNCH (missed first-half target) as ${CORE}`, category: 'general', related: 'TSLA' },
  { headline: `Saturday July 4 12:00 UTC BA-FOCUS-TAPE / INDUSTRIALS-DESK-WATCH — BOEING-INDUSTRIALS-RODE-THE-DOW-RECORD into the FRIDAY-HOLIDAY-CLOSE as ${CORE}`, category: 'general', related: 'BA' },
  { headline: `Saturday July 4 12:00 UTC COIN-FOCUS-TAPE / EXCHANGE-DESK-WATCH — COIN-LAUNCHES-24/7-STOCK-PERPETUAL-FUTURES-UP-TO-10X on MAG-7 (TSLA/AAPL/NVDA) for NON-US-USERS while CRYPTO-ETF-CAPITULATION-GRINDS-ON as ${CORE}`, category: 'general', related: 'COIN' },
  { headline: `Saturday July 4 12:00 UTC AMD-FOCUS-TAPE / SEMI-DESK-WATCH — AMD-IN-FOCUS-ON OPENAI-TO-TAKE-UP-TO-10%-EQUITY-STAKE-TO-SECURE-GPU-SUPPLY as ${CORE}`, category: 'general', related: 'AMD' },
  { headline: `Saturday July 4 12:00 UTC META-FOCUS-TAPE / MAG-7-WATCH — META-IN-THE-MAG-7-COHORT after H1-2026-TECH-LED-BUT-MAG-7-SOLD-OFF-SHARPLY-LATE-JUNE with MSFT-THE-BIG-H1-UNDERPERFORMER as ${CORE}`, category: 'general', related: 'META' },
  { headline: `Saturday July 4 12:00 UTC MSTR-FOCUS-TAPE / TREASURY-DESK-WATCH — MSTR-CARRIES-THE-BITCOIN-TREASURY-ANGLE into CRYPTO-ETF-CAPITULATION and CITI-CUTS-BTC-$112K-TO-$82K as ${CORE}`, category: 'general', related: 'MSTR' },
  { headline: `Saturday July 4 12:00 UTC BTC-FOCUS-TAPE / CRYPTO-DESK-WATCH — BTC $62,508 +0.75%-ON-A-QUIET-GREEN-WEEKEND yet CRYPTO-ETF-CAPITULATION-GRINDS-ON as ${CORE}`, category: 'general', related: 'BTC' },
  { headline: `Saturday July 4 12:00 UTC ETH-FOCUS-TAPE / CRYPTO-DESK-WATCH — ETH $1,759 +0.94%-FLAT-ON-THE-WEEKEND as ETHER-ETFs-ALSO-BLEEDING and CITI-CUTS-ETH-$3,175-TO-$2,240 as ${CORE}`, category: 'general', related: 'ETH' },
  { headline: `Saturday July 4 12:00 UTC SOL-FOCUS-TAPE / CRYPTO-DESK-WATCH — SOL $81.85 +0.26%-QUIET-IN-THE-GREEN-COHORT even as CRYPTO-ETF-CAPITULATION-GRINDS-ON as ${CORE}`, category: 'general', related: 'SOL' },
  { headline: `Saturday July 4 12:00 UTC XRP-FOCUS-TAPE / CRYPTO-DESK-WATCH — XRP $1.14 +2.66%-THE-BIGGEST-WEEKEND-COHORT-MOVER even as CRYPTO-ETF-CAPITULATION-GRINDS-ON as ${CORE}`, category: 'general', related: 'XRP' },
  { headline: `Macro Saturday July 4 12:00 UTC WORLD-DESK-TAPE / IRAN-WATCH — IRAN-2026-CEASEFIRE-HOLDS SHIPS-BEGIN-STRAIT-OF-HORMUZ-CROSSINGS / BRENT-$70.65-BACK-TO-PRE-WAR-LEVELS / MOJTABA-KHAMENEI-DIFFERENT-VIEW-BUT-AGREED-JUNE-17-MoU-60-DAY as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Saturday July 4 12:00 UTC WORLD-DESK-TAPE / VATICAN-WATCH — VATICAN-JULY-2-DECLARES-SSPX-IN-FORMAL-SCHISM / EXCOMMUNICATES-BISHOPS after 4-BISHOPS-CONSECRATED-JULY-1-ECONE-DEFY-POPE-LEO-XIV as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Saturday July 4 12:00 UTC WORLD-DESK-TAPE / HEAT-DOME-WATCH — US-HEAT-DOME 260M+-EXPOSED / 185M+-UNDER-ALERTS / 300+-RECORDS / PHILLY-DC-~106F / HEAT-INDEX-115F / PHILADELPHIA-CANCELS-JULY-4-PARADE / POSSIBLY-HOTTEST-JULY-4TH-ON-RECORD as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Saturday July 4 12:00 UTC WORLD-DESK-TAPE / SPORTS-WATCH — FIFA-WORLD-CUP-2026-ROUND-OF-16 FRANCE-VS-PARAGUAY-PHILADELPHIA / CANADA-VS-MOROCCO-JULY-4 (R32: EGYPT-BEAT-AUSTRALIA-PKs-4-2 / COLOMBIA-1-0-GHANA) into the AMERICAS-250TH-BIRTHDAY-WEEKEND as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Saturday July 4 12:00 UTC TECH-DESK-TAPE / AI-CHIPS-WATCH — OPENAI-MICROSOFT-PROJECT-STARGATE + OPENAI-TO-TAKE-UP-TO-10%-AMD-STAKE-TO-SECURE-GPUS + SAMSUNG-SK-HYNIX-~900K-WAFER-STARTS-MO as HBM-MEMORY-SHORTAGE-DEEPENS-RELIEF-NOT-UNTIL-2027 as ${CORE}`, category: 'general', related: '' },
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
