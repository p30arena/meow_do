import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Toast, ToastAction, ToastDescription, ToastProvider, ToastTitle } from '@/components/ui/toast';

interface UpdatePromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function UpdatePrompt({ open, onOpenChange, onUpdate }: UpdatePromptProps) {
  const { t } = useTranslation();

  return (
    <ToastProvider>
      <Toast open={open} onOpenChange={onOpenChange}>
        <div className="grid gap-1">
          <ToastTitle>{t('pwa.updateAvailable')}</ToastTitle>
          <ToastDescription>
            <Button onClick={onUpdate}>{t('pwa.update')}</Button>
          </ToastDescription>
        </div>
        <ToastAction asChild altText={t('pwa.dismiss')}>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t('pwa.dismiss')}
          </Button>
        </ToastAction>
      </Toast>
    </ToastProvider>
  );
}
