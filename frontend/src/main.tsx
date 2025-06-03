import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import { prefixer } from 'stylis';
import { StyleSheetManager } from 'styled-components';
import rtlPlugin from 'stylis-plugin-rtl';

// i18n configuration
i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'ar', // Force Arabic for testing RTL
    fallbackLng: 'en',
    debug: true,
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
  });

const rootElement = document.getElementById('root')!;
const currentLanguage = i18n.language || 'en';
const isRtl = currentLanguage === 'ar' || currentLanguage === 'fa';

createRoot(rootElement).render(
  <StrictMode>
    <StyleSheetManager stylisPlugins={isRtl ? [prefixer, rtlPlugin] : [prefixer]}>
      <div dir={isRtl ? 'rtl' : 'ltr'}>
        <App />
      </div>
    </StyleSheetManager>
  </StrictMode>,
);
