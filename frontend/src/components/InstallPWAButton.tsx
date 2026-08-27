import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const INSTALL_HINT_KEY = 'pwa-install-hint-dismissed';

const InstallPWAButton: React.FC = () => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(
    () => localStorage.getItem(INSTALL_HINT_KEY) === '1',
  );

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsAppInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const dismissHint = () => {
    localStorage.setItem(INSTALL_HINT_KEY, '1');
    setHintDismissed(true);
  };

  if (isAppInstalled) {
    return null; // Always hide if installed
  }

  // Native install prompt available (Android/desktop Chrome/Edge): one clean button.
  if (deferredPrompt) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={handleInstallClick}
        className="gap-1.5 border-white/40 bg-white/10 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {t('pwa.installApp')}
      </Button>
    );
  }

  // No native prompt (iOS, unsupported browsers): quiet icon + popover with
  // instructions. Hidden entirely once the user dismisses it — never a
  // permanent text blob in the navbar.
  if (hintDismissed) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('pwa.installApp')}
          title={t('pwa.installApp')}
          className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
        >
          <Download className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 text-sm">
        <p>{t('pwa.installInstructions')}</p>
        <button
          onClick={dismissHint}
          className="mt-2 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          {t('pwa.dismiss')}
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default InstallPWAButton;
