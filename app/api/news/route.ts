import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-04-29 13:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'Nvidia -3.49% in Wednesday pre-market extending Tuesday\'s OpenAI-shock leg, AMD -5.5% to ~$311 (off all-time high $345), TSM -4.43%, AVGO -3% to -6%, after WSJ report on OpenAI missed 1B WAU and revenue targets and OpenAI CFO warning the firm "may not be able to pay for compute" if sales don\'t ramp — putting the 6GW AVGO, 10GW NVDA and 10GW AMD commitment slate visibly at risk into 2pm ET FOMC and Wed AMC MSFT/META/GOOGL hyperscaler capex prints', category: 'company', related: 'NVDA' },
  { headline: 'Intel digesting Tesla 14A Terafab foundry win (Q1 already printed April 23 at $13.58B rev +7.2% YoY, EPS $0.29 beat) as Lip-Bu Tan flags "multiple customers actively evaluating" 18AP/14A in the Wednesday pre-market — foundry segment +16% YoY to $5.4B though external book still small, Tesla committing 14A for vehicles, robots and SpaceX orbital datacenters validates Arizona fab path, DCAI +22% YoY anchors agentic-CPU thesis as chip peers crater on OpenAI compute-demand reset', category: 'company', related: 'INTC' },
  { headline: 'AMD -5.5% to -6.97% in Wednesday pre-market to ~$311 (last $311.29, -$23.34 on 3.61M shares) extending Tuesday\'s -3.1% OpenAI selloff, with the WSJ-reported 6GW AVGO / 10GW NVDA / 10GW AMD OpenAI compute commitments now squarely at-risk into May 5 Q1 print; Street still looking for ~$9.8B rev (+/-$300M, ~32% YoY) and MI400 ramp cadence, but the OpenAI 6GW Instinct deal and 1GW MI450 2H 2026 deployment milestones are the new gating items', category: 'company', related: 'AMD' },
  { headline: 'Tesla ~$376 with Cybercab volume targeted this month and Ross Gerber floating Tesla-SpaceX merger as "Berkshire of AI"; Q1 already printed EPS $0.41 beat ($0.36 cons) on $22.39B rev, $25B 2026 capex envelope includes $2B SpaceX strategic stake ahead of June IPO, Optimus Gen 3 mass-market line targets late July/August Fremont start, paid robotaxi launch June 2026 — with chip-peer carnage Wednesday pre-market repricing all hyperscaler-adjacent names into the 2pm FOMC tape', category: 'company', related: 'TSLA' },
  { headline: 'Apple into Thursday April 30 Q2 print at $1.95 EPS / $109.7B rev cons (range $107.1-115.4B, iPhone ~$56.5B / Services ~$30B); first call since the Tim Cook executive-chairman / John Ternus CEO succession announcement (effective Sep 1) — Q1 LPDDR5X DRAM contract prices +130% QoQ and NAND +85-90% are the "sword of Damocles" memory-cost overhang, with Siri overhaul slipped to WWDC and Google Gemini deal status the marginal AI tells', category: 'company', related: 'AAPL' },
  { headline: 'Microsoft AMC Wednesday April 29 FY26 Q3 at $4.06 EPS / $81.43B rev cons (+16.2% YoY, guide $80.65-81.75B), MSFT $3.15T cap as of April 27 with options pricing 7% move; Azure 37-38% cc bar is the deceleration tape (Q1 $21.5B → Q2 $25.5B → Q3 implied $26.3-26.5B), a 39%+ print is positive surprise — Microsoft Cloud GM vs ~65%, Copilot monetization, and any FY26 capex revision post OpenAI-deal restructuring frame the call', category: 'company', related: 'MSFT' },
  { headline: 'Meta AMC Wednesday April 29 (5:30pm ET call) at ~$6.67 EPS / $55.5B rev cons (+31% YoY, guide $53.5-56.5B); 2026 capex guide $115-135B nearly doubles 2025\'s $72B and is the single most-watched data point — tied to Meta Superintelligence Labs ramp and core-business defense, with codename "Avocado" and "Mango" frontier-model previews, Llama family rebound positioning, and 22%+ ad-growth resilience the secondary swing items alongside the 8,000-job restructure', category: 'company', related: 'META' },
  { headline: 'Amazon AMC Thursday April 30 print at ~$1.63 EPS / ~$177B rev cons (+14% YoY, guide $173.5-178.5B; OI guide $16.5-21.5B = $5B band that gates capex absorption); AWS bar mid-20s with margin compressing to 35.7% (from 37.7% Oct view), advertising at $16-17B run-rate, $200B FY26 capex spread across AI, custom silicon, robotics and Project Kuiper LEO sats was the -8/-10% Q4 reaction driver — OI band is the new tell', category: 'company', related: 'AMZN' },
  { headline: 'Alphabet AMC Wednesday April 29 (1:30pm PT call) at $2.65 EPS / $106.9B rev cons (+18% YoY); Cloud bar 50%+ with $18.4B cons (+49.6% YoY) off Q4\'s 48%, RPO surge expected — depreciation wave from $175-185B FY26 capex (vs $91.4B 2025, majority on Cloud ML compute) compresses EPS comp, Wiz integration timing and Search resilience under AI Overviews are the two upside vectors against the capex/margin downdraft', category: 'company', related: 'GOOGL' },
  { headline: 'Bitcoin $77,178 +1.09% 24h (range $75,651-$77,921) flipping green from Tuesday\'s OpenAI-chip selloff into 2pm ET FOMC decision (100% hold at 3.5-3.75% on FedWatch, Powell 2:30pm presser, term ends May 15); BTC ETF flow tape just turned — April 27 printed -$263.18M outflow snapping the 9-day +$2B streak as short-term holders rotated, with $80K resistance the next test if Powell strikes a dovish exit-meeting tone', category: 'crypto', related: 'BTC' },
  { headline: 'Ether $2,317 +1.79% 24h (range $2,257-$2,347) leading the majors on the FOMC-day bid, reclaiming $2,300 after Tuesday\'s $2,266 low; spot ETH ETFs flipped to +$23.4M inflows April 25, Grayscale Ethereum Mini Trust staked 102,400 ETH (~$237M) via Staking ETF April 23, Aave TVL still -$28.6B (-37%) post-exploit but AAVE +3.6% from Monday on rescue traction — ETH/BTC ratio firming into Powell presser as risk reflexes engage', category: 'crypto', related: 'ETH' },
  { headline: 'XRP $1.3834 +0.09% 24h (range $1.3678-$1.4063) flat-lining at $1.38 after Tuesday\'s -1.02% leg, with $1.40 still the immediate cap; April spot XRP ETF inflows printing $81.6M — biggest monthly nets of 2026, cumulative ETF base $1.29B across Bitwise/21Shares/Canary post-SEC approvals, RLUSD stablecoin market cap $1.58B with XRP forming the bridge-asset gas layer, $89.1B market cap holds #4 rank into the FOMC tape', category: 'crypto', related: 'XRP' },
  { headline: 'Solana $84.24 +0.73% 24h (range $82.98-$85.55) participating in the FOMC-day risk bid above Tuesday\'s $83.63 fallback; Israel\'s Capital Market Authority formally approved BILS (1:1 ILS-pegged stablecoin from Bits of Gold) on Solana April 28 after 2-year live testing — sub-400ms settlement, EY-audited segregated reserves, Fireblocks custody, QEDIT ZK privacy layer, validating SOL\'s institutional stablecoin rail thesis as Powell decision and Mag-7 prints set the macro tape', category: 'crypto', related: 'SOL' },
  { headline: 'Brent tops $114.70 (June +3.1%) and WTI hovers near $100 on Wednesday as Trump issues fresh threat to Iran on social media, US-Iran talks "stalled" with Hormuz still effectively closed (IEA: "largest supply shock on record" given strait carries ~20% of global oil trade) — UAE\'s May 1 OPEC exit (first major departure in six decades, capacity ~4 mbpd vs ~3 mbpd quota) compounds the supply geometry shift as Riyadh weighs response and Russia/Iran-Iraq export reroute negotiations stall', category: 'general', related: '' },
  { headline: 'FOMC announces decision 2pm ET Wednesday with 100% probability of hold at 3.5-3.75% per CME FedWatch — third consecutive pause, Powell\'s likely final meeting as chair (term ends May 15), 2:30pm presser the marquee event; Fed confronting rising inflation from oil-shock pass-through (Brent $114+), lackluster jobs tape, Iran-war fallout, and tariff overhang — Warsh widely floated as successor pick, narrative-shift on rate-path forward guidance the swing factor for risk assets', category: 'general', related: '' },
  { headline: 'S&P 500 fades Tuesday\'s OpenAI-shock close (7,138.80 / Nasdaq 24,663.80) as Wednesday pre-market sees chips deeper red (NVDA -3.49%, AMD -5.5 to -6.97%, TSM -4.43%, AVGO -3 to -6%) and Brent $114+ lifts energy into 2pm ET FOMC (100% hold pegged) plus MSFT/META/GOOGL AMC print night — the three Wed AMC + AAPL/AMZN Thursday Mag-7 prints represent ~44% of S&P cap with combined ~$600B 2026 AI capex envelope the marginal market mover', category: 'general', related: '' },
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
