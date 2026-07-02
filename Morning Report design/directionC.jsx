/* Direction C — "ATLAS"
   Bold high-contrast bento dashboard. Big type, electric-blue hero tile,
   calendar heatmap + trending/saved tiles. Timeline = connected node-path. */
(function () {
  const { useState } = React;
  const I = window.Icons;
  const N = window.NEWS;
  const BLUE = 'oklch(0.55 0.22 258)';
  const acc = (h) => `oklch(0.56 0.18 ${h})`;

  if (!document.getElementById('dir-c-css')) {
    const s = document.createElement('style');
    s.id = 'dir-c-css';
    s.textContent = `
    .c-root{--ink:#0b0b0d;--mut:#6b6b73;--fnt:#a6a6ad;--line:#e8e8ea;--blue:${BLUE};--blueT:oklch(0.96 0.035 258);
      position:absolute;inset:0;background:#fbfbfb;color:var(--ink);font-family:'Space Grotesk',sans-serif;display:flex;flex-direction:column;overflow:hidden;}
    .c-root *{box-sizing:border-box;}
    .c-disp{font-family:'Archivo',sans-serif;}
    .c-tile{border-radius:18px;background:#fff;border:1px solid var(--line);position:relative;overflow:hidden;}
    .c-hero{cursor:pointer;transition:transform .18s,box-shadow .18s;}
    .c-hero:hover{transform:translateY(-3px);box-shadow:0 18px 50px oklch(0.55 0.22 258 / 0.28);}
    .c-mini{cursor:pointer;transition:background .12s,border-color .12s;}
    .c-mini:hover{background:var(--blueT);}
    .c-btn{cursor:pointer;transition:transform .12s,filter .15s;}
    .c-btn:hover{transform:translateY(-1px);}
    .c-station{cursor:pointer;}
    .c-card-n{transition:transform .18s,box-shadow .18s,background .18s,color .18s;}
    .c-station:hover .c-card-n{transform:translateY(-3px);box-shadow:0 12px 30px rgba(0,0,0,0.1);}
    .c-day:hover{outline:2px solid var(--blue);outline-offset:-2px;}
    `;
    document.head.appendChild(s);
  }

  function Spark({ data, w = 90, h = 28, color = BLUE }) {
    const mx = Math.max(...data), mn = Math.min(...data);
    const pts = data.map((v, i) => [i / (data.length - 1) * w, h - ((v - mn) / (mx - mn || 1)) * (h - 3) - 2]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    return <svg width={w} height={h} style={{ display: 'block' }}><path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" /></svg>;
  }

  // mini node-path inside hero
  function MiniPath({ topic, light }) {
    const ev = topic.events;
    const stroke = light ? 'rgba(255,255,255,0.55)' : 'var(--blue)';
    return (
      <div style={{ position: 'relative', height: 46, display: 'flex', alignItems: 'center' }}>
        <div style={{ position: 'absolute', left: 6, right: 6, top: 22, height: 2, background: light ? 'rgba(255,255,255,0.3)' : 'var(--line)' }} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          {ev.map((e, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ width: e.now ? 16 : 11, height: e.now ? 16 : 11, borderRadius: '50%', background: e.now ? (light ? '#fff' : 'var(--blue)') : (light ? 'rgba(255,255,255,0.9)' : '#fff'), border: `2.5px solid ${light ? '#fff' : 'var(--blue)'}`, boxShadow: e.now ? `0 0 0 5px ${light ? 'rgba(255,255,255,0.18)' : 'oklch(0.55 0.22 258 / 0.16)'}` : 'none' }} />
              <span className="c-disp" style={{ fontSize: 9, fontWeight: 700, color: light ? 'rgba(255,255,255,0.8)' : 'var(--mut)', whiteSpace: 'nowrap' }}>{e.d}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // calendar heatmap
  function HeatCal() {
    const c = N.calendar; const mx = Math.max(...c.activity);
    const cells = []; for (let i = 0; i < c.startDow; i++) cells.push(null);
    for (let d = 1; d <= c.activity.length; d++) cells.push(d);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 5 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={i} className="c-disp" style={{ fontSize: 9, textAlign: 'center', color: 'var(--fnt)', fontWeight: 700 }}>{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const a = c.activity[d - 1]; const t = a / mx; const today = d === c.today;
          return (
            <div key={i} className="c-day" title={`${a} events`} style={{ aspectRatio: '1', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: today ? 800 : 600, fontFamily: 'Archivo',
              background: today ? 'var(--blue)' : `oklch(0.55 0.22 258 / ${0.05 + t * 0.6})`, color: today || t > 0.6 ? '#fff' : 'var(--ink)' }}>{d}</div>
          );
        })}
      </div>
    );
  }

  // ── Topic detail: connected node-path metro timeline ────────────
  function TopicView({ topic, onBack }) {
    const [active, setActive] = useState(topic.events.length - 1);
    const c = acc(topic.hue);
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '26px 40px 30px', overflow: 'hidden', background: '#fbfbfb' }}>
        <button className="c-btn" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1.5px solid var(--ink)', borderRadius: 30, color: 'var(--ink)', fontSize: 13, fontWeight: 700, padding: '8px 16px', alignSelf: 'flex-start', marginBottom: 20, fontFamily: 'Space Grotesk' }}>
          <span style={{ transform: 'rotate(180deg)', display: 'flex' }}><I.Arrow size={15} color="var(--ink)" /></span> Back
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28, marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="c-disp" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: '#fff', background: c, padding: '4px 10px', borderRadius: 20 }}>{topic.category.toUpperCase()}</span>
              <span className="c-disp" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: c, border: `1.5px solid ${c}`, padding: '3px 9px', borderRadius: 20 }}>{topic.status}</span>
              <span style={{ fontSize: 12, color: 'var(--mut)', fontWeight: 600 }}>{topic.sources} sources · updated {topic.updated}</span>
            </div>
            <div className="c-disp" style={{ fontSize: 52, fontWeight: 800, letterSpacing: -1.5, lineHeight: 0.98 }}>{topic.title}</div>
          </div>
          <div style={{ textAlign: 'right', paddingBottom: 4 }}>
            <div className="c-disp" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'var(--fnt)', marginBottom: 2 }}>{topic.metric.label.toUpperCase()}</div>
            <div className="c-disp" style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1 }}>{topic.metric.value}</div>
          </div>
        </div>
        <div style={{ fontSize: 15, color: 'var(--mut)', lineHeight: 1.5, maxWidth: 720, marginBottom: 6 }}>{topic.summary}</div>

        {/* metro node-path */}
        <div style={{ flex: 1, position: 'relative', marginTop: 8 }}>
          <div style={{ position: 'absolute', left: '4%', right: '4%', top: '50%', height: 4, background: 'var(--line)', borderRadius: 2, transform: 'translateY(-50%)' }} />
          <div style={{ position: 'absolute', left: '4%', top: '50%', height: 4, background: c, borderRadius: 2, transform: 'translateY(-50%)', width: `${(active) / (topic.events.length - 1) * 92}%`, transition: 'width .3s' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', padding: '0 2%' }}>
            {topic.events.map((e, i) => {
              const top = i % 2 === 0; const on = i === active;
              return (
                <div key={i} className="c-station" onClick={() => setActive(i)} style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  {/* card */}
                  <div className="c-card-n" style={{ position: 'absolute', [top ? 'bottom' : 'top']: '54%', width: '88%', padding: '14px 15px', borderRadius: 14, background: on ? c : '#fff', color: on ? '#fff' : 'var(--ink)', border: `1.5px solid ${on ? c : 'var(--line)'}`, boxShadow: on ? `0 14px 34px ${c.replace(')', ' / 0.3)')}` : '0 2px 10px rgba(0,0,0,0.04)' }}>
                    <div className="c-disp" style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, marginBottom: 6, opacity: on ? 0.9 : 0.55 }}>{e.d} · 2026</div>
                    <div className="c-disp" style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2, marginBottom: on ? 7 : 0 }}>{e.title}</div>
                    {on && <div style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.92 }}>{e.desc}</div>}
                    <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', padding: '2px 7px', borderRadius: 12, background: on ? 'rgba(255,255,255,0.22)' : 'var(--blueT)', color: on ? '#fff' : c }}>{e.tag}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.7 }}>{e.sources} sources</span>
                    </div>
                  </div>
                  {/* connector + node */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 2 }}>
                    <span className="c-disp" style={{ width: on ? 40 : 32, height: on ? 40 : 32, borderRadius: '50%', background: on ? c : '#fff', color: on ? '#fff' : c, border: `3px solid ${c}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: on ? 15 : 13, fontWeight: 800, transition: 'all .2s', boxShadow: e.now ? `0 0 0 6px ${c.replace(')', ' / 0.16)')}` : 'none' }}>{String(i + 1).padStart(2, '0')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Home (bento) ────────────────────────────────────────────────
  function Home({ go }) {
    const [lead, setLead] = useState(N.topics.iran);
    const c = acc(lead.hue);
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0' }}>
        {/* top bar */}
        <header style={{ height: 70, flex: '0 0 auto', display: 'flex', alignItems: 'center', padding: '0 34px', gap: 24 }}>
          <span className="c-disp" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>Atlas</span>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--blue)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--mut)' }}>Wednesday, June 10 2026</span>
          <div style={{ flex: 1 }} />
          <div className="c-btn" style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', border: '1.5px solid var(--line)', borderRadius: 30, padding: '10px 18px', width: 320 }}>
            <I.Search size={16} color="var(--mut)" />
            <span style={{ fontSize: 13.5, color: 'var(--fnt)', fontWeight: 500 }}>Build a timeline for any topic…</span>
          </div>
          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>AR</div>
        </header>

        {/* bento grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gridTemplateRows: 'repeat(3,1fr)', gap: 14, padding: '4px 28px 26px', minHeight: 0 }}>
          {/* HERO */}
          <div className="c-tile c-hero" onClick={() => go(lead.id)} style={{ gridColumn: '1 / span 8', gridRow: '1 / span 2', background: 'var(--blue)', border: 'none', color: '#fff', padding: '30px 32px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', boxShadow: '0 0 0 4px rgba(255,255,255,0.25)' }} />
              <span className="c-disp" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>TODAY'S LEAD STORY</span>
              <span style={{ flex: 1 }} />
              <span className="c-disp" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, opacity: 0.85 }}>{lead.category.toUpperCase()} · {lead.region.toUpperCase()}</span>
            </div>
            <div className="c-disp" style={{ fontSize: 60, fontWeight: 800, letterSpacing: -2, lineHeight: 0.97, marginTop: 'auto' }}>{lead.title}</div>
            <div style={{ fontSize: 16, lineHeight: 1.5, opacity: 0.92, maxWidth: 620, marginTop: 16 }}>{lead.summary}</div>
            <div style={{ marginTop: 22 }}><MiniPath topic={lead} light /></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 22 }}>
              <span className="c-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: '#fff', color: 'var(--blue)', borderRadius: 30, padding: '12px 22px', fontSize: 14, fontWeight: 700 }}>
                Open full timeline <I.Arrow size={16} color={BLUE} />
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>{lead.events.length} events · {lead.sources} sources</span>
            </div>
          </div>

          {/* TIMELINES (topic switch) */}
          <div className="c-tile" style={{ gridColumn: '9 / span 4', gridRow: '1', padding: '20px 22px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <I.Layers size={16} color="var(--ink)" />
              <span className="c-disp" style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.2 }}>Your timelines</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {N.list.map((t) => (
                <div key={t.id} className="c-mini" onClick={(e) => { e.stopPropagation(); setLead(t); }} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 12, border: `1.5px solid ${lead.id === t.id ? 'var(--blue)' : 'var(--line)'}`, background: lead.id === t.id ? 'var(--blueT)' : '#fff' }}>
                  <span className="c-disp" style={{ width: 30, height: 30, borderRadius: 9, background: acc(t.hue), color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flex: '0 0 auto' }}>{t.short[0]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.short}</div>
                    <div style={{ fontSize: 11, color: 'var(--mut)', fontWeight: 500 }}>{t.events.length} events</div>
                  </div>
                  <button className="c-btn" onClick={(e) => { e.stopPropagation(); go(t.id); }} style={{ background: 'none', border: 'none', padding: 4, display: 'flex' }}><I.Arrow size={15} color="var(--mut)" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* CALENDAR */}
          <div className="c-tile" style={{ gridColumn: '9 / span 4', gridRow: '2', padding: '20px 22px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <I.Calendar size={15} color="var(--ink)" />
                <span className="c-disp" style={{ fontSize: 13, fontWeight: 800 }}>June 2026</span>
              </div>
              <span className="c-disp" style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 1, color: 'var(--fnt)' }}>NEWS DENSITY</span>
            </div>
            <HeatCal />
          </div>

          {/* TRENDING */}
          <div className="c-tile" style={{ gridColumn: '1 / span 4', gridRow: '3', padding: '18px 20px', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <I.Trending size={15} color="var(--blue)" />
              <span className="c-disp" style={{ fontSize: 13, fontWeight: 800 }}>Trending</span>
            </div>
            {N.trending.slice(0, 4).map((t, i) => (
              <div key={t.id} className="c-mini" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 9, marginLeft: -8, marginRight: -8 }}>
                <span className="c-disp" style={{ fontSize: 13, fontWeight: 800, color: 'var(--fnt)', width: 18 }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                </div>
                <span className="c-disp" style={{ fontSize: 11, fontWeight: 800, color: t.delta >= 0 ? 'oklch(0.55 0.18 150)' : 'oklch(0.58 0.2 24)' }}>{t.delta >= 0 ? '↑' : '↓'}{Math.abs(t.delta)}</span>
              </div>
            ))}
          </div>

          {/* SAVED */}
          <div className="c-tile" style={{ gridColumn: '5 / span 4', gridRow: '3', padding: '18px 20px', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <I.Bookmark size={14} color="var(--blue)" />
              <span className="c-disp" style={{ fontSize: 13, fontWeight: 800 }}>Saved</span>
            </div>
            {N.saved.slice(0, 4).map((t) => (
              <div key={t.id} className="c-mini" onClick={() => N.topics[t.id] && go(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 9, marginLeft: -8, marginRight: -8 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: acc(t.hue), flex: '0 0 auto' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--fnt)', fontWeight: 600 }}>{t.updated}</span>
                {t.unread > 0 && <span className="c-disp" style={{ fontSize: 10, fontWeight: 800, color: '#fff', background: 'var(--blue)', borderRadius: 10, padding: '1px 7px' }}>{t.unread}</span>}
              </div>
            ))}
          </div>

          {/* STAT */}
          <div className="c-tile" style={{ gridColumn: '9 / span 4', gridRow: '3', padding: '18px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <I.Pulse size={15} color="var(--ink)" />
              <span className="c-disp" style={{ fontSize: 13, fontWeight: 800 }}>Today in numbers</span>
            </div>
            <div style={{ display: 'flex', gap: 14 }}>
              {[['47', 'new events'], ['1.2k', 'sources read'], ['9', 'topics live']].map(([n, l]) => (
                <div key={l} style={{ flex: 1 }}>
                  <div className="c-disp" style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>{n}</div>
                  <div style={{ fontSize: 11, color: 'var(--mut)', fontWeight: 600, marginTop: 3 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function DirectionC() {
    const [view, setView] = useState({ name: 'home' });
    return (
      <div className="c-root">
        {view.name === 'home'
          ? <Home go={(id) => setView({ name: 'topic', id })} />
          : <TopicView topic={N.topics[view.id]} onBack={() => setView({ name: 'home' })} />}
      </div>
    );
  }

  window.DirectionC = DirectionC;
})();
