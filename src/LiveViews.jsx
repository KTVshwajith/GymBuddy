import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ang3, incl, TORSO_LIMIT, DRIFT_LIMIT } from './data.js';
import { createLandmarker, measure, RepCounter, drawSkeleton } from './pose.js';

/* ---------- Demo: simulated skeleton, every third rep goes wrong ---------- */
function geo(t, bad) {
  const P = 2.6, rep = Math.floor(t / P), ph = (t % P) / P, c = 0.5 - 0.5 * Math.cos(2 * Math.PI * ph), badRep = bad && rep % 3 === 2;
  const sway = badRep ? c * 12 : 0, drift = badRep ? c * 30 : c * 4;
  const S = { x: 150 - sway, y: 140 }, H = { x: 155, y: 262 }, K = { x: 160, y: 350 }, A = { x: 156, y: 440 }, Hd = { x: 150 - sway * 1.2, y: 92 }, F = { x: 184, y: 444 };
  const E = { x: S.x + 4 + drift, y: S.y + 66 - drift * 0.35 }, th = ((12 + c * (badRep ? 112 : 130)) * Math.PI) / 180;
  const W = { x: E.x + 62 * Math.sin(th), y: E.y + 62 * Math.cos(th) };
  const Ey = { x: Hd.x + 9, y: Hd.y - 3 };
  return { rep, drift, S, H, K, A, Hd, F, E, W, Ey, ang: ang3(S, E, W), torso: incl(H, S), neck: incl(S, Ey), ideal: { x: S.x + 5, y: S.y + 66 } };
}

