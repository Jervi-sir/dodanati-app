import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

export type Language = 'ar' | 'en' | 'fr';

interface LanguageState {
  language: Language;
  isRTL: boolean;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en', // default to French as per initial app state
      isRTL: false,
      setLanguage: (lang: Language) => {
        const isRTL = lang === 'ar';
        set({ language: lang, isRTL });

        // Handle native RTL layout changes
        if (I18nManager.isRTL !== isRTL) {
          I18nManager.allowRTL(isRTL);
          I18nManager.forceRTL(isRTL);
          // Reloading is often required for RTL changes to take full effect on Android/iOS
          // Updates.reloadAsync(); // Optional: decided by implementation complexity
        }
      },
    }),
    {
      name: 'language-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
