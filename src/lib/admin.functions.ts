import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STATUS_KEYS } from "@/i18n/translations";

const adminAuth = createMiddleware({ type: "function" }).middleware([
  attachSupabaseAuth,
  requireSupabaseAuth,
]);

export const listSponsorshipRequests = createServerFn({ method: "POST" })
  .middleware([adminAuth])
  .inputValidator(
    z.object({
      page: z.number().int().min(0),
      search: z.string().trim().max(120),
      status: z.union([z.enum(STATUS_KEYS), z.literal("")]),
    }),
  )
  .handler(async ({ data, context }) => {
    const { loadAdminRequests } = await import("./admin.server");
    return loadAdminRequests(context.supabase, context.userId, data);
  });

export const updateSponsorshipStatus = createServerFn({ method: "POST" })
  .middleware([adminAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(STATUS_KEYS),
      previousStatus: z.enum(STATUS_KEYS),
    }),
  )
  .handler(async ({ data, context }) => {
    const { changeRequestStatus } = await import("./admin.server");
    return changeRequestStatus(context.supabase, context.userId, data);
  });
