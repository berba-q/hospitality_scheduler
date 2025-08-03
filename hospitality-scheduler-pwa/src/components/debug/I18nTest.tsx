// src/components/test/I18nTest.tsx
'use client';

import { useTranslations, useLanguageSelector } from '@/hooks/useTranslations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function I18nTest() {
  const { t, locale } = useTranslations();
  const { availableLanguages, setLocale, currentLanguage } = useLanguageSelector();

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>🌍 Translation Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test translations */}
        <div className="space-y-2">
          <h3 className="font-medium">Test Translations:</h3>
          <p className="text-lg font-semibold text-blue-600">
            {t('test.welcome')}
          </p>
          <p className="text-sm text-gray-600">
            {t('test.currentLanguage')}: {currentLanguage?.flag} {currentLanguage?.name}
          </p>
        </div>

        {/* Language switcher */}
        <div className="space-y-2">
          <h4 className="font-medium">{t('test.switchLanguage')}:</h4>
          <div className="flex gap-2">
            {availableLanguages.map((language) => (
              <Button
                key={language.code}
                variant={language.code === locale ? 'default' : 'outline'}
                onClick={() => setLocale(language.code)}
                className="flex items-center gap-2"
              >
                {language.flag} {language.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Common translations test */}
        <div className="space-y-2">
          <h4 className="font-medium">Common Buttons:</h4>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">{t('common.save')}</Button>
            <Button variant="outline" size="sm">{t('common.cancel')}</Button>
            <Button variant="outline" size="sm">{t('common.refresh')}</Button>
          </div>
        </div>

        {/* Navigation test */}
        <div className="space-y-2">
          <h4 className="font-medium">Navigation:</h4>
          <div className="grid grid-cols-2 gap-1 text-sm">
            <span>• {t('navigation.dashboard')}</span>
            <span>• {t('navigation.schedule')}</span>
            <span>• {t('navigation.swaps')}</span>
            <span>• {t('navigation.staff')}</span>
          </div>
        </div>

        {/* Current locale info */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
          <strong>Debug Info:</strong><br />
          Current locale: <code>{locale}</code><br />
          LocalStorage: <code>{typeof window !== 'undefined' ? localStorage.getItem('locale') || 'none' : 'server'}</code>
        </div>
      </CardContent>
    </Card>
  );
}