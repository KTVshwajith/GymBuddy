import React, { useEffect, useMemo, useRef, useState } from 'react';
import { THEMES, GOALS, PLANS, EQUIPMENT, LEVELS, FEEDBACK, SEED, CLIENTS, TORSO_LIMIT, buildReport, fmtTime, todayLabel } from './data.js';
import { loadState, saveState, clearState, putClip, getClip, deleteClip, clearClips } from './storage.js';
import { DemoSkeleton, LiveCamera } from './LiveViews.jsx';
import { analyzeVideoFile } from './pose.js';

const DEFAULTS = { onboarded: false, role: 'self', goal: 'arms', place: 'home', equip: ['Dumbbells'], level: 'Intermediate', theme: 'volt', fb: 'Coach cues', recs: [], injury: [] };
const GOOD_CUES = ['Good rep — full extension at the bottom', 'Smooth. Two seconds on the way down', 'Elbows quiet, nice control', 'Clean rep'];
const START_CUE = 'Step into frame — side-on, full body visible';
const isPoseEx = (name) => /curl/i.test(name);

export default function App() {
  const [p, setP] = useState(() => ({ ...DEFAULTS, ...(loadState() || {}) }));
  const set = (patch) => setP((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }));
  useEffect(() => saveState(p), [p]);

  const [screen, setScreen] = useState(() => (p.onboarded ? (p.role === 'pro' ? 'clients' : 'today') : 'welcome'));
  const [ui, setUi] = useState({ exIdx: 0, report: null, reportFrom: 'live', clientId: null });
  const go = (s, extra) => { if (extra) setUi((u) => ({ ...u, ...extra })); setScreen(s); window.scrollTo(0, 0); };

  const T = THEMES[p.theme] || THEMES.volt;
  useEffect(() => {
    document.body.style.background = screen === 'live' ? '#000' : T.bg;
    const m = document.querySelector('meta[name=theme-color]');
    if (m) m.setAttribute('content', screen === 'live' ? '#000000' : T.bg);
  }, [T, screen]);

  const pro = p.role === 'pro';
  const items = PLANS[p.goal][p.place];
  const allRecs = [...p.recs, ...SEED];
  const vars = {
    '--bg': T.bg, '--surf': T.surf, '--text': T.text, '--muted': T.muted, '--line': T.line, '--accent': T.accent, '--on-accent': T.onAccent,
    '--good': T.good, '--bad': T.bad, '--warn': T.warn, '--display': T.display, '--body': T.body, '--label': T.label,
    '--dw': T.dw, '--upper': T.upper, '--h1': T.h1, '--r': T.r, '--rL': T.rL, '--pill': T.pill,
  };

  const openReport = (r, from) => go('report', { report: r, reportFrom: from });

  const finishSet = async (repLog, secs, clipBlob) => {
    const ex = items[ui.exIdx] || items[0];
    const id = 'r' + Date.now();
    let hasClip = false;
    if (clipBlob) { await putClip(id, clipBlob); hasClip = true; }
    const rec = { id, title: ex[0], date: todayLabel(), duration: fmtTime(secs), reps: repLog, source: 'live', hasClip, ts: Date.now() };
    if (repLog.length) set((s) => ({ recs: [rec, ...s.recs] }));
    openReport(rec, 'live');
  };

  const tabs = pro ? [['clients', 'Clients'], ['recordings', 'Recordings'], ['me', 'Me']] : [['today', 'Today'], ['recordings', 'Recordings'], ['me', 'Me']];
  const activeTab = screen === 'client' ? 'clients'
    : screen === 'report' ? (ui.reportFrom === 'client' ? 'clients' : ui.reportFrom === 'live' ? (pro ? 'clients' : 'today') : 'recordings')
    : screen;
  const showTabs = ['today', 'report', 'recordings', 'clients', 'client', 'me'].includes(screen);

  let body;
  if (screen === 'welcome') body = <Welcome p={p} set={set} onNext={() => (pro ? (set({ onboarded: true }), go('clients')) : go('goal'))} />;
  else if (screen === 'goal') body = <Goal p={p} set={set} onNext={() => go('setup')} />;
  else if (screen === 'setup') body = <Setup p={p} set={set} onBack={() => go('goal')} onNext={() => { set({ onboarded: true }); go('today'); }} />;
  else if (screen === 'today') body = <Today p={p} items={items} recs={p.recs} onStart={(i) => go('live', { exIdx: i })} />;
  else if (screen === 'live') body = <Live T={T} p={p} ex={items[ui.exIdx] || items[0]} onExit={() => go(pro ? 'clients' : 'today')} onFinish={finishSet} />;
  else if (screen === 'report') {
    const from = ui.reportFrom, cl = CLIENTS.find((c) => c.id === ui.clientId);
    body = <Report T={T} r={ui.report || SEED[0]} pro={pro} p={p} set={set}
      backLabel={from === 'client' ? (cl?.name || 'Client').toUpperCase() : from === 'live' ? (pro ? 'CLIENTS' : 'TODAY') : 'RECORDINGS'}
      onBack={() => go(from === 'client' ? 'client' : from === 'live' ? (pro ? 'clients' : 'today') : 'recordings')}
      onDelete={(r) => { deleteClip(r.id); set((s) => ({ recs: s.recs.filter((x) => x.id !== r.id) })); go('recordings'); }} />;
  }
  else if (screen === 'recordings') body = <Recordings T={T} recs={allRecs} onOpen={(r) => openReport(r, 'recordings')}
    onImported={(rec) => { set((s) => ({ recs: [rec, ...s.recs] })); openReport(rec, 'recordings'); }} />;
  else if (screen === 'clients') body = <Clients T={T} onOpen={(c) => go('client', { clientId: c.id })} />;
  else if (screen === 'client') body = <Client T={T} c={CLIENTS.find((c) => c.id === ui.clientId) || CLIENTS[0]} onBack={() => go('clients')} onOpen={(r) => openReport(r, 'client')} />;
  else if (screen === 'me') body = <Me p={p} set={set} onRedo={() => go('goal')} onReset={async () => { clearState(); await clearClips(); setP({ ...DEFAULTS }); go('welcome'); }} />;

  return (
    <div className={'app' + (screen === 'live' ? ' is-live' : '')} style={vars} data-theme={p.theme}>
      <main className={screen === 'live' ? 'live-main' : 'main'}>{body}</main>
      {showTabs && (
        <nav className="tabs">
          {tabs.map(([id, label]) => (
            <button key={id} className={'tab' + (activeTab === id ? ' on' : '')} onClick={() => go(id)}>{label}</button>
          ))}
        </nav>
      )}
    </div>
  );
}

