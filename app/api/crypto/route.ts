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

// Fallback quotes (updated 2026-04-09 13:00 UTC via Crypto.com)
const FALLBACK_QUOTES = [
  { symbol: 'BTC', name: 'Bitcoin', price: 71190.19, change: -937.43, changePercent: -1.30 },
  { symbol: 'ETH', name: 'Ethereum', price: 2180.66, change: -75.86, changePercent: -3.37 },
  { symbol: 'SOL', name: 'Solana', price: 82.24, change: -2.32, changePercent: -2.74 },
  { symbol: 'XRP', name: 'XRP', price: 1.3317, change: -0.050, changePercent: -3.62 },
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
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${finnhubSymbol}&token=${FINNHUB_API_KEY}`
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
