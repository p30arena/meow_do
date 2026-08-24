// E2E: verify sqlite-mode getGoals/getWorkspaces now compute real
// totalProgress / hasRunningTask / isShared values.
process.env.DB_DRIVER = 'sqlite';
process.env.SQLITE_PATH = `/tmp/meowdo_prog_${Date.now()}.sqlite`;
process.env.JWT_SECRET = 'test-secret-e2e';
process.env.PORT = '4801';

await import('./src/index.ts');
await new Promise((r) => setTimeout(r, 1200));

const BASE = 'http://localhost:4801/api/v1';
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
await api('POST', '/auth/register', { body: { username: `p${sfx}`, email: `p${sfx}@test.example`, password: 'Passw0rd123' } });
const login = await api('POST', '/auth/login', { body: { email: `p${sfx}@test.example`, password: 'Passw0rd123' } });
const token = login.token ?? login.data?.token;
const ws = await api('POST', '/workspaces', { token, body: { name: 'ws' } });
const goal = await api('POST', '/goals', { token, body: { workspaceId: ws.id, name: 'goal-a' } });

// task A budget 60m, task B budget 30m -> sum 90
const taskA = await api('POST', '/tasks', { token, body: { goalId: goal.id, name: 'a', timeBudget: 60 } });
await api('POST', '/tasks', { token, body: { goalId: goal.id, name: 'b', timeBudget: 30 } });

await t('fresh goal: progress 0, not running', async () => {
  const goals = await api('GET', `/goals?workspaceId=${ws.id}`, { token });
  const g = goals[0];
  if (g.totalProgress !== 0) throw new Error('expected 0 progress, got ' + g.totalProgress);
  if (g.hasRunningTask !== false) throw new Error('expected hasRunningTask=false');
  if (g.taskCount !== 2) throw new Error('expected taskCount=2, got ' + g.taskCount);
  return { progress: g.totalProgress, running: g.hasRunningTask };
});

await t('workspace mirrors the same fresh state', async () => {
  const list = await api('GET', '/workspaces', { token });
  const w = list[0];
  if (w.totalProgress !== 0) throw new Error('progress ' + w.totalProgress);
  if (w.goalCount !== 1 || w.taskCount !== 2) throw new Error(`counts ${w.goalCount}/${w.taskCount}`);
  return { progress: w.totalProgress, goals: w.goalCount, tasks: w.taskCount };
});

let recordId;
await t('start tracking -> hasRunningTask flips true on both levels', async () => {
  const r = await api('POST', `/tasks/${taskA.id}/start`, { token, body: {} });
  recordId = r.record.id;
  const goals = await api('GET', `/goals?workspaceId=${ws.id}`, { token });
  const list = await api('GET', '/workspaces', { token });
  if (goals[0].hasRunningTask !== true) throw new Error('goal flag false');
  if (list[0].hasRunningTask !== true) throw new Error('ws flag false');
  return 'both flags true';
});

await new Promise((r) => setTimeout(r, 61000)); // track ~61s = ~1.02 minutes

await t('stop -> daily tracked minutes feed progress (~1m of 90m ≈ 1.1%)', async () => {
  await api('POST', `/tasks/${recordId}/stop`, { token, body: {} });
  const goals = await api('GET', `/goals?workspaceId=${ws.id}`, { token });
  const p = goals[0].totalProgress;
  if (!(p > 0)) throw new Error('progress still 0 after tracking');
  if (p > 5) throw new Error('progress too high: ' + p);
  const list = await api('GET', '/workspaces', { token });
  if (Math.abs(list[0].totalProgress - p) > 0.5) throw new Error(`ws/goal mismatch ${list[0].totalProgress} vs ${p}`);
  if (goals[0].hasRunningTask !== false) throw new Error('running flag stuck true');
  return { goalProgress: Number(p.toFixed(2)), wsProgress: Number(list[0].totalProgress.toFixed(2)) };
});

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures ? 1 : 0);
