import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const InstallPWAButton: React.FC = () => {
  const { t } = useTranslation(); // Use t for translation - moved to top
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

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
      console.log('User accepted the PWA installation prompt');
      setIsAppInstalled(true);
    } else {
      console.log('User dismissed the PWA installation prompt');
    }
    setDeferredPrompt(null);
  };

  if (isAppInstalled) {
    return null; // Always hide if installed
  }

  if (deferredPrompt) {
    return (
      <Button onClick={handleInstallClick} className="mr-2">
        {t('pwa.installApp')}
      </Button>
    );
  }

  // If not installed and no deferredPrompt (e.g., iOS or dismissed on Android)
  return (
    <span className="text-sm text-muted-foreground mr-2">
      {t('pwa.installInstructions')}
    </span>
  );
};

export default InstallPWAButton;
