// src/lib/i18n/config.ts
export const defaultLocale = 'en' as const;
export const locales = ['en', 'it'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  it: 'Italiano',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  it: '🇮🇹',
};

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}