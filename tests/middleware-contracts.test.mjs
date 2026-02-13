import test from "node:test";
import assert from "node:assert/strict";
import { readText } from "./helpers/fs-test-utils.mjs";

test("middleware should allow anonymous POST /api/reviews", () => {
  const source = readText("src/middleware.ts");
  assert.match(source, /pathname === "\/api\/reviews"/);
  assert.match(source, /method\.toUpperCase\(\) === "POST"/);
  assert.match(source, /return false;/);
});
