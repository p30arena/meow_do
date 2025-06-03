import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import LoginForm from "./components/auth/LoginForm";
import RegisterForm from "./components/auth/RegisterForm";
import WorkspaceList from "./components/workspace/WorkspaceList";
import WorkspaceForm from "./components/workspace/WorkspaceForm";
import { setAuthToken, getAuthToken } from "./api/auth";
import { Button } from "./components/ui/button";

function App() {
  const { t } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showWorkspaceForm, setShowWorkspaceForm] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      setIsLoggedIn(true);
      // setAuthToken(token); // Already set by login/register success
    }
  }, []);

  const handleLoginSuccess = (token: string) => {
    setAuthToken(token);
    setIsLoggedIn(true);
    setShowRegister(false);
  };

  const handleRegisterSuccess = (token: string) => {
    setAuthToken(token);
    setIsLoggedIn(true); // Auto-login after successful registration
    setShowRegister(false);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setIsLoggedIn(false);
    setShowWorkspaceForm(false); // Reset workspace form visibility on logout
  };

  const handleCreateWorkspaceClick = () => {
    setShowWorkspaceForm(true);
  };

  const handleWorkspaceFormSuccess = () => {
    setShowWorkspaceForm(false);
    // Optionally refresh workspace list if needed, WorkspaceList component handles its own fetch
  };

  const handleWorkspaceFormCancel = () => {
    setShowWorkspaceForm(false);
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
        <div className="container mx-auto p-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">{t("welcome_message")}</h1>
            <Button onClick={handleLogout}>{t("auth.logout")}</Button>
          </div>

          {showWorkspaceForm ? (
            <WorkspaceForm
              onSuccess={handleWorkspaceFormSuccess}
              onCancel={handleWorkspaceFormCancel}
            />
          ) : (
            <WorkspaceList onCreateNew={handleCreateWorkspaceClick} />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
