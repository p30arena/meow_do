import { useState } from "react";
import { useTranslation } from "react-i18next";
import LoginForm from "./components/auth/LoginForm";
import RegisterForm from "./components/auth/RegisterForm";
import WorkspaceList from "./components/workspace/WorkspaceList";
import WorkspaceForm from "./components/workspace/WorkspaceForm";
import GoalList from "./components/goal/GoalList";
import GoalForm from "./components/goal/GoalForm";
import TaskList from "./components/task/TaskList";
import TaskForm from "./components/task/TaskForm";
import { deleteGoal, type Goal } from "./api/goal";
import { deleteTask, type Task } from "./api/task";
import { type Workspace } from "./api/workspace";
import { Button } from "./components/ui/button";
import { useAuth } from "./context/AuthContext";
import TaskTrackingChart from "./components/task/TaskTrackingChart";
import { Navbar } from "./components/Navbar"; // Import the new Navbar component

function App() {
  const { t } = useTranslation();
  const { user, setToken, setUser, isAuthReady } = useAuth(); // Removed logout
  const [showRegister, setShowRegister] = useState(false);
  const [showWorkspaceForm, setShowWorkspaceForm] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(
    null
  );
  const [editingWorkspace, setEditingWorkspace] = useState<
    Workspace | undefined
  >(undefined);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>(undefined);
  // Removed showSettings state and handleToggleSettings function

  const handleLoginSuccess = (data: { token: string; user: any }) => {
    // Type will be more specific later
    setToken(data.token);
    setUser(data.user);
    setShowRegister(false);
  };

  const handleRegisterSuccess = (data: { token: string; user: any }) => {
    // Type will be more specific later
    setToken(data.token);
    setUser(data.user);
    setShowRegister(false);
  };

  const handleCreateWorkspaceClick = () => {
    setShowWorkspaceForm(true);
  };

  const handleEditWorkspaceClick = (workspace: Workspace) => {
    setEditingWorkspace(workspace);
    setShowWorkspaceForm(true);
  };

  const handleWorkspaceFormSuccess = () => {
    setShowWorkspaceForm(false);
    setEditingWorkspace(undefined);
  };

  const handleWorkspaceFormCancel = () => {
    setShowWorkspaceForm(false);
    setEditingWorkspace(undefined);
  };

  const handleSelectWorkspace = (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setSelectedGoal(null);
    setShowGoalForm(false);
    setEditingGoal(undefined);
    setShowTaskForm(false);
    setEditingTask(undefined);
  };

  const handleBackToWorkspaces = () => {
    setSelectedWorkspace(null);
    setSelectedGoal(null);
    setShowGoalForm(false);
    setEditingGoal(undefined);
    setShowTaskForm(false);
    setEditingTask(undefined);
  };

  const handleCreateGoalClick = () => {
    setShowGoalForm(true);
    setEditingGoal(undefined);
  };

  const handleEditGoalClick = (goal: Goal) => {
    setShowGoalForm(true);
    setEditingGoal(goal);
  };

  const handleGoalFormSuccess = () => {
    setShowGoalForm(false);
    setEditingGoal(undefined);
  };

  const handleGoalFormCancel = () => {
    setShowGoalForm(false);
    setEditingGoal(undefined);
  };

  const handleSelectGoal = (goal: Goal) => {
    setSelectedGoal(goal);
    setShowTaskForm(false);
    setEditingTask(undefined);
  };

  const handleBackToGoals = () => {
    setSelectedGoal(null);
    setShowTaskForm(false);
    setEditingTask(undefined);
  };

  const handleCreateTaskClick = () => {
    setShowTaskForm(true);
    setEditingTask(undefined);
  };

  const handleEditTaskClick = (task: Task) => {
    setShowTaskForm(true);
    setEditingTask(task);
  };

  const handleTaskFormSuccess = () => {
    setShowTaskForm(false);
    setEditingTask(undefined);
  };

  const handleTaskFormCancel = () => {
    setShowTaskForm(false);
    setEditingTask(undefined);
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGoal(goalId);
      // No need to re-fetch goals here, GoalList will handle it
    } catch (err: any) {
      console.error("Failed to delete goal:", err);
      // Optionally, show an error message to the user
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      // No need to re-fetch tasks here, TaskList will handle it
    } catch (err: any) {
      console.error("Failed to delete task:", err);
      // Optionally, show an error message to the user
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {!user || !isAuthReady ? (
        <div className="flex items-center justify-center flex-grow"> {/* Centered login/register */}
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
        </div>
      ) : (
        <> {/* Use Fragment to wrap Navbar and main content */}
          <Navbar /> {/* Render the Navbar component */}
          <div className="container mx-auto p-4 flex-grow pt-16"> {/* Added pt-16 for navbar height */}
            {selectedWorkspace ? (
              selectedGoal ? (
                <div>
                  <div className="flex justify-between items-center mb-4 mt-4">
                    <h2 className="text-2xl font-bold">
                      {t("tasksFor")}: {selectedGoal.name}
                    </h2>
                    <Button onClick={handleBackToGoals}>
                      {t("backToGoals")}
                    </Button>
                  </div>
                  {showTaskForm ? (
                    <TaskForm
                      goalId={selectedGoal.id}
                      task={editingTask}
                      onSuccess={handleTaskFormSuccess}
                      onCancel={handleTaskFormCancel}
                    />
                  ) : (
                    <TaskList
                      goalId={selectedGoal.id}
                      onCreateNew={handleCreateTaskClick}
                      onEditTask={handleEditTaskClick}
                      onDeleteTask={handleDeleteTask}
                    />
                  )}
                  {/* Display chart for specific goal */}
                  <div className="mt-8">
                    <TaskTrackingChart goalId={selectedGoal.id} />
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-4 mt-4">
                    <h2 className="text-2xl font-bold">
                      {t("goalsFor")}: {selectedWorkspace.name}
                    </h2>
                    <Button onClick={handleBackToWorkspaces}>
                      {t("backToWorkspaces")}
                    </Button>
                  </div>
                  {showGoalForm ? (
                    <GoalForm
                      workspaceId={selectedWorkspace.id}
                      goal={editingGoal}
                      onSuccess={handleGoalFormSuccess}
                      onCancel={handleGoalFormCancel}
                    />
                  ) : (
                    <GoalList
                      workspaceId={selectedWorkspace.id}
                      onCreateNew={handleCreateGoalClick}
                      onEditGoal={handleEditGoalClick}
                      onSelectGoal={handleSelectGoal}
                      onDeleteGoal={handleDeleteGoal}
                    />
                  )}
                  {/* Display chart for selected workspace */}
                  <div className="mt-8">
                    <TaskTrackingChart workspaceId={selectedWorkspace.id} />
                  </div>
                </div>
              )
            ) : showWorkspaceForm ? (
              <WorkspaceForm
                workspace={editingWorkspace}
                onSuccess={handleWorkspaceFormSuccess}
                onCancel={handleWorkspaceFormCancel}
              />
            ) : (
              <WorkspaceList
                onCreateNew={handleCreateWorkspaceClick}
                onSelectWorkspace={handleSelectWorkspace}
                onEditWorkspace={handleEditWorkspaceClick}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

export { App }; // Changed to named export
