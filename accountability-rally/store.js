// GitHub-as-database: all data lives in one JSON file in a (private) repo, read/written with the GitHub Contents API.
import { CONFIG } from './config.js';
const { owner, repo, path = 'data.json', branch = 'main' } = CONFIG.github;
const api = `https://api.github.com/repos/${owner}/${repo}`, url = `${api}/contents/${path}`;
const KEYS = { checkins: r => r.roommate_id + r.day, weekly_summaries: r => r.roommate_id + r.week_start, chores: r => r.id, consequences: r => r.roommate_id + r.month };
const hdr = t => ({ Authorization: `Bearer ${t}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' });
const empty = () => ({ checkins: [], weekly_summaries: [], chores: [], consequences: [] });
const dec = b => decodeURIComponent(escape(atob(b.replace(/\n/g, ''))));
const enc = s => btoa(unescape(encodeURIComponent(s)));

async function read(token) {
  const r = await fetch(`${url}?ref=${branch}`, { headers: hdr(token), cache: 'no-store' });
  if (r.status === 404) { // file missing is fine (first run); repo missing / no access is not
    if (!(await fetch(api, { headers: hdr(token) })).ok) throw new Error('Repository not found or token has no access to it');
    return { data: empty(), sha: null };
  }
  if (r.status === 401) throw new Error('Invalid GitHub token');
  if (!r.ok) throw new Error(`GitHub error ${r.status}`);
  const j = await r.json();
  return { data: { ...empty(), ...JSON.parse(dec(j.content)) }, sha: j.sha };
}
export const load = async token => (await read(token)).data;

async function commit(token, ops) { // re-reads, applies changes, writes; retries if someone saved at the same moment
  for (let i = 0; i < 4; i++) {
    const { data, sha } = await read(token);
    for (const [tbl, row] of ops) { const k = KEYS[tbl]; data[tbl] = [...data[tbl].filter(x => k(x) !== k(row)), row]; }
    const body = { message: 'Rally update', branch, content: enc(JSON.stringify(data)), ...(sha && { sha }) };
    const r = await fetch(url, { method: 'PUT', headers: hdr(token), body: JSON.stringify(body) });
    if (r.ok) return;
    if (r.status !== 409 && r.status !== 422) throw new Error(r.status === 403 ? 'Token cannot write (needs Contents: read & write)' : `GitHub error ${r.status}`);
  }
  throw new Error('Save conflict, please try again');
}
let q = Promise.resolve(); // one write at a time
export const save = (token, ops) => (q = q.catch(() => {}).then(() => commit(token, ops)));
