// src/lib/i18n/utils.ts
import { Locale, defaultLocale, isValidLocale } from './config';
import en from './dictionaries/en';
import it from './dictionaries/it';

// Create a more flexible type that accepts any string values
export type Dictionary = {
  common: {
    save: string;
    cancel: string;
    loading: string;
    error: string;
    success: string;
    back: string;
    next: string;
    close: string;
    open: string;
    refresh: string;
  };
  navigation: {
    dashboard: string;
    schedule: string;
    swaps: string;
    staff: string;
    facilities: string;
    profile: string;
    settings: string;
    logout: string;
  };
  test: {
    welcome: string;
    currentLanguage: string;
    switchLanguage: string;
  };
};

// Get dictionary synchronously for client-side usage
export function getDictionary(locale: Locale): Dictionary {
  switch (locale) {
    case 'it':
      return it;
    case 'en':
    default:
      return en;
  }
}

// Get locale from browser/localStorage
export function getLocaleFromBrowser(): Locale {
  if (typeof window === 'undefined') {
    return defaultLocale;
  }
  
  // First check localStorage
  const storedLocale = localStorage.getItem('locale');
  if (storedLocale && isValidLocale(storedLocale)) {
    return storedLocale;
  }
  
  // Then check browser language
  const browserLocale = navigator.language.split('-')[0];
  if (isValidLocale(browserLocale)) {
    return browserLocale;
  }
  
  return defaultLocale;
}

// Set locale in localStorage
export function setLocale(locale: Locale): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('locale', locale);
    document.documentElement.lang = locale;
    
    // Trigger custom event for locale change
    window.dispatchEvent(new CustomEvent('localechange', { 
      detail: { locale } 
    }));
  }
}

// Simple nested key access for translations
export function getTranslation(dict: Dictionary, key: string): string {
  const keys = key.split('.');
  let value: any = dict;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      console.warn(`Translation key '${key}' not found`);
      return key;
    }
  }
  
  return typeof value === 'string' ? value : key;
}