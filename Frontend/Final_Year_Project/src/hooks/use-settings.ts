import { useState, useEffect, useCallback } from 'react';

export interface UserSettings {
  aqiThresholdAlerts: boolean;
  fireDetectionAlerts: boolean;
  pipelineFailureAlerts: boolean;
  dailyReportDigest: boolean;
  defaultRegion: string;
  refreshInterval: string;
  exportFormat: string;
  accentColor: string;
  fontScale: number;
}

const DEFAULT_SETTINGS: UserSettings = {
  aqiThresholdAlerts: true,
  fireDetectionAlerts: true,
  pipelineFailureAlerts: true,
  dailyReportDigest: false,
  defaultRegion: 'National — India',
  refreshInterval: '5 minutes',
  exportFormat: 'PDF',
  accentColor: '#123A8F',
  fontScale: 100,
};

const STORAGE_KEY = 'aerosense-settings';

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const update = useCallback(<K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  return { settings, update, reset };
}
