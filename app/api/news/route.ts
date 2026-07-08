import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Shared macro/market/crypto/world tail used across the fallback tape (2026-07-08 00:00 UTC)
const CORE = 'WEDNESDAY-JULY-8 00:00-UTC-OVERNIGHT — US-CASH-CLOSED-FOR-TUESDAY-JULY-7-REOPENS-WEDNESDAY-13:30-UTC / TUESDAY-ENDED-LOWER-IN-A-CHIP-LED-PULLBACK-FROM-MONDAYS-RECORDS ON A SEMIS-ROUT-AFTER-SAMSUNGS-AI-PROFIT-MISS-AND-A-DEEPSEEK-IN-HOUSE-CHIP-REPORT / TUESDAY-JULY-7-CASH-CLOSE DOW 52,925.15 -130.76 -0.25% / S&P-500 7,503.85 -0.45% / NASDAQ 25,818.69 -1.16% — CAPITAL-ROTATED-INTO-HEALTHCARE-AND-UTILITIES / RECORD-CLOSE-STILL-MONDAY-JULY-6 DOW 53,055.91 (FIRST-EVER-ABOVE-53,000) + MEGACAP-CROWN-RACE NVIDIA-STILL-#1-AT-~$4.7T-VS-APPLE-~$4.5T GAP-~$190B-~4% / ALPHABET-~$4.3T-CROWDS-THE-#2-SLOT / MSFT-~$3.28T-THIRD-TIER + RATE-PATH-WATCH FED-HELD-FUNDS-RATE-3.50%-3.75%-AT-THE-JUNE-16-17-FOMC / FED-CHAIR-KEVIN-WARSH-SAYS-INFLATION-STILL-TOO-HIGH / 9-OF-18-OFFICIALS-STILL-PENCIL-AT-LEAST-ONE-2026-HIKE / JUNE-JOBS-+57K-MISS-UNEMPLOYMENT-4.2% / NEXT-FOMC-JULY-28-29 / JUNE-CPI-DUE-JULY-14 + CRYPTO-COHORT-LIVE-WED-JULY-8-00:00-UTC BTC $63,303.38 -1.12% / ETH $1,770.77 -1.54% / SOL $80.56 -1.64% / XRP $1.1119 -2.90% — GLOBAL-CRYPTO-MCAP-~$2.2T / RISK-OFF-COHORT-RED-ACROSS-THE-BOARD-FEAR-&-GREED-23-EXTREME-FEAR + WORLD UKRAINE-RUSSIAN-BARRAGE-ON-KYIV-68-MISSILES-351-DRONES-~19-KILLED-IN-KYIV-PLUS-8-IN-THE-REGION-ON-THE-EVE-OF-A-NATO-SUMMIT-IN-TURKEY-TRUMP-PLANS-TO-ATTEND + CHINA-TESTS-A-NUCLEAR-CAPABLE-SUBMARINE-LAUNCHED-MISSILE-IN-A-RARE-SHOW-OF-FORCE + VENEZUELA-CREWS-STILL-SEARCHING-FOR-THE-MISSING-AS-QUAKE-RECOVERY-GRINDS-ON + VATICAN-BREAKAWAY-SSPX-DEFIES-POPE-LEO-XIV-MOVING-TO-CONSECRATE-FOUR-BISHOPS-WITHOUT-APPROVAL + FIFA-WORLD-CUP-2026-QUARTERFINALS-JULY-9-11 FRANCE-VS-MOROCCO-THU / SPAIN-VS-BELGIUM-FRI / ENGLAND-VS-NORWAY-SAT / ARGENTINA-VS-SWITZERLAND-SAT — AFTER-BELGIUM-BEAT-USA-4-1-AND-NORWAY-UPSET-BRAZIL-IN-THE-ROUND-OF-16 — DOW TUESDAY-CASH-CLOSE 52,925.15 -0.25% per CNBC / TheStreet.';

