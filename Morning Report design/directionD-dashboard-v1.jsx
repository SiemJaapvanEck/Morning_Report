/* Direction D — "DISPATCH · MORNING REPORT"
   The whiteboard layout rendered in Direction A's editorial-data language.
   Landscape 1440×946 · warm paper · blue/red accents · fully interactive.
   Regions (top→bottom): weather strip (now-card · hourly day timeline · markets
   widget) → Daily Paper lead pill (scrubber) → Tech chart + weather outlook +
   bento news grid. Reuses window.NEWS + window.Icons. Self-contained. */
(function () {
  const { useState } = React;
  const I = window.Icons;
  const N = window.NEWS;
  const hueColor = (h, l = 0.55, c = 0.15) => `oklch(${l} ${c} ${h})`;

  if (!document.getElementById('dir-d-css')) {
    const s = document.createElement('style');
    s.id = 'dir-d-css';
    s.textContent = `
    .d-root{--ink:#16140f;--muted:#6f6a5e;--faint:#a8a294;--line:#e7e2d6;--paper:#f0eee9;--card:#fff;--blue:oklch(0.48 0.17 256);--blueSoft:oklch(0.95 0.03 256);--red:oklch(0.56 0.19 24);--green:oklch(0.55 0.13 150);
      position:absolute;inset:0;background:var(--paper);color:var(--ink);font-family:'Archivo',sans-serif;display:flex;flex-direction:column;overflow:hidden;}
    .d-root *{box-sizing:border-box;}
    .d-mono{font-family:'Space Mono',monospace;}
    .d-card{background:var(--card);border:1px solid var(--line);border-radius:16px;}
    .d-node{cursor:pointer;transition:transform .15s;}
    .d-node:hover{transform:translateY(-2px);}
    .d-chip{cursor:pointer;transition:background .15s,border-color .15s,color .15s,transform .1s;}
    .d-chip:hover{transform:translateY(-1px);}
    .d-btn{cursor:pointer;transition:background .15s,transform .1s,filter .15s;}
    .d-btn:hover{transform:translateY(-1px);}
    .d-feed{cursor:pointer;transition:border-color .15s,box-shadow .15s,transform .15s;}
    .d-feed:hover{border-color:var(--blue);box-shadow:0 12px 30px rgba(0,0,0,0.07);transform:translateY(-2px);}
    .d-feed:hover .d-feedtitle{color:var(--blue);}
    .d-brief{cursor:pointer;border-radius:8px;transition:background .12s;}
    .d-brief:hover{background:var(--blueSoft);}
    .d-brief:hover .d-brieftitle{color:var(--blue);}
    .d-tech{cursor:pointer;transition:border-color .15s,box-shadow .15s;}
    .d-tech:hover{border-color:var(--blue);box-shadow:0 12px 30px rgba(0,0,0,0.06);}
    .d-hour:hover .d-hourdot{transform:scale(1.25);}
    `;
    document.head.appendChild(s);
  }

  // ── tiny primitives ─────────────────────────────────────────────
  function Tag({ children, color = 'var(--blue)', solid }) {
    return <span className="d-mono" style={{ fontSize: 9.5, letterSpacing: 1, textTransform: 'uppercase', color: solid ? '#fff' : color, background: solid ? color : 'transparent', border: `1px solid ${color}`, padding: '2px 6px', borderRadius: 2, whiteSpace: 'nowrap' }}>{children}</span>;
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

  // ── weather icons (simple primitives only) ──────────────────────
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

  // ── mock weather (illustrative) ─────────────────────────────────
  const WX = {
    place: 'AMSTERDAM', now: 18, cond: 'Partly cloudy', icon: 'cloud', feels: 17, hi: 21, lo: 12, humidity: 75, wind: 12, uv: 4,
    hourly: [
      { t: '06', temp: 12, icon: 'cloud' }, { t: '09', temp: 14, icon: 'cloud' },
      { t: '12', temp: 17, icon: 'sun' }, { t: '15', temp: 18, icon: 'sun', now: true },
      { t: '18', temp: 16, icon: 'cloud' }, { t: '21', temp: 13, icon: 'rain' }, { t: '00', temp: 11, icon: 'rain' },
    ],
    outlook: [
      { d: 'THU', icon: 'sun', hi: 22, lo: 13 }, { d: 'FRI', icon: 'cloud', hi: 19, lo: 12 },
      { d: 'SAT', icon: 'rain', hi: 16, lo: 11 }, { d: 'SUN', icon: 'cloud', hi: 18, lo: 10 }, { d: 'MON', icon: 'sun', hi: 23, lo: 14 },
    ],
  };

  const INDEX = [
    { s: 'AEX', v: '912.4', d: 0.6 }, { s: 'S&P', v: '5,610', d: 0.7 },
    { s: 'NDX', v: '20,140', d: 1.3 }, { s: 'BRENT', v: '88.40', d: 3.0 }, { s: 'BTC', v: '71.2k', d: -1.2 },
  ];

  // striped image placeholder
  function Placeholder({ label, h = 60, radius = 8 }) {
    return (
      <div className="d-mono" style={{ height: h, borderRadius: radius, border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, letterSpacing: 1, color: 'var(--faint)', textTransform: 'uppercase',
        background: 'repeating-linear-gradient(135deg, #faf8f3 0 7px, #f1ede4 7px 14px)' }}>{label}</div>
    );
  }

  // ── 1 · weather now card ────────────────────────────────────────
  function WeatherNow() {
    const Ic = WI[WX.icon];
    return (
      <div className="d-card" style={{ width: 268, flex: '0 0 auto', padding: '16px 18px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="d-mono" style={{ fontSize: 10, letterSpacing: 1, color: 'var(--muted)' }}>{WX.place}</span>
          <span className="d-mono" style={{ fontSize: 10, color: 'var(--faint)' }}>08:42</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
          <Ic size={38} />
          <span style={{ fontSize: 46, fontWeight: 800, letterSpacing: -2, lineHeight: 0.9 }}>{WX.now}°</span>
          <div style={{ marginLeft: 'auto', textAlign: 'right', minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>{WX.cond}</div>
            <div className="d-mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, whiteSpace: 'nowrap' }}>H {WX.hi}° · L {WX.lo}°</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 12 }}>
          {[['HUMIDITY', WX.humidity + '%'], ['WIND', WX.wind + ' km/h'], ['UV', WX.uv]].map(([l, v]) => (
            <div key={l} style={{ flex: 1, borderTop: '1px solid var(--line)', paddingTop: 7 }}>
              <div className="d-mono" style={{ fontSize: 8.5, letterSpacing: 0.8, color: 'var(--faint)' }}>{l}</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── 1 · hourly "day" timeline ───────────────────────────────────
  function DayTimeline() {
    const h = WX.hourly, temps = h.map((x) => x.temp);
    const max = Math.max(...temps), min = Math.min(...temps);
    return (
      <div className="d-card" style={{ flex: 1, minWidth: 0, padding: '14px 22px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: -0.2 }}>Today</span>
          <span className="d-mono" style={{ fontSize: 10, color: 'var(--faint)', letterSpacing: 1 }}>HOURLY FORECAST · 24H</span>
          <span style={{ flex: 1 }} />
          <span className="d-mono" style={{ fontSize: 10, color: 'var(--muted)' }}>RANGE {min}°–{max}°</span>
        </div>
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'flex-end' }}>
          {/* baseline */}
          <div style={{ position: 'absolute', left: 6, right: 6, bottom: 26, height: 2, background: 'var(--line)' }} />
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', width: '100%', height: '100%', alignItems: 'flex-end' }}>
            {h.map((x, i) => {
              const t = (x.temp - min) / (max - min || 1);
              const Ic = WI[x.icon];
              return (
                <div key={i} className="d-hour d-node" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                  <Ic size={17} color={x.now ? 'var(--red)' : 'var(--muted)'} />
                  <span style={{ fontSize: 13, fontWeight: 700, margin: '5px 0', color: x.now ? 'var(--red)' : 'var(--ink)' }}>{x.temp}°</span>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', paddingBottom: 21 }}>
                    <span className="d-hourdot" style={{ width: x.now ? 13 : 9, height: x.now ? 13 : 9, borderRadius: '50%', transition: 'transform .15s', background: x.now ? 'var(--red)' : 'var(--card)', border: `2.5px solid ${x.now ? 'var(--red)' : 'var(--blue)'}`, boxShadow: x.now ? '0 0 0 4px oklch(0.56 0.19 24 / 0.16)' : 'none', marginBottom: -5 - t * 30 }} />
                  </div>
                  <span className="d-mono" style={{ fontSize: 10, color: x.now ? 'var(--red)' : 'var(--faint)', fontWeight: x.now ? 700 : 400 }}>{x.now ? 'NOW' : x.t}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── 1 · markets widget (segments + thumbnail) ───────────────────
  function MarketsWidget() {
    return (
      <div className="d-card" style={{ width: 252, flex: '0 0 auto', padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <I.Pulse size={14} color="var(--blue)" />
          <span className="d-mono" style={{ fontSize: 10, letterSpacing: 1, fontWeight: 700 }}>MARKETS</span>
          <span style={{ flex: 1 }} />
          <span className="d-mono" style={{ fontSize: 9, color: 'var(--red)', letterSpacing: 1 }}>● LIVE</span>
        </div>
        <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
          {INDEX.map((x) => (
            <div key={x.s} style={{ flex: 1, minWidth: 0 }}>
              <div className="d-mono" style={{ fontSize: 8.5, color: 'var(--faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{x.s}</div>
              <div style={{ fontSize: 11, fontWeight: 700, marginTop: 1, whiteSpace: 'nowrap' }}>{x.v}</div>
              <div style={{ height: 4, borderRadius: 2, marginTop: 4, background: x.d >= 0 ? 'var(--green)' : 'var(--red)', opacity: 0.85 }} />
              <div className="d-mono" style={{ fontSize: 8.5, marginTop: 3, color: x.d >= 0 ? 'var(--green)' : 'var(--red)' }}>{x.d >= 0 ? '+' : ''}{x.d}%</div>
            </div>
          ))}
        </div>
        <Placeholder label="Index chart · 1D" h={56} />
      </div>
    );
  }

  // ── 2 · Daily Paper scrubber ────────────────────────────────────
  function Scrubber({ topic, sel, setSel }) {
    const ev = topic.events;
    const acc = hueColor(topic.hue);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div style={{ position: 'relative', height: 50, margin: '2px 6px 0', flex: '0 0 auto' }}>
          <div style={{ position: 'absolute', top: 31, left: 0, right: 0, height: 2, background: 'var(--line)' }} />
          <div style={{ position: 'absolute', top: 31, left: 0, height: 2, background: acc, width: `${sel / (ev.length - 1) * 100}%`, transition: 'width .25s' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between' }}>
            {ev.map((e, i) => (
              <div key={i} className="d-node" onClick={() => setSel(i)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 0 }}>
                <span className="d-mono" style={{ fontSize: 9.5, color: i === sel ? acc : 'var(--faint)', marginBottom: 8, whiteSpace: 'nowrap', fontWeight: i === sel ? 700 : 400 }}>{e.d}</span>
                <span style={{ width: i === sel ? 16 : 11, height: i === sel ? 16 : 11, borderRadius: '50%', background: i === sel ? acc : 'var(--card)', border: `2.5px solid ${i === sel ? acc : (e.now ? 'var(--red)' : 'var(--faint)')}`, transition: 'all .2s', boxShadow: e.now ? '0 0 0 4px oklch(0.56 0.19 24 / 0.18)' : 'none' }} />
              </div>
            ))}
          </div>
        </div>
        <div key={sel} style={{ marginTop: 14, padding: '16px 20px', background: 'var(--paper)', borderRadius: 12, border: '1px solid var(--line)', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', animation: 'aFade .25s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Tag color={ev[sel].now ? 'var(--red)' : acc}>{ev[sel].tag}</Tag>
            <span className="d-mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{ev[sel].d}, 2026</span>
            <span style={{ flex: 1 }} />
            <span className="d-mono" style={{ fontSize: 11, color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 4 }}><I.Sources size={12} color="var(--faint)" />{ev[sel].sources} sources</span>
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.4, lineHeight: 1.2, marginBottom: 7 }}>{ev[sel].title}</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.55 }}>{ev[sel].desc}</div>
        </div>
      </div>
    );
  }

  // one-line article descriptions, shared by the briefing digest + wire cards
  const BRIEF = {
    iran: 'A renewed mediation proposal lands as Brent crude rises 3% on supply-route fears.',
    nvidia: 'Shares set a record $184 as supply eases and datacenter demand stays red-hot.',
    ukraine: 'New air defenses blunt overnight strikes as analysts revise the summer forecast.',
    opec: 'A surprise deeper output cut tightens the supply balance heading into summer.',
    fed: 'A softer jobs report nudges the odds toward a rate hold in July.',
    euai: 'Regulators propose the first fines over transparency and training-data gaps.',
    starship: 'Hardware is stacked and cleared — the launch window opens this week.',
    tsmc: 'New licensing curbs on advanced chips take effect, reshaping supply chains.',
    primaries: 'Both fields settle on presumptive nominees ahead of the conventions.',
  };

  function DailyPaper({ go }) {
    const top = ['iran', 'nvidia', 'ukraine', 'opec', 'fed'].map((id) => N.topics[id]);
    return (
      <div className="d-card" style={{ flex: '0 0 auto', height: 296, padding: '18px 24px 18px', display: 'flex', flexDirection: 'column', borderRadius: 22, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flex: '0 0 auto' }}>
          <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: 0.3 }}>THE DAILY PAPER</span>
          <span className="d-mono" style={{ fontSize: 10.5, color: 'var(--faint)', letterSpacing: 1 }}>TODAY'S BRIEFING · WED JUN 10</span>
          <span style={{ flex: 1 }} />
          <span className="d-mono" style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: 0.5 }}>{N.feed.length} STORIES · 5 DESKS · UPDATED 08:42</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 28, flex: 1, minHeight: 0 }}>
          {/* editorial intro — the day in summary */}
          <div style={{ display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--line)', paddingRight: 28 }}>
            <span className="d-mono" style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--red)', marginBottom: 8 }}>● THE MORNING BRIEFING</span>
            <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1.05 }}>Diplomacy races the markets</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginTop: 10 }}>A fresh Iran–Israel mediation push lands as Brent crude climbs and Nvidia prints a record high. New interceptors are reshaping the front in Kyiv; a softer US jobs print pulls a July rate cut off the table.</div>
            <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 16, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
              {[['47', 'new events'], ['9', 'live topics'], ['1.2k', 'sources']].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>{n}</div>
                  <div className="d-mono" style={{ fontSize: 9, color: 'var(--faint)', letterSpacing: 0.5, textTransform: 'uppercase' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          {/* top stories digest */}
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="d-mono" style={{ fontSize: 10, letterSpacing: 1.5, color: 'var(--faint)', marginBottom: 4, flex: '0 0 auto' }}>TOP STORIES TODAY</div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {top.map((t, i) => (
                <div key={t.id} className="d-brief" onClick={() => go(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '0 8px', marginLeft: -8, marginRight: -8, borderTop: i ? '1px solid var(--line)' : 'none', flex: 1, minHeight: 0 }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: hueColor(t.hue), flex: '0 0 auto' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <span className="d-brieftitle" style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', transition: 'color .12s' }}>{t.title}</span>
                      <Tag color={statusColor(t.status)}>{t.status}</Tag>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.3, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{BRIEF[t.id]}</div>
                  </div>
                  <span className="d-mono" style={{ fontSize: 10, color: 'var(--faint)', flex: '0 0 auto' }}>{t.sources} src</span>
                  <I.Chevron size={15} color="var(--faint)" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 3 · Tech intraday chart card ────────────────────────────────
  const NV = N.topics.nvidia;
  const intraday = [176.1, 177.4, 176.8, 178.9, 178.2, 180.5, 179.6, 181.7, 181.1, 182.8, 183.4, 184.2];
  const intraTimes = ['09:30', '11:00', '12:30', '14:00', '15:30', '16:00'];

  function TechChart({ go }) {
    const w = 332, h = 132;
    const data = intraday;
    const max = Math.max(...data), min = Math.min(...data);
    const pts = data.map((v, i) => [i / (data.length - 1) * w, h - ((v - min) / (max - min || 1)) * (h - 14) - 8]);
    const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const last = pts[pts.length - 1];
    const up = NV.delta >= 0;
    return (
      <div className="d-card d-tech" onClick={() => go('nvidia')} style={{ flex: 1, minHeight: 0, padding: '16px 18px 14px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span className="d-mono" style={{ fontSize: 10, letterSpacing: 1.2, color: 'var(--green)', fontWeight: 700 }}>TECH</span>
              <span className="d-mono" style={{ fontSize: 10, color: 'var(--faint)' }}>· NASDAQ</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.4, lineHeight: 1.05 }}>Nvidia</div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>AI supercycle</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>${NV.price}</div>
            <div className="d-mono" style={{ fontSize: 12, fontWeight: 700, color: up ? 'var(--green)' : 'var(--red)' }}>{up ? '▲' : '▼'} {Math.abs(NV.delta)}%</div>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0, marginTop: 10, position: 'relative' }}>
          <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', width: '100%', height: '100%', overflow: 'visible' }}>
            {[0.25, 0.5, 0.75].map((g) => <line key={g} x1="0" x2={w} y1={h * g} y2={h * g} stroke="var(--line)" strokeWidth="1" strokeDasharray="2 4" />)}
            <path d={`${line} L${w} ${h} L0 ${h} Z`} fill="var(--green)" opacity="0.09" />
            <path d={line} fill="none" stroke="var(--green)" strokeWidth="2.2" strokeLinejoin="round" />
            <circle cx={last[0]} cy={last[1]} r="4.5" fill="var(--red)" stroke="#fff" strokeWidth="1.5" />
            <circle cx={last[0]} cy={last[1]} r="9" fill="none" stroke="var(--red)" strokeWidth="1.5" opacity="0.4" />
          </svg>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          {intraTimes.map((t) => <span key={t} className="d-mono" style={{ fontSize: 9.5, color: 'var(--faint)' }}>{t}</span>)}
        </div>
      </div>
    );
  }

  // ── 3 · weather outlook panel ("Weer") ──────────────────────────
  function Outlook() {
    return (
      <div className="d-card" style={{ flex: '0 0 auto', height: 116, padding: '12px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          <Cloud size={14} color="var(--muted)" />
          <span className="d-mono" style={{ fontSize: 10, letterSpacing: 1, fontWeight: 700 }}>5-DAY OUTLOOK</span>
        </div>
        <div style={{ display: 'flex', flex: 1 }}>
          {WX.outlook.map((d, i) => {
            const Ic = WI[d.icon];
            return (
              <div key={d.d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, borderLeft: i ? '1px solid var(--line)' : 'none' }}>
                <span className="d-mono" style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700 }}>{d.d}</span>
                <Ic size={19} color="var(--muted)" />
                <div style={{ fontSize: 12, fontWeight: 700 }}>{d.hi}°<span style={{ color: 'var(--faint)', fontWeight: 400 }}> {d.lo}°</span></div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── 3 · bento news grid ─────────────────────────────────────────
  function FeedCard({ t, maxDays, go }) {
    const acc = hueColor(t.hue);
    const days = spanDays(t);
    const pct = Math.max(0.08, days / maxDays);
    const f0 = parse(t.events[0].date).getTime();
    const total = parse(t.events[t.events.length - 1].date).getTime() - f0 || 1;
    return (
      <div className="d-card d-feed" onClick={() => go(t.id)} style={{ padding: '15px 16px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: acc, flex: '0 0 auto' }} />
          <span className="d-mono" style={{ fontSize: 9.5, letterSpacing: 0.6, color: 'var(--muted)', textTransform: 'uppercase' }}>{t.category}</span>
          <Tag color={statusColor(t.status)}>{t.status}</Tag>
          <span style={{ flex: 1 }} />
          <span className="d-mono" style={{ fontSize: 9.5, color: 'var(--faint)' }}>UPD {t.updated.toUpperCase()}</span>
        </div>
        <div className="d-feedtitle" style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.15, transition: 'color .15s', marginBottom: 6 }}>{t.title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.4, marginBottom: 'auto', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{BRIEF[t.id]}</div>
        <div style={{ position: 'relative', height: 14, marginTop: 12 }}>
          <div style={{ position: 'absolute', top: 6, left: 0, right: 0, height: 2, background: 'var(--line)' }} />
          <div style={{ position: 'absolute', top: 6, left: 0, height: 2, width: `${pct * 100}%`, background: acc, borderRadius: 1 }} />
          {t.events.map((e, i) => {
            const x = (parse(e.date).getTime() - f0) / total * pct;
            return <span key={i} style={{ position: 'absolute', top: 7, left: `${x * 100}%`, transform: 'translate(-50%,-50%)', width: e.now ? 9 : 6, height: e.now ? 9 : 6, borderRadius: '50%', background: e.now ? acc : 'var(--card)', border: `1.5px solid ${acc}`, boxShadow: e.now ? `0 0 0 3px ${acc.replace(')', ' / 0.18)')}` : 'none' }} />;
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }}>
          <span className="d-mono" style={{ fontSize: 10, color: 'var(--faint)' }}>{days}d · {t.events.length} events · {t.sources} sources</span>
          <span className="d-mono" style={{ fontSize: 11, fontWeight: 700, color: t.delta >= 0 ? 'var(--green)' : 'var(--red)' }}>{t.delta >= 0 ? '+' : ''}{t.delta}</span>
        </div>
      </div>
    );
  }

  function Bento({ go }) {
    const cards = [N.topics.opec, N.topics.euai, N.topics.starship, N.topics.fed];
    const maxDays = Math.max(...cards.map(spanDays));
    return (
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 11 }}>
          <I.Globe size={15} color="var(--ink)" />
          <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: -0.2 }}>On the wire</span>
          <span className="d-mono" style={{ fontSize: 10, color: 'var(--faint)' }}>· {N.feed.length} LIVE TIMELINES</span>
          <span style={{ flex: 1 }} />
          <span className="d-mono d-btn" style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 700 }}>VIEW ALL →</span>
        </div>
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 14 }}>
          {cards.map((t) => <FeedCard key={t.id} t={t} maxDays={maxDays} go={go} />)}
        </div>
      </div>
    );
  }

  // ── Header ──────────────────────────────────────────────────────
  function Header() {
    return (
      <header style={{ height: 56, flex: '0 0 auto', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 22, background: 'var(--card)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
          <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>DISPATCH</span>
          <span className="d-mono" style={{ fontSize: 9.5, color: 'var(--red)', letterSpacing: 1.5 }}>● MORNING REPORT</span>
        </div>
        <span className="d-mono" style={{ fontSize: 11.5, color: 'var(--muted)' }}>WED · JUNE 10 · 2026 · 08:42</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 20, padding: '8px 14px', width: 300 }}>
          <I.Search size={15} color="var(--faint)" />
          <span style={{ fontSize: 13, color: 'var(--faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Search any topic to build a timeline…</span>
        </div>
        <I.Bell size={18} color="var(--muted)" />
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>AR</div>
      </header>
    );
  }

  // ── Topic detail (full horizontal timeline) ─────────────────────
  function TopicView({ topic, onBack }) {
    const [open, setOpen] = useState(topic.events.length - 1);
    const acc = hueColor(topic.hue);
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: '26px 40px 30px', overflow: 'hidden', background: 'var(--paper)' }}>
        <button className="d-btn" onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 20, font: 'inherit', color: 'var(--muted)', fontSize: 13, fontWeight: 600, padding: '8px 14px', marginBottom: 18, alignSelf: 'flex-start', whiteSpace: 'nowrap', fontFamily: 'Archivo' }}>
          <span style={{ transform: 'rotate(180deg)', display: 'flex' }}><I.Arrow size={15} color="var(--muted)" /></span> Back to morning report
        </button>
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end', marginBottom: 26 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Tag color={acc}>{topic.category}</Tag>
              <Tag color="var(--red)">{topic.status}</Tag>
              <span className="d-mono" style={{ fontSize: 11, color: 'var(--faint)' }}>UPDATED {topic.updated.toUpperCase()} · {topic.sources} SOURCES · {spanDays(topic)} DAYS · {topic.events.length} EVENTS</span>
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1, lineHeight: 1.02 }}>{topic.title}</div>
            <div style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.5, maxWidth: 760, marginTop: 10 }}>{topic.summary}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="d-mono" style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 4 }}>{topic.metric.label.toUpperCase()}</div>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>{topic.metric.value}</div>
            <div style={{ marginTop: 8 }}><Spark data={topic.spark} w={140} h={36} color={acc} /></div>
          </div>
        </div>
        <div style={{ position: 'relative', flex: 1 }}>
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
    );
  }

  // ── Home ────────────────────────────────────────────────────────
  function Home({ go }) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Header />
        <div style={{ flex: 1, minHeight: 0, padding: '18px 28px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* weather strip */}
          <div style={{ height: 148, flex: '0 0 auto', display: 'flex', gap: 16 }}>
            <WeatherNow />
            <DayTimeline />
            <MarketsWidget />
          </div>
          {/* daily paper */}
          <DailyPaper go={go} />
          {/* bottom */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: 16 }}>
            <div style={{ width: 372, flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <TechChart go={go} />
              <Outlook />
            </div>
            <Bento go={go} />
          </div>
        </div>
      </div>
    );
  }

  function DirectionD() {
    const [view, setView] = useState({ name: 'home' });
    return (
      <div className="d-root">
        {view.name === 'home'
          ? <Home go={(id) => setView({ name: 'topic', id })} />
          : <TopicView topic={N.topics[view.id]} onBack={() => setView({ name: 'home' })} />}
      </div>
    );
  }

  window.DirectionD = DirectionD;
})();
