import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Shared macro/market/crypto/world tail used across the fallback tape (2026-07-10 12:00 UTC)
const CORE = 'FRIDAY-JULY-10 12:00-UTC-PRE-BELL — US-CASH-REOPENS-TODAY-13:30-UTC-WITH-FUTURES-MIXED S&P-500-FUT 7,584.75 -0.05% / DOW-FUT 52,837 +0.14% / NASDAQ-100-FUT 29,831.75 -0.35% / VIX 15.90-AS-OF-11:47-UTC + THURSDAY-JULY-9-CASH-CLOSE DOW 52,487.41 +139.02 +0.27% / S&P-500 7,543.64 +60.93 +0.81% / NASDAQ 26,206.89 +336.24 +1.30% + RECORD-CHIP-IPO SK-HYNIX-RAISED-$26.5B-PRICING-177.9M-ADS-AT-$149-WITH-DEMAND-RUNNING-7X-THE-SHARES-ON-OFFER — THE-LARGEST-EVER-US-LISTING-BY-A-FOREIGN-COMPANY-AND-IT-DEBUTS-ON-NASDAQ-TODAY-UNDER-SKHYV-BEFORE-REGULAR-TRADING-AS-SKHY-ON-MONDAY / KOSPI-+2.5%-ON-THE-HALO + ASIA-CLOSE NIKKEI 68,557.73 +1.2% / HANG-SENG 24,175.12 +0.6% / SHANGHAI 3,996.16 -1.0% + EUROPE-MIDDAY FTSE 10,478.98 +0.1% / DAX 25,082.58 -0.1% / CAC 8,322.31 -0.1% + IRAN-CEASEFIRE-HAS-COLLAPSED TRUMP-SAYS-THE-MID-JUNE-MEMORANDUM-OF-UNDERSTANDING-IS-OVER-WHILE-SAYING-HE-DOES-NOT-WANT-A-RETURN-TO-FULL-WAR / THE-US-STRUCK-IRAN-A-SECOND-STRAIGHT-NIGHT-HITTING-SOUTH-PARS-GAS-INFRASTRUCTURE-NEAR-ASALUYEH-AND-IRNA-SAYS-A-SECTION-OF-THE-TEHRAN-MASHHAD-RAILWAY-WAS-BOMBED / IRANS-GOVERNMENT-PRESS-OFFICE-SAYS-AT-LEAST-14-KILLED-AND-78-INJURED / REGIONAL-SOURCES-TELL-CNN-PAKISTAN-AND-QATAR-ARE-WORKING-TO-RESTART-TALKS + OIL-TURNED-BACK-UP BRENT-~$77.06-+1.0% / WTI-~$72.63-+0.8%-AFTER-AN-EARLY-EUROPEAN-DIP-AS-HORMUZ-TRAFFIC-SLOWED-AGAIN / GOLD-~$4,102--0.5% / DXY 100.85 / US-10-YEAR 4.55% + CRYPTO-COHORT-LIVE-FRI-JULY-10-12:03-UTC BTC $64,386.01 +2.62% / ETH $1,799.87 +3.27% / SOL $79.24 +2.14% / XRP $1.1112 +1.65% — GLOBAL-CRYPTO-MCAP-~$2.25T-+1.9%-24H / BTC-DOMINANCE-56.3% / FEAR-&-GREED-23-EXTREME-FEAR-EVEN-AS-THE-WHOLE-COHORT-RALLIES + MEGACAP-CROWN NVIDIA-#1-AT-~$4.911T-ON-THURSDAYS-CLOSE / APPLE-#2-AT-~$4.645T-A-~$266B-GAP-REBUILT-FROM-SHARES-OUTSTANDING-TIMES-PRICE / ALPHABET-#3-AT-~$4.378T + RATE-PATH-WATCH FED-HOLDING-3.50%-3.75%-UNDER-CHAIR-KEVIN-WARSH / NO-US-DATA-RELEASES-OR-FED-SPEAKERS-SCHEDULED-FRIDAY / JUNE-CPI-LANDS-MONDAY-JULY-14-WITH-THE-CLEVELAND-FED-NOWCAST-AT-~3.96%-Y/Y-AFTER-MAYS-4.2% / NEXT-FOMC-JULY-28-29 + UKRAINE-STRUCK-DEEP-INTO-RUSSIA RUSSIAS-DEFENCE-MINISTRY-SAYS-IT-DOWNED-376-UKRAINIAN-DRONES-OVERNIGHT-AS-THE-ILSKY-OIL-REFINERY-BURNED-IN-KRASNODAR-AND-FUEL-DEPOTS-AND-THE-PORT-OF-TAGANROG-CAUGHT-FIRE-IN-ROSTOV + FIFA-WORLD-CUP-2026-FRANCE-BEAT-MOROCCO-2-0-IN-BOSTON-ON-GOALS-FROM-MBAPPE-60-AND-DEMBELE-66-TO-REACH-TUESDAYS-SEMIFINAL-IN-DALLAS / THREE-QUARTERFINALS-ARE-STILL-UNPLAYED SPAIN-VS-BELGIUM-TODAY-19:00-UTC-AT-SOFI-STADIUM-INGLEWOOD / NORWAY-VS-ENGLAND-SAT-21:00-UTC-MIAMI / ARGENTINA-VS-SWITZERLAND-SUN-01:00-UTC-KANSAS-CITY.';

