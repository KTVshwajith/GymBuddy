// MediaPipe Pose Landmarker (33 BlazePose landmarks) + SVBM form maths.
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { ang3, incl, TORSO_LIMIT } from './data.js';

const VER = '0.10.14';
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}/wasm`;
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

let filesetP;
export async function createLandmarker() {
  filesetP = filesetP || FilesetResolver.forVisionTasks(WASM);
  const fs = await filesetP;
  const opts = (delegate) => ({ baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numPoses: 1 });
  try {
    return await PoseLandmarker.createFromOptions(fs, opts('GPU'));
  } catch {
    return await PoseLandmarker.createFromOptions(fs, opts('CPU'));
  }
}

const CONN = [[11, 12], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32], [11, 13], [13, 15], [12, 14], [14, 16]];
export const DRIFT_BAD = 30; // upper arm vs torso, degrees
export const TORSO_BAD = TORSO_LIMIT + 2;

// Turn normalised landmarks into pixel points + the SVBM measurements.
export function measure(L, W, H, mirror) {
  const P = L.map((q) => ({ x: (mirror ? 1 - q.x : q.x) * W, y: q.y * H, v: q.visibility ?? 1 }));
  const left = P[11].v + P[13].v + P[15].v >= P[12].v + P[14].v + P[16].v;
  const [iS, iE, iW, iH] = left ? [11, 13, 15, 23] : [12, 14, 16, 24];
  const mid = (a, b) => ({ x: (P[a].x + P[b].x) / 2, y: (P[a].y + P[b].y) / 2 });
  const mS = mid(11, 12), mH = mid(23, 24), mEy = mid(2, 5);
  const elbow = ang3(P[iS], P[iE], P[iW]);
  const torso = incl(mH, mS);
  const neck = incl(mS, mEy);
  const drift = ang3(P[iE], P[iS], P[iH]);
  return { P, iS, iE, iW, mS, mH, mEy, elbow, torso, neck, drift, torsoBad: torso > TORSO_BAD, driftBad: drift > DRIFT_BAD };
}

// Curl rep counter: a rep is elbow flexed below 70° then extended past 140°.
export class RepCounter {
  constructor(onRep) { this.onRep = onRep; this.reset(); }
  reset() { this.phase = 'down'; this.min = 180; this.max = 0; this.tor = 0; this.drift = 0; }
  push(m) {
    this.min = Math.min(this.min, m.elbow); this.max = Math.max(this.max, m.elbow);
    this.tor = Math.max(this.tor, m.torso); this.drift = Math.max(this.drift, m.drift);
    if (this.phase === 'down' && m.elbow < 70) this.phase = 'up';
    else if (this.phase === 'up' && m.elbow > 140) {
      this.onRep({ rom: Math.round(this.max - this.min), torso: Math.round(this.tor), bad: this.tor > TORSO_BAD || this.drift > DRIFT_BAD });
      this.reset();
    }
  }
}

export function drawSkeleton(ctx, m, W, H, colors, dataMode) {
  const { P, iS, iE, iW, mS, mH, mEy } = m;
  const lw = Math.max(3, W / 160);
  ctx.lineCap = 'round';
  ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(mH.x, mH.y); ctx.lineTo(mH.x, mS.y - H * 0.15); ctx.stroke(); ctx.setLineDash([]);
  const seg = (a, b, col, w) => { ctx.strokeStyle = col; ctx.lineWidth = w || lw; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
  const arm = [iS, iE, iW];
  CONN.forEach(([a, b]) => {
    if (P[a].v < 0.4 || P[b].v < 0.4) return;
    const isArm = arm.includes(a) && arm.includes(b);
    seg(P[a], P[b], isArm ? (m.driftBad ? colors.bad : colors.good) : 'rgba(245,243,239,.6)');
  });
  seg(mH, mS, m.torsoBad ? colors.bad : colors.good, lw * 1.4);
  seg(mS, mEy, 'rgba(245,243,239,.6)', lw * 0.7);
  P.forEach((q, i) => {
    if (q.v < 0.4 || (i > 0 && i < 11)) return;
    ctx.fillStyle = '#111'; ctx.strokeStyle = i === iE && m.driftBad ? colors.bad : colors.good; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(q.x, q.y, lw * 1.3, 0, 7); ctx.fill(); ctx.stroke();
  });
  if (dataMode) {
    ctx.fillStyle = '#f5f3ef'; ctx.font = `500 ${Math.round(W / 28)}px 'JetBrains Mono', monospace`;
    ctx.fillText(Math.round(m.elbow) + '°', P[iE].x + 12, P[iE].y);
    ctx.fillText('torso ' + Math.round(m.torso) + '°', mH.x + 12, mH.y - 20);
    ctx.fillText('neck ' + Math.round(m.neck) + '°', mS.x + 12, mS.y - 20);
  }
}

// Offline analysis of a video file the user picks. Returns { reps, duration }.
export async function analyzeVideoFile(file, onProgress) {
  const lm = await createLandmarker();
  const url = URL.createObjectURL(file);
  const vid = document.createElement('video');
  vid.src = url; vid.muted = true; vid.playsInline = true;
  await new Promise((res, rej) => { vid.onloadeddata = res; vid.onerror = () => rej(new Error('Could not read that video')); });
  const reps = [];
  const counter = new RepCounter((r) => reps.push({ n: reps.length + 1, ...r, rom: Math.max(r.rom, 40) }));
  const dur = vid.duration || 0;
  const step = 1 / 15; // 15 frames per second is plenty for reps
  let ts = 0;
  for (let t = 0; t < dur; t += step) {
    vid.currentTime = t;
    await new Promise((res) => { vid.onseeked = res; });
    ts += 67;
    const out = lm.detectForVideo(vid, ts);
    const L = out.landmarks && out.landmarks[0];
    if (L) counter.push(measure(L, vid.videoWidth, vid.videoHeight, false));
    onProgress && onProgress(Math.min(1, t / dur));
  }
  lm.close();
  URL.revokeObjectURL(url);
  return { reps, seconds: Math.round(dur) };
}
