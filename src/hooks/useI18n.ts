/**
 * useI18n Hook
 * Custom hook for i18n functionality
 * Provides translation function and language switching
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES, LANGUAGE_NAMES, LanguageCode } from '../i18n';

export const useI18n = () => {
    const { t, i18n: i18nInstance } = useTranslation();

    // Get current language
    const currentLanguage = i18nInstance.language as LanguageCode;

    // Get current language display name
    const currentLanguageName = LANGUAGE_NAMES[currentLanguage] || LANGUAGE_NAMES.vi;

    // Change language
    const changeLanguage = useCallback(async (language: LanguageCode) => {
        await i18nInstance.changeLanguage(language);
    }, [i18nInstance]);

    // Toggle between Vietnamese and English
    const toggleLanguage = useCallback(async () => {
        const newLanguage = currentLanguage === LANGUAGES.VI ? LANGUAGES.EN : LANGUAGES.VI;
        await changeLanguage(newLanguage);
    }, [currentLanguage, changeLanguage]);

    // Check if current language is Vietnamese
    const isVietnamese = currentLanguage === LANGUAGES.VI;

    // Check if current language is English
    const isEnglish = currentLanguage === LANGUAGES.EN;

    return {
        t,
        currentLanguage,
        currentLanguageName,
        changeLanguage,
        toggleLanguage,
        isVietnamese,
        isEnglish,
        languages: LANGUAGES,
        languageNames: LANGUAGE_NAMES,
    };
};

export default useI18n;
