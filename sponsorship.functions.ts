import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const saudiPhone = /^(?:\+?966|0)?5\d{8}$/;

const submissionSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  companyName: z.string().trim().min(2).max(160),
  jobTitle: z.string().trim().min(2).max(120),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s-]/g, ""))
    .refine((value) => saudiPhone.test(value), "invalid_phone"),
  email: z.string().trim().email().max(180),
  website: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine((value) => !value || /^https?:\/\/\S+$/i.test(value), "invalid_website"),
  partnershipType: z.string().trim().min(1).max(60),
  programInterest: z.string().trim().max(60).optional(),
  estimatedBudget: z.string().trim().max(60).optional(),
  message: z.string().trim().max(4000).optional(),
  consent: z.literal(true),
});

export type SponsorshipSubmission = z.input<typeof submissionSchema>;

export const submitSponsorshipRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submissionSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
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
        message: data.message ?? null,
      })
      .select("reference_number")
      .single();

    if (error || !row) {
      console.error("[sponsorship] insert failed", error);
      throw new Error("submit_failed");
    }

    return { referenceNumber: row.reference_number };
  });
