import express from 'express';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number(process.env.PORT || 3000);
const root = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(root, 'data.sqlite'));
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roommate TEXT NOT NULL,
  week TEXT NOT NULL,
  day TEXT NOT NULL,
  attended INTEGER NOT NULL DEFAULT 0,
  workout INTEGER NOT NULL DEFAULT 0,
  clean_food INTEGER NOT NULL DEFAULT 0,
  steps INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE(roommate, week, day)
);
CREATE TABLE IF NOT EXISTS chores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  roommate TEXT NOT NULL,
  cycle_start TEXT NOT NULL,
  code TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  UNIQUE(roommate, cycle_start, code)
);`);

const tokens = Object.fromEntries(['A', 'B', 'C', 'D'].map((id) => [id, process.env[`TOKEN_${id}`]]));
const sharedToken = process.env.SHARED_TOKEN;
const names = { A: 'Roommate A', B: 'Roommate B', C: 'Roommate C', D: 'Roommate D' };
const chores = { D: 'Dishwasher · whole cycle', G: 'Garbage · whole cycle', V: 'Vacuum shared floors', M: 'Mop shared floors', B: 'Own bathroom', K: 'Deep clean kitchen' };

app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(root, 'public')));

function auth(req, res, next) {
  const raw = req.headers.authorization || '';
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : '';
  const id = Object.keys(tokens).find((key) => safeTokenCompare(tokens[key], token));
  if (sharedToken && safeTokenCompare(sharedToken, token)) req.shared = true;
  else if (!id) return res.status(401).json({ error: 'Invalid household token' });
  req.roommate = id || String(req.headers['x-roommate'] || 'A');
  if (!['A', 'B', 'C', 'D'].includes(req.roommate)) return res.status(400).json({ error: 'Invalid roommate' });
  next();
}
function weekKey(value = new Date()) {
  const d = new Date(value); const day = d.getUTCDay(); const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff); return d.toISOString().slice(0, 10);
}
function safeTokenCompare(a, b) { return typeof a === 'string' && typeof b === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)); }

app.post('/api/login', (req, res) => {
  const token = String(req.body?.token || '');
  const id = Object.keys(tokens).find((key) => safeTokenCompare(tokens[key], token));
  if (!(sharedToken && safeTokenCompare(sharedToken, token)) && !id) return res.status(401).json({ error: 'Invalid household token' });
  res.json({ shared: Boolean(sharedToken && safeTokenCompare(sharedToken, token)), roommate: id || 'A', names });
});

app.get('/api/state', auth, (req, res) => {
  const week = weekKey(req.query.week); const rows = db.prepare('SELECT * FROM checkins WHERE week = ?').all(week);
  const selected = ['A', 'B', 'C', 'D'].includes(String(req.query.roommate)) ? String(req.query.roommate) : req.roommate;
  const assigned = db.prepare('SELECT * FROM chores WHERE cycle_start = ?').all(week);
  res.json({ me: selected, names, week, chores, checkins: rows, assignments: assigned, shared: Boolean(req.shared) });
});

app.put('/api/checkins', auth, (req, res) => {
  if (req.shared) req.roommate = String(req.body?.roommate || '');
  if (!['A', 'B', 'C', 'D'].includes(req.roommate)) return res.status(400).json({ error: 'Choose a roommate' });
  const week = weekKey(req.body?.week); const day = String(req.body?.day || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return res.status(400).json({ error: 'Invalid day' });
  const existing = db.prepare('SELECT * FROM checkins WHERE roommate = ? AND week = ? AND day = ?').get(req.roommate, week, day) || {};
  const attended = req.body?.attended === undefined ? Number(existing.attended || 0) : (req.body.attended ? 1 : 0);
  const workout = req.body?.workout === undefined ? Number(existing.workout || 0) : (req.body.workout ? 1 : 0);
  const cleanFood = req.body?.clean_food === undefined ? Number(existing.clean_food || 0) : (req.body.clean_food ? 1 : 0);
  const steps = req.body?.steps === undefined ? Number(existing.steps || 0) : Math.max(0, Math.min(50000, Number(req.body.steps || 0)));
  db.prepare(`INSERT INTO checkins (roommate, week, day, attended, workout, clean_food, steps, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(roommate, week, day) DO UPDATE SET attended=excluded.attended, workout=excluded.workout, clean_food=excluded.clean_food, steps=excluded.steps, updated_at=excluded.updated_at`)
    .run(req.roommate, week, day, attended, workout, cleanFood, steps);
  res.json({ ok: true });
});

app.put('/api/chores/:id', auth, (req, res) => {
  const id = Number(req.params.id); const done = req.body?.done ? 1 : 0;
  const row = db.prepare('SELECT roommate FROM chores WHERE id = ?').get(id);
  if (!row || (!req.shared && row.roommate !== req.roommate)) return res.status(403).json({ error: 'You can only update your own chores' });
  db.prepare('UPDATE chores SET done = ? WHERE id = ?').run(done, id); res.json({ ok: true });
});

app.post('/api/assignments', auth, (req, res) => {
  if (req.body?.roommate !== req.roommate) return res.status(403).json({ error: 'You can only assign your own chores' });
  const code = String(req.body?.code || ''); if (!chores[code]) return res.status(400).json({ error: 'Unknown chore' });
  const cycle = weekKey(req.body?.cycle_start); db.prepare('INSERT OR IGNORE INTO chores (roommate, cycle_start, code) VALUES (?, ?, ?)').run(req.roommate, cycle, code); res.json({ ok: true });
});

app.get('*', (_req, res) => res.sendFile(path.join(root, 'public', 'index.html')));
app.listen(port, () => console.log(`Roommate Rally running on http://localhost:${port}`));
