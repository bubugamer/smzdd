const { spawn } = require("node:child_process");
const fs = require("node:fs");

const PORT = 3021;
const BASE = `http://127.0.0.1:${PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {}
    await sleep(500);
  }
  throw new Error("dev server did not become ready in time");
}

async function request(path, init) {
  const res = await fetch(`${BASE}${path}`, init);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text, headers: res.headers };
}

async function run() {
  const logFile = "/tmp/smzdd-smoke-test.log";
  const out = fs.openSync(logFile, "a");
  const dev = spawn("npm", ["run", "dev", "--", "--port", String(PORT)], {
    cwd: "/Users/xiemingsi/WorkSpace/smzdd",
    stdio: ["ignore", out, out],
    detached: false,
  });

  let createdSlug = null;

  try {
    await waitForServer();

    const health = await request("/api/health");
    if (health.status !== 200 || !health.json?.data?.status) {
      throw new Error(`health check failed: ${health.status}`);
    }

    const unauthWrite = await request("/api/providers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Smoke Provider", slug: "smoke-provider", website: "https://smoke.example.com" }),
    });
    if (unauthWrite.status !== 401) {
      throw new Error(`unauthorized write expected 401, got ${unauthWrite.status}`);
    }

    const unauthAdminImport = await request("/api/admin/import/csv", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ entity: "providers", csvText: "name,slug,website\nx,x,https://x.com\n", dryRun: true }),
    });
    if (unauthAdminImport.status !== 401) {
      throw new Error(`unauthorized admin import expected 401, got ${unauthAdminImport.status}`);
    }

    const login = await request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD || "admin123" }),
    });
    if (login.status !== 200) {
      throw new Error(`login failed: ${login.status}`);
    }

    const setCookie = login.headers.get("set-cookie");
    if (!setCookie) {
      throw new Error("login did not return set-cookie header");
    }

    const authHeaders = {
      "content-type": "application/json",
      cookie: setCookie.split(";")[0],
    };

    createdSlug = `smoke-provider-${Date.now()}`;
    const create = await request("/api/providers", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        name: "Smoke Provider",
        slug: createdSlug,
        website: "https://smoke.example.com",
        status: "TESTING",
      }),
    });
    if (create.status !== 201) {
      throw new Error(`authorized create failed: ${create.status}`);
    }

    const list = await request(`/api/providers?search=${createdSlug}&pageSize=1`, {
      headers: { cookie: authHeaders.cookie },
    });
    if (list.status !== 200 || !list.json?.data?.items?.[0]?.slug) {
      throw new Error(`provider search failed: ${list.status}`);
    }
    if (list.json?.data?.items?.[0]?.samplePricing !== null) {
      throw new Error("new provider should not have samplePricing for GPT-5.2 by default");
    }

    const settings = await request("/api/settings", {
      headers: { cookie: authHeaders.cookie },
    });
    if (settings.status !== 200 || !settings.json?.data?.scoringConfig?.weights) {
      throw new Error(`settings read failed: ${settings.status}`);
    }

    const csvDryRun = await request("/api/admin/import/csv", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        entity: "providers",
        dryRun: true,
        csvText: "name,slug,website,status\nSmoke Csv,smoke-csv,https://csv.example.com,ACTIVE\n",
      }),
    });
    if (csvDryRun.status !== 200 || csvDryRun.json?.data?.dryRun !== true) {
      throw new Error(`csv dry-run failed: ${csvDryRun.status}`);
    }

    const providerList = await request("/api/providers?page=1&pageSize=1", {
      headers: { cookie: authHeaders.cookie },
    });
    const reviewProviderId = providerList.json?.data?.items?.[0]?.id;
    if (!reviewProviderId) {
      throw new Error("provider id not found for review test");
    }

    const sortedProviders = await request("/api/providers?page=1&pageSize=5&sortBy=inputPrice&sortOrder=asc&sampleModel=gpt-5.2", {
      headers: { cookie: authHeaders.cookie },
    });
    if (sortedProviders.status !== 200 || !Array.isArray(sortedProviders.json?.data?.items)) {
      throw new Error(`providers sort/sampleModel query failed: ${sortedProviders.status}`);
    }
    const firstItem = sortedProviders.json.data.items[0];
    if (firstItem && firstItem.samplePricing && firstItem.samplePricing.model !== "gpt-5.2") {
      throw new Error("samplePricing.model should match sampleModel=gpt-5.2");
    }
    if (sortedProviders.json?.data?.items?.length > 0) {
      const selectedSlug = sortedProviders.json.data.items[0].slug;
      const selectedOnly = await request(`/api/providers?page=1&pageSize=10&selected=${selectedSlug}`, {
        headers: { cookie: authHeaders.cookie },
      });
      if (selectedOnly.status !== 200 || selectedOnly.json?.data?.items?.some((item) => item.slug !== selectedSlug)) {
        throw new Error("selected slug filtering failed");
      }
    }

    const reviewCreate = await request("/api/reviews", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        providerId: reviewProviderId,
        rating: 5,
        title: "Smoke Review",
        content: "smoke content",
      }),
    });
    if (reviewCreate.status !== 201 || !reviewCreate.json?.data?.id) {
      throw new Error(`review create failed: ${reviewCreate.status}`);
    }
    const reviewId = reviewCreate.json.data.id;

    const reviewDelete = await request(`/api/reviews/${reviewId}`, {
      method: "DELETE",
      headers: { cookie: authHeaders.cookie },
    });
    if (reviewDelete.status !== 200) {
      throw new Error(`review delete failed: ${reviewDelete.status}`);
    }

    const remove = await request(`/api/providers/${createdSlug}`, {
      method: "DELETE",
      headers: { cookie: authHeaders.cookie },
    });
    if (remove.status !== 200) {
      throw new Error(`cleanup delete failed: ${remove.status}`);
    }

    createdSlug = null;
    console.log("Smoke test passed");
  } finally {
    if (createdSlug) {
      try {
        await request(`/api/providers/${createdSlug}`, { method: "DELETE" });
      } catch {}
    }
    if (dev.pid) {
      try {
        process.kill(dev.pid, "SIGTERM");
      } catch {}
    }
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
