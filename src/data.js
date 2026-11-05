// Content and constants carried over from the GymBuddy v2 design.

export const THEMES = {
  volt: {
    name: 'Volt', sub: 'Gym-floor energy, huge numbers',
    bg: '#0a0a0a', surf: '#171717', text: '#f5f3ef', muted: '#9a978f', line: 'rgba(255,255,255,.12)',
    accent: 'oklch(0.72 0.19 50)', onAccent: '#0a0a0a', good: '#f5f3ef', bad: 'oklch(0.72 0.19 50)', warn: '#c9c6bf',
    display: "'Barlow Condensed',sans-serif", body: 'Barlow,sans-serif', label: 'Barlow,sans-serif',
    dw: 800, upper: 'uppercase', h1: '44px', r: '4px', rL: '6px', pill: '2px',
    riskBg: ['#171717', '#1f1c17', 'oklch(0.3 0.08 50)'], meta: '#0a0a0a',
  },
  night: {
    name: 'Night Lab', sub: 'Dark, calm, data in mono',
    bg: '#0f1110', surf: '#191c1a', text: '#eef0ec', muted: '#9aa19b', line: 'rgba(255,255,255,.09)',
    accent: 'oklch(0.82 0.16 145)', onAccent: '#0f1110', good: 'oklch(0.82 0.16 145)', bad: 'oklch(0.72 0.17 25)', warn: 'oklch(0.84 0.15 80)',
    display: 'Archivo,sans-serif', body: 'Archivo,sans-serif', label: "'JetBrains Mono',monospace",
    dw: 800, upper: 'none', h1: '32px', r: '16px', rL: '20px', pill: '999px',
    riskBg: ['#191c1a', 'rgba(220,180,60,.1)', 'rgba(220,80,60,.14)'], meta: '#0f1110',
  },
  clinic: {
    name: 'Clinic', sub: 'Light and chart-like, physio-friendly',
    bg: '#f4f2ee', surf: '#ffffff', text: '#1c1b19', muted: '#625f59', line: '#d9d5ce',
    accent: '#1c1b19', onAccent: '#f4f2ee', good: 'oklch(0.52 0.1 200)', bad: 'oklch(0.58 0.16 30)', warn: 'oklch(0.62 0.13 75)',
    display: "'IBM Plex Sans',sans-serif", body: "'IBM Plex Sans',sans-serif", label: "'IBM Plex Mono',monospace",
    dw: 600, upper: 'none', h1: '32px', r: '14px', rL: '16px', pill: '999px',
    riskBg: ['#ffffff', '#f7efdf', '#f8e6e0'], meta: '#f4f2ee',
  },
};

export const GOALS = [
  { id: 'arms', label: 'Bigger arms', sub: 'Biceps and triceps size' },
  { id: 'strength', label: 'Build strength', sub: 'Squat, press, pull — get stronger' },
  { id: 'fat', label: 'Lose fat', sub: 'Circuits that keep your heart rate up' },
  { id: 'mobility', label: 'Mobility & posture', sub: 'Desk-proof hips, shoulders, spine' },
  { id: 'rehab', label: 'Recover from injury', sub: 'Guided rehab, shared with your physio' },
];

export const EQUIPMENT = ['Dumbbells', 'Resistance bands', 'Pull-up bar', 'Bench', 'Kettlebell', 'None'];
export const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
export const FEEDBACK = ['Minimal', 'Coach cues', 'Data'];

