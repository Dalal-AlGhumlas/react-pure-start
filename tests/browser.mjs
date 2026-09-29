// Deterministic browser checks. Supabase is simulated; this does NOT certify a live project.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const base = "http://127.0.0.1:5178";
const api = "http://127.0.0.1:4399";
const rows = [];
const requests = [];
const userId = "11111111-1111-4111-8111-111111111111";
const memberId = "22222222-2222-4222-8222-222222222222";
const user = (admin) => ({
  id: admin ? userId : memberId,
  email: admin ? "admin@example.com" : "member@example.com",
  aud: "authenticated",
  role: "authenticated",
  created_at: new Date().toISOString(),
});
const tokenExpiry = Math.floor(Date.now() / 1000) + 3600;
const token = (admin) =>
  `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: admin ? userId : memberId, exp: tokenExpiry, role: "authenticated" })).toString("base64url")}.test-only-signature`;
let failInsert = false;
const mock = createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,HEAD,OPTIONS");
  res.setHeader("Access-Control-Expose-Headers", "Content-Range");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  const url = new URL(req.url, api);
  const isAdmin = req.headers.authorization === `Bearer ${token(true)}`;
  const isMember = req.headers.authorization === `Bearer ${token(false)}`;
  const service = req.headers.apikey === "sb_secret_test_server_only";
  let body = "";
  for await (const chunk of req) body += chunk;
  const json = body ? JSON.parse(body) : null;
  const reply = (data, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };
  if (url.pathname === "/auth/v1/token") {
    if (json.password !== "test-only") return reply({ message: "Invalid login credentials" }, 400);
    const admin = json.email === "admin@example.com";
    return reply({
      access_token: token(admin),
      refresh_token: "test-refresh",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: user(admin),
    });
  }
  if (url.pathname === "/auth/v1/user")
    return isAdmin || isMember ? reply(user(isAdmin)) : reply({ message: "Unauthorized" }, 401);
  if (url.pathname === "/auth/v1/logout") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (url.pathname === "/rest/v1/user_roles") return reply(isAdmin ? [{ role: "admin" }] : []);
  if (url.pathname === "/rest/v1/sponsorship_requests") {
    requests.push(req.method);
    if (req.method === "POST") {
      if (!service) return reply({ code: "42501", message: "Denied" }, 403);
      if (failInsert) return reply({ code: "TEST_FAILURE", message: "simulated failure" }, 500);
      const n = rows.length + 1;
      const row = {
        ...json,
        id: `33333333-3333-4333-8333-${String(n).padStart(12, "0")}`,
        reference_number: `LAW-2026-${String(n).padStart(4, "0")}`,
        status: "new",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      rows.push(row);
      return reply({ reference_number: row.reference_number }, 201);
    }
    if (!isAdmin) return reply({ code: "42501", message: "Denied" }, 403);
    const term = url.searchParams
      .get("or")
      ?.match(/ilike\.%(.*?)%/)?.[1]
      ?.toLowerCase();
    const matches = rows.filter(
      (row) =>
        (!term ||
          [row.reference_number, row.company_name, row.email].some((value) =>
            value.toLowerCase().includes(term),
          )) &&
        (!url.searchParams.has("status") ||
          `eq.${row.status}` === url.searchParams.get("status")) &&
        (!url.searchParams.has("id") || `eq.${row.id}` === url.searchParams.get("id")),
    );
    if (req.method === "PATCH") {
      matches.forEach((row) => {
        row.status = json.status;
        row.updated_at = new Date().toISOString();
      });
      return reply(
        matches.map((row) => ({ id: row.id, status: row.status, updated_at: row.updated_at })),
      );
    }
    const offset = Number(url.searchParams.get("offset") || 0),
      limit = Number(url.searchParams.get("limit") || 25);
    const items = matches.slice(offset, offset + limit);
    res.setHeader(
      "Content-Range",
      items.length
        ? `${offset}-${offset + items.length - 1}/${matches.length}`
        : `*/${matches.length}`,
    );
    if (req.method === "HEAD") {
      res.writeHead(200);
      res.end();
      return;
    }
    return reply(items);
  }
  reply({ message: "Mock endpoint not implemented" }, 404);
});
await new Promise((resolve) => mock.listen(4399, "127.0.0.1", resolve));
const env = {
  ...process.env,
  SUPABASE_URL: api,
  VITE_SUPABASE_URL: api,
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test_server_only",
};
const dev = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "dev", "--host", "127.0.0.1", "--port", "5178"],
  { env, stdio: ["ignore", "pipe", "pipe"] },
);
let logs = "";
dev.stdout.on("data", (d) => (logs += d));
dev.stderr.on("data", (d) => (logs += d));
let browser;
const results = [];
const record = (text) => {
  results.push(text);
  console.log("PASS", text);
};
try {
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    if (i === 119) throw new Error(`Dev server did not start: ${logs.slice(-2000)}`);
    await new Promise((r) => setTimeout(r, 500));
  }
  const launch = { headless: true };
  if (process.env.BROWSER_EXECUTABLE) launch.executablePath = process.env.BROWSER_EXECUTABLE;
  if (process.env.BROWSER_ARGS) launch.args = JSON.parse(process.env.BROWSER_ARGS);
  browser = await chromium.launch(launch);
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: "networkidle" });
  assert.equal(await page.locator("html").getAttribute("lang"), "ar");
  assert.equal(await page.locator('a[href="mailto:Development.lawclub@gmail.com"]').count(), 2);
  assert.equal(await page.locator("html").getAttribute("dir"), "rtl");
  let calls = 0;
  page.on("request", (r) => {
    if (r.url().includes("/_serverFn/")) calls++;
  });
  await page.locator("#sponsorship button[type=submit]").click();
  assert.equal(await page.locator("#sponsorship [aria-invalid=true]").count(), 7);
  assert.equal(calls, 0);
  assert.equal(rows.length, 0);
  assert.equal(await page.locator(":focus").getAttribute("id"), "fullName");
  record("Arabic blank form: seven field errors, first field focused, zero server requests");
  await page.getByRole("button", { name: "اللغة", exact: true }).click();
  assert.match(await page.locator("#fullName-error").innerText(), /first and last name/);
  assert.equal(await page.locator("html").getAttribute("dir"), "ltr");
  record("Existing field errors translate immediately when switching to English");
  async function fill() {
    for (const [id, value] of Object.entries({
      fullName: "Test Sponsor",
      companyName: "Test Organization",
      jobTitle: "Partnerships Manager",
      phone: "٠٥٥١٢٣٤٥٦٧",
      email: "qa@example.com",
    }))
      await page.locator(`#${id}`).fill(value);
    await page.locator("#partnershipType").selectOption("financial");
    await page.locator("#consent").check();
  }
  await fill();
  await page.locator("#website").fill("https://");
  await page.locator("#sponsorship button[type=submit]").click();
  assert.equal(calls, 0);
  assert.equal(rows.length, 0);
  await page.locator("#website-error").waitFor();
  record("Malformed website is rejected without reaching the server");
  await page.locator("#website").fill("https://example.com");
  await page.locator("#sponsorship button[type=submit]").dblclick();
  await page.getByRole("heading", { name: "Your Request Has Been Received" }).waitFor();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "new");
  assert.equal(rows[0].phone, "0551234567");
  assert.match(await page.locator("#sponsorship").innerText(), /LAW-2026-0001/);
  assert.doesNotMatch(await page.locator("#sponsorship").innerText(), /couldn't submit/);
  record(
    "Valid submission reaches server and mocked database once, preserves success and shows reference",
  );
  await page.getByRole("button", { name: "Submit another request" }).click();
  assert.equal(await page.locator("#fullName").inputValue(), "");
  assert.equal(await page.locator("#consent").isChecked(), false);
  await fill();
  failInsert = true;
  await page.locator("#sponsorship button[type=submit]").click();
  await page
    .getByText("We couldn't submit your request right now. Please try again.", { exact: true })
    .waitFor();
  assert.equal(rows.length, 1);
  failInsert = false;
  record("Backend failure displays translated error without inventing success");
  await mkdir("test-results", { recursive: true });
  for (const lang of ["en", "ar"]) {
    if ((await page.locator("html").getAttribute("lang")) !== lang)
      await page
        .getByRole("button", { name: lang === "ar" ? "Language" : "اللغة", exact: true })
        .click();
    for (const [width, height] of [
      [320, 760],
      [390, 844],
      [768, 1024],
      [1440, 1000],
    ]) {
      await page.setViewportSize({ width, height });
      for (const id of [
        "home",
        "about",
        "numbers",
        "programs",
        "partners",
        "benefits",
        "sponsorship",
        "contact",
      ])
        await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(200);
      const overflow = await page.evaluate(() => ({
        viewport: innerWidth,
        width: document.documentElement.scrollWidth,
        offenders: [...document.querySelectorAll("body *")]
          .filter(
            (e) =>
              e.getBoundingClientRect().right > innerWidth + 1 ||
              e.getBoundingClientRect().left < -1,
          )
          .slice(0, 5)
          .map((e) => ({ tag: e.tagName, class: e.className })),
      }));
      assert.ok(overflow.width <= width + 1, JSON.stringify({ lang, width, ...overflow }));
      await page.screenshot({ path: `test-results/public-${lang}-${width}.png`, fullPage: true });
    }
  }
  record("Arabic RTL / English LTR: 320, 390, 768, 1440 px have no horizontal overflow");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "فتح القائمة", exact: true }).click();
  await page
    .locator("header nav:visible")
    .getByRole("link", { name: "تواصل معنا", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "فتح القائمة", exact: true })
      .getAttribute("aria-expanded"),
    "false",
  );
  record("Mobile navigation opens, follows an anchor and closes");
  await page.goto(`${base}/admin`, { waitUntil: "networkidle" });
  await page.locator("#admin-email").waitFor();
  assert.equal(await page.getByRole("heading", { name: "طلبات الرعاية والشراكة" }).count(), 0);
  await page.locator("#admin-email").fill("member@example.com");
  await page.locator("#admin-password").fill("test-only");
  await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
  await page.getByRole("heading", { name: "لا تملك صلاحية الوصول" }).waitFor();
  record("Unauthenticated route shows login; signed-in non-admin sees access denied");
  await page.getByRole("button", { name: "تسجيل الخروج", exact: true }).click();
  await page.locator("#admin-email").fill("admin@example.com");
  await page.locator("#admin-password").fill("test-only");
  await page.getByRole("button", { name: "تسجيل الدخول", exact: true }).click();
  await page.getByRole("button", { name: "عرض التفاصيل", exact: true }).waitFor();
  await page.getByRole("button", { name: "عرض التفاصيل", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  assert.match(await page.getByRole("dialog").innerText(), /LAW-2026-0001/);
  await page.locator("#request-status").selectOption("accepted");
  await page.getByRole("button", { name: "تحديث الحالة", exact: true }).click();
  await page.getByText("تم تحديث حالة الطلب.", { exact: true }).waitFor();
  assert.equal(rows[0].status, "accepted");
  record("Admin can view details and persist a status change through protected server function");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.screenshot({ path: "test-results/admin-ar-mobile.png" });
  await page.getByRole("button", { name: "اللغة", exact: true }).click();
  const searchInput = page.getByRole("textbox", {
    name: "Search by reference, organization or email",
  });
  await searchInput.fill("nobody@example.com");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByText("No requests yet.", { exact: true }).waitFor();
  await searchInput.fill("qa@example.com");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("button", { name: "View details", exact: true }).waitFor();
  await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("rejected");
  await page.getByText("No requests yet.", { exact: true }).waitFor();
  await page.getByRole("combobox", { name: "Status", exact: true }).selectOption("accepted");
  await page.getByRole("button", { name: "View details", exact: true }).click();
  record("Admin email search and status filtering return the expected request");
  await page.waitForTimeout(300);
  const dialogBox = await page.getByRole("dialog").boundingBox();
  assert.ok(dialogBox.y >= 0 && dialogBox.y + dialogBox.height <= 845);
  await page.screenshot({ path: "test-results/admin-en-details.png" });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.locator("#admin-email").waitFor();
  assert.equal(await page.getByText("Test Organization", { exact: true }).count(), 0);
  record("English admin details fit mobile; signing out removes request data");
  await page.goto(`${base}/not-a-page`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Page not found" }).waitFor();
  assert.equal(errors.length, 0, errors.join("\n"));
  record("Localized 404 renders and no browser runtime exceptions occurred");
  await writeFile(
    "test-results/browser-summary.json",
    JSON.stringify(
      { mode: "mock Supabase HTTP backend; not live persistence or live RLS", results },
      null,
      2,
    ),
  );
} finally {
  await browser?.close();
  dev.kill("SIGTERM");
  mock.close();
  await writeFile("/tmp/law-browser-dev.log", logs);
}
