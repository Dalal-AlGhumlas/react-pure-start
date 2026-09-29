import { createServerFn } from "@tanstack/react-start";
import type { SponsorshipSubmission } from "./sponsorship.schema";

export const submitSponsorshipRequest = createServerFn({ method: "POST" })
  // Validation stays inside the server handler so field errors can be returned safely.
  .inputValidator((data: SponsorshipSubmission) => data)
  .handler(async ({ data }) => {
    const { saveSponsorshipRequest } = await import("./sponsorship.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return saveSponsorshipRequest(data, () => supabaseAdmin);
  });
