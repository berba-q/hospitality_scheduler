// src/hooks/useTranslations.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Dictionary, 
  getDictionary, 
  getLocaleFromBrowser, 
  setLocale as setGlobalLocale,
  getTranslation
} from '@/lib/i18n/utils';
import { Locale, defaultLocale, isValidLocale } from '@/lib/i18n/config';

export function useTranslations() {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [dictionary, setDictionary] = useState<Dictionary>(() => 
    getDictionary(defaultLocale)
  );

  // Initialize locale from browser/localStorage on first load
  useEffect(() => {
    const detectedLocale = getLocaleFromBrowser();
    setLocaleState(detectedLocale);
    setDictionary(getDictionary(detectedLocale));
  }, []);

  // Listen for locale changes from other components
  useEffect(() => {
    const handleLocaleChange = (event: CustomEvent<{ locale: Locale }>) => {
      const newLocale = event.detail.locale;
      setLocaleState(newLocale);
      setDictionary(getDictionary(newLocale));
    };

    window.addEventListener('localechange', handleLocaleChange as EventListener);
    return () => {
      window.removeEventListener('localechange', handleLocaleChange as EventListener);
    };
  }, []);

  // Function to change locale
  const setLocale = useCallback((newLocale: Locale) => {
    if (isValidLocale(newLocale)) {
      setGlobalLocale(newLocale);
      setLocaleState(newLocale);
      setDictionary(getDictionary(newLocale));
    }
  }, []);

  // Translation function with nested key support
  const t = useCallback((key: string): string => {
    return getTranslation(dictionary, key);
  }, [dictionary]);

  return {
    locale,
    setLocale,
    t,
    dictionary,
  };
}

// Language selector hook for UI components
export function useLanguageSelector() {
  const { locale, setLocale } = useTranslations();
  
  const availableLanguages = [
    { code: 'en' as const, name: 'English', flag: '🇺🇸' },
    { code: 'it' as const, name: 'Italiano', flag: '🇮🇹' },
  ];

  const currentLanguage = availableLanguages.find(lang => lang.code === locale);

  return {
    locale,
    setLocale,
    availableLanguages,
    currentLanguage,
  };
}