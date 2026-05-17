import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = "TR" | "EN" | "RU" | "DE" | "FR" | "ES" | "ZH" | "AR" | "HI";

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  EN: {
    "home.title": "Global Connectivity",
    "home.subtitle": "Stay connected anywhere in the world.",
    "nav.home": "Home",
    "nav.my_esims": "My eSIMs",
    "nav.wallet": "Wallet",
    "nav.family": "Family",
    "nav.referral": "Referral",
    "nav.redeem": "Redeem",
    "nav.support": "Support",
    "nav.settings": "Settings",
    "nav.admin": "Admin",
    "nav.login": "Login",
    "nav.logout": "Logout",
  },
  TR: {
    "home.title": "Küresel Bağlantı",
    "home.subtitle": "Dünyanın her yerinde bağlantıda kalın.",
    "nav.home": "Ana Sayfa",
    "nav.my_esims": "eSIM'lerim",
    "nav.wallet": "Cüzdan",
    "nav.family": "Aile",
    "nav.referral": "Referans",
    "nav.redeem": "Kod Kullan",
    "nav.support": "Destek",
    "nav.settings": "Ayarlar",
    "nav.admin": "Yönetici",
    "nav.login": "Giriş Yap",
    "nav.logout": "Çıkış Yap",
  },
  RU: {}, DE: {}, FR: {}, ES: {}, ZH: {}, AR: {}, HI: {}
};

const I18nContext = createContext<I18nState>({
  language: "EN",
  setLanguage: () => {},
  t: (key) => key,
});

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('app_lang') as Language) || "EN";
  });

  const setLanguage = (lang: Language) => {
    localStorage.setItem('app_lang', lang);
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || translations["EN"]?.[key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
