import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Shared macro/market/crypto/world tail used across the fallback tape (2026-07-10 00:00 UTC)
const CORE = 'FRIDAY-JULY-10 00:00-UTC-POST-CLOSE — THURSDAYS-US-CASH-SESSION-CLOSED-RISK-ON-AS-A-CHIP-SURGE-OVERPOWERED-THE-IRAN-TAPE / THURSDAY-JULY-9-CASH-CLOSE DOW 52,487.41 +139.02 +0.27% / S&P-500 7,543.64 +60.93 +0.81% / NASDAQ 26,206.89 +336.24 +1.30% + CHIP-SURGE AMD +5.67%-TO-$546.72-ON-A-GIGASCALE-AI-CAMPUS-COLLABORATION / MICRON +4.52%-TO-$991.64 / BROADCOM +3.20%-TO-$401.11 / SK-HYNIXS-$28B-US-LISTING-RAN-7X-OVERSUBSCRIBED — BUT-NVIDIA-ITSELF-SLIPPED--0.66%-TO-$202.78 + THE-RISK-ON-TRIGGER TRUMP-SAID-ABOARD-AIR-FORCE-ONE-THAT-IRAN-WANT-TO-MAKE-A-DEAL-SO-BADLY-THEY-CALLED-A-LITTLE-WHILE-AGO / OIL-FELL BRENT-~$76.10--2.5% / WTI-~$71.93--2.2% / GOLD-FIRMER-NEAR-$4,120 + IRAN-STRUCK-BACK-ANYWAY THE-IRGC-FIRED-TEN-BALLISTIC-MISSILES-AT-JORDANS-AZRAQ-AIR-BASE-JORDAN-INTERCEPTED-EIGHT-AND-REPORTED-NO-INJURIES-OR-DAMAGE / IRANS-ARMY-SAYS-IT-HIT-US-PATRIOT-SYSTEMS-IN-KUWAIT-AN-EARLY-WARNING-SITE-IN-QATAR-AND-A-US-ARMY-FUEL-DEPOT-IN-BAHRAIN-WITH-ONE-PERSON-INJURED-BY-FALLING-SHRAPNEL-IN-KUWAIT + MEGACAP-CROWN NVIDIA-STILL-#1-AT-~$4.91T / APPLE-#2-AT-~$4.64T-+0.90%-CLOSING-THE-GAP-ON-A-DOWN-DAY-FOR-NVIDIA-BUT-STILL-~$263B-BEHIND / ALPHABET-#3-AT-~$4.37T + RATE-PATH-WATCH FED-HELD-FUNDS-RATE-3.50%-3.75%-AT-THE-JUNE-16-17-FOMC / CHAIR-KEVIN-WARSH-NAMED-FIVE-FED-TASK-FORCES-WITH-LEADERS-INCLUDING-MARC-ANDREESSEN-MERVYN-KING-AND-GREG-MANKIW / NY-FEDS-WILLIAMS-SAYS-ENERGY-PRICES-ARE-LIKELY-NEAR-THEIR-PEAK-AND-POLICY-IS-IN-A-GOOD-PLACE / NEXT-FOMC-JULY-28-29 / JUNE-CPI-DUE-JULY-14 + CRYPTO-COHORT-LIVE-FRI-JULY-10-00:09-UTC BTC $63,188 +1.59% / ETH $1,743.02 +0.06% / SOL $77.94 +0.28% / XRP $1.0923 +0.17% — GLOBAL-CRYPTO-MCAP-~$2.25T-+0.96%-24H / BTC-DOMINANCE-56.29% / FEAR-&-GREED-23-EXTREME-FEAR-EVEN-WITH-THE-WHOLE-COHORT-GREEN + WORLD IRAN-BURIED-ITS-SLAIN-SUPREME-LEADER-KHAMENEI-ON-THURSDAY-AT-A-SHRINE-IN-MASHHAD-MONTHS-AFTER-HE-WAS-KILLED-ON-THE-WARS-FIRST-DAY-FEBRUARY-28 + STRAIT-OF-HORMUZ-TANKER-TRAFFIC-AT-A-NEAR-STANDSTILL-WITH-ONLY-TWO-TRANSITS-IN-THE-EARLY-HOURS-AGAINST-A-~40-A-DAY-TWO-WEEK-AVERAGE-AND-125-140-BEFORE-THE-WAR-AS-THE-LNG-TANKER-AL-REKAYYAT-SITS-STRANDED-OFF-OMAN + UKRAINE-RUSSIA-ATTACKED-OVERNIGHT-WITH-TWO-MISSILES-AND-ABOUT-100-DRONES-AND-UKRAINE-DOWNED-72-UAVS + FIFA-WORLD-CUP-2026-FRANCE-BEAT-MOROCCO-2-0-IN-BOSTON-ON-GOALS-FROM-MBAPPE-AND-DEMBELE-TO-REACH-THE-SEMIFINALS / SPAIN-VS-BELGIUM-FRI-19:00-UTC / NORWAY-VS-ENGLAND-SAT-21:00-UTC / ARGENTINA-VS-SWITZERLAND-SUN-01:00-UTC — DOW THURSDAY-CASH-CLOSE 52,487.41 +0.27% per Motley Fool / Reuters.';

