import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useI18n } from "@/i18n/LanguageProvider";
import { STATUS_KEYS, type Content } from "@/i18n/translations";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Database } from "@/integrations/supabase/types";
import { listSponsorshipRequests, updateSponsorshipStatus } from "@/lib/admin.functions";

type RequestRow = Tables<"sponsorship_requests">;
type Status = Database["public"]["Enums"]["request_status"];
type AdminResult = Awaited<ReturnType<typeof listSponsorshipRequests>>;

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "لوحة إدارة الطلبات | نادي القانون" },
      {
        name: "description",
        content: "لوحة داخلية لمسؤولي نادي القانون لإدارة طلبات الرعاية والشراكة.",
      },
      { property: "og:title", content: "لوحة إدارة الطلبات | نادي القانون" },
      {
        property: "og:description",
        content: "لوحة داخلية لمسؤولي نادي القانون لإدارة طلبات الرعاية والشراكة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { c, dir, toggleLocale } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    try {
      const subscription = supabase.auth.onAuthStateChange((_event, next) => {
        if (active) {
          setSession(next);
          setReady(true);
        }
      });
      unsubscribe = () => subscription.data.subscription.unsubscribe();
      supabase.auth
        .getSession()
        .then(({ data, error }) => {
          if (!active) return;
          if (error) setUnavailable(true);
          setSession(data.session);
          setReady(true);
        })
        .catch(() => {
          if (active) {
            setUnavailable(true);
            setReady(true);
          }
        });
    } catch {
      setUnavailable(true);
      setReady(true);
    }
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  return (
    <div className="min-h-screen bg-surface" dir={dir}>
      <header className="border-b border-border bg-background py-5">
        <div className="section-shell flex flex-wrap items-center justify-between gap-3">
          <a href="/" className="font-display text-xl font-semibold text-primary">
            {c.brand.name}
          </a>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={toggleLocale} aria-label={c.nav.language}>
              {c.common.switchTo}
            </Button>
            {session && (
              <Button
                variant="outline"
                onClick={async () => {
                  await supabase.auth.signOut();
                  setSession(null);
                }}
              >
                {c.admin.signOut}
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="section-shell py-10 sm:py-16">
        {!ready ? (
          <p role="status">{c.auth.working}</p>
        ) : unavailable ? (
          <p role="alert">{c.auth.unavailable}</p>
        ) : session ? (
          <Dashboard key={session.user.id} />
        ) : (
          <AdminLogin />
        )}
        <a href="/" className="mt-8 inline-block text-sm text-primary underline">
          {c.auth.backHome}
        </a>
      </main>
    </div>
  );
}

function AdminLogin() {
  const { c } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"required" | "failed" | null>(null);
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const parsed = z
      .object({ email: z.string().trim().email(), password: z.string().min(1) })
      .safeParse(Object.fromEntries(data));
    if (!parsed.success) {
      setError("required");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await supabase.auth.signInWithPassword(parsed.data);
      if (result.error) setError("failed");
    } catch {
      setError("failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mx-auto max-w-lg border border-border bg-background p-6 sm:p-10">
      <h1 className="text-3xl font-semibold text-primary">{c.auth.title}</h1>
      <p className="mt-4 leading-7 text-muted-foreground">{c.auth.subtitle}</p>
      <form onSubmit={login} className="mt-8 grid gap-5" noValidate>
        <div className="grid gap-2">
          <Label htmlFor="admin-email">{c.auth.email}</Label>
          <Input
            id="admin-email"
            name="email"
            type="email"
            dir="ltr"
            autoComplete="username"
            required
            aria-describedby={error ? "login-error" : undefined}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="admin-password">{c.auth.password}</Label>
          <Input
            id="admin-password"
            name="password"
            type="password"
            dir="ltr"
            autoComplete="current-password"
            required
            aria-describedby={error ? "login-error" : undefined}
          />
        </div>
        {error && (
          <p id="login-error" role="alert" className="text-sm text-destructive">
            {c.auth[error]}
          </p>
        )}
        <Button disabled={busy} type="submit">
          {busy ? c.auth.working : c.auth.signIn}
        </Button>
      </form>
    </section>
  );
}

function Dashboard() {
  const { c, locale, dir } = useI18n();
  const load = useServerFn(listSponsorshipRequests);
  const update = useServerFn(updateSponsorshipStatus);
  const [result, setResult] = useState<AdminResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<RequestRow | null>(null);
  const [nextStatus, setNextStatus] = useState<Status>("new");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<"statusUpdated" | "statusFailed" | "conflict" | null>(
    null,
  );
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    setResult(null);
    load({ data: { page, search, status } })
      .then((data) => {
        if (active) setResult(data);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [load, page, search, status, revision]);
  const refresh = () => {
    setSelected(null);
    setRevision((value) => value + 1);
  };
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Riyadh",
      calendar: "gregory",
    }).format(new Date(value));
  async function saveStatus() {
    if (!selected || saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const response = await update({
        data: { id: selected.id, status: nextStatus, previousStatus: selected.status },
      });
      if (!mounted.current) return;
      if (response.ok) {
        setFeedback("statusUpdated");
        refresh();
      } else if (response.code === "forbidden") {
        setSelected(null);
        setResult(response);
      } else setFeedback("conflict");
    } catch {
      if (mounted.current) setFeedback("statusFailed");
    } finally {
      if (mounted.current) setSaving(false);
    }
  }

  if (result && !result.ok)
    return (
      <section>
        <h1 className="text-3xl font-semibold">{c.admin.noAccessTitle}</h1>
        <p className="mt-4">{c.admin.noAccessBody}</p>
      </section>
    );
  const data = result?.ok ? result : null;
  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-primary">{c.admin.title}</h1>
          <p className="mt-3 text-muted-foreground">{c.admin.subtitle}</p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          {c.admin.refresh}
        </Button>
      </div>
      {data && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {(["total", ...STATUS_KEYS] as const).map((key) => (
            <div key={key} className="min-w-0 border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">{c.admin.summary[key]}</p>
              <strong className="mt-2 block text-3xl text-primary">
                {key === "total"
                  ? Object.values(data.summary).reduce((a, b) => a + b, 0)
                  : data.summary[key]}
              </strong>
            </div>
          ))}
        </div>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(0);
          setSearch(searchDraft.trim());
        }}
        className="my-8 flex flex-col gap-3 sm:flex-row"
      >
        <Input
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          maxLength={120}
          placeholder={c.admin.searchPlaceholder}
          aria-label={c.admin.searchPlaceholder}
          className="min-w-0 flex-1 bg-background"
        />
        <select
          value={status}
          onChange={(event) => {
            setPage(0);
            setStatus(event.target.value as Status | "");
          }}
          aria-label={c.admin.columns.status}
          className="h-10 min-w-0 rounded-md border border-input bg-background px-3"
        >
          <option value="">{c.admin.filterAll}</option>
          {STATUS_KEYS.map((key) => (
            <option key={key} value={key}>
              {c.admin.statuses[key]}
            </option>
          ))}
        </select>
        <Button type="submit">{c.admin.search}</Button>
      </form>
      {feedback && !selected && (
        <p role="status" className="my-4">
          {c.admin[feedback]}
        </p>
      )}
      {loading && <p role="status">{c.admin.loading}</p>}
      {failed && (
        <p role="alert" className="text-destructive">
          {c.admin.loadFailed}
        </p>
      )}
      {data &&
        (data.requests.length === 0 ? (
          <p>{c.admin.empty}</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.requests.map((row) => (
                <article key={row.id} className="min-w-0 border border-border bg-background p-6">
                  <p className="text-sm text-muted-foreground" dir="ltr">
                    {row.reference_number}
                  </p>
                  <h2 className="mt-3 break-words text-xl font-semibold">{row.company_name}</h2>
                  <p className="mt-3 break-words">{row.full_name}</p>
                  <p className="mt-1 break-all text-sm text-muted-foreground" dir="ltr">
                    {row.email}
                  </p>
                  <p className="mt-4 text-sm">{c.admin.statuses[row.status]}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{date(row.created_at)}</p>
                  <Button
                    variant="outline"
                    className="mt-5"
                    onClick={() => {
                      setSelected(row);
                      setNextStatus(row.status);
                      setFeedback(null);
                    }}
                  >
                    {c.admin.view}
                  </Button>
                </article>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Button
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((value) => value - 1)}
              >
                {c.admin.previous}
              </Button>
              <span>
                {c.admin.page} {page + 1} / {Math.max(1, Math.ceil(data.count / data.pageSize))}
              </span>
              <Button
                variant="outline"
                disabled={(page + 1) * data.pageSize >= data.count}
                onClick={() => setPage((value) => value + 1)}
              >
                {c.admin.next}
              </Button>
            </div>
          </>
        ))}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open && !saving) setSelected(null);
        }}
      >
        <DialogContent
          closeLabel={c.admin.close}
          dir={dir}
          className="max-h-[90svh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto text-start"
        >
          <DialogTitle>{c.admin.detailsTitle}</DialogTitle>
          <DialogDescription dir="ltr">{selected?.reference_number}</DialogDescription>
          {selected && (
            <>
              <dl className="grid gap-5 sm:grid-cols-2">
                <Detail label={c.admin.details.company} value={selected.company_name} />
                <Detail label={c.admin.details.contact} value={selected.full_name} />
                <Detail label={c.admin.details.jobTitle} value={selected.job_title} />
                <Detail label={c.admin.details.phone} value={selected.phone} ltr />
                <Detail label={c.admin.details.email} value={selected.email} ltr />
                <Detail
                  label={c.admin.details.website}
                  value={selected.website || c.admin.details.none}
                  ltr
                />
                <Detail
                  label={c.admin.details.type}
                  value={translatedValue(
                    c.form.partnershipTypes,
                    selected.partnership_type,
                    c.admin.details.none,
                  )}
                />
                <Detail
                  label={c.admin.details.program}
                  value={translatedValue(
                    c.form.programs,
                    selected.program_interest,
                    c.admin.details.none,
                  )}
                />
                <Detail
                  label={c.admin.details.budget}
                  value={translatedValue(
                    c.form.budgets,
                    selected.estimated_budget,
                    c.admin.details.none,
                  )}
                />
                <Detail label={c.admin.details.date} value={date(selected.created_at)} />
                <div className="sm:col-span-2">
                  <Detail
                    label={c.admin.details.message}
                    value={selected.message || c.admin.details.none}
                  />
                </div>
              </dl>
              <div className="mt-2 grid gap-3 border-t border-border pt-5">
                <Label htmlFor="request-status">{c.admin.details.status}</Label>
                <select
                  id="request-status"
                  value={nextStatus}
                  disabled={saving}
                  onChange={(event) => setNextStatus(event.target.value as Status)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3"
                >
                  {STATUS_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {c.admin.statuses[key]}
                    </option>
                  ))}
                </select>
                {feedback && <p role="status">{c.admin[feedback]}</p>}
                <Button disabled={saving || nextStatus === selected.status} onClick={saveStatus}>
                  {saving ? c.auth.working : c.admin.updateStatus}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
function Detail({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
        dir={ltr ? "ltr" : undefined}
      >
        {value}
      </dd>
    </div>
  );
}
function translatedValue(
  labels:
    Content["form"]["partnershipTypes"] | Content["form"]["programs"] | Content["form"]["budgets"],
  value: string | null,
  fallback: string,
) {
  return value ? ((labels as Record<string, string>)[value] ?? value) : fallback;
}
