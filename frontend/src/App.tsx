import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { Routes, Route, useNavigate, useParams, Navigate } from "react-router-dom";
import LoginForm from "./components/auth/LoginForm";
import RegisterForm from "./components/auth/RegisterForm";
import WorkspaceList from "./components/workspace/WorkspaceList";
import WorkspaceForm from "./components/workspace/WorkspaceForm";
import GoalList from "./components/goal/GoalList";
import GoalForm from "./components/goal/GoalForm";
import TaskList from "./components/task/TaskList";
import TaskForm from "./components/task/TaskForm";
import { deleteGoal } from "./api/goal";
import { deleteTask } from "./api/task";
import { useAuth } from "./context/AuthContext";
import TaskTrackingChart from "./components/task/TaskTrackingChart";
import { Navbar } from "./components/Navbar";
import { useLocation } from "react-router-dom"; // Import useLocation

function App() {
  const { t } = useTranslation();
  const { user, setToken, setUser, isAuthReady } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const updateHtmlLangAndDir = () => {
      const currentLanguage = i18n.language || "en";
      document.documentElement.lang = currentLanguage;
      document.documentElement.dir =
        currentLanguage === "ar" || currentLanguage === "fa" ? "rtl" : "ltr";
    };

    updateHtmlLangAndDir();
    i18n.on("languageChanged", updateHtmlLangAndDir);
    return () => {
      i18n.off("languageChanged", updateHtmlLangAndDir);
    };
  }, []);

  const handleLoginSuccess = (data: { token: string; user: any }) => {
    setToken(data.token);
    setUser(data.user);
    navigate("/workspaces"); // Navigate to workspaces on login success
  };

  const handleRegisterSuccess = (data: { token: string; user: any }) => {
    setToken(data.token);
    setUser(data.user);
    navigate("/workspaces"); // Navigate to workspaces on register success
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGoal(goalId);
    } catch (err: any) {
      console.error("Failed to delete goal:", err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
    } catch (err: any) {
      console.error("Failed to delete task:", err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {!user || !isAuthReady ? (
        <Routes>
          <Route
            path="/"
            element={
              <div className="flex items-center justify-center flex-grow">
                <div className="flex flex-col items-center gap-4">
                  <LoginForm onLoginSuccess={handleLoginSuccess} />
                  <button
                    className="text-blue-500 hover:underline"
                    onClick={() => navigate("/register")}
                  >
                    {t("auth.dontHaveAccount")}
                  </button>
                </div>
              </div>
            }
          />
          <Route
            path="/register"
            element={
              <div className="flex items-center justify-center flex-grow">
                <div className="flex flex-col items-center gap-4">
                  <RegisterForm onRegisterSuccess={handleRegisterSuccess} />
                  <button
                    className="text-blue-500 hover:underline"
                    onClick={() => navigate("/")}
                  >
                    {t("auth.alreadyHaveAccount")}
                  </button>
                </div>
              </div>
            }
          />
          <Route path="*" element={<NoMatch />} /> {/* Catch-all for unauthenticated */}
        </Routes>
      ) : (
        <>
          <Navbar />
          <div className="container mx-auto p-4 flex-grow pt-16">
            <Routes>
              <Route path="/" element={<Navigate to="/workspaces" replace />} /> {/* Redirect from / to /workspaces if authenticated */}
              <Route
                path="/workspaces"
                element={
                  <WorkspaceList
                    onCreateNew={() => navigate("/workspaces/new")}
                    onSelectWorkspace={(workspace) =>
                      navigate(`/workspaces/${workspace.id}`, { state: { workspaceName: workspace.name } })
                    }
                    onEditWorkspace={(workspace) =>
                      navigate(`/workspaces/${workspace.id}/edit`)
                    }
                  />
                }
              />
              <Route
                path="/workspaces/new"
                element={
                  <WorkspaceForm
                    onSuccess={() => navigate("/workspaces")}
                    onCancel={() => navigate("/workspaces")}
                  />
                }
              />
              <Route
                path="/workspaces/:workspaceId/edit"
                element={
                  <WorkspaceForm
                    onSuccess={() => navigate("/workspaces")}
                    onCancel={() => navigate("/workspaces")}
                  />
                }
              />
              <Route
                path="/workspaces/:workspaceId"
                element={<GoalsView onDeleteGoal={handleDeleteGoal} />}
              />
              <Route
                path="/workspaces/:workspaceId/goals/new"
                element={
                  <GoalForm
                    onSuccess={() => navigate(-1)}
                    onCancel={() => navigate(-1)}
                  />
                }
              />
              <Route
                path="/workspaces/:workspaceId/goals/:goalId/edit"
                element={
                  <GoalForm
                    onSuccess={() => navigate(-1)}
                    onCancel={() => navigate(-1)}
                  />
                }
              />
              <Route
                path="/workspaces/:workspaceId/goals/:goalId"
                element={<TasksView onDeleteTask={handleDeleteTask} />}
              />
              <Route
                path="/workspaces/:workspaceId/goals/:goalId/tasks/new"
                element={
                  <TaskForm
                    onSuccess={() => navigate(-1)}
                    onCancel={() => navigate(-1)}
                  />
                }
              />
              <Route
                path="/workspaces/:workspaceId/goals/:goalId/tasks/:taskId/edit"
                element={
                  <TaskForm
                    onSuccess={() => navigate(-1)}
                    onCancel={() => navigate(-1)}
                  />
                }
              />
              <Route path="*" element={<NoMatch />} /> {/* Catch-all for authenticated */}
            </Routes>
            <div className="text-center text-xs text-muted-foreground mt-4">
              App Version: {__APP_VERSION__}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// New components for routing
function GoalsView({ onDeleteGoal }: { onDeleteGoal: (goalId: string) => Promise<void> }) {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { state } = useLocation(); // Import useLocation
  const workspaceName = state?.workspaceName || ""; // Get workspaceName from state
  const navigate = useNavigate();

  if (!workspaceId) {
    return <NoMatch />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4 mt-4">
        <h2 className="text-2xl font-bold">{t("goalsFor", { name: workspaceName })}</h2>
        <button onClick={() => navigate(-1)} className="text-blue-500 hover:underline">
          {t("backToWorkspaces")}
        </button>
      </div>
      <GoalList
        workspaceId={workspaceId}
        onCreateNew={() => navigate(`/workspaces/${workspaceId}/goals/new`)}
        onEditGoal={(goal) =>
          navigate(`/workspaces/${workspaceId}/goals/${goal.id}/edit`)
        }
        onSelectGoal={(goal) =>
          navigate(`/workspaces/${workspaceId}/goals/${goal.id}`, { state: { goalName: goal.name } })
        }
        onDeleteGoal={onDeleteGoal}
      />
      <div className="mt-8">
        <TaskTrackingChart workspaceId={workspaceId} />
      </div>
    </div>
  );
}

function TasksView({ onDeleteTask }: { onDeleteTask: (taskId: string) => Promise<void> }) {
  const { t } = useTranslation();
  const { workspaceId, goalId } = useParams<{ workspaceId: string; goalId: string }>();
  const { state } = useLocation(); // Import useLocation
  const goalName = state?.goalName || ""; // Get goalName from state
  const navigate = useNavigate();

  if (!workspaceId || !goalId) {
    return <NoMatch />;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4 mt-4">
        <h2 className="text-2xl font-bold">{t("tasksFor", { name: goalName })}</h2>
        <button onClick={() => navigate(-1)} className="text-blue-500 hover:underline">
          {t("backToGoals")}
        </button>
      </div>
      <TaskList
        workspaceId={workspaceId}
        goalId={goalId}
        onCreateNew={() =>
          navigate(`/workspaces/${workspaceId}/goals/${goalId}/tasks/new`)
        }
        onEditTask={(task) =>
          navigate(
            `/workspaces/${workspaceId}/goals/${goalId}/tasks/${task.id}/edit`
          )
        }
        onDeleteTask={onDeleteTask}
      />
      <div className="mt-8">
        <TaskTrackingChart goalId={goalId} />
      </div>
    </div>
  );
}

function NoMatch() {
  const { t } = useTranslation();
  return (
    <div className="text-center text-red-500">
      <h2>{t("notFound")}</h2>
      <p>{t("pageNotFound")}</p>
    </div>
  );
}

export { App }; // Changed to named export
