import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-04-29 01:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'Nvidia -3% Tuesday with Broadcom -3.3%, AMD -3.1%, Arm -6.7%, Oracle -4% and SoftBank -10% in Tokyo after WSJ report flags OpenAI missed 1B weekly-active and revenue targets, denting the $100B Nvidia/OpenAI commitment narrative; stock holds ~$201 / ~$4.9T cap into Wednesday hyperscaler capex prints (MSFT/META/GOOGL/AMZN ~$600B combined 2026 AI capex) as KeyBanc cuts Vera Rubin 2026 build to 1.5M units (from 2M) on HBM4 SK Hynix/Micron certification slip, racks revised to ~6,000 from 12-14k', category: 'company', related: 'NVDA' },
  { headline: 'Intel digesting Tesla 14A Terafab foundry win (Q1 print April 23 already came in at $13.58B revenue +7.2% YoY, EPS $0.29 beat) as Lip-Bu Tan flags "multiple customers actively evaluating" 18AP/14A; foundry segment +16% YoY to $5.4B though external book still small, Tesla committing 14A for vehicles, robots and SpaceX orbital datacenters validates Arizona fab path, DCAI segment +22% YoY anchors agentic-CPU thesis', category: 'company', related: 'INTC' },
  { headline: 'AMD -3.1% Tuesday in OpenAI-led chip selloff after touching all-time high $345 (post-DA Davidson upgrade to Buy / $375 PT on Intel read-through) into May 5 Q1 print; Street looking for ~$9.8B rev (+/-$300M) implying ~32% YoY, watching MI400 ramp cadence and OpenAI 6GW Instinct deal milestones with first 1GW MI450 deployment slated 2H 2026, Meta shipment schedule in focus', category: 'company', related: 'AMD' },
  { headline: 'Tesla ~$376 with Cybercab volume targeted this month and Ross Gerber floating Tesla-SpaceX merger as "Berkshire of AI"; Q1 already printed EPS $0.41 beat ($0.36 cons) on $22.39B rev, $25B 2026 capex envelope includes $2B SpaceX strategic stake ahead of June IPO, Optimus Gen 3 mass-market line targets late July/August Fremont start, paid robotaxi launch June 2026 with consensus 12mo PT $398-406', category: 'company', related: 'TSLA' },
  { headline: 'Apple into Thursday April 30 Q2 print at $1.95 EPS / $109.7B rev consensus (range $107.1-115.4B); first call since April Tim Cook executive-chairman / John Ternus CEO succession announcement (effective Sep 1, Ternus 25-year hardware-engineering SVP), analysts framing it as Cook\'s penultimate "swan song" quarter with WWDC AI roadmap and tariff/memory cost overhang ("sword of Damocles") the marginal market-movers', category: 'company', related: 'AAPL' },
  { headline: 'Microsoft Wednesday April 29 FY26 Q3 at ~$4.07 EPS / $80.65-81.75B guide ($81.4B cons, +16% YoY) with Azure 37-38% cc growth bar (vs Q2 39%, prior-quarter 40% — the deceleration tape); options pricing 7% move, three swing factors are Azure print vs guide, Microsoft Cloud GM vs ~65%, and any FY26 ~$146B AI capex revision following the OpenAI deal restructuring already digested', category: 'company', related: 'MSFT' },
  { headline: 'Meta Wednesday April 29 close at ~$6.67 EPS / $55.5B rev cons (+31% YoY, guide $53.5-56.5B); 2026 capex guide $115-135B nearly doubles 2025\'s $72B as Llama 5 (600B+ params, recursive self-improvement, launched early April) tries to catch a model family currently ranked last among major US labs, "Avocado" frontier model and 22%+ ad-growth defense are the call\'s gating items alongside the 8,000-job restructure', category: 'company', related: 'META' },
  { headline: 'Amazon Wednesday April 29 print at ~$1.63 EPS / ~$177B rev cons (+14% YoY, guide $173.5-178.5B; OI guide $16.5-21.5B); AWS bar is reaccel from Q4 ~24% with BofA/KeyBanc still up at 28-30%, Jassy framing $200B 2026 capex (+60% YoY) as backed by "substantial customer commitments monetizing 2027-2028" — advertising and AWS are the two deltas inside the OI band', category: 'company', related: 'AMZN' },
  { headline: 'Alphabet Wednesday April 29 (call 1:30pm PT) at ~$2.63 EPS / ~$106.9B rev cons (+19% YoY, EPS -6.4% YoY despite top-line ramp — that gap is the scrutiny zone); GCP bar is 48% (Q4 benchmark) with cloud backlog already $240B (+55% sequential) per Pichai prior call, Search resilience under AI Overviews and any move on $175-185B FY26 capex (Broadcom TPU, Cadence/Marvell tie-ups) frame the print', category: 'company', related: 'GOOGL' },
  { headline: 'Bitcoin $76,490 (-1.12% 24h, range $75,651-$77,403) on Wednesday Asia tape after Tuesday\'s OpenAI-shock chip selloff and into FOMC decision day (3.5-3.75% hold pegged 100% on FedWatch, Powell\'s likely-final meeting); spot BTC ETFs printed +$2B inflows over 8 days through April 24 with April MTD nets $2.43B though April 13 saw $325.8M one-day outflow as short-term holders rotated', category: 'crypto', related: 'BTC' },
  { headline: 'Ether $2,291 -0.65% 24h (range $2,257-$2,309) holding above Tuesday\'s $2,266 fallback low into Wednesday\'s FOMC / Mag-7 print night; spot ETH ETFs flipped to +$23.4M inflows April 25 reversing earlier outflows, Grayscale Ethereum Mini Trust staked 102,400 ETH (~$237M) via its Staking ETF April 23, Aave deposits still down ~$28.6B (-$17.2B / -37%) post-exploit though AAVE token +3.6% from Monday on rescue traction', category: 'crypto', related: 'ETH' },
  { headline: 'XRP $1.3834 -1.02% 24h (range $1.3678-$1.3993) holds below $1.40 with bearish near-term structure on high volume; April spot XRP ETF inflows print $81.6M — biggest monthly nets of 2026 with cumulative ETF base $1.29B (Bitwise, 21Shares, Canary post-SEC approvals), RLUSD stablecoin market cap $1.58B forming "stablecoin-utility hybrid" with XRP as bridge-asset gas, market cap $89.1B (#4 rank)', category: 'crypto', related: 'XRP' },
  { headline: 'Solana $84.05 -0.87% 24h (range $82.98-$84.86) firmer than Tuesday $83.63 fallback into FOMC / Mag-7 superweek; Israel\'s Capital Market Authority formally approved BILS (1:1 ILS-pegged stablecoin from Bits of Gold) on Solana April 28 after 2-year live testing — sub-400ms settlement, EY-audited segregated reserves, Fireblocks custody, QEDIT zero-knowledge privacy layer, validating Solana\'s institutional stablecoin rail thesis', category: 'crypto', related: 'SOL' },
  { headline: 'UAE confirms exit from OPEC and OPEC+ effective May 1 — first major exit in nearly six decades, strips cartel of #3 producer (UAE targeting 5M b/d capacity by 2027); Brent rips to ~$113, WTI back above $100 first time since April 10 as Iran war / Hormuz disruption reshapes export geometry — Iran\'s missile-and-drone attacks on UAE plus Hormuz shipping threats catalyzed the break with Riyadh', category: 'general', related: '' },
  { headline: 'Iran proposes interim deal reopening Hormuz in exchange for US ending Iranian-port blockade while deferring nuclear/ballistic talks — Trump told advisers he is "not satisfied" with the latest suggestion; Pakistan-mediated April 8 ceasefire still in extended-effect with Hormuz and the nuclear program the two sticking points, UN calling for Hormuz reopen while Iranian army says it remains "in war situation"', category: 'general', related: '' },
  { headline: 'S&P 500 closes Tuesday -0.49% at 7,138.80 and Nasdaq -0.9% at 24,663.80 (off Monday\'s record 7,173.91 / 24,887.10) as WSJ OpenAI miss-targets report sinks chips (NVDA -3, AMD -3.1, AVGO -3.3, ARM -6.7, ORCL -4, SoftBank -10 in Tokyo) and Brent ~$113 lifts oils into Wednesday\'s 2pm ET FOMC decision (100% hold at 3.5-3.75% on FedWatch, Powell\'s likely final meeting) plus MSFT/META/GOOGL/AMZN print night — the 5 Mag-7 names on deck Wed/Thu represent ~44% of S&P cap', category: 'general', related: '' },
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
