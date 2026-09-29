# Law Club sponsorship audit — 29 September 2026

Repository: `Dalal-AlGhumlas/react-pure-start`, branch `main`. Baseline: `aa55f4f29c393c3081f8b19cff1b585b1be72f3e`. The uploaded ZIP exactly matched this baseline. The attached brief and 200 log events were reviewed.

**Outcome:** the public form and missing admin interface have been implemented and tested locally. Live launch is still blocked by unavailable Supabase configuration/admin credentials and missing approved brand assets. No claim is made that the user's live database has been tested.

## 1. Already working

- The existing single-page public narrative, sections, anchor navigation, brand colors and overall design were present.
- The Arabic/English translation structure and language switch existed.
- The supplied SQL already defined the required tables, statuses, admin role, RLS policies, reference-number trigger and update timestamp trigger.
- The application builds with the existing React/TanStack Start/Supabase architecture. No stack replacement was needed.

## 2–4. Defects, causes and fixes

| Finding                                                                 | Root cause                                                                                                                                           | Change                                                                                                                                                                                       |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invalid fields produced a generic submission error                      | Form used `noValidate` but had no equivalent client validation; only consent was checked. Server Zod errors fell into a generic catch.               | One shared Zod schema now validates both browser and server. Field messages, an error summary, field focus and length limits are localized. Invalid submissions stop before the server call. |
| A saved request could appear to fail                                    | `event.currentTarget.reset()` ran after `await`; React's event currentTarget is no longer reliable there. The exception overwrote the success state. | Removed the unsafe reset; the success view retains the returned database reference. Starting another request mounts a clean form. A synchronous busy guard prevents duplicate clicks.        |
| Public submissions depended on browser auth configuration               | Global `attachSupabaseAuth` initialized the browser Supabase client for every server function, including the anonymous form.                         | Auth attachment applies only to admin functions. Public submission uses only the server client.                                                                                              |
| Missing browser environment values could throw `process is not defined` | Browser fallback accessed `process.env` without a browser-safe guard.                                                                                | Safe environment fallbacks and anon-key aliases; friendly unavailable/login error handling.                                                                                                  |
| English translations failed TypeScript checking                         | `en: typeof ar` used an `as const` Arabic object, requiring English strings to equal Arabic literals.                                                | Widened translated string values while keeping matching object keys and checking key parity.                                                                                                 |
| English contact section still showed Arabic names                       | Names in the English translation were copied unchanged.                                                                                              | Added English transliterations; formal preferred spellings should be confirmed by the club.                                                                                                  |
| Arabic SSR started with an English HTML language                        | Root document was hardcoded to `lang="en"`.                                                                                                          | Arabic/RTL defaults, localized document title/description, storage-safe switching and localized route error/404 screens.                                                                     |
| Baybars requests returned 404                                           | The CSS referenced two font files absent from both ZIP and repository.                                                                               | Build configuration adds font URLs only when the licensed files exist. The original heading-family preference remains; its existing fallback is temporary.                                   |
| Narrow layouts relied on hiding horizontal overflow                     | Header controls could squeeze the brand; form/grid intrinsic widths were not constrained.                                                            | Added appropriate shrink/min-width constraints and removed the global overflow mask. Measured viewport overflow in both languages.                                                           |
| Contact email was absent                                                | No email was rendered in the supplied project.                                                                                                       | Contact/footer now show the owner-confirmed `Development.lawclub@gmail.com`, with an optional environment override.                                                                          |

The logs' worker-bundle failures belong to older Lovable preview revisions. Later root-page requests in the same log returned 200, and the current local production build succeeds. The old preview errors were not treated as a new application defect. This does not certify the health of a future hosted deployment.

## 5. Features added

- `/admin`: email/password sign-in, session restoration and sign-out.
- Server-side identity verification and admin-role check, followed by user-token queries subject to the existing RLS.
- Summary counts for all five statuses and total requests.
- Paginated requests (25 per page), organization/reference/email search and status filtering.
- Responsive details dialog with reference, contact/company information, partnership/program/budget/message, submission date and status.
- Status updates with a previous-status condition to detect concurrent edits.
- Environment template, private-key ignore rules, read-only Supabase configuration check, setup guide and repeatable tests.

## 6. Files changed

