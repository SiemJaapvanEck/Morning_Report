/* Direction A — "DISPATCH"
   Light editorial-data home. Left date-rail · center featured story with a
   horizontal timeline scrubber · right trending/saved. Self-contained. */
(function () {
  const { useState } = React;
  const I = window.Icons;
  const N = window.NEWS;
  const hueColor = (h, l = 0.55, c = 0.15) => `oklch(${l} ${c} ${h})`;

  // component-scoped CSS
  if (!document.getElementById('dir-a-css')) {
    const s = document.createElement('style');
    s.id = 'dir-a-css';
    s.textContent = `
    .a-root{--ink:#16140f;--muted:#6f6a5e;--faint:#a8a294;--line:#e7e2d6;--paper:#f7f4ee;--card:#fff;--blue:oklch(0.48 0.17 256);--blueSoft:oklch(0.95 0.03 256);--red:oklch(0.56 0.19 24);
      position:absolute;inset:0;background:var(--paper);color:var(--ink);font-family:'Archivo',sans-serif;display:flex;flex-direction:column;overflow:hidden;}
    .a-root *{box-sizing:border-box;}
    .a-mono{font-family:'Space Mono',monospace;}
    .a-node{cursor:pointer;transition:transform .15s;}
    .a-node:hover{transform:translateY(-2px);}
    .a-trend{cursor:pointer;transition:background .12s;}
    .a-trend:hover{background:var(--blueSoft);}
    .a-day{cursor:pointer;transition:transform .1s;}
    .a-day:hover{transform:scale(1.18);}
    .a-btn{cursor:pointer;transition:background .15s,transform .1s;}
    .a-btn:hover{transform:translateY(-1px);}
    .a-lead{cursor:pointer;}
    .a-lead:hover .a-leadtitle{color:var(--blue);}
    .a-feedrow{transition:background .12s;}
    .a-feedrow:hover{background:var(--blueSoft);}
    .a-feedrow:hover .a-feedtitle{color:var(--blue);}
    `;
    document.head.appendChild(s);
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

  function Tag({ children, color = 'var(--blue)' }) {
    return <span className="a-mono" style={{ fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', color, border: `1px solid ${color}`, padding: '2px 6px', borderRadius: 2, opacity: 0.9 }}>{children}</span>;
  }

  // ── Mini calendar ───────────────────────────────────────────────
  function MiniCal({ onPick }) {
    const c = N.calendar;
    const cells = [];
    for (let i = 0; i < c.startDow; i++) cells.push(null);
    for (let d = 1; d <= c.activity.length; d++) cells.push(d);
    const maxA = Math.max(...c.activity);
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{c.month} {c.year}</span>
          <span className="a-mono" style={{ fontSize: 10, color: 'var(--faint)' }}>NEWS DENSITY</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="a-mono" style={{ fontSize: 9, textAlign: 'center', color: 'var(--faint)', paddingBottom: 2 }}>{d}</div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const a = c.activity[d - 1];
            const isToday = d === c.today;
            const intensity = a / maxA;
            return (
              <div key={i} className="a-day" onClick={() => onPick && onPick(d)} title={`${a} events`}
                style={{ height: 26, borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative',
                  background: isToday ? 'var(--blue)' : `oklch(0.48 0.17 256 / ${0.06 + intensity * 0.5})`,
                  color: isToday ? '#fff' : 'var(--ink)' }}>
                <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 500, lineHeight: 1 }}>{d}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Horizontal timeline scrubber (home featured) ────────────────
  function Scrubber({ topic, sel, setSel }) {
    const ev = topic.events;
    return (
      <div>
        <div style={{ position: 'relative', height: 64, margin: '8px 4px 0' }}>
          <div style={{ position: 'absolute', top: 31, left: 0, right: 0, height: 2, background: 'var(--line)' }} />
          <div style={{ position: 'absolute', top: 31, left: 0, height: 2, background: 'var(--blue)', width: `${(sel) / (ev.length - 1) * 100}%`, transition: 'width .25s' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between' }}>
            {ev.map((e, i) => (
              <div key={i} className="a-node" onClick={() => setSel(i)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 0 }}>
                <span className="a-mono" style={{ fontSize: 9.5, color: i === sel ? 'var(--blue)' : 'var(--faint)', marginBottom: 8, whiteSpace: 'nowrap', fontWeight: i === sel ? 700 : 400 }}>{e.d}</span>
                <span style={{ width: i === sel ? 16 : 11, height: i === sel ? 16 : 11, borderRadius: '50%', background: i === sel ? 'var(--blue)' : 'var(--card)', border: `2.5px solid ${i === sel ? 'var(--blue)' : (e.now ? 'var(--red)' : 'var(--faint)')}`, transition: 'all .2s', boxShadow: e.now ? '0 0 0 4px oklch(0.56 0.19 24 / 0.18)' : 'none' }} />
              </div>
            ))}
          </div>
        </div>
        <div key={sel} style={{ marginTop: 18, padding: '18px 20px', background: 'var(--card)', borderRadius: 10, border: '1px solid var(--line)', boxShadow: '0 6px 22px rgba(0,0,0,0.05)', animation: 'aFade .25s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Tag color={ev[sel].now ? 'var(--red)' : 'var(--blue)'}>{ev[sel].tag}</Tag>
            <span className="a-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{ev[sel].d}, 2026</span>
            <span style={{ flex: 1 }} />
            <span className="a-mono" style={{ fontSize: 11, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 4 }}><I.Sources size={12} color="var(--faint)" />{ev[sel].sources}</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25, marginBottom: 6 }}>{ev[sel].title}</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}>{ev[sel].desc}</div>
        </div>
      </div>
    );
  }

  // ── Topic detail (full horizontal timeline) ─────────────────────
  function TopicView({ topic, onBack }) {
    const [open, setOpen] = useState(topic.events.length - 1);
    const acc = hueColor(topic.hue);
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '28px 40px 32px', overflow: 'hidden' }}>
        <button className="a-btn" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', font: 'inherit', color: 'var(--muted)', fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 18, alignSelf: 'flex-start', whiteSpace: 'nowrap' }}>
          <span style={{ transform: 'rotate(180deg)', display: 'flex' }}><I.Arrow size={15} color="var(--muted)" /></span> All stories
        </button>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', marginBottom: 28 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Tag color={acc}>{topic.category}</Tag>
              <Tag color="var(--red)">{topic.status}</Tag>
              <span className="a-mono" style={{ fontSize: 11, color: 'var(--faint)' }}>UPDATED {topic.updated.toUpperCase()} · {topic.sources} SOURCES · {spanDays(topic)} DAYS · {topic.events.length} EVENTS</span>
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1, lineHeight: 1.02 }}>{topic.title}</div>
            <div style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.5, maxWidth: 760, marginTop: 10 }}>{topic.summary}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="a-mono" style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 4 }}>{topic.metric.label.toUpperCase()}</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>{topic.metric.value}</div>
            <div style={{ marginTop: 8 }}><Spark data={topic.spark} w={140} h={36} color={acc} /></div>
          </div>
        </div>
        {/* horizontal track */}
        <div style={{ position: 'relative', flex: 1 }}>
          <div style={{ position: 'absolute', top: 22, left: 0, right: 0, height: 3, background: 'var(--line)' }} />
          <div style={{ position: 'absolute', top: 22, left: 0, height: 3, background: acc, width: `${open / (topic.events.length - 1) * 100}%` }} />
          <div style={{ display: 'flex', gap: 14, height: '100%' }}>
            {topic.events.map((e, i) => (
              <div key={i} className="a-node" onClick={() => setOpen(i)} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: 44, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
                  <span style={{ width: i === open ? 18 : 13, height: i === open ? 18 : 13, marginTop: i === open ? 13 : 16, borderRadius: '50%', background: i === open ? acc : 'var(--card)', border: `3px solid ${e.now ? 'var(--red)' : acc}`, transition: 'all .2s' }} />
                </div>
                <div style={{ flex: 1, padding: '14px 14px 16px', borderRadius: 10, background: i === open ? 'var(--card)' : 'transparent', border: i === open ? '1px solid var(--line)' : '1px solid transparent', boxShadow: i === open ? '0 8px 28px rgba(0,0,0,0.07)' : 'none', transition: 'all .2s', opacity: i === open ? 1 : 0.62 }}>
                  <div className="a-mono" style={{ fontSize: 11, fontWeight: 700, color: acc, marginBottom: 8 }}>{e.d}</div>
                  <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.25, marginBottom: 8 }}>{e.title}</div>
                  {i === open && <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, animation: 'aFade .3s' }}>{e.desc}</div>}
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Tag color={e.now ? 'var(--red)' : 'var(--muted)'}>{e.tag}</Tag>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── timeline-length helpers ─────────────────────────────────────
  const parse = (d) => new Date(d + 'T00:00:00');
  const spanDays = (t) => Math.round((parse(t.events[t.events.length - 1].date) - parse(t.events[0].date)) / 86400000);
  const lastDate = (t) => parse(t.events[t.events.length - 1].date).getTime();
  const statusColor = (s) => (s === 'LIVE' ? 'var(--red)' : 'var(--blue)');

  // A single story row: meta + title + a length-proportional mini timeline.
  function FeedRow({ t, maxDays, go }) {
    const acc = hueColor(t.hue);
    const days = spanDays(t);
    const pct = Math.max(0.07, days / maxDays);          // drawn fraction of track
    const f0 = parse(t.events[0].date).getTime();
    const total = parse(t.events[t.events.length - 1].date).getTime() - f0 || 1;
    return (
      <div className="a-feedrow" onClick={() => go(t.id)}
        style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 26, alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--line)', cursor: 'pointer', borderRadius: 8 }}>
        {/* left: story identity */}
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: acc, flex: '0 0 auto' }} />
            <span className="a-mono" style={{ fontSize: 10, letterSpacing: 0.8, color: 'var(--muted)', textTransform: 'uppercase' }}>{t.category}</span>
            <Tag color={statusColor(t.status)}>{t.status}</Tag>
            <span className="a-mono" style={{ fontSize: 10, color: 'var(--faint)' }}>· {t.region}</span>
            <span style={{ flex: 1 }} />
            <span className="a-mono" style={{ fontSize: 10, color: 'var(--faint)' }}>UPD {t.updated.toUpperCase()}</span>
          </div>
          <div className="a-feedtitle" style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.4, lineHeight: 1.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color .15s' }}>{t.title}</div>
        </div>

        {/* right: length-proportional timeline + badge */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 9 }}>
            <span className="a-mono" style={{ fontSize: 10, color: 'var(--faint)' }}>{t.events[0].d}</span>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span className="a-mono" style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>{days}<span style={{ fontSize: 10, color: 'var(--muted)' }}>d</span></span>
              <span className="a-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>· {t.events.length} EVENTS</span>
            </span>
          </div>
          <div style={{ position: 'relative', height: 16 }}>
            {/* full track (faint) */}
            <div style={{ position: 'absolute', top: 7, left: 0, right: 0, height: 2, background: 'var(--line)' }} />
            {/* drawn length, proportional to duration */}
            <div style={{ position: 'absolute', top: 7, left: 0, height: 2, width: `${pct * 100}%`, background: acc, borderRadius: 1 }} />
            {/* event nodes along the drawn length */}
            {t.events.map((e, i) => {
              const x = (parse(e.date).getTime() - f0) / total * pct;
              return <span key={i} style={{ position: 'absolute', top: 8, left: `${x * 100}%`, transform: 'translate(-50%,-50%)', width: e.now ? 9 : 6, height: e.now ? 9 : 6, borderRadius: '50%', background: e.now ? acc : 'var(--card)', border: `1.5px solid ${acc}`, boxShadow: e.now ? `0 0 0 3px ${acc.replace(')', ' / 0.18)')}` : 'none' }} />;
            })}
          </div>
          <div className="a-mono" style={{ fontSize: 10, color: 'var(--faint)', marginTop: 7, textAlign: 'right' }}>→ {t.events[t.events.length - 1].d} · 2026</div>
        </div>
      </div>
    );
  }

  // ── Home (all-news feed) ─────────────────────────────────────────
  function Home({ go }) {
    const [sort, setSort] = useState('latest');
    const [cat, setCat] = useState('All');
    const cats = ['All', ...Array.from(new Set(N.feed.map((t) => t.category)))];
    const maxDays = Math.max(...N.feed.map(spanDays));
    let rows = N.feed.filter((t) => cat === 'All' || t.category === cat);
    rows = rows.slice().sort((a, b) =>
      sort === 'longest' ? spanDays(b) - spanDays(a)
        : sort === 'active' ? b.sources - a.sources
          : lastDate(b) - lastDate(a));

    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* top bar */}
        <header style={{ height: 58, flex: '0 0 auto', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 22, background: 'var(--card)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
            <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}>DISPATCH</span>
            <span className="a-mono" style={{ fontSize: 9.5, color: 'var(--red)', letterSpacing: 1.5 }}>● LIVE</span>
          </div>
          <span className="a-mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>WED · JUNE 10 · 2026</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 20, padding: '8px 14px', width: 280 }}>
            <I.Search size={15} color="var(--faint)" />
            <span style={{ fontSize: 13, color: 'var(--faint)' }}>Search any topic to build a timeline…</span>
          </div>
          <I.Bell size={18} color="var(--muted)" />
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>AR</div>
        </header>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '236px 1fr', overflow: 'hidden' }}>
          {/* left rail */}
          <aside style={{ borderRight: '1px solid var(--line)', padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 22, background: 'var(--card)', overflow: 'hidden' }}>
            <MiniCal />
            <div>
              <div className="a-mono" style={{ fontSize: 10, letterSpacing: 1, color: 'var(--faint)', marginBottom: 10 }}>FILTER BY DESK</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {cats.map((c) => (
                  <button key={c} onClick={() => setCat(c)} className="a-btn"
                    style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Archivo', padding: '6px 11px', borderRadius: 16, cursor: 'pointer',
                      border: `1px solid ${cat === c ? 'var(--blue)' : 'var(--line)'}`, background: cat === c ? 'var(--blue)' : 'var(--card)', color: cat === c ? '#fff' : 'var(--muted)' }}>{c}</button>
                ))}
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                <I.Bookmark size={13} color="var(--blue)" />
                <span className="a-mono" style={{ fontSize: 10, letterSpacing: 1, fontWeight: 700 }}>SAVED</span>
              </div>
              {N.saved.slice(0, 4).map((t) => (
                <div key={t.id} className="a-trend" onClick={() => N.topics[t.id] && go(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 6, marginLeft: -8, marginRight: -8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: hueColor(t.hue), flex: '0 0 auto' }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                  {t.unread > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', background: 'var(--blue)', borderRadius: 10, padding: '1px 7px' }}>{t.unread}</span>}
                </div>
              ))}
            </div>
          </aside>

          {/* center: all-news feed */}
          <main style={{ padding: '12px 30px 6px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 2 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: -0.6, margin: 0 }}>All stories</h1>
                  <span className="a-mono" style={{ fontSize: 12, color: 'var(--muted)' }}>{rows.length} live timelines</span>
                </div>
                <div className="a-mono" style={{ fontSize: 10.5, color: 'var(--faint)', marginTop: 4 }}>BAR LENGTH = TIME SPAN FROM FIRST → LATEST EVENT</div>
              </div>
              <div style={{ display: 'flex', gap: 4, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 9, padding: 3 }}>
                {[['latest', 'Latest'], ['longest', 'Longest'], ['active', 'Most active']].map(([k, lbl]) => (
                  <button key={k} onClick={() => setSort(k)} className="a-btn"
                    style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Archivo', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', border: 'none',
                      background: sort === k ? 'var(--card)' : 'transparent', color: sort === k ? 'var(--ink)' : 'var(--muted)', boxShadow: sort === k ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>{lbl}</button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 2 }}>
              {rows.map((t) => <FeedRow key={t.id} t={t} maxDays={maxDays} go={go} />)}
            </div>
          </main>
        </div>
      </div>
    );
  }

  function DirectionA() {
    const [view, setView] = useState({ name: 'home' });
    return (
      <div className="a-root">
        {view.name === 'home'
          ? <Home go={(id) => setView({ name: 'topic', id })} />
          : <TopicView topic={N.topics[view.id]} onBack={() => setView({ name: 'home' })} />}
      </div>
    );
  }

  window.DirectionA = DirectionA;
})();