// Fallback headlines when API fails or no key (updated 2026-07-10 12:00 UTC)
const FALLBACK_NEWS = [
  { headline: `Friday July 10 12:00 UTC PRE-BELL-TAPE / TWO-TAPES-AT-ONCE — US-CASH-REOPENS-13:30-UTC-WITH-FUTURES-MIXED S&P-500-FUT -0.05% / DOW-FUT +0.14% / NASDAQ-100-FUT -0.35% as a RECORD-CHIP-IPO-MEETS-A-COLLAPSED-IRAN-CEASEFIRE — SK-HYNIX-RAISED-$26.5B-AND-DEBUTS-ON-NASDAQ-TODAY while the US-STRUCK-IRAN-A-SECOND-STRAIGHT-NIGHT — OIL-TURNED-BACK-UP-AND-BITCOIN-CLEARED-$64K with ${CORE}`, category: 'general', related: '' },
  { headline: `Friday July 10 12:00 UTC IPO-DESK-TAPE / SK-HYNIX-WATCH — THE-LARGEST-US-LISTING-EVER-BY-A-FOREIGN-COMPANY-PRICED-177.9M-ADS-AT-$149-TO-RAISE-$26.5B-WITH-DEMAND-AT-SEVEN-TIMES-THE-SHARES-ON-OFFER — it TOPS-ALIBABAS-US-IPO-AND-RANKS-SECOND-GLOBALLY-BEHIND-SPACEXS-$85.7B-JUNE-NASDAQ-LISTING / TRADES-TODAY-AS-SKHYV-THEN-SKHY-FROM-MONDAY / PROCEEDS-GO-TO-MEMORY-CAPACITY-FOR-THE-AI-BUILDOUT / KOSPI-CLOSED-+2.5% as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Friday July 10 12:00 UTC MACRO-TAPE / RATE-PATH-WATCH — NO-US-DATA-RELEASES-OR-FED-SPEAKERS-ARE-SCHEDULED-FRIDAY leaving JUNE-CPI-ON-MONDAY-JULY-14-AS-THE-NEXT-TEST — the CLEVELAND-FED-NOWCAST-PUTS-JUNE-HEADLINE-CPI-NEAR-3.96%-Y/Y-AFTER-MAYS-4.2%-THE-HIGHEST-SINCE-APRIL-2023-WITH-CORE-AT-2.9% — the FED-HOLDS-3.50%-3.75%-UNDER-CHAIR-KEVIN-WARSH and MEETS-JULY-28-29-SEEING-JUNE-CPI-AND-JUNE-PCE-FIRST as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Friday July 10 12:00 UTC ENERGY-DESK-TAPE / OIL-REVERSAL-WATCH — CRUDE-DIPPED-IN-THE-EUROPEAN-MORNING-ON-TALK-OF-US-IRAN-NEGOTIATIONS-THEN-TURNED-BACK-UP-INTO-THE-US-PRE-BELL BRENT-~$77.06-+1.0% and WTI-~$72.63-+0.8% as STRAIT-OF-HORMUZ-TANKER-TRAFFIC-SLOWED-AGAIN — the WAR-PREMIUM-DID-NOT-KEEP-UNWINDING-IT-FIRMED-BACK / GOLD-EASED-TO-~$4,102--0.5% / DXY 100.85 / US-10-YEAR 4.55% as ${CORE}`, category: 'general', related: '' },
  { headline: `Friday July 10 12:00 UTC NVDA-FOCUS-TAPE / SEMI-DESK-WATCH — NVIDIA-TRADES-PRE-BELL-AT-$201.30--0.73% after SLIPPING--0.66%-TO-$202.78-THURSDAY-AND-SITTING-OUT-ITS-OWN-SECTORS-RALLY — it HOLDS-#1-AT-~$4.911T-WITH-APPLE-~$266B-BACK — TRENDFORCE-REPORTS-CHINA-WILL-PERMIT-H200-IMPORTS-BUT-CAP-THEM-UNDER-200,000-CHIPS-RESERVED-FOR-TRAINING-WITH-INFERENCE-PUSHED-TO-HUAWEI-AND-BUYERS-NAMED-AS-ALIBABA-BYTEDANCE-AND-DEEPSEEK as ${CORE}`, category: 'general', related: 'NVDA' },
  { headline: `Friday July 10 12:00 UTC AAPL-FOCUS-TAPE / SUPPLY-DESK-WATCH — APPLE-TRADES-PRE-BELL-AT-$314.41--0.57% after CLOSING-+0.90%-AT-$316.22 — it SITS-#2-AT-~$4.645T-BEHIND-NVIDIAS-~$4.911T — APPLES-OWN-NEWSROOM-CONFIRMS-MORE-THAN-$30B-OF-SPEND-WITH-BROADCOM-FOR-OVER-15-BILLION-US-MADE-CHIPS-PLUS-A-$1.5B-FORT-COLLINS-EXPANSION-WITH-TIM-COOK-CALLING-IT-A-NEW-PHASE-OF-THE-PARTNERSHIP / JUNE-QUARTER-EARNINGS-LAND-THURSDAY-JULY-30 as ${CORE}`, category: 'general', related: 'AAPL' },
  { headline: `Friday July 10 12:00 UTC TSLA-FOCUS-TAPE / EV-DESK-WATCH — TESLA-IS-ALL-BUT-FLAT-PRE-BELL-AT-$407.00-+0.11% after CLOSING-+3.17%-AT-$406.55 — its Q2-DELIVERY-RECORD-OF-480,126-VEHICLES-UP-25%-YEAR-ON-YEAR-AND-ROUGHLY-74,000-ABOVE-CONSENSUS-WAS-REPORTED-BACK-ON-JULY-2-DRIVEN-BY-EUROPE-AND-CHINA — it REMAINS-BELOW-THE-ALL-TIME-497,099-SET-IN-Q3-2025 as ${CORE}`, category: 'general', related: 'TSLA' },
  { headline: `Friday July 10 12:00 UTC AMD-FOCUS-TAPE / SEMI-DESK-WATCH — AMD-GIVES-A-LITTLE-BACK-PRE-BELL-AT-$543.75--0.54% after LEADING-THURSDAYS-TAPE-+5.67%-TO-$546.72-ON-A-GIGASCALE-AI-CAMPUS-COLLABORATION — GOLDMAN-SACHS-ANALYST-JAMES-SCHNEIDER-RAISED-HIS-TARGET-TO-$640-FROM-$450-IN-EARLY-JULY-ARGUING-THE-SERVER-CPU-STORY-IS-UNDERAPPRECIATED as ${CORE}`, category: 'general', related: 'AMD' },
  { headline: `Friday July 10 12:00 UTC META-FOCUS-TAPE / AI-DESK-WATCH — META-IS-THE-BIGGEST-MEGACAP-GAINER-PRE-BELL-AT-~$652.41-UP-ABOUT-3.4% after JUMPING-+4.70%-TO-$631.48-THURSDAY — METAS-OWN-BLOG-CONFIRMS-THE-LAUNCH-OF-MUSE-SPARK-1.1-AND-A-PAID-META-MODEL-API-IN-PUBLIC-PREVIEW-TO-TAKE-ON-OPENAI-AND-ANTHROPIC / IT-IS-ALSO-BUILDING-A-1-GIGAWATT-ALBERTA-DATA-CENTER / SEMIANALYSIS-PROJECTS-META-OVERTAKING-GOOGLES-FRONTIER-MODELS-WITHIN-SIX-MONTHS-THOUGH-ITS-REPORT-CONCEDES-MUSE-SPARK-STILL-LAGS-SOME-RIVALS-TODAY as ${CORE}`, category: 'general', related: 'META' },
  { headline: `Friday July 10 12:00 UTC MSFT-FOCUS-TAPE / MAG-7-WATCH — MICROSOFT-FIRMS-PRE-BELL-TO-$386.77-+0.63% after CLOSING-+0.27%-AT-$384.36 — NO-FRESH-COMPANY-CATALYST-LANDED-OVERNIGHT as ${CORE}`, category: 'general', related: 'MSFT' },
  { headline: `Friday July 10 12:00 UTC AMZN-FOCUS-TAPE / MAG-7-WATCH — AMAZON-IS-FLAT-PRE-BELL-AT-$246.94--0.04% after CLOSING-+1.40%-AT-$247.04 as ${CORE}`, category: 'general', related: 'AMZN' },
  { headline: `Friday July 10 12:00 UTC GOOGL-FOCUS-TAPE / MAG-7-WATCH — ALPHABET-EASES-PRE-BELL-TO-$357.40--0.42% after SLIPPING--0.84%-TO-$358.89-THURSDAY — it HOLDS-THE-#3-MEGACAP-SLOT-AT-~$4.378T as ${CORE}`, category: 'general', related: 'GOOGL' },
  { headline: `Friday July 10 12:00 UTC NFLX-FOCUS-TAPE / STREAMING-DESK-WATCH — NETFLIX-IS-FLAT-PRE-BELL-AT-$75.60-+0.17% after EDGING--0.16%-TO-$75.47 — the SUB-$100-TAPE-REFLECTS-THE-10-FOR-1-SPLIT-EFFECTIVE-NOVEMBER-17-2025-NOT-A-COLLAPSE — Q2-EARNINGS-ARE-CONFIRMED-FOR-THURSDAY-JULY-16 as ${CORE}`, category: 'general', related: 'NFLX' },
  { headline: `Friday July 10 12:00 UTC COIN-FOCUS-TAPE / EXCHANGE-DESK-WATCH — COINBASE-JUMPS-PRE-BELL-TO-$165.67-+4.56% after CLOSING--0.58%-AT-$158.44 — CHIEF-LEGAL-OFFICER-PAUL-GREWAL-STEPS-DOWN-EFFECTIVE-JULY-31-STAYING-ON-AS-AN-ADVISER-THROUGH-OCTOBER-31-WITH-MOLLY-ABRAHAM-EXPECTED-AS-GENERAL-COUNSEL — COINDESK-REPORTS-A-NEW-COMBINED-VERSION-OF-THE-CRYPTO-CLARITY-ACT-MAY-DROP-AS-SOON-AS-NEXT-WEEK as ${CORE}`, category: 'general', related: 'COIN' },
  { headline: `Friday July 10 12:00 UTC MSTR-FOCUS-TAPE / TREASURY-DESK-WATCH — STRATEGY-MSTR-IS-THE-BIGGEST-SINGLE-NAME-PRE-BELL-MOVER-AT-$98.49-+4.90% after FINISHING-FLAT-+0.02%-AT-$93.89 — BARCLAYS-INITIATED-COVERAGE-AT-OVERWEIGHT-WITH-A-$130-TARGET-ON-JULY-8 — JPMORGANS-PANIGIRTZOGLOU-ARGUES-STRATEGYS-SELLING-IS-NOT-BITCOINS-BIGGEST-STRUCTURAL-RISK-AND-THAT-TRADFI-MOVING-ONTO-PRIVATE-PERMISSIONED-BLOCKCHAINS-IS-THE-REAL-THREAT as ${CORE}`, category: 'general', related: 'MSTR' },
  { headline: `Friday July 10 12:00 UTC BTC-FOCUS-TAPE / CRYPTO-DESK-WATCH — BTC $64,386.01 +2.62%-CLEARED-$64K-AND-LEADS-A-FULLY-GREEN-COHORT — FRIDAYS-DERIBIT-EXPIRY-SETTLED-AT-08:00-UTC-WITH-ROUGHLY-$1.75B-OF-BTC-AND-ETH-OPTIONS-RUNNING-OFF-AT-A-BTC-MAX-PAIN-OF-$62,000-COVERING-ONLY-ABOUT-7%-OF-OPEN-INTEREST-SO-IMPACT-WAS-LIMITED-AND-SPOT-NOW-TRADES-ABOVE-IT — SPOT-BTC-ETFS-SAW-A-NET-OUTFLOW-THURSDAY-OF--$95.3M-PER-FARSIDE-ENDING-A-THREE-DAY-~$510M-INFLOW-STREAK — FEAR-&-GREED-STILL-READS-23-EXTREME-FEAR-THOUGH-UP-FROM-22 as ${CORE}`, category: 'general', related: 'BTC' },
  { headline: `Friday July 10 12:00 UTC ETH-FOCUS-TAPE / CRYPTO-DESK-WATCH — ETH $1,799.87 +3.27%-IS-THE-COHORT-LEADER-ON-THE-DAY-PUSHING-BACK-TOWARD-$1,800-AFTER-SITTING-DEAD-FLAT-TWELVE-HOURS-AGO — SWIFT-CONFIRMED-FROM-BRUSSELS-ON-THURSDAY-THAT-ITS-PRODUCTION-READY-BLOCKCHAIN-LEDGER-IS-LIVE-WITH-17-BANKS-ACROSS-SIX-CONTINENTS-INCLUDING-HSBC-CITI-UBS-BNY-AND-BNP-PARIBAS-IN-A-TOKENIZED-DEPOSIT-PILOT-FOR-24/7-CROSS-BORDER-PAYMENTS as ${CORE}`, category: 'general', related: 'ETH' },
  { headline: `Friday July 10 12:00 UTC SOL-FOCUS-TAPE / CRYPTO-DESK-WATCH — SOL $79.24 +2.14%-PUSHES-BACK-TOWARD-$80 — BRAZILS-B3-LATIN-AMERICAS-LARGEST-EXCHANGE-LAUNCHED-OPTIONS-ON-BITCOIN-ETHER-AND-SOLANA-FUTURES-ON-JULY-6-ACROSS-SIX-INSTRUMENTS-THAT-SETTLE-INTO-FUTURES-RATHER-THAN-SPOT as ${CORE}`, category: 'general', related: 'SOL' },
  { headline: `Friday July 10 12:00 UTC XRP-FOCUS-TAPE / CRYPTO-DESK-WATCH — XRP $1.1112 +1.65%-RECLAIMS-$1.11 with the WHOLE-MAJORS-COHORT-GREEN-AND-GLOBAL-CRYPTO-MCAP-~$2.25T-+1.9%-OVER-24H while BTC-DOMINANCE-HOLDS-56.3% as ${CORE}`, category: 'general', related: 'XRP' },
  { headline: `Macro Friday July 10 12:00 UTC WORLD-DESK-TAPE / IRAN-WATCH — THE-JUNE-CEASEFIRE-HAS-COLLAPSED — TRUMP-SAID-AT-THE-NATO-SUMMIT-IN-ANKARA-THAT-THE-MEMORANDUM-OF-UNDERSTANDING-IS-OVER-WHILE-INSISTING-HE-DOES-NOT-WANT-A-RETURN-TO-FULL-WAR — the US-STRUCK-IRAN-FOR-A-SECOND-STRAIGHT-NIGHT-HITTING-SOUTH-PARS-GAS-INFRASTRUCTURE-NEAR-ASALUYEH-WITH-IRNA-REPORTING-A-BOMBED-SECTION-OF-THE-TEHRAN-MASHHAD-RAILWAY — IRANS-GOVERNMENT-PRESS-OFFICE-SAYS-AT-LEAST-14-KILLED-AND-78-INJURED as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Friday July 10 12:00 UTC WORLD-DESK-TAPE / IRAN-DIPLOMACY-WATCH — TRUMP-SAYS-IRAN-CALLED-A-LITTLE-WHILE-AGO-AND-WANT-TO-MAKE-A-DEAL-SO-BADLY-BUT-IRAN-HAS-NOT-CONFIRMED-ANY-CALL-AND-ITS-FOREIGN-MINISTRY-CALLED-THE-STRIKES-A-VIOLATION-AND-VOWED-TO-PUNISH-THE-AGGRESSORS — REGIONAL-SOURCES-TELL-CNN-THAT-PAKISTAN-AND-QATAR-ARE-WORKING-TO-BRING-BOTH-SIDES-BACK-TO-THE-TABLE — IRAN-BURIED-ITS-SLAIN-SUPREME-LEADER-ALI-KHAMENEI-THIS-WEEK-AT-A-SHRINE-IN-MASHHAD-MONTHS-AFTER-HE-WAS-KILLED-ON-THE-WARS-FIRST-DAY-FEBRUARY-28-HIS-SON-MOJTABA-HAVING-BEEN-NAMED-SUPREME-LEADER-BACK-IN-MARCH as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Friday July 10 12:00 UTC WORLD-DESK-TAPE / HORMUZ-WATCH — THE-STRAIT-IS-EFFECTIVELY-CLOSED-ON-DAY-131 — TRACKER-STRAITS-LIVE-SHOWS-ONLY-ABOUT-EIGHT-TANKERS-IN-TRANSIT-AGAINST-AN-88-A-DAY-BASELINE-AND-ROUGHLY-465-VESSELS-ANCHORED-OR-STOPPED-OVER-THE-PAST-WEEK — VLCC-WAR-RISK-COVER-RUNS-NEAR-$2.5M-A-TRANSIT-ABOUT-EIGHT-TIMES-PRE-CRISIS — the QATARI-LNG-TANKER-AL-REKAYYAT-HIT-ON-JULY-7-NEAR-THE-STRAIT-ENTRANCE-AWAITS-SALVAGE-OFF-OMAN-WITH-ITS-CREW-EVACUATED-AND-ITS-LNG-TANKS-INTACT as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Friday July 10 12:00 UTC WORLD-DESK-TAPE / UKRAINE-WATCH — THE-WAR-RAN-THE-OTHER-DIRECTION-OVERNIGHT — RUSSIAS-DEFENCE-MINISTRY-SAYS-IT-DOWNED-376-UKRAINIAN-DRONES-ACROSS-BELGOROD-BRYANSK-KURSK-ROSTOV-TVER-MOSCOW-KRASNODAR-AND-CRIMEA — the ILSKY-OIL-REFINERY-CAUGHT-FIRE-IN-KRASNODAR-KRAI-WHILE-FUEL-DEPOTS-AND-THE-PORT-OF-TAGANROG-BURNED-IN-ROSTOV-AND-MOSCOW-AREA-AIRPORTS-INCLUDING-DOMODEDOVO-SAW-DISRUPTION-WITH-16-DRONES-DOWNED-ON-APPROACH-BY-07:48 as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Friday July 10 12:00 UTC WORLD-DESK-TAPE / CORPORATE-AND-DISASTER-WATCH — DELTA-AIR-LINES-BEAT-ESTIMATES-BUT-FLAGGED-HIGH-FUEL-COSTS while ASTRAZENECA-FELL-MORE-THAN-9%-IN-EUROPE-AFTER-ITS-WAINUA-DRUG-MISSED-ITS-PRIMARY-CARDIOVASCULAR-DEATH-ENDPOINT — and the DEATH-TOLL-FROM-VENEZUELAS-JUNE-24-TWIN-EARTHQUAKES-HAS-RISEN-TO-3,889-WITH-16,740-INJURED as ${CORE}`, category: 'general', related: '' },
  { headline: `Macro Friday July 10 12:00 UTC WORLD-DESK-TAPE / SPORTS-WATCH — FRANCE-BEAT-MOROCCO-2-0-AT-GILLETTE-STADIUM-ON-GOALS-FROM-MBAPPE-60-HIS-EIGHTH-OF-THE-TOURNAMENT-AND-DEMBELE-66-TO-REACH-A-THIRD-STRAIGHT-SEMIFINAL-IN-DALLAS-ON-TUESDAY — MBAPPE-WHO-ALSO-MISSED-A-FIRST-HALF-PENALTY-LEFT-WITH-AN-ANKLE-KNOCK-BUT-CALLS-HIMSELF-ALL-GOOD-AND-DESCHAMPS-IS-NOT-CONCERNED / THE-OTHER-THREE-QUARTERFINALS-HAVE-NOT-BEEN-PLAYED SPAIN-VS-BELGIUM-KICKS-OFF-TODAY-19:00-UTC-AT-SOFI-STADIUM-WITH-SPAIN-YET-TO-CONCEDE-ALL-TOURNAMENT / NORWAY-VS-ENGLAND-SAT-21:00-UTC-IN-MIAMI-HAALANDS-SEVEN-GOALS-AGAINST-KANES-SIX / ARGENTINA-VS-SWITZERLAND-SUN-01:00-UTC-IN-KANSAS-CITY-WITH-MESSI-LEADING-THE-GOLDEN-BOOT-ON-EIGHT as ${CORE}`, category: 'general', related: '' },
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
