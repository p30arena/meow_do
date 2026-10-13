import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  createLabel,
  listLabels,
  assignLabel,
  listAssignees,
  assignUser,
  unassignUser,
  type Label as CardLabel,
  type Assignee,
} from "../../api/card";

interface CardMetaProps {
  goalId: string;
  taskId: string;
  canEdit: boolean;
}

/**
 * B1 slice: labels + assignees manager. Read-only without edit rights.
 */
const CardMetaManager: React.FC<CardMetaProps> = ({ goalId, taskId, canEdit }) => {
  const { t } = useTranslation();
  const [labels, setLabels] = useState<CardLabel[]>([]);
  const [assignedLabelIds, setAssignedLabelIds] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#8884d8");
  const [userIdInput, setUserIdInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const [all, people] = await Promise.all([listLabels(goalId), listAssignees(taskId)]);
      setLabels(all);
      setAssignees(people);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("workspace.error"));
    }
  };

  useEffect(() => {
    void refresh();
  }, [goalId, taskId]);

  const fail = (err: unknown) => setError(err instanceof Error ? err.message : t("workspace.error"));

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <div>
        <p className="mb-2 text-sm font-medium">{t("card.labels")}</p>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("card.labels")}>
          {labels.map((label) => {
            const on = assignedLabelIds.includes(label.id);
            return (
              <button
                key={label.id}
                type="button"
                disabled={!canEdit}
                aria-pressed={on}
                title={label.name}
                onClick={() => void assignLabel(taskId, label.id).then(() => setAssignedLabelIds((ids) => ids.includes(label.id) ? ids : [...ids, label.id])).catch(fail)}
                className="rounded-full border px-2.5 py-1 text-xs"
                style={on ? { backgroundColor: label.color, color: "#fff", borderColor: "transparent" } : undefined}
              >
                {label.name}
              </button>
            );
          })}
          {labels.length === 0 && <p className="text-xs text-muted-foreground">{t("card.noLabels")}</p>}
        </div>
        {canEdit && (
          <form
            className="mt-2 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void createLabel(goalId, { name, color })
                .then((created) => { setLabels((ls) => [...ls, created]); setName(""); })
                .catch(fail);
            }}
          >
            <Label htmlFor={`label-name-${taskId}`} className="sr-only">{t("card.newLabel")}</Label>
            <Input id={`label-name-${taskId}`} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("card.newLabel")} className="h-8" maxLength={64} />
            <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-12 p-1" aria-label={t("card.labelColor")} />
            <Button type="submit" size="sm" disabled={!name.trim()}>{t("card.add")}</Button>
          </form>
        )}
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">{t("card.assignees")}</p>
        <div className="flex flex-wrap gap-1.5">
          {assignees.map((person) => (
            <span key={person.id} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
              {person.username}
              {canEdit && (
                <button type="button" aria-label={t("card.removeAssignee", { name: person.username })} className="underline underline-offset-2" onClick={() => void unassignUser(taskId, person.id).then(() => setAssignees((as) => as.filter((a) => a.id !== person.id))).catch(fail)}>×</button>
              )}
            </span>
          ))}
          {assignees.length === 0 && <p className="text-xs text-muted-foreground">{t("card.noAssignees")}</p>}
        </div>
        {canEdit && (
          <form
            className="mt-2 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void assignUser(taskId, userIdInput.trim()).then(() => { setUserIdInput(""); return refresh(); }).catch(fail);
            }}
          >
            <Label htmlFor={`assignee-${taskId}`} className="sr-only">{t("card.addAssignee")}</Label>
            <Input id={`assignee-${taskId}`} value={userIdInput} onChange={(e) => setUserIdInput(e.target.value)} placeholder={t("card.assigneePlaceholder")} className="h-8" />
            <Button type="submit" size="sm" disabled={!userIdInput.trim()}>{t("card.add")}</Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default CardMetaManager;
