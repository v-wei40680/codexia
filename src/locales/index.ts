import { en } from "./en";
import { zh } from "./zh";
import { ja } from "./ja";

export const localeResources = {
  en: { translation: en },
  zh: { translation: zh },
  ja: { translation: ja },
} as const;

export type AppLocale = keyof typeof localeResources;

export const localeLabels: Record<AppLocale, string> = {
  en: "English",
  zh: "中文",
  ja: "日本語",
};