// Fallback headlines when API fails or no key (updated 2026-07-10 00:00 UTC)
const FALLBACK_NEWS = [
  { headline: `Friday July 10 00:00 UTC POST-CLOSE-TAPE / RISK-ON-INTO-THE-BELL — THURSDAYS-CASH-SESSION-CLOSED-GREEN-ACROSS-THE-BOARD DOW 52,487.41 +139.02 +0.27% / S&P-500 7,543.64 +60.93 +0.81% / NASDAQ 26,206.89 +336.24 +1.30% as a CHIP-SURGE-OVERPOWERED-THE-IRAN-TAPE and TRUMP-SAID-IRAN-WANT-TO-MAKE-A-DEAL-SO-BADLY — OIL-FELL-~2%-AND-BITCOIN-BROKE-$63K-ON-THE-SAME-HEADLINE with ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Friday July 10 00:00 UTC MACRO-TAPE / RATE-PATH-WATCH — NY-FEDS-WILLIAMS-SAYS-ENERGY-PRICES-ARE-LIKELY-AROUND-THEIR-PEAK-AND-SHOULD-COME-DOWN-OVER-TIME and that POLICY-IS-IN-A-GOOD-PLACE while CHAIR-KEVIN-WARSH-NAMES-FIVE-FED-TASK-FORCES-ON-COMMUNICATIONS-DATA-BALANCE-SHEET-PRODUCTIVITY-AND-THE-INFLATION-FRAMEWORK-WITH-LEADERS-INCLUDING-MARC-ANDREESSEN-MERVYN-KING-AND-GREG-MANKIW — FED-HOLDING-3.50%-3.75%-SINCE-THE-JUNE-16-17-FOMC / NEXT-FOMC-JULY-28-29 / JUNE-CPI-DUE-JULY-14 as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Friday July 10 00:00 UTC ENERGY-DESK-TAPE / OIL-UNWIND-WATCH — CRUDE-GAVE-BACK-WEDNESDAYS-WAR-PREMIUM BRENT-~$76.10--2.5% and WTI-~$71.93--2.2% as TRADERS-LOOKED-PAST-MIDDLE-EAST-TENSIONS — yet REUTERS-REPORTS-FUEL-MARKETS-FLASHING-A-SUPPLY-CRUNCH-DESPITE-CALMER-PRICES and HORMUZ-TANKER-TRAFFIC-IS-AT-A-NEAR-STANDSTILL-WITH-ONLY-TWO-TRANSITS-IN-THE-EARLY-HOURS while the EU-DRAFTS-AN-ELECTRIFICATION-PLAN-TO-CURB-OIL-AND-GAS-USE as ${CORE}`, category: 'general', related: '' },
  { headline: `Friday July 10 00:00 UTC AAPL-FOCUS-TAPE / SUPPLY-DESK-WATCH — APPLE-CLOSED-+0.90%-AT-$316.22-AND-NARROWED-THE-CROWN-RACE-TO-~$263B at ~$4.64T-BEHIND-NVIDIAS-~$4.91T as TIM-COOK-TOOK-THE-BROADCOM-PARTNERSHIP-TO-THE-NEXT-LEVEL-SENDING-AVGO-+3.20% while UBS-PEGS-JUNE-QUARTER-APP-STORE-GROWTH-AT-ABOUT-3% as ${CORE}`, category: 'general', related: 'AAPL' },
  { headline: `Friday July 10 00:00 UTC NVDA-FOCUS-TAPE / SEMI-DESK-WATCH — NVIDIA-SAT-OUT-ITS-OWN-SECTORS-RALLY-SLIPPING--0.66%-TO-$202.78 even as AMD-MICRON-AND-BROADCOM-SURGED — it HOLDS-#1-AT-~$4.91T-BUT-APPLE-IS-~$263B-BACK-AND-CLOSING while REPORTING-NOTES-GOOGLE-AMAZON-AND-OTHERS-COMING-FOR-ITS-AI-CHIP-MARKET as ${CORE}`, category: 'general', related: 'NVDA' },
  { headline: `Friday July 10 00:00 UTC TSLA-FOCUS-TAPE / EV-DESK-WATCH — TESLA-CLOSED-+3.17%-AT-$406.55 after a STUNNING-UBS-PRICE-TARGET-HIKE-ON-THE-AI-BOOM and a FRESH-AI-VOTE-OF-CONFIDENCE-FROM-THE-BANK as ${CORE}`, category: 'general', related: 'TSLA' },
  { headline: `Friday July 10 00:00 UTC AMD-FOCUS-TAPE / SEMI-DESK-WATCH — AMD-LED-THE-TAPE-+5.67%-TO-$546.72 after UNVEILING-A-GIGASCALE-AI-CAMPUS-COLLABORATION and LANDING-A-MAJOR-AI-INFRASTRUCTURE-ALLIANCE — GOLDMAN-SACHS-RAISED-ITS-TARGET-TO-$640-FROM-$450-ON-JULY-5-ARGUING-THE-SERVER-CPU-STORY-IS-UNDERAPPRECIATED as ${CORE}`, category: 'general', related: 'AMD' },
  { headline: `Friday July 10 00:00 UTC MSFT-FOCUS-TAPE / MAG-7-WATCH — MICROSOFT-CLOSED-+0.27%-AT-$384.36 as it STANDS-UP-MICROSOFT-FRONTIER-COMPANY-A-NEW-$2.5B-AI-TRANSFORMATION-UNIT-ANNOUNCED-JULY-2 as ${CORE}`, category: 'general', related: 'MSFT' },
  { headline: `Friday July 10 00:00 UTC META-FOCUS-TAPE / AI-DESK-WATCH — META-JUMPED-+4.70%-TO-$631.48 after LAUNCHING-THE-PAID-MUSE-SPARK-1.1-API-AT-$1.25-PER-MILLION-INPUT-TOKENS-AND-$4.25-PER-MILLION-OUTPUT-TOKENS-WITH-$20-IN-FREE-CREDITS to take on OPENAI-AND-ANTHROPIC — SEMIANALYSIS-SEES-META-OVERTAKING-GOOGLES-FRONTIER-MODELS-WITHIN-SIX-MONTHS as ${CORE}`, category: 'general', related: 'META' },
  { headline: `Friday July 10 00:00 UTC AMZN-FOCUS-TAPE / AI-DESK-WATCH — AMAZON-CLOSED-+1.40%-AT-$247.04 as JEFF-BEZOS-DOUBLES-DOWN-ON-BLUE-ORIGIN-WITH-$2B and BANK-OF-AMERICA-WARNS-AI-COULD-CAUSE-A-HUGE-US-ELECTRICITY-SHORTFALL as ${CORE}`, category: 'general', related: 'AMZN' },
  { headline: `Friday July 10 00:00 UTC GOOGL-FOCUS-TAPE / MAG-7-WATCH — ALPHABET-SLIPPED--0.84%-TO-$358.89 holding the #3-MEGACAP-SLOT-AT-~$4.37T as SEMIANALYSIS-SAYS-META-IS-SET-TO-OVERTAKE-GOOGLES-FRONTIER-AI-MODELS-IN-SIX-MONTHS and MUSK-CALLS-ANTHROPIC-THE-CURRENT-AI-FRONTRUNNER as ${CORE}`, category: 'general', related: 'GOOGL' },
  { headline: `Friday July 10 00:00 UTC NFLX-FOCUS-TAPE / STREAMING-DESK-WATCH — NETFLIX-EDGED--0.16%-TO-$75.47 as it HEADS-INTO-Q2-EARNINGS-WITH-JEFFERIES-SEEING-LIMITED-UPSIDE-CATALYST as ${CORE}`, category: 'general', related: 'NFLX' },
  { headline: `Friday July 10 00:00 UTC COIN-FOCUS-TAPE / EXCHANGE-DESK-WATCH — COINBASE-CLOSED--0.58%-AT-$158.44 as CHIEF-LEGAL-OFFICER-PAUL-GREWAL-RESIGNS-AFTER-A-SIX-YEAR-TENURE-THAT-DEFINED-CRYPTOS-WASHINGTON-FIGHT-WITH-OTHER-LEGAL-STAFF-REASSIGNED — a NEW-VERSION-OF-THE-CRYPTO-CLARITY-ACT-MAY-DROP-AS-SOON-AS-NEXT-WEEK as ${CORE}`, category: 'general', related: 'COIN' },
  { headline: `Friday July 10 00:00 UTC MSTR-FOCUS-TAPE / TREASURY-DESK-WATCH — STRATEGY-MSTR-FINISHED-FLAT-+0.02%-AT-$93.89 as JPMORGAN-ARGUES-STRATEGYS-SELLING-IS-NOT-BITCOINS-BIGGEST-RISK-AND-POINTS-ELSEWHERE-FOR-THE-REAL-THREAT as ${CORE}`, category: 'general', related: 'MSTR' },
  { headline: `Friday July 10 00:00 UTC BTC-FOCUS-TAPE / CRYPTO-DESK-WATCH — BTC $63,188 +1.59%-BROKE-BACK-THROUGH-$63K after TRUMP-SAID-IRAN-WANT-TO-MAKE-A-DEAL-SO-BADLY — traders now eye FRIDAYS-$1.4B-DERIBIT-OPTIONS-EXPIRY while SPOT-ETFS-POSTED-A-FRESH-$85M-NET-OUTFLOW-ENDING-A-MOST-OVERWHELMING-$2.7B-SELL-OFF-STREAK and FEAR-&-GREED-STILL-READS-23-EXTREME-FEAR with GLOBAL-CRYPTO-MCAP-~$2.25T-+0.96%-24H and BTC-DOMINANCE-56.29% as ${CORE}`, category: 'general', related: 'BTC' },
  { headline: `Friday July 10 00:00 UTC ETH-FOCUS-TAPE / CRYPTO-DESK-WATCH — ETH $1,743.02 +0.06%-SITS-ALL-BUT-FLAT-NEAR-$1,743 lagging the cohort as SWIFT-ROLLS-OUT-A-BLOCKCHAIN-LEDGER-BRINGING-24/7-BANKING-TO-17-GLOBAL-BANKS-IN-A-TOKENIZED-DEPOSIT-PILOT as ${CORE}`, category: 'general', related: 'ETH' },
  { headline: `Friday July 10 00:00 UTC SOL-FOCUS-TAPE / CRYPTO-DESK-WATCH — SOL $77.94 +0.28%-EDGES-BACK-TOWARD-$78 as LATIN-AMERICAS-BIGGEST-STOCK-EXCHANGE-LISTS-OPTIONS-ON-BITCOIN-ETHER-AND-SOLANA-FUTURES as ${CORE}`, category: 'general', related: 'SOL' },
  { headline: `Friday July 10 00:00 UTC XRP-FOCUS-TAPE / CRYPTO-DESK-WATCH — XRP $1.0923 +0.17%-HOLDS-$1.09 with the WHOLE-MAJORS-COHORT-GREEN-FOR-THE-FIRST-TIME-THIS-WEEK as ${CORE}`, category: 'general', related: 'XRP' },
  { headline: `Macro Friday July 10 00:00 UTC WORLD-DESK-TAPE / IRAN-WATCH — THE-IRGC-FIRED-TEN-BALLISTIC-MISSILES-AT-JORDANS-AZRAQ-AIR-BASE-WHICH-HOSTS-THE-USAF-332ND-AIR-EXPEDITIONARY-WING and JORDAN-SAYS-IT-INTERCEPTED-EIGHT-WITH-NO-INJURIES-OR-DAMAGE — IRANS-ARMY-ALSO-CLAIMS-STRIKES-ON-US-PATRIOT-SYSTEMS-IN-KUWAIT-AN-EARLY-WARNING-SITE-IN-QATAR-AND-A-US-ARMY-FUEL-DEPOT-IN-BAHRAIN-WITH-ONE-PERSON-HURT-BY-FALLING-SHRAPNEL-IN-KUWAIT as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Friday July 10 00:00 UTC WORLD-DESK-TAPE / IRAN-WATCH — IRAN-BURIED-ITS-SLAIN-SUPREME-LEADER-AYATOLLAH-ALI-KHAMENEI-ON-THURSDAY-AT-A-SHRINE-IN-MASHHAD months after he was KILLED-IN-AN-AIRSTRIKE-ON-THE-WARS-FIRST-DAY-FEBRUARY-28 — TRUMP-MEANWHILE-SAID-ABOARD-AIR-FORCE-ONE-THAT-IRAN-WANT-TO-MAKE-A-DEAL-SO-BADLY-THEY-CALLED-A-LITTLE-WHILE-AGO as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Friday July 10 00:00 UTC WORLD-DESK-TAPE / HORMUZ-WATCH — OIL-TANKER-TRAFFIC-THROUGH-THE-STRAIT-OF-HORMUZ-IS-AT-A-NEAR-STANDSTILL with only TWO-TANKERS-TRANSITING-IN-THE-EARLY-HOURS against a ~40-A-DAY-TWO-WEEK-AVERAGE-AND-125-140-A-DAY-BEFORE-THE-CONFLICT as the QATARI-LNG-TANKER-AL-REKAYYAT-SITS-STRANDED-OFF-OMAN-AFTER-A-PROJECTILE-STRIKE as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Friday July 10 00:00 UTC WORLD-DESK-TAPE / US-DESK-WATCH — GOLDMAN-SACHS-WINS-$70B-IN-ASSET-MANAGEMENT-DEALS-WITH-VERIZON-AND-LOCKHEED-MARTIN in the fierce fight for RETIREMENT-ASSETS while JUNE-HOME-SALES-DISAPPOINT-WITH-PRICES-AT-AN-ALL-TIME-HIGH and ANTHROPIC-APPOINTS-FORMER-FED-CHAIR-BEN-BERNANKE-TO-ITS-INDEPENDENT-TRUST-WHOSE-MEMBERS-HOLD-NO-EQUITY as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Friday July 10 00:00 UTC WORLD-DESK-TAPE / UKRAINE-WATCH — RUSSIA-ATTACKED-OVERNIGHT-WITH-TWO-MISSILES-AND-ABOUT-100-DRONES and UKRAINIAN-AIR-DEFENCE-DOWNED-72-UAVS with hits recorded from the missiles and 19-DRONES as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Friday July 10 00:00 UTC WORLD-DESK-TAPE / SPORTS-WATCH — FRANCE-BEAT-MOROCCO-2-0-IN-BOSTON-ON-GOALS-FROM-MBAPPE-AND-DEMBELE-TO-REACH-THE-WORLD-CUP-SEMIFINALS-WHERE-THEY-MEET-THE-WINNER-OF-SPAIN-VS-BELGIUM-IN-DALLAS-ON-TUESDAY — MBAPPE-LEFT-WITH-AN-ANKLE-KNOCK-BUT-DESCHAMPS-IS-NOT-CONCERNED / REMAINING-QUARTERFINALS SPAIN-VS-BELGIUM-FRI-19:00-UTC-INGLEWOOD / NORWAY-VS-ENGLAND-SAT-21:00-UTC-MIAMI / ARGENTINA-VS-SWITZERLAND-SUN-01:00-UTC-KANSAS-CITY as ${CORE}`, category: 'general', related: '' },
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
