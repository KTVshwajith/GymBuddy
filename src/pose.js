// MediaPipe Pose Landmarker (33 BlazePose landmarks) + SVBM form maths.
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';
import { ang3, incl, TORSO_LIMIT } from './data.js';

const VER = '0.10.14';
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}/wasm`;
// "full" model: noticeably steadier than "lite", still real-time on phones
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';

// Alert colours are fixed (not theme colours) so they read clearly over any camera image.
export const OK = '#2BFF6A';
export const BAD = '#FF2D2D';
const NEUTRAL = 'rgba(255,255,255,.85)';

let filesetP;
export async function createLandmarker() {
  filesetP = filesetP || FilesetResolver.forVisionTasks(WASM);
  const fs = await filesetP;
  const opts = (delegate) => ({
    baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numPoses: 1,
    minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
  });
  try {
    return await PoseLandmarker.createFromOptions(fs, opts('GPU'));
  } catch {
    return await PoseLandmarker.createFromOptions(fs, opts('CPU'));
  }
}

// Body parts as segments. A segment is drawn only when both ends are visible in the frame.
const SEGMENTS = [
  [11, 12], [11, 23], [12, 24], [23, 24], // torso box
  [11, 13], [13, 15], [12, 14], [14, 16], // arms
  [15, 17], [15, 19], [16, 18], [16, 20], // hands
  [23, 25], [25, 27], [24, 26], [26, 28], // legs
  [27, 29], [29, 31], [27, 31], [28, 30], [30, 32], [28, 32], // feet
];
const JOINTS = [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32];
export const DRIFT_BAD = 30; // upper arm vs torso, degrees
export const TORSO_BAD = TORSO_LIMIT + 2;
const VIS = 0.6; // landmark confidence needed to count as "seen"
const EDGE = 0.01; // landmarks outside the picture are guesses: ignore them

// Light smoothing so the skeleton doesn't jitter frame to frame.
export class Smoother {
  constructor(alpha = 0.55) { this.a = alpha; this.prev = null; }
  reset() { this.prev = null; }
  push(L) {
    if (!this.prev) { this.prev = L.map((q) => ({ ...q })); return this.prev; }
    const a = this.a;
    this.prev = L.map((q, i) => {
      const p = this.prev[i];
      // jump straight to big moves (re-detection) instead of sliding across the screen
      if (Math.hypot(q.x - p.x, q.y - p.y) > 0.15) return { ...q };
      return { x: p.x + a * (q.x - p.x), y: p.y + a * (q.y - p.y), z: q.z, visibility: q.visibility };
    });
    return this.prev;
  }
}

/**
 * Turn normalised landmarks into pixel points + the SVBM measurements.
 * view: 'Auto' | 'Close-up' | 'Full body'
 * Every measurement is null when the body parts it needs are not visible,
 * so a close-up of one arm still counts reps without inventing a torso.
 */
export function measure(L, W, H, mirror, view = 'Auto') {
  const P = L.map((q) => {
    const inFrame = q.x > EDGE && q.x < 1 - EDGE && q.y > EDGE && q.y < 1 - EDGE;
    return { x: (mirror ? 1 - q.x : q.x) * W, y: q.y * H, v: q.visibility ?? 1, ok: inFrame && (q.visibility ?? 1) >= VIS };
  });
  const seen = (...ids) => ids.every((i) => P[i].ok);
  const score = (ids) => ids.reduce((a, i) => a + (P[i].ok ? 1 + P[i].v : 0), 0);

  // working arm = the side the camera sees best
  const leftArm = [11, 13, 15], rightArm = [12, 14, 16];
  const useLeft = score(leftArm) >= score(rightArm);
  const [iS, iE, iW] = useLeft ? leftArm : rightArm;
  const iH = useLeft ? 23 : 24;
  const armSeen = seen(iS, iE, iW);

  const closeUp = view === 'Close-up';
  const hipsSeen = seen(11, 12, 23, 24) || seen(iS, iH);
  const mid = (a, b) => (P[a].ok && P[b].ok ? { x: (P[a].x + P[b].x) / 2, y: (P[a].y + P[b].y) / 2 } : P[a].ok ? P[a] : P[b]);
  const mS = mid(11, 12), mH = mid(23, 24), mEy = mid(2, 5);

  const elbow = armSeen ? ang3(P[iS], P[iE], P[iW]) : null;
  const torso = !closeUp && hipsSeen ? incl(mH, mS) : null;
  const neck = !closeUp && (P[11].ok || P[12].ok) && (P[2].ok || P[5].ok) ? incl(mS, mEy) : null;
  const drift = !closeUp && armSeen && P[iH].ok ? ang3(P[iE], P[iS], P[iH]) : null;
  const legsSeen = seen(25, 26) || seen(27, 28) || seen(25, 27) || seen(26, 28);

  let coverage;
  if (!armSeen) coverage = 'NO_ARM';
  else if (closeUp) coverage = 'ARM';
  else if (!hipsSeen) coverage = 'ARM';
  else if (view === 'Full body' && !legsSeen) coverage = 'NEED_LEGS';
  else coverage = legsSeen ? 'FULL' : 'UPPER';

  return {
    P, iS, iE, iW, iH, mS, mH, mEy, elbow, torso, neck, drift, armSeen, hipsSeen, coverage, closeUp,
    torsoBad: torso != null && torso > TORSO_BAD,
    driftBad: drift != null && drift > DRIFT_BAD,
  };
}

// Curl rep counter: a rep is elbow flexed below 70° then extended past 140°.
// Torso and drift checks only apply when those body parts were in view.
export class RepCounter {
  constructor(onRep) { this.onRep = onRep; this.reset(); }
  reset() { this.phase = 'down'; this.min = 180; this.max = 0; this.tor = 0; this.drift = 0; this.torSeen = false; }
  push(m) {
    if (m.elbow == null) return;
    this.min = Math.min(this.min, m.elbow); this.max = Math.max(this.max, m.elbow);
    if (m.torso != null) { this.tor = Math.max(this.tor, m.torso); this.torSeen = true; }
    if (m.drift != null) this.drift = Math.max(this.drift, m.drift);
    if (this.phase === 'down' && m.elbow < 70) this.phase = 'up';
    else if (this.phase === 'up' && m.elbow > 140) {
      this.onRep({
        rom: Math.round(this.max - this.min), torso: Math.round(this.tor), torsoChecked: this.torSeen,
        bad: this.tor > TORSO_BAD || this.drift > DRIFT_BAD, torsoBad: this.tor > TORSO_BAD, driftBad: this.drift > DRIFT_BAD,
      });
      this.reset();
    }
  }
}

export function drawSkeleton(ctx, m, W, H, dataMode) {
  const { P, iS, iE, iW, iH, mS, mH, mEy } = m;
  const base = Math.max(W, H);
  const lw = Math.max(6, base / 110); // thick, readable from 2 m away
  const arm = new Set([iS, iE, iW]);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  // dark outline under every line so colours pop on bright or busy backgrounds
  const seg = (a, b, col, w = lw) => {
    ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.lineWidth = w + Math.max(4, w * 0.6);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  };
  const glow = (col, blur) => { ctx.shadowColor = col; ctx.shadowBlur = blur; };
  const noGlow = () => { ctx.shadowBlur = 0; };

  // vertical reference line (only when the torso is being checked)
  if (m.torso != null) {
    ctx.setLineDash([lw * 1.4, lw * 1.4]); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(2, lw / 3);
    ctx.beginPath(); ctx.moveTo(mH.x, mH.y); ctx.lineTo(mH.x, mS.y - H * 0.12); ctx.stroke(); ctx.setLineDash([]);
  }

  // body: only segments the camera can actually see
  SEGMENTS.forEach(([a, b]) => {
    if (!P[a].ok || !P[b].ok) return;
    if (arm.has(a) && arm.has(b)) return; // drawn on top below
    if (m.closeUp && !(arm.has(a) || arm.has(b))) return; // close-up: just the working arm
    seg(P[a], P[b], NEUTRAL, lw * 0.8);
  });

  // torso line, coloured by the torso check
  if (m.torso != null) {
    const col = m.torsoBad ? BAD : OK;
    glow(col, lw * 2); seg(mH, mS, col, lw * 1.5); noGlow();
    if (P[2].ok || P[5].ok) seg(mS, mEy, NEUTRAL, lw * 0.6);
  }

  // working arm, coloured by elbow drift
  if (m.armSeen) {
    const col = m.driftBad ? BAD : OK;
    glow(col, lw * 2.5);
    seg(P[iS], P[iE], col, lw * 1.6); seg(P[iE], P[iW], col, lw * 1.6);
    noGlow();
  } else {
    // partially visible arm: draw what we have, neutral
    if (P[iS].ok && P[iE].ok) seg(P[iS], P[iE], NEUTRAL, lw);
    if (P[iE].ok && P[iW].ok) seg(P[iE], P[iW], NEUTRAL, lw);
  }

  // joints
  const dot = (q, col, r) => {
    ctx.fillStyle = '#111'; ctx.strokeStyle = col; ctx.lineWidth = Math.max(3, lw * 0.5);
    ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  };
  JOINTS.forEach((i) => {
    if (!P[i].ok) return;
    if (m.closeUp && !arm.has(i)) return;
    const isArm = arm.has(i) && m.armSeen;
    const torsoJoint = (i === 11 || i === 12 || i === 23 || i === 24) && m.torso != null;
    const col = isArm ? (m.driftBad ? BAD : OK) : torsoJoint ? (m.torsoBad ? BAD : OK) : '#fff';
    dot(P[i], col, isArm ? lw * 1.3 : lw * 0.9);
  });

  // elbow drifting: show where the elbow should be + pulse ring
  if (m.driftBad && P[iH].ok) {
    const t = performance.now() / 1000;
    ctx.strokeStyle = BAD; ctx.lineWidth = Math.max(3, lw * 0.5);
    ctx.beginPath(); ctx.arc(P[iE].x, P[iE].y, lw * (2.4 + 0.6 * Math.sin(t * 8)), 0, Math.PI * 2); ctx.stroke();
    const ideal = { x: P[iS].x + (P[iH].x - P[iS].x) * 0.45, y: P[iS].y + (P[iH].y - P[iS].y) * 0.45 };
    ctx.setLineDash([lw * 0.6, lw * 0.6]); ctx.strokeStyle = OK;
    ctx.beginPath(); ctx.arc(ideal.x, ideal.y, lw * 1.8, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }

  if (dataMode) {
    const fs = Math.round(base / 30);
    ctx.font = `600 ${fs}px 'JetBrains Mono', monospace`;
    const label = (txt, x, y, col = '#fff') => {
      const w = ctx.measureText(txt).width;
      ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(x - 6, y - fs, w + 12, fs * 1.35);
      ctx.fillStyle = col; ctx.fillText(txt, x, y);
    };
    if (m.elbow != null) label(Math.round(m.elbow) + '°', P[iE].x + lw * 2, P[iE].y, m.driftBad ? BAD : OK);
    if (m.torso != null) label('torso ' + Math.round(m.torso) + '°', mH.x + lw * 2, mH.y - fs, m.torsoBad ? BAD : OK);
    if (m.neck != null) label('neck ' + Math.round(m.neck) + '°', mS.x + lw * 2, mS.y - fs * 1.5);
  }
}

// Offline analysis of a video file the user picks. Returns { reps, seconds }.
export async function analyzeVideoFile(file, onProgress, view = 'Auto') {
  const lm = await createLandmarker();
  const url = URL.createObjectURL(file);
  const vid = document.createElement('video');
  vid.src = url; vid.muted = true; vid.playsInline = true;
  await new Promise((res, rej) => { vid.onloadeddata = res; vid.onerror = () => rej(new Error('Could not read that video')); });
  const reps = [];
  const counter = new RepCounter((r) => reps.push({ n: reps.length + 1, rom: Math.max(r.rom, 40), bad: r.bad, torso: r.torso }));
  const smooth = new Smoother();
  const dur = vid.duration || 0;
  const step = 1 / 15;
  let ts = 0;
  for (let t = 0; t < dur; t += step) {
    vid.currentTime = t;
    await new Promise((res) => { vid.onseeked = res; });
    ts += 67;
    const out = lm.detectForVideo(vid, ts);
    const L = out.landmarks && out.landmarks[0];
    if (L) counter.push(measure(smooth.push(L), vid.videoWidth, vid.videoHeight, false, view));
    else smooth.reset();
    onProgress && onProgress(Math.min(1, t / dur));
  }
  lm.close();
  URL.revokeObjectURL(url);
  return { reps, seconds: Math.round(dur) };
}
