import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import {
  Link,
  NavigateFunction,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
const LoginForm = lazy(() => import("./components/auth/LoginForm"));
const RegisterForm = lazy(() => import("./components/auth/RegisterForm"));
const WorkspaceList = lazy(() => import("./components/workspace/WorkspaceList"));
const WorkspaceForm = lazy(() => import("./components/workspace/WorkspaceForm"));
const GoalList = lazy(() => import("./components/goal/GoalList"));
const GoalForm = lazy(() => import("./components/goal/GoalForm"));
const TaskList = lazy(() => import("./components/task/TaskList"));
const TaskForm = lazy(() => import("./components/task/TaskForm"));
import { deleteGoal, getGoalById, type Goal } from "./api/goal";
import { deleteTask } from "./api/task";
import { getWorkspaceById, type Workspace } from "./api/workspace";
import { useAuth } from "./context/AuthContext";
const TaskTrackingChart = lazy(() => import("./components/task/TaskTrackingChart"));
import { Navbar } from "./components/Navbar";
import { useRegisterSW } from "virtual:pwa-register/react";
import { UpdatePrompt } from "./components/UpdatePrompt";
import { Toaster } from "./components/ui/toaster";
import { Button } from "./components/ui/button";
import type { LoginResponse } from "./api/auth";

function App() {
  const { t } = useTranslation();
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const { user, setToken, setUser, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const updateHtmlLangAndDir = () => {
      const currentLanguage = i18n.language || "en";
      document.documentElement.lang = currentLanguage;
      document.documentElement.dir =
        currentLanguage === "ar" || currentLanguage === "fa" ? "rtl" : "ltr";
    };

    updateHtmlLangAndDir();
    i18n.on("languageChanged", updateHtmlLangAndDir);
    return () => i18n.off("languageChanged", updateHtmlLangAndDir);
  }, []);

  const handleAuthSuccess = (data: LoginResponse) => {
    setToken(data.token);
    setUser(data.user);
    const returnTo = location.state?.returnTo;
    navigate(typeof returnTo === "string" ? returnTo : "/workspaces", { replace: true });
  };
  const handleDeleteGoal = (goalId: string) => deleteGoal(goalId);
  const handleDeleteTask = (taskId: string) => deleteTask(taskId);

  const closePrompt = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!isAuthReady) {
    return (
      <AppShell>
        <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
          {t("auth.loadingSession")}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Toaster />
      <UpdatePrompt
        open={offlineReady || needRefresh}
        onOpenChange={closePrompt}
        onUpdate={() => updateServiceWorker(true)}
      />
      <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center" role="status">{t("loading")}</div>}>
        {user ? (
          <AuthenticatedRoutes onDeleteGoal={handleDeleteGoal} onDeleteTask={handleDeleteTask} />
        ) : (
          <PublicRoutes onAuthSuccess={handleAuthSuccess} />
        )}
      </Suspense>
    </AppShell>
  );
}

function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {user && <Navbar />}
      <main className={user ? "container mx-auto flex w-full flex-1 flex-col p-4" : "flex flex-1 flex-col"}>
        {children}
      </main>
    </div>
  );
}

function PublicRoutes({ onAuthSuccess }: { onAuthSuccess: (data: LoginResponse) => void }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo;
  const authLinkState = typeof returnTo === "string" ? { state: { returnTo } } : undefined;

  return (
    <Routes>
      <Route
        path="/"
        element={
          <AuthPage>
            <LoginForm onLoginSuccess={onAuthSuccess} />
            <Button variant="link" onClick={() => navigate("/register", authLinkState)}>
              {t("auth.dontHaveAccount")}
            </Button>
          </AuthPage>
        }
      />
      <Route
        path="/register"
        element={
          <AuthPage>
            <RegisterForm onRegisterSuccess={onAuthSuccess} />
            <Button variant="link" onClick={() => navigate("/", authLinkState)}>
              {t("auth.alreadyHaveAccount")}
            </Button>
          </AuthPage>
        }
      />
      <Route path="*" element={<Navigate to="/" replace state={{ returnTo: location.pathname }} />} />
    </Routes>
  );
}

function AuthPage({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8">{children}</div>;
}

function AuthenticatedRoutes({
  onDeleteGoal,
  onDeleteTask,
}: {
  onDeleteGoal: (goalId: string) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
}) {
  const navigate = useNavigate();

  return (
    <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center" role="status">{t("loading")}</div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/workspaces" replace />} />
        <Route
          path="/workspaces"
          element={
            <WorkspaceList
              onCreateNew={() => navigate("/workspaces/new")}
              onSelectWorkspace={(workspace) => navigate(`/workspaces/${workspace.id}`)}
              onEditWorkspace={(workspace) => navigate(`/workspaces/${workspace.id}/edit`)}
            />
          }
        />
        <Route
          path="/workspaces/new"
          element={<WorkspaceForm onSuccess={() => navigate("/workspaces")} onCancel={() => navigate("/workspaces")} />}
        />
        <Route
          path="/workspaces/:workspaceId/edit"
          element={<WorkspaceForm onSuccess={() => navigate("/workspaces")} onCancel={() => navigate("/workspaces")} />}
        />
        <Route path="/workspaces/:workspaceId" element={<GoalsView onDeleteGoal={onDeleteGoal} />} />
        <Route
          path="/workspaces/:workspaceId/goals/new"
          element={<GoalForm onSuccess={() => navigateFromParams(navigate, "workspaceId")} onCancel={() => navigateFromParams(navigate, "workspaceId")} />}
        />
        <Route
          path="/workspaces/:workspaceId/goals/:goalId/edit"
          element={<GoalForm onSuccess={() => navigateFromParams(navigate, "workspaceId")} onCancel={() => navigateFromParams(navigate, "workspaceId")} />}
        />
        <Route path="/workspaces/:workspaceId/goals/:goalId" element={<TasksView onDeleteTask={onDeleteTask} />} />
        <Route
          path="/workspaces/:workspaceId/goals/:goalId/tasks/new"
          element={<TaskForm onSuccess={() => navigateFromParams(navigate, "goalId")} onCancel={() => navigateFromParams(navigate, "goalId")} />}
        />
        <Route
          path="/workspaces/:workspaceId/goals/:goalId/tasks/:taskId/edit"
          element={<TaskForm onSuccess={() => navigateFromParams(navigate, "goalId")} onCancel={() => navigateFromParams(navigate, "goalId")} />}
        />
        <Route path="*" element={<NoMatch />} />
      </Routes>
    </Suspense>
  );
}