export const PLANS = {
  arms: { title: 'Arms A',
    home: [['Dumbbell curl', '3 × 12', 'Biceps'], ['Hammer curl', '3 × 10', 'Brachialis'], ['Diamond push-up', '3 × max', 'Triceps'], ['Bench dip', '3 × 12', 'Triceps'], ['Overhead extension', '3 × 12', 'Long head']],
    gym: [['Barbell curl', '4 × 10', 'Biceps'], ['Cable hammer curl', '3 × 12', 'Brachialis'], ['Close-grip bench', '4 × 8', 'Triceps'], ['Rope pushdown', '3 × 12', 'Triceps'], ['Preacher curl', '3 × 10', 'Biceps peak']] },
  strength: { title: 'Full body A',
    home: [['Goblet squat', '4 × 8', 'Legs'], ['Push-up', '4 × 10', 'Chest'], ['Romanian deadlift', '3 × 10', 'Hamstrings'], ['One-arm row', '3 × 10', 'Back'], ['Plank', '3 × 40s', 'Core']],
    gym: [['Back squat', '5 × 5', 'Legs'], ['Bench press', '5 × 5', 'Chest'], ['Deadlift', '3 × 5', 'Posterior chain'], ['Pull-up', '3 × 8', 'Back'], ['Overhead press', '3 × 6', 'Shoulders']] },
  fat: { title: 'Circuit A',
    home: [['Squat to press', '4 × 15', 'Full body'], ['Mountain climber', '4 × 30s', 'Core'], ['Reverse lunge', '4 × 12', 'Legs'], ['Burpee', '4 × 10', 'Full body']],
    gym: [['Kettlebell swing', '4 × 15', 'Hips'], ['Rower sprint', '4 × 250m', 'Conditioning'], ['Thruster', '4 × 10', 'Full body'], ['Box step-up', '4 × 12', 'Legs']] },
  mobility: { title: 'Mobility flow',
    home: [['Cat-cow', '2 × 10', 'Spine'], ['90/90 hip switch', '2 × 8', 'Hips'], ['Wall slide', '3 × 10', 'Shoulders'], ['Deep squat hold', '3 × 30s', 'Ankles, hips']],
    gym: [['Cat-cow', '2 × 10', 'Spine'], ['Cable face pull', '3 × 15', 'Upper back'], ['Wall slide', '3 × 10', 'Shoulders'], ['Deep squat hold', '3 × 30s', 'Ankles, hips']] },
  rehab: { title: 'Shoulder rehab',
    home: [['Band external rotation', '3 × 12', 'Rotator cuff'], ['Scapular retraction', '3 × 15', 'Mid back'], ['Wall slide', '3 × 10', 'Shoulders'], ['Isometric hold', '3 × 20s', 'Rotator cuff']],
    gym: [['Cable external rotation', '3 × 12', 'Rotator cuff'], ['Face pull', '3 × 15', 'Rear delts'], ['Wall slide', '3 × 10', 'Shoulders'], ['Light lateral raise', '3 × 12', 'Delts']] },
};

export const mk = (id, title, date, duration, arr, extra = {}) => ({
  id, title, date, duration, sample: true, ...extra,
  reps: arr.map((r, i) => ({ n: i + 1, rom: r[0], bad: !!r[1], torso: r[1] ? 9 + (i % 3) : 2 + (i % 2) })),
});

export const SEED = [
  mk('s1', 'Dumbbell curl', 'Oct 26', '2:41', [[124], [126], [121, 1], [125], [123], [128], [118, 1], [126], [124], [120, 1], [125], [122]]),
  mk('s2', 'Hammer curl', 'Oct 24', '2:12', [[118], [120], [121], [119], [122], [117], [120], [121], [118], [119]]),
  mk('s3', 'Overhead extension', 'Oct 22', '2:30', [[112], [109, 1], [115], [111], [104, 1], [113], [110, 1], [114], [112], [108, 1], [111], [113]]),
];

