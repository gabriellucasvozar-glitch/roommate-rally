import { W, STEP_GOAL, iso, parse, addDays, monday, evaluate } from './scoring.js';
import { CONFIG } from './config.js';
import * as store from './store.js';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NAMES = CONFIG.roommates, name = r => NAMES[r - 1];
const CATS = { attendance: 'Attendance', exercise: 'Exercise', food: 'Clean food', steps: 'Steps' };
const CHORES = ['Dishwasher (whole week)', 'Take out garbage (whole week)', 'Vacuum apartment (whole week)', 'Mop apartment (whole week)', 'Clean personal bathroom (once)', 'Deep-clean the kitchen'];
const LBL = { pass: 'Passed', risk: 'At risk', fail: 'Failed', done: 'Completed', active: 'Active', over: 'Overdue', idle: 'Upcoming' };
const S = { token: localStorage.rr_token || '', me: +localStorage.rr_me || 0, ws: monday(new Date()), view: 'week', db: { checkins: [], chores: [], consequences: [] }, dirty: false };
const fmt = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const pill = s => `<span class="pill ${s}">${LBL[s]}</span>`;
const load = async () => { S.db = await store.load(S.token); };
const put = (t, r) => store.save(S.token, [[t, r]]);
function toast(m, bad) { const t = $('#toast'); t.textContent = m; t.className = 'on' + (bad ? ' bad' : ''); setTimeout(() => t.className = '', 3000); }

const days = (r, ws) => [...Array(7)].map((_, i) => { const day = iso(addDays(ws, i));
  return S.db.checkins.find(c => c.roommate_id === r && c.day === day) || { roommate_id: r, day, classes_attended: 0, classes_missed: 0, workout: false, junk: 0, steps: 0 }; });
const ev = (r, ws) => evaluate(days(r, ws), ws);
const monthPts = (r, ym) => [...new Set(S.db.checkins.filter(c => c.roommate_id === r).map(c => iso(monday(parse(c.day)))))]
  .filter(x => x.startsWith(ym)).reduce((a, x) => a + ev(r, parse(x)).points, 0);
const weekChores = () => S.db.chores.filter(c => c.start_date <= iso(addDays(S.ws, 6)) && c.end_date >= iso(S.ws));
const choreStatus = c => c.done ? 'done' : c.end_date < iso(new Date()) ? 'over' : c.start_date > iso(new Date()) ? 'idle' : 'active';
const weekHead = () => `<div class="wknav"><button class="btn ghost" data-act="wk" data-n="-1" aria-label="Previous week">‹ Prev</button>
 <strong>${fmt(S.ws)} – ${fmt(addDays(S.ws, 6))}${iso(S.ws) === iso(monday(new Date())) ? '<span class="tag">Current week</span>' : ''}</strong>
 <button class="btn ghost" data-act="wk" data-n="0">Today</button><button class="btn ghost" data-act="wk" data-n="1" aria-label="Next week">Next ›</button></div>`;

