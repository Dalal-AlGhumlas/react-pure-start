import { test } from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/types.ts";
import { changeRequestStatus, loadAdminRequests } from "../src/lib/admin.server.ts";

test("authenticated users without admin role cannot read or mutate requests", async () => {
  const client = {
    from(table: string) {
      assert.equal(table, "user_roles", "No request table query is allowed");
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: null, error: null }),
      };
      return query;
    },
  } as unknown as SupabaseClient<Database>;
  assert.deepEqual(
    await loadAdminRequests(client, "ordinary-user", { page: 0, search: "", status: "" }),
    { ok: false, code: "forbidden" },
  );
  assert.deepEqual(
    await changeRequestStatus(client, "ordinary-user", {
      id: "test-id",
      status: "accepted",
      previousStatus: "new",
    }),
    { ok: false, code: "forbidden" },
  );
});

test("status changes update only status and detect concurrent changes", async () => {
  const filters: unknown[][] = [];
  const client = {
    from(table: string) {
      const query = {
        select: () => query,
        eq: (...args: unknown[]) => {
          filters.push(args);
          return query;
        },
        update: (data: unknown) => {
          assert.deepEqual(data, { status: "accepted" });
          return query;
        },
        maybeSingle: async () => ({
          data: table === "user_roles" ? { role: "admin" } : null,
          error: null,
        }),
      };
      return query;
    },
  } as unknown as SupabaseClient<Database>;
  assert.deepEqual(
    await changeRequestStatus(client, "admin-user", {
      id: "id",
      status: "accepted",
      previousStatus: "new",
    }),
    { ok: false, code: "conflict" },
  );
  assert.ok(filters.some(([key, value]) => key === "status" && value === "new"));
});
