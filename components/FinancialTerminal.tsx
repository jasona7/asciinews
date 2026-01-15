'use client';

import { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

const ASCII_CHARS = ' .:-=+*#%@';

const COLORS = {
  green: { main: '#33ff33', dim: '#0d4d0d', glow: 'rgba(51,255,51,0.6)', bg: '#020a02' },
  amber: { main: '#ffb000', dim: '#4d3500', glow: 'rgba(255,176,0,0.6)', bg: '#0a0700' },
  blue: { main: '#00d4ff', dim: '#003d4d', glow: 'rgba(0,212,255,0.6)', bg: '#020608' },
  red: { main: '#ff4444', dim: '#4d0000', glow: 'rgba(255,68,68,0.6)', bg: '#0a0202' }
};

const TICKERS = ['AAPL','MSFT','GOOGL','GOOG','AMZN','NVDA','META','TSLA','JPM','V','MA','DIS','NFLX','ADBE','CRM','INTC','AMD','QCOM','AVGO','ORCL','IBM','BA','XOM','CVX','GS','MS','BAC','BTC','ETH','SOL','XRP','DOGE','COIN','GME','AMC','PLTR','AI','SMCI','ARM','WMT','KO','PEP','MCD','NKE','SBUX','HD','LOW','TGT','COST'];

// Ticker to local logo slug mapping (scraped from logospng.org)
const TICKER_LOGO_SLUGS = {
  AAPL: 'apple', MSFT: 'microsoft', GOOGL: 'google', GOOG: 'google',
  AMZN: 'amazon', NVDA: 'nvidia', META: 'meta', TSLA: 'tesla',
  NFLX: 'netflix', ADBE: 'adobe', CRM: 'salesforce', ORCL: 'oracle',
  IBM: 'ibm', INTC: 'intel', AMD: 'amd', QCOM: 'qualcomm', AVGO: 'broadcom',
  JPM: 'jpmorgan', GS: 'goldman-sachs', MS: 'morgan-stanley',
  BAC: 'bank-of-america', V: 'visa', MA: 'mastercard',
  DIS: 'disney', NKE: 'nike', SBUX: 'starbucks', MCD: 'mcdonalds',
  KO: 'coca-cola', PEP: 'pepsi', WMT: 'walmart', TGT: 'target',
  HD: 'home-depot', COST: 'costco', BA: 'boeing', GME: 'gamestop',
  PLTR: 'palantir', COIN: 'coinbase', ARM: 'arm',
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', XRP: 'xrp', DOGE: 'dogecoin',
  XOM: 'exxon-mobil', CVX: 'chevron'
};

// Function to get local logo path
function getLocalLogoPath(ticker) {
  const slug = TICKER_LOGO_SLUGS[ticker?.toUpperCase()];
  if (!slug) return null;
  return `/logos/${slug}.png`;
}

const CRYPTO_MAP = { BTC:'BTC-USD',ETH:'ETH-USD',SOL:'SOL-USD',XRP:'XRP-USD',DOGE:'DOGE-USD' };
const INDEX_MAP = { 'S&P':'.INX',DOW:'.DJI',NASDAQ:'.IXIC' };

function getGoogleFinanceUrl(t) {
  if (CRYPTO_MAP[t]) return `https://www.google.com/finance/quote/${CRYPTO_MAP[t]}`;
  if (INDEX_MAP[t]) return `https://www.google.com/finance/quote/${INDEX_MAP[t]}`;
  return `https://www.google.com/finance/quote/${t}:NASDAQ`;
}

function extractTickers(headline) {
  const found = [];
  const words = headline.toUpperCase().replace(/[^A-Z0-9\s]/g,' ').split(/\s+/);
  words.forEach(w => { if (TICKERS.includes(w) && !found.includes(w)) found.push(w); });
  return found;
}

function parseHeadlineWithTickers(headline) {
  const parts = [];
  const regex = new RegExp(`\\b(${TICKERS.join('|')})\\b`, 'gi');
  let match, lastIdx = 0;
  while ((match = regex.exec(headline)) !== null) {
    if (match.index > lastIdx) parts.push({ text: headline.slice(lastIdx, match.index), isTicker: false });
    parts.push({ text: match[1].toUpperCase(), isTicker: true });
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < headline.length) parts.push({ text: headline.slice(lastIdx), isTicker: false });
  return parts;
}

// Logo/Symbol Display Component
function TickerLogo({ ticker, color, category }) {
  const t = ticker?.toUpperCase();
  const localLogoPath = getLocalLogoPath(t);
  const [imgError, setImgError] = useState(false);

  // Reset error state when ticker changes
  useEffect(() => {
    setImgError(false);
  }, [t]);

  // Fallback component when no logo available
  const FallbackLogo = () => {
    const symbols = {
      crypto: '₿', bullish: '📈', bearish: '📉', macro: '🏛️',
      earnings: '📊', markets: '💹'
    };
    const symbol = symbols[category] || '💰';

    return (
      <div style={{
        width: 100, height: 100, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        border: `2px solid ${color}`, background: 'rgba(0,0,0,0.6)', borderRadius: 8,
        boxShadow: `0 0 15px ${color}, inset 0 0 20px rgba(0,0,0,0.5)`
      }}>
        <div style={{ fontSize: 36, marginBottom: 4 }}>{symbol}</div>
        <div style={{
          fontSize: 14, fontWeight: 'bold', color, textShadow: `0 0 8px ${color}`,
          fontFamily: 'monospace', letterSpacing: 1
        }}>
          {t || '---'}
        </div>
      </div>
    );
  };

  // If no local logo path or image failed, show fallback
  if (!localLogoPath || imgError) {
    return <FallbackLogo />;
  }

  return (
    <div style={{
      width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.95)', borderRadius: 8, padding: 8,
      boxShadow: `0 0 20px ${color}`
    }}>
      <img
        src={localLogoPath}
        alt={t}
        onError={() => setImgError(true)}
        style={{ maxWidth: '80%', maxHeight: '80%', objectFit: 'contain' }}
      />
    </div>
  );
}

