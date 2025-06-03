import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import LoginForm from "./components/auth/LoginForm";
import RegisterForm from "./components/auth/RegisterForm";
import { setAuthToken, getAuthToken } from "./api/auth";
import { Button } from "./components/ui/button"; // Assuming button is available after shadcn install

function App() {
  const { t } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      setIsLoggedIn(true);
      setAuthToken(token); // Set token for future requests
    }
  }, []);

  const handleLoginSuccess = () => {
    setIsLoggedIn(true);
    setShowRegister(false); // Hide register form if user logs in after being on register page
  };

  const handleRegisterSuccess = () => {
    // After successful registration, automatically log in or redirect to login
    // For now, we'll just switch to the login form
    setShowRegister(false);
    // Optionally, you could auto-login the user here if the register API returns a token
  };

  const handleLogout = () => {
    setAuthToken(null); // Clear token from localStorage
    setIsLoggedIn(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      {!isLoggedIn ? (
        <div className="flex flex-col items-center gap-4">
          {showRegister ? (
            <RegisterForm onRegisterSuccess={handleRegisterSuccess} />
          ) : (
            <LoginForm onLoginSuccess={handleLoginSuccess} />
          )}
          <Button variant="link" onClick={() => setShowRegister(!showRegister)}>
            {showRegister
              ? t("auth.alreadyHaveAccount")
              : t("auth.dontHaveAccount")}
          </Button>
        </div>
      ) : (
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">{t("welcome_message")}</h1>
          <p className="text-lg">{t("auth.loggedInMessage")}</p>
          <Button onClick={handleLogout} className="mt-4">
            {t("auth.logout")}
          </Button>
        </div>
      )}
    </div>
  );
}

export default App;
