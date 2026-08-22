import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

 test("production bundle stays within mobile budgets", () => {
  const output = execFileSync(process.execPath, ["scripts/check-bundle.mjs"], { encoding: "utf8" });
  assert.match(output, /Initial entry: .*\(\d+ B gzip\)/);
  assert.match(output, /Largest async chunk: .*\(\d+ B gzip\)/);
  assert.match(output, /Precache bytes: \d+/);
});