// 3D spinning logo for header
function HeaderLogo({ color }) {
  const asciiRef = useRef(null);
  const frameRef = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, 1, 1, 1000);
    camera.position.z = 3;
    const renderer = new THREE.WebGLRenderer({ antialias:false, alpha:true });
    renderer.setSize(80, 80);
    renderer.setClearColor(0x000000, 0);

    const geo = new THREE.TorusKnotGeometry(0.8, 0.25, 64, 8);
    const mat = new THREE.MeshStandardMaterial({ color:0xffffff, roughness:0.4, metalness:0.6, flatShading:true });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    scene.add(new THREE.DirectionalLight(0xffffff, 1).translateZ(3));
    scene.add(new THREE.AmbientLight(0x404040));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const w = 24, h = 18;
    canvas.width = w; canvas.height = h;

    const animate = () => {
      mesh.rotation.x += 0.015; mesh.rotation.y += 0.02;
      renderer.render(scene, camera);
      ctx.drawImage(renderer.domElement, 0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      let ascii = '';
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = (y * w + x) * 4;
          const brightness = (imgData.data[i] + imgData.data[i+1] + imgData.data[i+2]) / 3;
          ascii += ASCII_CHARS[Math.floor((brightness / 255) * (ASCII_CHARS.length - 1))];
        }
        ascii += '\n';
      }
      if (asciiRef.current) asciiRef.current.textContent = ascii;
      frameRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => { cancelAnimationFrame(frameRef.current); renderer.dispose(); geo.dispose(); mat.dispose(); };
  }, []);

  return <pre ref={asciiRef} style={{ margin:0,fontSize:6,lineHeight:0.9,color,textShadow:`0 0 8px ${color}`,letterSpacing:'1px' }} />;
}

