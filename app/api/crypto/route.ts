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

// Fallback quotes (updated 2026-07-09 12:00 UTC — live Binance spot, cohort steadies off the
// overnight lows despite Iran firing on US targets in the Gulf; BTC leads back above $62.7K,
// ETH the only major still red, Fear & Greed 22 "extreme fear")
const FALLBACK_QUOTES = [
  { symbol: 'BTC', name: 'Bitcoin', price: 62776.16, change: 548.12, changePercent: 0.88 },
  { symbol: 'ETH', name: 'Ethereum', price: 1743.56, change: -2.73, changePercent: -0.16 },
  { symbol: 'SOL', name: 'Solana', price: 77.62, change: 0.16, changePercent: 0.21 },
  { symbol: 'XRP', name: 'XRP', price: 1.0931, change: 0.0072, changePercent: 0.66 },
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
