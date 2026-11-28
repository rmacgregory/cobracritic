import React, { createContext, useContext, useEffect, useState } from 'react';
import { hasCollectedAllEasterEggs } from '../components/RetroEasterEggs';
import { useVeredito } from './VereditoContext';

export type CrtCurvatureLevel = 'subtle' | 'medium';

export interface CrtSettings {
  enabled: boolean;
  phosphorGlow: number; // 0..100
  totalBrightness: number; // 60..140
  curvature: CrtCurvatureLevel;
}

export const DEFAULT_CRT_SETTINGS: CrtSettings = {
  enabled: false,
  phosphorGlow: 55,
  totalBrightness: 100,
  curvature: 'medium',
};

const CRT_STORAGE_KEY = 'cobracritic_crt_settings';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function loadInitialSettings(): CrtSettings {
  try {
    const raw = window.localStorage.getItem(CRT_STORAGE_KEY);
    if (!raw) return DEFAULT_CRT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<CrtSettings> & { curvature?: string };
    const curvature: CrtCurvatureLevel =
      parsed.curvature === 'subtle' || parsed.curvature === 'medium'
        ? parsed.curvature
        : DEFAULT_CRT_SETTINGS.curvature;
    return {
      enabled: Boolean(parsed.enabled),
      phosphorGlow:
        typeof parsed.phosphorGlow === 'number' && !Number.isNaN(parsed.phosphorGlow)
          ? clamp(Math.round(parsed.phosphorGlow), 0, 100)
          : DEFAULT_CRT_SETTINGS.phosphorGlow,
      totalBrightness:
        typeof parsed.totalBrightness === 'number' &&
        !Number.isNaN(parsed.totalBrightness)
          ? clamp(Math.round(parsed.totalBrightness), 60, 140)
          : DEFAULT_CRT_SETTINGS.totalBrightness,
      curvature,
    };
  } catch {
    return DEFAULT_CRT_SETTINGS;
  }
}

interface CrtContextValue {
  settings: CrtSettings;
  unlocked: boolean;
  configOpen: boolean;
  setConfigOpen: (open: boolean) => void;
  toggleCrt: () => void;
  updateSettings: (patch: Partial<CrtSettings>) => void;
  resetSettings: () => void;
}

const CrtContext = createContext<CrtContextValue>({
  settings: DEFAULT_CRT_SETTINGS,
  unlocked: false,
  configOpen: false,
  setConfigOpen: () => {},
  toggleCrt: () => {},
  updateSettings: () => {},
  resetSettings: () => {},
});

export function CrtProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, readOnlyMode } = useVeredito();
  const [rawSettings, setRawSettings] = useState<CrtSettings>(() =>
    loadInitialSettings(),
  );
  const [configOpen, setConfigOpenState] = useState(false);

  const unlocked = Boolean(
    user &&
      profile &&
      !readOnlyMode &&
      (hasCollectedAllEasterEggs(profile.collectedEasterEggs) ||
        Boolean(profile.konamiUnlocked)),
  );

  const effectiveSettings: CrtSettings = unlocked
    ? rawSettings
    : { ...rawSettings, enabled: false };

  const effectiveConfigOpen = unlocked && configOpen;

  useEffect(() => {
    if (!unlocked && configOpen) {
      setConfigOpenState(false);
    }
  }, [unlocked, configOpen]);

  useEffect(() => {
    try {
      window.localStorage.setItem(CRT_STORAGE_KEY, JSON.stringify(rawSettings));
    } catch {
      // ignore storage errors
    }
  }, [rawSettings]);

  useEffect(() => {
    const root = document.documentElement;
    if (!effectiveSettings.enabled) {
      root.removeAttribute('data-crt');
      root.style.removeProperty('--crt-brightness');
      root.style.removeProperty('--crt-contrast');
      root.style.removeProperty('--crt-saturate');
      root.style.removeProperty('--crt-phosphor-text-blur');
      root.style.removeProperty('--crt-phosphor-text-alpha');
      return;
    }

    const phosphorRatio = effectiveSettings.phosphorGlow / 100;
    const brightnessFactor = effectiveSettings.totalBrightness / 100;
    const contrastFactor = 1.04 + phosphorRatio * 0.1;
    const saturateFactor = 1.04 + phosphorRatio * 0.24;
    const textBlurPx = (phosphorRatio * 7).toFixed(1);
    const textAlpha = (phosphorRatio * 0.36).toFixed(2);

    root.setAttribute('data-crt', 'on');
    root.style.setProperty('--crt-brightness', brightnessFactor.toFixed(2));
    root.style.setProperty('--crt-contrast', contrastFactor.toFixed(2));
    root.style.setProperty('--crt-saturate', saturateFactor.toFixed(2));
    root.style.setProperty('--crt-phosphor-text-blur', `${textBlurPx}px`);
    root.style.setProperty('--crt-phosphor-text-alpha', textAlpha);
  }, [effectiveSettings]);

  const setConfigOpen = (open: boolean) => {
    if (!unlocked) {
      setConfigOpenState(false);
      return;
    }
    setConfigOpenState(open);
  };

  const toggleCrt = () => {
    if (!unlocked) return;
    setRawSettings((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  const updateSettings = (patch: Partial<CrtSettings>) => {
    if (!unlocked) return;
    setRawSettings((prev) => ({
      ...prev,
      ...patch,
      phosphorGlow:
        patch.phosphorGlow !== undefined
          ? clamp(Math.round(patch.phosphorGlow), 0, 100)
          : prev.phosphorGlow,
      totalBrightness:
        patch.totalBrightness !== undefined
          ? clamp(Math.round(patch.totalBrightness), 60, 140)
          : prev.totalBrightness,
    }));
  };

  const resetSettings = () => {
    if (!unlocked) return;
    setRawSettings((prev) => ({
      ...DEFAULT_CRT_SETTINGS,
      enabled: prev.enabled,
    }));
  };

  return (
    <CrtContext.Provider
      value={{
        settings: effectiveSettings,
        unlocked,
        configOpen: effectiveConfigOpen,
        setConfigOpen,
        toggleCrt,
        updateSettings,
        resetSettings,
      }}
    >
      {children}
    </CrtContext.Provider>
  );
}

export function useCrt() {
  return useContext(CrtContext);
}

export function scrollToAppTop(behavior: ScrollBehavior = 'smooth') {
  if (typeof document === 'undefined') return;
  const crtScroller = document.getElementById('crt-scroll-container');
  if (crtScroller && crtScroller.scrollHeight > crtScroller.clientHeight) {
    crtScroller.scrollTo({ top: 0, behavior });
    return;
  }
  window.scrollTo({ top: 0, behavior });
}

