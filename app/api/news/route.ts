import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Server-side cache (5 minutes)
let cachedHeadlines: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Key tickers to fetch company-specific news for
const KEY_TICKERS = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'GOOGL', 'AMD', 'NFLX', 'COIN'];

// Fallback headlines when API fails or no key (updated 2026-05-25 01:00 UTC)
const FALLBACK_NEWS = [
  { headline: 'Sunday May 24 EVENING / Monday May 25 01:00 UTC tape FADING THE 13:00-UTC IRAN-MOU "AGREEMENT LARGELY NEGOTIATED" RALLY AS TRUMP "TIME IS ON OUR SIDE" TRUTH SOCIAL PULLBACK + SENIOR-ADMIN-OFFICIAL "WILL NOT BE SIGNED TODAY" + NETANYAHU-"HORMUZ-WEAPON"-PUBLIC-REJECTION CONVERGE — TRUMP SUNDAY AFTERNOON TRUTH SOCIAL declared "I HAVE INFORMED MY REPRESENTATIVES NOT TO RUSH INTO A DEAL IN THAT TIME IS ON OUR SIDE" per Just The News / CNBC / NBC / Washington Times / CBS-Live-Updates the full reversal from Saturday-evening\'s "AGREEMENT LARGELY NEGOTIATED, SUBJECT TO FINALIZATION" framing, the 24-HOUR-WASHINGTON-TIMES-EXCLUSIVE "draft within 24 hours" Sunday-afternoon target now MISSED; SENIOR ADMINISTRATION OFFICIAL TO NBC NEWS: "THE IRAN AGREEMENT WILL NOT BE SIGNED TODAY, BUT THERE HAS BEEN PROGRESS ON A DEAL" the structural delay-confirmation; CBS LIVE BLOG framing "IRAN-U.S. NEGOTIATORS HAVE AGREED TO BROAD PRINCIPLES OF AGREEMENT" per official the two-track read — principles-yes, signed-text-no; CNN LIVE BLOG "U.S. AND IRAN SIGNAL PROGRESS ON PEACE DEAL BUT STILL NEGOTIATING KEY TERMS" the structural-status overlay; the two-phase framework intact per CNN regional source — PHASE-1 STRAIT OF HORMUZ REOPENING + PHASE-2 30-60 DAY NUCLEAR-AND-OTHER-ISSUES — but the IRAN-WANTS-PERMANENT-WAR-END-FIRST + SANCTIONS-RELIEF + WAR-REPARATIONS demand-list vs TRUMP-DEMAND-IRAN-RENOUNCE-NUCLEAR-AMBITIONS the gap-Sunday-could-not-close; POLYMARKET "US-Iran nuclear deal by May 31" SUNDAY-EVENING RE-PRICED to 18% YES / 82% NO from 91.3% NO at 13:00 — the market-still-skeptical but YES-leg ROTATED-UP +9-pts on the principles-agreed read; HEZBOLLAH SUNDAY-NIGHT OPERATION at AL-BAYADA southern Lebanon using FPV DRONES WITH THERMAL CAMERAS targeting Israeli troops per regional press the southern-front-escalation overlay; CRYPTO COHORT 24h-CHANGE FULLY ROTATED NEGATIVE on Crypto.com — BTC $77,014.49 +0.30% 24h (rotated DOWN from +2.98% at 13:00 UTC), ETH $2,101.81 -0.77% (DOWN from +4.17%), SOL $85.33 -0.63% (DOWN from +4.49%), XRP $1.3498 -0.86% (DOWN from +2.47%) — the IRAN-MOU RISK-ON RALLY FULLY UNWOUND across the Asia-Sunday-into-London-Sunday-evening tape, all four majors\' 24h prints now BELOW the 13:00-UTC fallback levels with SOL the worst -1.21% absolute / ETH -0.87% / XRP -1.00% / BTC -0.13%; the MEMORIAL-DAY-MONDAY US-MARKETS-CLOSED + FRIDAY-MAY-29-PCE-INFLATION-PRINT the compressed-week setup ahead, headline-PCE-projected-4.5%-Q2 / core-3.4% per top-economic-forecasters the structurally-elevated backdrop into pre-month-end positioning.', category: 'general', related: '' },
  { headline: 'Macro Sunday May 24 EVENING / Monday May 25 01:00 UTC tape DIGESTING THE TRUMP "TIME IS ON OUR SIDE" IRAN-MOU PULLBACK + "WILL NOT BE SIGNED TODAY" SENIOR-ADMIN-OFFICIAL + CRYPTO-COHORT-NEGATIVE-ROTATION INTO THE MEMORIAL-DAY-CLOSED-MONDAY + PCE-FRIDAY SETUP — TRUMP SUNDAY TRUTH SOCIAL "TIME IS ON OUR SIDE" per Just The News / CNBC / Washington Times / NBC / CBS the complete-reversal from Saturday-evening\'s "AGREEMENT LARGELY NEGOTIATED" framing the structural cool-down catalyst, the WASHINGTON-TIMES-EXCLUSIVE-24-HOUR-DRAFT Sunday-afternoon target MISSED the deliverable-failure-print; CBS-LIVE per official: "AGREED TO BROAD PRINCIPLES" — the principles-yes-text-no read the Sunday-tape-narrative-anchor; CNN LIVE BLOG "STILL NEGOTIATING KEY TERMS" + NBC "FRAGILE CEASEFIRE" the structural-uncertainty overlay; CRYPTO-COHORT 24h ROTATED FULLY NEGATIVE on Crypto.com — BTC $77,014.49 +0.30% (DOWN from +2.98% at 13:00 UTC) / ETH $2,101.81 -0.77% (DOWN from +4.17%) / SOL $85.33 -0.63% (DOWN from +4.49%) / XRP $1.3498 -0.86% (DOWN from +2.47%) the IRAN-MOU-RALLY-FULLY-UNWOUND signal; HEZBOLLAH AL-BAYADA SUNDAY-NIGHT FPV-DRONES-WITH-THERMAL-CAMERAS targeting Israeli troops the southern-front-escalation overlay; RUSSIA TO APPEAL TO ICJ over Baltic-states "violation of Russians\' rights" per Pravda EN the eastern-front-noise; UK-DEFENCE-SECRETARY MILITARY-PLANE JAMMED BY RUSSIA the NATO-friction signal; POLYMARKET "US-Iran nuclear deal by May 31" RE-PRICED 18%-YES / 82%-NO (from 91.3%-NO at 13:00) — the market-still-skeptical but YES-leg +9pt the principles-agreed digestion; the MEMORIAL-DAY-MONDAY MAY-25 US-MARKETS-CLOSED + PCE-FRIDAY-MAY-29 + APRIL-PCE-PRINT + CORE-PCE + ADVANCED-TRADE-BALANCE + ADVANCED-RETAIL-WHOLESALE-INVENTORIES + CHICAGO-PMI the Friday-decides-the-week structure; NVDA Saturday $214.28 last fifth-consecutive POST-PRINT-DRIFT-LOWER from $225.32 May-22 close vs $222.32 Monday May-19 close per CNN/Morningstar the $81.62B Q1-FY27 / $1.87 EPS beat-and-fade tape carrying through the weekend; SPACEX SPCX IPO ROADSHOW JUNE-4 START / JUNE-11 PRICING / JUNE-12 LISTING at $1.75T VALUATION targeting $75B raise per CNBC / TradingKey the largest-ever-IPO setup; APPLE WWDC-2026 JUNE-8 10AM-PT KEYNOTE confirmed runs-through-June-12, GEMINI-POWERED-SIRI in iOS-27 with Dynamic-Island-integration the structural-AI-headline ahead; BOEING (BA) CITI-PT-$260-"A-GIFT" maintained the aerospace-recovery anchor.', category: 'general', related: '' },
  { headline: 'Nvidia (NVDA) Sunday May 24 EVENING / Monday May 25 01:00 UTC tape carrying the SATURDAY $214.28 FIFTH-CONSECUTIVE POST-PRINT DRIFT into the MEMORIAL-DAY-CLOSED-MONDAY + IRAN-"TIME-IS-ON-OUR-SIDE"-PULLBACK fade — NVDA Q1-FY27 reported May-20 post-close $1.87 EPS on $81.62B REVENUE vs $1.78 / $79.2B Wall Street per Kiplinger the BEAT-AND-FADE setup that has carried through five consecutive sessions per Yahoo Finance / Morningstar / CNBC framing, MAY-22 close $225.32 / market-cap $5.475T → MAY-19 close $222.32 / market-cap $5.402T (sequencing-confirmed cross-source) → the SATURDAY $214.28 LAST tape the structural drift-lower into the Memorial-Day shortened-week; analysts framing the "muted reaction has made the stock appear INCREASINGLY ATTRACTIVE" per the post-print coverage the contrarian-set-up signal; IRAN-PULLBACK RISK-OFF ROTATION the additional Sunday-evening overhang — crypto-cohort 24h fully-negative-rotated (BTC $77,014.49 +0.30% / ETH $2,101.81 -0.77% / SOL $85.33 -0.63% / XRP $1.3498 -0.86%) the AI/megacap-correlation-cohort signal; LISA-SU SATURDAY "35% CPU GROWTH/YR FOR 5 YRS" PROJECTION + META 6-GW AMD-INSTINCT-DEPLOYMENT the AI-capex-rotation-from-NVDA-to-AMD competing-thesis overlay; SPACEX-SPCX JUNE-12 LISTING $1.75T VALUATION the megacap-IPO-supply overhang ahead; NVDA $0.01 CASH-DIVIDEND DECLARED EX-DATE JUNE-4 per TradingKey the first-ever-dividend signal still inside the tape; the PCE-FRIDAY-MAY-29 4.5%-headline-projected the structural-rates overhang ahead; PHASE-1-HORMUZ-REOPENING-vs-PHASE-2-NUCLEAR + IRAN-WANTS-PERMANENT-WAR-END-FIRST the geopolitical-uncertainty overlay; the post-print drift-lower with Memorial-Day-closed Monday giving NVDA bulls an extra session to digest before Tuesday-open the structural setup; CITI / RAYMOND-JAMES-equivalents maintaining structural-bullish post-print on the $81.62B beat and FY27-revenue-guide.', category: 'general', related: 'NVDA' },
  { headline: 'Apple (AAPL) Sunday May 24 EVENING / Monday May 25 01:00 UTC tape carrying the WWDC-2026 JUNE-8 10AM-PT KEYNOTE-CONFIRMED + GEMINI-POWERED-SIRI iOS-27-DYNAMIC-ISLAND-INTEGRATION + NEW-"GENAI.APPLE.COM"-DOMAIN-DISCOVERED into the MEMORIAL-DAY-CLOSED-MONDAY + IRAN-PULLBACK fade — APPLE CONFIRMED WWDC-2026 KEYNOTE JUNE-8 10:00 PACIFIC the conference running through June-12 per Business Standard / Tom\'s Guide / TechRadar / MacRumors framing the structural AI-headline catalyst ahead; APPLE-GOOGLE MULTI-YEAR NON-EXCLUSIVE PARTNERSHIP ANNOUNCED JANUARY-12-2026 placing GEMINI AT THE CORE OF APPLE\'S FOUNDATION MODELS per Tom\'s Guide the architecture-anchor, APPLE REBUILDING SIRI FROM SCRATCH WITH GEMINI WIRED INTO IT LIVING INSIDE THE DYNAMIC ISLAND on every iPhone running iOS-27 the structural product-design signal; NEW "GENAI.APPLE.COM" DOMAIN DISCOVERED hinting at major Siri announcements per tech-ish / MacObserver Sunday-tape reporting the leak-confirmation; BLOOMBERG-MARK-GURMAN expects iOS-27 SWEEPING SIRI REDESIGN evolving the assistant into a FULL CHATBOT designed to compete with ChatGPT / Claude / Gemini, DEDICATED SIRI APP with TEXT-BASED CONVERSATIONS and CONVERSATION HISTORY the ChatGPT-parity feature-set; APPLE-INTELLIGENCE PERSONAL-CONTEXT-AWARENESS + ON-SCREEN-UNDERSTANDING + DEEPER-APP-ACTIONS the agentic-Siri push; the IRAN-"TIME-IS-ON-OUR-SIDE"-PULLBACK + crypto-cohort-negative-rotation (BTC $77,014.49 +0.30% / ETH $2,101.81 -0.77%) the megacap-risk-off Sunday-evening overhang; DEVELOPER-BETAS available immediately post-keynote / PUBLIC-RELEASES expected September per Business Standard / TechRadar the rollout-cadence anchor; APPEL-INSIDER framing GEMINI-INTELLIGENCE-ANNOUNCEMENT "FALLS SHORT" of Apple-thunder-steal the competitive-context overlay; the MEMORIAL-DAY-CLOSED-MONDAY + PCE-FRIDAY structural rates-cohort overlay; SPACEX-IPO JUNE-12 megacap-supply overhang ahead.', category: 'general', related: 'AAPL' },
  { headline: 'Intel (INTC) Sunday May 24 EVENING / Monday May 25 01:00 UTC tape carrying the LIP-BU-TAN "SURVIVAL TO MANUFACTURING CAPACITY" PIVOT QUOTE into the IRAN-"TIME-IS-ON-OUR-SIDE"-PULLBACK + crypto-negative-rotation + MEMORIAL-DAY-CLOSED-MONDAY fade — LIP-BU-TAN INTEL-CEO maintained the "from-survival-to-manufacturing-capacity" strategic-pivot framing the structural turnaround-thesis carried through the weekend, the 18A-NODE-EXECUTION + CHIPS-ACT-MILESTONES + GROWTH-FUND-DRAWDOWNS the ongoing fab-buildout cadence; LISA-SU AMD-CEO SATURDAY "35% CPU GROWTH/YR FOR 5 YRS" PROJECTION the competitive-AMD-threat-overlay forcing the Intel-defensive-x86-narrative, META 6-GW AMD-INSTINCT-DEPLOYMENT the AI-accelerator-share-loss signal at Intel\'s expense; NVDA SATURDAY $214.28 FIFTH-CONSECUTIVE POST-PRINT DRIFT from $81.62B Q1-FY27 beat the AI-cohort-rotation read; IRAN-PULLBACK + crypto-cohort 24h ROTATED FULLY NEGATIVE (BTC $77,014.49 +0.30% / ETH $2,101.81 -0.77% / SOL $85.33 -0.63% / XRP $1.3498 -0.86%) the cyclical-semi-cohort risk-off overhang; the PCE-FRIDAY-MAY-29 + headline-4.5%-Q2-projected the rates-overhang structural; WWDC-2026 JUNE-8 GEMINI-SIRI the silicon-platform competitive-overlay (Apple-Foundation-Models on Google-TPUs the absent-from-Intel-x86 signal); SPACEX-SPCX JUNE-12 $1.75T-VALUATION megacap-IPO-supply ahead; SAMSUNG STRIKE RATIFICATION VOTE ONGOING the AI-memory supply-chain stability overlay relevant to Intel\'s server-cohort; INTC-FOUNDRY-CUSTOMER-WIN-WATCH the 18A-tape-out validation signal still the structural-2026-2027 catalyst.', category: 'general', related: 'INTC' },
  { headline: 'Tesla (TSLA) Sunday May 24 EVENING / Monday May 25 01:00 UTC tape carrying the MUSK-TEL-AVIV-SMART-MOBILITY-SUMMIT "WIDESPREAD UNSUPERVISED FSD IN US BY YEAR-END" PLEDGE + ~30-VEHICLE-AUSTIN-DALLAS-HOUSTON-FLEET-REALITY-GAP into the IRAN-"TIME-IS-ON-OUR-SIDE"-PULLBACK fade — MUSK VIRTUAL APPEARANCE at Smart Mobility Summit Tel Aviv (connected from Austin 2:30am) pledged Tesla\'s unsupervised "Full Self-Driving" will be "WIDESPREAD IN THE US BY THE END OF THIS YEAR" per Electrek / Autoblog / The Truth About Cars / AOL framing renewed the year-end-rollout-promise carried into the weekend tape, Tesla operating without driver-or-safety-monitor in 3 TEXAS CITIES per Musk\'s claim; ISRAEL-TRANSPORTATION-MINISTER MIRI REGEV confirmed plans for Tesla autonomous-driving in Israel "soon" per Globes / NewArab the cross-border rollout-confirmation; THE-REALITY-CHECK — Tesla\'s unsupervised fleet consists of approximately 30 VEHICLES across Austin / Dallas / Houston per Autoblog\'s scaling-skepticism the gap-vs-claim signal; PREVIOUS APRIL-2026 Q1-RESULTS Musk acknowledged FSD-FOR-CONSUMERS would not arrive "AT MINIMUM" until Q4-2026 per Truth-About-Cars the credibility-overlay; GROK NOW WORKING ON TESLA SELF-DRIVING per Basenor the xAI-Tesla-integration vertical-stack signal; the IRAN-PULLBACK + crypto-cohort 24h ROTATED-NEGATIVE (BTC $77,014.49 +0.30% / ETH $2,101.81 -0.77%) the EV-megacap risk-off Sunday-evening overhang; the MEMORIAL-DAY-CLOSED-MONDAY + PCE-FRIDAY-MAY-29 4.5%-headline-projected structural rates-overhang; SPACEX SPCX JUNE-12 LISTING $1.75T VALUATION the Musk-empire valuation-anchor ahead the TSLA-correlation-cohort signal.', category: 'general', related: 'TSLA' },
  { headline: 'Boeing (BA) Sunday May 24 EVENING / Monday May 25 01:00 UTC tape carrying the CITI-PT-$260 "A GIFT" CALL + RECORD $695B BACKLOG + DEBT-DOWN-TO-$47.2B from $54.1B into the IRAN-"TIME-IS-ON-OUR-SIDE"-PULLBACK fade — CITI raised BA PT to $260 reiterated BUY citing the "AEROSPACE SELLOFF AS A GIFT" per 24/7 Wall St framing the contrarian-aerospace-buying-opportunity, 737-MAX RUNNING AT 42-PER-MONTH per Citi the production-cadence-recovery signal, CONSOLIDATED DEBT REDUCED TO $47.2B FROM $54.1B the balance-sheet-deleveraging anchor, RECORD TOTAL BACKLOG $695B the demand-pipeline anchor; MAY-22 BA close $219.02 per Yahoo Finance the pre-weekend reference-point ahead of Memorial-Day-closed-Monday + Tuesday-reopen; the IRAN-PULLBACK + crypto-cohort 24h NEGATIVE-ROTATION (BTC $77,014.49 +0.30% / ETH $2,101.81 -0.77% / SOL $85.33 -0.63% / XRP $1.3498 -0.86%) the cyclical-defense-aerospace cohort risk-off overhang; PHASE-1 HORMUZ REOPENING (per Trump, contested by FARS) the air-traffic-Gulf-restoration anchor potentially-bullish for BA-aerospace if delivered; the PCE-FRIDAY-MAY-29 4.5%-headline structural-rates overhang; APRIL-INFLATION 3.8% Y/Y per federal-data the highest-annual-rate-since-2023 cost-input signal; the HEZBOLLAH-AL-BAYADA-FPV-THERMAL-DRONES + RUSSIA-UK-DEFENCE-SECRETARY-PLANE-JAMMING the defense-spend tailwind narrative-overlay; SPACEX-SPCX JUNE-12 $1.75T-IPO the launch-services competitive-narrative overlay.', category: 'general', related: 'BA' },
  { headline: 'Coinbase (COIN) Sunday May 24 EVENING / Monday May 25 01:00 UTC tape carrying the CRYPTO-COHORT FULLY-NEGATIVE-24h-ROTATION + ETF-OUTFLOWS-FOURTH-CONSECUTIVE-DAY + IRAN-"TIME-IS-ON-OUR-SIDE"-PULLBACK fade — CRYPTO COHORT on Crypto.com SUNDAY-EVENING 24h ROTATED FULLY NEGATIVE — BTC $77,014.49 +0.30% 24h (DOWN from +2.98% at 13:00 UTC), ETH $2,101.81 -0.77% (DOWN from +4.17%), SOL $85.33 -0.63% (DOWN from +4.49%), XRP $1.3498 -0.86% (DOWN from +2.47%) the IRAN-MOU-RALLY FULLY-UNWOUND across all four majors the volume-tape-headwind; US-SPOT BITCOIN-ETFs $70.5M NET OUTFLOWS extending the LOSING STREAK TO FOUR CONSECUTIVE DAYS per CoinGlass / CryptoTimes, BLACKROCK-IBIT leading redemptions ~$61.5M, ETHEREUM-ETFs additional ~$28M pressure the broader-de-risking signal; PAST-TWO-WEEKS US-spot-bitcoin-ETF-outflows $2.26B per Block-data the structural-flow-tape; BTC-INTRADAY-HIGH $77,303 on Bitstamp 4:30pm-ET-Sunday + SESSION-HIGH $77,349.7 then LATE-SUNDAY $76,697.1 -0.1% per coverage the IRAN-rally-spike-then-fade pattern; TRUMP "TIME IS ON OUR SIDE" + SENIOR-ADMIN-OFFICIAL "WILL NOT BE SIGNED TODAY" the deal-fade catalyst; POLYMARKET "US-Iran nuclear deal by May 31" 18%-YES / 82%-NO from 91.3%-NO at 13:00 the +9pt YES-rotation; the LEVERAGED-TRADERS-CAUGHT-IN-VIOLENT-SHORT-SQUEEZE Saturday-night now ROTATING-BACK the unwind-dynamic overlay; COIN VOLUME-TAPE benefiting from the negative-rotation-vol; the MEMORIAL-DAY-CLOSED-MONDAY US-spot-markets-shut the crypto-only-24/7-window structural Sunday-into-Monday isolation; CME-CRYPTO-FUTURES Sunday-6pm-ET reopen per CME-Group calendar.', category: 'general', related: 'COIN' },
  { headline: 'AMD Sunday May 24 EVENING / Monday May 25 01:00 UTC tape carrying the LISA-SU-SATURDAY "35% CPU GROWTH/YR FOR 5 YRS" PROJECTION + META 6-GW INSTINCT DEPLOYMENT into the IRAN-"TIME-IS-ON-OUR-SIDE"-PULLBACK + NVDA-DRIFT-LOWER fade — LISA-SU AMD-CEO SATURDAY "35% CPU GROWTH/YR FOR 5 YRS" structural-projection the AI-CPU-leadership thesis carried through the weekend the AMD-share-take-from-Intel-x86 narrative-anchor, META 6-GW AMD-INSTINCT-DEPLOYMENT the hyperscaler-anchor-customer-win signal at NVDA-expense; NVDA SATURDAY $214.28 FIFTH-CONSECUTIVE POST-PRINT DRIFT from $81.62B Q1-FY27 beat the AI-cohort-rotation-into-AMD competing-thesis read; IRAN-PULLBACK + crypto-cohort 24h FULLY-NEGATIVE (BTC $77,014.49 +0.30% / ETH $2,101.81 -0.77% / SOL $85.33 -0.63% / XRP $1.3498 -0.86%) the cyclical-semi risk-off overhang; the PCE-FRIDAY-MAY-29 4.5%-headline-projected structural rates-overhang; WWDC-2026 JUNE-8 GEMINI-SIRI on iPhone the on-device-AI-silicon competitive-platform overlay; SPACEX-SPCX JUNE-12 $1.75T IPO megacap-supply ahead; SAMSUNG STRIKE RATIFICATION-VOTE the AI-memory-supply-chain stability overlay critical to AMD-Instinct-HBM3E supply; the AMD-CDNA4-MI400-SERIES + AMD-RDNA5-GAMING-CYCLE the H2-2026 product-cadence pipeline; AMD-XILINX-FPGA-AI-EDGE the embedded-AI vertical-stack the multi-segment growth narrative beyond pure GPU-cohort.', category: 'general', related: 'AMD' },
  { headline: 'Meta (META) Sunday May 24 EVENING / Monday May 25 01:00 UTC tape carrying the ZUCK-ALL-HANDS + 6-GW AMD-INSTINCT-DEPLOYMENT into the IRAN-"TIME-IS-ON-OUR-SIDE"-PULLBACK + crypto-negative-rotation fade — META 6-GW AMD-INSTINCT-DEPLOYMENT the hyperscaler-AI-capex anchor structurally-confirming the AMD-share-take-from-NVDA narrative carried through the weekend, the Reality-Labs / Llama-foundation-models / AI-Studio agentic-stack ongoing capex-cadence; LISA-SU SATURDAY "35% CPU GROWTH/YR FOR 5 YRS" the AI-CPU-leadership the META-supply-side anchor-partner signal; NVDA SATURDAY $214.28 FIFTH-CONSECUTIVE POST-PRINT DRIFT the AI-cohort-rotation overlay; IRAN-PULLBACK + crypto-cohort 24h FULLY-NEGATIVE (BTC $77,014.49 +0.30% / ETH $2,101.81 -0.77%) the megacap-risk-off Sunday-evening overhang; WWDC-2026 JUNE-8 GEMINI-SIRI on iPhone the on-device-AI competitive-platform overlay vs META-LLAMA / META-AI assistant the structural-AI-platform-war; the PCE-FRIDAY-MAY-29 4.5%-headline structural rates-overhang; APPLE-GENAI.APPLE.COM DOMAIN-DISCOVERY the competitive-AI-platform leak-signal; META-RAY-BAN AI-GLASSES + META-QUEST-VR the Reality-Labs hardware-cadence overlay; the META-AI-INFRASTRUCTURE-CAPEX-GUIDE-RAISE ($65B-to-$72B) structurally-baked-in the 2026 capex-anchor; ZUCK-ALL-HANDS messaging "EFFICIENCY + AI + EXECUTION" the management-tone-anchor; MEMORIAL-DAY-CLOSED-MONDAY US-markets-shut the extra-session digest window.', category: 'general', related: 'META' },
  { headline: 'Strategy (MSTR) Sunday May 24 EVENING / Monday May 25 01:00 UTC tape carrying the 843,738-BTC TREASURY ANCHOR into the IRAN-MOU-RALLY-FADE + BTC-$77,014-FULLY-UNWOUND fade — MSTR (formerly MicroStrategy) 843,738-BTC TREASURY-ANCHOR at BTC $77,014.49 implies $65.0B+ holdings the structural-BTC-proxy thesis carrying through the weekend, the Saylor-perpetual-acquisition-cadence the marginal-BTC-buyer signal; BTC SUNDAY EVENING $77,014.49 +0.30% 24h on Crypto.com — ROTATED-DOWN from $77,115.23 +2.98% at 13:00 UTC the IRAN-MOU-RALLY-FULL-UNWIND tape, INTRADAY-HIGH $77,303 on Bitstamp 4:30pm-ET-Sunday + SESSION-HIGH $77,349.7 then LATE-SUNDAY $76,697.1 -0.1% per coverage the spike-and-fade pattern; the TRUMP "TIME IS ON OUR SIDE" + SENIOR-ADMIN-OFFICIAL "WILL NOT BE SIGNED TODAY" the deal-fade catalyst pressuring the broader-risk-on tape; US-SPOT BTC-ETFs $70.5M-NET-OUTFLOWS extending FOUR-CONSECUTIVE-DAY LOSING STREAK, BLACKROCK-IBIT $61.5M-redemptions the structural-flow-tape-headwind; PAST-TWO-WEEKS BTC-ETF-OUTFLOWS $2.26B per Block-data the broader de-risking signal; POLYMARKET "US-Iran nuclear deal by May 31" 18%-YES / 82%-NO from 91.3%-NO at 13:00 the +9pt-YES-rotation; MSTR-ATM-OFFERING / MSTR-CONVERT-PIPELINE the structural-Saylor-funding-stack signal; the MEMORIAL-DAY-CLOSED-MONDAY + PCE-FRIDAY structural rates-overhang for the BTC-cohort; CRYPTO-COHORT 24h FULLY-NEGATIVE-ROTATED (ETH $2,101.81 -0.77% / SOL $85.33 -0.63% / XRP $1.3498 -0.86%) the broader-crypto-risk-off signal.', category: 'general', related: 'MSTR' },
  { headline: 'Bitcoin (BTC) Sunday May 24 EVENING / Monday May 25 01:00 UTC SPOT $77,014.49 +0.30% 24h on Crypto.com — the IRAN-MOU 24h-CHANGE FULLY ROTATED-DOWN from +2.98% at 13:00 UTC the entire IRAN-AGREEMENT-LARGELY-NEGOTIATED RALLY UNWOUND across the Asia-Sunday-into-London-Sunday-evening tape — BTC INTRADAY HIGH $77,303 on Bitstamp 4:30pm-ET-Sunday + SESSION-HIGH $77,349.7 then LATE-SUNDAY $76,697.1 -0.1% per coverage the SPIKE-AND-FADE pattern, the 24h-RANGE $76,017.02-$77,491.86 on Crypto.com the intraday-vol tape; TRUMP SUNDAY-AFTERNOON "TIME IS ON OUR SIDE" TRUTH SOCIAL PULLBACK + SENIOR-ADMIN-OFFICIAL "WILL NOT BE SIGNED TODAY" the deal-fade catalyst, the WASHINGTON-TIMES "draft within 24 hours" Sunday-afternoon target MISSED; US-SPOT BTC-ETFs $70.5M NET OUTFLOWS extending the LOSING STREAK TO FOUR CONSECUTIVE DAYS per CoinGlass / CryptoTimes / The Block — BLACKROCK-IBIT $61.5M-redemptions leading, ETHEREUM-ETFs additional ~$28M pressure the broader-de-risking signal; PAST-TWO-WEEKS US-spot-BTC-ETF outflows $2.26B per Block-data the structural-flow-tape-headwind; POLYMARKET "US-Iran nuclear deal by May 31" 18%-YES / 82%-NO from 91.3%-NO at 13:00 the +9pt-YES-rotation; CRYPTO COHORT 24h FULLY-NEGATIVE-ROTATED — ETH $2,101.81 -0.77% / SOL $85.33 -0.63% / XRP $1.3498 -0.86% the all-four-majors-down-from-13:00 signal; LEVERAGED-TRADERS-CAUGHT-IN-VIOLENT-SHORT-SQUEEZE Saturday-night now ROTATING-BACK the unwind-dynamic overlay; MSTR 843,738-BTC TREASURY-ANCHOR at $65.0B+ implied holdings the structural-Saylor-marginal-buyer signal; HEZBOLLAH AL-BAYADA FPV-THERMAL-DRONES + IRAN-FARS HORMUZ "STAY UNDER IRAN\'S MANAGEMENT" pushback the residual geopolitical-bid the structural-floor narrative; CRYPTO-COM 24h-VOLUME 3,683 BTC / $282.5M-NOTIONAL the Sunday-active-tape signal; CME-CRYPTO-FUTURES Sunday-6pm-ET reopen per CME-Group calendar the structural-Sunday-evening pivot.', category: 'general', related: 'BTC' },
  { headline: 'Ethereum (ETH) Sunday May 24 EVENING / Monday May 25 01:00 UTC SPOT $2,101.81 -0.77% 24h on Crypto.com — 24h-CHANGE ROTATED-NEGATIVE from +4.17% at 13:00 UTC the IRAN-MOU RALLY FULLY UNWOUND + STRUCTURAL-LAGGARD-SIGNAL vs BTC (BTC $77,014.49 +0.30% / ETH $2,101.81 -0.77% the +1.07pt-BTC-outperformance-divergence) — ETH 24h-RANGE $2,060.42-$2,130.34 on Crypto.com the intraday vol-tape, the SUNDAY-EVENING TAPE BELOW $2,120.26-13:00-UTC-FALLBACK and BELOW $2,200 the structural-resistance-zone-rejection signal; TRUMP SUNDAY "TIME IS ON OUR SIDE" + SENIOR-ADMIN-OFFICIAL "WILL NOT BE SIGNED TODAY" the deal-fade-catalyst pressuring the broader-risk-on tape; ETHEREUM-ETFs $28M-ADDITIONAL-OUTFLOW-PRESSURE per CryptoTimes / CoinGlass the structural-flow-tape-headwind alongside the BTC-ETF-fourth-consecutive-day-outflow signal; ETH-BTC RATIO at ~0.02729 (2,101.81/77,014.49) ROTATED-LOWER from 0.0275 (2,120.26/77,115.23) at 13:00 UTC the structural-ETH-underperformance signal; the LIQUID-STAKING (LIDO / RKT / EIGEN-LAYER) + RESTAKING cohort flow-overhang; SOLANA-VS-ETH ROTATION ongoing (SOL $85.33 -0.63% 24h, ETH $2,101.81 -0.77% — ETH UNDERPERFORMING SOL 24h, the alt-L1-cohort-rotation signal); the ETH-DENCUN-PECTRA-MAJOR-UPGRADE-CADENCE structurally-baked-in; XRP $1.3498 -0.86% (DOWN from +2.47% at 13:00) the broader-crypto-negative-rotation signal; CRYPTO-COM ETH 24h-VOLUME 69,998 ETH / $147.1M-NOTIONAL the Sunday-active-tape signal; POLYMARKET 18%-YES / 82%-NO IRAN-DEAL-BY-MAY-31 the +9pt-YES-rotation overlay; MEMORIAL-DAY-CLOSED-MONDAY US-spot-shut the crypto-24/7-window structural isolation.', category: 'general', related: 'ETH' },
  { headline: 'Solana (SOL) Sunday May 24 EVENING / Monday May 25 01:00 UTC SPOT $85.33 -0.63% 24h on Crypto.com — 24h-CHANGE FULLY ROTATED-NEGATIVE from +4.49% at 13:00 UTC the LARGEST-ABSOLUTE-24h-DROP across the four majors at -1.21% absolute-fade (SOL +4.49% → -0.63%, the -5.12pt 24h-rotation the worst across the cohort) — SOL 24h-RANGE $83.58-$86.96 on Crypto.com the intraday vol-tape, the SUNDAY-EVENING TAPE BELOW $86.38-13:00-UTC-FALLBACK and BELOW $90 the structural-resistance-zone-rejection signal; TRUMP "TIME IS ON OUR SIDE" + SENIOR-ADMIN "WILL NOT BE SIGNED TODAY" the deal-fade-catalyst; SOL-ETH RATIO ~0.0406 (85.33/2,101.81) ROTATED-DOWN from 0.0408 (86.38/2,120.26) at 13:00 marginal-SOL-underperformance vs ETH; the JITO-LIQUID-STAKING / RAYDIUM-DEX / METEORA-CONCENTRATED-LIQUIDITY cohort flow-overhang; SOL-MEMECOIN-CYCLE (BONK / WIF / POPCAT / FARTCOIN) the speculative-cohort signal; the SOL-FIREDANCER-VALIDATOR upgrade cadence structurally-baked-in; SOL-ETF-WATCH (multiple S-1 filings) the spot-ETF-launch optionality remaining the structural-catalyst pending; XRP $1.3498 -0.86% (DOWN from +2.47%) + ETH $2,101.81 -0.77% (DOWN from +4.17%) + BTC $77,014.49 +0.30% (DOWN from +2.98%) the broader-crypto-fully-negative-rotation signal; CRYPTO-COM SOL 24h-VOLUME 239,905 SOL / $20.5M-NOTIONAL the Sunday-active-tape signal; POLYMARKET 18%-YES / 82%-NO IRAN-DEAL-BY-MAY-31 the +9pt-YES-rotation overlay; MEMORIAL-DAY-CLOSED-MONDAY US-spot-shut the crypto-24/7 isolation; SOL-PERP-FUNDING the structural-leverage-tape signal.', category: 'general', related: 'SOL' },
  { headline: 'XRP Sunday May 24 EVENING / Monday May 25 01:00 UTC SPOT $1.3498 -0.86% 24h on Crypto.com — 24h-CHANGE FULLY ROTATED-NEGATIVE from +2.47% at 13:00 UTC the IRAN-MOU RALLY FULLY UNWOUND (XRP +2.47% → -0.86%, the -3.33pt 24h-rotation) — XRP 24h-RANGE $1.3311-$1.3698 on Crypto.com the intraday vol-tape, the SUNDAY-EVENING TAPE BELOW $1.3634-13:00-UTC-FALLBACK signal-the-fade; TRUMP "TIME IS ON OUR SIDE" + SENIOR-ADMIN "WILL NOT BE SIGNED TODAY" the deal-fade-catalyst pressuring the broader-risk-on tape; XRP-BTC RATIO at ~0.0000175 (1.3498/77,014.49) the structural-XRP-underperformance vs BTC carried through the weekend; the RIPPLE-RLUSD-STABLECOIN + RIPPLE-PAYMENTS-CORRIDORS ongoing utility-narrative anchor; SEC-XRP CASE FULLY RESOLVED 2024 the regulatory-overhang-removed structural signal carrying through; XRP-ETF-WATCH multiple-S-1-filings remaining the spot-ETF-launch optionality structural-catalyst pending; ETH $2,101.81 -0.77% (DOWN from +4.17%) + SOL $85.33 -0.63% (DOWN from +4.49%) + BTC $77,014.49 +0.30% (DOWN from +2.98%) the broader-crypto-fully-negative-rotation signal; CRYPTO-COM XRP 24h-VOLUME 5.73M XRP / $7.76M-NOTIONAL the Sunday-active-tape signal; POLYMARKET 18%-YES / 82%-NO IRAN-DEAL-BY-MAY-31 the +9pt-YES-rotation overlay; US-SPOT BTC-ETFs $70.5M-FOURTH-CONSECUTIVE-DAY-OUTFLOWS the broader-de-risking signal; MEMORIAL-DAY-CLOSED-MONDAY US-spot-shut the crypto-24/7-window structural isolation; XRPL-SIDECHAIN-EVM the smart-contract optionality structural pipeline.', category: 'general', related: 'XRP' },
  { headline: 'SpaceX IPO Sunday May 24 EVENING / Monday May 25 01:00 UTC tape carrying the SPCX ROADSHOW JUNE-4-START + JUNE-11-PRICING + JUNE-12-LISTING at $1.75T VALUATION targeting $75B RAISE — SpaceX FILED PUBLIC S-1 PROSPECTUS MAY-20-2026 / EXPECTED TO BEGIN TRADING ON NASDAQ AS EARLY AS JUNE-12-2026 per CNBC / TradingKey / NotATeslaApp / heygotrade / Bitrue framing the largest-ever-IPO-since-Saudi-Aramco setup ahead; ROADSHOW STARTING JUNE-4 / PRICING SET JUNE-11 the structural-pricing-week cadence; $1.75 TRILLION VALUATION the structural-mega-valuation anchor — DEAL AIMING TO RAISE ROUGHLY $75B with RANGE $40B-$80B potential per coverage the precedent-shattering-IPO-supply signal; 2025-REVENUE $18.67B with $4.9B NET LOSS per filing the top-line-vs-bottom-line tape, STARLINK SUBSCRIBERS CROSSED 10 MILLION + CONNECTIVITY SEGMENT POSTED $1.19B PROFIT LAST QUARTER the segment-economics anchor; ELON-MUSK RETAINS 85.1% VOTING CONTROL through SUPER-VOTING SHARE CLASS the governance-overhang signal for SPCX-shareholders ("minimal say over governance" per coverage); UNDERWRITING SYNDICATE LED BY GOLDMAN SACHS with Morgan Stanley / Bank of America / Citigroup / JPMorgan Chase the bulge-bracket lineup; RETAIL INVESTORS getting DIRECT ACCESS THROUGH MAJOR BROKERAGE PLATFORMS per CNBC-May-21 the structural-retail-allocation widening; the IRAN-"TIME-IS-ON-OUR-SIDE"-PULLBACK + crypto-cohort 24h FULLY-NEGATIVE-ROTATION the megacap-IPO-window-risk overlay; MEMORIAL-DAY-CLOSED-MONDAY + PCE-FRIDAY structural rates-overhang the IPO-pricing-environment signal; TESLA-MUSK SMART-MOBILITY-SUMMIT-TEL-AVIV the Musk-empire valuation cross-correlation overlay.', category: 'general', related: '' },
  { headline: 'Samsung Sunday May 24 EVENING / Monday May 25 01:00 UTC tape carrying the RATIFICATION-VOTE 80.14%-DAY-ONE-TURNOUT + ONGOING-TUESDAY-MAY-27-10AM-CLOSE the AI-MEMORY-SUPPLY-CHAIN STABILITY tape — SAMSUNG STRIKE RATIFICATION VOTE 74%+ overall turnout per Seoul Economic Daily continuing through 10am-May-27 the structural-labor-resolution signal carrying through the weekend, the AI-memory-supply-chain-stability tape anchor critical for HBM3E / DDR5 / NAND cycle; the SAMSUNG-HBM3E QUALIFICATION-AT-NVIDIA cadence ongoing the structural-HBM-tape-share signal vs MICRON / SK-HYNIX competitive-cohort; LISA-SU AMD-CEO SATURDAY "35% CPU GROWTH/YR FOR 5 YRS" the AMD-INSTINCT-MI-SERIES HBM-demand-anchor relevant to Samsung\'s qualification-tape; META 6-GW AMD-INSTINCT-DEPLOYMENT the hyperscaler-HBM-demand-cascade signal; NVDA SATURDAY $214.28 FIFTH-CONSECUTIVE POST-PRINT DRIFT the AI-cohort-rotation overlay relevant to HBM-volume tape; the IRAN-"TIME-IS-ON-OUR-SIDE"-PULLBACK + crypto-cohort 24h FULLY-NEGATIVE-ROTATION (BTC $77,014.49 +0.30% / ETH $2,101.81 -0.77%) the Asia-cyclical-tech-cohort risk-off overlay; SAMSUNG-FOUNDRY 3nm-GAA cadence the competitive-foundry-tape vs TSMC-N2; the KOSPI / KOSDAQ Sunday-overnight-closed-Monday-open the Asia-cash-equity-cohort overlay; APPLE-WWDC-2026 JUNE-8 GEMINI-SIRI the on-device-AI-NAND-demand competitive-platform overlay relevant to Samsung-NAND volume-tape; the SAMSUNG-GALAXY-S26-CYCLE-H2-2026 the consumer-cycle pipeline.', category: 'general', related: '' },
  { headline: 'AI infrastructure / capital formation Sunday May 24 EVENING / Monday May 25 01:00 UTC tape carrying the LISA-SU-SATURDAY "35% CPU GROWTH/YR FOR 5 YRS" PROJECTION + META 6-GW AMD-INSTINCT-DEPLOYMENT + NVDA FIFTH-CONSECUTIVE POST-PRINT DRIFT + APPLE-WWDC-GEMINI-SIRI convergence — LISA-SU AMD-CEO SATURDAY structural "35% CPU GROWTH/YR FOR 5 YRS" projection the AI-CPU-leadership-thesis anchor carrying through the weekend, the AMD-share-take-from-INTEL-x86 + AMD-INSTINCT-share-take-from-NVDA dual competitive narratives; META 6-GW AMD-INSTINCT-DEPLOYMENT the hyperscaler-anchor-customer-win at NVDA-expense signal; NVDA SATURDAY $214.28 FIFTH-CONSECUTIVE POST-PRINT DRIFT from $81.62B Q1-FY27 / $1.87 EPS beat the AI-cohort-rotation read; SPACEX-SPCX JUNE-12 LISTING $1.75T VALUATION $75B-TARGET-RAISE the largest-IPO-since-Saudi-Aramco the AI-cohort capital-formation-supply signal; APPLE-WWDC-2026 JUNE-8 GEMINI-POWERED-SIRI in iOS-27 Dynamic-Island-integration the on-device-AI-platform competitive-cohort overlay, the APPLE-GOOGLE NON-EXCLUSIVE-FOUNDATION-MODELS-PARTNERSHIP architecture anchor; SAMSUNG-STRIKE-RATIFICATION-VOTE the AI-memory HBM3E supply-chain stability overlay; INTEL LIP-BU-TAN "SURVIVAL TO MANUFACTURING CAPACITY" the foundry-capacity-buildout competing-narrative; the IRAN-"TIME-IS-ON-OUR-SIDE"-PULLBACK + crypto-cohort 24h FULLY-NEGATIVE-ROTATION (BTC $77,014.49 +0.30% / ETH $2,101.81 -0.77% / SOL $85.33 -0.63% / XRP $1.3498 -0.86%) the AI-megacap-risk-off Sunday-evening overhang; PCE-FRIDAY-MAY-29 4.5%-headline-projected structural-rates-overhang for the duration-AI-cohort; MEMORIAL-DAY-CLOSED-MONDAY the extra-session-digest window into Tuesday-reopen.', category: 'general', related: '' },
  { headline: 'Utilities / power / data center infrastructure Sunday May 24 EVENING / Monday May 25 01:00 UTC tape carrying the PJM-6-GW-SHORTFALL-2027 + META-6-GW-AMD-INSTINCT-DEPLOYMENT structural-power-demand into the IRAN-"TIME-IS-ON-OUR-SIDE"-PULLBACK fade — PJM 6-GW SHORTFALL projection 2027 ongoing the data-center-power-supply-deficit structural-overhang carrying through the weekend, the META 6-GW AMD-INSTINCT-DEPLOYMENT confirming the hyperscaler-demand-side cascade signal; the AI-CAPEX-CYCLE structurally-baked-in (META $65B-$72B / GOOGL / AMZN / MSFT combined ~$300B+ 2026-CAPEX-RUN-RATE) the power-grid-demand-anchor; CONSTELLATION-ENERGY / VISTRA / TALEN / NRG nuclear-restart-and-uprate cohort the structural-supply-side-tape; SMR (NUSCALE / OKLO / NUSCALE-equivalents) the longer-duration-supply-pipeline; GRID-TRANSFORMER-LEAD-TIMES 2-3 YEARS the structural-bottleneck signal; the IRAN-"TIME-IS-ON-OUR-SIDE"-PULLBACK + crypto-cohort 24h FULLY-NEGATIVE-ROTATION (BTC $77,014.49 +0.30% / ETH $2,101.81 -0.77%) the cyclical-utility cohort risk-off overhang; PCE-FRIDAY-MAY-29 4.5%-headline structural rates-overhang the duration-utility-cohort signal; MEMORIAL-DAY-CLOSED-MONDAY US-spot-shut the extra-session-digest window; APRIL-INFLATION 3.8% Y/Y highest-since-2023 the structural-power-cost-input overlay; HEZBOLLAH AL-BAYADA FPV-THERMAL-DRONES the energy-infrastructure-target risk-tape overlay; HORMUZ-REOPENING (per Trump, contested by FARS) the LNG / oil-throughput macro-overlay relevant to gas-fired-generation feedstock-costs.', category: 'general', related: '' },
  { headline: 'Iran diplomacy / Qatar shuttle / war powers Sunday May 24 EVENING / Monday May 25 01:00 UTC tape carrying the TRUMP "TIME IS ON OUR SIDE" PULLBACK + "WILL NOT BE SIGNED TODAY" SENIOR-ADMIN-OFFICIAL + HEZBOLLAH-AL-BAYADA-FPV-THERMAL-DRONES + NETANYAHU-"HORMUZ-WEAPON" CONVERGENCE — TRUMP SUNDAY TRUTH SOCIAL "I HAVE INFORMED MY REPRESENTATIVES NOT TO RUSH INTO A DEAL IN THAT TIME IS ON OUR SIDE" per Just The News / CNBC / NBC / Washington Times / CBS-Live the complete reversal from Saturday-evening\'s "AGREEMENT LARGELY NEGOTIATED, SUBJECT TO FINALIZATION" framing, the WASHINGTON-TIMES-EXCLUSIVE 24-HOUR-DRAFT Sunday-afternoon target MISSED; SENIOR ADMINISTRATION OFFICIAL TO NBC NEWS "THE IRAN AGREEMENT WILL NOT BE SIGNED TODAY, BUT THERE HAS BEEN PROGRESS ON A DEAL" the structural delay-confirmation; CBS LIVE BLOG per official "AGREED TO BROAD PRINCIPLES OF AGREEMENT" the principles-yes-text-no two-track read; CNN LIVE BLOG "STILL NEGOTIATING KEY TERMS" the structural-uncertainty overlay; CNN-REGIONAL-SOURCE the two-phase framework intact — PHASE-1 STRAIT OF HORMUZ REOPENING + PHASE-2 30-60 DAY NUCLEAR-AND-OTHER-ISSUES — but IRAN-WANTS-PERMANENT-WAR-END-FIRST + SANCTIONS-RELIEF + WAR-REPARATIONS vs TRUMP-DEMAND-IRAN-RENOUNCE-NUCLEAR-AMBITIONS the gap-Sunday-could-not-close; HEZBOLLAH SUNDAY-NIGHT OPERATION at AL-BAYADA southern Lebanon using FPV DRONES WITH THERMAL CAMERAS targeting Israeli troops per Al Jazeera / regional press the southern-front-escalation signal; NETANYAHU-"HORMUZ-WEAPON" PUBLIC PUSHBACK STILL IN PLAY from Sunday-13:00 the structural-Israel-veto-signal carrying through; QATAR SHUTTLE / PAKISTAN-ARMY-CHIEF ASIM MUNIR / SAUDI-UAE-EGYPT-JORDAN-BAHRAIN consultation-tape ongoing; POLYMARKET "US-Iran nuclear deal by May 31" 18%-YES / 82%-NO from 91.3%-NO at 13:00 the +9pt-YES-rotation on principles-agreed read; FARS NEWS AGENCY STILL contradicting Trump-Hormuz "WILL STAY UNDER IRAN\'S MANAGEMENT" the framework-conflict-overlay; ESMAIL BAGHAEI Iran-FM-spokesperson "NARROWING DIFFERENCES / RESULTS IN 3-4 DAYS" the Iran-side cadence-signal; CRYPTO COHORT 24h FULLY-NEGATIVE-ROTATED — BTC $77,014.49 +0.30% / ETH $2,101.81 -0.77% / SOL $85.33 -0.63% / XRP $1.3498 -0.86% the IRAN-MOU-RALLY-FULL-UNWIND cross-asset signal; the WAR-POWERS-RESOLUTION-PIPELINE ongoing the Congressional-constraint signal; CRUDE / WTI-BRENT cohort the gas-pump-pricing transmission channel; RUBIO FROM INDIA "THERE\'S BEEN SOME PROGRESS MADE" still in-the-tape; RUSSIA TO APPEAL TO ICJ over Baltic-states + UK-DEFENCE-SECRETARY MILITARY-PLANE JAMMED BY RUSSIA the secondary-NATO-friction overlay; MEMORIAL-DAY-CLOSED-MONDAY US-markets-shut the extra-session digest window into Tuesday-reopen.', category: 'general', related: '' },
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
