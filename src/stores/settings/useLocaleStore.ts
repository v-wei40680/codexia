import { create } from 'zustand';
import { AppLocale } from '@/locales';

interface LocaleState {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

export const useLocaleStore = create<LocaleState>()((set) => ({
  locale: 'en',
  setLocale: (locale: AppLocale) => set({ locale }),
}));
