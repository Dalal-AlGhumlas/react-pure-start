import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types.ts";
import { STATUS_KEYS } from "../i18n/translations.ts";

type Client = SupabaseClient<Database>;
type Status = Database["public"]["Enums"]["request_status"];
export const PAGE_SIZE = 25;

async function isAdmin(client: Client, userId: string) {
  const { data, error } = await client
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error("role_check_failed");
  return data?.role === "admin";
}

export async function loadAdminRequests(
  client: Client,
  userId: string,
  input: { page: number; search: string; status: Status | "" },
) {
  if (!(await isAdmin(client, userId))) return { ok: false as const, code: "forbidden" as const };
  let query = client
    .from("sponsorship_requests")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id");
  if (input.status) query = query.eq("status", input.status);
  // PostgREST filter syntax must never be accepted as part of a search term.
  const search = input.search.replace(/[%,()"\\]/g, " ").trim();
  if (search)
    query = query.or(
      `reference_number.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%`,
    );
  const [rows, ...counts] = await Promise.all([
    query.range(input.page * PAGE_SIZE, (input.page + 1) * PAGE_SIZE - 1),
    ...STATUS_KEYS.map((status) =>
      client
        .from("sponsorship_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", status),
    ),
  ]);
  if (rows.error || counts.some((item) => item.error)) throw new Error("requests_load_failed");
  const summary = Object.fromEntries(
    STATUS_KEYS.map((status, index) => [status, counts[index]?.count ?? 0]),
  ) as Record<Status, number>;
  return {
    ok: true as const,
    requests: rows.data ?? [],
    count: rows.count ?? 0,
    summary,
    pageSize: PAGE_SIZE,
  };
}

export async function changeRequestStatus(
  client: Client,
  userId: string,
  input: { id: string; status: Status; previousStatus: Status },
) {
  if (!(await isAdmin(client, userId))) return { ok: false as const, code: "forbidden" as const };
  // The user's JWT and existing RLS apply; the service-role client is never used here.
  const { data, error } = await client
    .from("sponsorship_requests")
    .update({ status: input.status })
    .eq("id", input.id)
    .eq("status", input.previousStatus)
    .select("id,status,updated_at")
    .maybeSingle();
  if (error) throw new Error("status_update_failed");
  if (!data) return { ok: false as const, code: "conflict" as const };
  return { ok: true as const, request: data };
}
