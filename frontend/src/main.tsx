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

// Service Worker registration for PWA updates
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registered with scope:', registration.scope);
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New content available, please refresh.');
              }
            });
          }
        });
      })
      .catch(error => {
        console.error('Service Worker registration failed:', error);
      });
  });
}

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
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </AuthProvider>
          </ThemeManager>
        </BaseThemeProvider>
      </StyleSheetManager>
    </ThemeProvider>
  </StrictMode>
);
