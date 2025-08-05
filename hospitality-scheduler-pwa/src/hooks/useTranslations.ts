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

// Template parameters type
type TemplateParams = Record<string, string | number>;

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

  // Enhanced translation function with template parameter support
  const t = useCallback((key: string, params?: TemplateParams): string => {
    // Get the base translation
    let translation = getTranslation(dictionary, key);
    
    // If no template parameters provided, return as-is
    if (!params) return translation;
    
    // Replace template variables like {{name}}, {{count}}, etc.
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      const template = `{{${paramKey}}}`;
      // Use global regex to replace all occurrences
      const regex = new RegExp(template.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      translation = translation.replace(regex, String(paramValue));
    });
    
    return translation;
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