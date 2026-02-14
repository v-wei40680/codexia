import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppLocale } from '@/locales';

interface LocaleState {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'en',
      setLocale: (locale: AppLocale) => set({ locale }),
    }),
    {
      name: 'locale-storage',
      version: 2,
    }
  )
);