export function DemoSkeleton({ paused, dataMode, colors, onRep }) {
  const [t, setT] = useState(0);
  const pr = useRef({ paused, onRep }); pr.current = { paused, onRep };
  const s = useRef({ t: 0, last: null, rep: 0, min: 180, max: 0, bad: false, tor: 0 });
  useEffect(() => {
    let id;
    const loop = (now) => {
      const r = s.current;
      if (r.last != null && !pr.current.paused) r.t += (now - r.last) / 1000;
      r.last = now;
      const g = geo(r.t, true);
      if (g.rep > r.rep) {
        const done = { rom: Math.round(r.max - r.min), bad: r.bad, torso: Math.round(r.tor) };
        r.rep = g.rep; r.min = 180; r.max = 0; r.bad = false; r.tor = 0;
        pr.current.onRep(done);
      }
      r.min = Math.min(r.min, g.ang); r.max = Math.max(r.max, g.ang); r.tor = Math.max(r.tor, g.torso);
      if (g.drift > DRIFT_LIMIT || g.torso > TORSO_LIMIT) r.bad = true;
      setT(r.t);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, []);
  const g = geo(t, true), warn = g.drift > DRIFT_LIMIT, wT = g.torso > TORSO_LIMIT;
  const arm = warn ? colors.bad : colors.good, tc = wT ? colors.bad : colors.good, body = 'rgba(245,243,239,.55)';
  const ln = (a, b, col, w = 4) => <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={col} strokeWidth={w} strokeLinecap="round" />;
  const dot = (a, col, r = 5.5) => <circle cx={a.x} cy={a.y} r={r} fill="#111" stroke={col} strokeWidth={2.5} />;
  const txt = (x, y, s, col = '#f5f3ef') => <text x={x} y={y} fill={col} fontSize={11} fontFamily="JetBrains Mono, monospace">{s}</text>;
  return (
    <svg viewBox="0 0 320 480" preserveAspectRatio="xMidYMid meet" className="fill">
      <line x1={g.H.x} y1={g.H.y} x2={g.H.x} y2={g.S.y - 70} stroke="rgba(255,255,255,.25)" strokeWidth={1.2} strokeDasharray="4 4" />
      {warn && <circle cx={g.ideal.x} cy={g.ideal.y} r={11} fill="none" stroke={colors.good} strokeWidth={1.5} strokeDasharray="3 3" />}
      <circle cx={g.Hd.x} cy={g.Hd.y} r={21} fill="none" stroke={body} strokeWidth={3} />
      {ln({ x: g.Hd.x, y: g.Hd.y + 21 }, g.S, body)}{ln(g.S, g.Ey, body, 2)}{ln(g.S, g.H, tc)}{ln(g.H, g.K, body)}{ln(g.K, g.A, body)}{ln(g.A, g.F, body)}
      {ln(g.S, g.E, arm, 5)}{ln(g.E, g.W, arm, 5)}
      <rect x={g.W.x - 5} y={g.W.y - 14} width={10} height={28} rx={3} fill="#6f6c66" />
      {dot(g.S, tc)}{dot(g.H, tc)}{dot(g.K, colors.good)}{dot(g.A, colors.good)}{dot(g.F, colors.good)}{dot(g.W, arm)}{dot(g.E, arm, 7)}
      {dataMode && txt(g.E.x - 56, g.E.y + 4, Math.round(g.ang) + '°')}
      {dataMode && txt(g.H.x + 12, g.H.y - 40, 'torso ' + Math.round(g.torso) + '°', wT ? colors.bad : '#b5b2ac')}
      {dataMode && txt(g.Ey.x + 18, g.Ey.y + 30, 'neck ' + Math.round(g.neck) + '°', '#b5b2ac')}
    </svg>
  );
}

/* ---------- Real camera: MediaPipe + SVBM + recording ---------- */
export const LiveCamera = forwardRef(function LiveCamera({ paused, dataMode, colors, onRep, facing }, ref) {
  const vref = useRef(), cref = useRef();
  const pr = useRef(); pr.current = { paused, dataMode, colors, onRep };
  const rec = useRef({ recorder: null, chunks: [] });
  const [status, setStatus] = useState('Loading pose model…');

  useImperativeHandle(ref, () => ({
    // Stop recording and hand back the clip (with skeleton burned in).
    stop: () => new Promise((res) => {
      const r = rec.current.recorder;
      if (!r || r.state === 'inactive') return res(null);
      r.onstop = () => res(rec.current.chunks.length ? new Blob(rec.current.chunks, { type: r.mimeType || 'video/webm' }) : null);
      try { r.stop(); } catch { res(null); }
    }),
  }));

  useEffect(() => {
    const r = rec.current.recorder;
    if (!r) return;
    try { if (paused && r.state === 'recording') r.pause(); else if (!paused && r.state === 'paused') r.resume(); } catch { /* ignore */ }
  }, [paused]);

  useEffect(() => {
    let stop = false, stream, lm, raf, lastT = -1, seen = false;
    const counter = new RepCounter((d) => pr.current.onRep(d));
    const mirror = facing === 'user';
    (async () => {
      try {
        lm = await createLandmarker();
        if (stop) return;
        setStatus('Allow camera access…');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (stop) { stream.getTracks().forEach((t) => t.stop()); return; }
        const vid = vref.current;
        vid.srcObject = stream;
        await vid.play();
        setStatus('Step into frame — side-on, full body');
        const cv = cref.current;
        cv.width = vid.videoWidth; cv.height = vid.videoHeight;
        // record the composited canvas (camera + skeleton)
        try {
          const types = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
          const mimeType = types.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
          const mr = new MediaRecorder(cv.captureStream(24), mimeType ? { mimeType, videoBitsPerSecond: 1_500_000 } : undefined);
          rec.current.chunks = [];
          mr.ondataavailable = (e) => e.data && e.data.size && rec.current.chunks.push(e.data);
          mr.start(1000);
          rec.current.recorder = mr;
        } catch { /* recording not supported – pose data still saved */ }
        const ctx = cv.getContext('2d');
        const loop = () => {
          if (stop) return;
          if (vid.readyState >= 2 && vid.currentTime !== lastT) {
            lastT = vid.currentTime;
            const W = cv.width, H = cv.height;
            ctx.save();
            if (mirror) { ctx.translate(W, 0); ctx.scale(-1, 1); }
            ctx.drawImage(vid, 0, 0, W, H);
            ctx.restore();
            const res = lm.detectForVideo(vid, performance.now());
            const L = res.landmarks && res.landmarks[0];
            if (L) {
              if (!seen) { seen = true; setStatus(''); }
              const m = measure(L, W, H, mirror);
              if (!pr.current.paused) counter.push(m);
              drawSkeleton(ctx, m, W, H, pr.current.colors, pr.current.dataMode);
            } else if (seen) setStatus('Step back into frame');
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch (e) {
        setStatus(`Camera or pose model unavailable (${e.name || e.message || 'error'}). Check camera permission and internet, or switch to Demo.`);
      }
    })();
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      try { rec.current.recorder && rec.current.recorder.state !== 'inactive' && rec.current.recorder.stop(); } catch { /* ignore */ }
      stream && stream.getTracks().forEach((t) => t.stop());
      try { lm && lm.close(); } catch { /* ignore */ }
    };
  }, [facing]);

  return (
    <div className="fill" style={{ background: '#000' }}>
      <video ref={vref} playsInline muted style={{ position: 'absolute', width: 2, height: 2, opacity: 0, pointerEvents: 'none' }} />
      <canvas ref={cref} className="fill" style={{ objectFit: 'cover' }} />
      {status && <div className="cam-status">{status}</div>}
    </div>
  );
});
