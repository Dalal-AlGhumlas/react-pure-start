import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/LanguageProvider";
import { PROGRAM_KEYS } from "@/i18n/translations";
import { submitSponsorshipRequest } from "@/lib/sponsorship.functions";
import {
  fieldErrorKeys,
  submissionSchema,
  validationErrors,
  type FieldErrors,
  type SponsorshipField,
} from "@/lib/sponsorship.schema";

export function SponsorshipForm() {
  const { c } = useI18n();
  const submit = useServerFn(submitSponsorshipRequest);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "unavailable">(
    "idle",
  );
  const [reference, setReference] = useState("");
  const busy = useRef(false);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  function validate(form: HTMLFormElement) {
    const values = Object.fromEntries(new FormData(form));
    return submissionSchema.safeParse({ ...values, consent });
  }
  function revalidate(event: FormEvent<HTMLFormElement>) {
    if (
      !attempted ||
      busy.current ||
      !(event.target instanceof HTMLElement) ||
      !event.target.getAttribute("name")
    )
      return;
    const result = validate(event.currentTarget);
    setErrors(result.success ? {} : validationErrors(result.error));
    setStatus("idle");
  }
  function focusFirst(form: HTMLFormElement, fieldErrors: FieldErrors) {
    const field = Object.keys(fieldErrors)[0];
    if (field) form.querySelector<HTMLElement>(`#${field}`)?.focus();
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;
    const form = event.currentTarget;
    setAttempted(true);
    const parsed = validate(form);
    if (!parsed.success) {
      const fieldErrors = validationErrors(parsed.error);
      setErrors(fieldErrors);
      setStatus("idle");
      focusFirst(form, fieldErrors);
      return;
    }
    busy.current = true;
    setErrors({});
    setStatus("loading");
    try {
      const result = await submit({ data: parsed.data });
      if (result.ok) {
        setReference(result.referenceNumber);
        setStatus("success");
        setConsent(false);
      } else if (result.code === "validation") {
        setErrors(result.errors);
        setStatus("idle");
        focusFirst(form, result.errors);
      } else setStatus(result.code === "unavailable" ? "unavailable" : "error");
    } catch {
      setStatus("error");
    } finally {
      busy.current = false;
    }
  }
  const errorFor = (field: SponsorshipField) =>
    errors[field] ? c.form.errors[fieldErrorKeys[field]] : undefined;
  const fieldProps = (name: SponsorshipField) => ({ name, error: errorFor(name) });

  if (status === "success")
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        className="min-w-0 border border-border bg-background p-8 sm:p-12"
        role="status"
      >
        <div className="grid size-12 place-items-center bg-primary text-primary-foreground">
          <Check />
        </div>
        <h3 className="mt-8 text-3xl font-semibold text-primary">{c.form.success.heading}</h3>
        <p className="mt-4 leading-7 text-muted-foreground">{c.form.success.body}</p>
        <div className="mt-8 border-y border-border py-5">
          <span className="text-sm text-muted-foreground">{c.form.success.referenceLabel}</span>
          <strong className="mt-1 block break-words text-xl text-primary" dir="ltr">
            {reference}
          </strong>
        </div>
        <p className="mt-5 text-sm text-muted-foreground">{c.form.success.note}</p>
        <Button
          className="mt-8"
          onClick={() => {
            setStatus("idle");
            setAttempted(false);
          }}
        >
          {c.form.success.again}
        </Button>
      </div>
    );
  return (
    <form
      onSubmit={handleSubmit}
      onChange={revalidate}
      noValidate
      aria-busy={status === "loading"}
      className="min-w-0 border border-border bg-background p-6 sm:p-10"
    >
      <fieldset disabled={status === "loading"} className="grid min-w-0 gap-6 sm:grid-cols-2">
        {Object.keys(errors).length > 0 && (
          <p className="text-sm text-destructive sm:col-span-2" role="alert">
            {c.form.errors.summary}
          </p>
        )}
        <FormField
          {...fieldProps("fullName")}
          {...c.form.fields.fullName}
          autoComplete="name"
          maxLength={120}
          required
        />
        <FormField
          {...fieldProps("companyName")}
          {...c.form.fields.company}
          autoComplete="organization"
          maxLength={160}
          required
        />
        <FormField
          {...fieldProps("phone")}
          {...c.form.fields.phone}
          autoComplete="tel"
          maxLength={40}
          type="tel"
          dir="ltr"
          required
        />
        <SelectField
          {...fieldProps("programInterest")}
          {...c.form.fields.programInterest}
          options={PROGRAM_KEYS.map((key) => ({ key, label: c.form.programs[key] }))}
        />
        <div className="grid min-w-0 gap-2 sm:col-span-2">
          <Label htmlFor="message">
            {c.form.fields.message.label}{" "}
            <span className="text-xs text-muted-foreground">({c.form.optional})</span>
          </Label>
          <Textarea
            id="message"
            name="message"
            maxLength={4000}
            placeholder={c.form.fields.message.placeholder}
            className="min-h-32 resize-y"
            aria-invalid={!!errors.message}
            aria-describedby={errors.message ? "message-error" : undefined}
          />
          <FieldError name="message" error={errorFor("message")} />
        </div>
        <div className="sm:col-span-2">
          <div className="flex items-start gap-3">
            <Checkbox
              id="consent"
              checked={consent}
              onCheckedChange={(value) => {
                setConsent(value === true);
                setErrors((previous) => {
                  const next = { ...previous };
                  if (value === true) delete next.consent;
                  else if (attempted) next.consent = "consent";
                  return next;
                });
              }}
              aria-required="true"
              aria-invalid={!!errors.consent}
              aria-describedby={errors.consent ? "consent-error" : undefined}
              className="mt-0.5"
            />
            <Label
              htmlFor="consent"
              className="text-sm font-normal leading-6 text-muted-foreground"
            >
              {c.form.fields.consent.label}
            </Label>
          </div>
          <FieldError name="consent" error={errorFor("consent")} />
        </div>
        {(status === "error" || status === "unavailable") && (
          <p className="text-sm text-destructive sm:col-span-2" role="alert">
            {status === "unavailable" ? c.form.errors.unavailable : c.form.errors.submit}
          </p>
        )}
        <Button type="submit" size="lg" className="sm:col-span-2 sm:justify-self-start">
          {status === "loading" ? c.form.submitting : c.form.submit}
        </Button>
      </fieldset>
    </form>
  );
}