// Crypto Quote Display Component - Large retro terminal style
function CryptoQuoteDisplay({ quote, color, lastUpdated }) {
  if (!quote) return null;

  const isPositive = quote.changePercent >= 0;
  const changeColor = isPositive ? '#00ff88' : '#ff4444';
  const arrow = isPositive ? '▲' : '▼';

  // Format price with appropriate decimals
  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(2);
    return price.toFixed(4);
  };

  // Format last updated time
  const formatTime = (date: Date | string | null) => {
    if (!date) return '--:--';
    // Handle both Date objects and date strings
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 80,
      padding: '10px 0',
    }}>
      {/* Symbol and Name */}
      <div style={{
        fontSize: 12,
        color: color,
        letterSpacing: 3,
        marginBottom: 4,
        textShadow: `0 0 10px ${color}`,
      }}>
        ◆ {quote.symbol} • {quote.name?.toUpperCase()} ◆
      </div>

      {/* Large Price Display */}
      <div style={{
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        textShadow: `0 0 20px ${color}, 0 0 40px ${color}`,
        letterSpacing: 2,
        fontFamily: '"Courier New", monospace',
      }}>
        ${formatPrice(quote.price)}
      </div>

      {/* Change Display */}
      <div style={{
        fontSize: 16,
        color: changeColor,
        textShadow: `0 0 10px ${changeColor}`,
        marginTop: 4,
        fontWeight: 'bold',
      }}>
        {arrow} {isPositive ? '+' : ''}{quote.changePercent?.toFixed(2)}%
        <span style={{ fontSize: 12, marginLeft: 8, opacity: 0.8 }}>
          ({isPositive ? '+' : ''}{quote.change?.toFixed(2)})
        </span>
      </div>

      {/* Last Updated + Decorative bar */}
      <div style={{
        fontSize: 8,
        color: color,
        opacity: 0.6,
        marginTop: 6,
        letterSpacing: 1,
      }}>
        ░▒▓█ LAST UPDATED: {formatTime(lastUpdated)} █▓▒░
      </div>
    </div>
  );
}

