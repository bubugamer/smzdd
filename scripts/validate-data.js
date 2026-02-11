const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");

function readJson(file) {
  const fullPath = path.join(dataDir, file);
  return JSON.parse(fs.readFileSync(fullPath, "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validate() {
  const providers = readJson("providers.json");
  const models = readJson("model-catalog.json");
  const scoring = readJson("scoring-config.json");
  const metadata = readJson("seed-metadata.json");
  const adminSettings = readJson("admin-settings.json");

  assert(Array.isArray(providers), "providers.json must be an array");
  assert(Array.isArray(models), "model-catalog.json must be an array");
  assert(typeof scoring === "object" && scoring !== null, "scoring-config.json must be an object");
  assert(typeof metadata === "object" && metadata !== null, "seed-metadata.json must be an object");
  assert(typeof adminSettings === "object" && adminSettings !== null, "admin-settings.json must be an object");

  const modelNames = new Set();
  for (const model of models) {
    assert(isNonEmptyString(model.name), "model.name is required");
    assert(isNonEmptyString(model.displayName), `model.displayName is required for ${model.name}`);
    assert(Array.isArray(model.modality), `model.modality must be array for ${model.name}`);
    assert(!modelNames.has(model.name), `duplicate model name: ${model.name}`);
    modelNames.add(model.name);
  }

  const providerSlugs = new Set();
  for (const provider of providers) {
    assert(isNonEmptyString(provider.name), "provider.name is required");
    assert(isNonEmptyString(provider.slug), `provider.slug is required for ${provider.name}`);
    assert(isNonEmptyString(provider.website), `provider.website is required for ${provider.slug}`);
    assert(Array.isArray(provider.tags), `provider.tags must be array for ${provider.slug}`);
    assert(Array.isArray(provider.models), `provider.models must be array for ${provider.slug}`);
    assert(!providerSlugs.has(provider.slug), `duplicate provider slug: ${provider.slug}`);
    providerSlugs.add(provider.slug);

    for (const modelEntry of provider.models) {
      assert(isNonEmptyString(modelEntry.model), `provider model ref missing for ${provider.slug}`);
      assert(modelNames.has(modelEntry.model), `unknown model '${modelEntry.model}' in provider ${provider.slug}`);
      assert(isNonEmptyString(modelEntry.pricingType), `pricingType missing in ${provider.slug}/${modelEntry.model}`);
      assert(isNonEmptyString(modelEntry.currency), `currency missing in ${provider.slug}/${modelEntry.model}`);
      if (modelEntry.inputPricePerMillion !== null && modelEntry.inputPricePerMillion !== undefined) {
        assert(typeof modelEntry.inputPricePerMillion === "number", `inputPricePerMillion must be number in ${provider.slug}/${modelEntry.model}`);
      }
      if (modelEntry.outputPricePerMillion !== null && modelEntry.outputPricePerMillion !== undefined) {
        assert(typeof modelEntry.outputPricePerMillion === "number", `outputPricePerMillion must be number in ${provider.slug}/${modelEntry.model}`);
      }
    }
  }

  assert(typeof scoring.weights === "object" && scoring.weights !== null, "scoring-config.weights must be object");
  const w = scoring.weights;
  assert(typeof w.priceWeight === "number", "scoring-config.weights.priceWeight must be number");
  assert(typeof w.uptimeWeight === "number", "scoring-config.weights.uptimeWeight must be number");
  assert(typeof w.reviewWeight === "number", "scoring-config.weights.reviewWeight must be number");

  assert(isNonEmptyString(metadata.version), "seed-metadata.version is required");
  assert(Array.isArray(metadata.sources), "seed-metadata.sources must be array");
  assert(typeof adminSettings.probeScheduler === "object" && adminSettings.probeScheduler !== null, "admin-settings.probeScheduler must be object");
  assert(typeof adminSettings.probeScheduler.enabled === "boolean", "probeScheduler.enabled must be boolean");
  assert(typeof adminSettings.probeScheduler.intervalMinutes === "number", "probeScheduler.intervalMinutes must be number");
  assert(typeof adminSettings.probeScheduler.timeoutMs === "number", "probeScheduler.timeoutMs must be number");
  assert(typeof adminSettings.probeScheduler.maxJobsPerSweep === "number", "probeScheduler.maxJobsPerSweep must be number");

  console.log(`Data validation passed: providers=${providers.length}, models=${models.length}`);
}

try {
  validate();
} catch (error) {
  console.error(`Data validation failed: ${error.message}`);
  process.exit(1);
}
