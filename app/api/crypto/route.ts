import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || 'demo';

// Crypto symbols for Finnhub (using Binance exchange)
const CRYPTO_SYMBOLS = {
  BTC: 'BINANCE:BTCUSDT',
  ETH: 'BINANCE:ETHUSDT',
  SOL: 'BINANCE:SOLUSDT',
  XRP: 'BINANCE:XRPUSDT',
};

// Fallback quotes (updated 2026-07-10 12:00 UTC — one atomic live Binance spot snapshot,
// t=1783685005 → 2026-07-10 12:03:25 UTC, identical across all four symbols. Whole cohort green
// and stronger than twelve hours earlier: BTC cleared $64K, ETH leads at +3.27% after being flat
// at 00:09 UTC. Every changePercent below reconciles against d/pc to four decimals.
// Take all four from a SINGLE poll: the daily candle rolls at 00:00 UTC, so `o`/`pc` reset and
// changePercent swings ~0.15pp between polls while price barely moves.)
const FALLBACK_QUOTES = [
  { symbol: 'BTC', name: 'Bitcoin', price: 64386.01, change: 1646.01, changePercent: 2.62 },
  { symbol: 'ETH', name: 'Ethereum', price: 1799.87, change: 57.04, changePercent: 3.27 },
  { symbol: 'SOL', name: 'Solana', price: 79.24, change: 1.66, changePercent: 2.14 },
  { symbol: 'XRP', name: 'XRP', price: 1.1112, change: 0.018, changePercent: 1.65 },
];

const CRYPTO_NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  XRP: 'XRP',
};

// Server-side cache
let cachedQuotes: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in ms

async function fetchQuote(ticker: string, finnhubSymbol: string): Promise<any> {
  try {
    // `cache: 'no-store'` is required. Without it Next's Data Cache stores these
    // quotes with a 1-year revalidate and serves months-old prices forever. The
    // 15-minute in-memory cache above is the only caching layer we want here.
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${finnhubSymbol}&token=${FINNHUB_API_KEY}`,
      { cache: 'no-store' }
    );
    if (!response.ok) return null;
    const data = await response.json();

    return {
      symbol: ticker,
      name: CRYPTO_NAMES[ticker],
      price: data.c,
      change: data.d,
      changePercent: data.dp,
      high: data.h,
      low: data.l,
      open: data.o,
      prevClose: data.pc,
    };
  } catch {
    return null;
  }
}

async function fetchAllQuotes(): Promise<any[]> {
  const quotes = await Promise.all(
    Object.entries(CRYPTO_SYMBOLS).map(([ticker, symbol]) =>
      fetchQuote(ticker, symbol)
    )
  );
  return quotes.filter(q => q && q.price > 0);
}

export async function GET() {
  if (!process.env.FINNHUB_API_KEY) {
    return NextResponse.json({
      quotes: FALLBACK_QUOTES,
      source: 'fallback',
      cached: false,
    });
  }

  const now = Date.now();
  const cacheValid = cachedQuotes && (now - cacheTimestamp) < CACHE_DURATION;

  // Return cached data if valid
  if (cacheValid && cachedQuotes) {
    const cacheAge = Math.round((now - cacheTimestamp) / 1000 / 60);
    return NextResponse.json({
      quotes: cachedQuotes,
      source: 'finnhub',
      cached: true,
      cacheAge: `${cacheAge}m`,
      nextRefresh: `${15 - cacheAge}m`,
    });
  }

  // Fetch fresh data
  try {
    const validQuotes = await fetchAllQuotes();

    if (validQuotes.length === 0) {
      return NextResponse.json({
        quotes: FALLBACK_QUOTES,
        source: 'fallback',
        cached: false,
      });
    }

    // Update cache
    cachedQuotes = validQuotes;
    cacheTimestamp = now;

    return NextResponse.json({
      quotes: validQuotes,
      source: 'finnhub',
      cached: false,
      cacheAge: '0m',
      nextRefresh: '15m',
    });
  } catch (error) {
    console.error('Crypto API error:', error);

    // Return stale cache if available
    if (cachedQuotes) {
      return NextResponse.json({
        quotes: cachedQuotes,
        source: 'finnhub',
        cached: true,
        stale: true,
      });
    }

    return NextResponse.json({
      quotes: FALLBACK_QUOTES,
      source: 'fallback',
      cached: false,
    });
  }
}
