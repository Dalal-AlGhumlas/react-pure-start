import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronDown,
  Eye,
  GraduationCap,
  Handshake,
  Languages,
  Menu,
  Phone,
  Scale,
  Target,
  Users,
  X,
} from "lucide-react";

import heroPattern from "@/assets/hero-pattern.jpg";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useReveal } from "@/hooks/use-reveal";
import { useI18n } from "@/i18n/LanguageProvider";
import {
  BUDGET_KEYS,
  PARTNERSHIP_TYPE_KEYS,
  PROGRAM_KEYS,
} from "@/i18n/translations";
import {
  submitSponsorshipRequest,
  type SponsorshipSubmission,
} from "@/lib/sponsorship.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "نادي القانون | جامعة الملك سعود | الشراكات والرعاية" },
      {
        name: "description",
        content:
          "منصة الشراكات والرعاية لنادي القانون بجامعة الملك سعود، للتعاون مع الجهات والشركات ودعم البرامج والمبادرات القانونية.",
      },
      { property: "og:title", content: "نادي القانون | جامعة الملك سعود" },
      {
        property: "og:description",
        content: "نبني شراكات تمكّن الجيل القانوني القادم وتصنع أثرًا مهنيًا ومعرفيًا مستدامًا.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicWebsite,
});

const navItems = [
  ["about", "about"],
  ["numbers", "numbers"],
  ["programs", "programs"],
  ["partners", "partners"],
  ["benefits", "benefits"],
  ["contact", "contact"],
] as const;

const benefitIcons = [Eye, GraduationCap, Handshake];
const programIcons = [Scale, BriefcaseBusiness, Target];

