import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types.ts";
import { submissionSchema, validationErrors } from "./sponsorship.schema.ts";

export async function saveSponsorshipRequest(
  input: unknown,
  getClient: () => SupabaseClient<Database>,
) {
  const parsed = submissionSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false as const,
      code: "validation" as const,
      errors: validationErrors(parsed.error),
    };
  const data = parsed.data;
  try {
    const { data: row, error } = await getClient()
      .from("sponsorship_requests")
      .insert({
        reference_number: "",
        full_name: data.fullName,
        company_name: data.companyName,
        job_title: data.jobTitle,
        phone: data.phone,
        email: data.email,
        website: data.website ?? null,
        partnership_type: data.partnershipType,
        program_interest: data.programInterest ?? null,
        estimated_budget: data.estimatedBudget ?? null,
        message: data.message || null,
      })
      .select("reference_number")
      .single();
    if (error || !row?.reference_number) {
      // Log only a database error code: never contact details, keys or raw responses.
      console.error("[sponsorship] insert failed", error?.code ?? "missing_reference");
      return { ok: false as const, code: "submit" as const };
    }
    return { ok: true as const, referenceNumber: row.reference_number };
  } catch {
    console.error(
      "[sponsorship] unavailable; verify server Supabase configuration and connectivity",
    );
    return { ok: false as const, code: "unavailable" as const };
  }
}