export default function FinancialASCIITerminal() {
  const [news, setNews] = useState([]);
  const [cryptoQuotes, setCryptoQuotes] = useState([]);
  const [cryptoLastUpdated, setCryptoLastUpdated] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [idx, setIdx] = useState(0);
  const [text, setText] = useState('');
  const [colorScheme, setColorScheme] = useState('green');
  const [typing, setTyping] = useState(false);
  const [crtOn, setCrtOn] = useState(true);
  const [noiseOpacity, setNoiseOpacity] = useState(0.03);
  const typingRef = useRef(null);
  const colors = COLORS[colorScheme];

  const categorize = (h) => {
    const l = h.toLowerCase();
    if (/bitcoin|btc|crypto|ethereum|eth|solana|sol|doge|xrp|coin|token|blockchain/.test(l)) return 'crypto';
    if (/fed|rate|inflation|cpi|treasury|bond|yield/.test(l)) return 'macro';
    if (/rally|surge|soar|jump|gain|bull|high|record/.test(l)) return 'bullish';
    if (/fall|drop|crash|plunge|bear|sell|decline|loss/.test(l)) return 'bearish';
    if (/earnings|revenue|profit|quarter|eps/.test(l)) return 'earnings';
    return 'markets';
  };

  const fetchNews = async () => {
    setLoading(true); setError(null);
    try {
      // Fetch news and crypto quotes in parallel
      const [newsRes, cryptoRes] = await Promise.all([
        fetch('/api/news'),
        fetch('/api/crypto')
      ]);

      const newsData = await newsRes.json();
      const cryptoData = await cryptoRes.json();

      if (newsData.source === 'fallback') {
        setError('USING SAMPLE DATA - Add FINNHUB_API_KEY for live news');
      }

      // Store crypto quotes and update time
      setCryptoQuotes(cryptoData.quotes || []);
      setCryptoLastUpdated(new Date());

      // Process news headlines
      const headlines = newsData.headlines.map((item: any) => {
        const apiTicker = item.related ? [item.related.split(',')[0].trim()] : [];
        const extractedTickers = extractTickers(item.headline);
        const tickers = apiTicker.length > 0 ? apiTicker : extractedTickers;

        return {
          type: 'news',
          headline: item.headline,
          category: categorize(item.headline),
          tickers,
          source: item.source,
          url: item.url,
        };
      });

      // Create quote items from crypto data
      const quoteItems = (cryptoData.quotes || []).map((q: any) => ({
        type: 'quote',
        headline: `${q.symbol} ${q.changePercent >= 0 ? '▲' : '▼'} ${q.changePercent?.toFixed(2)}%`,
        category: 'crypto',
        tickers: [q.symbol],
        quote: q,
      }));

      // Shuffle and insert quotes randomly among news
      const shuffledQuotes = quoteItems.sort(() => Math.random() - 0.5);
      const combined = [...headlines];

      // Insert 2-3 random quotes at random positions
      const quotesToInsert = shuffledQuotes.slice(0, Math.min(3, shuffledQuotes.length));
      quotesToInsert.forEach((quote, i) => {
        const insertPos = Math.floor(Math.random() * (combined.length - 1)) + 1 + i;
        combined.splice(Math.min(insertPos, combined.length), 0, quote);
      });

      setNews(combined);
      setIdx(0);
    } catch(e) {
      setError('FEED INTERRUPTED - USING CACHE');
      setCryptoLastUpdated(new Date());
      setNews([
        {type:'news',headline:'NVDA surges 8% as AI chip demand hits all-time high',category:'bullish',tickers:['NVDA']},
        {type:'quote',headline:'BTC ▲ 2.54%',category:'crypto',tickers:['BTC'],quote:{symbol:'BTC',name:'Bitcoin',price:94521,change:2340,changePercent:2.54}},
        {type:'news',headline:'Federal Reserve hints at potential rate cut in March',category:'macro',tickers:[]},
        {type:'news',headline:'AAPL announces record $110B buyback program',category:'earnings',tickers:['AAPL']},
        {type:'quote',headline:'ETH ▼ 1.37%',category:'crypto',tickers:['ETH'],quote:{symbol:'ETH',name:'Ethereum',price:3245.50,change:-45.20,changePercent:-1.37}},
        {type:'news',headline:'AMZN AWS revenue beats estimates by 15%',category:'earnings',tickers:['AMZN']},
        {type:'news',headline:'TSLA shares drop 5% on delivery miss',category:'bearish',tickers:['TSLA']},
        {type:'quote',headline:'SOL ▲ 4.75%',category:'crypto',tickers:['SOL'],quote:{symbol:'SOL',name:'Solana',price:187.25,change:8.50,changePercent:4.75}},
        {type:'news',headline:'MSFT Azure growth accelerates to 31% YoY',category:'bullish',tickers:['MSFT']}
      ]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchNews(); }, []);

  // Auto-refresh news every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNews();
    }, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!news.length) return;
    const currentItem = news[idx];

    // Skip typing animation for quote items
    if (currentItem.type === 'quote') {
      setText(currentItem.headline);
      setTyping(false);
      return;
    }

    setText(''); setTyping(true);
    let i = 0;
    if (typingRef.current) clearInterval(typingRef.current);
    typingRef.current = setInterval(() => {
      if (i < currentItem.headline.length) setText(currentItem.headline.slice(0, ++i));
      else { clearInterval(typingRef.current); setTyping(false); }
    }, 30);
    return () => clearInterval(typingRef.current);
  }, [idx, news]);

  useEffect(() => {
    if (!news.length || typing) return;
    const t = setTimeout(() => setIdx(i => (i+1) % news.length), 9000);
    return () => clearTimeout(t);
  }, [news, idx, typing]);

  useEffect(() => {
    const i = setInterval(() => setNoiseOpacity(0.02 + Math.random()*0.03), 100);
    return () => clearInterval(i);
  }, []);

  const current = news[idx] || {headline:'',category:'markets',tickers:[]};
  const displayTicker = current.tickers?.[0] || null;
  const catColors = {crypto:'#f7931a',bullish:'#00ff88',bearish:'#ff4444',macro:'#00d4ff',earnings:'#ffb000',markets:'#33ff33'};

  return (
    <div style={{
      background:`radial-gradient(ellipse at center, ${colors.bg} 0%, #000 100%)`,
      minHeight:'100vh', padding:10, fontFamily:'"Courier New",monospace',
      color:colors.main, position:'relative', overflow:'hidden'
    }}>
      {crtOn && <>
        <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:10,background:'repeating-linear-gradient(0deg,rgba(0,0,0,0.15) 0px,rgba(0,0,0,0.15) 1px,transparent 1px,transparent 3px)'}} />
        <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:11,background:'radial-gradient(ellipse at center,transparent 0%,transparent 60%,rgba(0,0,0,0.8) 100%)',borderRadius:30}} />
        <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:5,boxShadow:`inset 0 0 120px ${colors.glow}`}} />
        <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:12,opacity:noiseOpacity,mixBlendMode:'overlay',backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`}} />
      </>}

      <div style={{position:'relative',zIndex:1,maxWidth:950,margin:'0 auto'}}>
        {/* Header with animated logo */}
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8,borderBottom:`2px solid ${colors.dim}`,paddingBottom:6}}>
          <div style={{background:'rgba(0,0,0,0.4)',padding:3,border:`1px solid ${colors.dim}`}}>
            <HeaderLogo color={colors.main} />
          </div>
          <div style={{flex:1}}>
            <pre style={{margin:0,fontSize:7,lineHeight:1.05,color:colors.main,textShadow:`0 0 10px ${colors.glow}`}}>{`