function sumHtml(e) {
  const t = e.t;
  const rows = [['attendance', `${t.att} attended, ${t.mis} missed`], ['exercise', `${t.wk} / 5 workouts`], ['food', `${t.junk} / 2 junk-food occasions`], ['steps', `${t.steps.toLocaleString()} / ${STEP_GOAL.toLocaleString()} steps`]];
  return `<h3>Weekly totals</h3>${rows.map(([k, v]) => `<div class="row"><span>${CATS[k]}<br><span class="mut">${v}</span></span>${pill(e.status[k])}</div>`).join('')}
  <p class="big">${e.points} <span class="mut">penalty pts</span></p>
  <p class="mut">${e.owed.length ? 'Chores owed next week: ' + e.owed.map(k => `${CATS[k]} (${k === 'attendance' ? 2 : 1})`).join(', ') : 'No chores owed from this week.'}</p>`;
}
function weekView() {
  const ds = days(S.me, S.ws), n = (d, f, l, max) => `<label>${l}<input type="number" inputmode="numeric" min="0" max="${max}" step="1" required data-d="${d.day}" data-f="${f}" value="${d[f]}"></label>`;
  const mine = weekChores().filter(c => c.roommate_id === S.me);
  return `${weekHead()}<div class="wkgrid"><form id="wk" novalidate><div class="days">${ds.map(d => `<fieldset class="day"><legend>${parse(d.day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</legend>
   ${n(d, 'classes_attended', 'Classes attended', 12)}${n(d, 'classes_missed', 'Classes missed', 12)}
   <label class="chk"><input type="checkbox" data-d="${d.day}" data-f="workout" ${d.workout ? 'checked' : ''}> Workout / sport</label>
   ${n(d, 'junk', 'Junk-food occasions', 10)}${n(d, 'steps', 'Steps', 100000)}</fieldset>`).join('')}</div>
   <div class="savebar"><button class="btn or" type="submit">Save week</button><span id="dirty" class="mut"></span></div></form>
   <aside><div class="card" id="sum">${sumHtml(evaluate(ds, S.ws))}</div>
   <div class="card"><h3>My chores this week</h3>${mine.length ? mine.map(c => `<div class="row"><span>${esc(c.title)}</span>${pill(choreStatus(c))}</div>`).join('') : '<p class="mut">None assigned.</p>'}</div></aside></div>`;
}
const readForm = () => days(S.me, S.ws).map(d => { const g = f => document.querySelector(`[data-d="${d.day}"][data-f="${f}"]`);
  return { ...d, classes_attended: +g('classes_attended').value || 0, classes_missed: +g('classes_missed').value || 0, junk: +g('junk').value || 0, steps: +g('steps').value || 0, workout: g('workout').checked }; });
async function saveWeek() {
  const f = $('#wk'); if (!f.reportValidity()) return;
  try { const rows = readForm(), e = evaluate(rows, S.ws);
    await store.save(S.token, [...rows.map(r => ['checkins', { ...r, roommate_id: S.me }]), ['weekly_summaries', { roommate_id: S.me, week_start: iso(S.ws), points: e.points, detail: e.status }]]);
    await load(); S.dirty = false; toast('Saved'); render();
  } catch (x) { toast('Save failed: ' + x.message, true); }
}
function groupView() {
  const ym = iso(S.ws).slice(0, 7);
  const bar = (s, pct, l) => `<div class="row"><span>${l}</span>${pill(s)}</div><div class="bar ${s}" role="progressbar" aria-valuenow="${Math.min(100, Math.round(pct))}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.min(100, pct)}%"></i></div>`;
  const cards = [1, 2, 3, 4].map(r => { const e = ev(r, S.ws), t = e.t, mp = monthPts(r, ym), c = S.db.consequences.find(x => x.roommate_id === r && x.month === ym);
    return `<article class="card"><div class="row"><h3>${esc(name(r))}</h3>${pill(e.overall)}</div>
    ${bar(e.status.attendance, t.att + t.mis ? t.att / (t.att + t.mis) * 100 : 0, `Attendance ${t.att}/${t.att + t.mis}`)}
    ${bar(e.status.exercise, t.wk / 5 * 100, `Workouts ${t.wk}/5`)}
    ${bar(e.status.steps, t.steps / STEP_GOAL * 100, `Steps ${(t.steps / 1000).toFixed(1)}k/63k`)}
    ${bar(e.status.food, t.junk / 2 * 100, `Junk food ${t.junk}/2 max`)}
    <p><span class="big">${e.points}</span> <span class="mut">week pts</span> · <span class="big">${mp}</span> <span class="mut">month pts (8 = escalation)</span></p>
    ${mp >= 8 ? `<div class="warn"><strong>⚠ Monthly escalation required.</strong> Agree a playful, safe, legal, non-degrading consequence together.
     <form class="cons" data-r="${r}"><label>Agreed consequence<textarea name="text" maxlength="400">${esc(c?.text)}</textarea></label>
     <label>Status<select name="status">${['Proposed', 'Agreed', 'Completed'].map(s => `<option ${c?.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
     <button class="btn" type="submit">Save consequence</button></form></div>` : ''}</article>`; }).join('');
  return `${weekHead()}<div class="grid four">${cards}</div>`;
}
function choresView() {
  const cs = weekChores(), done = cs.filter(c => c.done).length, opt = (a, sel) => a.map(([v, l]) => `<option value="${v}" ${v == sel ? 'selected' : ''}>${esc(l)}</option>`).join('');
  return `${weekHead()}<div class="card"><div class="row"><h2>Chore board</h2><span><strong>${cs.length ? Math.round(done / cs.length * 100) : 0}%</strong> complete</span></div>
   <p class="mut">Next cycle starts Monday ${fmt(addDays(S.ws, 7))}.</p>
   ${cs.length ? cs.map(c => `<div class="chore ${c.done ? 'done' : ''}"><input type="checkbox" data-chore="${c.id}" ${c.done ? 'checked' : ''} aria-label="Mark ${esc(c.title)} done">
    <div><strong>${esc(c.title)}</strong><br><span class="mut">${esc(name(c.roommate_id))} · ${esc(CATS[c.category] || c.category)} · ${fmt(parse(c.start_date))}–${fmt(parse(c.end_date))}</span></div>${pill(choreStatus(c))}</div>`).join('') : '<p class="empty">No chores this week. Suggest some from last week’s results.</p>'}
   <p><button class="btn or" data-act="suggest">Suggest chores from last week’s failures</button></p></div>
  <form class="card form" id="addchore"><h3 class="wide">Assign a chore</h3>
   <label>Assignee<select name="r">${opt([1, 2, 3, 4].map(r => [r, name(r)]))}</select></label>
   <label>Chore<select name="title">${opt(CHORES.map(c => [c, c]))}</select></label>
   <label>Category<select name="cat">${opt([...Object.entries(CATS), ['manual', 'Manual']])}</select></label>
   <label>Start<input type="date" name="s" required value="${iso(S.ws)}"></label><label>End<input type="date" name="e" required value="${iso(addDays(S.ws, 6))}"></label>
   <button class="btn wide" type="submit">Add chore</button></form>`;
}
async function suggest() {
  const prev = addDays(S.ws, -7), src = iso(prev), used = new Set(weekChores().map(c => c.title)), mk = [];
  for (let r = 1; r <= 4; r++) for (const cat of ev(r, prev).owed) {
    const have = S.db.chores.filter(c => c.roommate_id === r && c.category === cat && c.source_week === src).length;
    for (let i = have; i < (cat === 'attendance' ? 2 : 1); i++) { const t = CHORES.find(c => !used.has(c)) || CHORES[mk.length % 6]; used.add(t);
      mk.push({ id: crypto.randomUUID(), roommate_id: r, title: t, category: cat, start_date: iso(S.ws), end_date: iso(addDays(S.ws, 6)), done: false, source_week: src }); } }
  if (!mk.length) return toast('No new chores to suggest');
  try { await store.save(S.token, mk.map(c => ['chores', c])); await load(); toast(`${mk.length} chore(s) added`); render(); } catch (x) { toast(x.message, true); }
}
const rulesView = () => `<div class="card"><h2>Rules</h2>
 <h3>Weekly requirements (Monday–Sunday)</h3><ul>
 <li><strong>Attendance</strong> (top priority): attend every class. Any missed class fails the week: <strong>${W.attendance} pts</strong>, two chores next week.</li>
 <li><strong>Exercise</strong>: 5 workouts; outdoor sports count. Miss it: <strong>${W.exercise} pts</strong>, one chore.</li>
 <li><strong>Clean food</strong>: at most 2 junk-food occasions. Exceed it: <strong>${W.food} pts</strong>, one chore.</li>
 <li><strong>Steps</strong> (lowest priority): 10,000/day = 70,000/week. With a 10% discretion margin, <strong>63,000</strong> passes. Miss it: <strong>${W.steps} pt</strong>, one chore.</li></ul>
 <h3>Status colours</h3><p>${pill('pass')} requirement met · ${pill('risk')} not met yet, still possible · ${pill('fail')} failed</p>
 <h3>Chore conversion</h3><p>Failures become chores for the following week: dishwasher, garbage, vacuum, or mop for the whole week; personal bathroom once; deep-clean the kitchen. Roommates can reassign chores on the Chore Board. Completed chores turn green.</p>
 <h3>Monthly escalation</h3><p>8 or more penalty points in one month triggers a larger consequence the roommates agree on together. It must be consensual, safe, legal, and non-degrading: playful accountability, never public humiliation.</p></div>`;

function login(err) {
  $('#nav').hidden = true; $('#who').innerHTML = '';
  $('#main').innerHTML = `<form class="card login" id="login"><h2>Join the rally</h2>${err ? `<p class="err" role="alert">${esc(err)}</p>` : ''}
   <label>GitHub access token<input name="t" type="password" required autocomplete="off" value="${esc(S.token)}"></label><br>
   <label>I am<select name="r">${NAMES.map((n, i) => `<option value="${i + 1}" ${S.me === i + 1 ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></label><br>
   <button class="btn or" type="submit">Enter</button></form>`;
}
function render() {
  if (!S.token || !S.me) return login();
  $('#nav').hidden = false;
  document.querySelectorAll('#nav button').forEach(b => b.setAttribute('aria-current', b.dataset.v === S.view ? 'page' : 'false'));
  $('#who').innerHTML = `${esc(name(S.me))} <button data-act="logout">Switch</button>`;
  $('#main').innerHTML = { week: weekView, group: groupView, chores: choresView, rules: rulesView }[S.view]();
}
const guard = () => !S.dirty || confirm('You have unsaved changes. Leave without saving?');
document.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
  if (a === 'go' && guard()) { S.view = b.dataset.v; S.dirty = false; render(); }
  if (a === 'wk' && guard()) { S.ws = +b.dataset.n ? addDays(S.ws, 7 * b.dataset.n) : monday(new Date()); S.dirty = false; render(); }
  if (a === 'suggest') suggest();
  if (a === 'logout' && guard()) { delete localStorage.rr_token; delete localStorage.rr_me; S.token = ''; S.me = 0; login(); } });
document.addEventListener('input', e => { if (!e.target.closest('#wk')) return; S.dirty = true; $('#dirty').textContent = 'Unsaved changes'; $('#sum').innerHTML = sumHtml(evaluate(readForm(), S.ws)); });
document.addEventListener('change', async e => { const id = e.target.dataset.chore; if (!id) return; const c = S.db.chores.find(x => x.id === id);
  try { await put('chores', { ...c, done: e.target.checked, done_at: e.target.checked ? new Date().toISOString() : null }); await load(); render(); } catch (x) { toast(x.message, true); } });
document.addEventListener('submit', async e => { e.preventDefault(); const f = e.target, v = Object.fromEntries(new FormData(f));
  try {
    if (f.id === 'wk') return saveWeek();
    if (f.id === 'login') { S.token = v.t.trim(); S.me = +v.r; await load(); localStorage.rr_token = S.token; localStorage.rr_me = S.me; return render(); }
    if (f.id === 'addchore') { if (v.e < v.s) return toast('End date must be after start date', true);
      await put('chores', { id: crypto.randomUUID(), roommate_id: +v.r, title: v.title, category: v.cat, start_date: v.s, end_date: v.e, done: false }); toast('Chore added'); }
    if (f.className === 'cons') { await put('consequences', { roommate_id: +f.dataset.r, month: iso(S.ws).slice(0, 7), text: v.text, status: v.status }); toast('Consequence saved'); }
    await load(); render();
  } catch (x) { f.id === 'login' ? login('Could not sign in: ' + (x.message || 'check token and config')) : toast(x.message, true); } });
addEventListener('beforeunload', e => { if (S.dirty) e.preventDefault(); });

if (CONFIG.github.owner.includes('YOUR')) $('#main').innerHTML = '<p class="err">Not configured. Copy config.example.js to config.js and set your GitHub owner and data repo (see README).</p>';
else if (S.token && S.me) load().then(render).catch(x => login('Could not load data: ' + x.message)); else login();
