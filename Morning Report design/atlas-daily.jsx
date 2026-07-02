/* Atlas — Daily News dashboard
   The former blue hero is now the "Daily News" block: title + summary + the day's
   most interesting bullets. To its right, a geographic choropleth dot-map of where
   the news is coming from, a "hottest topics today" list, and a markets chart.
   Driven entirely by tweak props (accent, dark, density, radius, toggles). */
(function () {
  const { useMemo } = React;
  const I = window.Icons;
  const N = window.NEWS;

  // ── color helpers ──────────────────────────────────────────────
  function hexToRgb(hex) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.replace(/./g, (c) => c + c);
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };

  // ── stylised world: each continent as a few ellipses on a grid ──
  const COLS = 46, ROWS = 22;
  const ELLIPSES = [
    { r: 'na', cx: 12, cy: 6, rx: 7, ry: 5 }, { r: 'na', cx: 8, cy: 3, rx: 5, ry: 2.4 }, { r: 'na', cx: 13.5, cy: 11, rx: 2, ry: 2.6 },
    { r: 'sa', cx: 16, cy: 13, rx: 3.4, ry: 3 }, { r: 'sa', cx: 15, cy: 17, rx: 2, ry: 3.2 },
    { r: 'eu', cx: 23, cy: 5, rx: 3, ry: 2.4 },
    { r: 'af', cx: 25, cy: 11, rx: 4, ry: 5 },
    { r: 'me', cx: 28.5, cy: 8, rx: 2.4, ry: 2 },
    { r: 'ru', cx: 34, cy: 4, rx: 9, ry: 3 }, { r: 'ru', cx: 41, cy: 5, rx: 3, ry: 2 },
    { r: 'in', cx: 32, cy: 9, rx: 2.4, ry: 2.4 },
    { r: 'ap', cx: 40, cy: 9.5, rx: 3, ry: 2.6 }, { r: 'ap', cx: 38, cy: 12.5, rx: 2, ry: 1.8 }, { r: 'ap', cx: 41.5, cy: 16, rx: 3, ry: 2 },
  ];
  // news intensity per region today — darker = more news
  const INTENSITY = { me: 1.0, ru: 0.82, na: 0.7, eu: 0.5, ap: 0.52, in: 0.32, af: 0.16, sa: 0.12 };
  const REGION_NAME = { me: 'Middle East', ru: 'E. Europe & Russia', na: 'North America', eu: 'Europe', ap: 'Asia-Pacific', in: 'South Asia', af: 'Africa', sa: 'South America' };

  function buildDots() {
    const land = [], ocean = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        let reg = null;
        for (const e of ELLIPSES) {
          const dx = (c - e.cx) / e.rx, dy = (r - e.cy) / e.ry;
          if (dx * dx + dy * dy <= 1) { reg = e.r; break; }
        }
        if (reg) land.push({ c, r, reg }); else ocean.push({ c, r });
      }
    }
    return { land, ocean };
  }

  // ── the day's most interesting points (drawn from the live feed) ─
  const HEADLINES = [
    { text: 'Renewed Iran–Israel mediation lands as Brent crude jumps 3% on supply-route fears', meta: 'Middle East · 31 sources', reg: 'me' },
    { text: 'Ukraine\u2019s eastern front shifts as new air-defense interceptors arrive overnight', meta: 'E. Europe · 42 sources', reg: 'ru' },
    { text: 'Nvidia prints a fresh all-time high at $184 as supply constraints ease', meta: 'Markets · 38 sources', reg: 'na' },
    { text: 'OPEC+ agrees a surprise deeper output cut, tightening summer supply', meta: 'Energy · 18 sources', reg: 'me' },
    { text: 'Softer US jobs report nudges the Fed toward a July hold', meta: 'United States · 29 sources', reg: 'na' },
    { text: 'EU opens first compliance probes into general-purpose AI models', meta: 'European Union · 24 sources', reg: 'eu' },
  ];

  // hottest topics today — building (multi-event timeline) vs new (fresh)
  const HOTTEST = [
    { id: 'ukraine', name: 'Ukraine — Eastern Front', articles: 204, kind: 'building', delta: 12, reg: 'ru' },
    { id: 'iran', name: 'Iran–Israel Escalation', articles: 128, kind: 'building', delta: 31, reg: 'me' },
    { id: 'primaries', name: 'US Primaries — The Race', articles: 112, kind: 'building', delta: 4, reg: 'na' },
    { id: 'nvidia', name: 'Nvidia — AI Supercycle', articles: 96, kind: 'building', delta: 9, reg: 'na' },
    { id: 'opec', name: 'OPEC+ Output Decision', articles: 53, kind: 'new', delta: 22, reg: 'me' },
    { id: 'euai', name: 'EU AI Act Enforcement', articles: 61, kind: 'new', delta: 7, reg: 'eu' },
  ];

  // intraday market series + tickers
  const SERIES = [42, 44, 41, 46, 49, 47, 52, 55, 53, 58, 56, 61, 64, 62, 67, 70, 68, 66, 71, 74, 72, 77, 80, 78, 83, 81, 86, 89, 87, 92, 95, 98];
  const TICKERS = [
    { sym: 'NVDA', px: '184.20', d: 4.1 }, { sym: 'BRENT', px: '88.40', d: 3.0 },
    { sym: 'S&P 500', px: '5,931', d: 0.4 }, { sym: 'EUR/USD', px: '1.0840', d: -0.2 },
  ];

  const UP = 'oklch(0.62 0.15 152)', DN = 'oklch(0.6 0.2 24)';
  const upCol = (a) => `oklch(0.62 0.15 152 / ${a})`;
  const dnCol = (a) => `oklch(0.6 0.2 24 / ${a})`;

  // ── stock-market performance per region today (used by the regional P&L map) ──
  const REGION_MKT = {
    na: { idx: 'S&P 500', d: 0.4 },
    eu: { idx: 'STOXX 600', d: 0.6 },
    ru: { idx: 'MOEX', d: -0.5 },
    me: { idx: 'TASI', d: 1.2 },
    ap: { idx: 'Nikkei 225', d: 0.9 },
    in: { idx: 'Nifty 50', d: -0.2 },
    af: { idx: 'JSE All-Share', d: 0.3 },
    sa: { idx: 'Bovespa', d: -0.4 },
  };
  const INDICES = [
    { idx: 'S&P 500', reg: 'United States', d: 0.4 },
    { idx: 'STOXX 600', reg: 'Europe', d: 0.6 },
    { idx: 'Nikkei 225', reg: 'Japan', d: 0.9 },
    { idx: 'TASI', reg: 'Saudi Arabia', d: 1.2 },
    { idx: 'Hang Seng', reg: 'Hong Kong', d: -0.3 },
    { idx: 'Bovespa', reg: 'Brazil', d: -0.4 },
  ];

  // ── one-time CSS ───────────────────────────────────────────────
  if (!document.getElementById('atlas-css')) {
    const s = document.createElement('style');
    s.id = 'atlas-css';
    s.textContent = `
    .at-root{position:relative;width:1440px;min-height:912px;display:flex;flex-direction:column;
      background:var(--bg);color:var(--ink);font-family:'Space Grotesk',sans-serif;}
    .at-dash{min-height:912px;display:flex;flex-direction:column;flex:0 0 auto;}
    .at-root *{box-sizing:border-box;}
    .at-disp{font-family:'Archivo',sans-serif;}
    .at-mono{font-family:'Space Mono',monospace;}
    .at-tile{background:var(--tile);border:1px solid var(--line);border-radius:var(--rad);
      position:relative;overflow:hidden;}
    .at-row{transition:background .12s;border-radius:10px;cursor:default;}
    .at-row:hover{background:var(--hov);}
    .at-bull{transition:transform .14s;}
    .at-bull:hover{transform:translateX(3px);}
    .at-search{transition:border-color .15s;}
    .at-search:hover{border-color:var(--accent);}
    .at-photo{background-image:repeating-linear-gradient(135deg,var(--ph1),var(--ph1) 11px,var(--ph2) 11px,var(--ph2) 22px);position:relative;}
    .at-heart{cursor:pointer;transition:transform .12s;display:inline-flex;}
    .at-heart:hover{transform:scale(1.18);}
    .at-cta{transition:transform .14s;cursor:pointer;}
    .at-cta:hover{transform:translateY(-1px);}
    .at-clamp{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;}
    `;
    document.head.appendChild(s);
  }

  // ── geographic dot-map ─────────────────────────────────────────
  function WorldMap({ accent, dark, intMult }) {
    const { land, ocean } = useMemo(buildDots, []);
    const oceanCol = dark ? 'rgba(255,255,255,0.06)' : 'rgba(11,11,13,0.05)';
    const top = Object.entries(INTENSITY).sort((a, b) => b[1] - a[1])[0][0];
    return (
      <svg viewBox={`0 0 ${COLS} ${ROWS}`} preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block' }}>
        {ocean.map((d, i) => <circle key={'o' + i} cx={d.c + 0.5} cy={d.r + 0.5} r={0.13} fill={oceanCol} />)}
        {land.map((d, i) => {
          const a = Math.min(1, 0.16 + INTENSITY[d.reg] * intMult * 0.84);
          const isTop = d.reg === top;
          return <circle key={'l' + i} cx={d.c + 0.5} cy={d.r + 0.5} r={isTop ? 0.42 : 0.36} fill={rgba(accent, a)} />;
        })}
      </svg>
    );
  }

  // ── regional stock-market P&L dot-map (green = gains, red = losses) ──
  function MarketsMap({ dark }) {
    const { land, ocean } = useMemo(buildDots, []);
    const oceanCol = dark ? 'rgba(255,255,255,0.06)' : 'rgba(11,11,13,0.05)';
    return (
      <svg viewBox={`0 0 ${COLS} ${ROWS}`} preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', display: 'block' }}>
        {ocean.map((d, i) => <circle key={'o' + i} cx={d.c + 0.5} cy={d.r + 0.5} r={0.13} fill={oceanCol} />)}
        {land.map((d, i) => {
          const m = REGION_MKT[d.reg];
          const mag = m ? Math.min(1, Math.abs(m.d) / 1.4) : 0;
          const a = 0.22 + mag * 0.78;
          const up = m ? m.d >= 0 : true;
          return <circle key={'l' + i} cx={d.c + 0.5} cy={d.r + 0.5} r={0.37} fill={up ? upCol(a) : dnCol(a)} />;
        })}
      </svg>
    );
  }

  // ── markets chart (area line) ───────────────────────────────────
  function MarketChart({ accent }) {
    const W = 100, H = 40, mx = Math.max(...SERIES), mn = Math.min(...SERIES);
    const pts = SERIES.map((v, i) => [i / (SERIES.length - 1) * W, H - ((v - mn) / (mx - mn)) * (H - 4) - 2]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ');
    const area = `${line} L ${W} ${H} L 0 ${H} Z`;
    const last = pts[pts.length - 1];
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="at-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={rgba(accent, 0.28)} />
            <stop offset="1" stopColor={rgba(accent, 0)} />
          </linearGradient>
        </defs>
        {[0.33, 0.66].map((g, i) => <line key={i} x1="0" y1={H * g} x2={W} y2={H * g} stroke="var(--line)" strokeWidth="0.3" />)}
        <path d={area} fill="url(#at-fill)" />
        <path d={line} fill="none" stroke={accent} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <circle cx={last[0]} cy={last[1]} r="1.3" fill={accent} />
      </svg>
    );
  }

  // ── today's weather (the former markets graph, now an hourly temp curve) ─
  const WX = { place: 'Amsterdam', temp: 23, cond: 'Partly cloudy', hi: 24, lo: 13, feels: 22, humid: 58, wind: 12 };
  const WX_HOURS = ['00', '03', '06', '09', '12', '15', '18', '21'];
  const WX_SERIES = [14, 13, 13, 17, 21, 24, 22, 18];
  const WX_NOW = 5; // index of the current hour (15:00)

  function WeatherChart({ accent }) {
    const W = 100, H = 36, S = WX_SERIES, mx = Math.max(...S), mn = Math.min(...S);
    const pts = S.map((v, i) => [i / (S.length - 1) * W, H - ((v - mn) / (mx - mn || 1)) * (H - 8) - 4]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ');
    const area = `${line} L ${W} ${H} L 0 ${H} Z`;
    const now = pts[WX_NOW];
    return (
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          <linearGradient id="at-wx" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={rgba(accent, 0.26)} />
            <stop offset="1" stopColor={rgba(accent, 0)} />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#at-wx)" />
        <path d={line} fill="none" stroke={accent} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i === WX_NOW ? 1.7 : 0.8} fill={accent} opacity={i === WX_NOW ? 1 : 0.45} />)}
        <line x1={now[0]} y1="0" x2={now[0]} y2={H} stroke={accent} strokeWidth="0.3" strokeDasharray="1.5 1.5" opacity="0.5" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }

  function WeatherBlock({ accent, sc, pad }) {
    return (
      <div className="at-tile" style={{ flex: '0 0 auto', padding: `${pad - 6}px ${pad - 2}px`, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <I.Globe size={16} color="var(--ink)" />
          <span className="at-disp" style={{ fontSize: 13 * sc, fontWeight: 800, letterSpacing: -0.2 }}>Weather — {WX.place}</span>
          <span style={{ flex: 1 }} />
          <span className="at-mono" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1, color: 'var(--fnt)' }}>TODAY · JUN 10</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 22 }}>
          <span className="at-disp" style={{ fontSize: 52, fontWeight: 800, letterSpacing: -2.5, lineHeight: 0.85 }}>{WX.temp}°</span>
          <div style={{ paddingBottom: 3 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>{WX.cond}</div>
            <div className="at-mono" style={{ fontSize: 11, color: 'var(--mut)', fontWeight: 400, marginTop: 3, letterSpacing: 0.2 }}>H {WX.hi}°  ·  L {WX.lo}°  ·  Feels {WX.feels}°</div>
          </div>
          <span style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 20 }}>
            {[['Humidity', WX.humid + '%'], ['Wind', WX.wind + ' km/h'], ['UV', 'Moderate']].map(([l, v]) => (
              <div key={l} style={{ textAlign: 'right' }}>
                <div className="at-disp" style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.4 }}>{v}</div>
                <div style={{ fontSize: 10, color: 'var(--fnt)', fontWeight: 600, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', height: 62, marginTop: 12 }}>
          <WeatherChart accent={accent} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
          {WX_HOURS.map((h, i) => (
            <span key={h} className="at-mono" style={{ fontSize: 10, fontWeight: i === WX_NOW ? 700 : 400, color: i === WX_NOW ? 'var(--ink)' : 'var(--fnt)' }}>{h}</span>
          ))}
        </div>
      </div>
    );
  }

  // ── the day's top stories (rendered as a grid below the dashboard) ──
  const ARTICLES = [
    {
      id: 'iran', kicker: 'MIDDLE EAST · ENERGY', photo: 'PHOTO — Geneva talks',
      title: 'Renewed Iran–Israel mediation lands as Brent crude jumps 3%',
      desc: 'A fresh de-escalation proposal — brokered overnight by Oman and Switzerland — reopens a track that stalled last week. Brent climbed 3% within the hour.',
      time: '06:12 ET', ago: '2h ago', author: 'Atlas Desk', sources: 31, likes: 2431,
    },
    {
      id: 'ukraine', kicker: 'EASTERN EUROPE', photo: 'PHOTO — frontline',
      title: 'Ukraine’s eastern front shifts as new interceptors arrive overnight',
      desc: 'New air defenses blunt overnight strikes near Kharkiv, and analysts are revising the summer forecast after the largest aid package of the year cleared.',
      time: '04:30 ET', ago: '40m ago', author: 'Atlas Desk', sources: 42, likes: 1876,
    },
    {
      id: 'nvidia', kicker: 'MARKETS · TECH', photo: 'PHOTO — trading floor',
      title: 'Nvidia prints a fresh all-time high at $184 as supply eases',
      desc: 'Shares set a record intraday as supply constraints loosen and datacenter demand stays red-hot, pulling the wider AI hardware complex higher.',
      time: '09:45 ET', ago: '5m ago', author: 'Atlas Desk', sources: 38, likes: 3102,
    },
  ];

  function PhotoPlaceholder({ label, style }) {
    return (
      <div className="at-photo" style={style}>
        {label ? (
          <span className="at-mono" style={{ position: 'absolute', left: 16, bottom: 14, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: 'var(--mut)', background: 'var(--tile)', padding: '5px 9px', borderRadius: 6 }}>{label}</span>
        ) : null}
      </div>
    );
  }

  // ── interactive “likable scale” shown on each story card ──
  function LikeScale({ accent, base = 2431, size = 30 }) {
    const [rating, setRating] = React.useState(0);
    const [hover, setHover] = React.useState(0);
    const active = hover || rating;
    const labels = ['Tap a heart to rate', 'Not for me', 'It’s okay', 'Worth a read', 'Really good', 'Loved it'];
    return (
      <div>
        <div className="at-disp" style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 1.2, color: 'var(--fnt)' }}>HOW MUCH DID YOU LIKE THIS?</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 6 }} onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="at-heart" onMouseEnter={() => setHover(i)} onClick={() => setRating(i)}>
                <I.Heart size={size} color={i <= active ? accent : 'var(--fnt)'} fill={i <= active ? accent : 'none'} stroke={2} />
              </span>
            ))}
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: active ? 'var(--ink)' : 'var(--mut)' }}>{labels[active]}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12, color: 'var(--mut)', fontWeight: 600 }}>
          <I.Heart size={13} color={accent} fill={accent} stroke={2} />
          <span><b style={{ color: 'var(--ink)' }}>{(base + (rating ? 1 : 0)).toLocaleString()}</b> readers liked this{rating ? ' · you' : ''}</span>
        </div>
      </div>
    );
  }

  // ── one story card in the grid ──
  function ArticleCard({ a, accent, sc, rad }) {
    return (
      <div className="at-tile" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <PhotoPlaceholder label={a.photo} style={{ height: 168 }} />
        <div style={{ padding: '18px 20px 20px', display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            <span className="at-disp" style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 1, color: '#fff', background: accent, borderRadius: 20, padding: '4px 10px' }}>{a.kicker}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--mut)', fontWeight: 700 }}><I.Clock size={12} color="var(--mut)" />{a.ago}</span>
          </div>
          <h3 className="at-disp at-clamp" style={{ fontSize: 20 * sc, fontWeight: 800, letterSpacing: -0.6, lineHeight: 1.14, margin: '13px 0 0', WebkitLineClamp: 3 }}>{a.title}</h3>
          <p className="at-clamp" style={{ fontSize: 13.5 * sc, lineHeight: 1.5, color: 'var(--mut)', margin: '10px 0 0', WebkitLineClamp: 3 }}>{a.desc}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '14px 0', fontSize: 11.5, color: 'var(--mut)', fontWeight: 600 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 22, height: 22, borderRadius: '50%', background: accent, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 800 }}>A</span>{a.author}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><I.Sources size={12} color="var(--mut)" />{a.sources} sources</span>
          </div>
          <div style={{ height: 1, background: 'var(--line)' }} />
          <div style={{ marginTop: 14 }}><LikeScale accent={accent} base={a.likes} size={24} /></div>
          <div style={{ marginTop: 'auto', paddingTop: 18 }}>
            <span className="at-cta at-disp" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: accent, color: '#fff', fontSize: 12.5, fontWeight: 800, padding: '11px 18px', borderRadius: rad }}>Read the full timeline <I.Arrow size={15} color="#fff" /></span>
          </div>
        </div>
      </div>
    );
  }

  // ── “top stories today” grid you scroll down to ──
  function ArticlesGrid({ accent, sc, pad, rad }) {
    return (
      <section style={{ padding: `0 ${pad + 6}px ${pad + 12}px` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 2px 16px' }}>
          <I.Trending size={16} color={accent} />
          <span className="at-disp" style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.2 }}>Top stories today</span>
          <span style={{ flex: 1, height: 1, background: 'var(--line)', marginLeft: 6 }} />
          <span className="at-mono" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, color: 'var(--fnt)' }}>UPDATED 5M AGO</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 13, alignItems: 'stretch' }}>
          {ARTICLES.map((a) => <ArticleCard key={a.id} a={a} accent={accent} sc={sc} rad={rad} />)}
        </div>
      </section>
    );
  }

  // ── main ───────────────────────────────────────────────────────
  function AtlasDaily({ t = {} }) {
    const accent = t.accent || '#2f6df0';
    const dark = !!t.dark;
    const rad = (t.radius ?? 18) + 'px';
    const dens = t.density || 'regular';
    const nHead = Math.round(t.headlines ?? 5);
    const showMap = t.showMap !== false;
    const showMarkets = t.showMarkets !== false;
    const intMult = t.mapIntensity ?? 1;

    const sc = dens === 'compact' ? 0.92 : dens === 'comfy' ? 1.07 : 1;
    const pad = dens === 'compact' ? 22 : dens === 'comfy' ? 32 : 26;

    const theme = dark
      ? { '--bg': '#0c0d11', '--tile': '#15171d', '--ink': '#f1f2f5', '--mut': '#9a9ca4', '--fnt': '#646771', '--line': '#262931', '--hov': 'rgba(255,255,255,0.04)', '--ph1': 'rgba(255,255,255,0.07)', '--ph2': 'rgba(255,255,255,0.025)' }
      : { '--bg': '#fbfbfb', '--tile': '#ffffff', '--ink': '#0b0b0d', '--mut': '#6b6b73', '--fnt': '#a6a6ad', '--line': '#e8e8ea', '--hov': 'rgba(11,11,13,0.035)', '--ph1': 'rgba(11,11,13,0.055)', '--ph2': 'rgba(11,11,13,0.02)' };
    const rootStyle = { ...theme, '--accent': accent, '--rad': rad, fontSize: 14 * sc };

    const SectHd = ({ icon, label, right }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 13 }}>
        {icon}
        <span className="at-disp" style={{ fontSize: 13 * sc, fontWeight: 800, letterSpacing: -0.2 }}>{label}</span>
        <span style={{ flex: 1 }} />
        {right}
      </div>
    );

    return (
      <div className="at-root" style={rootStyle}>
        <div className="at-dash">
        {/* header */}
        <header style={{ height: 66, flex: '0 0 auto', display: 'flex', alignItems: 'center', padding: `0 ${pad + 6}px`, gap: 22 }}>
          <span className="at-disp" style={{ fontSize: 27, fontWeight: 800, letterSpacing: -1 }}>Atlas</span>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--mut)' }}>Daily News · Wednesday, June 10 2026</span>
          <div style={{ flex: 1 }} />
          <div className="at-search" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--tile)', border: '1.5px solid var(--line)', borderRadius: 30, padding: '9px 18px', width: 300 }}>
            <I.Search size={16} color="var(--mut)" />
            <span style={{ fontSize: 13, color: 'var(--fnt)', fontWeight: 500 }}>Build a timeline for any topic…</span>
          </div>
          <div style={{ width: 37, height: 37, borderRadius: '50%', background: accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>AR</div>
        </header>

        {/* bento grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gridTemplateRows: 'minmax(0,1fr)', gap: 13, padding: `2px ${pad}px ${pad}px`, alignItems: 'stretch' }}>

          {/* ── LEFT COLUMN: weather above the daily briefing ── */}
          <div style={{ gridColumn: '1 / span 7', gridRow: '1', display: 'flex', flexDirection: 'column', gap: 13, minHeight: 0 }}>
          {showMarkets ? <WeatherBlock accent={accent} sc={sc} pad={pad} /> : null}

          {/* ── DAILY NEWS hero (the blue square) ── */}
          <div className="at-tile" style={{ flex: '1 1 auto', background: accent, border: 'none', color: '#fff', padding: `${pad + 2}px ${pad + 4}px`, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', boxShadow: '0 0 0 4px rgba(255,255,255,0.25)' }} />
              <span className="at-disp" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>DAILY BRIEFING</span>
              <span style={{ flex: 1 }} />
              <span className="at-mono" style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, opacity: 0.85 }}>JUN 10 · 06:00 ET</span>
            </div>

            <div className="at-disp" style={{ fontSize: 40 * sc, fontWeight: 800, letterSpacing: -1.4, lineHeight: 1.02, marginTop: 18, textWrap: 'balance' }}>
              Mediation and markets collide as the Middle East dominates the day
            </div>
            <div style={{ fontSize: 15 * sc, lineHeight: 1.5, opacity: 0.92, maxWidth: 560, marginTop: 14 }}>
              Forty-seven new developments across nine live stories. A renewed Iran–Israel diplomatic push is rippling straight into energy markets, while Ukraine’s front and the AI trade keep building.
            </div>

            {/* stat strip */}
            <div style={{ display: 'flex', gap: 26, marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.22)' }}>
              {[['47', 'new events'], ['9', 'live stories'], ['1.2k', 'sources read']].map(([n, l]) => (
                <div key={l}>
                  <div className="at-disp" style={{ fontSize: 26 * sc, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>{n}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, marginTop: 3 }}>{l}</div>
                </div>
              ))}
            </div>

            {/* most interesting bullets */}
            <div className="at-disp" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, opacity: 0.78, marginTop: 'auto', paddingTop: 20 }}>MOST INTERESTING TODAY</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 13 }}>
              {HEADLINES.slice(0, nHead).map((h, i) => (
                <div key={i} className="at-bull" style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
                  <span style={{ flex: '0 0 auto', marginTop: 5, width: 7, height: 7, borderRadius: 2, transform: 'rotate(45deg)', background: '#fff', opacity: 0.9 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14 * sc, fontWeight: 600, lineHeight: 1.32 }}>{h.text}</div>
                    <div className="at-mono" style={{ fontSize: 10.5, fontWeight: 400, opacity: 0.72, marginTop: 3, letterSpacing: 0.2 }}>{h.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>

          {/* ── RIGHT COLUMN: news-origin map + markets by region ── */}
          <div style={{ gridColumn: '8 / span 5', gridRow: '1', display: 'flex', flexDirection: 'column', gap: 13, minHeight: 0 }}>

          {/* ── GEOGRAPHIC MAP ── */}
          {showMap ? (
            <div className="at-tile" style={{ flex: '1 1 0', minHeight: 0, padding: `${pad - 4}px ${pad - 2}px`, display: 'flex', flexDirection: 'column' }}>
              <SectHd icon={<I.Globe size={16} color="var(--ink)" />} label="Where the news is coming from"
                right={<span className="at-disp" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1, color: 'var(--fnt)' }}>BY REGION · TODAY</span>} />
              <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
                <WorldMap accent={accent} dark={dark} intMult={intMult} />
              </div>
              {/* legend */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                <span style={{ fontSize: 10.5, color: 'var(--mut)', fontWeight: 600 }}>Fewer</span>
                <div style={{ flex: 1, height: 7, borderRadius: 4, background: `linear-gradient(90deg, ${rgba(accent, 0.16)}, ${rgba(accent, 1)})` }} />
                <span style={{ fontSize: 10.5, color: 'var(--mut)', fontWeight: 600 }}>More articles</span>
                <span className="at-disp" style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: accent, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>Mideast hottest</span>
              </div>
            </div>
          ) : null}

          {/* ── MARKETS BY REGION (P&L) ── */}
          <div className="at-tile" style={{ flex: '1 1 0', minHeight: 0, padding: `${pad - 4}px ${pad - 2}px`, display: 'flex', flexDirection: 'column' }}>
            <SectHd icon={<I.Pulse size={16} color="var(--ink)" />} label="Markets by region — today"
              right={
                <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center', fontSize: 10, fontWeight: 700, color: 'var(--fnt)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><i style={{ width: 7, height: 7, borderRadius: '50%', background: UP }} />GAINS</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><i style={{ width: 7, height: 7, borderRadius: '50%', background: DN }} />LOSSES</span>
                </span>
              } />
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <MarketsMap dark={dark} />
            </div>
            {/* legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '9px 0 11px' }}>
              <span style={{ fontSize: 10.5, color: 'var(--mut)', fontWeight: 600 }}>Loss</span>
              <div style={{ flex: 1, height: 7, borderRadius: 4, background: `linear-gradient(90deg, ${dnCol(1)}, ${dnCol(0.25)}, ${upCol(0.25)}, ${upCol(1)})` }} />
              <span style={{ fontSize: 10.5, color: 'var(--mut)', fontWeight: 600 }}>Gain</span>
            </div>
            {/* index list */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 20px' }}>
              {INDICES.map((x) => (
                <div key={x.idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <span style={{ flex: '0 0 auto', width: 6, height: 6, borderRadius: '50%', background: x.d >= 0 ? upCol(1) : dnCol(1) }} />
                  <span className="at-disp" style={{ fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap' }}>{x.idx}</span>
                  <span style={{ fontSize: 10, color: 'var(--fnt)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{x.reg}</span>
                  <span style={{ flex: 1 }} />
                  <span className="at-disp" style={{ fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', color: x.d >= 0 ? UP : DN }}>{x.d >= 0 ? '+' : ''}{x.d}%</span>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
        </div>
        <ArticlesGrid accent={accent} sc={sc} pad={pad} rad={rad} />
      </div>
    );
  }

  window.AtlasDaily = AtlasDaily;
})();
