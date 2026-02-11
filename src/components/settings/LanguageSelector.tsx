import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLocaleStore } from '@/stores/settings/useLocaleStore';
import type { AppLocale } from '@/locales';
import { supportedLocales } from '@/lib/i18n';

export function LanguageSelector() {
  const { t } = useTranslation();
  const { locale, setLocale } = useLocaleStore();

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <div className="text-sm font-medium">{t('header.language')}</div>
        <div className="text-xs text-muted-foreground">{t('header.changeLanguage')}</div>
      </div>
      <Select value={locale} onValueChange={(value) => setLocale(value as AppLocale)}>
        <SelectTrigger className="h-8 w-[180px] text-xs" aria-label={t('header.changeLanguage')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {supportedLocales.map(({ code, label }) => (
            <SelectItem key={code} value={code} className="text-xs">
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
