import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-05-12 01:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'Intel (INTC) extended its all-time-high run Monday May 11 closing +4.65% near $128.64 with an intraday range $123.92-$133.48 per Timothy Sykes / Intellectia / GuruFocus — the fifth consecutive record-territory session and now ~+240% YTD, ~+500% from the 2025 low with market cap topping $600B and surpassing Oracle — on Apple foundry-deal momentum compounded by fresh reporting of a parallel Google chip-making arrangement and the late-Friday SambaNova approval; the WSJ May 8 scoop confirmed Apple and Intel have reached a preliminary chip-making agreement after more than a year of intensive talks (the structural step beyond Bloomberg\'s May 5 "exploratory" framing) with Intel\'s foundry as a secondary option to longtime TSMC partner for chips based on Apple\'s own designs, early indications pointing to lower-end M-series silicon for select iPad and Mac models with chips potentially landing by 2027 — WSJ flagging Apple "has concerns about using non-TSMC technology and may not ultimately move forward with another partner" if 18A/14A yields disappoint, discussions remain "early stage" with no firm orders; Bank of America held its raised $96 PT (from $56) saying the deal would add ~$10B annual sales by 2030 per Stocktwits, the US government as Intel\'s largest shareholder (10% stake under CEO Lip-Bu Tan) the orchestrator per CNBC with Commerce Secretary Lutnick repeatedly meeting Cook, Musk and Jensen — the strategic US-fab angle feeding the cleanest tech-supply-chain narrative into Trump-Xi May 14-15 Beijing where Iran is now "center stage" per CNBC after Sunday\'s "TOTALLY UNACCEPTABLE" rejection and Monday\'s "life support" / "garbage" Trump comments on the counter-offer', category: 'company', related: 'INTC' },
  { headline: 'Apple (AAPL) extended Friday\'s post-WSJ-Intel-deal gains into Monday May 11 with the cohort tape holding the S&P 500 / Nasdaq fresh record close (S&P 7,412.84 +0.19%, Nasdaq 26,274.13 +0.10%, Dow 49,704.47 +0.19% per Yahoo / Bloomberg) as the WSJ May 8 scoop confirmed Apple and Intel reached a preliminary chip-making agreement after more than a year of intensive talks — Intel +4.65% Monday extending its ATH run to a fifth straight session at ~$128.64 (intraday $133.48, ~+240% YTD, ~+500% from the 2025 low, market cap >$600B); the deal would give Apple a secondary foundry option to longtime partner Taiwan Semiconductor for chips based on Apple\'s own designs, early indications pointing squarely at lower-end M-series silicon for select iPad and Mac models with chips potentially landing by 2027 — though WSJ flagged Apple "has concerns about using non-TSMC technology and may not ultimately move forward with another partner" if Intel 18A/14A yields disappoint, preserving execution risk; per CNBC the US government as Intel\'s largest shareholder (10% stake under CEO Lip-Bu Tan) played the major role bringing Apple to the table, Lutnick meetings with Cook (alongside Musk and Jensen) over the past year encouraging Intel-foundry work — the strategic angle of strengthening AAPL\'s ties with the Trump administration into the May 14-15 Beijing summit, where Iran is expected to take "center stage" per CNBC after Trump\'s Monday "life support" / "garbage" framing of Tehran\'s counter-offer; the prior-quarter print already booked the bull case ($111.18B rev +16.6% YoY March-quarter record, $2.01 EPS +22%, iPhone $57B +22%, Greater China +28%, June guide rev +14-17%, $100B buyback re-up, dividend +4% to $0.27), Wedbush $350 / BofA $330 / JPMorgan $325 OW the post-print PT cohort', category: 'company', related: 'AAPL' },
  { headline: 'AWS confirmed Friday May 8 the May 7-8 thermal event in its US-East-1 northern Virginia region was triggered by failed chillers in availability zone use1-az4 — engineers detecting overheating at ~5:25 PM PDT Thursday with the cooling failure cascading into power interruptions and hardware failures across EC2 instances and EBS storage volumes, total incident duration 12+ hours per AWS Health Dashboard updates per IT Pro / GuruFocus / CrowdFund Insider with full restoration extending into Friday; the disruption hit Coinbase core exchange functions and order matching for roughly seven hours, FanDuel sportsbook operations and the CME Group trading platform — AMZN slipped ~1% Thursday on the disclosure with the operational hit to a $200B FY26 capex pipe (AWS $37.6B Q1 +28% YoY 15-quarter-fastest at 37.7% segment OI margin) landing a counterweight to the cumulative $725B four-hyperscaler AI-capex envelope per FT compilation (AMZN $200B / GOOGL $180-190B / META $125-145B / MSFT $190B calendar-2026 +61% YoY per Hood\'s May 2 framing, total +77% YoY from last year\'s $410B record) that the Q1 cycle ratified, with thermal-design and redundancy questions now firmly in scope as the May super-week conference circuit continues into NVDA fiscal-Q1 May 20 AMC and the Trump-Xi May 14-15 Beijing summit, the bounce-back tested again Monday after the Friday records-day close masked the underlying single-region single-AZ concentration risk', category: 'company', related: 'AMZN' },
  { headline: 'Coinbase (COIN) tightened into the Senate Banking Committee CLARITY Act markup now T-minus 60 hours (Thursday May 14 at 10:30 AM ET in Room 538 Dirksen) per CoinDesk / Unchained / Bitcoin Magazine / CryptoSlate / Phemex — the three largest US bank trade groups (ICBA, BPI, ABA) formally rejected the Tillis-Alsobrooks stablecoin-yield compromise Friday May 9, the compromise banning yield equivalent to bank deposits but allowing "bona fide activities" with Coinbase chief legal officer Paul Grewal saying the language "preserves activity-based rewards tied to real participation on crypto platforms and networks" and the company "focused on getting a bill done," Lummis "almost 99% sorted out" on stablecoin language with the Memorial-Day-recess deadline tightening; structurally Coinbase fully resumed after the AWS US-East-1 thermal outage that knocked exchange functions offline ~5-7 hours Thursday-Friday (use1-az4 cooling failure cascading into EC2/EBS hardware failure, AWS confirming the duration also hit FanDuel and the CME Group platform), CEO Brian Armstrong calling the outage "never acceptable" and promising a full root-cause analysis as the week packaged with 700 layoffs Monday, the $394M GAAP net loss Thursday and the Friday outage into "the worst week" framing per The Next Web; the Q1 miss reaction ($1.41B revenue cons $1.48B / -31% YoY, $394.1M GAAP net loss / -$1.49 EPS hammered by $482M unrealized losses on crypto held for investment, transaction revenue $755.8M cons $805.2M, spot volumes -37% QoQ) prompted Clear Street, Barclays, Piper Sandler and BofA to trim PTs with the stock still down ~15% YTD — Trump-Xi May 14-15 Beijing summit Day 1 overlap the macro cross-asset frame', category: 'company', related: 'COIN' },
  { headline: 'Nvidia (NVDA) holding into the May 20 AMC fiscal-Q1 print — management $78B ±2% revenue guide implying ~77% YoY growth, Visible Alpha modeling consensus in line with the midpoint, Wall Street expecting Q2 FY27 guidance at $86.6B implying further acceleration to ~85% — through the AWS US-East-1 thermal outage that took down Coinbase / FanDuel / CME, the WSJ Apple-Intel preliminary chip-making agreement that sent INTC +15% to a $130.57 ATH, and the S&P 500 / Nasdaq Friday record-day close on the +115K April BLS payrolls upside surprise; the AAPL-Intel deal a structural-positive read-through to US-fab-policy momentum that NVDA has been increasingly aligned with (Jensen-Lutnick repeated White House meetings over the past year, US-fab orders the Trump-administration favored stance), the cumulative $725B FY26 hyperscaler capex envelope per FT compilation (+77% YoY) the demand pipe with MSFT specifically directing two-thirds of its $190B calendar-2026 capex toward GPUs and CPUs for Azure and Copilot per CFO Amy Hood — Wall Street has already baked roughly 77% growth so a beat needs to print 80%+ revenue growth for a meaningful post-print pop, Q1 guide explicitly excludes all China DC compute revenue (Jensen estimates ~$50B effective-zero stream) and the Trump-Xi May 14-15 Beijing summit the cross-asset risk overlay with the Iran war expected to take "center stage" per CNBC summit analysis, US sanctioning fresh Chinese companies linked to Iran days ahead of the trip the binding bilateral irritant', category: 'company', related: 'NVDA' },
  { headline: 'Microsoft (MSFT) digesting the $190B calendar-2026 capex headline (+61% YoY, ~$25B from higher component pricing per CFO Amy Hood per Vaasblock / CNBC framing, vs $154.6B FactSet cons running roughly $55B below the guide) through Friday May 8 with the underlying FY26 Q3 Azure +39% cc print and Microsoft Cloud crossing $50B holding the bull case alongside annualized AI revenue $37B (+123% YoY) — Hood specifically directing two-thirds of the capex envelope to GPUs and CPUs for Azure and Copilot, FY26 Q3 capex hitting $30.9B (+49% YoY) compressing FCF to $15.8B even as operating cash flow stayed strong at $46.7B; the $725B four-hyperscaler total per FT compilation now tested by the Friday AWS US-East-1 thermal outage that knocked Coinbase / FanDuel / CME offline 12+ hours and adds redundancy / cooling-design questions to the AI-infrastructure-capex narrative — but the WSJ Apple-Intel preliminary chip-making agreement that lifted INTC +15% to $130.57 ATH (Microsoft already counted by TheStreet alongside Amazon and Tesla as prior Intel-foundry customers) reinforces the US-fab-policy tailwind, and the NVDA fiscal-Q1 May 20 AMC the next-gating AI-hardware print with the Trump-Xi May 14-15 Beijing summit and the Senate Banking Committee CLARITY Act markup Thursday May 14 the same-week cross-asset overlay into the June 16-17 FOMC where Boston Fed\'s Collins sided with the four April-29 dissenters and CME FedWatch shows ~70% probability of another hold', category: 'company', related: 'MSFT' },
  { headline: 'Disney (DIS) holding the Wednesday May 6 Q2 BMO blowout into the weekend — Entertainment DTC operating income $582M +88% YoY on streaming SVOD revenue +13%, the segment\'s first sustained double-digit DTC operating margin per Variety / CNBC, Entertainment-segment revenue +10%, total Q2 revenue $25.17B (cons $24.85B) / $1.57 adj EPS (cons $1.50), Parks & Experiences revenue ~$9.5B +7% YoY / segment OI +5%, FY26 adj-EPS guide reiterated at ~+12% growth, FY buyback authorization raised to at least $8B from $7B prior; CEO Josh D\'Amaro\'s first call post-Iger transition delivered hard with the streaming-margin trajectory firmly inside the FY26 DTC target, ESPN DTC the standout new contributor per Variety with digital subscriber revenue more than offsetting traditional-TV declines — shares popped ~7% post-print Wednesday and the cohort relative-strength bid held through Friday\'s S&P 500 record close 7,398.93 (+0.84%) and Nasdaq record 26,247.08 (+1.71%) on the +115K April BLS payrolls upside surprise; the streaming-margin print the cleanest direct read-through to NFLX\'s ad-revenue trajectory and the parks-segment +7% the consumer-discretionary tell against the Brent-$100-plus Strait-of-Hormuz overlay running into Trump-Xi May 14-15 Beijing', category: 'company', related: 'DIS' },
  { headline: 'Tesla (TSLA) traded between $414.50 and $431.20 with last around $428 by end-week per Tikr / 247WallSt — recovered sharply from the post-Q1 $373 April 23 low — holding the Cybercab volume-production ramp narrative through the broader records-day tape and the WSJ Apple-Intel preliminary chip-making agreement that lifted INTC +15% to $130.57 ATH (Musk one of the named CEOs Commerce Secretary Lutnick repeatedly met with over the past year to encourage Intel-foundry work, TheStreet specifically listing Tesla alongside Microsoft and Amazon as prior Intel-foundry customers); Cybercab production began at Giga Texas in April after the February prototype with H1 2026 expansion targeted across Dallas, Houston, Phoenix, Miami, Orlando, Tampa and Las Vegas per Bloomberg / Nasdaq, Robotaxi ride-hailing already operational in Austin, Dallas and Houston with plans for roughly a dozen US states by year-end and Musk targeting unsupervised FSD to customers "probably Q4"; the capex angle remains the bear-case pinch — management reiterated negative FCF for the rest of 2026 and capex guided above $25B per Heygotrade — but the AI/robot/Optimus optionality keeps the cohort bid alongside the $725B FY26 hyperscaler capex envelope per FT compilation, NVDA fiscal-Q1 May 20 AMC the next-gating AI-hardware print and the Trump-Xi May 14-15 Beijing summit the cross-asset overlay with US sanctions on fresh Chinese companies linked to Iran landing six days before the trip', category: 'company', related: 'TSLA' },
  { headline: 'Strategy (MSTR) confirmed Monday May 11 it had acquired 535 BTC for $43M at a $80,340 average price — pushing total holdings to 818,869 BTC at $75,540 avg cost per Bitcoin Magazine / News.Bitcoin.com / Foreign Policy Journal / Invezz — the buy funded through $0.1M raised via the STRC ATM and $42.9M from the MSTR ATM offering, six days after executive chairman Michael Saylor told the Q1 call Strategy was prepared to sell a portion of its bitcoin holdings for the first time, the Sunday May 10 "Back to work, BTC" X post and "Orange Dots" chart presaging the purchase; the 818,869-BTC position (~3.9% of the 21M hard cap, ~$61.84B basis) sits on ~+8% unrealized gain at BTC $81,597 Monday 01:00 UTC May 12 per Crypto.com tape, even as Q1 booked a $12.54B unrealized loss under FASB fair-value rules (BTC -23% Q1) generating a $2.2B deferred-tax asset to offset future gains; Saylor told CoinDesk the prospect of selling BTC to fund dividends is "inconsequential" / "a big nothing-burger" — describing the model on video as "buy 10 Bitcoin, sell one to fund dividends, buy 10 more, sell one more" — proceeds-of-sale earmarked to retire $8.2B in convertible debt, buy MSTR when mNAV < 1.22x or fund the $1.5B annual perpetual-preferred dividend stack (STRC, STRK/STRF/STRD); Polymarket has priced meaningful odds Strategy sells some of its position this year per Decrypt, the convertible / preferred stack (0% 2027/28/30/31/32 converts) back into focus into the 1M-BTC FY26 target', category: 'company', related: 'MSTR' },
  { headline: 'Bitcoin held above $81.5K Tuesday May 12 01:00 UTC trading $81,597.12 on the Crypto.com tape (+0.21% 24h, range $80,459.56-$82,160.77, last $81,597.12, 24h volume value ~$285.8M) — adding to the Monday-session bid that flipped the early-Monday weakness as Strategy\'s confirmed 535-BTC / $43M Monday purchase at $80,340 avg (818,869-BTC total) reasserted treasury demand, even as Trump\'s Monday comments calling the Iran ceasefire "on life support" / Tehran\'s counter-offer "garbage" sent Brent up nearly 3% to settle $104.21 and WTI to $100.20 per CNBC / Investing.com / The National; weekly US-spot-BTC-ETF flows tracked ~$1B net inflow for the week ending Friday May 9 per Cointelegraph / Coinpaper — the sixth consecutive week of net inflows, longest streak since August 2025 with $3.4B cumulative since early April — Morgan Stanley\'s spot-BTC ETF drew $194M Monday May 11 per Phemex highlighting fresh low-fee-product demand, IBIT cumulative inflows holding above $59.5B since launch; the Russia-Ukraine three-day Victory-Day ceasefire expired Monday with both sides trading violation accusations (Ukraine reporting 2 killed / 7 wounded incl. a 14-year-old boy in Kharkiv-Kherson, Russia citing "more than 1,000" Ukrainian breaches), Senate Banking CLARITY Act markup firmed Thursday May 14 at 10:30 AM ET (three top US bank trade groups rejected the Tillis-Alsobrooks stablecoin compromise May 9) the same-week structural catalyst alongside Trump-Xi Beijing Day-1 overlap', category: 'crypto', related: 'BTC' },
  { headline: 'Ether held the $2,335 line Tuesday May 12 01:00 UTC trading $2,335.21 on the Crypto.com tape (-0.64% 24h, range $2,304.01-$2,365.87, last $2,335.21, 24h volume value ~$103.9M) — sole loser among the four majors and the laggard in the cohort even as the broader risk tape posted Monday\'s S&P / Nasdaq record close (7,412.84 / 26,274.13), the relative weakness extending after Trump\'s Monday "life support" / "garbage" framing of Iran\'s counter-offer (Tehran framing the US 14-point MoU as "surrender" and demanding reparations, full Hormuz sovereignty, sanctions removal and seized-asset release while vowing to "never bow" per CNBC / Bloomberg) pushed Brent up nearly 3% to settle $104.21 — altcoin-beta now ranking SOL +2.06% > XRP +1.64% > BTC +0.21% > ETH -0.64%; structurally BlackRock\'s ETHA holds $10B+ AUM (third-fastest US ETF to that mark per Datawallet) and Fidelity\'s FETH matches the 0.25% sponsor fee with frequent waivers, but May 7 spot-ETH-ETF complex flipped -$103.5M (no fund posting positive flows, FETH -$62.26M / ETHA -$26.31M erasing most of the $271.61M cumulative from the May 1-6 four-positive run), a single whale deposited 78,000 ETH (~$178M) to Binance Friday May 8 while BlackRock and Fidelity moved 35,394 ETH to Coinbase Prime — institutional distribution / accumulation split keeping the May tape range-bound; +115K April BLS payrolls upside surprise prices CME FedWatch at ~70% probability of a June 16-17 hold, Senate Banking CLARITY Act markup Thursday May 14 the structural catalyst', category: 'crypto', related: 'ETH' },
  { headline: 'Solana cleared $97.60 Tuesday May 12 01:00 UTC trading $97.64 on the Crypto.com tape (+2.06% 24h, range $94.32-$98.40, last $97.64, 24h volume value ~$16.9M) — now decisively above the $93 descending-resistance trendline that had capped upside since early March per CoinPedia and approaching the $98 round-figure overhead, leading the majors with the leaderboard reading SOL +2.06% > XRP +1.64% > BTC +0.21% > ETH -0.64% on the Tuesday 01:00 UTC tape; the roughly $33M weekly inflow into US spot Solana ETFs per CoinPedia / MEXC reasserted institutional interest into the breakout but monthly US-spot-SOL-ETF inflows have declined six straight months (November 2025 ATH $419.38M → April 2026 $39.93M, the weakest print since the October 2025 launch) — combined SOL spot ETF holdings now approaching ~2% of circulating supply per CoinDesk, the late-April catalyst stack still anchoring the bid (Visa and Meta expanding Solana payments, Solana Swiss Research Institute launch, April 28 quantum-resistant signature migration, Israel CMA BILS approval — 1:1 ILS-pegged stablecoin on Solana with sub-400ms settlement, EY-audited reserves, Fireblocks custody) plus the Alpenglow upgrade pushing transaction finality toward sub-150ms; Trump-Xi May 14-15 Beijing the cross-asset overlay with Iran taking "center stage" per CNBC after Trump\'s Monday "life support" / "garbage" rejection of the counter-offer, Senate Banking CLARITY Act markup firmed Thursday May 14 the same-week structural catalyst with the bank-trade-group rejection of the Tillis-Alsobrooks stablecoin compromise May 9 the new friction', category: 'crypto', related: 'SOL' },
  { headline: 'XRP held the $1.48 line Tuesday May 12 01:00 UTC trading $1.4804 on the Crypto.com tape (+1.64% 24h, range $1.4401-$1.4886, last $1.4804, 24h volume value ~$13.3M) — second-strongest performer with rankings now SOL +2.06% > XRP +1.64% > BTC +0.21% > ETH -0.64% as the Senate Banking Committee CLARITY Act markup countdown tightens to T-minus 60 hours (Chair Tim Scott firmed Thursday May 14 at 10:30 AM ET in Room 538 Dirksen per CoinDesk / Unchained / Bitcoin Magazine / CryptoSlate — the bill that would permanently classify XRP a digital commodity, 24/7 Wall St projecting a committee-pass scenario lifts XRP into the $1.70-$2 range with full-Senate passage targeting $3-$4 year-end and $5+ on ~$5B cumulative ETF inflow); structurally the US spot XRP ETF complex pulled in $28.1M across just three days May 4-6 with cumulative inflows now ~$1.32B since launch and Standard Chartered projecting $4-8B cumulative inflows by year-end if the bill passes — but ~$3B of sell-wall sits parked above $1.45 per FXLeaders triangle-apex framing so the committee pass alone may not be enough to absorb the full overhead; the three largest US bank trade groups (ICBA, BPI, ABA) formally rejected the Tillis-Alsobrooks stablecoin-yield compromise Friday May 9 per Phemex / CryptoSlate adding a fresh CLARITY-friction layer just days before the gavel, Lummis "almost 99% sorted out" on stablecoin language with the Memorial-Day-recess deadline tightening, the Trump-Xi May 14-15 Beijing summit Day-1 overlap the macro cross-asset frame with Iran "center stage" per CNBC after Trump\'s Monday "life support" / "garbage" rejection', category: 'crypto', related: 'XRP' },
  { headline: 'US spot Bitcoin ETFs tracked roughly $1B in net inflows for the week ending Friday May 9 per Cointelegraph / Coinpaper — the sixth consecutive week of net inflows and the longest sustained streak since August 2025, $3.4B cumulative since early April — even after the May 7 single-session flip negative at -$277.5M (FBTC -$128.99M / IBIT -$98.02M) and the latest week ending with sharp Thursday-Friday outflows partly offset by stronger inflows earlier ($622.75M net for the week per Coinpaper); Morgan Stanley\'s spot-BTC ETF drew $194M Monday May 11 per Phemex highlighting fresh low-fee-product demand, cumulative net inflow since launch holding above $59.5B with IBIT still the largest spot BTC ETF (>$66B AUM, ~810K-BTC holdings, larger by AUM than most of BlackRock\'s gold and EM ETFs combined), BlackRock\'s European bitcoin ETP crossing $1.1B AUM holding 14,200 BTC as of May 4; April closed at $2.44B net inflow per Coinglass / SpotedCrypto — the strongest monthly figure since October 2025 — with the week ending April 24 delivering $823.70M; the ETH complex turned negative the same May 7 session at -$103.52M (FETH -$62.26M, ETHA -$26.31M) erasing most of the $271.61M cumulative from the May 1-6 four-positive run; the flow-tape pricing flipped through Monday May 11 with Strategy\'s confirmed 535-BTC / $43M Monday purchase at $80,340 reasserting treasury demand (818,869-BTC total), BTC $81,597 Tuesday 01:00 UTC May 12 (+0.21%) and ETH $2,335.21 (-0.64%) after Trump\'s "life support" / "garbage" framing of Iran\'s counter-offer pushed Brent up nearly 3% to settle $104.21', category: 'crypto', related: 'BTC' },
  { headline: 'US equities posted a third straight record-close session Monday May 11 — S&P 500 7,412.84 (+0.19% / +13.91), Nasdaq Composite 26,274.13 (+0.10% / +27.05), Dow Jones 49,704.47 (+0.19% / +95.31), Russell 2000 also at a fresh record per TheStreet / Yahoo Finance / CNBC / Fool — closing the seventh straight winning week as the AI-supercycle bid (JPMorgan Private Bank 2026-midyear outlook calling the "supercycle may just be getting started" and the prevailing narrative "too pessimistic") more than offset Trump\'s rejection of Iran\'s counter-offer ("the ceasefire is on life support... unbelievably weak... garbage") which sent Brent crude up nearly 3% to settle $104.21/bbl and WTI to $100.20 per CNBC / Investing.com; Intel +4.65% closed near $128.64 (intraday $133.48, fifth straight record-territory session) on Apple-foundry-deal momentum compounded by fresh Google chip-making reporting, Akamai (AKAM) surged 26.6% to $147.71 on a $1.8B / 7-year cloud-infrastructure commitment from a "leading frontier model provider" plus Q1 revenue topping $1B (+6% YoY), Dropbox (DBX) +15% on Q1 $0.76 adj EPS topping $0.71 cons and a raised full-year guide, Moderna (MRNA) +8% on hantavirus-vaccine speculation, Nintendo (NTDOY) -7% Tokyo on Switch 2 price-hike concerns; the NVDA fiscal-Q1 May 20 AMC print the next-gating AI-hardware catalyst, Trump-Xi May 14-15 Beijing summit and Senate Banking CLARITY Act markup Thursday May 14 the same-week cross-asset overlay', category: 'general', related: '' },
  { headline: 'April BLS nonfarm payrolls printed +115K Friday May 8 8:30 ET — well above the ~+65K Wall Street consensus and the first back-to-back monthly hiring gain in nearly a year — with unemployment unchanged at 4.3%; the upside surprise reasserts the historically-tight-but-cooling labor narrative against the four-dissent April 29 FOMC hold (3.50-3.75% target range), CME FedWatch now showing roughly 28% probability of a 25bp cut at the June 16-17 FOMC and 70% probability of another hold per TradingEconomics / Schwab framing, with a small but growing contingent betting on zero 2026 cuts — Boston Fed\'s Susan Collins told Bloomberg May 7 she sided with the three other regional-bank-president dissenters at April 29 over wording suggesting eventual resumption of cuts, "war-fueled inflation risks" now outweighing labor concerns per JPMorgan Global Research framing; the print closed at S&P 500 record 7,398.93 (+0.84%) and Nasdaq record 26,247.08 (+1.71%, 26,000 first crossing) with rotation into the AI-hardware complex (INTC +15% on the WSJ Apple-deal scoop, AAPL +1.7%) absorbing most of the upside — fresh layoff cycle continues (Cloudflare -1,100 / -20%, BILL -30%, Upwork ~-25%) underscoring the AI-displacement counter-narrative, full-Senate vote on Kevin Warsh expected the week of May 11 with Warsh likely handling the June FOMC if confirmed', category: 'general', related: '' },
  { headline: 'The Trump-orchestrated three-day Russia-Ukraine Victory Day ceasefire (May 9-11, 1,000-for-1,000 prisoner exchange) expired Monday May 11 with both sides accusing each other of mass violations per Kyiv Independent / Washington Times / PBS / CBC / Al Jazeera / Kyiv Post — Ukrainian authorities reporting Russian drones, bombs and artillery shelling struck civilian areas of the northeastern Kharkiv and southern Kherson regions Monday, killing at least 2 people and wounding 7 including a 14-year-old boy, on top of 3 civilians killed and 16 wounded May 10 with Ukraine\'s General Staff citing 180 combat engagements in 24 hours and Russia launching 8,037 kamikaze drones and 6,380 attacks May 10 alone; on the Russian side the Defense Ministry said it had recorded "more than 1,000" Ukrainian breaches across the May 9-11 window — drone and artillery strikes targeting Russian troops and civilian infrastructure in occupied Crimea and the Belgorod, Kursk, Kaluga, Rostov regions and Krasnodar Krai — the Institute for the Study of War noting "ceasefires without explicit enforcement mechanisms, credible monitoring, and defined dispute resolution processes are unlikely to hold"; Zelensky reiterated Russia was "not even particularly trying" to observe the truce and pledged retaliation, Putin again said the war was "heading to an end," Trump on Truth Social framed the pause as "the beginning of the end" — the de-facto collapse of the truce stacks on top of the now-rejected US-Iran 14-point MoU into the Trump-Xi May 14-15 Beijing summit', category: 'general', related: '' },
  { headline: 'Israeli strikes on Lebanon continued Monday May 11 with 3 killed and 6 injured per Express Tribune / Al Jazeera — two killed and five injured in an airstrike on the town of Ebba in Nabatieh, one killed and a brother injured in a drone strike on a car in Haris (Bint Jbeil district), with additional strikes hitting the home of a former municipal chief in Sajd and Kfar Rumman (casualty details pending) — extending the weekend escalation that killed at least 39-41 in 24 hours including the Saksakiyeh strike (7 killed incl. a child, 15 wounded per Lebanon\'s Health Ministry, the worst single-day toll since the April 17 Israel-Hezbollah truce), strikes across Nabatieh, Bourj Rahhal and Maifadoun and three drone strikes south of Beirut Saturday killing 4; per Palinfo / Al Jazeera total deaths since March 2 have reached 2,846 with 8,693 injured and over 1 million displaced, Hezbollah claimed cross-border retaliation Saturday firing drones at Israeli military posts in northern Israel on at least two occasions — the daily kinetic exchange continuing despite the three-week-old truce now extended to mid-May, with strikes also reported across rural Nabatieh and Tyre and mountain areas around Nabi Sheet, Khreibeh and Brital; the Lebanon-front escalation runs alongside the US-Iran "life support" ceasefire breakdown and the US-hosted Lebanon-Israel peace talks set for Washington May 14-15 — overlapping directly with the Trump-Xi Beijing summit and the Senate Banking CLARITY Act markup', category: 'general', related: '' },
  { headline: 'Trump told reporters Monday May 11 the US-Iran ceasefire is "on life support" and "unbelievably weak" — calling Iran\'s counterproposal to end the 10-week war "garbage" per CNBC / Investing.com / The National / Columbian / Bloomberg — escalating Sunday\'s Truth Social "TOTALLY UNACCEPTABLE" rejection of the response from Iran\'s "so-called \'Representatives\'" after Iranian state TV framed the US 14-point MoU negotiated by Witkoff and Kushner as amounting to "surrender" and instead demanded US war reparations, full Iranian sovereignty over the Strait of Hormuz, an end to all sanctions, release of seized Iranian assets, agreeing to suspend uranium enrichment for a shorter window than the 20-year US-proposed moratorium and rejecting outright dismantling of nuclear facilities; Tehran vowed it would "never bow," with Iran offering to transfer its enriched-uranium stockpile to a third country per Bloomberg — the kinetic-and-diplomatic standoff prolonging the effective closure of the Strait of Hormuz in place since late February, Brent crude settling +nearly 3% at $104.21/bbl Monday (some intraday prints above $105) and WTI hitting $100.20 ending a three-day losing streak per Investing.com / Reuters, US gas now averaging $4.50/gal per Schwab; Citi analysts noting risks remain tilted to the upside with Iran retaining significant control over Hormuz reopening — US-Iran talks in limbo after the April 11 Islamabad 21-hour Vance-Witkoff-Kushner meeting failed and Trump cancelled the planned April 25 trip as "time wasted," the rejection landing three days before the Trump-Xi May 14-15 Beijing summit where Iran is now expected to take "center stage"', category: 'general', related: '' },
  { headline: 'The Trump administration imposed fresh sanctions on Chinese companies linked to Iran Friday May 8 — landing six days before Trump\'s scheduled May 14-15 Beijing summit with Xi and adding a sharp new bilateral irritant to a trip already operating against the backdrop of Chinese-officials\' unease about proceeding before the Iran war is resolved per CNBC / Bloomberg / Fortune; China has publicly barred its companies from complying with US sanctions after the US blacklisted five Chinese refiners for processing Iranian oil — the first invocation of China\'s blocking statute, one of its strongest tools for countering foreign sanctions per Fortune / Foreign Policy — even as Treasury Secretary Bessent confirmed Iran will be on the agenda and CNBC frames Iran as taking "center stage" potentially crowding out tariffs and rare earths; the summit nonetheless remains on track per a White House official with Boeing CEO Kelly Ortberg confirmed traveling for a potential 500-aircraft package, Citigroup and Mastercard CEOs joining, expected announcements including bilateral "Board of Trade" identifying non-sensitive sectors for purchase commitments, limited tariff adjustments and likely Chinese purchases of US Boeing aircraft and agricultural goods per CSIS / Brookings / WEF analysis; Senate Banking CLARITY Act markup falls on Day 1 of the summit (Thursday May 14 at 10:30 AM ET per CoinDesk) — Lummis "almost 99% sorted out" on stablecoin language, the binding Memorial Day recess deadline tightening', category: 'general', related: '' },
  { headline: 'UK Prime Minister Keir Starmer rejected resignation calls into Sunday May 10 after Labour suffered historic local-election losses to a surging Reform UK per NPR / Al Jazeera / CBS News — Nigel Farage\'s party gaining more than 1,400 council seats and taking control of councils including Essex, Havering (its first London local authority), Sunderland, Newcastle-under-Lyme and Suffolk, Labour losing 1,496 councillors and control of 38 councils and getting "booted from power in Wales after 27 years" — Starmer telling reporters he would "not walk away and plunge the country into chaos," describing his government as a "10-year project of renewal" and committing to lead Labour into the next general election, Farage in a newspaper column calling the results "the end of the old establishment\'s two-party system"; in parallel the FAO global-food-price index rose 1.6% in April for the third consecutive monthly gain (vegetable-oil index +5.9% to a fresh highest-since-July-2022 mark on biofuel demand and Hormuz pass-through, Meat Index a fresh record), reasserting inflation-stickiness against the Fed\'s four-dissent April 29 hold and the JPMorgan Research framing that "war-fueled inflation risks" now outweigh labor concerns — Brent reclaimed $100 / $101.12 Friday on the US-CENTCOM Hormuz exchange (three Navy destroyers attacked, US strikes in response), the Russia-Ukraine three-day ceasefire (May 9-11) entering its final day with both sides trading violation accusations the diplomatic backdrop into Trump-Xi May 14-15', category: 'general', related: '' },
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
