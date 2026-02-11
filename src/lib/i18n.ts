import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { AppLocale, localeLabels, localeResources } from '@/locales';
import { useLocaleStore } from '@/stores/settings/useLocaleStore';

const fallbackLocale: AppLocale = 'en';
const initialLocale = useLocaleStore.getState().locale ?? fallbackLocale;

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: localeResources,
    lng: initialLocale,
    fallbackLng: fallbackLocale,
    interpolation: {
      escapeValue: false,
    },
  });
}

// Keep the active i18next language in sync with the persisted locale store.
useLocaleStore.subscribe((state) => {
  if (i18n.language !== state.locale) {
    void i18n.changeLanguage(state.locale);
  }
});

export { i18n };

export const supportedLocales = (Object.keys(localeResources) as AppLocale[]).map((code) => ({
  code,
  label: localeLabels[code],
}));
