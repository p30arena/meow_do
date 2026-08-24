// E2E round 2: stop via the tracking-record id (as the frontend does),
// then verify duration is computed and summaries are non-zero.
process.env.DB_DRIVER = 'sqlite';
process.env.SQLITE_PATH = `/tmp/meowdo_e2e2_${Date.now()}.sqlite`;
process.env.JWT_SECRET = 'test-secret-e2e';
process.env.PORT = '4799';

await import('./src/index.ts');
await new Promise((r) => setTimeout(r, 1200));

const BASE = 'http://localhost:4799/api/v1';
let failures = 0;
const t = async (name, fn) => {
  try { console.log(`PASS ${name}`, JSON.stringify(await fn()) ?? ''); }
  catch (e) { failures++; console.log(`FAIL ${name}:`, e.message); }
};
async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${data?.message}`);
  return data;
}

const sfx = Date.now();
await api('POST', '/auth/register', { body: { username: `g${sfx}`, email: `g${sfx}@test.example`, password: 'Passw0rd123' } });
const login = await api('POST', '/auth/login', { body: { email: `g${sfx}@test.example`, password: 'Passw0rd123' } });
console.log('login response:', JSON.stringify(login).slice(0, 200));
const token = login.token ?? login.data?.token;
const ws = await api('POST', '/workspaces', { token, body: { name: 'ws' } });
const goal = await api('POST', '/goals', { token, body: { workspaceId: ws.id, name: 'goal' } });
const task = await api('POST', '/tasks', { token, body: { goalId: goal.id, name: 'task-a', timeBudget: 30, priority: 5 } });

let recordId;
await t('start tracking returns record id', async () => {
  const r = await api('POST', `/tasks/${task.id}/start`, { token, body: {} });
  recordId = r.record?.id;
  if (!recordId) throw new Error('no record id in response');
});

await new Promise((r) => setTimeout(r, 2100)); // track for ~2s

await t('stop via tracking-record id computes duration', async () => {
  const r = await api('POST', `/tasks/${recordId}/stop`, { token, body: {} });
  const dur = r.record?.duration;
  if (!(dur > 0)) throw new Error('duration not computed: ' + JSON.stringify(r.record));
  return { durationSeconds: dur };
});

await t('summary day shows positive duration', async () => {
  const rows = await api('GET', `/tasks/summary?period=day&goalId=${goal.id}`, { token });
  const total = rows.reduce((a, r) => a + r.totalDurationSeconds, 0);
  if (total <= 0) throw new Error('zero duration in summary');
  return rows;
});

await t('getTasks has no stale open records after stop', async () => {
  const tasks = await api('GET', `/tasks?goalId=${goal.id}`, { token });
  if (tasks.some((x) => x.activeTracking && !x.activeTracking.endTime)) throw new Error('stale open record');
  return 'clean';
});

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures ? 1 : 0);
