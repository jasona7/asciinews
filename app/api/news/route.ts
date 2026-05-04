import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-05-04 01:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'US tape closed Friday with S&P 500 at a fresh record 7,230.12 +0.29% and Nasdaq Composite +0.89% to an all-time-high 25,114.44 (sixth straight weekly gain — the longest run since October 2024) — Dow lagged -0.31% to 49,499.27 on the Apple-led mega-cap rotation; weekend tape now centered on the LIVE Berkshire Omaha meeting (Abel\'s first as CEO, deepfake-Buffett opening Q&A, Buffett delivering his "couldn\'t have made a better decision" endorsement from a front-row seat) and the May 5 AMD AMC print as the next gating event before the April BLS payrolls Friday May 8 8:30am ET (March prior +178K vs 59K cons), Coinbase Wednesday May 7 AMC, Disney May 7, Palantir Monday May 4 AMC and the NVDA fiscal-Q1 print Wednesday May 20 AMC — 10Y Treasury yield closed Friday at 4.35% -10bps from the nine-month high earlier in the week as the energy pullback eased the pro-inflation read', category: 'general', related: '' },
  { headline: 'Berkshire Hathaway 2026 annual meeting LIVE in Omaha with Greg Abel center-stage as CEO under the "Legacy Continues" theme — Abel opened the Q&A by responding to a deepfake Warren Buffett asking why investors should hold the stock (highlighting the $397.4B cash hoard) and explicitly RULED OUT a Berkshire break-up, stressing continuity with Buffett\'s legacy and signaling closer subsidiary-level oversight than Buffett practiced; Buffett, 95, took the front row to a standing ovation and told the room "you couldn\'t have made a better decision" on Abel ("Greg is doing everything I did and then some, and he\'s doing it better in all cases") — Q1 operating earnings $11.34B +18% YoY (vs $11.56B cons, slight miss), net income $10.1B more than double last year\'s $4.6B, cash pile a fresh record $397.4B reflecting the continued difficulty deploying at value-oriented multiples; arena only ~half-full vs prior-year capacity but still no other corporate meeting in the league of the "Woodstock for Capitalists"', category: 'company', related: 'BRK.B' },
  { headline: 'Apple closed Friday +3.24% to $280.14 as Wall Street raced to mark up post-Q2: Morgan Stanley\'s Eric Woodring took target to $330 from $315 (Buy, citing higher confidence in cost-pressure management), Wells Fargo\'s Aaron Rakers $310 from $300 (Buy on guide upside), UBS $287 from $280 (citing US/China demand and supply-chain strength); the print itself — $111.18B rev +16.6% YoY (cons $109.66B, March-quarter record), $2.01 EPS +22% (cons $1.95), iPhone $57B +22%, Greater China +28%, Services $31B record +16%, June guide rev +14-17% with "significantly higher" memory the swing factor, $100B buyback re-up and dividend +4% to $0.27 payable May 14 — Tim Cook called out at Berkshire Saturday for the "take a bow" moment with Buffett one row away', category: 'company', related: 'AAPL' },
  { headline: 'Nvidia closed Friday at $198.45 (off the April 27 ATH $216.61) into Wednesday May 20 AMC fiscal-Q1 — Street modeling 79-81% YoY revenue growth and watching Hopper-to-Blackwell mix commentary; the cumulative ~$710B FY26 hyperscaler capex envelope (AMZN ~$200B / MSFT ~$190B / GOOGL ~$180-190B / META $125-145B) ratifies the AI capex math after the four-print super-week, and AMD Tuesday May 5 AMC is the cleanest near-term read-through to GPU demand and the rebuttal to the "OpenAI missing internal targets" narrative; sell-side flagging marginal narrative shift to memory/networking as "no longer the missing ingredient" with NVDA rebounding off support but trailing the AVGO/AMD beta into the AMD print', category: 'company', related: 'NVDA' },
  { headline: 'AMD into Tuesday May 5 AMC print with Bloomberg consensus rev $9.86B (+~32% YoY) and EPS $1.27-1.28 (+~33% YoY), gross-margin guide ~55% (-2pts QoQ on the absence of one-time inventory benefit) — record Instinct revenue continuing off the Q4 MI350 ramp, OpenAI 6GW and Meta 6GW deals both confirmed with first 1GW MI450 deployments scheduled 2H 2026 (custom MI450 + 6th-gen Venice EPYC for META), MI308 China contribution capped ~$100M Q1 on US export curbs; the gating call items Tuesday: MI400 cadence, the 1GW MI450 milestone, GM trajectory, any rebuttal to the "OpenAI behind internal targets" narrative — stock came under pressure into the print on the OpenAI-miss + GM-decline overlay, Wall Street at Moderate Buy (19 Buys, 9 Holds) with the print called the "validation" event for the AI-chip rally', category: 'company', related: 'AMD' },
  { headline: 'Microsoft Q3 print delivered $4.27 EPS / $82.89B rev (cons $4.06 / $81.39B), Azure +40% cc (vs 37-38% guide), Microsoft Cloud $54.5B +29%, commercial RPO +99% to $627B, 365 Copilot seats 20M (+5M QoQ) — but tape closed -~4% Thursday on the $190B FY26 capex headline as Q4 capex set to exceed the $40B Q3 record (+84% YoY); Wall Street splits — Barclays cut to $545 from $600 OW, Wells Fargo $625 OW — the capex-fatigue reflex outweighing the Azure re-acceleration even as the print directly rebuts the OpenAI compute-demand reset thesis, and the $710B four-hyperscaler total now ratifies the spend rather than punishes it heading into the AMD May 5 AMC read', category: 'company', related: 'MSFT' },
  { headline: 'Tesla Cybercab volume production now officially underway at Giga Texas after Musk\'s Q1 call confirmation — first steering-wheel-less unit rolled off February 17, April marked the official volume-production shift with ~60 units now staged on the Gigafactory campus (up from the 25-unit count at the prior update), Giga Texas line being prepared for hundreds of units per week with no NHTSA 2,500-vehicle cap (designed FMVSS-compliant, no waiver needed); Musk on the Q1 call cautioned the ramp is a "stretched-out S-curve" with no material revenue likely before 2027 and unsupervised FSD timeline "probably Q4," Robotaxi service operating in Austin/Dallas/Houston with the next-wave expansion to Phoenix/Miami/Orlando/Tampa/Las Vegas slated before mid-year and FY26 capex bumped to $25B+; Polymarket pricing 97% odds of TSLA hitting $375 in May and 65% odds of $390 with the stock in the $380-395 zone, Optimus Gen-3 unveil pushed later into 2026 and Intel 14A still locked in for vehicle/robot/orbital-datacenter silicon', category: 'company', related: 'TSLA' },
  { headline: 'Bitcoin $78,732 +0.63% 24h (Saturday range $78,080-$79,176, reclaiming the high-$78Ks intraday and probing the $80K technical gate) after US spot BTC ETFs reversed the late-April outflow stretch with the May tape opening on net inflows — the May 1 print at +$4.5M followed Friday\'s $629.7M (largest since mid-April, IBIT $284.4M / FBTC $213.4M / ARKB $88.5M, zero outflows across 13 products) and Thursday\'s $578.2M for a $1.21B two-session reversal; April finished at $1.97B-$2.44B net inflows (best month since October 2025) with IBIT holding ~812K BTC valued ~$62B and 49-62% spot-ETF market share, lifetime cumulative inflows $58.5B and AUM ~$102B — May already through $600M cumulative inflows in the first two sessions, the "$80K trigger" still the next technical gate watched into the Berkshire weekend tape and the May 5 AMD print', category: 'crypto', related: 'BTC' },
  { headline: 'Ether $2,324 +0.88% 24h reclaiming the $2,300 handle and extending into Saturday after US spot ETH ETFs posted their first monthly net-inflow gain since October 2025 in April (+$356M, though still -$413M YTD net), the late-April weekly tape cooled $275M→$155M into month-end as the broader crypto-ETF complex went net-negative for the first time in ~3 months on the $651.9M four-day Apr 27-30 outflow stretch; ETH/BTC ratio firmer as the four-dissent FOMC vote 8-4 (Miran for cut, three dissents on the language signaling future cuts) at the April 29 Powell-final-meeting hold (3.50-3.75%) leaves the next decision on June 16-17 with updated SEP — on-chain taker buy/sell ratio still the highest since January 2023, AAPL post-print bid and Brent cooling on Iran peace headlines combining for residual risk-on cover into AMD Tuesday', category: 'crypto', related: 'ETH' },
  { headline: 'XRP $1.396 +0.63% 24h reclaiming $1.40 intraday (Saturday range $1.381-$1.4005, the level lost Wednesday now back in play) as the broader complex firms into the weekend after US spot XRP ETFs snapped their longest 2026 inflow streak Apr 30 with $5.83M outflow (zero outflow days since April 9 prior, weekly print at $15M from $55M week-prior) — cumulative net inflows $1.29B across 7 products with combined AUM ~$1B and 828.3M XRP locked, Goldman Sachs the largest disclosed institutional holder at $153.8M; April finished at $81.63M net inflows (still the best monthly print of 2026) and the CLARITY Act now has firm dates with SEC roundtable scheduled in May and Senate markup targeting the week of May 11 (Lummis pledged Senate finish), Senator Moreno setting end-of-May as the deadline before 2026 midterms freeze the legislative calendar', category: 'crypto', related: 'XRP' },
  { headline: 'Solana $84.11 +0.29% 24h (Saturday range $83.58-$84.98) firming in the low-$80s alongside the broader risk-on pulse — US spot SOL ETFs printed only ~$9M weekly net inflows (sixth straight monthly decline from $419.38M November 2025 to $39.93M April 2026, weakest month since launch October 2025), AUM through $1B with Goldman disclosed at $108M; the late-April catalysts still in the bid: Visa and Meta expanding Solana payments, Solana Swiss Research Institute launch, the April 28 quantum-resistant signature migration live alongside Israel CMA\'s BILS approval (1:1 ILS-pegged stablecoin) deploying on Solana with sub-400ms settlement, EY-audited reserves and Fireblocks custody, with Coinbase Q1 earnings Wednesday May 7 AMC the next gating event for the broader exchange/altcoin tape', category: 'crypto', related: 'SOL' },
  { headline: 'Spirit Airlines wind-down entered day two Saturday with check-in desks empty across FLL/MCO/LAS/ATL and 17,000 employees out of work after the 11th-hour $500M Trump-administration bailout collapsed Friday night when bondholders refused to sign — the carrier had been in its second post-pandemic Chapter 11 in less than a year, with the post-Iran-war fuel spike (Brent peaked $126/bbl Wednesday) the proximate trigger after "hundreds of millions of additional dollars of liquidity Spirit simply does not have and could not procure" per the orderly-wind-down filing, ending 34 years of operations; Transport Secretary Sean Duffy said on X DOT is coordinating with major airlines to "bring relief to Spirit customers and its workforce," with rescue fares now capped around $200 across United/American/Delta/JetBlue/Frontier/Allegiant on Spirit routes, crew-repatriation programs activated and former-employee hiring vacancies promoted — JetBlue (whose 2024 Spirit deal was blocked on antitrust), Frontier and Allegiant the structural slot-and-gate beneficiaries with Spirit the second US carrier failure of 2026 and ULCC consolidation talk pulled forward', category: 'general', related: '' },
  { headline: 'GameStop offered to buy eBay for $56B in cash-and-stock Sunday — Ryan Cohen-led GME board approving an unsolicited bid pricing eBay at ~$98/share (~30% premium to Friday\'s $75.40 close), proposed structure 60% stock / 40% cash funded out of GME\'s ~$4.5B treasury plus a fully committed $20B bridge from JPM/BofA, the deal pitched as creating "the largest collectibles-and-resale marketplace on the planet" with the GME trading-card and PSA-grading vertical bolted onto eBay\'s 138M global buyers; eBay board responded that it would "review the proposal in due course" with no recommendation yet, antitrust read benign (different segments, no horizontal overlap of consequence) but the financing math and the GME-as-acquirer optics likely to dominate Monday tape — GME up 22% in pre-market trading per IBKR overnight indication, eBay called +25-28%, Cohen telling Bloomberg the bid is "the logical next step in the GameStop transformation" and not contingent on any third-party financing condition', category: 'general', related: '' },
  { headline: 'Trump announced "Project Freedom" Sunday — a US Navy escort program to convoy stranded commercial shipping out of the Strait of Hormuz after weeks of dual US-Iran blockade left tankers and bulk carriers idled near Fujairah/Khor Fakkan; first escorted formation slated to transit within 72 hours under USS Gerald R. Ford CSG cover with destroyer screen, the policy framed as "humanitarian extraction" rather than blockade-break to keep the April 8 Pakistan-mediated ceasefire intact (no exchange of fire since); the announcement immediately compressed Brent and re-rated the energy curve lower as Treasury Sec. Bessent told CNBC "energy prices are going to fall later this year," while Fed\'s Kashkari warned the Iran war "raises inflation risks and rate cuts are uncertain" — Tehran\'s revised "30 days to resolve" peace framework via Pakistan mediators still on the table with nuclear talks postponed, Mojtaba Khamenei still not seen 7+ weeks after his ascension as the regime operates as hardline coalition rather than single-figure hierarchy', category: 'general', related: '' },
  { headline: 'Brent crude eased into Sunday\'s session $103-104 (WTI low-$97s, off Wednesday\'s $126/bbl four-year intraday peak) on the one-two of Trump\'s Project Freedom Hormuz-escort announcement and OPEC+ agreeing a third consecutive modest June output increase since Hormuz disruptions began (Kuwait projecting June output 2.628M bpd) — Barclays raised 2026 Brent forecast to $100/bbl on the supply-response math even as Strait exports remain ~4% of normal under the dual US-Iran blockade; Kalshi traders pulling back from the $125+ wartime-high re-test odds, 10Y yield holding 4.35% as the energy cooling offsets ISM Manufacturing prices at four-year high, Fed\'s Barr warning private credit stress could trigger a credit crunch and ECB policymaker calling Eurozone recession concerns "real and justified" — the four-dissent April 29 FOMC hold (3.50-3.75%) leaves June 16-17 the next live decision with updated SEP', category: 'general', related: '' },
  { headline: 'UAE OPEC exit went LIVE Thursday May 1 (first major departure since 1967, drops the cartel from 12 to 11 members and supply control from ~30% to ~26%, UAE targeting 5M bpd capacity by 2027 vs the 3.2M quota — pre-war capacity already 4.8M bpd implying ~1.6M bpd of bottled-up supply or ~1.5% of global) — initial 2-3% futures dip on supply-glut fears reversed within 24 hours as WTI cleared $105 and Brent $112, the structural take muted because UAE can\'t pump what it can\'t ship behind the Hormuz crisis; analysts framing the exit as closer alignment with US energy/foreign policy interests, Saudi-led OPEC weakened materially heading into the next Vienna meeting and the door now open for additional defections that would amplify the downside pressure on prices once Hormuz reopens', category: 'general', related: '' },
  { headline: 'Coinbase into Wednesday May 7 AMC Q1 print with Wall Street modeling $0.36 EPS (vs $1.94 prior-year quarter) and watching the $550-630M company subscription-and-services guide as the durability tell — global crypto exchange volume cratered ~48% from the October 2025 peak to $4.3T in March (lowest since October 2024) compressing the transaction-revenue line, with the "everything exchange" thesis now leaning on the early-2026 retail-equities launch (Yahoo Finance partnership), USDC adoption and Coinbase One subscriber growth to offset; the institutional-vs-retail mix the second key read (retail ~1.5% take, institutional <5bps), with COIN -57% from peak and the print the cleanest read on whether the regulatory-thaw narrative (CLARITY Act May markup) is translating into operating leverage', category: 'company', related: 'COIN' },
  { headline: 'Netflix closed Friday at $92.06 (post-1:10 split) trading $91.90-94.70 Saturday with the stock still 30%+ off last year\'s peak even after the board\'s $25B buyback authorization (more than the $20B FY26 content budget) — ad-tier rev guided to $3B FY26 (+100% YoY from 2025) and the mobile-app redesign introducing "Clips" vertical short-form feed for original-programming highlights, market cap ~$387.65B (-13.5% week) on the broader media-tape derate; Wall Street median PT $115 across 78 analysts as the streaming-pioneer narrative pivots from subscriber growth to ad-monetization and capital-return, with Disney Q2 print Wednesday May 7 AMC the next direct streaming-cohort comp on Disney+/Hulu/ESPN+ ARPU and ad-tier traction', category: 'company', related: 'NFLX' },
  { headline: 'Intel still riding above $100 into the weekend at ~$470B market cap (stock more than tripled in a year) as the foundry-revival cements: 18A in high-volume manufacturing running ahead of plan, 14A maturing faster than 18A did at the comparable stage, Q1 foundry rev +16% YoY to $5.4B (vs ~4% Q4 growth), Data Center & AI +22% YoY to $5.05B (vs $4.41B cons); Tesla locked in as marquee 14A external customer for vehicle/robot/orbital-datacenter silicon, CEO Lip-Bu Tan flagging "multiple customers" actively evaluating, DA Davidson and others arguing for a structural CPU-demand shift post-Q1 — Intel the cleanest beneficiary of the on-shoring policy backdrop and the chip-sovereignty premium baked into the $710B hyperscaler capex pipe and Berkshire\'s record $397.4B cash pile awaiting deployment', category: 'company', related: 'INTC' },
  { headline: 'Strategy (MSTR) paused its bitcoin-buying program ahead of Tuesday May 5 BMO Q1 earnings — Saylor confirmed on X "no acquisitions in the trailing reporting window" with treasury-team posture shifting to capital-structure work into the print, the first multi-week BTC-buy hiatus since the September 2025 ATM pause; Strategy holds 597,325 BTC at a $66,384 average cost (~$13.7B unrealized gain at $79K spot) financed via the 0% 2027/2028/2030/2031/2032 converts plus the STRK/STRF/STRD perpetual-preferred stack, Q1 setup centered on the Bitcoin-Yield ($/BTC) and Bitcoin-Gain (BTC) operating KPIs and on whether management revisits the FY26 $10B BTC-acquisition target after April closed up 12% on BTC and gave MSTR its first positive month since July; Cointelegraph notes the pause and Tether\'s billion-dollar Q1 profit print as the two cleanest reads on crypto-corporate cash discipline through the Iran-war volatility window, with Coinbase Wednesday May 7 AMC the gating exchange print right behind it', category: 'company', related: 'MSTR' },
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
