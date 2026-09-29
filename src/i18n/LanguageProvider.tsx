import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { translations, type Content, type Locale } from "./translations";

const STORAGE_KEY = "lawclub.locale";

type I18nValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  isRtl: boolean;
  c: Content;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
};

const I18nContext = createContext<I18nValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "ar") setLocaleState(stored);
    } catch {
      /* Language switching still works when storage is blocked. */
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("lang", locale);
    root.setAttribute("dir", locale === "ar" ? "rtl" : "ltr");
    const meta = translations[locale].meta;
    const admin = window.location.pathname.startsWith("/admin");
    document.title = admin ? meta.adminTitle : meta.title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", admin ? meta.adminDescription : meta.description);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* Storage may be blocked. */
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      dir: locale === "ar" ? "rtl" : "ltr",
      isRtl: locale === "ar",
      c: translations[locale],
      setLocale,
      toggleLocale: () => setLocale(locale === "ar" ? "en" : "ar"),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <LanguageProvider>");
  return ctx;
}