/* ------------------------------ small pieces ------------------------------ */
const Pick = ({ on, label, sub, onClick }) => (
  <button className={'pick' + (on ? ' on' : '')} onClick={onClick}>
    <span className="pick-label">{label}</span>{sub && <span className="pick-sub">{sub}</span>}
  </button>
);
const Seg = ({ options, value, onChange }) => (
  <div className="seg">{options.map((o) => <button key={o} className={value === o ? 'on' : ''} onClick={() => onChange(o)}>{o}</button>)}</div>
);
const ThemePicker = ({ value, onChange, showSub }) => (
  <div className="themes">
    {Object.entries(THEMES).map(([k, t]) => (
      <button key={k} className={'theme' + (value === k ? ' on' : '')} onClick={() => onChange(k)} style={{ background: t.bg, color: t.text }}>
        <span className="swatch" style={{ background: t.accent }} />
        <span className="theme-name" style={{ fontFamily: t.display }}>{t.name}</span>
        {showSub && <span className="theme-sub">{t.sub}</span>}
        {value === k && <span className="theme-on">ON</span>}
      </button>
    ))}
  </div>
);
const Eyebrow = ({ children }) => <div className="eyebrow">{children}</div>;

/* ------------------------------- onboarding ------------------------------- */
function Welcome({ p, set, onNext }) {
  return (
    <div className="screen welcome">
      <div className="hero">
        <svg viewBox="0 0 200 220" className="hero-skel" aria-hidden="true">
          <g stroke="var(--text)" strokeOpacity=".55" strokeWidth="4" strokeLinecap="round" fill="none">
            <circle cx="100" cy="34" r="16" /><path d="M100 52v70M100 122l-22 58M100 122l22 58" />
          </g>
          <g stroke="var(--accent)" strokeWidth="5" strokeLinecap="round" fill="none"><path d="M100 64l-6 46 30-30" /></g>
          <line x1="100" y1="122" x2="100" y2="20" stroke="var(--text)" strokeOpacity=".3" strokeDasharray="4 4" />
          {[[100, 64], [94, 110], [124, 80], [100, 122], [78, 180], [122, 180]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" fill="var(--bg)" stroke="var(--accent)" strokeWidth="2.5" />)}
        </svg>
        <span className="badge">● 33 LANDMARKS TRACKED</span>
      </div>
      <h1 className="title-xl">GymBuddy</h1>
      <p className="lede">Tell us your goal. Train at home or in the gym. Your camera checks every rep.</p>
      <div className="stack">
        <Pick on={p.role === 'self'} label="I train myself" sub="Plans, live form check, progress" onClick={() => set({ role: 'self' })} />
        <Pick on={p.role === 'pro'} label="I coach, treat or run a gym" sub="Trainers, physios, studios: review recordings" onClick={() => set({ role: 'pro' })} />
      </div>
      <button className="cta" onClick={onNext}>Continue</button>
    </div>
  );
}

function Goal({ p, set, onNext }) {
  return (
    <div className="screen">
      <Eyebrow>STEP 1 OF 2</Eyebrow>
      <h1 className="h1">What do you want to change?</h1>
      <div className="stack">{GOALS.map((g) => <Pick key={g.id} on={p.goal === g.id} label={g.label} sub={g.sub} onClick={() => set({ goal: g.id })} />)}</div>
      <button className="cta" onClick={onNext}>Next</button>
    </div>
  );
}

function Setup({ p, set, onBack, onNext }) {
  return (
    <div className="screen">
      <button className="eyebrow link" onClick={onBack}>← STEP 2 OF 2</button>
      <h1 className="h1">Where do you train?</h1>
      <div className="grid2">
        <Pick on={p.place === 'home'} label="Home" sub="Bodyweight + kit" onClick={() => set({ place: 'home' })} />
        <Pick on={p.place === 'gym'} label="Gym" sub="Full equipment" onClick={() => set({ place: 'gym' })} />
      </div>
      <h3 className="h3">Equipment you have</h3>
      <div className="chips">
        {EQUIPMENT.map((e) => (
          <button key={e} className={'chip' + (p.equip.includes(e) ? ' on' : '')}
            onClick={() => set((s) => ({ equip: s.equip.includes(e) ? s.equip.filter((x) => x !== e) : [...s.equip, e] }))}>{e}</button>
        ))}
      </div>
      <h3 className="h3">Experience</h3>
      <Seg options={LEVELS} value={p.level} onChange={(level) => set({ level })} />
      <h3 className="h3">Pick your look</h3>
      <ThemePicker value={p.theme} onChange={(theme) => set({ theme })} />
      <button className="cta" onClick={onNext}>Build my plan</button>
    </div>
  );
}

/* ---------------------------------- today --------------------------------- */
function Today({ p, items, recs, onStart }) {
  const now = new Date();
  const dateLbl = now.toLocaleDateString('en-NZ', { weekday: 'short' }).toUpperCase() + ' · ' + now.toLocaleDateString('en-NZ', { month: 'short', day: 'numeric' }).toUpperCase();
  const dow = (now.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(now); monday.setHours(0, 0, 0, 0); monday.setDate(now.getDate() - dow);
  const doneDays = new Set(recs.filter((r) => r.ts && r.ts >= monday.getTime()).map((r) => (new Date(r.ts).getDay() + 6) % 7));
  const goal = GOALS.find((g) => g.id === p.goal);
  return (
    <div className="screen">
      <Eyebrow>{dateLbl}</Eyebrow>
      <h1 className="title-xl sm">{PLANS[p.goal].title}</h1>
      <span className="goal-chip">{goal.label} · {p.place === 'home' ? 'Home' : 'Gym'}</span>
      <div className="week">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((l, i) => (
          <div key={i} className={'day' + (i === dow ? ' today' : '')}>
            <span>{l}</span><i className={doneDays.has(i) ? 'done' : i === dow ? 'now' : ''} />
          </div>
        ))}
      </div>
      <div className="tip"><b>Camera setup:</b> lean your phone 2 m away at hip height, side-on, whole body in frame.</div>
      <div className="row-between meta-row"><span>{items.length} exercises</span><span>~{items.length * 7} MIN</span></div>
      <div className="list">
        {items.map((x, i) => (
          <button key={i} className="ex-row" onClick={() => onStart(i)}>
            <span className="ex-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="ex-main"><span className="ex-name">{x[0]}</span><span className="ex-sub">{x[1]} · {x[2]}</span></span>
            {isPoseEx(x[0]) && <span className="pose-tag">POSE</span>}
          </button>
        ))}
      </div>
      <button className="cta" onClick={() => onStart(Math.max(0, items.findIndex((x) => isPoseEx(x[0]))))}>Start workout</button>
    </div>
  );
}

/* ---------------------------------- live ---------------------------------- */
function Live({ T, p, ex, onExit, onFinish }) {
  const [cam, setCam] = useState('real');
  const [facing, setFacing] = useState('user');
  const [key, setKey] = useState(0);
  const [repLog, setRepLog] = useState([]);
  const [paused, setPaused] = useState(false);
  const [secs, setSecs] = useState(0);
  const [cue, setCue] = useState(START_CUE);
  const [lastBad, setLastBad] = useState(false);
  const [busy, setBusy] = useState(false);
  const camRef = useRef();
  const target = parseInt((ex[1].match(/× (\d+)/) || [0, 12])[1], 10) || 12;
  const colors = { good: T.good, bad: T.bad };
  const dataMode = p.fb === 'Data';

  useEffect(() => { const iv = setInterval(() => !paused && setSecs((s) => s + 1), 1000); return () => clearInterval(iv); }, [paused]);
  useEffect(() => { if (repLog.length && 'vibrate' in navigator) try { navigator.vibrate(lastBad ? [60, 60, 60] : 40); } catch { /* ignore */ } }, [repLog.length]);

  const countRef = useRef(0);
  const onRep = (d) => {
    const n = ++countRef.current;
    setLastBad(d.bad);
    setCue(d.bad ? (d.torso > TORSO_LIMIT ? `Torso swinging ${d.torso}° — brace and drop the weight` : 'Elbow drifting forward — pin it to your side') : GOOD_CUES[n % GOOD_CUES.length]);
    setRepLog((log) => [...log, { n, rom: Math.max(d.rom, 40), bad: d.bad, torso: d.torso }]);
  };
  const restart = (patch) => { countRef.current = 0; setRepLog([]); setLastBad(false); setSecs(0); setCue(START_CUE); setKey((k) => k + 1); patch && patch(); };
  const finish = async () => {
    if (busy) return; setBusy(true);
    const clip = cam === 'real' && camRef.current ? await camRef.current.stop() : null;
    onFinish(repLog, secs, clip);
  };

  const reps = repLog.length, bad = repLog.filter((r) => r.bad).length;
  const score = reps ? Math.round((100 * (reps - bad)) / reps) + '%' : '—';
  const formWord = !reps ? 'Get set' : lastBad ? 'Fix form' : 'Clean';
  return (
    <div className="live">
      <div className="live-stage">
        {cam === 'real'
          ? <LiveCamera key={'c' + key + facing} ref={camRef} paused={paused} dataMode={dataMode} colors={colors} onRep={onRep} facing={facing} />
          : <DemoSkeleton key={'d' + key} paused={paused} dataMode={dataMode} colors={colors} onRep={onRep} />}
      </div>
      <div className="live-top">
        <button className="icon-btn" onClick={onExit} aria-label="Close">×</button>
        <div className="live-title"><div className="live-ex">{ex[0]}</div><div className="live-set">Set 1 of 3 · {ex[1]}</div></div>
        <div className="rec"><i style={{ background: paused ? '#8b8882' : 'oklch(0.65 0.2 25)' }} />{fmtTime(secs)}</div>
      </div>
      <div className="live-modes">
        {[['real', 'My camera'], ['demo', 'Demo']].map(([k, l]) => (
          <button key={k} className={cam === k ? 'on' : ''} onClick={() => restart(() => setCam(k))}>{l}</button>
        ))}
        {cam === 'real' && <button onClick={() => restart(() => setFacing((f) => (f === 'user' ? 'environment' : 'user')))}>Flip ⟲</button>}
      </div>
      {!isPoseEx(ex[0]) && <div className="live-note">Form rules are tuned for curls. Rep count may be off for this exercise.</div>}
      <div className="live-bottom">
        <div className="live-count"><span className="big">{reps}</span><span className="of">OF {target} REPS</span></div>
        {p.fb !== 'Minimal' && <div className="cue" style={{ color: !reps ? '#c9c6bf' : lastBad ? T.bad : T.good === '#f5f3ef' ? '#f5f3ef' : T.good }}>{cue}</div>}
        <div className="live-actions">
          <div className="form-pill" style={{ background: !reps ? 'rgba(255,255,255,.12)' : lastBad ? T.bad : T.good, color: !reps ? '#f5f3ef' : lastBad ? T.onAccent : '#0a0a0a' }}>
            <small>FORM · {score} CLEAN</small><b>{formWord}</b>
          </div>
          <button className="live-btn" onClick={() => setPaused((v) => !v)}>{paused ? 'GO' : 'PAUSE'}</button>
          <button className="live-btn stop" onClick={finish} disabled={busy}>{busy ? '…' : 'STOP'}</button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- report --------------------------------- */
function Report({ T, r, pro, p, set, backLabel, onBack, onDelete }) {
  const b = useMemo(() => buildReport(r, T), [r, T]);
  const [clipUrl, setClipUrl] = useState(null);
  const [shared, setShared] = useState('');
  useEffect(() => {
    let url;
    if (r.hasClip) getClip(r.id).then((blob) => { if (blob) { url = URL.createObjectURL(blob); setClipUrl(url); } });
    return () => url && URL.revokeObjectURL(url);
  }, [r.id]);
  const inInjury = p.injury.includes(r.id);
  const empty = !r.reps.length;

  const share = async () => {
    const text = `GymBuddy · ${r.title} · ${r.date}\nForm score ${b.score} · ${b.total} reps · elbow ROM ${b.rom}° · torso max ${b.torsoMax}°\n${b.riskTitle}: ${b.riskBody}` + (b.flags.length ? '\nFlags: ' + b.flags.map((f) => f.t).join(', ') : '');
    try {
      if (r.hasClip && navigator.canShare) {
        const blob = await getClip(r.id);
        const file = blob && new File([blob], `gymbuddy-${r.id}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`, { type: blob.type });
        if (file && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text, title: 'GymBuddy session' }); setShared('Sent ✓'); return; }
      }
      if (navigator.share) { await navigator.share({ text, title: 'GymBuddy session' }); setShared('Sent ✓'); return; }
      await navigator.clipboard.writeText(text); setShared('Copied ✓');
    } catch { /* user cancelled */ }
  };

  return (
    <div className="screen">
      <button className="eyebrow link" onClick={onBack}>← {backLabel}</button>
      <div className="report-head">
        <div><Eyebrow>{(r.date + ' · SET 1').toUpperCase()}</Eyebrow><h1 className="h1 tight">{r.title}</h1></div>
        {!empty && <div className="score" style={{ color: b.scoreColor }}><b>{b.score}</b><small>Form score</small></div>}
      </div>
      {empty ? (
        <div className="card"><b>No reps counted.</b><p className="muted">Stand side-on, about 2 m from the phone, with your whole body in frame. The counter needs the elbow to bend under 70° and straighten past 140°.</p></div>
      ) : (<>
        <div className="clip">
          {clipUrl ? <video src={clipUrl} controls playsInline /> : <div className="clip-ph"><span>{r.source === 'video' ? 'analysed video' : 'sample session · no clip'}</span><span className="mono">{r.duration}</span></div>}
          <div className="markers">{b.bad.map((x) => <i key={x.n} style={{ left: ((x.n - 0.5) / b.total) * 100 + '%' }} />)}</div>
        </div>
        <div className="blocks">{r.reps.slice(0, 20).map((x) => <span key={x.n} className={x.bad ? 'bad' : ''}>{x.n}</span>)}</div>
        <div className="stats">
          <div><small>REPS</small><b>{b.total}</b></div>
          <div><small>ELBOW ROM</small><b>{b.rom}°</b></div>
          <div><small>TORSO MAX</small><b>{b.torsoMax}°</b></div>
        </div>
        <div className="card">
          <div className="row-between"><span className="h4">Torso inclination vs vertical</span><span className="mono muted">limit {TORSO_LIMIT}°</span></div>
          <div className="bars">
            <div className="limit" style={{ bottom: (TORSO_LIMIT / 14) * 100 + '%' }} />
            {r.reps.map((x) => <i key={x.n} style={{ height: Math.round((Math.min(x.torso, 14) / 14) * 100) + '%', background: x.torso > TORSO_LIMIT ? T.bad : T.muted }} />)}
          </div>
          <div className="mono muted small">{r.source === 'video' ? 'OFFLINE · RECORDED VIDEO' : r.sample ? 'SAMPLE DATA' : 'LIVE · PHONE CAMERA'} · 33 LANDMARKS · SVBM</div>
        </div>
        <div className="risk" style={{ background: b.riskBg, borderColor: b.riskColor }}>
          <b style={{ color: b.riskColor }}>{b.riskTitle}</b><p>{b.riskBody}</p>
        </div>
        {b.flags.length > 0 && <>
          <h3 className="h3">Flagged moments</h3>
          <div className="list">{b.flags.map((f) => <div key={f.t} className="flag"><span className="mono">{f.t}</span><span>{f.text}</span></div>)}</div>
        </>}
        <div className="btn-row">
          <button className="cta" onClick={share}>{shared || (pro ? 'Send notes to client' : 'Share with coach / physio')}</button>
          <button className="ghost" onClick={() => set((s) => ({ injury: inInjury ? s.injury.filter((x) => x !== r.id) : [...s.injury, r.id] }))}>{inInjury ? 'Saved to injury record ✓' : 'Add to injury record'}</button>
        </div>
      </>)}
      {!r.sample && !String(r.id).startsWith('m') && p.recs.some((x) => x.id === r.id) && <button className="ghost danger" onClick={() => onDelete(r)}>Delete this recording</button>}
    </div>
  );
}

/* ------------------------------- recordings ------------------------------- */
function RecRow({ T, r, onOpen }) {
  const b = buildReport(r, T);
  return (
    <button className="rec-row" onClick={() => onOpen(r)}>
      <span className="rec-thumb mono">{r.duration}</span>
      <span className="ex-main"><span className="ex-name">{r.title}</span><span className="ex-sub">{r.date} · {b.total} reps{r.sample ? ' · sample' : ''}</span></span>
      <span className="rec-score"><b style={{ color: b.total ? b.scoreColor : T.muted }}>{b.total ? b.score : '—'}</b><small>{b.flags.length ? b.flags.length + ' FLAGS' : 'CLEAN'}</small></span>
    </button>
  );
}

function Recordings({ T, recs, onOpen, onImported }) {
  const [prog, setProg] = useState(null);
  const [err, setErr] = useState('');
  const fileRef = useRef();
  const pick = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setErr(''); setProg(0);
    try {
      const { reps, seconds } = await analyzeVideoFile(f, setProg);
      const id = 'v' + Date.now();
      await putClip(id, f);
      onImported({ id, title: 'Imported video · Curl', date: todayLabel(), duration: fmtTime(seconds), reps, source: 'video', hasClip: true, ts: Date.now() });
    } catch (x) { setErr(x.message || 'Could not analyse that video'); }
    setProg(null);
  };
  return (
    <div className="screen">
      <h1 className="h1">Recordings</h1>
      <p className="muted">Every session is saved on this phone with its pose data. Share one with a coach or physio, or keep it in your injury record.</p>
      <input ref={fileRef} type="file" accept="video/*" hidden onChange={pick} />
      <button className="ghost" onClick={() => prog == null && fileRef.current.click()}>
        {prog == null ? '+ Analyse a recorded video' : `Analysing video… ${Math.round(prog * 100)}% · 33 landmarks / frame`}
      </button>
      {err && <p className="err">{err}</p>}
      <div className="list">{recs.map((r) => <RecRow key={r.id} T={T} r={r} onOpen={onOpen} />)}</div>
    </div>
  );
}

/* ---------------------------------- coach --------------------------------- */
const initials = (n) => n.split(' ').map((x) => x[0]).join('');
function Clients({ T, onOpen }) {
  return (
    <div className="screen">
      <Eyebrow>COACH VIEW · SAMPLE CLIENTS</Eyebrow>
      <h1 className="h1">Clients</h1>
      <div className="stats two">
        <div><small>NEEDS REVIEW</small><b style={{ color: T.bad }}>{CLIENTS.filter((c) => c.rk === 'bad').length}</b></div>
        <div><small>SESSIONS THIS WEEK</small><b>14</b></div>
      </div>
      <div className="list">
        {CLIENTS.map((c) => (
          <button key={c.id} className="rec-row" onClick={() => onOpen(c)}>
            <span className="avatar">{initials(c.name)}</span>
            <span className="ex-main"><span className="ex-name">{c.name}</span><span className="ex-sub">{c.goal} · {c.last}</span></span>
            <span className="risk-tag" style={{ color: T[c.rk], borderColor: T[c.rk] }}>{c.risk}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Client({ T, c, onBack, onOpen }) {
  return (
    <div className="screen">
      <button className="eyebrow link" onClick={onBack}>← CLIENTS</button>
      <div className="client-head"><span className="avatar lg">{initials(c.name)}</span><div><h1 className="h1 tight">{c.name}</h1><div className="muted">{c.goal} · {c.place}</div></div></div>
      <div className="card"><Eyebrow>INJURY RECORD</Eyebrow><b>{c.injury}</b><p className="muted">{c.injuryNote}</p></div>
      <h3 className="h3">Compare recordings <span className="muted small">· {c.metric}</span></h3>
      <div className="stats two">
        <div><small>FIRST SESSION · {c.fromDate}</small><b>{c.fromVal}</b></div>
        <div><small>LATEST SESSION · {c.toDate}</small><b style={{ color: T.good }}>{c.toVal}</b></div>
      </div>
      <h3 className="h3">Sessions</h3>
      <div className="list">{c.recs.map((r) => <RecRow key={r.id} T={T} r={r} onOpen={onOpen} />)}</div>
    </div>
  );
}

/* ----------------------------------- me ----------------------------------- */
function Me({ p, set, onRedo, onReset }) {
  const help = p.fb === 'Minimal' ? 'Skeleton with green / red joints only. Nothing to read mid-rep.' : p.fb === 'Coach cues' ? 'Short text cues after each rep.' : 'Live joint, torso and neck angles on the skeleton.';
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="screen">
      <h1 className="h1">Me</h1>
      <h3 className="h3">Look</h3>
      <ThemePicker value={p.theme} onChange={(theme) => set({ theme })} showSub />
      <h3 className="h3">Live feedback</h3>
      <Seg options={FEEDBACK} value={p.fb} onChange={(fb) => set({ fb })} />
      <p className="muted small">{help}</p>
      <h3 className="h3">Account type</h3>
      <Seg options={['Training myself', 'Coach / physio / gym']} value={p.role === 'pro' ? 'Coach / physio / gym' : 'Training myself'} onChange={(v) => set({ role: v.startsWith('Coach') ? 'pro' : 'self' })} />
      <h3 className="h3">My plan</h3>
      <button className="ghost" onClick={onRedo}>Change goal, place or equipment</button>
      <h3 className="h3">Data on this phone</h3>
      <p className="muted small">{p.recs.length} recordings saved. Nothing leaves the phone unless you share it.</p>
      {confirm
        ? <div className="btn-row"><button className="ghost danger" onClick={onReset}>Yes, delete everything</button><button className="ghost" onClick={() => setConfirm(false)}>Cancel</button></div>
        : <button className="ghost danger" onClick={() => setConfirm(true)}>Reset app</button>}
      <p className="muted small center">GymBuddy 0.1 · MediaPipe Pose · SVBM</p>
    </div>
  );
}
