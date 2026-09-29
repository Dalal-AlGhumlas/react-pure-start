import { test } from "node:test";
import assert from "node:assert/strict";
import { submissionSchema, validationErrors } from "../src/lib/sponsorship.schema.ts";
import { saveSponsorshipRequest } from "../src/lib/sponsorship.server.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/integrations/supabase/types.ts";
import { translations } from "../src/i18n/translations.ts";

const valid = {
  fullName: "Dalal Alghumlas",
  companyName: "Test organization",
  jobTitle: "Partnership Manager",
  phone: "0551234567",
  email: "qa@example.com",
  website: "",
  partnershipType: "financial",
  programInterest: "",
  estimatedBudget: "",
  message: "",
  consent: true,
};

test("Arabic and English full names, local/international phone formats and optional fields", () => {
  for (const name of ["Dalal Alghumlas", "دلال الغملاس", "Anne-Marie O’Neil"]) {
    for (const phone of [
      "0551234567",
      "+966 55 123 4567",
      "00966551234567",
      "551234567",
      "٠٥٥١٢٣٤٥٦٧",
      "۰۵۵۱۲۳۴۵۶۷",
    ]) {
      const result = submissionSchema.safeParse({ ...valid, fullName: name, phone });
      assert.equal(result.success, true, `${name} / ${phone}`);
      if (result.success) assert.equal(result.data.website, undefined);
    }
  }
});

test("every invalid field is identified before any database client is requested", async () => {
  for (const [field, value] of Object.entries({
    fullName: "Dalal",
    companyName: " ",
    jobTitle: " ",
    phone: "123",
    email: "broken",
    website: "javascript:alert(1)",
    partnershipType: "invented",
    programInterest: "invented",
    estimatedBudget: "invented",
    message: "x".repeat(4001),
    consent: false,
  })) {
    const result = await saveSponsorshipRequest({ ...valid, [field]: value }, () => {
      throw new Error("Database must not be called");
    });
    assert.equal(result.ok, false);
    if (!result.ok && result.code === "validation")
      assert.ok(result.errors[field as keyof typeof valid], field);
    else assert.fail(`Missing field error for ${field}`);
  }
});

test("blank form exposes all required field errors, and each has both translations", () => {
  const result = submissionSchema.safeParse({});
  assert.equal(result.success, false);
  if (result.success) return;
  const errors = validationErrors(result.error);
  assert.equal(Object.keys(errors).length, 7);
  for (const key of Object.values(errors)) {
    assert.ok(translations.ar.form.errors[key as keyof typeof translations.ar.form.errors]);
    assert.ok(translations.en.form.errors[key as keyof typeof translations.en.form.errors]);
  }
});

test("URLs accept only full HTTP(S) URLs and reject credentials/malformed hosts", () => {
  for (const website of [
    "https://example.com",
    "http://example.com/a?q=1",
    "https://مثال.السعودية",
  ])
    assert.equal(submissionSchema.safeParse({ ...valid, website }).success, true);
  for (const website of [
    "https://",
    "https://bad",
    "ftp://example.com",
    "https://user:pass@example.com",
    "https://a b.com",
    "example.com",
  ])
    assert.equal(submissionSchema.safeParse({ ...valid, website }).success, false, website);
});

test("valid insert returns actual database reference and never trusts status/reference from input", async () => {
  let inserts = 0;
  const client = {
    from(table: string) {
      assert.equal(table, "sponsorship_requests");
      return {
        insert(row: Record<string, unknown>) {
          inserts++;
          assert.equal(row["reference_number"], "");
          assert.equal("status" in row, false);
          assert.equal(row["website"], null);
          assert.equal(row["full_name"], valid.fullName);
          return {
            select(columns: string) {
              assert.equal(columns, "reference_number");
              return {
                single: async () => ({ data: { reference_number: "LAW-2026-0042" }, error: null }),
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient<Database>;
  assert.deepEqual(
    await saveSponsorshipRequest(
      { ...valid, status: "accepted", reference_number: "FAKE" },
      () => client,
    ),
    { ok: true, referenceNumber: "LAW-2026-0042" },
  );
  assert.equal(inserts, 1);
});

test("missing configuration returns a safe unavailable response", async () => {
  const result = await saveSponsorshipRequest(valid, () => {
    throw new Error("private-secret");
  });
  assert.deepEqual(result, { ok: false, code: "unavailable" });
  assert.equal(JSON.stringify(result).includes("private-secret"), false);
});

test("database errors never return success or database diagnostics", async () => {
  const client = {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: async () => ({
            data: null,
            error: { code: "42501", message: "private-details" },
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient<Database>;
  assert.deepEqual(await saveSponsorshipRequest(valid, () => client), {
    ok: false,
    code: "submit",
  });
});

test("translation keys match recursively", () => {
  function keys(value: unknown, path = ""): string[] {
    if (!value || typeof value !== "object") return [path];
    return Object.entries(value).flatMap(([key, nested]) => keys(nested, `${path}.${key}`));
  }
  assert.deepEqual(keys(translations.ar), keys(translations.en));
});
