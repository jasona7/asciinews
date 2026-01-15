# ASCII News Terminal

A retro CRT-styled financial news terminal built with Next.js and React. Displays real-time stock and cryptocurrency news with a nostalgic terminal aesthetic.

## Features

- Real-time financial news from Finnhub API
- Cryptocurrency quotes (BTC, ETH, SOL, XRP) with 15-minute caching
- Company-specific news for major tickers (NVDA, AAPL, TSLA, MSFT, META, etc.)
- Clickable ticker symbols linking to Google Finance
- CRT monitor effects (scanlines, vignette, noise)
- Multiple color schemes (green, amber, blue, red)
- 3D ASCII art header animation using Three.js
- Auto-refresh every 5 minutes
- Mobile responsive design

## Tech Stack

- Next.js 14 (App Router)
- React 18
- TypeScript
- Three.js (for 3D ASCII animation)
- Finnhub API (financial data)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/jasona7/asciinews.git
cd asciinews

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### Configuration

1. Get a free API key from [Finnhub](https://finnhub.io/register)
2. Add your key to `.env.local`:

```
FINNHUB_API_KEY=your_api_key_here
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Deployment

This project is configured for Vercel deployment with GitHub integration:

- Push to `dev` branch triggers a Preview deployment
- Merge to `main` branch triggers a Production deployment

### Environment Variables

Set `FINNHUB_API_KEY` in your Vercel project settings under Environment Variables.

## Project Structure

```
asciinews/
├── app/
│   ├── api/
│   │   ├── crypto/route.ts    # Crypto quotes endpoint
│   │   └── news/route.ts      # News headlines endpoint
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── FinancialTerminal.tsx  # Main terminal component
├── public/
│   └── logos/                 # Company and crypto logos
└── scripts/
    └── scrape-logos.js        # Logo download utility
```

## Disclaimer

This application is for educational and informational purposes only. The content displayed does not constitute financial advice, investment recommendations, or an offer to buy or sell any securities or cryptocurrencies.

## License

MIT
