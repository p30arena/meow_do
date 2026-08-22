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

test("SQLite mode boots and serves authenticated workspace data", async () => {
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
    const workspaces = await fetch(`http://127.0.0.1:${port}/api/v1/workspaces`, {
      headers: { Authorization: `Bearer ${session.token}` },
    });
    assert.equal(workspaces.status, 200);
    assert.deepEqual(await workspaces.json(), []);
  } finally {
    try { process.kill(-child.pid, "SIGTERM"); } catch {}
    await rm(database, { force: true });
  }
});
