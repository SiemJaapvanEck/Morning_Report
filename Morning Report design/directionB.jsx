/* Direction B — "SIGNAL"
   Dark terminal / Bloomberg-style dashboard. Icon nav · featured story with a
   vertical spine timeline · data sidebar (watchlist + trending). */
(function () {
  const { useState } = React;
  const I = window.Icons;
  const N = window.NEWS;
  const acc = (h, l = 0.72, c = 0.15) => `oklch(${l} ${c} ${h})`;
  const UP = 'oklch(0.74 0.16 152)', DN = 'oklch(0.66 0.2 22)', BLUE = 'oklch(0.72 0.14 235)';

  if (!document.getElementById('dir-b-css')) {
    const s = document.createElement('style');
    s.id = 'dir-b-css';
    s.textContent = `
    .b-root{--bg:#090c15;--p1:#111726;--p2:#0d1320;--line:#1f2a42;--ink:#e9edf6;--mut:#8a93ab;--fnt:#5b6b85;--blue:${BLUE};
      position:absolute;inset:0;background:var(--bg);color:var(--ink);font-family:'Space Grotesk',sans-serif;display:flex;overflow:hidden;}
    .b-root *{box-sizing:border-box;}
    .b-mono{font-family:'JetBrains Mono',monospace;}
    .b-nav{cursor:pointer;transition:background .15s,color .15s;}
    .b-row{cursor:pointer;transition:background .12s;}
    .b-row:hover{background:#162038;}
    .b-ev{cursor:pointer;}
    .b-ev:hover .b-evcard{border-color:var(--blue);}
    .b-btn{cursor:pointer;transition:filter .15s,transform .1s;}
    .b-btn:hover{filter:brightness(1.12);transform:translateY(-1px);}
    .b-node{transition:all .2s;}
    `;
    document.head.appendChild(s);
  }

  function Spark({ data, w = 110, h = 32, color = BLUE }) {
    const mx = Math.max(...data), mn = Math.min(...data);
    const pts = data.map((v, i) => [i / (data.length - 1) * w, h - ((v - mn) / (mx - mn || 1)) * (h - 4) - 2]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    return (
      <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }}>
        <defs><linearGradient id={'bg' + color.length} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.25" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={`url(#bg${color.length})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="1.6" />
      </svg>
    );
  }

  function Pill({ children, color = BLUE }) {
    return <span className="b-mono" style={{ fontSize: 9.5, letterSpacing: 0.8, textTransform: 'uppercase', color, background: color.replace(')', ' / 0.14)').replace('oklch(', 'oklch('), padding: '2px 7px', borderRadius: 3 }}>{children}</span>;
  }

  const ticker = [
    { s: 'NVDA', v: '184.20', d: '+4.1%', up: true }, { s: 'BRENT', v: '88.40', d: '+3.0%', up: true },
    { s: 'GOLD', v: '2,418', d: '-0.4%', up: false }, { s: 'S&P 500', v: '5,610', d: '+0.7%', up: true },
    { s: 'BTC', v: '71,240', d: '-1.2%', up: false }, { s: 'DXY', v: '104.3', d: '+0.2%', up: true },
    { s: 'VIX', v: '16.8', d: '+5.4%', up: false },
  ];

  function Nav() {
    const items = [I.Grid, I.Calendar, I.Bookmark, I.Trending, I.Globe];
    return (
      <nav style={{ width: 60, flex: '0 0 auto', background: 'var(--p2)', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 26 }}>
          <I.Pulse size={18} color="#07101e" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((Ic, i) => (
            <div key={i} className="b-nav" style={{ width: 40, height: 40, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: i === 0 ? 'rgba(56,140,255,0.12)' : 'transparent', color: i === 0 ? 'var(--blue)' : 'var(--mut)' }}>
              <Ic size={19} color={i === 0 ? BLUE : 'var(--mut)'} />
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#2a3550,#1a2238)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>AR</div>
      </nav>
    );
  }

  function VSpine({ topic, detail, openIdx, setOpen }) {
    const c = acc(topic.hue);
    const ev = detail ? topic.events : topic.events.slice(-4);
    const offset = detail ? 0 : topic.events.length - 4;
    return (
      <div style={{ position: 'relative', paddingLeft: 4 }}>
        {ev.map((e, i) => {
          const gi = i + offset;
          const isOpen = gi === openIdx;
          return (
            <div key={gi} className="b-ev" onClick={() => setOpen(gi)} style={{ display: 'flex', gap: 16, position: 'relative' }}>
              {/* spine column */}
              <div style={{ width: 18, flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {i > 0 && <div style={{ width: 2, height: 14, background: 'var(--line)' }} />}
                {i === 0 && <div style={{ height: 14 }} />}
                <span className="b-node" style={{ width: isOpen ? 15 : 10, height: isOpen ? 15 : 10, borderRadius: '50%', background: isOpen ? c : 'var(--bg)', border: `2.5px solid ${e.now ? DN : c}`, flex: '0 0 auto', boxShadow: e.now ? `0 0 0 4px ${DN.replace(')', ' / 0.2)')}` : 'none' }} />
                <div style={{ width: 2, flex: 1, background: 'var(--line)' }} />
              </div>
              {/* card */}
              <div className="b-evcard" style={{ flex: 1, marginBottom: detail ? 12 : 9, padding: detail ? '14px 16px' : '11px 14px', background: isOpen ? 'var(--p1)' : 'transparent', border: `1px solid ${isOpen ? 'var(--line)' : 'transparent'}`, borderRadius: 9, transition: 'all .15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span className="b-mono" style={{ fontSize: 11, fontWeight: 700, color: c }}>{e.d}</span>
                  <Pill color={e.now ? DN : 'var(--mut)'}>{e.tag}</Pill>
                  <span style={{ flex: 1 }} />
                  <span className="b-mono" style={{ fontSize: 10, color: 'var(--fnt)', display: 'flex', alignItems: 'center', gap: 4 }}><I.Sources size={11} color="var(--fnt)" />{e.sources}</span>
                </div>
                <div style={{ fontSize: detail ? 15.5 : 13.5, fontWeight: 600, lineHeight: 1.3, color: 'var(--ink)' }}>{e.title}</div>
                {(detail || isOpen) && <div style={{ fontSize: 12.5, color: 'var(--mut)', lineHeight: 1.5, marginTop: 7 }}>{e.desc}</div>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function Header({ extra }) {
    return (
      <div style={{ flex: '0 0 auto' }}>
        <div style={{ height: 54, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 20, borderBottom: '1px solid var(--line)' }}>
          <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: 0.5 }}>SIGNAL<span style={{ color: 'var(--blue)' }}>.</span></span>
          <span className="b-mono" style={{ fontSize: 11, color: 'var(--mut)' }}>10 JUN 2026 · 08:42 EDT</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--p2)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 13px', width: 300 }}>
            <I.Search size={14} color="var(--fnt)" />
            <span className="b-mono" style={{ fontSize: 12, color: 'var(--fnt)' }}>Track a topic…</span>
            <span style={{ flex: 1 }} />
            <span className="b-mono" style={{ fontSize: 10, color: 'var(--fnt)', border: '1px solid var(--line)', borderRadius: 4, padding: '1px 5px' }}>⌘K</span>
          </div>
          <I.Bell size={17} color="var(--mut)" />
        </div>
        {/* ticker */}
        <div className="b-mono" style={{ height: 34, display: 'flex', alignItems: 'center', gap: 26, padding: '0 24px', borderBottom: '1px solid var(--line)', background: 'var(--p2)', overflow: 'hidden' }}>
          {ticker.map((t) => (
            <span key={t.s} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, whiteSpace: 'nowrap' }}>
              <span style={{ color: 'var(--mut)', fontWeight: 600 }}>{t.s}</span>
              <span style={{ color: 'var(--ink)' }}>{t.v}</span>
              <span style={{ color: t.up ? UP : DN, fontWeight: 600 }}>{t.d}</span>
            </span>
          ))}
        </div>
        {extra}
      </div>
    );
  }

  function TopicView({ topic, onBack }) {
    const [open, setOpen] = useState(topic.events.length - 1);
    const c = acc(topic.hue);
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, padding: '20px 32px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <button className="b-btn" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--p1)', border: '1px solid var(--line)', borderRadius: 7, color: 'var(--mut)', fontSize: 12, fontWeight: 600, padding: '7px 12px', alignSelf: 'flex-start', marginBottom: 16, fontFamily: 'inherit' }}>
              <span style={{ transform: 'rotate(180deg)', display: 'flex' }}><I.Arrow size={14} color="var(--mut)" /></span> Back to dashboard
            </button>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 22 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                  <Pill color={c}>{topic.category}</Pill><Pill color={DN}>{topic.status}</Pill>
                </div>
                <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.05 }}>{topic.title}</div>
                <div style={{ fontSize: 13.5, color: 'var(--mut)', lineHeight: 1.5, marginTop: 9, maxWidth: 620 }}>{topic.summary}</div>
              </div>
              <div style={{ width: 200, background: 'var(--p1)', border: '1px solid var(--line)', borderRadius: 11, padding: 16 }}>
                <div className="b-mono" style={{ fontSize: 10, color: 'var(--fnt)', marginBottom: 4 }}>{topic.metric.label.toUpperCase()}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 26, fontWeight: 700 }}>{topic.metric.value}</span>
                  {topic.metric.delta && <span className="b-mono" style={{ fontSize: 12, fontWeight: 600, color: UP }}>{topic.metric.delta}</span>}
                </div>
                <div style={{ marginTop: 10 }}><Spark data={topic.spark} w={168} h={42} color={c} /></div>
              </div>
            </div>
            <div className="b-mono" style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--fnt)', marginBottom: 16 }}>CHRONOLOGY — {topic.events.length} EVENTS</div>
            <div style={{ flex: 1, overflow: 'hidden' }}><VSpine topic={topic} detail openIdx={open} setOpen={setOpen} /></div>
          </div>
          <Sidebar go={() => {}} />
        </div>
      </div>
    );
  }

  function Sidebar({ go }) {
    return (
      <aside style={{ width: 320, flex: '0 0 auto', borderLeft: '1px solid var(--line)', background: 'var(--p2)', padding: '18px 18px', display: 'flex', flexDirection: 'column', gap: 20, overflow: 'hidden' }}>
        <div>
          <div className="b-mono" style={{ fontSize: 10, letterSpacing: 1, color: 'var(--fnt)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><I.Bookmark size={12} color="var(--fnt)" />WATCHLIST</div>
          {N.saved.map((t) => {
            const tp = N.topics[t.id];
            return (
              <div key={t.id} className="b-row" onClick={() => tp && go(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 9px', borderRadius: 8, marginLeft: -9, marginRight: -9 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: acc(t.hue), flex: '0 0 auto' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                  <div className="b-mono" style={{ fontSize: 10, color: 'var(--fnt)' }}>{t.events} EV · {t.updated}</div>
                </div>
                {tp && <Spark data={tp.spark} w={46} h={20} color={acc(t.hue)} />}
              </div>
            );
          })}
        </div>
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16, flex: 1, overflow: 'hidden' }}>
          <div className="b-mono" style={{ fontSize: 10, letterSpacing: 1, color: 'var(--fnt)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><I.Trending size={12} color="var(--fnt)" />TRENDING SIGNALS</div>
          {N.trending.map((t, i) => (
            <div key={t.id} className="b-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 9px', borderRadius: 8, marginLeft: -9, marginRight: -9 }}>
              <span className="b-mono" style={{ fontSize: 11, color: 'var(--fnt)', width: 14 }}>{String(i + 1).padStart(2, '0')}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                <div className="b-mono" style={{ fontSize: 9.5, color: 'var(--fnt)' }}>{t.events} EVENTS</div>
              </div>
              <span className="b-mono" style={{ fontSize: 11, fontWeight: 600, color: t.delta >= 0 ? UP : DN }}>{t.delta >= 0 ? '+' : ''}{t.delta}</span>
            </div>
          ))}
        </div>
      </aside>
    );
  }

  function Home({ go }) {
    const [lead, setLead] = useState(N.topics.iran);
    const [open, setOpen] = useState(lead.events.length - 1);
    const c = acc(lead.hue);
    const pick = (t) => { setLead(t); setOpen(t.events.length - 1); };
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header />
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, padding: '18px 28px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* topic switch chips */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              {N.list.map((t) => (
                <button key={t.id} className="b-btn" onClick={() => pick(t)} style={{ display: 'flex', alignItems: 'center', gap: 7, background: lead.id === t.id ? 'var(--p1)' : 'transparent', border: `1px solid ${lead.id === t.id ? acc(t.hue) : 'var(--line)'}`, borderRadius: 20, padding: '7px 13px', color: 'var(--ink)', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: acc(t.hue) }} />{t.short}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: DN, boxShadow: `0 0 0 3px ${DN.replace(')', ' / 0.2)')}` }} />
                  <span className="b-mono" style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--mut)' }}>FEATURED · UPDATED {lead.updated.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.06 }}>{lead.title}</div>
                <div style={{ fontSize: 13.5, color: 'var(--mut)', lineHeight: 1.5, marginTop: 9, maxWidth: 560 }}>{lead.summary}</div>
                <button className="b-btn" onClick={() => go(lead.id)} style={{ marginTop: 14, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--blue)', color: '#06101e', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
                  Open full timeline <I.Arrow size={14} color="#06101e" />
                </button>
              </div>
              <div style={{ width: 210, background: 'var(--p1)', border: '1px solid var(--line)', borderRadius: 11, padding: 16 }}>
                <div className="b-mono" style={{ fontSize: 10, color: 'var(--fnt)', marginBottom: 4 }}>{lead.metric.label.toUpperCase()}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 26, fontWeight: 700 }}>{lead.metric.value}</span>
                  {lead.metric.delta && <span className="b-mono" style={{ fontSize: 12, fontWeight: 600, color: UP }}>{lead.metric.delta}</span>}
                </div>
                <div style={{ marginTop: 10 }}><Spark data={lead.spark} w={178} h={44} color={c} /></div>
                <div className="b-mono" style={{ fontSize: 9.5, color: 'var(--fnt)', marginTop: 8, display: 'flex', justifyContent: 'space-between' }}><span>{lead.sources} SOURCES</span><span>CONF {Math.round(lead.confidence * 100)}%</span></div>
              </div>
            </div>
            <div className="b-mono" style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--fnt)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              RECENT CHRONOLOGY <span style={{ flex: 1, height: 1, background: 'var(--line)' }} /> <span style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => go(lead.id)}>VIEW ALL {lead.events.length} →</span>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}><VSpine topic={lead} openIdx={open} setOpen={setOpen} /></div>
          </div>
          <Sidebar go={go} />
        </div>
      </div>
    );
  }

  function DirectionB() {
    const [view, setView] = useState({ name: 'home' });
    return (
      <div className="b-root">
        <Nav />
        {view.name === 'home'
          ? <Home go={(id) => setView({ name: 'topic', id })} />
          : <TopicView topic={N.topics[view.id]} onBack={() => setView({ name: 'home' })} />}
      </div>
    );
  }

  window.DirectionB = DirectionB;
})();