export const CLIENTS = [
  { id: 'c1', name: 'Maya Chen', goal: 'Recover from injury', place: 'Home', last: 'Today', risk: 'REVIEW', rk: 'bad',
    injury: 'Left shoulder impingement', injuryNote: 'Since Sep 12. Cleared by physio for light band work. Avoid overhead loading; watch for elbow flare and shrugging.',
    metric: 'external rotation ROM', fromDate: 'Sep 14', fromVal: '62°', toDate: 'Oct 27', toVal: '84°',
    recs: [mk('m1', 'Band external rotation', 'Oct 27', '3:05', [[84], [83], [81, 1], [85], [84], [82], [80, 1], [84], [83], [85], [82], [84]]), mk('m2', 'Wall slide', 'Oct 25', '2:20', [[96], [98], [97], [99], [95, 1], [98], [97], [99], [96], [98]])] },
  { id: 'c2', name: 'Jordan Reyes', goal: 'Bigger arms', place: 'Gym', last: 'Yesterday', risk: 'REVIEW', rk: 'bad',
    injury: 'No active injury', injuryNote: 'Repeated torso swing on curls over the last 3 sessions. Suggest dropping load 10–15%.',
    metric: 'clean reps', fromDate: 'Oct 6', fromVal: '64%', toDate: 'Oct 27', toVal: '75%',
    recs: [mk('j1', 'Barbell curl', 'Oct 27', '2:50', [[122], [120, 1], [124], [118, 1], [123], [121], [117, 1], [124], [122], [119]])] },
  { id: 'c3', name: 'Sam Patel', goal: 'Lose fat', place: 'Home', last: '2 days ago', risk: 'WATCH', rk: 'warn',
    injury: 'Lower back tightness', injuryNote: 'Self-reported Oct 20. Swings and lunges monitored for lumbar flexion.',
    metric: 'clean reps', fromDate: 'Oct 1', fromVal: '71%', toDate: 'Oct 26', toVal: '88%',
    recs: [mk('p1', 'Reverse lunge', 'Oct 26', '3:10', [[98], [99], [97], [100], [98], [96, 1], [99], [98], [100], [97], [99], [98]])] },
  { id: 'c4', name: 'Lena Ortiz', goal: 'Build strength', place: 'Gym', last: 'Today', risk: 'OK', rk: 'good',
    injury: 'No active injury', injuryNote: 'Consistent depth on squats. No flags in 4 weeks.',
    metric: 'squat depth', fromDate: 'Sep 30', fromVal: '88°', toDate: 'Oct 28', toVal: '97°',
    recs: [mk('l1', 'Back squat', 'Oct 28', '2:05', [[97], [98], [96], [97], [98]])] },
];

export const TORSO_LIMIT = 6;
export const DRIFT_LIMIT = 12;

// SVBM maths: angle at b from three points, and a segment's inclination from vertical
export const ang3 = (a, b, c) => {
  const v1 = { x: a.x - b.x, y: a.y - b.y }, v2 = { x: c.x - b.x, y: c.y - b.y };
  const d = Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y);
  return d ? (Math.acos(Math.max(-1, Math.min(1, (v1.x * v2.x + v1.y * v2.y) / d))) * 180) / Math.PI : 0;
};
export const incl = (p, q) => Math.abs((Math.atan2(q.x - p.x, p.y - q.y) * 180) / Math.PI);

export function buildReport(r, T) {
  const tot = r.reps.length || 1;
  const bad = r.reps.filter((x) => x.bad);
  const score = Math.round((100 * (tot - bad.length)) / tot);
  const rom = Math.round(r.reps.reduce((a, x) => a + x.rom, 0) / tot);
  const risk = bad.length >= 3 ? 2 : bad.length ? 1 : 0;
  return {
    score, rom, total: r.reps.length, bad,
    scoreColor: score >= 85 ? T.good : score >= 70 ? T.warn : T.bad,
    torsoMax: Math.max(0, ...r.reps.map((x) => x.torso)),
    risk,
    riskColor: [T.good, T.warn, T.bad][risk],
    riskBg: T.riskBg[risk],
    riskTitle: ['Low injury risk', 'Moderate strain risk', 'Elevated strain risk'][risk],
    riskBody: [
      'Elbows stayed pinned and torso stayed upright across the set.',
      'A few reps lost position late in the set. Keep the load, slow the lowering phase.',
      'Torso swing and elbow drift repeat under fatigue. This loads the biceps tendon and lower back. Drop the weight 10–15% next session.',
    ][risk],
    flags: bad.map((x) => ({ t: 'REP ' + x.n, text: `Torso inclination ${x.torso}° (limit ${TORSO_LIMIT}°), elbow drifted forward. ROM ${x.rom}°.` })),
  };
}

export const fmtTime = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
export const todayLabel = () => new Date().toLocaleDateString('en-NZ', { month: 'short', day: 'numeric' });
