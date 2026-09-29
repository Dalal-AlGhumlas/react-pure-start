# Law Club sponsorship website

Bilingual Arabic/English sponsorship website for the Law Club at King Saud University, built with React, TanStack Start, TypeScript, Zod and Supabase. The existing single-page public website and brand identity are preserved. `/admin` provides role-protected request management.

## Run locally

Use Node.js 22.18+ (or Node.js 24) and Bun. The committed `bun.lock` is the dependency lockfile.

```sh
bun install --frozen-lockfile
cp .env.example .env.local
# Fill .env.local with values from the SAME Supabase project.
bun run dev -- --host 127.0.0.1
```

See [setup instructions](docs/SETUP.md) for hosted configuration and administrator provisioning. Never commit `.env.local` or service keys.

## Verify

```sh
npm run typecheck
npm test
npm run build
npm run check:supabase
npx playwright install chromium
npm run test:browser
```

`check:supabase` is read-only and requires real configuration. `test:browser` starts its own local app and simulated Supabase HTTP service. It verifies UI/server integration but does **not** establish live Supabase persistence or live RLS behavior. Screenshots are written to ignored `test-results/`. A system Chromium can be supplied with `BROWSER_EXECUTABLE` (optional `BROWSER_ARGS` JSON).

## Work in Lovable

The repository is connected to [the existing Lovable project](https://lovable.dev/projects/aa3f423c-597c-40d4-9335-fa60a46e7243). Commits to `main` sync into its editor. Do not force-push or rewrite published history. This repository's build requires a server runtime for TanStack server functions; a static-only host cannot handle submissions.

See [the audit report](docs/AUDIT.md) for fixes, test evidence and remaining launch requirements.
