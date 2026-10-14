export const W = { attendance: 4, exercise: 2, food: 2, steps: 1 };
export const STEP_GOAL = 63000; // 70,000 minus 10% discretion
const p = n => String(n).padStart(2, '0');
export const iso = d => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
export const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const monday = d => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };

// days: 7 check-in objects for one roommate. Returns totals, per-category status, points, overall.
export function evaluate(days, ws, now = new Date()) {
  const t = days.reduce((a, d) => ({ att: a.att + d.classes_attended, mis: a.mis + d.classes_missed,
    wk: a.wk + (d.workout ? 1 : 0), junk: a.junk + d.junk, steps: a.steps + d.steps }),
    { att: 0, mis: 0, wk: 0, junk: 0, steps: 0 });
  const today = iso(now), ended = today > iso(addDays(ws, 6));
  const left = days.filter(d => d.day > today).length;
  const st = (met, impossible) => met ? 'pass' : (ended || impossible) ? 'fail' : 'risk';
  const status = {
    attendance: t.mis > 0 ? 'fail' : 'pass',
    exercise: st(t.wk >= 5, t.wk + left < 5),
    steps: st(t.steps >= STEP_GOAL, false),
    food: t.junk > 2 ? 'fail' : t.junk === 2 && !ended ? 'risk' : 'pass',
  };
  const owed = Object.keys(status).filter(k => status[k] === 'fail');
  const points = owed.reduce((a, k) => a + W[k], 0);
  const vals = Object.values(status);
  return { t, status, owed, points, overall: vals.includes('fail') ? 'fail' : vals.includes('risk') ? 'risk' : 'pass' };
}
