// Read-only: no table recreation, data writes, role grants or secret output.
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
else if (existsSync(".env")) process.loadEnvFile(".env");
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const publicKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const missing = [
  !url && "SUPABASE_URL",
  !publicKey && "SUPABASE_PUBLISHABLE_KEY",
  !secret && "SUPABASE_SERVICE_ROLE_KEY",
].filter(Boolean);
if (missing.length) {
  console.error(`Missing configuration: ${missing.join(", ")}`);
  process.exit(1);
}
if (process.env.VITE_SUPABASE_URL && url !== process.env.VITE_SUPABASE_URL) {
  console.error("Server and browser Supabase URLs differ.");
  process.exit(1);
}
const client = (key) =>
  createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const admin = client(secret);
for (const [table, columns] of [
  ["sponsorship_requests", "id,reference_number,status,updated_at"],
  ["user_roles", "user_id,role"],
  ["reference_counters", "year,last_value"],
]) {
  const { error } = await admin.from(table).select(columns).limit(0);
  if (error) {
    console.error(`${table}: failed (${error.code || "connection_error"})`);
    process.exitCode = 1;
  } else console.log(`${table}: accessible with expected columns`);
}
const { data, error } = await client(publicKey).from("sponsorship_requests").select("id").limit(1);
if (data?.length) {
  console.error("FAIL: an anonymous visitor can read a request.");
  process.exitCode = 1;
} else if (error && !["42501", "PGRST301"].includes(error.code)) {
  console.error(`Anonymous check inconclusive (${error.code || "connection_error"})`);
  process.exitCode = 1;
} else
  console.log(
    "Anonymous request read: no data returned. Also inspect policies; an empty table alone cannot prove RLS.",
  );
console.log(
  "Check project identity in the Supabase dashboard; the repository config alone is not proof of a connection.",
);
