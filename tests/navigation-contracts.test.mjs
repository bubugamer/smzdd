import test from "node:test";
import assert from "node:assert/strict";
import { exists, readText } from "./helpers/fs-test-utils.mjs";

function extractHrefs(source) {
  const rows = [];
  const regex = /href:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(source))) {
    rows.push(match[1]);
  }
  return rows;
}

function hrefToPagePath(href) {
  if (href === "/") return "src/app/page.tsx";
  return `src/app${href}/page.tsx`;
}

test("site navigation links should map to existing pages", () => {
  const source = readText("src/components/layout/site-shell.tsx");
  const hrefs = extractHrefs(source);
  assert.ok(hrefs.length >= 6);
  for (const href of hrefs) {
    const pagePath = hrefToPagePath(href);
    assert.ok(exists(pagePath), `site nav href has no page: ${href} -> ${pagePath}`);
  }
});

test("admin navigation links should map to existing pages", () => {
  const source = readText("src/components/admin/admin-shell.tsx");
  const hrefs = extractHrefs(source);
  assert.ok(hrefs.length >= 7);
  for (const href of hrefs) {
    const pagePath = hrefToPagePath(href);
    assert.ok(exists(pagePath), `admin nav href has no page: ${href} -> ${pagePath}`);
  }
});