// Fallback headlines when API fails or no key (updated 2026-07-08 00:00 UTC)
const FALLBACK_NEWS = [
  { headline: `Wednesday July 8 00:00 UTC OVERNIGHT-TAPE / US-CASH-CLOSED-FOR-TUESDAY-REOPENS-WEDNESDAY-13:30-UTC — TUESDAY-ENDED-LOWER-IN-A-CHIP-LED-PULLBACK DOW 52,925.15 -130.76 -0.25% / S&P-500 7,503.85 -0.45% / NASDAQ 25,818.69 -1.16% as a SEMIS-ROUT-ON-SAMSUNGS-AI-PROFIT-MISS-AND-A-DEEPSEEK-IN-HOUSE-CHIP-REPORT pulled the tape back from Mondays records with ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Wednesday July 8 00:00 UTC MACRO-TAPE / RATE-PATH-WATCH — FED-HELD-FUNDS-RATE-3.50%-3.75%-AT-THE-JUNE-16-17-FOMC / FED-CHAIR-WARSH-SAYS-INFLATION-STILL-TOO-HIGH / 9-OF-18-OFFICIALS-STILL-PENCIL-AT-LEAST-ONE-2026-HIKE / JUNE-JOBS-+57K-MISS-UNEMPLOYMENT-4.2% / NEXT-FOMC-JULY-28-29 / JUNE-CPI-DUE-JULY-14 as ${CORE}`, category: 'general', related: '' },
  { headline: `Wednesday July 8 00:00 UTC AAPL-FOCUS-TAPE / SUPPLY-DESK-WATCH — APPLE-EXTENDS-ITS-BROADCOM-CUSTOM-CHIP-SUPPLY-DEAL-THROUGH-2031 with the stock +1.31%-TO-$312.66-+9%-OVER-FIVE-DAYS as it holds ~$4.5T-THE-NEAREST-CHALLENGER-TO-NVIDIA ahead of Q3-EARNINGS-JULY-30 as ${CORE}`, category: 'general', related: 'AAPL' },
  { headline: `Wednesday July 8 00:00 UTC NVDA-FOCUS-TAPE / SEMI-DESK-WATCH — NVIDIA-DENIES-A-REPORT-ITS-KYBER-NVL144-AI-PLATFORM-SLIPS-TO-2028 saying it is ON-SCHEDULE and firming +~1% after dipping on the DEEPSEEK-IN-HOUSE-CHIP-REPORT as it holds #1-AT-~$4.7T as ${CORE}`, category: 'general', related: 'NVDA' },
  { headline: `Wednesday July 8 00:00 UTC TSLA-FOCUS-TAPE / EV-DESK-WATCH — TSLA-CARRIES-A-RECORD-Q2-DELIVERY-BEAT-480,126-+25%-Y/Y-+34%-Q/Q plus 13.5-GWh-STORAGE ahead of JULY-22-EARNINGS with focus on AUTO-MARGINS-AND-FSD as ${CORE}`, category: 'general', related: 'TSLA' },
  { headline: `Wednesday July 8 00:00 UTC AMD-FOCUS-TAPE / SEMI-DESK-WATCH — AMD-SOLD-OFF-IN-THE-TUESDAY-CHIP-ROUT alongside MICRON-BROADCOM-KLA-AND-MARVELL on the SAMSUNG-AI-MISS-AND-DEEPSEEK-CHIP-NEWS as SOX-SLID-~6% as ${CORE}`, category: 'general', related: 'AMD' },
  { headline: `Wednesday July 8 00:00 UTC MSFT-FOCUS-TAPE / MAG-7-WATCH — MSFT-LAUNCHES-MICROSOFT-FRONTIER-AI-DEPLOYMENT-UNIT ($2.5B-6,000-STAFF) while separately CUTTING-~4,800-JOBS-~2.1% as it holds the THIRD-MEGACAP-TIER-~$3.28T as ${CORE}`, category: 'general', related: 'MSFT' },
  { headline: `Wednesday July 8 00:00 UTC META-FOCUS-TAPE / MAG-7-WATCH — META-LAYS-OFF-~8,000-~10%-IN-AN-AI-RESTRUCTURING reassigning ~7,000-TO-AI-TEAMS as BIG-TECH-2026-CAPEX-RUNS-~$725B-+77%-Y/Y as ${CORE}`, category: 'general', related: 'META' },
  { headline: `Wednesday July 8 00:00 UTC COIN-FOCUS-TAPE / EXCHANGE-DESK-WATCH — COIN-WAS-A-STANDOUT-GAINER-SURGING-OVER-18% as traders BOUGHT-THE-DIP-IN-CRYPTO-EXPOSURE even as the cohort turned RISK-OFF into Wednesday as ${CORE}`, category: 'general', related: 'COIN' },
  { headline: `Wednesday July 8 00:00 UTC MSTR-FOCUS-TAPE / TREASURY-DESK-WATCH — STRATEGY-MSTR-SOLD-3,588-BTC-FOR-~$216M cutting holdings to 843,775-BTC with the stock -2%-POST-FILING as JPMORGAN-WARNS-OF-AVOIDABLE-TWO-WAY-RISK as ${CORE}`, category: 'general', related: 'MSTR' },
  { headline: `Wednesday July 8 00:00 UTC BTC-FOCUS-TAPE / CRYPTO-DESK-WATCH — BTC $63,303.38 -1.12%-SLIPS-BACK-BELOW-$64K in a RISK-OFF-TAPE as FEAR-&-GREED-READS-23-EXTREME-FEAR with GLOBAL-CRYPTO-MCAP-~$2.2T as ${CORE}`, category: 'general', related: 'BTC' },
  { headline: `Wednesday July 8 00:00 UTC ETH-FOCUS-TAPE / CRYPTO-DESK-WATCH — ETH $1,770.77 -1.54%-SLIPS-BACK-BELOW-$1,800 leading the COHORT-LOWER into the Wednesday overnight as ${CORE}`, category: 'general', related: 'ETH' },
  { headline: `Wednesday July 8 00:00 UTC SOL-FOCUS-TAPE / CRYPTO-DESK-WATCH — SOL $80.56 -1.64%-SLIDES-WITH-THE-COHORT losing $82 in the RISK-OFF-TURN as ${CORE}`, category: 'general', related: 'SOL' },
  { headline: `Wednesday July 8 00:00 UTC XRP-FOCUS-TAPE / CRYPTO-DESK-WATCH — XRP $1.1119 -2.90%-LEADS-THE-COHORT-LOWER as the majors turn RED-ACROSS-THE-BOARD into Wednesday as ${CORE}`, category: 'general', related: 'XRP' },
  { headline: `Macro Wednesday July 8 00:00 UTC WORLD-DESK-TAPE / UKRAINE-WATCH — RUSSIAN-BARRAGE-ON-KYIV-68-MISSILES-351-DRONES-~19-KILLED-IN-KYIV-PLUS-8-IN-THE-REGION landing ON-THE-EVE-OF-A-NATO-SUMMIT-IN-TURKEY-TRUMP-PLANS-TO-ATTEND as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Wednesday July 8 00:00 UTC WORLD-DESK-TAPE / CHINA-WATCH — CHINA-TESTS-A-NUCLEAR-CAPABLE-SUBMARINE-LAUNCHED-MISSILE in a RARE-SHOW-OF-FORCE as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Wednesday July 8 00:00 UTC WORLD-DESK-TAPE / VENEZUELA-WATCH — VENEZUELA-CREWS-STILL-SEARCHING-FOR-THE-MISSING as the QUAKE-RECOVERY-GRINDS-ON with international teams on the ground as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Wednesday July 8 00:00 UTC WORLD-DESK-TAPE / VATICAN-WATCH — BREAKAWAY-SSPX-DEFIES-POPE-LEO-XIV moving to CONSECRATE-FOUR-BISHOPS-WITHOUT-VATICAN-APPROVAL in a fresh rift with Rome as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Wednesday July 8 00:00 UTC WORLD-DESK-TAPE / SPORTS-WATCH — FIFA-WORLD-CUP-2026-QUARTERFINALS-JULY-9-11 FRANCE-VS-MOROCCO-THU / SPAIN-VS-BELGIUM-FRI / ENGLAND-VS-NORWAY-SAT / ARGENTINA-VS-SWITZERLAND-SAT after BELGIUM-BEAT-USA-4-1-AND-NORWAY-UPSET-BRAZIL-IN-THE-ROUND-OF-16 as ${CORE}`, category: 'general', related: '' },
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
