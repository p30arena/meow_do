import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import { App } from "./App";
import i18n from "i18next";
import { initReactI18next, useTranslation } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";
import { prefixer } from "stylis";
import { StyleSheetManager } from "styled-components";
import rtlPlugin from "stylis-plugin-rtl";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./context/AuthContext";

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    debug: false,
    backend: {
      loadPath: `/locales/{{lng}}/{{ns}}.json?v=${__APP_VERSION__}`,
    },
  });

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

function AppWrapper() {
  const { i18n: currentI18n } = useTranslation();
  const currentLanguage = currentI18n.language || "en";
  const isRtl = currentLanguage === "ar" || currentLanguage === "fa";

  useEffect(() => {
    document.body.style.fontFamily = currentLanguage === "fa" ? "'Vazirmatn', sans-serif" : "";
  }, [currentLanguage]);

  return (
    <StyleSheetManager stylisPlugins={isRtl ? [prefixer, rtlPlugin] : [prefixer]}>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </StyleSheetManager>
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppWrapper />
    </ThemeProvider>
  </StrictMode>,
);
