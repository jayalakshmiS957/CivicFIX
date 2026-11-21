import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { en } from '../i18n/en.js';
import { ta } from '../i18n/ta.js';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'civicresolve_lang';

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'ta' || saved === 'en') return saved;
    } catch {
      // ignore localStorage error
    }
    return 'en';
  });

  const setLanguage = useCallback((newLang) => {
    const lang = newLang === 'ta' ? 'ta' : 'en';
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore localStorage error
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = useCallback(
    (key, params = {}) => {
      const dict = language === 'ta' ? ta : en;
      let text = dict[key] !== undefined ? dict[key] : en[key];

      if (text === undefined) {
        return key;
      }

      if (params && typeof params === 'object') {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }

      return text;
    },
    [language]
  );

  const value = {
    language,
    lang: language,
    setLanguage,
    t,
    isTamil: language === 'ta',
    isEnglish: language === 'en',
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      language: 'en',
      lang: 'en',
      setLanguage: () => {},
      t: (k, params = {}) => {
        let text = en[k] !== undefined ? en[k] : k;
        if (params && typeof params === 'object') {
          Object.entries(params).forEach(([pk, pv]) => {
            text = text.replace(new RegExp(`\\{${pk}\\}`, 'g'), String(pv));
          });
        }
        return text;
      },
      isTamil: false,
      isEnglish: true,
    };
  }
  return ctx;
}

export const useT = useLanguage;
export default useLanguage;
