import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = "/Users/xiemingsi/WorkSpace/smzdd";

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
}

test("providers.json should have unique name+slug and valid website", () => {
  const providers = readJson("data/providers.json");
  assert.ok(Array.isArray(providers));
  assert.ok(providers.length >= 25);

  const slugSet = new Set();
  const nameSet = new Set();

  for (const p of providers) {
    assert.equal(typeof p.name, "string");
    assert.equal(typeof p.slug, "string");
    assert.equal(typeof p.website, "string");
    assert.ok(p.name.length > 0);
    assert.ok(p.slug.length > 0);
    assert.ok(p.website.startsWith("http://") || p.website.startsWith("https://"));

    assert.ok(!slugSet.has(p.slug), `duplicate slug: ${p.slug}`);
    assert.ok(!nameSet.has(p.name), `duplicate name: ${p.name}`);
    slugSet.add(p.slug);
    nameSet.add(p.name);

    assert.ok(Array.isArray(p.tags), `tags should be array for ${p.slug}`);
    assert.ok(Array.isArray(p.models), `models should be array for ${p.slug}`);
  }
});

test("provider models should reference model-catalog entries", () => {
  const providers = readJson("data/providers.json");
  const models = readJson("data/model-catalog.json");
  const modelNameSet = new Set(models.map((m) => m.name));

  for (const p of providers) {
    for (const m of p.models) {
      assert.ok(modelNameSet.has(m.model), `unknown model '${m.model}' in provider ${p.slug}`);
      assert.equal(typeof m.pricingType, "string");
      assert.equal(typeof m.currency, "string");
    }
  }
});

test("scoring config should contain valid weight sum", () => {
  const scoring = readJson("data/scoring-config.json");
  const { priceWeight, uptimeWeight, reviewWeight } = scoring.weights;
  const sum = priceWeight + uptimeWeight + reviewWeight;
  assert.ok(Math.abs(sum - 1) < 1e-9, `weights sum must be 1, got ${sum}`);
});

test("admin settings should contain valid scheduler fields", () => {
  const settings = readJson("data/admin-settings.json");
  assert.equal(typeof settings.probeScheduler.enabled, "boolean");
  assert.equal(typeof settings.probeScheduler.intervalMinutes, "number");
  assert.equal(typeof settings.probeScheduler.timeoutMs, "number");
  assert.equal(typeof settings.probeScheduler.maxJobsPerSweep, "number");
  assert.ok(settings.probeScheduler.intervalMinutes >= 5);
  assert.equal(typeof settings.sampleModel, "string");
  assert.ok(settings.sampleModel.length > 0);
});

test("new providers should be included with non-empty model lists", () => {
  const providers = readJson("data/providers.json");
  const providerMap = new Map(providers.map((item) => [item.slug, item]));

  const autocode = providerMap.get("autocode-space");
  assert.ok(autocode, "autocode-space should exist");
  assert.equal(autocode.website, "https://api.autocode.space");
  assert.ok(Array.isArray(autocode.models) && autocode.models.length >= 4);

  const vbcode = providerMap.get("vbcode");
  assert.ok(vbcode, "vbcode should exist");
  assert.equal(vbcode.website, "https://vbcode.io");
  assert.ok(Array.isArray(vbcode.models) && vbcode.models.length >= 10);
});
