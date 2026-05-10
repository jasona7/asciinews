import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-05-10 13:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'Intel (INTC) closed Friday May 8 at a fresh ATH $130.57 (+15% session, ~+19% intraday peak, +200%+ from the year-ago $18.96 trough and ~74% above the August 2000 dot-com peak of $74.88) on the WSJ Friday scoop confirmed in detail by CNBC and 9to5Mac that Apple and Intel have reached a preliminary chip-making agreement after more than a year of intensive talks — a meaningful step beyond the Bloomberg May 5 "exploratory" framing that had already lifted the stock to $113.01 Tuesday — with the deal landing Intel\'s foundry services as a secondary option to longtime partner TSMC for A-series and M-series silicon based on Apple\'s own designs (much like TSMC currently does), early indications pointing squarely at Mac and iPad lineups with the contract path potentially landing CPUs by 2027 (WSJ noting Apple "has concerns about using non-TSMC technology and may not ultimately move forward with another partner" if 18A/14A yields disappoint, discussions remain "early stage" with no firm orders); per WSJ, Commerce Secretary Howard Lutnick met repeatedly with Tim Cook over the past year — alongside Musk and Jensen Huang — to encourage Intel-foundry work, the strategic angle of strengthening US-fab capacity feeds the cleanest tech-supply-chain narrative into the Trump-Xi May 14-15 Beijing summit; Samsung Electronics also touched a record KRW232,500 +5.4% Wednesday on the same foundry-talks track, the deal a "vote of confidence" for Intel Foundry Services per CNBC framing', category: 'company', related: 'INTC' },
  { headline: 'Apple (AAPL) finished Friday May 8 up more than 2% on the WSJ Friday scoop confirmed by CNBC, MacRumors and 9to5Mac that Apple and Intel have reached a preliminary chip-making agreement after more than a year of intensive talks — a meaningful step up from the Bloomberg May 5 "exploratory" framing — with Intel surging ~14% to a $130.57 ATH on the same wire (peak +19% intraday); the deal would give Apple a secondary foundry option to longtime partner Taiwan Semiconductor for A-series and M-series silicon based on Apple\'s own designs, early indications pointing squarely at Mac and iPad lineups with chips potentially landing by 2027, though WSJ specifically flags Apple "has concerns about using non-TSMC technology and may not ultimately move forward with another partner" if Intel 18A/14A yields disappoint, preserving execution risk; Commerce Secretary Howard Lutnick has met repeatedly with Tim Cook over the past year (alongside Musk and Jensen) to encourage Intel-foundry work, the strategic angle of strengthening AAPL\'s ties with the Trump administration into the May 14-15 Beijing summit now the cleanest tech-supply-chain narrative — the Q2 print already booked the bull case ($111.18B rev +16.6% YoY March-quarter record, $2.01 EPS +22%, iPhone $57B +22%, Greater China +28%, June guide rev +14-17%, $100B buyback re-up and dividend +4% to $0.27 ex-date May 11), Wedbush $350 / BofA $330 / JPMorgan $325 OW the post-print PT cohort', category: 'company', related: 'AAPL' },
  { headline: 'AWS confirmed the May 7-8 thermal event in its US-East-1 northern Virginia region was triggered by failed chillers in availability zone use1-az4 — engineers detecting overheating at ~5:25 PM PDT Thursday with the cooling failure cascading into power interruptions and hardware failures across EC2 instances and EBS storage volumes, total incident duration ~18-20 hours per AWS Health Dashboard updates per IT Pro and CrowdFund Insider; the disruption hit Coinbase core exchange functions and order matching for more than five hours (delayed Solana and ALEO sends/receives starting 9:00 PM ET Thursday), FanDuel sportsbook operations, and the CME Group trading platform — Coinbase CEO Brian Armstrong calling the outage "never acceptable" and promising a full root-cause analysis, the operational hit to AMZN ($200B FY26 capex, AWS $37.6B Q1 +28% YoY 15-quarter-fastest at 37.7% segment OI margin) lands a counterweight to the cumulative $725B four-hyperscaler AI-capex envelope per FT compilation (AMZN $200B / GOOGL $180-190B / META $125-145B / MSFT remainder, +77% YoY from last year\'s $410B record) that the Q1 cycle ratified, with thermal-design and redundancy questions now in scope as the May super-week conference circuit continues into NVDA fiscal-Q1 May 20 AMC and the Trump-Xi May 14-15 Beijing summit', category: 'company', related: 'AMZN' },
  { headline: 'Coinbase (COIN) bounced 10% from session lows Friday May 8 to close $197.78 +2.50% (intraday $182.80-$201.94 spanning the rebound) after the AWS US-East-1 thermal outage knocked exchange functions offline for ~7 hours per CrowdFund Insider (use1-az4 cooling failure cascading into EC2/EBS hardware failure, AWS confirming the duration also hit FanDuel and the CME Group platform) — CEO Brian Armstrong called the outage "never acceptable" and promised a full root-cause analysis per CoinDesk; the rebound came against the Q1 miss reaction ($1.41B revenue cons $1.48B / -31% YoY, $394.1M GAAP net loss / -$1.49 EPS hammered by $482M unrealized losses on crypto held for investment, transaction revenue $755.8M cons $805.2M with spot volumes -37% QoQ), and the spot-BTC-ETF flow flip Thursday (-$277.5M out, ending the nine-day $2.7B inflow streak); the Senate Banking Committee CLARITY Act markup is now firmed for May 14 per CoinDesk Friday May 9 (Lummis "we are going to mark up the Clarity Act in May... almost 99% sorted out" on stablecoin language; Tim Scott "nearing consensus" with the Tillis-Alsobrooks stablecoin-yield compromise the cleared roadblock), the Trump-Xi May 14-15 Beijing summit in the same window the cross-asset overlay, Citigroup flagging a rebound is coming on the longer-term stablecoin and market-structure tailwinds', category: 'company', related: 'COIN' },
  { headline: 'Nvidia (NVDA) traded ~$198 Friday May 8 (37 covering analysts at Strong Buy with $270.73 mean PT implying ~26% upside) holding into the May 20 AMC fiscal-Q1 print — management $78B ±2% revenue guide, Wall Street modeling ~$78.6B (~78-79% YoY growth) and $1.77 adj EPS +118.5% YoY, Q2 cons already at ~$86.6B implying further acceleration to ~85% — through the AWS US-East-1 thermal outage that took down Coinbase / FanDuel / CME and the WSJ Apple-Intel preliminary chip-making agreement that sent INTC +15% to a $130.57 ATH; the AAPL-Intel deal a structural-positive read-through to US-fab-policy momentum that NVDA has been increasingly aligned with (Jensen-Lutnick repeated White House meetings over the past year, US-fab orders the Trump-administration favored stance), the cumulative $725B FY26 hyperscaler capex envelope per FT compilation (+77% YoY) the demand pipe and AMD\'s Tuesday May 5 Q2 guide ($11.2B vs $10.50B cons / DC $5.8B +57% YoY / server-CPU rev +70%+ YoY guide) the cleanest read-through; Wall Street has already baked ~79% growth so a beat needs to print 80%+ revenue growth for a meaningful post-print pop, Q1 guide explicitly excludes all China DC compute revenue (Jensen estimates ~$50B effective-zero stream) — the Trump-Xi May 14-15 Beijing summit the cross-asset risk overlay with US sanctioning fresh Chinese companies linked to Iran days ahead of the trip', category: 'company', related: 'NVDA' },
  { headline: 'Microsoft (MSFT) digesting the $190B calendar-2026 capex headline (+61% YoY, ~$25B from higher component pricing per CFO Amy Hood, vs $154.6B Visible Alpha cons) through Friday May 8 with the underlying Azure +40% cc print (vs 37-38% guide, well above the 39.3% Visible Alpha bar) and Microsoft Cloud $54.5B +29%, $4.27 EPS / $82.89B rev (cons $4.06 / $81.39B), commercial RPO +99% to $627B and 20M 365 Copilot seats (+5M QoQ) holding the bull case — Wall Street splits hold with Barclays at $545 from $600 OW, Wells Fargo $625 OW; the $725B four-hyperscaler total per FT compilation (+77% YoY) now tested by the Friday AWS US-East-1 thermal outage that knocked Coinbase / FanDuel / CME offline ~18-20 hours and adds redundancy / cooling-design questions to the AI-infrastructure-capex narrative — but AMD\'s Tuesday post-close blowout (Q2 guide $11.2B vs $10.50B cons, DC $5.8B +57% YoY, server-CPU +70%+ YoY guide) confirms the chip operating leverage on the other side of the capex pipe, Rackspace (RXT) +12.5% Friday after the AMD enterprise-AI-cloud MoU for regulated/sovereign workloads adding another read-through; NVDA fiscal-Q1 May 20 AMC the next-gating AI-hardware print and the Trump-Xi May 14-15 Beijing summit the cross-asset overlay', category: 'company', related: 'MSFT' },
  { headline: 'Disney (DIS) closed Friday May 8 around $107.78 (intraday $107.54-$109.32) holding the Wednesday May 6 Q2 BMO blowout multiple sessions on — Entertainment DTC operating income $582M +88% YoY on $5.49B revenue +13%, segment\'s first double-digit operating margin at 10.6%, Entertainment-segment revenue +10% to $11.72B, subscription-and-affiliate fees +14% to $7.8B on streaming price hikes and ad revenue +5% on higher impressions, total Q2 revenue $25.17B (cons $24.85B) / $1.57 adj EPS (cons $1.50), Parks & Experiences Q2-record revenue +7% YoY / segment OI +5%, FY adj-EPS guide reiterated at ~+12% growth, FY buyback authorization raised to at least $8B from $7B prior; Josh D\'Amaro\'s first call as CEO post-Iger transition delivered hard with the streaming-margin trajectory firmly inside the 10% DTC target before fiscal year-end — shares popped ~7% post-print Wednesday, ad-tier traction (60%+ ad-supported new-sub mix in markets where available) the cleanest direct read-through to NFLX\'s $3B FY26 ad-revenue ramp — the cohort relative-strength bid through Friday\'s S&P 500 record close 7,398.93 (+0.84%) and Nasdaq record 26,247.08 (+1.71%) on the +115K April BLS payrolls upside surprise', category: 'company', related: 'DIS' },
  { headline: 'Tesla (TSLA) traded ~$409 Friday May 8 (intraday $402.12-$415.83) holding the Cybercab volume-production ramp narrative through the broader records-day tape — Giga Texas now running ~2,000 units per week with year-end target of 10,000 weekly (volume production began April after the February prototype), Robotaxi ride-hailing network now expanded from the Austin launch to Dallas and Houston with Phoenix / Miami / Orlando / Tampa / Las Vegas pre-mid-year per Bloomberg, Musk targeting "probably Q4" for unsupervised FSD to customers and "a quarter to half of the United States covered by end of year"; the strategic AI/silicon-policy angle reinforced Friday by the WSJ Apple-Intel preliminary chip-making agreement (INTC +15% to $130.57 ATH) — Musk one of the named CEOs Commerce Secretary Lutnick repeatedly met with over the past year to encourage Intel-foundry work — keeping Tesla aligned with the US-fab-policy track as Intel ramps for vehicle/robot/SpaceX-orbital-datacenter silicon; analyst coverage 5 Strong Buy / 18 Buy / 17 Hold / 4 Sell / 3 Strong Sell across 47 names, bullish 49% / bearish 15%, with Cybercab/Tesla Semi/Megapack 3 on schedule for volume production in 2026 per management commentary and Optimus first-generation lines being installed', category: 'company', related: 'TSLA' },
  { headline: 'Strategy (MSTR) Saylor formalized the framework Saturday May 9 with the post "BPS is EPS on the Bitcoin Standard" — explicitly crowning Bitcoin-per-share as the principal capital-decision metric with BTC trading $80,922 Sunday May 10 13:00 UTC on the Crypto.com tape (+0.67% 24h, range $80,223-$81,070), at current spot the 818,334-BTC position (~3.9% of the 21M hard cap) at $75,537 cost / ~$61.83B basis sits at ~$4.41B unrealized gain, well above the February-trough mark-to-market though the Q1 reported $14.46B unrealized BTC hit / $12.54B GAAP net loss / -$38.25 EPS framework re-asserts itself if BTC slips into the mid-70s; Polymarket prediction-market traders are now pricing meaningful odds that Strategy will sell some of its $65B BTC position this year per Decrypt Saturday — the first time the structural-sale thesis has been reflected in market-implied odds since Saylor\'s May 5 conference-call pivot acknowledging the firm "would consider selling Bitcoin" to actively manage the balance sheet for per-share value, with CFO Phong Le confirming BTC will be sold to finance dividends when mNAV falls below 1.0 and to support BPS, a reversal from the longstanding "never sell" line — the convertible / perpetual-preferred stack (0% 2027/28/30/31/32 converts, STRK/STRF/STRD) back into focus into the 1M-BTC FY26 target line and YTD BTC gains; Senate Banking CLARITY Act markup now firmed for May 14 per CoinDesk Friday with the Trump-Xi May 14-15 Beijing summit and the live Russia-Ukraine ceasefire (May 9-11) the macro overlay', category: 'company', related: 'MSTR' },
  { headline: 'Bitcoin extended its push off the $80K floor Sunday May 10 13:00 UTC trading $80,921.60 on the Crypto.com tape (+0.67% 24h, range $80,222.81-$81,069.61, last $80,921.60, 24h volume value ~$74.0M) tracking the Friday US-session record-day bid as the Trump-orchestrated Russia-Ukraine three-day Victory Day ceasefire (May 9-11, 1,000-prisoner exchange) entered Day 2 without confirmed front-line violations even after Russia (per Alarabiya Saturday) said the truce is "limited to three days" and accused Kyiv of breaches, Putin having presided Saturday over his most pared-back Red Square parade in nearly two decades — first time without heavy military hardware in ~20 years; Thursday May 7 spot-BTC-ETF flow flipped to -$277.5M ending a nine-day $2.7B inflow run (FBTC -$128.99M / IBIT -$98.02M), but Cointelegraph Saturday flagged the weekly-net frame is now tracking a sixth straight week of net inflows for the first time in nine months, cumulative net inflow since launch holding at $59.49B and total net assets at $106.77B with IBIT still the largest spot BTC ETF (>$66B AUM, ~810K-BTC holdings); Trump told CNN Friday he expected Iran to respond "later that evening" on the Witkoff-Kushner-mediated 14-point one-page MoU framework (30-day talks window, Pakistan-mediated, Islamabad resumption next week per Daily Pakistan), no clear reply by Sunday midday ET — Brent crude reclaimed $100 Friday, geopolitical-risk overlay live into the Trump-Xi May 14-15 Beijing summit; Senate Banking CLARITY Act markup firmed May 14 per CoinDesk', category: 'crypto', related: 'BTC' },
  { headline: 'Ether held the $2,300 reclaim Sunday May 10 13:00 UTC trading $2,325.91 on the Crypto.com tape (+0.48% 24h, range $2,299.36-$2,338.32, last $2,325.91, 24h volume value ~$32.0M) tracking BTC on a roughly 0.7-beta basis as the Trump-orchestrated Russia-Ukraine three-day Victory Day ceasefire (May 9-11, 1,000-prisoner exchange) entered Day 2 without confirmed front-line violations — Putin having presided Saturday over his most pared-back Red Square parade in nearly two decades (first time without heavy military hardware in ~20 years), Russia per Alarabiya saying the truce is "limited to three days" and accusing Kyiv of breaches; Thursday May 7 spot-ETH-ETF flow flipped negative -$103.52M with no fund posting positive flows (Fidelity FETH -$62.26M largest outflow, BlackRock ETHA -$26.31M), erasing most of the $271.61M cumulative gain from the May 1-6 four-positive-session run, but the May 1-3 whale-buying spree (140K ETH added, total whale holdings 13.78M→13.98M ETH) still anchors the bid-floor narrative — Bitmine\'s Tom Lee Saturday telegraphed an aggressive 2026 ETH price prediction adding to the structural-bid case; the +115K April BLS payrolls upside surprise (vs +65K cons, unemployment 4.3%) tempers the rate-cut probability matrix into June 16-17 FOMC and per Reuters "bolstered financial market views that the Fed would leave interest rates unchanged into 2027" — Witkoff-Kushner 14-point MoU still under Iran review with Pakistan-mediated Islamabad resumption next week, geopolitical overlay live into Trump-Xi May 14-15', category: 'crypto', related: 'ETH' },
  { headline: 'Solana cooled from the Saturday squeeze and consolidated mid-$93 Sunday May 10 13:00 UTC trading $93.38 on the Crypto.com tape (+0.05% 24h flat, range $92.41-$94.82, last $93.38, 24h volume value ~$7.9M) — altcoin-beta now ranking BTC +0.67% > ETH +0.48% > XRP +0.32% > SOL +0.05% on the Sunday midday tape after Saturday saw SOL leadership at +5.63%, the rotation cooling as the Trump-orchestrated Russia-Ukraine three-day Victory Day ceasefire (May 9-11, 1,000-prisoner exchange) entered Day 2 without confirmed front-line violations and the Saturday Red Square parade played out as Putin\'s most pared-back in ~20 years; structurally the monthly US-spot-SOL-ETF inflow trend has now declined six straight months — November 2025 ATH $419.38M → April $39.93M (weakest monthly print since the October 2025 launch) — but the late-April catalyst stack still anchors the bid (Visa and Meta expanding Solana payments, Solana Swiss Research Institute launch, April 28 quantum-resistant signature migration, Israel CMA BILS approval — 1:1 ILS-pegged stablecoin deploying on Solana with sub-400ms settlement, EY-audited reserves, Fireblocks custody); Witkoff-Kushner 14-point MoU still under Iran review with Pakistan-mediated Islamabad resumption next week per Daily Pakistan, US-on-China sanctions Friday targeting Iran-linked Chinese companies just days ahead of the Trump-Xi May 14-15 Beijing summit', category: 'crypto', related: 'SOL' },
  { headline: 'XRP reclaimed the $1.42 line Sunday May 10 13:00 UTC trading $1.4244 on the Crypto.com tape (+0.32% 24h, range $1.4112-$1.4309, last $1.4244, 24h volume value ~$4.7M) — green on the Sunday midday tape with rankings now BTC +0.67% > ETH +0.48% > XRP +0.32% > SOL +0.05% as the $1.40-handle held through the Saturday $1.43 retest and reasserts the consolidation pattern, the Trump-orchestrated Russia-Ukraine three-day Victory Day ceasefire (May 9-11, 1,000-prisoner exchange) entering Day 2 without confirmed violations even as Russia per Alarabiya said the truce is "limited to three days"; structurally the US spot XRP ETF complex still tracks $1.5B AUM across 7 products with 833.7M XRP locked (Goldman Sachs largest disclosed institutional holder at $153.8M), May 6 inflows +$13.03M held the bid through the broader May 7 BTC -$277.5M / ETH -$103.52M ETF flow flip — the Senate Banking Committee CLARITY Act markup is now firmed for May 14 per CoinDesk Friday May 9, but the banking industry pushed back hard Saturday in a Decrypt-flagged objection arguing the proposal "would enable evasion" of the bank-regulatory perimeter and Senator Warren asking Meta to fully disclose stablecoin plans ahead of the markup, the friction sitting alongside Day 1 of the Trump-Xi May 14-15 Beijing summit as the binding catalyst pair into Memorial Day recess', category: 'crypto', related: 'XRP' },
  { headline: 'US spot Bitcoin ETFs flipped to net outflow Thursday May 7 — $277.5M leaving the complex and ending a nine-day inflow run that had pulled in ~$2.7B over the streak (May 1 alone +$629M, May 4 IBIT +$335M / FBTC +$185M) — Fidelity\'s FBTC led withdrawals at -$128.99M followed by BlackRock\'s IBIT -$98.02M, cumulative net inflow since launch sliding to $59.49B and total net assets across the funds falling to $106.77B from $108.76B; but Cointelegraph Saturday flagged the weekly-net frame is now tracking a sixth straight week of net inflows for the first time in nine months — the disconnect between Friday\'s daily turn negative and the constructive multi-week bid — April finished +$1.97B, the strongest monthly total of 2026, IBIT alone holding ~810K BTC worth ~$66B and now larger by AUM than most of BlackRock\'s gold and emerging-market ETFs combined; the ETH ETF complex turned negative the same day at -$103.52M with no fund posting positive flows (Fidelity FETH -$62.26M, BlackRock ETHA -$26.31M), erasing most of the $271.61M cumulative gain from the May 1-6 four-positive-session run — the flow flip lands as the AWS US-East-1 thermal outage takes Coinbase exchange functions offline ~7 hours (FanDuel and CME Group also affected, ~18-20 hour total incident, AWS confirming chiller failure as root cause) but the spot-crypto tape recovered into the weekend with BTC pushing $80,922 Sunday 13:00 UTC; Senate Banking CLARITY Act markup firmed May 14 per CoinDesk Friday', category: 'crypto', related: 'BTC' },
  { headline: 'S&P 500 closed Friday May 8 at a record 7,398.93 (+0.84%) and the Nasdaq Composite at a record 26,247.08 (+1.71%) — both posting fresh all-time intraday and closing highs, the Russell 2000 also setting a new record on the day — as the April BLS payrolls upside surprise (+115K vs ~+65K cons, unemployment 4.3% steady) and the WSJ Friday scoop that Apple and Intel have reached a preliminary chip-making agreement after more than a year of intensive talks drove tech-led leadership into the close, the Dow inched up just 12.19 points / +0.02% to 49,609.16 with rotation into the AI-hardware complex (INTC ~+14% to $130.57 ATH peak +19% intraday, AAPL +2%) absorbing most of the index-level upside; Akamai (AKAM) +28.5% on a mixed Q1 with raised full-year outlook, Rackspace (RXT) +12.5% on the AMD enterprise-AI-cloud MoU for regulated/sovereign workloads adding to the AI-pipe leverage trade; the bid persisted through fresh US-Iran exchange of fire in the Strait of Hormuz Friday (US Navy disabling two more Iranian tankers attempting to breach the blockade) as Trump insisted the April 8 ceasefire remains in place and characterized the strikes as "just a love tap" — Brent reclaimed $100 Friday, oil markets focused on Hormuz which has been effectively closed since late February, the diplomatic-progress hopes overriding the kinetic risk into the Trump-Xi May 14-15 Beijing summit countdown', category: 'general', related: '' },
  { headline: 'April BLS nonfarm payrolls printed +115K Friday May 8 8:30 ET — well above the ~+65K Wall Street consensus and the first back-to-back monthly hiring gain in nearly a year — with March revised up and unemployment unchanged at 4.3%; sector breakdown saw health care +37K, transportation and warehousing +30K, retail trade +22K, while federal government employment continued to decline (-9K), information (-13K) and manufacturing (-2K) shed jobs — average hourly earnings rose 0.3% MoM and 3.8% YoY, labor force participation held 62.5%, the Trump White House Council of Economic Advisers framing emphasizing 12,600 factory-construction jobs propelled by trillions in advanced-manufacturing and data-center investments; the upside surprise reasserts the historically-tight-but-cooling labor narrative against the four-dissent April 29 FOMC hold (3.50-3.75%, June 16-17 the next live decision with updated SEP), markets re-pricing the path toward fewer 2026 cuts and per Reuters the data "bolstered financial market views that the Fed would leave interest rates unchanged into 2027" — the print closing at S&P 500 record 7,398.93 (+0.84%) and Nasdaq record 26,247.08 (+1.71%) with rotation into the AI-hardware complex (INTC ~+14% on the WSJ Apple-deal scoop, AAPL +2%) absorbing most of the upside, even as a fresh layoff cycle (Cloudflare -1,100 / -20%, BILL -30%, Upwork ~-25%) underscored the AI-displacement counter-narrative', category: 'general', related: '' },
  { headline: 'The Trump-orchestrated three-day Russia-Ukraine Victory Day ceasefire (May 9-11, 1,000-for-1,000 prisoner exchange) completed Day 1 Saturday May 9 without confirmed front-line violations from either side per CNN and Irish Times reporting — Putin presiding over his most pared-back Red Square Victory Day parade in nearly two decades, no heavy military equipment on display for the first time in ~20 years amid Ukrainian-drone-strike concerns, Zelensky issuing a tongue-in-cheek decree that he would "allow a parade to be held in Moscow" — but Russia per Alarabiya already cautioned Saturday that the truce is "limited to three days" and accused Kyiv of violations, foreshadowing a Sunday-Monday breakdown risk after the prior Russia-only / Kyiv-only competing-ceasefires that collapsed earlier in the week; Trump on Truth Social framed the pause as "the request was made directly by me" and "the beginning of the end" of the war, thanking both Putin and Zelensky after a Putin-Trump phone call earlier in the week, Russian presidential aide Yuri Ushakov confirming the agreement was reached during US-administration phone contacts; the truce stacks on top of the fragile US-Iran ceasefire (April 8, in effect "for now" per Hegseth despite the May 7 US strikes on Bandar Abbas and Qeshm Island and Iran\'s 15-missile Fujairah salvo) into the Trump-Xi May 14-15 Beijing summit', category: 'general', related: '' },
  { headline: 'Israeli forces struck the southern outskirts of Beirut and southern Lebanon hard Saturday May 9 — three drone strikes south of Beirut killing 4 (two on the Beirut-Sidon coastal highway, one on a road leading to the Chouf region killing three) per Lebanon\'s Health Ministry and state media, southern Lebanon airstrikes killing at least 13 including a man and his 12-year-old daughter (Saksakiyeh village strike +7 including a child with 15 wounded, Bourj Rahhal +3, Maifadoun +1) per the Washington Times, ABC News and PBS — the worst single-day Lebanon toll since the April 17 Israel-Hezbollah ceasefire took effect; Hezbollah claimed cross-border retaliation, firing a drone at the Israeli military post in the northern town of Misgav Am and claiming several attacks inside Lebanon — the daily Israel-Hezbollah kinetic exchange continuing despite the truce, with strikes also reported across rural districts of Nabatieh and Tyre and mountain areas around Nabi Sheet, Khreibeh and Brital; the Lebanon-front escalation runs alongside the US-Iran Strait of Hormuz exchange of fire Friday (US Navy disabling M/T Sea Star III and M/T Sevda) and the still-pending Iranian response to the Witkoff-Kushner 14-point MoU framework via Pakistani mediation, complicating the Trump-orchestrated Russia-Ukraine three-day ceasefire (May 9-11) de-escalation tape into the Trump-Xi Beijing summit', category: 'general', related: '' },
  { headline: 'Iran is reviewing a 14-point one-page MoU negotiated by US Special Envoy Steve Witkoff and Trump son-in-law Jared Kushner via Pakistani mediation — the framework declaring an end to the two-month war launched February 28 and creating a 30-day window for detailed talks on nuclear program, Strait of Hormuz de-escalation and the transfer of Iran\'s highly enriched uranium to a third country, with sanctions-relief scope the principal outstanding hurdle per Time and Al Jazeera reporting; Trump told CNN Friday he expected to hear back "later that evening" but as of Saturday morning ET no clear Iranian response had landed, US-Iran talks expected to resume in Islamabad next week per Daily Pakistan reporting Saturday May 9; Secretary Rubio earlier framed Operation Epic Fury as "concluded" but pushed back hard against Tehran\'s preference to settle Hormuz first / nuclear later — "under no circumstances can we accept... you have to coordinate with Iran, you have to pay them a toll" through the Strait — Defense Secretary Hegseth said the April 8 ceasefire "certainly holds" for now despite the May 7 US strikes on Bandar Abbas and Qeshm Island, the Friday Navy disablings of M/T Sea Star III and M/T Sevda, Trump\'s "love tap" framing, and Iran\'s 15-missile Fujairah salvo wounding three; the New York Times reported Saturday Russia is sending Iran drone parts via the Caspian Sea bypassing the US Hormuz blockade, adding to the geopolitical-supply complexity', category: 'general', related: '' },
  { headline: 'The Trump administration imposed fresh sanctions on several Chinese companies over their links to Iran Friday May 8 — landing just six days before Trump\'s scheduled May 14-15 Beijing summit with Xi and adding a sharp new bilateral irritant to a trip already operating against the backdrop of Chinese-officials\' unease about proceeding before the Iran war is resolved per Business Standard / TT News reporting; the summit nonetheless remains on track per a White House official with Boeing CEO Kelly Ortberg confirmed traveling per CNBC for a potential 500-aircraft package, Citigroup and Mastercard CEOs joining the trip, expected announcements including bilateral "Board of Trade" identifying non-sensitive sectors for purchase commitments and limited tariff adjustments, plus likely Chinese purchases of US Boeing aircraft and agricultural goods per Brookings / WEF analysis; Senate Banking Committee CLARITY Act markup falls on Day 1 of the summit (May 14) per CoinDesk Friday, the structural-crypto catalyst stack converging — Lummis "almost 99% sorted out" on stablecoin language with the Tillis-Alsobrooks stablecoin-yield compromise the cleared roadblock, Tim Scott full-Republican-bloc unlock targeting summer floor vote — the binding May-21 Memorial Day recess deadline tightening as the Iran war takes "center stage" per CNBC summit analysis with Trump pressing Beijing to lean on Tehran for the MoU framework', category: 'general', related: '' },
  { headline: 'UK Prime Minister Keir Starmer rejected resignation calls Saturday May 9 after Labour suffered crushing local-election losses to a surging Reform UK — Nigel Farage\'s party winning ~1,300 council seats across England and taking control of at least five councils (Newcastle-under-Lyme, Essex, Havering, Suffolk, Sunderland), coming second in Wales and making significant gains in Scotland with Labour losing ~1,000 seats and getting "booted from power in Wales after 27 years" per CBS News and Al Jazeera reporting — Starmer telling reporters he would "not walk away and plunge the country into chaos" and committing to serve out his five-year term, with a Monday speech and Wednesday King\'s Speech laying out the legislative agenda for the reset, calls from former minister Catherine West and others for Starmer to step aside growing louder on Saturday; in parallel the FAO global-food-price index rose 1.6% in April to 130.7 for the third consecutive monthly gain (vegetable-oil index +5.9% to 193.9 the highest since July 2022, palm-oil up for a fifth straight month on biofuel-demand and Hormuz-disruption pass-through, Meat Index a fresh record), reasserting the inflation-stickiness frame against the Fed\'s four-dissent April 29 hold and the Reuters-flagged turn that could push the next US cut into 2027 — Brent reclaimed $100 Friday on the Hormuz exchange, the Russia-Ukraine three-day ceasefire (May 9-11) completing Day 1 the diplomatic backdrop into Trump-Xi May 14-15', category: 'general', related: '' },
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