function navigateFromParams(navigate: NavigateFunction, parent: "workspaceId" | "goalId") {
  const path = window.location.pathname;
  const match = parent === "workspaceId"
    ? path.match(/\/workspaces\/([^/]+)/)
    : path.match(/\/goals\/([^/]+)/);
  if (!match?.[1]) {
    navigate("/workspaces");
    return;
  }
  if (parent === "workspaceId") {
    navigate(`/workspaces/${match[1]}`);
    return;
  }
  const workspaceMatch = path.match(/\/workspaces\/([^/]+)/);
  navigate(`/workspaces/${workspaceMatch?.[1] ?? ""}/goals/${match[1]}`);
}

function ResourceHeader({ workspaceId, goalId }: { workspaceId?: string; goalId?: string }) {
  const { t } = useTranslation();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (workspaceId) setWorkspace(await getWorkspaceById(workspaceId));
        if (goalId) setGoal(await getGoalById(goalId));
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : t("workspace.error"));
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [goalId, t, workspaceId]);

  if (error) return <p className="text-sm text-destructive" role="alert">{t("workspace.error")}: {error}</p>;

  const title = goal?.name ?? workspace?.name;
  return (
    <>
      <nav aria-label={t("breadcrumb")} className="mb-2 text-sm text-muted-foreground">
        <Link className="underline-offset-4 hover:underline" to="/workspaces">{t("workspace.workspaces")}</Link>
        {workspaceId && <><span className="mx-2" aria-hidden="true">/</span><Link className="underline-offset-4 hover:underline" to={`/workspaces/${workspaceId}`}>{workspace?.name ?? t("loading")}</Link></>}
        {goalId && <><span className="mx-2" aria-hidden="true">/</span><span>{goal?.name ?? t("loading")}</span></>}
      </nav>
      <h1 className="mb-4 break-words text-2xl font-bold">{goalId ? t("tasksFor", { name: title ?? "" }) : t("goalsFor", { name: title ?? "" })}</h1>
    </>
  );

}
function GoalsView({ onDeleteGoal }: { onDeleteGoal: (goalId: string) => Promise<void> }) {
  const { t } = useTranslation();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  if (!workspaceId) return <NoMatch />;
  return (
    <div>
      <ResourceHeader workspaceId={workspaceId} />
      <div className="mb-4 flex justify-start">
        <Link className="text-primary underline-offset-4 hover:underline" to="/workspaces">{t("backToWorkspaces")}</Link>
      </div>
      <GoalList workspaceId={workspaceId} onCreateNew={() => navigate(`/workspaces/${workspaceId}/goals/new`)} onEditGoal={(goal) => navigate(`/workspaces/${workspaceId}/goals/${goal.id}/edit`)} onSelectGoal={(goal) => navigate(`/workspaces/${workspaceId}/goals/${goal.id}`)} onDeleteGoal={onDeleteGoal} />
      <div className="mt-8"><TaskTrackingChart workspaceId={workspaceId} /></div>
    </div>
  );
}

function TasksView({ onDeleteTask }: { onDeleteTask: (taskId: string) => Promise<void> }) {
  const { t } = useTranslation();
  const { workspaceId, goalId } = useParams<{ workspaceId: string; goalId: string }>();
  const navigate = useNavigate();
  if (!workspaceId || !goalId) return <NoMatch />;
  return (
    <div>
      <ResourceHeader workspaceId={workspaceId} goalId={goalId} />
      <div className="mb-4 flex justify-start">
        <Link className="text-primary underline-offset-4 hover:underline" to={`/workspaces/${workspaceId}`}>{t("backToGoals")}</Link>
      </div>
      <TaskList workspaceId={workspaceId} goalId={goalId} onCreateNew={() => navigate(`/workspaces/${workspaceId}/goals/${goalId}/tasks/new`)} onEditTask={(task) => navigate(`/workspaces/${workspaceId}/goals/${goalId}/tasks/${task.id}/edit`)} onDeleteTask={onDeleteTask} />
      <div className="mt-8"><TaskTrackingChart goalId={goalId} /></div>
    </div>
  );
}

function NoMatch() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-bold">{t("notFound")}</h1>
      <p className="text-muted-foreground">{t("pageNotFound")}</p>
      <Link className="text-primary underline-offset-4 hover:underline" to="/workspaces">{t("workspace.workspaces")}</Link>
    </div>
  );
}

export { App };
