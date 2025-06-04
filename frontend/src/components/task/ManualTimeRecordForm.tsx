import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useTranslation } from "react-i18next";
import { createManualTaskRecord } from "../../api/task"; // Import the API function

interface ManualTimeRecordFormProps {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
  onRecordCreated: () => void;
}

export const ManualTimeRecordForm: React.FC<ManualTimeRecordFormProps> = ({
  taskId,
  isOpen,
  onClose,
  onRecordCreated,
}) => {
  const { t } = useTranslation();
  const [startTime, setStartTime] = useState("");
  const [stopTime, setStopTime] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const start = new Date(startTime);
      const stop = new Date(stopTime);

      if (isNaN(start.getTime()) || isNaN(stop.getTime())) {
        setError(t("tasks.manualRecord.invalidTimeFormat"));
        return;
      }

      if (stop <= start) {
        setError(t("tasks.manualRecord.stopTimeBeforeStartTime"));
        return;
      }

      const duration = Math.floor((stop.getTime() - start.getTime()) / 1000); // Duration in seconds

      await createManualTaskRecord(taskId, {
        startTime: start.toISOString(),
        stopTime: stop.toISOString(),
        duration,
      });

      onRecordCreated();
      onClose();
    } catch (err) {
      setError(
        t("tasks.manualRecord.failedToCreateRecord", {
          message: (err as Error).message,
        })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("tasks.manualRecord.addManualRecord")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="startTime" className="w-1/3 text-start">
                {t("tasks.manualRecord.startTime")}
              </Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="flex-grow"
                required
              />
            </div>
            <div className="flex items-center gap-4">
              <Label htmlFor="stopTime" className="w-1/3 text-start">
                {t("tasks.manualRecord.stopTime")}
              </Label>
              <Input
                id="stopTime"
                type="datetime-local"
                value={stopTime}
                onChange={(e) => setStopTime(e.target.value)}
                className="flex-grow"
                required
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm col-span-4 text-center">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("workspace.cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? t("tasks.manualRecord.adding")
                : t("tasks.manualRecord.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
