import test from "node:test";
import assert from "node:assert/strict";
import { listFiles, readText } from "./helpers/fs-test-utils.mjs";

const methodExportPattern = /export\s+async\s+function\s+(GET|POST|PATCH|PUT|DELETE)\s*\(/g;

test("all api route files should export at least one HTTP method handler", () => {
  const routeFiles = listFiles("src/app/api", (relPath) => relPath.endsWith("/route.ts"));
  assert.ok(routeFiles.length >= 20, "api route files count is unexpectedly low");

  for (const routePath of routeFiles) {
    const source = readText(routePath);
    const matches = source.match(methodExportPattern) ?? [];
    assert.ok(matches.length >= 1, `route should export at least one handler: ${routePath}`);
  }
});

test("api routes should keep unified response/handler conventions", () => {
  const routeFiles = listFiles("src/app/api", (relPath) => relPath.endsWith("/route.ts"));
  for (const routePath of routeFiles) {
    if (routePath === "src/app/api/auth/logout/route.ts") continue;
    const source = readText(routePath);
    const hasWrapper = source.includes("withApiHandler(");
    const hasApiSuccess = source.includes("apiSuccess(");
    assert.ok(hasWrapper || hasApiSuccess, `route should use withApiHandler/apiSuccess: ${routePath}`);
  }
});
