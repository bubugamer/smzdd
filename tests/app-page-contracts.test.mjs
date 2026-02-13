import test from "node:test";
import assert from "node:assert/strict";
import { exists, listFiles, readText } from "./helpers/fs-test-utils.mjs";

const expectedPublicPages = [
  "src/app/page.tsx",
  "src/app/providers/page.tsx",
  "src/app/providers/[slug]/page.tsx",
  "src/app/models/page.tsx",
  "src/app/models/[id]/page.tsx",
  "src/app/rankings/page.tsx",
  "src/app/price-trends/page.tsx",
  "src/app/monitoring/page.tsx",
];

const expectedAdminPages = [
  "src/app/admin/page.tsx",
  "src/app/admin/login/page.tsx",
  "src/app/admin/providers/page.tsx",
  "src/app/admin/models/page.tsx",
  "src/app/admin/pricing/page.tsx",
  "src/app/admin/probes/page.tsx",
  "src/app/admin/reviews/page.tsx",
  "src/app/admin/settings/page.tsx",
];

test("public and admin pages should exist", () => {
  for (const pagePath of [...expectedPublicPages, ...expectedAdminPages]) {
    assert.ok(exists(pagePath), `missing page: ${pagePath}`);
  }
});

test("all app page files should export default page component", () => {
  const pageFiles = listFiles("src/app", (relPath) => relPath.endsWith("/page.tsx"));
  assert.ok(pageFiles.length >= expectedPublicPages.length + expectedAdminPages.length);

  for (const pagePath of pageFiles) {
    const source = readText(pagePath);
    assert.match(
      source,
      /export\s+default\s+(async\s+)?function\s+[A-Za-z0-9_]+/,
      `page should export default function: ${pagePath}`,
    );
  }
});

test("public pages should use SiteShell layout wrapper", () => {
  for (const pagePath of expectedPublicPages) {
    const source = readText(pagePath);
    assert.match(source, /SiteShell/, `public page should use SiteShell: ${pagePath}`);
  }
});

test("admin pages except login should use AdminShell layout wrapper", () => {
  for (const pagePath of expectedAdminPages) {
    if (pagePath.endsWith("/admin/login/page.tsx")) continue;
    const source = readText(pagePath);
    assert.match(source, /AdminShell/, `admin page should use AdminShell: ${pagePath}`);
  }
});
