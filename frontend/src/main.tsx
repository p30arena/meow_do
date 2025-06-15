import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // Import BrowserRouter
import "./index.css";
import { App } from "./App"; // Changed to named import
import i18n from "i18next";
import { ThemeManager } from "./lib/theme-manager"; // Re-add import
import { BaseThemeProvider } from "./context/BaseThemeContext"; // Re-add import
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";
import { prefixer } from "stylis";
import { StyleSheetManager } from "styled-components";
import rtlPlugin from "stylis-plugin-rtl";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./context/AuthContext";
import { registerSW } from 'virtual:pwa-register'; // NEW: Import registerSW

// Force refresh when a new service worker is detected
registerSW({
  onNeedRefresh() {
    window.location.reload(); // Force a full page reload
  },
  onOfflineReady() {
    console.log('App is ready to work offline');
  },
});

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
const currentLanguage = i18n.language || "en";
const isRtl = currentLanguage === "ar" || currentLanguage === "fa";

createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <StyleSheetManager
        stylisPlugins={isRtl ? [prefixer, rtlPlugin] : [prefixer]}
      >
        <BaseThemeProvider> {/* Re-add BaseThemeProvider */}
          <ThemeManager> {/* Re-add ThemeManager */}
            <AuthProvider>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <App />
              </BrowserRouter>
            </AuthProvider>
          </ThemeManager>
        </BaseThemeProvider>
      </StyleSheetManager>
    </ThemeProvider>
  </StrictMode>
);