- Public form: `src/components/SponsorshipForm.tsx`, `src/lib/sponsorship.schema.ts`, `src/lib/sponsorship.server.ts`, `src/lib/sponsorship.functions.ts`, `src/routes/index.tsx`.
- Administration: `src/routes/admin.tsx`, `src/lib/admin.functions.ts`, `src/lib/admin.server.ts`, generated `src/routeTree.gen.ts`, `src/components/ui/dialog.tsx`.
- Authentication/configuration: `src/start.ts`, `src/integrations/supabase/auth-attacher.ts`, `auth-middleware.ts`, `client.ts`, `client.server.ts`, `.env.example`, `.gitignore`.
- Language/presentation: `src/i18n/translations.ts`, `src/i18n/LanguageProvider.tsx`, `src/routes/__root.tsx`, `src/styles.css`, `vite.config.ts`, `public/fonts/README.md`.
- Verification/documentation: `tests/sponsorship.test.ts`, `tests/admin.test.ts`, `tests/browser.mjs`, `scripts/check-supabase.mjs`, `package.json`, `bun.lock`, `README.md`, `roadmap.md`, `docs/SETUP.md`, this report.

## 7. Database/Supabase changes

**None made to the live database.** No table, policy, migration, account or role was created or changed. The original migration and `supabase/config.toml` were preserved. The known config reference alone does not prove a connection to `law-club-sponsorship`.

The live configuration check correctly stops with missing `SUPABASE_URL`, public key and server key in this environment. Hosted secrets are inaccessible here, so their actual hosted presence/absence cannot be inferred.

## 8. Security

- Public records were not made readable, and RLS was not disabled or broadened.
- Admin handlers verify the user with Supabase Auth, check `user_roles`, and use that user's JWT. They do not use the service-role client.
- Server validation allowlists choice values and never accepts caller-supplied status/reference values for public inserts.
- Status mutation updates only `status` and uses a conflict condition.
- Existing CSRF middleware remains active.
- Public-key configuration rejects a recognized server-secret/service-role key. Secrets stay in server modules; production client assets were scanned with a test sentinel and contained neither the sentinel nor the service-role environment variable name.
- Public errors omit raw database diagnostics and contact details.

These are code and simulated-integration findings. Actual project policies still require live verification.

## 9. Tests and limits

- `bun install --frozen-lockfile`: dependency installation succeeded; lockfile updated only as needed to add the browser-test dependency.
- `npm run typecheck`: passes.
- `npm test`: 10 tests pass, covering bilingual names, Saudi number formats (including Arabic digits), invalid fields, optional/unsafe URLs, safe errors, insert payload, role denial, concurrent status updates and translation-key parity.
- `npm run build`: passes with the existing Lovable/TanStack configuration.
- Edited TypeScript files: ESLint reports zero errors; the existing LanguageProvider hot-reload warning remains.
- Whole-repository lint still reports pre-existing formatting issues in untouched generated Supabase files and a pre-existing `prefer-const` issue. Those unrelated generated files were not rewritten.
- Browser tests use Chromium with the real React UI and TanStack server functions, plus a **simulated local Supabase HTTP backend**. They cover invalid form submissions with zero server calls, translated field errors, success/reference display, duplicate click protection, backend error UI, mobile navigation, login/non-admin denial, admin details/status changes, sign-out and localized 404 handling.
- Desktop 1440 px, tablet 768 px, mobile 390 px and narrow mobile 320 px were checked in Arabic/RTL and English/LTR without horizontal overflow. Screenshots were inspected. External IBM font loading remains dependent on the existing Google Fonts connection; the real Baybars font was unavailable.
- No live Supabase persistence, live default/trigger behavior, live RLS or hosted-deployment test could be completed without the actual configuration.

## 10. Still needed from the owner

1. Configure the intended project's URL/public key/server-only key in the hosting environment and rebuild. Do not send server secrets in public messages.
2. Create/invite the chosen admin account and grant its UUID the existing `admin` role using the setup guide.
3. Supply the licensed Baybars `.woff2`/`.woff`, approved club logo and approved partner logos/names.
4. Confirm the preferred English spelling of the three existing contact names if different from the transliterations.
5. Run the final live acceptance flow in [SETUP.md](SETUP.md), including checking actual database rows, references and permission denial.

Technical references used when checking the implementation: [TanStack middleware](https://tanstack.com/start/latest/docs/framework/react/guide/middleware), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).
