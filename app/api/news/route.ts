import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-05-05 13:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'US Tuesday futures rebounded with S&P 500 +0.3% / Nasdaq-100 +0.5% / Dow +0.3% on the Iran-UAE de-escalation trade after Monday\'s broad sell-off — Dow closed -557.37 (-1.13%) at 48,941.90, S&P -0.41% at 7,200.75, Nasdaq -0.19% at 25,067.80 as Iran\'s drone-and-missile attack on the UAE (first since the April 8 ceasefire) and the Project Freedom day-one exchange of fire (US Navy sank 7 IRGC fast boats, UAE intercepted 15 missiles + 4 drones, Fujairah oil-zone fire) sent Brent +5% Monday before reversing to $112.90 -1.4% Tuesday and WTI back to $104.10 -2.2%; the gating Tuesday-Wednesday docket: AMD AMC tonight ($9.84B / $1.28 EPS / +32% rev consensus, ~55% non-GAAP GM guide, ARM the next-day read), Disney Wednesday May 6 AM ($25.03B cons / $1.49 EPS, ~$500M SVOD operating-income target), Coinbase Wednesday May 7 AMC, April BLS payrolls Friday 8:30am ET (cons +49K vs +178K March, unemployment 4.3%), 10Y at 4.35% with the four-dissent April 29 FOMC hold (3.50-3.75%) leaving June 16-17 the next live decision', category: 'general', related: '' },
  { headline: 'Berkshire Hathaway 2026 annual meeting wrapped Saturday in Omaha as Greg Abel\'s first as CEO under the "Legacy Continues" theme — Abel opened the Q&A by responding to a deepfake Warren Buffett asking why investors should hold the stock and pivoted it into an AI-cybersecurity discussion, explicitly RULED OUT a Berkshire break-up ("absolutely not, we see our conglomerate structure working without the bureaucracy and bloated costs") and signaled "AI for the sake of AI" is off the table; Buffett took the front row to a standing ovation as a "60" jersey was raised to the CHI Health Center rafters marking 60 years as CEO with Buffett telling the room "Greg is doing everything I did and then some, and he\'s doing it better in all cases" — Q1 operating earnings $11.34B +18% YoY (insurance underwriting +28%), net income $10.1B more than double last year\'s $4.6B, cash pile a fresh record $397B; arena only ~half-full vs prior-year 40K+ capacity (BRK.B traded lower into Monday despite the across-the-board good marks)', category: 'company', related: 'BRK.B' },
  { headline: 'Apple closed Friday +3.24% to $280.14 after the Q2 beat with Wall Street targets re-rating to a $302 consensus (30 analysts, 28-analyst Buy print at $295.23 median) and the post-print mark-up cohort: Wedbush $350 (Street-high May 1), BofA $330 Buy, JPMorgan $325 OW, Morgan Stanley\'s Eric Woodring $330 from $315 (Buy on cost-pressure management), Citi $315 Buy, Wells Fargo\'s Aaron Rakers $310 from $300 (Buy on guide upside), UBS $296 from $280 (US/China demand and supply-chain strength); the print itself — $111.18B rev +16.6% YoY (cons $109.66B, March-quarter record), $2.01 EPS +22% (cons $1.95), iPhone $57B +22%, Greater China +28%, Services $31B record +16%, June guide rev +14-17% with "significantly higher" memory the swing factor, $100B buyback re-up and dividend +4% to $0.27 payable May 14 — Tim Cook called out at Berkshire Saturday for the "take a bow" moment with Buffett one row away amid the $397B cash discussion', category: 'company', related: 'AAPL' },
  { headline: 'Nvidia closed Friday at $198.45 (off the April 27 ATH $216.61, ~$5T market cap reclaimed) into Wednesday May 20 AMC fiscal-Q1 — Wall Street modeling $78.8B revenue (~80% YoY growth) with Blackwell now ~70% of data-center compute and the Hopper-to-Blackwell transition "nearly complete" per Jensen, Rubin platform shipments slated 2H 2026 (4x efficiency gain over Blackwell, inference-heavy positioning); the cumulative ~$710B FY26 hyperscaler capex envelope (AMZN ~$200B / MSFT $190B / GOOGL ~$185B / META $130B) ratifies the AI capex math after the four-print super-week, AMD Tuesday May 5 AMC the cleanest near-term read-through to GPU demand and the rebuttal to the "OpenAI missing internal targets" narrative — Jensen\'s GTC 2026 $1T combined Blackwell-plus-Vera-Rubin sales target through 2027 the 21-day overhang into the print as Hormuz-driven beta selloff weighs on the broader AI tape with Iran firing on US vessels Monday', category: 'company', related: 'NVDA' },
  { headline: 'AMD into Tuesday May 5 AMC print TONIGHT with consensus tightened to $9.84B revenue (+32% YoY) / $1.28 EPS (+33% YoY) and non-GAAP GM guided ~55%, data-center revenue cons $5.56B (+51.5% YoY per Zacks) — stock +66% in the past month into a forward 31.5x P/E with the bar reset higher post-Palantir blowout (PLTR Monday AMC delivered $1.63B rev vs $1.54B cons, $0.33 EPS vs $0.28, +85% rev growth fastest since IPO, raised FY26 guide to $7.65-7.66B vs $7.27B cons), Susquehanna\'s Christopher Rolland Street-high $375 PT (EPYC plus AI pipeline) but HSBC downgraded to Hold from Buy lifting PT to $340 on TSMC-capacity dependency; record Instinct revenue continuing off MI350 ramp, OpenAI 6GW + Meta 6GW deals confirmed with first 1GW MI450 deployments scheduled 2H 2026, MI308 China contribution capped ~$100M Q1 on US export curbs, options pricing ~10% implied move and Cathie Wood disclosed trimming ~$70M+ AMD into the rally — gating call items: MI400 cadence, 1GW MI450 milestone, EPYC/rack-scale broadening, GM trajectory, the "OpenAI behind internal targets" rebuttal, with ARM Wednesday AMC the next-day chip read into NVDA\'s May 20 fiscal-Q1', category: 'company', related: 'AMD' },
  { headline: 'Microsoft Q3 print delivered $4.27 EPS / $82.89B rev (cons $4.06 / $81.39B), Azure +40% cc (vs 37-38% guide, well above the 39.3% Visible Alpha bar), Microsoft Cloud $54.5B +29%, commercial RPO +99% to $627B, 365 Copilot seats 20M (+5M QoQ) — but tape closed -~4% Thursday on the $190B calendar-2026 capex headline (+61% YoY, includes ~$25B from higher component pricing, vs $154.6B Visible Alpha cons) as Q4 capex set to exceed the $40B Q3 record (+84% YoY); Wall Street splits — Barclays cut to $545 from $600 OW, Wells Fargo $625 OW — the capex-fatigue reflex outweighing the Azure re-acceleration as the $710B four-hyperscaler total now ratifies the spend rather than punishes it heading into AMD May 5 AMC, Palantir Monday AMC as the AI-software read, and the bear case that an 84% capex surge plus 27x P/E leaves MSFT vulnerable to multiple compression if AI ROI lags the buildout', category: 'company', related: 'MSFT' },
  { headline: 'Tesla Cybercab volume production now officially underway at Giga Texas after Musk\'s Q1 call confirmation — first steering-wheel-less unit rolled off February 17, the Cybercab made its public-relations debut at the Miami F1 Grand Prix Fan Fest (April 29-May 3 "Autonomy Pop-Up" at Lummus Park, Cybertruck towing the two-seater inside a glass display marked "Future is Autonomous"), Giga Texas line being prepared for hundreds of units per week with no NHTSA 2,500-vehicle cap (designed FMVSS-compliant); 60 Model Ys spotted staged in Phoenix as the seven-city Robotaxi expansion (Dallas/Houston/Phoenix/Miami/Orlando/Tampa/Las Vegas) ramps before mid-year and Musk\'s claim Robotaxis cover "a quarter to half of the United States by year-end" the long-pole bar, Optimus Gen-3 unveil pushed later into 2026 and Intel 14A Terafab Austin still locked in for vehicle/robot/SpaceX-orbital-datacenter silicon — Polymarket pricing 97% odds of TSLA hitting $375 in May with the stock in the $380-395 zone and the California DMV\'s new driverless-vehicle ticket law a fresh regulatory headline into the week', category: 'company', related: 'TSLA' },
  { headline: 'Bitcoin broke $81,000 Tuesday for the first time since January (last $81,305 +3.3% 24h, intraday range $78,481-$81,344) on the trifecta of $2.44B April US-spot-ETF inflows (strongest month since October 2025, well above the prior $1.97B running estimate), Iran-UAE de-escalation after Monday\'s Project Freedom exchange, and a short-squeeze that flushed leveraged bears — May 1 single-day inflow $629.7M drove most of the weekly $153M net total, total spot-BTC-ETF AUM $103.78B (record), IBIT NAV at a fresh $45.13 high holding ~812K BTC valued ~$66B and 62% spot-ETF market share; April lifetime cumulative inflows now $59.0B, the $80K-then-$81K cleared the structural gate that rejected three times since April and sets up Coinbase Wednesday May 7 AMC ($1.5B rev / $0.36 EPS cons, -26.1% YoY) and the CLARITY Act May 21 markup deadline as the next gating events', category: 'crypto', related: 'BTC' },
  { headline: 'Ether $2,357 Monday +1.7% 24h (range $2,313-$2,400, holding the $2,300 handle through Sunday at $8.56B 24h volume) after US spot ETH ETFs flipped to a $101.2M net inflow May 1 reversing the four-day $183.7M outflow stretch April 27-30 (the late-April tape cooled $275M→$155M into month-end as the broader crypto-ETF complex went net-negative for the first time in ~3 months); whales added 140K ETH in a four-day buying spree May 1-3 (total whale holdings 13.78M→13.98M ETH), April finished at +$356M (first monthly net-inflow gain since October 2025 though still -$413M YTD), and Polymarket pricing 86% odds of ETH closing the May 4 session in the $2,300-2,400 band — the four-dissent FOMC vote 8-4 (Miran for cut, three dissents on the language) at the April 29 Powell-final-meeting hold (3.50-3.75%) leaves the next decision on June 16-17 with updated SEP', category: 'crypto', related: 'ETH' },
  { headline: 'XRP $1.395 +0.4% 24h (range $1.384-$1.421 across the weekend, the $1.40 reclaim level rejected for ~10 sessions and the $1.45 next leg watched into Tuesday) as US spot XRP ETFs snapped their longest 2026 inflow streak Apr 30 with $5.83M outflow (zero outflow days April 10-29, ~20 trading days, monthly gross $82M), no fresh inflows since April 29 and the streak the highest cumulative-watermark since mid-January when XRP traded above $2 — cumulative net inflows $1.29B across 7 products with combined AUM ~$1B and 828.3M XRP locked, Goldman Sachs the largest disclosed institutional holder at $153.8M, and the CLARITY Act calendar collapsing fast: 120 crypto firms petitioned the Senate Banking Committee, Senator Tillis pledged to press Chairman Tim Scott to schedule the markup when the Senate returns May 11, Memorial Day recess starts May 21 — if Scott doesn\'t markup before recess the bill likely shelves until 2030 per multiple Hill sources', category: 'crypto', related: 'XRP' },
  { headline: 'Solana $84.26 +0.5% 24h (Sunday range $83.26-$85.90, sellers guarding the $88-90 resistance and buyers defending $82-83 as the structural floor) firming alongside the broader risk-on pulse — US spot SOL ETFs went the other way with SOLZ posting a -$585K outflow May 1 (~0.57% of AUM) as the sixth straight monthly decline played out (November 2025 $419.38M → April 2026 $39.93M, weakest month since October 2025 launch), AUM still through $1B with Goldman disclosed at $108M; the late-April catalysts still in the bid: Visa and Meta expanding Solana payments, Solana Swiss Research Institute launch, the April 28 quantum-resistant signature migration live alongside Israel CMA\'s BILS approval (1:1 ILS-pegged stablecoin) deploying on Solana with sub-400ms settlement, EY-audited reserves and Fireblocks custody, with Coinbase Q1 earnings Wednesday May 7 AMC the next gating event for the broader exchange/altcoin tape', category: 'crypto', related: 'SOL' },
  { headline: 'Palantir crushed Q1 Monday May 4 AMC with $1.63B revenue (cons $1.54B, +85% YoY the fastest growth since the 2020 IPO and the 11th consecutive quarter of accelerating revenue growth), $0.33 adj EPS (cons $0.28), net income $870.5M roughly quadrupled from $214M YoY — US revenue +104% YoY / +19% QoQ to $1.282B, US commercial +133% YoY / +18% QoQ to $595M, 1,007 trailing-12-month commercial customers +31% YoY; raised FY26 guide to $7.65-7.66B revenue (cons $7.27B, +71% YoY) and $4.2-4.4B adj FCF (cons $4.05B), Q2 guide $1.8B vs $1.68B cons — the print blew through the ~10% implied move and Polymarket\'s 96% beat odds, with the question Tuesday whether the $144 pre-print level holds the multiple expansion or AMD AMC tonight steals the AI-software thunder; Spirit Airlines wind-down day four with 17,000 employees out of work after the $500M federal bailout collapsed Friday, Southwest moved 20,000 stranded passengers across the weekend (United/Delta/JetBlue capped rescue fares ~$200 one-way), restructuring assumed jet fuel $2.24/gal for 2026 vs the ~$4.51/gal end-April reality on the Iran-war Brent spike — JetBlue, Frontier and Allegiant the structural slot-and-gate beneficiaries with ULCC consolidation pulled forward', category: 'company', related: 'PLTR' },
  { headline: 'GameStop-eBay $56B unsolicited bid traded sharply Monday with GME -10% (Cohen\'s combative CNBC interview disclosing he "hasn\'t started any conversation with eBay\'s management" the dilution-fear catalyst as the deal would require significant share issuance) and eBay +5% to ~$109 well below the $125/share offer (50% cash / 50% GameStop common stock, valuing eBay at ~$55.5B) signaling the market is pricing material deal-completion risk — Cohen\'s memo to investors pledged ~$2B of annual savings within 12 months of closing and said GME is prepared to take the bid directly to eBay shareholders if the board is unreceptive, the structure funded out of GME\'s ~$9.4B treasury plus a $20B "highly confident" letter from TD Bank for debt financing with the funding gap to ~$56B implied size still substantial; eBay confirmed receipt and said the board will review, GME had built a ~5% eBay stake ahead of the announcement and the $125-vs-$109 gap the cleanest tell that Wall Street is treating this as a Cohen pressure play not a closable transaction', category: 'general', related: '' },
  { headline: 'Project Freedom day-two playing out Tuesday with the tape pricing partial de-escalation after Monday\'s exchange of fire — USCENTCOM confirmed two US-flagged merchant vessels successfully transited the Strait under guided-missile-destroyer escort (100+ aircraft, 15,000 service members, multi-domain unmanned platforms standing by, Adm. Brad Cooper: "essential to regional security and the global economy as we also maintain the naval blockade") before Iran\'s IRGC launched cruise missiles at American warships, the US Navy sank seven IRGC fast boats, the UAE intercepted 15 missiles + 4 drones with one drone igniting the Fujairah oil zone (three Indian nationals hospitalized, Fujairah the terminus of the Abu Dhabi Crude Oil Pipeline that bypasses Hormuz), an ADNOC tanker was struck inside Hormuz and a South Korean vessel exploded near the UAE; Iran\'s Maj. Gen. Ali Abdollahi (Khatam al-Anbiya CHQ commander) said "any foreign armed force, especially the invading US army, if they intend to approach and enter the Strait of Hormuz, will be subjected to attack" via state media, Trump framing the operation as "humanitarian" rather than blockade-break to keep the April 8 Pakistan-mediated ceasefire intact — markets pricing relief Tuesday with Brent reversing -1.4% to $112.90 and WTI -2.2% to $104.10', category: 'general', related: '' },
  { headline: 'Brent reversed to $112.90 -1.4% Tuesday after spiking +5.8% to $114.44 Monday (WTI to $104.10 -2.2% Tuesday from Monday\'s ~$105 +3%, off Wednesday\'s $126/bbl four-year intraday peak but still at the highest sustained level since mid-2022) as the tape priced partial Iran-UAE de-escalation and the Project Freedom day-one panic faded — OPEC+ Sunday May 3 confirmed a +188,000 bpd June output increase across the seven-country bloc (Saudi +62K / Russia +62K / Iraq +26K / Kuwait +16K / Kazakhstan +10K / Algeria +6K / Oman +5K, slightly below the 206K May bump and explicitly without UAE participation post-exit), Barclays raised 2026 Brent forecast to $100/bbl on the supply-response math even as Strait exports remain ~4% of normal under the dual US-Iran blockade and ~2M bpd of UAE offshore production stays shut-in; 10Y yield holding 4.35% as the energy-driven inflation re-acceleration offsets ISM Manufacturing prices at four-year high, Fed\'s Barr warning private credit stress could trigger a credit crunch — the four-dissent April 29 FOMC hold (3.50-3.75%) leaves June 16-17 the next live decision with updated SEP', category: 'general', related: '' },
  { headline: 'UAE OPEC exit now five days live (effective Thursday May 1 — first major departure since 1967, drops the cartel from 12 to 11 members, supply control from ~30% to ~26%, UAE targeting 5M bpd capacity by 2027 vs the prior 3.2M quota with pre-war capacity already 4.8M bpd implying ~1.6M bpd of bottled-up supply or ~1.5% of global) — initial 2-3% futures dip on supply-glut fears reversed within 24 hours and the structural take stays muted because UAE can\'t pump what it can\'t ship behind the Hormuz crisis (~2M bpd of UAE offshore production still shut-in into Monday\'s escalation, Fujairah pipeline terminus itself now a target after the IRGC drone strike); OPEC+ explicitly DID NOT mention UAE in the Sunday June +188K bpd communique signaling continuity-by-omission, Trump welcomed the exit as alignment with US energy/foreign-policy interests, and the door stays open for additional defections that would amplify downside pressure once Hormuz reopens under Project Freedom escort cover — the structural impact more 2027-and-beyond than near-term per Wood Mackenzie and Al Jazeera analyst flow', category: 'general', related: '' },
  { headline: 'Coinbase into Wednesday May 7 AMC Q1 print with Wall Street consensus $0.36 EPS and $1.5B revenue (-26.1% YoY) — the transaction-revenue line modeled at $837M (-33.7% YoY on Q1 trading volume of 233M, -40.7%) and the durability tell on the $550-630M company subscription-and-services guide ($617M cons, leaning on blockchain rewards/stablecoin income/Coinbase One growth), global crypto exchange volume cratered ~48% from the October 2025 peak to $4.3T in March (lowest since October 2024) compressing the take-rate line, with the "everything exchange" thesis now leaning on the early-2026 retail-equities launch (Yahoo Finance partnership) and USDC adoption to offset; the institutional-vs-retail mix the second key read (retail ~1.5% take, institutional <5bps), with COIN -57% from peak and the print the cleanest read on whether the regulatory-thaw narrative (CLARITY Act May markup window closing into Memorial Day recess May 21) is translating into operating leverage', category: 'company', related: 'COIN' },
  { headline: 'Netflix closed Friday at $92.37 (post-1:10 split, $384.74B market cap) trading $91.90-94.70 across the weekend with the stock still ~30% off last year\'s peak even after the board\'s $25B buyback authorization (more than the $20B FY26 content budget) — ad-tier guided to $3B FY26 revenue (+100% YoY from $1.5B 2025) with the ad-supported plan now >60% of new sign-ups in markets where it\'s available and 190M monthly-active-viewers globally as of November 2025 (325M+ total subs), Q1 print landed $12.25B rev +16.2% YoY beat / $1.23 EPS beat, mobile-app redesign introducing "Clips" vertical short-form feed for original-programming highlights; Wall Street median PT $114.38 across 51 analysts (32 Buy ratings) implying ~23% upside, with Disney Q2 print Wednesday May 6 AM the next direct streaming-cohort comp on Disney+/Hulu/ESPN+ ARPU and ad-tier traction (cons $24.85B / $1.49 +5% rev / +2.8% EPS)', category: 'company', related: 'NFLX' },
  { headline: 'Intel still riding above $100 into the weekend after the Q1 print obliterated cons (adj EPS $0.29 vs $0.01 cons, rev $13.58B vs $12.42B, +27% in five sessions through the April 28 $85.98 record, ~$470B market cap with the stock more than tripled in a year) as the foundry-revival cements: 18A in high-volume manufacturing running ahead of plan, 14A maturing faster than 18A did at the comparable stage, Q1 foundry rev +16% YoY to $5.4B (vs ~4% Q4 growth), Data Center & AI +22% YoY to $5.05B; Tesla locked in as marquee 14A external customer for the Austin "Terafab" complex producing chips for vehicles, Optimus robots and SpaceX orbital datacenters per Musk\'s Q1-call language, CEO Lip-Bu Tan flagging "multiple 18AP/14A customer engagements" with Amazon and Cisco already on advanced-packaging — Intel the cleanest beneficiary of the on-shoring policy backdrop and the chip-sovereignty premium baked into the $710B hyperscaler capex pipe and Berkshire\'s record $397B cash pile awaiting deployment', category: 'company', related: 'INTC' },
  { headline: 'Strategy (MSTR) holds its bitcoin-buying pause into Tuesday May 5 BMO Q1 earnings — Saylor confirmed on X "no acquisitions in the trailing reporting window" with treasury-team posture shifting to capital-structure work into the print, the first multi-week BTC-buy hiatus since the September 2025 ATM pause and Saylor signaling buys resume the following week; Strategy holds 818,334 BTC at a $75,532 average cost (~$65.6B value at $80.1K spot, +$3.78B unrealized gain) financed via the 0% 2027/2028/2030/2031/2032 converts plus the STRK/STRF/STRD perpetual-preferred stack, Q1 setup centered on the ~$120M revenue line, the GAAP loss tied to BTC mark-to-market swings, the Bitcoin-Yield ($/BTC) and Bitcoin-Gain (BTC) operating KPIs and on whether management revisits the 1M-BTC FY26 target — Texas Capital\'s Randy Binner raised PT to $225 from $200 (Buy reiterated, $20B 2026 capital-issuance outlook up from $17B prior, $11B already raised YTD), options pricing an 8.07% implied move and the print the cleanest read on crypto-corporate cash discipline through the Iran-war volatility window with Coinbase Wednesday May 7 AMC the gating exchange print right behind it', category: 'company', related: 'MSTR' },
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
