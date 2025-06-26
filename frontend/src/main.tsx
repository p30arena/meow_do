import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // Import BrowserRouter
import "./index.css";
import { App } from "./App"; // Changed to named import
import i18n from "i18next";
import { ThemeManager } from "./lib/theme-manager"; // Re-add import
import { BaseThemeProvider } from "./context/BaseThemeContext"; // Re-add import
import { initReactI18next, useTranslation } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";
import { prefixer } from "stylis";
import { StyleSheetManager } from "styled-components";
import rtlPlugin from "stylis-plugin-rtl";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./context/AuthContext";

// i18n configuration
i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    debug: true,
    backend: {
      loadPath: `/locales/{{lng}}/{{ns}}.json?v=${__APP_VERSION__}`,
    },
  });

const rootElement = document.getElementById("root")!;
const AppWrapper = () => {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language || "en";
  const isRtl = currentLanguage === "ar" || currentLanguage === "fa";

  useEffect(() => {
    // Apply Vazirmatn font for Farsi
    if (currentLanguage === "fa") {
      document.body.style.fontFamily = "'Vazirmatn', sans-serif";
    } else {
      document.body.style.fontFamily = ""; // Revert to default
    }
  }, [currentLanguage]);

  return (
    <StyleSheetManager
      stylisPlugins={isRtl ? [prefixer, rtlPlugin] : [prefixer]}
    >
      <BaseThemeProvider>
        <ThemeManager>
          <AuthProvider>
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <App />
            </BrowserRouter>
          </AuthProvider>
        </ThemeManager>
      </BaseThemeProvider>
    </StyleSheetManager>
  );
};

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AppWrapper />
    </ThemeProvider>
  </StrictMode>
);
