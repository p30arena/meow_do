/**
 * Demo seed script (Phase 0 foundations).
 *
 * Creates an idempotent demo dataset behind the `[demo]` name prefix:
 * 1 user, 2 workspaces, 3 goals, ~12 tasks across all statuses/priorities,
 * a couple of tracking records, and 1 pending share invitation.
 *
 * Usage:
 *   DEMO_EMAIL=demo@example.com DEMO_PASSWORD=secret123 \
 *   DEMO_GUEST_EMAIL=guest@example.com \
 *   API=http://127.0.0.1:3000/api/v1 node scripts/seed-demo.mjs
 *
 * Re-running is safe: existing `[demo]` rows are reused, never duplicated.
 */

const API = process.env.API ?? "http://127.0.0.1:3000/api/v1";
const DEMO_EMAIL = process.env.DEMO_EMAIL ?? "demo@example.com";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "secret1234";
const GUEST_EMAIL = process.env.DEMO_GUEST_EMAIL ?? "guest@example.com";

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${data.message ?? JSON.stringify(data)}`);
  }
  return data;
}

async function ensureUser(username, email, password) {
  try {
    const reg = await api("/auth/register", {
      method: "POST",
      body: { username, email, password },
    });
    console.log(`registered ${email}`);
    return reg.token;
  } catch (err) {
    if (String(err.message).includes("already exists")) {
      const login = await api("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      console.log(`reusing ${email}`);
      return login.token;
    }
    throw err;
  }
}

async function ensureWorkspace(token, name, description) {
  const list = await api("/workspaces", { token });
  const found = list.find((w) => w.name === name);
  if (found) return found;
  return api("/workspaces", { method: "POST", token, body: { name, description } });
}

async function ensureGoal(token, workspaceId, name, description) {
  const list = await api(`/goals?workspaceId=${workspaceId}`, { token });
  const found = list.find((g) => g.name === name);
  if (found) return found;
  return api("/goals", { method: "POST", token, body: { workspaceId, name, description } });
}

async function ensureTask(token, goalId, spec, position) {
  const list = await api(`/tasks?goalId=${goalId}`, { token });
  const found = list.find((t) => t.name === spec.name);
  if (found) return found;
  return api("/tasks", {
    method: "POST",
    token,
    body: { goalId, position, ...spec },
  });
}

const DEMO_TASKS = [
  { name: "[demo] Morning pages", timeBudget: 30, status: "done", priority: 5 },
  { name: "[demo] Inbox triage", timeBudget: 20, status: "done", priority: 7 },
  { name: "[demo] Deep work block", timeBudget: 120, status: "started", priority: 10 },
  { name: "[demo] Code review", timeBudget: 45, status: "pending", priority: 8 },
  { name: "[demo] Write changelog", timeBudget: 30, status: "pending", priority: 4 },
  { name: "[demo] Fix flaky test", timeBudget: 60, status: "failed", priority: 9 },
  { name: "[demo] Plan tomorrow", timeBudget: 15, status: "pending", priority: 3 },
  { name: "[demo] Read industry news", timeBudget: 25, status: "pending", priority: 2 },
  { name: "[demo] Workout", timeBudget: 45, status: "pending", priority: 6 },
  { name: "[demo] Call accountant", timeBudget: 20, status: "pending", priority: 8 },
  { name: "[demo] Backup laptop", timeBudget: 15, status: "done", priority: 4 },
  { name: "[demo] Weekly review", timeBudget: 60, status: "pending", priority: 9 },
];

async function main() {
  const token = await ensureUser("demo", DEMO_EMAIL, DEMO_PASSWORD);
  await ensureUser("guest", GUEST_EMAIL, DEMO_PASSWORD);

  const personal = await ensureWorkspace(token, "[demo] Personal", "Demo personal workspace");
  const work = await ensureWorkspace(token, "[demo] Client work", "Demo client workspace");

  const habits = await ensureGoal(token, personal.id, "[demo] Daily habits", "Demo habits goal");
  const launch = await ensureGoal(token, work.id, "[demo] Launch v1", "Demo launch goal");
  const admin = await ensureGoal(token, work.id, "[demo] Admin", "Demo admin goal");

  const thirds = [habits, launch, admin];
  for (let i = 0; i < DEMO_TASKS.length; i += 1) {
    const goal = thirds[i % thirds.length];
    await ensureTask(token, goal.id, DEMO_TASKS[i], Math.floor(i / thirds.length));
  }

  // One pending share invitation for the guest user (idempotent: the API
  // rejects duplicates, which we treat as "already invited").
  try {
    await api(`/workspaces-sharing/${work.id}/share`, {
      method: "POST",
      token,
      body: { identifier: GUEST_EMAIL, canList: true, canEdit: true },
    });
    console.log(`invited ${GUEST_EMAIL} to ${work.name}`);
  } catch (err) {
    console.log(`share skipped: ${err.message}`);
  }

  console.log("demo seed complete");
}

await main();
