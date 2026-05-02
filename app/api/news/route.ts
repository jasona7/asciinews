import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-05-02 01:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'S&P 500 closed at fresh record 7,230.12 +0.29% Friday and Nasdaq +0.89% to all-time high 25,114.44 capping the best monthly gain since 2020 (S&P +~10%/Nasdaq +~15% April), Apple +~5% on the cash close after $111.2B/$2.01 Q2 blowout dragged AAPL above $290 intraday, oil cooling on Iran peace-proposal headlines and the AI trade re-engaging with GOOGL still digesting +34% April; both indices notched Friday\'s record close on quiet rotation as the Mag-7 super-week settles and AMD May 5 AMC print becomes the next gating event with the April BLS payrolls release moved to next Friday May 8', category: 'general', related: '' },
  { headline: 'Apple +~5% Friday morning (extending the +3% premarket and +4.3% AH Thursday) as the Q2 print reverberates — $111.18B rev +17% YoY (cons $109.66B, March quarter record), $2.01 EPS +22% YoY (cons $1.95), iPhone $57B +22% on iPhone 17 strength / Greater China +28%, Services $31B all-time record +16%, Mac $8.4B; June guide rev +14-17% with management flagging "significantly higher" memory costs as the swing factor for next quarter, $100B buyback re-up and dividend hike to $0.27 — first earnings call since the Cook-to-Ternus succession announcement', category: 'company', related: 'AAPL' },
  { headline: 'Nvidia closed Friday at $198.45 (-0.6%) holding just below the $200 shelf as the Mag-7 GPU read-throughs settle — MSFT -~4% Thursday on $190B FY26 capex / Azure +40% cc, META -~9% on raised $125-145B FY26 capex without cloud-rev offset, AMZN +~0.7% with AWS $37.59B +28% (15-quarter high), GOOGL +~10% with Cloud $20.02B +63% blowing past cons; the cumulative ~$725B FY26 hyperscaler envelope ratifies NVDA\'s May 20 fiscal Q1 print (Street modeling 79-81% YoY rev growth) and AMD\'s May 5 AMC report as the next gating events for the AI capex thesis', category: 'company', related: 'NVDA' },
  { headline: 'Intel above $100 at fresh ATH after the foundry-revival narrative cements: 18A entered high-volume manufacturing running ahead of plan, 14A maturing faster than 18A did at the comparable stage, Q1 foundry revenue +16% YoY to $5.4B (vs ~4% Q4 growth) and Data Center & AI +22% YoY to $5.05B (vs $4.41B cons); Tesla confirmed as marquee 14A external customer for vehicle/robot/orbital-datacenter chips, "multiple customers" actively evaluating per CEO Lip-Bu Tan, market cap now ~$470B after stock more than tripled in a year — DA Davidson and others flagging a structural CPU-demand shift post-Q1', category: 'company', related: 'INTC' },
  { headline: 'AMD into May 5 AMC Q1 print with revenue guide $9.8B ±$300M (cons $9.84B, +33% EPS YoY) — record Instinct GPU revenue continuing from Q4 MI350 ramp, OpenAI 6GW deal and Meta 6GW deal both confirmed with first 1GW MI450 deployments scheduled 2H 2026 (custom MI450 + 6th-gen Venice EPYC for META), 37 Buy/Strong Buy ratings vs 12 Hold and zero Sell with consensus PT $289.35; the gating items Monday are MI400 cadence guidance, the 1GW MI450 milestone, and any commentary on gross-margin headwinds as NVDA holds just below $200 and the marginal-buyer narrative continues rotating toward AMD', category: 'company', related: 'AMD' },
  { headline: 'Microsoft Q3 print delivered $4.27 EPS / $82.89B rev (cons $4.06 / $81.39B), Azure +40% cc (vs 37-38% guide), Microsoft Cloud $54.5B +29%, commercial RPO +99% to $627B and 365 Copilot seats 20M (+5M QoQ) — but tape closed -~4% Thursday on $190B FY26 capex headline as Q4 capex set to exceed the $40B Q3 record (+84% YoY); Wall Street splits — Barclays cut to $545 from $600 OW, Wells Fargo $625 OW — with capex-fatigue reflex outweighing Azure re-acceleration even as the print directly rebuts the OpenAI compute-demand reset thesis', category: 'company', related: 'MSFT' },
  { headline: 'Meta closed Thursday -~9% (steepest one-day drop since October) on Q1 beat overshadowed by capex revise — $7.31 EPS / $56.31B rev +33% YoY (cons $6.78 / $55.45B, fastest growth since 2021), net income $26.77B +61%, FoA ad rev $55.0B +33%; FY26 capex raised to $125-145B (from $115-135B) on memory/component pricing, AMD 6GW Instinct deployment confirmed as marquee GPU mix and softer DAU read-through (Iran internet disruptions cited) compounding the gap-down — Meta the only Mag-4 print without a cloud-rev offset to amortize the AI-spend, drawing the toughest sell-side reaction of the super-week', category: 'company', related: 'META' },
  { headline: 'Amazon Q1 blowout — $181.51B rev +17% YoY (cons $177.30B), AWS $37.59B +28% (15-quarter high, smashing the mid-20s bar), $2.78 diluted EPS vs $1.64 cons (beat by $1.10); Q2 guide $194-199B / OI $20-24B, FY26 capex $200B reaffirmed (Q1 cash capex $43.2B for AWS + gen-AI), Q1 backlog $364B excluding the $100B Anthropic deal — stock closed +~0.7% as AWS re-acceleration alongside GOOGL Cloud +63% cemented the absorption-of-AI-infrastructure thesis versus META\'s no-cloud-offset overhang, even as the print also showed how quickly hyperscale investment is swallowing free cash flow', category: 'company', related: 'AMZN' },
  { headline: 'Alphabet closed Thursday +~10% to fresh ATHs, capping +34% April (best month since Google\'s 2004 IPO) on Q1 of $109.9B rev +22% YoY, $5.11 adj EPS, net income $62.6B +81%, 11th straight double-digit quarter; Cloud $20.02B +63% YoY blew past $18.05B cons (off the Q4 +48%), backlog nearly doubled QoQ to >$460B with Pichai calling enterprise-AI the "primary growth driver for cloud for the first time"; FY26 capex raised to $180-190B (from $175-185B), CFO Ashkenazi signaling 2027 "significant increase" — Alphabet the clean winner of the four-print Mag-4 super-week', category: 'company', related: 'GOOGL' },
  { headline: 'Tesla Cybercab production confirmed underway at Giga Texas — first steering-wheel-less unit rolled off in February, continuous production from April, no NHTSA 2,500-vehicle cap, Tesla now ramping toward "hundreds of units per week" with full-capacity target of at least 2M units annually; Optimus Gen-3 reveal pushed later in 2026 again with mass-production-ready unveiling tied to Q1 earnings call commentary, Fremont pilot line targeting 1M robots/yr and standalone Optimus production starting late July/August — Intel 14A Terafab still locked in for Tesla vehicle/robot chips and SpaceX orbital datacenters, robotaxi commercial scale still gated by FSD-Unsupervised regulator approval', category: 'company', related: 'TSLA' },
  { headline: 'Bitcoin $78,313 +2.4% 24h reclaiming the $78K handle (range $76,434-$78,950) into the May tape as US spot BTC ETFs closed April at ~$1.97-2.4B net inflows (the strongest month of 2026, more than double March\'s $1.32B), BlackRock\'s IBIT alone pulled in ~$2B and the freshly launched Morgan Stanley MSBT product added $194M with zero outflow days since its April 8 debut; cumulative lifetime ETF inflows now $58.5B and AUM through ~$102B, with bitcoin closing April +12% (best month since April 2025) — institutional demand absorbing supply well in excess of daily mining issuance', category: 'crypto', related: 'BTC' },
  { headline: 'Ether $2,297 +1.6% 24h (range $2,260-$2,327) holding the $2,300 line as the BTC bid pulls the complex into Friday\'s May tape — US spot Ethereum ETFs posted their first monthly net-inflow gain since October 2025 in April, with the spot tape now broadly ignoring lagged ETF-flow noise; ETH/BTC ratio steadier as the four-dissent FOMC dot plot still leaves only one 2026 cut and Q1 core PCE +4.3% locks higher-for-longer, on-chain taker buy/sell ratio remains the highest since January 2023, with AAPL +5% on the print and Brent cooling on Iran peace-proposal headlines combining for risk-on cover into the May open', category: 'crypto', related: 'ETH' },
  { headline: 'XRP $1.385 +1.2% 24h holding right at the $1.40 cap (range $1.366-$1.400) as the BTC reclaim of $78K pulls the complex through resistance — US-listed spot XRP ETFs closed April at $81.63M net inflows (best monthly print of 2026 and longest unbroken positive streak in product history, zero outflow days since April 9 even as weekly cadence cooled $55M→$15M into month-end); cumulative ETF base $1.29B across seven products with NAV >$1.53B, Goldman Sachs the largest disclosed institutional holder at $153.8M across four funds with retail demand still anchoring the bid into the May open', category: 'crypto', related: 'XRP' },
  { headline: 'Solana $83.80 +0.8% 24h (range $83.18-$84.85) consolidating in the low-$80s as the BTC reclaim of $78K and ETH holding $2,300 lift the complex into Friday\'s open — US spot SOL ETFs printed ~$35M net inflows over the trailing week with five straight positive sessions and AUM through $1B, Goldman Sachs disclosed at $108M; the April 28 quantum-resistant signature migration is now live alongside Israel CMA\'s BILS approval (1:1 ILS-pegged stablecoin from Bits of Gold) deploying on Solana with sub-400ms settlement, EY-audited reserves, Fireblocks custody and QEDIT ZK privacy layer', category: 'crypto', related: 'SOL' },
  { headline: 'Trump declared Iran hostilities "terminated" in a Friday letter to congressional leaders as the 60-day War Powers Resolution deadline (May 1) arrived, citing the April 8 Pakistan-mediated ceasefire and saying there has been no exchange of fire since; Iran sent a fresh peace proposal through Pakistan that Trump publicly rejected as unsatisfactory ("I\'m not satisfied with it"), the Senate\'s fourth bipartisan WPR challenge having failed 52-47 on April 15 — Democratic lawmakers and legal scholars dispute that the deadline can be paused, US Central Command on April 29 requested Dark Eagle hypersonic deployment to the region, and Tehran still conditions Hormuz reopening on the US lifting its naval blockade of Iranian ports', category: 'general', related: '' },
  { headline: 'Brent crude $108.10 -2.1% Friday on the Iran peace-proposal headlines (off Wednesday\'s $126/bbl four-year intraday peak), still set for a second weekly gain as Strait of Hormuz exports remain ~4% of normal under the dual US-Iran blockade and prospects of a near-term reopening fade; UAE OPEC/OPEC+ exit went LIVE today (first major departure since 1967, drops the cartel from 12 to 11 members and supply control from ~30% to ~26%, UAE targeting 5M bpd capacity by 2027 vs the 3.2M quota) — but the structural take is muted because UAE can\'t pump what it can\'t ship, with the bulk of incremental capacity stranded behind the Hormuz crisis', category: 'general', related: '' },
  { headline: 'Myanmar\'s ousted leader Aung San Suu Kyi has been transferred from prison to house arrest more than five years after the February 2021 military coup, the junta announced as part of a prisoner amnesty for the Full Moon Day of Kason Buddhist holiday covering 1,519 prisoners; her sentence was reduced by one-sixth (she will serve the remaining 18 years 9 months at a designated residence) and state TV released the first photo of her since shortly after the coup, with her legal team set to meet her this weekend — UN Secretary-General Guterres called it "a meaningful step," while Burma Campaign UK dismissed the move as a public-relations exercise to project reform while preserving military rule', category: 'general', related: '' },
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