███████╗██╗███╗   ██╗ █████╗ ███╗   ██╗ ██████╗███████╗  ████████╗███████╗██████╗ ███╗   ███╗
██╔════╝██║████╗  ██║██╔══██╗████╗  ██║██╔════╝██╔════╝  ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║
█████╗  ██║██╔██╗ ██║███████║██╔██╗ ██║██║     █████╗       ██║   █████╗  ██████╔╝██╔████╔██║
██╔══╝  ██║██║╚██╗██║██╔══██║██║╚██╗██║██║     ██╔══╝       ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║
██║     ██║██║ ╚████║██║  ██║██║ ╚████║╚██████╗███████╗     ██║   ███████╗██║  ██║██║ ╚═╝ ██║
╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚══════╝     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝`}</pre>
            <div style={{fontSize:7,color:colors.dim,marginTop:3}}>
              ▓▓ {new Date().toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} ▓▓ US MARKETS & CRYPTO ▓▓ CLICK $TICKERS FOR GOOGLE FINANCE ▓▓
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{display:'flex',gap:4,marginBottom:8,flexWrap:'wrap',justifyContent:'center'}}>
          <button onClick={fetchNews} disabled={loading} style={{background:loading?colors.main:'transparent',border:`1px solid ${colors.main}`,color:loading?'#000':colors.main,padding:'3px 10px',cursor:'pointer',fontFamily:'inherit',fontSize:8}}>{loading?'◌ SYNC':'▶ REFRESH'}</button>
          {Object.keys(COLORS).map(c=>(
            <button key={c} onClick={()=>setColorScheme(c)} style={{background:colorScheme===c?COLORS[c].main:'transparent',border:`1px solid ${COLORS[c].main}`,color:colorScheme===c?'#000':COLORS[c].main,padding:'3px 7px',cursor:'pointer',fontFamily:'inherit',fontSize:7,textTransform:'uppercase'}}>{c}</button>
          ))}
          <button onClick={()=>setCrtOn(v=>!v)} style={{background:'transparent',border:`1px solid ${colors.dim}`,color:colors.dim,padding:'3px 7px',cursor:'pointer',fontFamily:'inherit',fontSize:7}}>CRT {crtOn?'●':'○'}</button>
        </div>

        {error && <div style={{textAlign:'center',color:'#ff6666',fontSize:8,marginBottom:5}}>⚠ {error}</div>}

        {/* Main Display */}
        <div style={{display:'grid',gridTemplateColumns:'140px 1fr',gap:14,border:`2px solid ${colors.dim}`,background:'rgba(0,0,0,0.4)',boxShadow:`0 0 30px ${colors.glow},inset 0 0 50px rgba(0,0,0,0.8)`,padding:14}}>
          {/* Logo Area */}
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',borderRight:`1px solid ${colors.dim}`,paddingRight:12}}>
            <div style={{fontSize:8,color:catColors[current.category]||colors.dim,marginBottom:6,letterSpacing:2,fontWeight:'bold'}}>
              {displayTicker ? `▓ ${displayTicker} ▓` : '▓ MARKETS ▓'}
            </div>
            <TickerLogo ticker={displayTicker} color={catColors[current.category]||colors.main} category={current.category} />
            <div style={{fontSize:7,color:colors.dim,marginTop:6}}>[{current.category?.toUpperCase()}]</div>
          </div>

          {/* News/Quote Content */}
          <div style={{display:'flex',flexDirection:'column',justifyContent:'center'}}>
            <div style={{fontSize:8,color:colors.dim,marginBottom:4}}>
              ▓ {current.type === 'quote' ? 'LIVE QUOTE' : 'HEADLINE'} {String(idx+1).padStart(2,'0')}/{String(news.length).padStart(2,'0')} ▓
            </div>

            {current.type === 'quote' ? (
              /* Crypto Quote Display */
              <CryptoQuoteDisplay
                quote={current.quote}
                color={catColors[current.category] || colors.main}
                lastUpdated={cryptoLastUpdated}
              />
            ) : (
              /* News Headline Display */
              <div style={{fontSize:18,lineHeight:1.4,fontWeight:'bold',textShadow:`0 0 12px ${colors.glow}`,minHeight:80}}>
                {typing ? text : parseHeadlineWithTickers(current.headline).map((p,i) =>
                  p.isTicker ? (
                    <a key={i} href={getGoogleFinanceUrl(p.text)} target="_blank" rel="noopener noreferrer"
                      style={{color:'#00ff88',textDecoration:'none',fontWeight:'bold',textShadow:'0 0 10px #00ff88',borderBottom:'1px dashed #00ff88',cursor:'pointer'}}
                      onMouseOver={e=>{e.target.style.color='#88ffbb';e.target.style.textShadow='0 0 15px #88ffbb'}}
                      onMouseOut={e=>{e.target.style.color='#00ff88';e.target.style.textShadow='0 0 10px #00ff88'}}
                    >${p.text}</a>
                  ) : <span key={i}>{p.text}</span>
                )}
                <span style={{animation:'blink 0.7s infinite',opacity:typing?1:0.3}}>▌</span>
              </div>
            )}

            <div style={{marginTop:12,height:3,background:colors.dim,overflow:'hidden'}}>
              <div style={{height:'100%',background:colors.main,boxShadow:`0 0 8px ${colors.main}`,width:typing?'0%':'100%',transition:typing?'none':'width 9s linear'}} />
            </div>
          </div>
        </div>

        {/* Queue */}
        <div style={{marginTop:8,border:`1px solid ${colors.dim}`,padding:6,background:'rgba(0,0,0,0.3)'}}>
          <div style={{fontSize:7,color:colors.dim,marginBottom:5,letterSpacing:2}}>▓▓ FEED ▓▓</div>
          <div style={{display:'flex',flexDirection:'column',gap:3}}>
            {news.map((item,i)=>{
              const isQuote = item.type === 'quote';
              const quotePrice = isQuote && item.quote ? `$${item.quote.price?.toLocaleString()}` : '';
              const displayText = isQuote
                ? `${item.quote?.symbol} ${quotePrice}`
                : item.headline.slice(0,80) + (item.headline.length>80?'...':'');

              return (
                <div key={i} onClick={()=>setIdx(i)} style={{
                  fontSize:8,
                  padding:'3px 5px',
                  cursor:'pointer',
                  background:i===idx ? colors.main : (isQuote ? 'rgba(247,147,26,0.15)' : 'rgba(0,0,0,0.4)'),
                  borderLeft:`3px solid ${i===idx ? colors.main : colors.dim}`,
                  overflow:'hidden',
                  textOverflow:'ellipsis',
                  whiteSpace:'nowrap'
                }}>
                  <span style={{color:i===idx?'#000':colors.main,fontWeight:'bold'}}>
                    [{item.tickers?.[0]||item.category?.slice(0,4).toUpperCase()}]
                  </span>
                  {isQuote ? (
                    <span style={{color: i===idx ? '#000' : (item.quote?.changePercent >= 0 ? '#00ff88' : '#ff4444')}}>
                      {' '}{quotePrice} {item.quote?.changePercent >= 0 ? '▲' : '▼'}{Math.abs(item.quote?.changePercent || 0).toFixed(1)}%
                    </span>
                  ) : (
                    <span style={{color: i===idx ? '#000' : colors.main, opacity: i===idx ? 1 : 0.85}}>
                      {' '}{displayText}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{marginTop:6,fontSize:6,color:colors.dim,textAlign:'center'}}>
          ░▒▓█ LOGOS VIA WIKIMEDIA/SIMPLEICONS █▓▒░ <span style={{color:'#00ff88'}}>$TICKERS</span> → GOOGLE FINANCE █▓▒░
        </div>
      </div>

      <style>{`@keyframes blink{0%,50%{opacity:1}51%,100%{opacity:0}}`}</style>
    </div>
  );
}
