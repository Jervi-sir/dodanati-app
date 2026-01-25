import { useLanguageStore, Language } from '@/stores/language-store';

type TranslationValue = { [key in Language]?: string };
type TranslationObject = Record<string, TranslationValue>;

export const useTrans = <T extends TranslationObject>(translations: T) => {
  const { language, isRTL, setLanguage } = useLanguageStore();

  const t = (key: keyof T): string => {
    const entry = translations[key];
    if (!entry) return String(key);

    return entry[language] || entry['fr'] || entry['en'] || '';
  };

  return {
    t,
    language,
    isRTL,
    setLanguage
  };
};
