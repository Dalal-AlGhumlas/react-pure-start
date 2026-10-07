import { z } from "zod";
import { PROGRAM_KEYS } from "../i18n/translations.ts";

export function normalizeSaudiPhone(value: string) {
  return value
    .trim()
    .replace(/[٠-٩۰-۹]/g, (digit) =>
      String(digit.charCodeAt(0) - (digit >= "۰" ? 0x06f0 : 0x0660)),
    )
    .replace(/[\s()-]/g, "");
}

const optionalChoice = <T extends [string, ...string[]]>(
  keys: T,
  message: string,
) =>
  z
    .union([
      z.enum(keys, { errorMap: () => ({ message }) }),
      z.literal(""),
    ])
    .optional()
    .transform((value) => value || undefined);

export const submissionSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "fullName")
    .max(120, "fullName")
    .refine(
      (value) =>
        /^[\p{L}\p{M}.'’-]+(?:\s+[\p{L}\p{M}.'’-]+)+$/u.test(value),
      "fullName",
    ),

  companyName: z
    .string()
    .trim()
    .min(2, "company")
    .max(160, "company"),

  phone: z
    .string()
    .max(40, "phone")
    .transform(normalizeSaudiPhone)
    .refine(
      (value) => /^(?:(?:\+|00)?966|0)?5\d{8}$/.test(value),
      "phone",
    ),

  programInterest: optionalChoice(
    [...PROGRAM_KEYS],
    "programInterest",
  ),

  message: z
    .string()
    .trim()
    .max(4000, "message")
    .optional(),

  consent: z.literal(true, {
    errorMap: () => ({ message: "consent" }),
  }),
});

export type SponsorshipSubmission = z.input<typeof submissionSchema>;

export type SponsorshipField = keyof SponsorshipSubmission;

export type FieldErrors = Partial<
  Record<SponsorshipField, string>
>;

export const fieldErrorKeys = {
  fullName: "fullName",
  companyName: "company",
  phone: "phone",
  programInterest: "programInterest",
  message: "message",
  consent: "consent",
} as const;

export function validationErrors(
  error: z.ZodError,
): FieldErrors {
  const errors: FieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0] as SponsorshipField;

    if (field in fieldErrorKeys) {
      errors[field] = fieldErrorKeys[field];
    }
  }

  return errors;
}
