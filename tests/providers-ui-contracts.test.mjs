import test from "node:test";
import assert from "node:assert/strict";
import { readText } from "./helpers/fs-test-utils.mjs";

test("providers list page should expose header-arrow sort interactions", () => {
  const source = readText("src/app/providers/page.tsx");
  assert.match(source, /renderSortableHeader/);
  assert.match(source, /aria-label=\{`\$\{label\} 升序`\}/);
  assert.match(source, /aria-label=\{`\$\{label\} 降序`\}/);
  assert.match(source, /↑/);
  assert.match(source, /↓/);
  assert.doesNotMatch(source, /应用筛选/);
});

test("provider detail page should include access panel and section anchors", () => {
  const source = readText("src/app/providers/[slug]/page.tsx");
  assert.match(source, /Panel title="访问地址"/);
  assert.match(source, /CopyButton/);
  assert.match(source, /href="#basic"/);
  assert.match(source, /href="#pricing"/);
  assert.match(source, /href="#probes"/);
  assert.match(source, /href="#reviews"/);
  assert.match(source, /Panel title="最近评价（10条）"/);
  assert.match(source, /title="探针摘要（最近20条）"/);
  assert.match(source, /ReviewSubmitForm/);
  assert.match(source, /"昵称"/);
  assert.match(source, /"匿名用户"/);
});
