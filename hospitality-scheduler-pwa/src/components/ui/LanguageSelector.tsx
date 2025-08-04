// src/components/ui/LanguageSelector.tsx
// Language selector component for easy language switching in the app

'use client';

import { useTranslations, useLanguageSelector } from '@/hooks/useTranslations';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Globe, Check } from 'lucide-react';

// Simple Language Selector (for header/navbar)
export const LanguageSelector = () => {
  const { locale, setLocale, availableLanguages, currentLanguage } = useLanguageSelector();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <span className="text-base mr-1">{currentLanguage?.flag}</span>
          <span className="hidden sm:inline-block text-sm">
            {currentLanguage?.name}
          </span>
          <Globe className="h-3 w-3 ml-1 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {availableLanguages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => setLocale(language.code)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{language.flag}</span>
              <span className="text-sm">{language.name}</span>
            </div>
            {language.code === locale && (
              <Check className="h-3 w-3 text-green-600" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Expanded Language Selector (for settings page)
export const LanguageSelectorExpanded = () => {
  const { locale, setLocale, availableLanguages } = useLanguageSelector();
  const { t } = useTranslations();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">{t('common.switchLanguage')}</h3>
      <div className="grid grid-cols-1 gap-2">
        {availableLanguages.map((language) => (
          <Button
            key={language.code}
            variant={language.code === locale ? 'default' : 'outline'}
            onClick={() => setLocale(language.code)}
            className="justify-start h-auto p-3"
          >
            <div className="flex items-center gap-3 w-full">
              <span className="text-lg">{language.flag}</span>
              <div className="flex-1 text-left">
                <div className="font-medium">{language.name}</div>
                <div className="text-xs opacity-75">
                  {language.code === 'en' ? 'English' : 'Italiano'}
                </div>
              </div>
              {language.code === locale && (
                <Badge variant="secondary" className="text-xs">
                  {t('common.active')}
                </Badge>
              )}
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};

// Simple Language Toggle (minimal design)
export const LanguageToggle = () => {
  const { locale, setLocale, availableLanguages } = useLanguageSelector();
  
  const toggleLanguage = () => {
    const currentIndex = availableLanguages.findIndex(lang => lang.code === locale);
    const nextIndex = (currentIndex + 1) % availableLanguages.length;
    setLocale(availableLanguages[nextIndex].code);
  };

  const currentLanguage = availableLanguages.find(lang => lang.code === locale);

  return (
    <Button
      onClick={toggleLanguage}
      variant="outline"
      size="sm"
      className="fixed bottom-4 right-4 h-10 w-10 p-0 rounded-full shadow-lg z-50 bg-white hover:bg-gray-50"
      title={`Switch to ${locale === 'en' ? 'Italiano' : 'English'}`}
    >
      <span className="text-lg">{currentLanguage?.flag}</span>
    </Button>
  );
};

// Language Selector with Preview (for onboarding/setup)
export const LanguageSelectorWithPreview = () => {
  const { locale, setLocale, availableLanguages } = useLanguageSelector();
  const { t } = useTranslations();

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">
          {t('common.switchLanguage')}
        </h2>
        <p className="text-gray-600">
          {t('common.currentLanguage')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {availableLanguages.map((language) => (
          <div
            key={language.code}
            className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all ${
              language.code === locale
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setLocale(language.code)}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{language.flag}</span>
              <div>
                <div className="font-medium">{language.name}</div>
                <div className="text-sm text-gray-500">
                  {language.code === 'en' ? 'English' : 'Italiano'}
                </div>
              </div>
            </div>
            
            {language.code === locale && (
              <div className="absolute top-2 right-2">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              </div>
            )}
            
            {/* Preview text using existing translations */}
            <div className="mt-3 text-sm text-gray-600 border-t pt-2">
              {language.code === 'en' 
                ? 'Hospitality Scheduler'
                : 'Scheduler di ospitalità'
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Export the main component
export default LanguageSelector;