function FieldError({ name, error }: { name: string; error: string | undefined }) {
  return error ? (
    <p id={`${name}-error`} className="text-sm text-destructive">
      {error}
    </p>
  ) : null;
}
type FieldProps = {
  name: string;
  label: string;
  placeholder: string;
  required?: boolean;
  error: string | undefined;
};
function FieldLabel({ name, label, required }: Omit<FieldProps, "error" | "placeholder">) {
  const { c } = useI18n();
  return (
    <Label htmlFor={name}>
      {label}{" "}
      <span className="text-xs text-muted-foreground">
        ({required ? c.form.required : c.form.optional})
      </span>
    </Label>
  );
}
function FormField({
  name,
  label,
  error,
  ...props
}: FieldProps & { type?: string; dir?: "ltr"; autoComplete?: string; maxLength?: number }) {
  return (
    <div className="grid min-w-0 gap-2">
      <FieldLabel name={name} label={label} required={!!props.required} />
      <Input
        id={name}
        name={name}
        {...props}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      <FieldError name={name} error={error} />
    </div>
  );
}
function SelectField({
  name,
  label,
  placeholder,
  options,
  required,
  error,
}: FieldProps & { options: { key: string; label: string }[] }) {
  return (
    <div className="grid min-w-0 gap-2">
      <FieldLabel name={name} label={label} required={!!required} />
      <div className="relative min-w-0">
        <select
          id={name}
          name={name}
          required={required}
          defaultValue=""
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className="h-10 w-full min-w-0 appearance-none rounded-md border border-input bg-background px-3 pe-10 text-sm text-foreground focus-visible:ring-1 focus-visible:ring-ring"
        >
<option value="" hidden>
  {placeholder}
</option>
          {options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      <FieldError name={name} error={error} />
    </div>
  );
}