function PublicWebsite() {
  const { c, locale, isRtl, toggleLocale } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground" dir={isRtl ? "rtl" : "ltr"}>
      <a
        href="#content"
        className="sr-only z-50 bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
      >
        {c.common.skipToContent}
      </a>
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="section-shell flex h-20 items-center justify-between gap-6">
          <a href="#home" className="flex min-w-0 items-center gap-3" aria-label={c.nav.home}>
            <BrandMark />
            <span className="min-w-0 border-s border-border ps-3">
              <strong className="block truncate font-display text-lg leading-tight text-primary">{c.brand.name}</strong>
              <span className="block truncate text-[11px] text-muted-foreground">{c.brand.university}</span>
            </span>
          </a>

          <nav className="hidden items-center gap-5 lg:flex" aria-label={c.nav.home}>
            {navItems.map(([key, id]) => (
              <a key={key} href={`#${id}`} className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                {c.nav[key]}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={toggleLocale} aria-label={c.nav.language} className="gap-2 px-3">
              <Languages />
              <span>{c.common.switchTo}</span>
            </Button>
            <Button asChild className="hidden md:inline-flex">
              <a href="#sponsorship">{c.nav.cta}</a>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? c.nav.closeMenu : c.nav.openMenu}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>
        {menuOpen && (
          <nav className="border-t border-border bg-background px-4 py-5 lg:hidden" aria-label={c.nav.home}>
            <div className="section-shell grid gap-1">
              {navItems.map(([key, id]) => (
                <a
                  key={key}
                  href={`#${id}`}
                  onClick={() => setMenuOpen(false)}
                  className="border-b border-border px-2 py-3 text-sm font-medium text-foreground"
                >
                  {c.nav[key]}
                </a>
              ))}
              <Button asChild className="mt-3">
                <a href="#sponsorship" onClick={() => setMenuOpen(false)}>{c.nav.cta}</a>
              </Button>
            </div>
          </nav>
        )}
      </header>

      <main id="content">
        <section id="home" className="relative isolate min-h-[calc(100svh-5rem)] overflow-hidden bg-primary text-primary-foreground">
          <img src={heroPattern} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
          <div className="hero-surface absolute inset-0 -z-10" />
          <div className="section-shell grid min-h-[calc(100svh-5rem)] content-center gap-12 py-20 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
            <div className="max-w-3xl">
              <p className="section-kicker text-accent">{c.hero.eyebrow}</p>
              <h1 className="mt-6 max-w-3xl text-balance-title font-display text-5xl font-semibold leading-[1.15] sm:text-6xl lg:text-7xl">
                {c.hero.heading}
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-primary-foreground/80 sm:text-xl">{c.hero.paragraph}</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-accent text-accent-foreground shadow-none hover:bg-accent/90">
                  <a href="#sponsorship">{c.hero.primaryCta}{isRtl ? <ArrowLeft /> : <ArrowRight />}</a>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-primary-foreground/35 bg-transparent text-primary-foreground shadow-none hover:bg-primary-foreground/10 hover:text-primary-foreground">
                  <a href="#about">{c.hero.secondaryCta}</a>
                </Button>
              </div>
            </div>
            <div className="hidden justify-end lg:flex">
              <div className="w-full max-w-sm border-s border-primary-foreground/25 ps-10">
                <BrandMark large />
                <p className="mt-8 font-display text-3xl leading-snug">{c.hero.slogan}</p>
                <p className="mt-3 text-sm text-primary-foreground/65">{c.brand.university}</p>
              </div>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-px bg-accent/70" />
        </section>

        <RevealSection id="about" className="bg-background py-24 sm:py-32">
          <div className="section-shell grid gap-14 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
            <SectionHeading title={c.about.heading} index="01" />
            <div>
              <p className="max-w-3xl text-xl leading-9 text-foreground sm:text-2xl">{c.about.body}</p>
              <div className="mt-12 grid border-y border-border md:grid-cols-2 md:divide-x">
                <article className="py-8 md:px-8 md:first:ps-0">
                  <Target className="text-accent" />
                  <h3 className="mt-5 text-2xl font-semibold text-primary">{c.about.visionTitle}</h3>
                  <p className="mt-4 leading-7 text-muted-foreground">{c.about.visionBody}</p>
                </article>
                <article className="border-t border-border py-8 md:border-t-0 md:px-8 md:last:pe-0">
                  <Award className="text-accent" />
                  <h3 className="mt-5 text-2xl font-semibold text-primary">{c.about.goalTitle}</h3>
                  <p className="mt-4 leading-7 text-muted-foreground">{c.about.goalBody}</p>
                </article>
              </div>
            </div>
          </div>
        </RevealSection>

        <RevealSection id="numbers" className="bg-primary py-24 text-primary-foreground sm:py-28">
          <div className="section-shell">
            <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
              <SectionHeading title={c.stats.heading} subtitle={c.stats.subheading} index="02" inverted />
              <div className="grid grid-cols-2 border-s border-primary-foreground/15 sm:grid-cols-3">
                {c.stats.items.map((item) => (
                  <div key={item.label} className="min-h-44 border-e border-b border-primary-foreground/15 p-6 sm:p-8">
                    <strong className="block font-display text-4xl text-accent sm:text-5xl" dir="ltr">{item.value}</strong>
                    <span className="mt-4 block text-sm leading-6 text-primary-foreground/70">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </RevealSection>

        <RevealSection id="programs" className="bg-surface py-24 sm:py-32">
          <div className="section-shell">
            <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]">
              <SectionHeading title={c.program.heading} subtitle={c.program.subheading} eyebrow={c.program.eyebrow} index="03" />
              <div className="grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
                {c.program.cards.map((card, index) => {
                  const Icon = programIcons[index];
                  return (
                    <article key={card.title} className="bg-background p-7 sm:p-8">
                      <div className="flex items-center justify-between">
                        {Icon && <Icon className="text-accent" />}
                        <span className="text-xs font-semibold text-muted-foreground">0{index + 1}</span>
                      </div>
                      <h3 className="mt-12 text-xl font-semibold text-primary">{card.title}</h3>
                      <p className="mt-4 text-sm leading-7 text-muted-foreground">{card.body}</p>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </RevealSection>

        <RevealSection id="partners" className="bg-background py-24 sm:py-28">
          <div className="section-shell">
            <SectionHeading title={c.partners.heading} subtitle={c.partners.subheading} index="04" centered />
            <div className="mt-12 grid grid-cols-2 border-s border-t border-border md:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="flex min-h-40 items-center justify-center border-e border-b border-border p-6">
                  <div className="text-center text-muted-foreground/60">
                    <Building2 className="mx-auto size-8" />
                    <span className="mt-3 block text-xs">{c.partners.placeholder}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </RevealSection>

        <RevealSection id="benefits" className="bg-surface py-24 sm:py-32">
          <div className="section-shell">
            <SectionHeading title={c.benefits.heading} subtitle={c.benefits.subheading} index="05" />
            <div className="mt-12 grid gap-px overflow-hidden border border-border bg-border lg:grid-cols-3">
              {c.benefits.cards.map((card, index) => {
                const Icon = benefitIcons[index];
                return (
                  <article key={card.title} className="bg-background p-8 sm:p-10">
                    {Icon && <Icon className="size-7 text-accent" />}
                    <h3 className="mt-10 text-2xl font-semibold text-primary">{card.title}</h3>
                    <p className="mt-4 leading-7 text-muted-foreground">{card.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </RevealSection>

        <RevealSection className="bg-background py-24 sm:py-32">
          <div className="section-shell grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
            <SectionHeading title={c.steps.heading} subtitle={c.steps.subheading} index="06" />
            <ol className="border-t border-border">
              {c.steps.items.map((item, index) => (
                <li key={item.title} className="grid gap-5 border-b border-border py-8 sm:grid-cols-[5rem_1fr] sm:items-start">
                  <span className="font-display text-4xl text-accent">0{index + 1}</span>
                  <div>
                    <h3 className="text-xl font-semibold text-primary">{item.title}</h3>
                    <p className="mt-3 leading-7 text-muted-foreground">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </RevealSection>

        <section className="relative overflow-hidden bg-primary py-20 text-primary-foreground">
          <div className="section-shell flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="section-kicker text-accent">{c.brand.slogan}</p>
              <h2 className="mt-5 font-display text-4xl font-semibold sm:text-5xl">{c.cta.heading}</h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-primary-foreground/75">{c.cta.body}</p>
            </div>
            <Button asChild size="lg" className="shrink-0 bg-accent text-accent-foreground shadow-none hover:bg-accent/90">
              <a href="#sponsorship">{c.cta.button}{isRtl ? <ArrowLeft /> : <ArrowRight />}</a>
            </Button>
          </div>
        </section>

        <RevealSection id="sponsorship" className="bg-surface py-24 sm:py-32">
          <div className="section-shell grid gap-12 lg:grid-cols-[.7fr_1.3fr]">
            <SectionHeading title={c.form.heading} subtitle={c.form.description} index="07" />
            <SponsorshipForm />
          </div>
        </RevealSection>

        <RevealSection id="contact" className="bg-background py-24 sm:py-28">
          <div className="section-shell">
            <SectionHeading title={c.contact.heading} subtitle={c.contact.subheading} index="08" />
            <div className="mt-12 grid border-s border-t border-border md:grid-cols-3">
              {c.contact.people.map((person) => (
                <article key={person.phone} className="border-e border-b border-border p-7 sm:p-8">
                  <Users className="text-accent" />
                  <p className="mt-8 text-sm text-muted-foreground">{person.role}</p>
                  <h3 className="mt-2 text-xl font-semibold text-primary">{person.name}</h3>
                  <a href={`tel:${person.phone.replace(/\s/g, "")}`} className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary" dir="ltr">
                    <Phone className="size-4" />{person.phone}
                  </a>
                </article>
              ))}
            </div>
          </div>
        </RevealSection>
      </main>

      <footer className="bg-primary py-14 text-primary-foreground">
        <div className="section-shell grid gap-10 md:grid-cols-[1.2fr_.8fr_.8fr]">
          <div>
            <BrandMark />
            <h2 className="mt-5 font-display text-2xl font-semibold">{c.brand.name}</h2>
            <p className="mt-2 text-sm text-primary-foreground/65">{c.brand.university}</p>
            <p className="mt-6 text-sm text-accent">{c.brand.slogan}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-accent">{c.footer.navHeading}</h3>
            <nav className="mt-5 grid gap-3">
              {navItems.slice(0, 5).map(([key, id]) => <a key={key} href={`#${id}`} className="text-sm text-primary-foreground/70 hover:text-primary-foreground">{c.nav[key]}</a>)}
            </nav>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-accent">{c.footer.contactHeading}</h3>
            <div className="mt-5 grid gap-3">
              {c.contact.people.map((person) => (
                <a key={person.phone} href={`tel:${person.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 text-sm text-primary-foreground/70 hover:text-primary-foreground" dir="ltr"><Phone className="size-3.5" />{person.phone}</a>
              ))}
            </div>
          </div>
        </div>
        <div className="section-shell mt-12 flex flex-col gap-3 border-t border-primary-foreground/15 pt-6 text-xs text-primary-foreground/50 sm:flex-row sm:items-center sm:justify-between">
          <span>{c.footer.copyright}</span>
          <span>{locale === "ar" ? "الموقع الرسمي للشراكات والرعاية" : "Official partnerships and sponsorships website"}</span>
        </div>
      </footer>
    </div>
  );
}

function BrandMark({ large = false }: { large?: boolean }) {
  return (
    <div className={cn("grid place-items-center border border-current text-current", large ? "size-24" : "size-11")} aria-hidden="true">
      <Scale className={large ? "size-11" : "size-5"} />
    </div>
  );
}

function SectionHeading({ title, subtitle, eyebrow, index, inverted, centered }: { title: string; subtitle?: string; eyebrow?: string; index: string; inverted?: boolean; centered?: boolean }) {
  return (
    <div className={cn(centered && "mx-auto max-w-2xl text-center")}>
      <div className={cn("flex items-center gap-4", centered && "justify-center")}>
        <span className={cn("text-xs font-semibold", inverted ? "text-accent" : "text-muted-foreground")}>{index}</span>
        <span className={cn("h-px w-10", inverted ? "bg-accent" : "bg-accent")} />
        {eyebrow && <span className={cn("section-kicker", inverted ? "text-accent" : "text-primary")}>{eyebrow}</span>}
      </div>
      <h2 className={cn("mt-5 text-balance-title font-display text-4xl font-semibold sm:text-5xl", inverted ? "text-primary-foreground" : "text-primary")}>{title}</h2>
      {subtitle && <p className={cn("mt-5 max-w-2xl leading-7", inverted ? "text-primary-foreground/65" : "text-muted-foreground")}>{subtitle}</p>}
    </div>
  );
}

function RevealSection({ children, className, id }: { children: ReactNode; className?: string; id?: string }) {
  const { ref, visible } = useReveal<HTMLElement>();
  return <section id={id} ref={ref} className={cn("reveal", visible && "reveal-in", className)}>{children}</section>;
}

function SponsorshipForm() {
  const { c } = useI18n();
  const submit = useServerFn(submitSponsorshipRequest);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<{ kind: "idle" | "loading" | "success" | "error"; reference?: string }>({ kind: "idle" });
  const optionGroups = useMemo(() => ({
    partnershipType: PARTNERSHIP_TYPE_KEYS.map((key) => ({ key, label: c.form.partnershipTypes[key] })),
    programInterest: PROGRAM_KEYS.map((key) => ({ key, label: c.form.programs[key] })),
    estimatedBudget: BUDGET_KEYS.map((key) => ({ key, label: c.form.budgets[key] })),
  }), [c]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) return setStatus({ kind: "error" });
    const data = new FormData(event.currentTarget);
    const payload: SponsorshipSubmission = {
      fullName: String(data.get("fullName") ?? ""),
      companyName: String(data.get("companyName") ?? ""),
      jobTitle: String(data.get("jobTitle") ?? ""),
      phone: String(data.get("phone") ?? ""),
      email: String(data.get("email") ?? ""),
      website: String(data.get("website") ?? ""),
      partnershipType: String(data.get("partnershipType") ?? ""),
      programInterest: String(data.get("programInterest") ?? ""),
      estimatedBudget: String(data.get("estimatedBudget") ?? ""),
      message: String(data.get("message") ?? ""),
      consent: true,
    };
    setStatus({ kind: "loading" });
    try {
      const result = await submit({ data: payload });
      setStatus({ kind: "success", reference: result.referenceNumber });
      event.currentTarget.reset();
      setConsent(false);
    } catch {
      setStatus({ kind: "error" });
    }
  }

  if (status.kind === "success") {
    return (
      <div className="border border-border bg-background p-8 sm:p-12" role="status">
        <div className="grid size-12 place-items-center bg-primary text-primary-foreground"><Check /></div>
        <h3 className="mt-8 text-3xl font-semibold text-primary">{c.form.success.heading}</h3>
        <p className="mt-4 leading-7 text-muted-foreground">{c.form.success.body}</p>
        <div className="mt-8 border-y border-border py-5">
          <span className="text-sm text-muted-foreground">{c.form.success.referenceLabel}</span>
          <strong className="ltr-inline mt-1 block text-xl text-primary">{status.reference}</strong>
        </div>
        <p className="mt-5 text-sm text-muted-foreground">{c.form.success.note}</p>
        <Button className="mt-8" onClick={() => setStatus({ kind: "idle" })}>{c.form.success.again}</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 border border-border bg-background p-6 sm:grid-cols-2 sm:p-10" noValidate>
      <FormField name="fullName" label={c.form.fields.fullName.label} placeholder={c.form.fields.fullName.placeholder} required />
      <FormField name="companyName" label={c.form.fields.company.label} placeholder={c.form.fields.company.placeholder} required />
      <FormField name="jobTitle" label={c.form.fields.jobTitle.label} placeholder={c.form.fields.jobTitle.placeholder} required />
      <FormField name="phone" label={c.form.fields.phone.label} placeholder={c.form.fields.phone.placeholder} type="tel" dir="ltr" required />
      <FormField name="email" label={c.form.fields.email.label} placeholder={c.form.fields.email.placeholder} type="email" dir="ltr" required />
      <FormField name="website" label={c.form.fields.website.label} placeholder={c.form.fields.website.placeholder} type="url" dir="ltr" />
      <SelectField name="partnershipType" label={c.form.fields.partnershipType.label} placeholder={c.form.fields.partnershipType.placeholder} options={optionGroups.partnershipType} required />
      <SelectField name="programInterest" label={c.form.fields.programInterest.label} placeholder={c.form.fields.programInterest.placeholder} options={optionGroups.programInterest} />
      <SelectField name="estimatedBudget" label={c.form.fields.budget.label} placeholder={c.form.fields.budget.placeholder} options={optionGroups.estimatedBudget} />
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="message">{c.form.fields.message.label}</Label>
        <Textarea id="message" name="message" placeholder={c.form.fields.message.placeholder} className="min-h-32 resize-y" />
      </div>
      <div className="flex items-start gap-3 sm:col-span-2">
        <Checkbox id="consent" checked={consent} onCheckedChange={(value) => setConsent(value === true)} className="mt-0.5" />
        <Label htmlFor="consent" className="text-sm font-normal leading-6 text-muted-foreground">{c.form.fields.consent.label}</Label>
      </div>
      {status.kind === "error" && <p className="text-sm text-destructive sm:col-span-2" role="alert">{consent ? c.form.errors.submit : c.form.errors.consent}</p>}
      <Button type="submit" size="lg" disabled={status.kind === "loading"} className="sm:col-span-2 sm:justify-self-start">
        {status.kind === "loading" ? c.form.submitting : c.form.submit}
      </Button>
    </form>
  );
}

function FormField({ name, label, placeholder, type = "text", dir, required }: { name: string; label: string; placeholder: string; type?: string; dir?: "ltr" | "rtl"; required?: boolean }) {
  return <div className="grid gap-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type={type} placeholder={placeholder} dir={dir} required={required} /></div>;
}

function SelectField({ name, label, placeholder, options, required }: { name: string; label: string; placeholder: string; options: { key: string; label: string }[]; required?: boolean }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <select id={name} name={name} required={required} defaultValue="" className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pe-10 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
          <option value="" disabled>{placeholder}</option>
          {options.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}