/* Direction D — "DISPATCH · MORNING REPORT" (long-form edition)
   A single scrollable morning paper in the Dispatch editorial language.
   Top: one dense weather hero (today metrics + hourly + 5-day outlook).
   Below: category-sectioned reporting — lead story + photo, a secondary
   headline row, and a right rail (commentary / podcast / markets).
   Reuses window.NEWS + window.Icons. Self-contained. */
(function () {
  const { useState, useEffect } = React;
  const I = window.Icons;
  const N = window.NEWS;
  const hueColor = (h, l = 0.55, c = 0.15) => `oklch(${l} ${c} ${h})`;

  if (!document.getElementById('dir-d-css')) {
    const s = document.createElement('style');
    s.id = 'dir-d-css';
    s.textContent = `
    .d-root{--ink:#16140f;--muted:#6f6a5e;--faint:#a8a294;--line:#e7e2d6;--paper:#f0eee9;--card:#fff;--blue:oklch(0.48 0.17 256);--blueSoft:oklch(0.95 0.03 256);--red:oklch(0.56 0.19 24);--green:oklch(0.55 0.13 150);
      background:var(--paper);color:var(--ink);font-family:'Archivo',sans-serif;min-height:100vh;}
    .d-root *{box-sizing:border-box;}
    .d-mono{font-family:'Space Mono',monospace;}
    .d-wrap{max-width:1320px;margin:0 auto;padding:0 40px;}
    .d-card{background:var(--card);border:1px solid var(--line);border-radius:16px;}
    .d-link{cursor:pointer;transition:color .12s;}
    .d-head{cursor:pointer;transition:color .15s;}
    .d-head:hover{color:var(--blue);}
    .d-2nd{cursor:pointer;}
    .d-2nd:hover .d-2ndt{color:var(--blue);}
    .d-2nd:hover{border-color:var(--blue);}
    .d-rail{cursor:pointer;transition:transform .15s,box-shadow .15s;}
    .d-rail:hover{transform:translateY(-2px);box-shadow:0 14px 34px rgba(0,0,0,0.07);}
    .d-imgwrap{cursor:pointer;overflow:hidden;}
    .d-imgwrap .d-imginner{transition:transform .3s;}
    .d-imgwrap:hover .d-imginner{transform:scale(1.03);}
    .d-seclink{cursor:pointer;transition:gap .15s;display:inline-flex;align-items:center;gap:6px;}
    .d-seclink:hover{gap:9px;}
    .d-hour:hover .d-hourdot{transform:scale(1.25);}
    .d-btn{cursor:pointer;transition:transform .1s;}
    .d-btn:hover{transform:translateY(-1px);}
    .d-node{cursor:pointer;transition:transform .15s;}
    .d-node:hover{transform:translateY(-2px);}
    `;
    document.head.appendChild(s);
  }

  // ── primitives ──────────────────────────────────────────────────
  function Tag({ children, color = 'var(--blue)' }) {
    return <span className="d-mono" style={{ fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', color, border: `1px solid ${color}`, padding: '2px 6px', borderRadius: 2, whiteSpace: 'nowrap' }}>{children}</span>;
  }
  function Spark({ data, w = 96, h = 30, color = 'var(--blue)', fill = true }) {
    const max = Math.max(...data), min = Math.min(...data);
    const pts = data.map((v, i) => [i / (data.length - 1) * w, h - ((v - min) / (max - min || 1)) * (h - 4) - 2]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    return (
      <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
        {fill && <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={color} opacity="0.08" />}
        <path d={line} fill="none" stroke={color} strokeWidth="1.8" />
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2.6" fill={color} />
      </svg>
    );
  }
  const parse = (d) => new Date(d + 'T00:00:00');
  const spanDays = (t) => Math.round((parse(t.events[t.events.length - 1].date) - parse(t.events[0].date)) / 86400000);
  const statusColor = (st) => (st === 'LIVE' ? 'var(--red)' : 'var(--blue)');

  function Photo({ label, height, caption, onClick }) {
    return (
      <figure style={{ margin: 0 }}>
        <div className="d-imgwrap d-card" onClick={onClick} style={{ height, borderRadius: 10, padding: 0, position: 'relative' }}>
          <div className="d-imginner d-mono" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, letterSpacing: 1.5, color: 'var(--faint)', textTransform: 'uppercase',
            background: 'repeating-linear-gradient(135deg, #faf8f3 0 9px, #efeae0 9px 18px)' }}>{label}</div>
        </div>
        {caption && <figcaption className="d-mono" style={{ fontSize: 10.5, color: 'var(--faint)', marginTop: 7 }}>{caption}</figcaption>}
      </figure>
    );
  }

  // ── weather icons (simple primitives) ───────────────────────────
  function Sun({ size = 22, color = 'var(--red)' }) {
    const rays = Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4, r1 = 8.2, r2 = 11;
      return <line key={i} x1={12 + Math.cos(a) * r1} y1={12 + Math.sin(a) * r1} x2={12 + Math.cos(a) * r2} y2={12 + Math.sin(a) * r2} stroke={color} strokeWidth="1.7" strokeLinecap="round" />;
    });
    return <svg width={size} height={size} viewBox="0 0 24 24"><circle cx="12" cy="12" r="5" fill="none" stroke={color} strokeWidth="1.7" />{rays}</svg>;
  }
  function Cloud({ size = 22, color = 'var(--muted)' }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="11" r="3.4" /><circle cx="14.5" cy="10" r="4" /><line x1="6" y1="16.5" x2="18" y2="16.5" /></svg>;
  }
  function Rain({ size = 22, color = 'var(--blue)' }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="3.2" /><circle cx="14.5" cy="8" r="3.8" /><line x1="6.5" y1="13.5" x2="17.5" y2="13.5" /><line x1="8" y1="17" x2="7" y2="19.5" /><line x1="12" y1="17" x2="11" y2="19.5" /><line x1="16" y1="17" x2="15" y2="19.5" /></svg>;
  }
  const WI = { sun: Sun, cloud: Cloud, rain: Rain };

  // ── weather data (illustrative) ─────────────────────────────────
  const WX = {
    place: 'Amsterdam', region: 'NL', updated: '08:42', now: 18, cond: 'Partly cloudy', icon: 'cloud',
    feels: 17, hi: 21, lo: 12, sunrise: '05:21', sunset: '22:01',
    metrics: [
      ['Feels like', '17°'], ['Humidity', '75%'], ['Wind', 'NW 12 km/h'], ['Gusts', '28 km/h'],
      ['Precip chance', '30%'], ['Rainfall', '1.2 mm'], ['UV index', '4 · Mod'], ['Pressure', '1014 hPa'],
      ['Visibility', '14 km'], ['Dew point', '12°'], ['Cloud cover', '60%'], ['Air quality', '32 · Good'],
    ],
    hourly: [
      { t: '06', temp: 12, icon: 'cloud', p: 10 }, { t: '09', temp: 14, icon: 'cloud', p: 20 },
      { t: '12', temp: 17, icon: 'sun', p: 5 }, { t: '15', temp: 18, icon: 'sun', p: 5, now: true },
      { t: '18', temp: 16, icon: 'cloud', p: 35 }, { t: '21', temp: 13, icon: 'rain', p: 60 }, { t: '00', temp: 11, icon: 'rain', p: 55 },
    ],
    outlook: [
      { d: 'THU', icon: 'sun', cond: 'Sunny', hi: 22, lo: 13, p: 5 },
      { d: 'FRI', icon: 'cloud', cond: 'Cloudy', hi: 19, lo: 12, p: 20 },
      { d: 'SAT', icon: 'rain', cond: 'Showers', hi: 16, lo: 11, p: 70 },
      { d: 'SUN', icon: 'cloud', cond: 'Overcast', hi: 18, lo: 10, p: 30 },
      { d: 'MON', icon: 'sun', cond: 'Clear', hi: 23, lo: 14, p: 5 },
    ],
  };

  const INDEX = [
    { s: 'NVDA', v: '184.20', d: '+4.1%', up: true }, { s: 'BRENT', v: '88.40', d: '+3.0%', up: true },
    { s: 'AEX', v: '912.4', d: '+0.6%', up: true }, { s: 'S&P 500', v: '5,610', d: '+0.7%', up: true },
    { s: 'GOLD', v: '2,418', d: '-0.4%', up: false }, { s: 'BTC', v: '71,240', d: '-1.2%', up: false }, { s: 'DXY', v: '104.3', d: '+0.2%', up: true },
  ];

  // ── editorial copy: leads, secondary rows, rails per category ───
  const SECTIONS = [
    {
      label: 'Top Story', leadDot: true, topicId: 'iran',
      head: "US warns of a 'very hard' response as tit-for-tat strikes test the ceasefire",
      dek: "Washington's threat to hit Iran's oil infrastructure has rattled a fragile truce, even as back-channel mediation in Geneva races to hold the line and Brent crude ticks higher.",
      ago: '16 mins ago', img: 'PHOTO · REUTERS / HANDOUT', cap: 'A guided-missile destroyer launches cruise missiles. Handout via REUTERS',
      secondary: [
        { title: 'India demands end to attacks on Gulf shipping after three sailors killed', ago: '10 mins ago', topicId: 'iran' },
        { title: 'Iran fights to keep Lebanon as leverage in high-stakes US talks', ago: '1 hour ago', topicId: 'iran' },
        { title: 'Brent jumps 3% as supply-route fears compound the OPEC+ output cut', ago: '2 mins ago', topicId: 'opec' },
        { title: "Ukraine's eastern front shifts as new interceptors arrive at last", ago: '6 hours ago', topicId: 'ukraine' },
      ],
      rail: { kind: 'commentary', quote: 'A ceasefire that holds only on paper', body: 'Geneva has bought time, not peace. The next border flare-up could undo months of patient mediation — and send oil higher still.', author: 'Jamie McGeever', topicId: 'iran' },
    },
    {
      label: 'Markets', topicId: 'nvidia',
      head: 'Wall Street buckles up as Nvidia prints a record high on red-hot AI demand',
      dek: 'Shares set a fresh all-time high at $184 as supply constraints ease and hyperscaler capex guidance surges — reigniting the entire AI hardware complex.',
      ago: '5 mins ago', img: 'PHOTO · REUTERS / S. NESIUS', cap: 'Traders work the floor as the AI rally resumes. REUTERS/Steve Nesius',
      secondary: [
        { title: 'Fed hold expected in July as a softer jobs report cools rate-cut bets', ago: '3 hours ago', topicId: 'fed' },
        { title: 'OPEC+ surprises with a deeper output cut, tightening summer supply', ago: '1 hour ago', topicId: 'opec' },
        { title: "Taiwan's advanced-chip export curbs take effect, reshaping supply chains", ago: '8 hours ago', topicId: 'tsmc' },
        { title: 'Rubin demand locks in Nvidia order backlog deep into 2027', ago: '4 hours ago', topicId: 'nvidia' },
      ],
      rail: { kind: 'markets', topicId: 'nvidia' },
    },
    {
      label: 'Science & Space', topicId: 'starship',
      head: "Starship stacked and cleared: Flight 12's launch window opens this week",
      dek: 'After a clean wet dress rehearsal, regulators have signed off on the twelfth integrated flight. Weather is now the only variable standing between hardware and liftoff.',
      ago: '32 mins ago', img: 'PHOTO · SPACEX / HANDOUT', cap: 'The full stack on the orbital launch mount. Handout via SpaceX',
      secondary: [
        { title: 'Booster static fire clears the way for full-stack integration', ago: '2 hours ago', topicId: 'starship' },
        { title: 'What Flight 12 needs to prove for the next NASA milestone', ago: '23 hours ago', topicId: 'starship' },
        { title: 'Wet dress rehearsal passes without a scrub', ago: '19 mins ago', topicId: 'starship' },
        { title: 'Range and weather: the variables that could slip the window', ago: '13 hours ago', topicId: 'starship' },
      ],
      rail: { kind: 'podcast', show: 'The Dispatch Briefing', title: 'Why Starship Flight 12 actually matters', dur: '24 min', ago: '16 hours ago', topicId: 'starship' },
    },
    {
      label: 'Policy', topicId: 'euai',
      head: "Brussels readies the AI Act's first fines as compliance probes widen",
      dek: 'Draft penalties target gaps in transparency and training-data disclosure, putting general-purpose model providers across the bloc firmly on notice.',
      ago: '6 hours ago', img: 'PHOTO · REUTERS', cap: 'The European Commission headquarters in Brussels. REUTERS',
      secondary: [
        { title: 'Seven probes now open into general-purpose model providers', ago: '6 hours ago', topicId: 'euai' },
        { title: 'Guidance for GPAI models sets sweeping new transparency duties', ago: '1 day ago', topicId: 'euai' },
        { title: 'First obligations took effect in February across member states', ago: '2 days ago', topicId: 'euai' },
        { title: 'Industry warns of compliance costs as deadlines tighten', ago: '9 hours ago', topicId: 'euai' },
      ],
      rail: { kind: 'commentary', quote: 'Enforcement is the real test', body: 'Rules on the books mean little without teeth. The first fines will signal just how aggressively Brussels intends to police frontier AI.', author: 'Lena Hoffmann', topicId: 'euai' },
    },
    {
      label: 'Politics', topicId: 'primaries',
      head: 'Presumptive nominees emerge as the delegate math finally settles',
      dek: 'Five months of contests — from the first caucuses to Super Tuesday — have winnowed the field. Both parties now turn their attention to the summer conventions.',
      ago: '12 hours ago', img: 'PHOTO · REUTERS', cap: 'Supporters gather ahead of the conventions. REUTERS',
      secondary: [
        { title: 'Super Tuesday reshaped the delegate math in a single night', ago: '14 hours ago', topicId: 'primaries' },
        { title: 'Trailing campaigns suspend, consolidating the front-runners', ago: '1 day ago', topicId: 'primaries' },
        { title: 'Early states split verdicts, keeping the race wide open', ago: '2 days ago', topicId: 'primaries' },
        { title: 'What the conventions need to deliver this summer', ago: '18 hours ago', topicId: 'primaries' },
      ],
      rail: { kind: 'podcast', show: 'The Dispatch Briefing', title: 'Reading the delegate map', dur: '31 min', ago: '20 hours ago', topicId: 'primaries' },
    },
  ];

  // ── header + ticker ─────────────────────────────────────────────
  function Header() {
    return (
      <header style={{ position: 'sticky', top: 0, zIndex: 30, background: 'var(--card)', borderBottom: '1px solid var(--line)' }}>
        <div className="d-wrap" style={{ height: 60, display: 'flex', alignItems: 'center', gap: 22 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
            <span style={{ fontSize: 23, fontWeight: 900, letterSpacing: -0.5 }}>DISPATCH</span>
            <span className="d-mono" style={{ fontSize: 9.5, color: 'var(--red)', letterSpacing: 1.5 }}>● MORNING REPORT</span>
          </div>
          <span className="d-mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>WED · JUNE 10 · 2026</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 20, padding: '8px 14px', width: 280 }}>
            <I.Search size={15} color="var(--faint)" />
            <span style={{ fontSize: 13, color: 'var(--faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Search any topic to build a timeline…</span>
          </div>
          <I.Bell size={18} color="var(--muted)" />
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>AR</div>
        </div>
        <div style={{ borderTop: '1px solid var(--line)', background: 'var(--paper)' }}>
          <div className="d-wrap d-mono" style={{ height: 34, display: 'flex', alignItems: 'center', gap: 26, overflow: 'hidden' }}>
            {INDEX.map((t) => (
              <span key={t.s} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, whiteSpace: 'nowrap' }}>
                <span style={{ color: 'var(--muted)', fontWeight: 700 }}>{t.s}</span>
                <span style={{ color: 'var(--ink)' }}>{t.v}</span>
                <span style={{ color: t.up ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{t.d}</span>
              </span>
            ))}
          </div>
        </div>
      </header>
    );
  }

  // ── weather hero (single, dense) ────────────────────────────────
  function WeatherHero() {
    const CurIc = WI[WX.icon];
    const temps = WX.hourly.map((x) => x.temp);
    const hmax = Math.max(...temps), hmin = Math.min(...temps);
    return (
      <section className="d-card" style={{ marginTop: 26, padding: '20px 26px', borderRadius: 18 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: 0.3 }}>WEATHER</span>
          <span className="d-mono" style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 0.5 }}>{WX.place.toUpperCase()}, {WX.region} · WED JUN 10 · UPDATED {WX.updated}</span>
          <span style={{ flex: 1 }} />
          <span className="d-mono" style={{ fontSize: 10.5, color: 'var(--faint)' }}>↑ {WX.sunrise} · ↓ {WX.sunset}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '266px 1fr 296px', gap: 0 }}>
          {/* current */}
          <div style={{ paddingRight: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <CurIc size={52} />
              <span style={{ fontSize: 60, fontWeight: 800, letterSpacing: -3, lineHeight: 0.85 }}>{WX.now}°</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>{WX.cond}</div>
            <div className="d-mono" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5 }}>Feels {WX.feels}° · H {WX.hi}° · L {WX.lo}°</div>
            <div style={{ display: 'flex', gap: 18, marginTop: 16 }}>
              <div>
                <div className="d-mono" style={{ fontSize: 9, letterSpacing: 0.6, color: 'var(--faint)' }}>SUNRISE</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{WX.sunrise}</div>
              </div>
              <div>
                <div className="d-mono" style={{ fontSize: 9, letterSpacing: 0.6, color: 'var(--faint)' }}>SUNSET</div>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>{WX.sunset}</div>
              </div>
            </div>
          </div>

          {/* center: hourly + metrics */}
          <div style={{ borderLeft: '1px solid var(--line)', borderRight: '1px solid var(--line)', padding: '0 26px' }}>
            <div className="d-mono" style={{ fontSize: 10, letterSpacing: 1.2, color: 'var(--faint)', marginBottom: 6 }}>NEXT HOURS</div>
            <div style={{ position: 'relative', height: 92, marginBottom: 16 }}>
              <div style={{ position: 'absolute', left: 8, right: 8, bottom: 22, height: 2, background: 'var(--line)' }} />
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', height: '100%', alignItems: 'flex-end' }}>
                {WX.hourly.map((x, i) => {
                  const t = (x.temp - hmin) / (hmax - hmin || 1);
                  const Ic = WI[x.icon];
                  return (
                    <div key={i} className="d-hour" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      <Ic size={16} color={x.now ? 'var(--red)' : 'var(--muted)'} />
                      <span style={{ fontSize: 13, fontWeight: 700, margin: '4px 0', color: x.now ? 'var(--red)' : 'var(--ink)' }}>{x.temp}°</span>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: 18 }}>
                        <span className="d-hourdot" style={{ width: x.now ? 12 : 9, height: x.now ? 12 : 9, borderRadius: '50%', transition: 'transform .15s', background: x.now ? 'var(--red)' : 'var(--card)', border: `2.5px solid ${x.now ? 'var(--red)' : 'var(--blue)'}`, marginBottom: -4 - t * 26 }} />
                      </div>
                      <span className="d-mono" style={{ fontSize: 9.5, color: x.now ? 'var(--red)' : 'var(--faint)', fontWeight: x.now ? 700 : 400 }}>{x.now ? 'NOW' : x.t}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '14px 18px', borderTop: '1px solid var(--line)', paddingTop: 14 }}>
              {WX.metrics.map(([l, v]) => (
                <div key={l}>
                  <div className="d-mono" style={{ fontSize: 9, letterSpacing: 0.5, color: 'var(--faint)', textTransform: 'uppercase' }}>{l}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginTop: 3 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 5-day outlook */}
          <div style={{ paddingLeft: 26, display: 'flex', flexDirection: 'column' }}>
            <div className="d-mono" style={{ fontSize: 10, letterSpacing: 1.2, color: 'var(--faint)', marginBottom: 6 }}>5-DAY OUTLOOK</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {WX.outlook.map((d, i) => {
                const Ic = WI[d.icon];
                return (
                  <div key={d.d} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, borderTop: i ? '1px solid var(--line)' : 'none' }}>
                    <span className="d-mono" style={{ fontSize: 11, fontWeight: 700, width: 30, color: 'var(--muted)' }}>{d.d}</span>
                    <Ic size={18} color="var(--muted)" />
                    <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>{d.cond}</span>
                    <span className="d-mono" style={{ fontSize: 10.5, color: 'var(--blue)', width: 34, textAlign: 'right' }}>{d.p}%</span>
                    <span style={{ fontSize: 13, fontWeight: 700, width: 56, textAlign: 'right' }}>{d.hi}°<span style={{ color: 'var(--faint)', fontWeight: 400 }}> {d.lo}°</span></span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── rails ───────────────────────────────────────────────────────
  function CommentaryRail({ r, go }) {
    return (
      <aside className="d-rail" onClick={() => go(r.topicId)} style={{ background: 'var(--blueSoft)', borderRadius: 14, padding: '22px 22px' }}>
        <div className="d-mono" style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--blue)', fontWeight: 700, marginBottom: 14 }}>COMMENTARY</div>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.2, marginBottom: 12 }}>
          <span style={{ color: 'var(--blue)', marginRight: 4 }}>“</span>{r.quote}
        </div>
        <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55 }}>{r.body}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 18 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{r.author.split(' ').map((w) => w[0]).join('')}</div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)' }}>{r.author}</span>
        </div>
      </aside>
    );
  }
  function PodcastRail({ r, go }) {
    const bars = [9, 16, 11, 22, 14, 26, 18, 12, 24, 15, 20, 10, 17, 23, 13];
    return (
      <aside className="d-rail" onClick={() => go(r.topicId)} style={{ background: '#f4f1ea', borderRadius: 14, padding: '22px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 2.5v11l9-5.5z" fill="var(--paper)" /></svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 30, flex: 1 }}>
            {bars.map((b, i) => <span key={i} style={{ width: 3, height: b, borderRadius: 2, background: i < 6 ? 'var(--red)' : 'var(--faint)' }} />)}
          </div>
        </div>
        <div className="d-mono" style={{ fontSize: 10, letterSpacing: 1, color: 'var(--muted)', marginBottom: 10 }}>PODCAST · {r.show.toUpperCase()}</div>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.4, lineHeight: 1.2 }}>{r.title}</div>
        <div className="d-mono" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 12 }}>{r.dur} · {r.ago}</div>
      </aside>
    );
  }
  function MarketsRail({ r, go }) {
    const t = N.topics[r.topicId];
    const acc = hueColor(t.hue);
    const up = (t.delta || 0) >= 0;
    return (
      <aside className="d-rail d-card" onClick={() => go(r.topicId)} style={{ padding: '20px 22px', borderRadius: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
          <I.Pulse size={14} color="var(--green)" />
          <span className="d-mono" style={{ fontSize: 10, letterSpacing: 1, fontWeight: 700 }}>MARKETS NOW</span>
          <span style={{ flex: 1 }} />
          <span className="d-mono" style={{ fontSize: 9, color: 'var(--red)', letterSpacing: 1 }}>● LIVE</span>
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.3 }}>{t.title}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
          <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.8 }}>{t.metric.value}</span>
          {t.metric.delta && <span className="d-mono" style={{ fontSize: 13, fontWeight: 700, color: up ? 'var(--green)' : 'var(--red)' }}>{t.metric.delta}</span>}
        </div>
        <div style={{ marginTop: 10 }}><Spark data={t.spark} w={252} h={44} color="var(--green)" /></div>
        <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
          {INDEX.slice(0, 4).map((x) => (
            <div key={x.s} className="d-mono" style={{ display: 'flex', alignItems: 'center', fontSize: 11.5, padding: '4px 0' }}>
              <span style={{ color: 'var(--muted)', fontWeight: 700, flex: 1 }}>{x.s}</span>
              <span style={{ color: 'var(--ink)', width: 64, textAlign: 'right' }}>{x.v}</span>
              <span style={{ color: x.up ? 'var(--green)' : 'var(--red)', fontWeight: 700, width: 56, textAlign: 'right' }}>{x.d}</span>
            </div>
          ))}
        </div>
      </aside>
    );
  }
  function Rail({ r, go }) {
    if (r.kind === 'commentary') return <CommentaryRail r={r} go={go} />;
    if (r.kind === 'podcast') return <PodcastRail r={r} go={go} />;
    return <MarketsRail r={r} go={go} />;
  }

  // ── category section ────────────────────────────────────────────
  function CategorySection({ s, first, go }) {
    const t = N.topics[s.topicId];
    const acc = hueColor(t.hue);
    return (
      <section style={{ marginTop: first ? 30 : 0, borderTop: first ? 'none' : '1px solid var(--line)', paddingTop: first ? 0 : 34, paddingBottom: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
          {s.leadDot && <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--red)', marginRight: 9 }} />}
          <span className="d-seclink d-link" onClick={() => go(s.topicId)} style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.2 }}>
            {s.label} <I.Chevron size={16} color="var(--ink)" />
          </span>
          <span style={{ flex: 1 }} />
          <span className="d-mono d-seclink d-link" onClick={() => go(s.topicId)} style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 700 }}>VIEW ALL →</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 38, alignItems: 'start' }}>
          {/* main column: lead + secondary */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '352px 1fr', gap: 30, alignItems: 'start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Tag color={acc}>{t.category}</Tag><Tag color="var(--red)">{t.status}</Tag>
                </div>
                <h2 className="d-head" onClick={() => go(s.topicId)} style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.9, lineHeight: 1.08, margin: 0 }}>{s.head}</h2>
                <p style={{ fontSize: 14.5, color: 'var(--muted)', lineHeight: 1.55, marginTop: 14, marginBottom: 0 }}>{s.dek}</p>
                <div className="d-mono" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span>{s.ago}</span><span>·</span><span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><I.Sources size={12} color="var(--faint)" />{t.sources} sources</span><span>·</span><span>{t.events.length} events</span>
                </div>
              </div>
              <Photo label={s.img} height={first ? 360 : 300} caption={s.cap} onClick={() => go(s.topicId)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24, marginTop: 26, borderTop: '1px solid var(--line)', paddingTop: 22 }}>
              {s.secondary.map((a, i) => (
                <div key={i} className="d-2nd" onClick={() => go(a.topicId)} style={{ display: 'flex', flexDirection: 'column', paddingTop: 2 }}>
                  <div className="d-2ndt" style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: -0.2, lineHeight: 1.25, transition: 'color .12s' }}>{a.title}</div>
                  <div className="d-mono" style={{ fontSize: 11, color: 'var(--faint)', marginTop: 'auto', paddingTop: 12 }}>{a.ago}</div>
                </div>
              ))}
            </div>
          </div>

          <Rail r={s.rail} go={go} />
        </div>
      </section>
    );
  }

  // ── topic detail overlay (full horizontal timeline) ─────────────
  function TopicView({ topic, onBack }) {
    const [open, setOpen] = useState(topic.events.length - 1);
    const acc = hueColor(topic.hue);
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', padding: '26px 40px 30px', overflow: 'auto', background: 'var(--paper)' }}>
        <button className="d-btn" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 20, font: 'inherit', color: 'var(--muted)', fontSize: 13, fontWeight: 600, padding: '8px 14px', marginBottom: 18, alignSelf: 'flex-start', whiteSpace: 'nowrap', fontFamily: 'Archivo' }}>
          <span style={{ transform: 'rotate(180deg)', display: 'flex' }}><I.Arrow size={15} color="var(--muted)" /></span> Back to morning report
        </button>
        <div style={{ maxWidth: 1320, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', marginBottom: 26 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Tag color={acc}>{topic.category}</Tag>
                <Tag color="var(--red)">{topic.status}</Tag>
                <span className="d-mono" style={{ fontSize: 11, color: 'var(--faint)' }}>UPDATED {topic.updated.toUpperCase()} · {topic.sources} SOURCES · {spanDays(topic)} DAYS · {topic.events.length} EVENTS</span>
              </div>
              <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1, lineHeight: 1.02 }}>{topic.title}</div>
              <div style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.5, maxWidth: 760, marginTop: 10 }}>{topic.summary}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="d-mono" style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 4 }}>{topic.metric.label.toUpperCase()}</div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>{topic.metric.value}</div>
              <div style={{ marginTop: 8 }}><Spark data={topic.spark} w={140} h={36} color={acc} /></div>
            </div>
          </div>
          <div style={{ position: 'relative', flex: 1, minHeight: 380 }}>
            <div style={{ position: 'absolute', top: 22, left: 0, right: 0, height: 3, background: 'var(--line)' }} />
            <div style={{ position: 'absolute', top: 22, left: 0, height: 3, background: acc, width: `${open / (topic.events.length - 1) * 100}%` }} />
            <div style={{ display: 'flex', gap: 14, height: '100%' }}>
              {topic.events.map((e, i) => (
                <div key={i} className="d-node" onClick={() => setOpen(i)} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ height: 44, display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ width: i === open ? 18 : 13, height: i === open ? 18 : 13, marginTop: i === open ? 13 : 16, borderRadius: '50%', background: i === open ? acc : 'var(--card)', border: `3px solid ${e.now ? 'var(--red)' : acc}`, transition: 'all .2s' }} />
                  </div>
                  <div style={{ flex: 1, padding: '14px 14px 16px', borderRadius: 10, background: i === open ? 'var(--card)' : 'transparent', border: i === open ? '1px solid var(--line)' : '1px solid transparent', boxShadow: i === open ? '0 8px 28px rgba(0,0,0,0.07)' : 'none', transition: 'all .2s', opacity: i === open ? 1 : 0.62 }}>
                    <div className="d-mono" style={{ fontSize: 11, fontWeight: 700, color: acc, marginBottom: 8 }}>{e.d}</div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.25, marginBottom: 8 }}>{e.title}</div>
                    {i === open && <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, animation: 'aFade .3s' }}>{e.desc}</div>}
                    <div style={{ marginTop: 10 }}><Tag color={e.now ? 'var(--red)' : 'var(--muted)'}>{e.tag}</Tag></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function Footer() {
    return (
      <footer style={{ borderTop: '1px solid var(--line)', background: 'var(--card)', marginTop: 10 }}>
        <div className="d-wrap" style={{ height: 64, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: -0.4 }}>DISPATCH</span>
          <span className="d-mono" style={{ fontSize: 11, color: 'var(--faint)' }}>© 2026 · MORNING REPORT · ALL TIMELINES LIVE</span>
          <span style={{ flex: 1 }} />
          <span className="d-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>Updated 08:42 · {N.feed.length} stories tracked</span>
        </div>
      </footer>
    );
  }

  function App() {
    const [topic, setTopic] = useState(null);
    useEffect(() => {
      document.documentElement.style.overflow = topic ? 'hidden' : '';
      return () => { document.documentElement.style.overflow = ''; };
    }, [topic]);
    return (
      <div className="d-root">
        <Header />
        <div className="d-wrap" style={{ paddingBottom: 20 }}>
          <WeatherHero />
          {SECTIONS.map((s, i) => <CategorySection key={i} s={s} first={i === 0} go={setTopic} />)}
        </div>
        <Footer />
        {topic && <TopicView topic={N.topics[topic]} onBack={() => setTopic(null)} />}
      </div>
    );
  }

  window.DirectionD = App;
})();
