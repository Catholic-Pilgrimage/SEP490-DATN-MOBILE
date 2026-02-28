/**
 * i18n Configuration
 * Internationalization setup using react-i18next
 * Supports Vietnamese (default) and English
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import i18n, { LanguageDetectorAsyncModule } from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import language files
import en from './locales/en.json';
import vi from './locales/vi.json';

// Available languages
export const LANGUAGES = {
    VI: 'vi',
    EN: 'en',
} as const;

export type LanguageCode = typeof LANGUAGES[keyof typeof LANGUAGES];

// Language display names
export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
    vi: 'Tiếng Việt',
    en: 'English',
};

// Storage key for Persistence
const STORE_LANGUAGE_KEY = 'settings.lang';

// Language Detector Plugin for 10/10 UX
const languageDetector: LanguageDetectorAsyncModule = {
    type: 'languageDetector',
    async: true,
    detect: async () => {
        try {
            // 1. Check if user already chose a language (Persistence)
            const savedLanguage = await AsyncStorage.getItem(STORE_LANGUAGE_KEY);
            if (savedLanguage) {
                return savedLanguage;
            }

            // 2. Auto-detect from Device OS (Auto-detect fallback)
            const deviceLocales = Localization.getLocales();
            const bestLanguage = deviceLocales[0]?.languageCode;

            if (bestLanguage === 'vi' || bestLanguage === 'en') {
                return bestLanguage;
            }

            // 3. Ultimate Fallback
            return LANGUAGES.VI;
        } catch (error) {
            console.error('Error reading language', error);
            return LANGUAGES.VI;
        }
    },
    init: () => { },
    cacheUserLanguage: async (lng: string) => {
        try {
            // Caches user selection when changed internally by the app later
            await AsyncStorage.setItem(STORE_LANGUAGE_KEY, lng);
        } catch (error) {
            console.error('Error saving language', error);
        }
    },
};

// Initialize i18n
i18n
    .use(languageDetector)
    .use(initReactI18next)
    .init({
        compatibilityJSON: 'v4', // For React Native compatibility
        resources: {
            vi: { translation: vi },
            en: { translation: en },
        },
        fallbackLng: LANGUAGES.VI,
        interpolation: {
            escapeValue: false, // React already escapes values
        },
        react: {
            useSuspense: false, // Prevent white screen on load in RN
        },
    });

export default i18n;
