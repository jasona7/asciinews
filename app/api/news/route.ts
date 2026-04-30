import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-04-30 01:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'Nvidia $215.12 holds the line into AMC Mag-7 prints as MSFT/META/GOOGL/AMZN unveil ~$725B 2026 hyperscaler capex envelope (MSFT $190B incl. $25B memory-cost surcharge, GOOGL $180-190B raised from $175-185B, AMZN $200B reaffirmed, META $125-145B raised from $115-135B), Azure 40% cc print (vs 37-38% guide) and Cloud 63% (vs 50%+ bar) directly rebut the OpenAI compute-demand reset thesis from Tuesday\'s selloff and Wednesday pre-market chip washout, with NVDA capturing the lion\'s share of the incremental envelope', category: 'company', related: 'NVDA' },
  { headline: 'Intel $85.98 fresh all-time high (eclipsed August 2000 peak) +27% in 5 sessions on Tesla 14A Terafab confirmation as "first major external customer" — Lip-Bu Tan flagging "multiple customers actively evaluating" 18AP/14A, foundry segment +16% YoY anchoring agentic-CPU thesis as MSFT $190B and GOOGL $180-190B FY26 capex revisions reset the silicon-demand floor; stock +2.11% Wednesday session as Mag-7 capex prints validate the foundry pivot ahead of MI400 alternative builds', category: 'company', related: 'INTC' },
  { headline: 'AMD ~$318 stabilizing after Tuesday\'s OpenAI selloff as META Q1 print discloses expanded 6GW Instinct GPU deployment with Meta directly validating the AI-buildout thesis previously called into question; Street still looking for ~$9.8B rev (+/-$300M, ~32% YoY) at May 5 Q1 print, MI400 ramp cadence and 1GW MI450 2H 2026 deployment milestones the gating items as $725B aggregate hyperscaler capex envelope re-anchors the GPU TAM', category: 'company', related: 'AMD' },
  { headline: 'Tesla $375.58 little changed Wednesday in light 6.98M-share tape (vs 71.99M avg) as Cybercab confirmed in production with end-2026 ramp, Optimus Gen 3 mass-market line targets late July/August Fremont start, $25B 2026 capex envelope includes AI infrastructure for robotaxi and Optimus; Intel 14A Terafab partnership giving SpaceX orbital datacenter and vehicle silicon a domestic 2nm path, Austin FSD-Unsupervised footprint still gating Cybercab commercial scale ahead of regulator approval push', category: 'company', related: 'TSLA' },
  { headline: 'Apple into Thursday April 30 Q2 print at $1.95 EPS / $109.3B rev cons (Visible Alpha, iPhone ~$56.5B / Services ~$30B); first call since the Tim Cook executive-chairman / John Ternus CEO succession announcement (effective Sep 1) — China iPhone shipments ran +20% in calendar Q1 reversing prior softness, Q1 Services +14% YoY base, but rapidly rising memory/processor/SSD costs from the AI infrastructure buildout (now ~$725B aggregate hyperscaler capex) keep the margin overhang front-of-tape', category: 'company', related: 'AAPL' },
  { headline: 'Microsoft FY26 Q3 prints $4.27 EPS / $82.89B rev (cons $4.06 / $81.39B), Azure +40% cc (39% reported, blew through 37-38% guide), Microsoft Cloud $54.5B +29%, commercial RPO +99% to $627B; CFO Hood commits CY26 capex of "roughly $190B" including ~$25B from higher component pricing — 365 Copilot seats now 20M (from 15M Jan) with weekly engagement at Outlook parity, the print directly rebuts the OpenAI compute-demand reset and re-floors the AI silicon TAM', category: 'company', related: 'MSFT' },
  { headline: 'Meta Q1 2026 prints $7.31 EPS / $56.31B rev +33% YoY (cons $6.79 / ~$55.5B, fastest growth since 2021), net income $26.77B +61%, family-of-apps ad rev $55.0B +33% (impressions +19%, price/ad +12%), Reality Labs -$4.03B loss; FY26 capex guide raised to $125-145B (from $115-135B) on memory/component pricing — stock -7% AH on the higher capex print and softer DAU read-through, AMD 6GW Instinct deployment confirmed as marquee GPU mix', category: 'company', related: 'META' },
  { headline: 'Amazon Q1 2026 prints $181.5B rev +17% YoY (cons ~$177B), AWS $37.6B +28% (15-quarter high, smashing mid-20s bar); Q2 guide $194-199B rev (+16-19% YoY), OI guide $20-24B (=$4B band tighter than feared), $200B FY26 capex reaffirmed including Project Kuiper LEO sats — AWS re-acceleration the marquee tell on AI infrastructure absorption, sequential Cloud read-through with GOOGL +63% reinforces aggregate $725B hyperscaler envelope', category: 'company', related: 'AMZN' },
  { headline: 'Alphabet Q1 prints $109.9B rev +22% YoY, NI $62.6B +81%, 11th straight double-digit growth quarter; Cloud $20.02B +63% YoY blows past $18.05B cons (off Q4 48%) with backlog nearly doubling QoQ to >$460B as Pichai flags enterprise-AI as "primary growth driver for cloud for the first time"; Search +19% with AI Overviews driving usage, FY26 capex raised to $180-190B (from $175-185B prior) plus 2027 "significant" increase signal, GOOGL +6% AH to fresh ATH near $367', category: 'company', related: 'GOOGL' },
  { headline: 'Bitcoin $76,321 -0.23% 24h (range $74,930-$77,921) fading post-FOMC after Powell\'s 8-4 hold (third pause, four dissents — first time since October 1992 — Miran preferring a cut, Hammack/Kashkari/Logan pushing back on the easing bias) and Powell signaling indefinite Board stay pending renovation-probe finality; ETF tape now -$352M two-day combined ($263M Apr 27 + $89.7M Apr 28, IBIT -$112.2M), $75K the next test as Brent $118 oil-shock pass-through reanchors near-term inflation prints', category: 'crypto', related: 'BTC' },
  { headline: 'Ether $2,276 -0.67% 24h (range $2,220-$2,347) underperforming the BTC tape post-FOMC and post-Mag-7-capex prints, sliding back through Tuesday\'s $2,266 floor; spot ETH ETFs printed -$50.4M Apr 27 outflow, Aave TVL still -$28.6B (-37%) post-exploit despite AAVE rescue traction, ETH/BTC ratio softening as risk reflexes turn defensive into oil-shock blockade headlines and four-dissent Fed dot plot still showing only one 2026 cut', category: 'crypto', related: 'ETH' },
  { headline: 'XRP $1.3842 +0.07% 24h (range $1.3459-$1.4063) holding the $1.38 shelf as April spot XRP ETF nets close at $81.6M — biggest monthly print of 2026, longest unbroken positive streak in XRP ETF history (zero outflow days since Apr 9); cumulative ETF base $1.29B three-month high across Bitwise/21Shares/Canary, RLUSD stablecoin market cap $1.58B with XRP the bridge-asset gas layer, $1.40 still the immediate cap into Mag-7 AMC reaction tape', category: 'crypto', related: 'XRP' },
  { headline: 'Solana $83.84 -0.24% 24h (range $81.40-$85.55) consolidating as Israel CMA\'s BILS approval (1:1 ILS-pegged stablecoin from Bits of Gold) goes live on Solana — sub-400ms settlement, EY-audited segregated reserves, Fireblocks custody, QEDIT ZK privacy layer; quantum-resistant signature migration also activated April 28, but SOL ETF inflows -$39.93M six straight months of declines flagging waning short-term institutional bid even as core throughput-and-utility narrative deepens', category: 'crypto', related: 'SOL' },
  { headline: 'Brent +6% to $118.03 (highest since June 2022) and WTI +7% to $106.88 as Trump pledges naval blockade of Iranian ports until nuclear deal, Hormuz still effectively closed, US crude/fuel inventories sharply lower with exports above 6 mbpd record — UAE May 1 OPEC exit (first major departure in six decades, capacity ~4 mbpd vs ~3 mbpd quota) initially priced as bearish (-2 to -3%) but immediately offset by Mideast risk premium, Powell flagged elevated oil "will push up overall inflation" near-term in 2:30pm presser', category: 'general', related: '' },
  { headline: 'FOMC holds 3.5-3.75% in 8-4 split — first four-dissent meeting since October 1992 — with Miran preferring a quarter-point cut and Hammack/Kashkari/Logan pushing back against the statement\'s easing bias; dot plot still shows one 2026 cut (7 hold / 7 one-cut / 5 more), Powell flags oil-shock inflation pass-through and signals he stays on Board of Governors indefinitely past May 15 chair term-end pending renovation investigation transparency, Warsh remains the Trump successor pick', category: 'general', related: '' },
  { headline: 'S&P 500 closes essentially flat at 7,135.95 (-0.04%) Wednesday, Dow -280.12 (-0.57%) to 48,861.81 fifth straight loss as Brent $118 lifts energy and Fed\'s 8-4 hold reanchors duration risk; AMC tape delivers MSFT Azure 40% cc / $190B capex, GOOGL Cloud 63% / $190B capex / 6% AH gap to ATH ~$367, META -7% AH on $125-145B capex revise, AMZN AWS 28% / $200B capex, ~$725B aggregate hyperscaler envelope confirms the AI-spend leg through 2026', category: 'general', related: '' },
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
