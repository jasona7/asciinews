#!/usr/bin/env node
/**
 * Logo Scraper for ASCII News Terminal
 * Downloads company logos from logospng.org
 *
 * Usage: node scripts/scrape-logos.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Ticker to logospng.org slug mapping
const TICKER_LOGOS = {
  // Tech Giants
  AAPL: 'apple',
  MSFT: 'microsoft',
  GOOGL: 'google',
  GOOG: 'google',
  AMZN: 'amazon',
  META: 'meta',
  NVDA: 'nvidia',
  TSLA: 'tesla',
  NFLX: 'netflix',
  ADBE: 'adobe',
  CRM: 'salesforce',
  ORCL: 'oracle',
  IBM: 'ibm',
  INTC: 'intel',
  AMD: 'amd',
  QCOM: 'qualcomm',
  AVGO: 'broadcom',

  // Financial
  JPM: 'jpmorgan',
  GS: 'goldman-sachs',
  MS: 'morgan-stanley',
  BAC: 'bank-of-america',
  V: 'visa',
  MA: 'mastercard',

  // Consumer
  DIS: 'disney',
  NKE: 'nike',
  SBUX: 'starbucks',
  MCD: 'mcdonalds',
  KO: 'coca-cola',
  PEP: 'pepsi',
  WMT: 'walmart',
  TGT: 'target',
  HD: 'home-depot',
  COST: 'costco',

  // Other
  BA: 'boeing',
  XOM: 'exxon-mobil',
  CVX: 'chevron',

  // Crypto
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  XRP: 'xrp',
  DOGE: 'dogecoin',

  // Meme/Other
  GME: 'gamestop',
  COIN: 'coinbase',
  PLTR: 'palantir',
  ARM: 'arm',
};

// Some logos use wp-content/uploads instead of /download/
const WP_UPLOADS_SLUGS = ['nvidia', 'tesla', 'meta', 'palantir', 'coinbase', 'solana'];

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'logos');
const SIZE = 512; // Good balance of quality and size

function getLogoUrl(slug) {
  if (WP_UPLOADS_SLUGS.includes(slug)) {
    // Try the wp-content pattern first, fall back to download pattern
    return `https://logospng.org/wp-content/uploads/${slug}.png`;
  }
  return `https://logospng.org/download/${slug}/logo-${slug}-${SIZE}.png`;
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    https.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function tryDownload(ticker, slug, dest) {
  // Try primary URL
  const primaryUrl = getLogoUrl(slug);
  try {
    await downloadFile(primaryUrl, dest);
    return { success: true, url: primaryUrl };
  } catch (e) {
    // Try alternate pattern
    const altUrl = WP_UPLOADS_SLUGS.includes(slug)
      ? `https://logospng.org/download/${slug}/logo-${slug}-${SIZE}.png`
      : `https://logospng.org/wp-content/uploads/${slug}.png`;

    try {
      await downloadFile(altUrl, dest);
      return { success: true, url: altUrl };
    } catch (e2) {
      return { success: false, error: e.message };
    }
  }
}

async function main() {
  console.log('🖼️  ASCII News Logo Scraper');
  console.log('===========================\n');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created: ${OUTPUT_DIR}\n`);
  }

  const results = { success: [], failed: [] };
  const entries = Object.entries(TICKER_LOGOS);

  // Remove duplicates (GOOGL and GOOG both map to 'google')
  const uniqueSlugs = new Map();
  for (const [ticker, slug] of entries) {
    if (!uniqueSlugs.has(slug)) {
      uniqueSlugs.set(slug, ticker);
    }
  }

  console.log(`📥 Downloading ${uniqueSlugs.size} logos...\n`);

  let i = 0;
  for (const [slug, ticker] of uniqueSlugs) {
    i++;
    const dest = path.join(OUTPUT_DIR, `${slug}.png`);

    // Skip if already exists
    if (fs.existsSync(dest)) {
      console.log(`[${i}/${uniqueSlugs.size}] ⏭️  ${ticker} (${slug}) - already exists`);
      results.success.push({ ticker, slug, skipped: true });
      continue;
    }

    process.stdout.write(`[${i}/${uniqueSlugs.size}] 📥 ${ticker} (${slug})...`);

    const result = await tryDownload(ticker, slug, dest);

    if (result.success) {
      console.log(' ✅');
      results.success.push({ ticker, slug });
    } else {
      console.log(` ❌ ${result.error}`);
      results.failed.push({ ticker, slug, error: result.error });
    }

    // Be nice to the server
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n===========================');
  console.log(`✅ Success: ${results.success.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log('\nFailed logos:');
    results.failed.forEach(f => console.log(`  - ${f.ticker} (${f.slug}): ${f.error}`));
  }

  // Generate the mapping file for the React component
  const mappingFile = path.join(__dirname, '..', 'logo-map.json');
  const mapping = {};
  for (const [ticker, slug] of Object.entries(TICKER_LOGOS)) {
    const logoPath = path.join(OUTPUT_DIR, `${slug}.png`);
    if (fs.existsSync(logoPath)) {
      mapping[ticker] = `/logos/${slug}.png`;
    }
  }

  fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2));
  console.log(`\n📄 Generated: logo-map.json`);
  console.log('\nDone! Update your component to import logo-map.json');
}

main().catch(console.error);
