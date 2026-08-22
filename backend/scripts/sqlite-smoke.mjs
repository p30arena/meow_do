import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";

const port = 3210;
const database = "/tmp/meowdo-sqlite-test.sqlite";

function waitForServer(child) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("SQLite backend did not start")), 15000);
    child.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("Server is running")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code && code !== 0) reject(new Error(`SQLite backend exited with ${code}`));
    });
  });
}

test("SQLite mode serves the core authenticated workflow", async () => {
  await rm(database, { force: true });
  const child = spawn("npm", ["run", "dev"], {
    cwd: process.cwd(),
    env: { ...process.env, DB_DRIVER: "sqlite", SQLITE_PATH: database, JWT_SECRET: "sqlite-test", PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
  });
  try {
    await waitForServer(child);
    const root = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(await root.text(), "MeowDo Backend is running!");

    const register = await fetch(`http://127.0.0.1:${port}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "smoke", email: "smoke@example.com", password: "secret123" }),
    });
    assert.equal(register.status, 201);
    const session = await register.json();
    const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${session.token}` };

    const group = await fetch(`http://127.0.0.1:${port}/api/v1/workspaces/groups`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ name: "Focus" }),
    });
    assert.equal(group.status, 201);
    const groupData = await group.json();

    const renamedGroup = await fetch(`http://127.0.0.1:${port}/api/v1/workspaces/groups/${groupData.id}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({ name: "Deep Work" }),
    });
    assert.equal(renamedGroup.status, 200);

    const workspaceCreate = await fetch(`http://127.0.0.1:${port}/api/v1/workspaces`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ name: "SQLite workspace", groupName: "Deep Work" }),
    });
    assert.equal(workspaceCreate.status, 201);
    const workspace = await workspaceCreate.json();

    const goalCreate = await fetch(`http://127.0.0.1:${port}/api/v1/goals`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ workspaceId: workspace.id, name: "SQLite goal" }),
    });
    assert.equal(goalCreate.status, 201);
    const goal = await goalCreate.json();

    const taskCreate = await fetch(`http://127.0.0.1:${port}/api/v1/tasks`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ goalId: goal.id, name: "SQLite task", timeBudget: 30, priority: 1 }),
    });
    assert.equal(taskCreate.status, 201);
    const task = await taskCreate.json();

    const start = await fetch(`http://127.0.0.1:${port}/api/v1/tasks/${task.id}/start`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ taskId: task.id, userId: session.user.id }),
    });
    assert.equal(start.status, 201);
    const tracking = await start.json();

    const stop = await fetch(`http://127.0.0.1:${port}/api/v1/tasks/${tracking.record.id}/stop`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ stopTime: new Date(Date.now() + 1000).toISOString() }),
    });
    assert.equal(stop.status, 200);

    const summary = await fetch(`http://127.0.0.1:${port}/api/v1/tasks/summary?period=total&goalId=${goal.id}`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    assert.equal(summary.status, 200);
    assert.equal((await summary.json())[0].taskName, "SQLite task");
  } finally {
    try { process.kill(-child.pid, "SIGTERM"); } catch {}
    await rm(database, { force: true });
  }
});
