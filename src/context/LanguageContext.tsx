/**
 * LanguageContext
 * ---------------
 * Handles localisation for the entire app. The provider bootstraps the user's
 * persisted language preference and exposes a `t` helper to lookup translated
 * keys with optional interpolation parameters.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { translations, SupportedLanguage } from "../i18n/translations";

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const STORAGE_KEY = "volunteerhub_language";

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    const loadStoredLanguage = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored === "en" || stored === "no") {
          setLanguageState(stored);
        }
      } catch (error) {
        console.warn("Failed to load stored language", error);
      } finally {
        setInitialised(true);
      }
    };

    loadStoredLanguage();
  }, []);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    // Update state immediately; persistence is handled in the subsequent effect.
    setLanguageState(lang);
  }, []);

  useEffect(() => {
    if (!initialised) return;
    // Persist preference so native reloads remember the last selected locale.
    AsyncStorage.setItem(STORAGE_KEY, language).catch((error) => {
      console.warn("Failed to persist language", error);
    });
  }, [language, initialised]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      // Fallback to English whenever a key is missing in the desired locale.
      const dictionary = translations[language] ?? translations.en;
      const template = dictionary[key] ?? translations.en[key] ?? key;
      if (!params) return template;
      return template.replace(/\{\{(\w+)\}\}/g, (_, token: string) => {
        const value = params[token];
        return value !== undefined ? String(value) : "";
      });
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
    }),
    [language, setLanguage, t]
  );

  if (!initialised && Platform.OS !== "web") {
    // Avoid flashing default language on native before AsyncStorage hydrates.
    return null;
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};
