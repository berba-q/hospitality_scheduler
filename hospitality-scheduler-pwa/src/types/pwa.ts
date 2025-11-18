// PWA-related type definitions

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PWAInstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

export interface PWAInstallButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export type DeviceType = 'mobile' | 'desktop';

export interface PWAStatus {
  isInstalled: boolean;
  isInstallable: boolean;
  isStandalone: boolean;
}

export interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}
