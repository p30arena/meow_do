import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import MarkdownRenderer from "./MarkdownRenderer";

interface DescriptionViewerProps {
  description?: string | null;
  truncateLength?: number;
}

const DescriptionViewer: React.FC<DescriptionViewerProps> = ({
  description,
  truncateLength = 100,
}) => {
  const { t } = useTranslation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (!description) {
    return (
      <p className="text-sm text-muted-foreground">{t("noDescription")}</p>
    );
  }

  const isTruncated = description.length > truncateLength;
  const truncatedText = isTruncated
    ? `${description.substring(0, truncateLength)}...`
    : description;

  return (
    <div>
      <p className="text-sm text-muted-foreground">{truncatedText}</p>
      {isTruncated && (
        <Button
          variant="link"
          className="h-auto p-0 text-sm"
          onClick={(e) => {
            e.stopPropagation();
            setIsDialogOpen(true);
          }}
        >
          {t("readMore")}
        </Button>
      )}

      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent
          className="max-w-3xl"
          onClick={(e) => e.stopPropagation()}
          onEscapeKeyDown={(e) => e.stopPropagation()}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t("fullDescription")}</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-4">
            <MarkdownRenderer>{description}</MarkdownRenderer>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("close")}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DescriptionViewer;
