/**
 * i18n Configuration
 * Internationalization setup using react-i18next
 * Supports Vietnamese (default) and English
 */
import i18n from 'i18next';
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

// Initialize i18n
i18n
    .use(initReactI18next)
    .init({
        resources: {
            vi: { translation: vi },
            en: { translation: en },
        },
        lng: LANGUAGES.VI, // Default language is Vietnamese
        fallbackLng: LANGUAGES.VI,
        interpolation: {
            escapeValue: false, // React already escapes values
        },
        compatibilityJSON: 'v4', // For React Native compatibility
    });

export default i18n;
