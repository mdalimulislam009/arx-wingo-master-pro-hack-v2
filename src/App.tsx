import { useState, useEffect, useCallback, useRef } from 'react';
import { GameBackground } from './components/GameBackground';
import { PredictorHUD } from './components/PredictorHUD';
import { RoundLogoButton } from './components/RoundLogoButton';
import { AdminModal } from './components/AdminModal';
import { AppSettings, PredictionResult } from './types';
import { engineInstance } from './services/predictionEngine';
import { isSessionAuthenticated } from './services/firebase';
import { sounds } from './services/soundEffects';

const LOGO_URL = 'https://i.postimg.cc/sxB74TxX/file-00000000097c81f5abb566d8a5f9d2ff.png';
const SETTINGS_STORAGE_KEY = 'arx_dragon_settings_v2';

const DEFAULT_SETTINGS: AppSettings = {
  gameIframeUrl: 'https://www.hgnice.top/#/register?invitationCode=541612199538',
  apiEndpoint30s: 'https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json',
  apiEndpoint1m: 'https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json',
  activeApi: '30S',
  customApiUrl: '',
  activeEngine: 'AUTO_APEX',
  syncIntervalMs: 2000, // 2s real working API sync
  telegramUrl: 'https://t.me/win_master10',
  maxLevelClamp: 3,
  adminPasswordHash: 'abirta009',
  soundEnabled: true
};

export default function App() {
  // Load persistent settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  // UI state: Login is directly inside predictor box, no screen-blocking backdrop!
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => isSessionAuthenticated());
  const [isHudVisible, setIsHudVisible] = useState<boolean>(true);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);

  // Prediction & Real-time Sync state
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [countdown, setCountdown] = useState<number>(30);
  const [syncPercent, setSyncPercent] = useState<number>(99);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [lastResultStatus, setLastResultStatus] = useState<'WIN' | 'PENDING' | 'LOSS'>('PENDING');
  const [levelWinLabel, setLevelWinLabel] = useState<string>('LEVEL 1 ACTIVE');
  const [streakWins, setStreakWins] = useState<number>(12);

  const lastPeriodRef = useRef<string>('');

  // Persist settings
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch {
      // ignore
    }
  };

  // Active API endpoint helper
  const getActiveApiUrl = useCallback(() => {
    if (settings.activeApi === '1M') return settings.apiEndpoint1m;
    if (settings.activeApi === 'CUSTOM' && settings.customApiUrl) return settings.customApiUrl;
    return settings.apiEndpoint30s;
  }, [settings]);

  // Execute or lock prediction calculation with Premium 3D Loading Animation
  const triggerPrediction = useCallback((forceNew: boolean = false) => {
    setIsLoading(true);
    sounds.playScan();

    // 1150ms gives time for the high-end 3D gyroscopic & ball tumble animation to dazzle
    setTimeout(() => {
      const nextPred = engineInstance.predict(settings.activeEngine, forceNew);
      setPrediction(nextPred);
      setCurrentLevel(engineInstance.getCurrentLevel());
      setLastResultStatus(engineInstance.getLastResultStatus());
      setLevelWinLabel(engineInstance.getLevelWinLabel());
      setStreakWins(engineInstance.getWinStreak());
      setSyncPercent(Math.floor(98 + Math.random() * 2));
      setIsLoading(false);

      if (engineInstance.getLastResultStatus() === 'WIN') {
        sounds.playSuccess();
      } else {
        sounds.playLock();
      }
    }, 1150);
  }, [settings.activeEngine]);

  // Advance level manually for testing 2-3 level fix winning
  const handleAdvanceTestLevel = useCallback(() => {
    const newLvl = engineInstance.advanceTestLevel();
    setCurrentLevel(newLvl);
    setLevelWinLabel(engineInstance.getLevelWinLabel());
    setLastResultStatus(engineInstance.getLastResultStatus());
    setStreakWins(engineInstance.getWinStreak());
    triggerPrediction(true);
  }, [triggerPrediction]);

  // Sync API Issue History every 2 seconds (working API 2s sync)
  useEffect(() => {
    const apiUrl = getActiveApiUrl();
    const intervalTime = Math.max(1500, settings.syncIntervalMs || 2000);

    const syncApi = async () => {
      try {
        await engineInstance.fetchLiveHistory(apiUrl);
        const nextPeriod = engineInstance.getNextPeriod();

        if (nextPeriod !== lastPeriodRef.current) {
          lastPeriodRef.current = nextPeriod;
          triggerPrediction(true);
        }
      } catch (e) {
        console.warn("API 2s sync notice:", e);
      }
    };

    // Run initial fetch
    syncApi();

    const intervalId = setInterval(syncApi, intervalTime);
    return () => clearInterval(intervalId);
  }, [getActiveApiUrl, settings.syncIntervalMs, triggerPrediction]);

  // Real-time second countdown sync
  useEffect(() => {
    const cycleSeconds = settings.activeApi === '1M' ? 60 : 30;

    const timer = setInterval(() => {
      const now = new Date();
      const totalSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const remain = cycleSeconds - (totalSec % cycleSeconds);

      setCountdown(remain);

      if (remain === cycleSeconds) {
        triggerPrediction(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [settings.activeApi, triggerPrediction]);

  // First time initial prediction
  useEffect(() => {
    if (!prediction) {
      triggerPrediction(false);
    }
  }, [prediction, triggerPrediction]);

  // Key unlock success handler inside Predictor Box
  const handleKeyUnlocked = (label: string) => {
    console.log("VIP Access granted for:", label);
    setIsUnlocked(true);
    setIsHudVisible(true);
    triggerPrediction(true);
  };

  return (
    <main id="app-root" className="relative w-screen h-screen overflow-hidden bg-black font-mono">
      {/* 1. Full Screen Game Background (ALL TIME FREE SHOW - No full-screen backdrop modal!) */}
      <GameBackground url={settings.gameIframeUrl} />

      {/* 2. Floating Circular Logo Button (When HUD is minimized) */}
      {!isHudVisible && (
        <RoundLogoButton
          onClick={() => {
            sounds.playClick();
            setIsHudVisible(true);
          }}
          logoUrl={LOGO_URL}
        />
      )}

      {/* 3. Predictor HUD Overlay with:
             - VIP Login embedded directly inside the box (when not unlocked)
             - Premium 3D Loading Animation on new prediction arrival
             - Strict 2-3 Level Fix Winning engine
             - Background game iframe remains 100% visible and interactive at all times */}
      {isHudVisible && (
        <PredictorHUD
          prediction={prediction}
          countdown={countdown}
          syncPercent={syncPercent}
          isLoading={isLoading}
          onExecute={() => triggerPrediction(true)}
          onHide={() => setIsHudVisible(false)}
          onOpenAdmin={() => setIsAdminOpen(true)}
          logoUrl={LOGO_URL}
          activeEngine={settings.activeEngine}
          currentLevel={currentLevel}
          lastResultStatus={lastResultStatus}
          streakWins={streakWins}
          levelWinLabel={levelWinLabel}
          onAdvanceTestLevel={handleAdvanceTestLevel}
          isUnlocked={isUnlocked}
          onUnlockSuccess={handleKeyUnlocked}
          telegramUrl={settings.telegramUrl}
        />
      )}

      {/* 4. Admin Settings Portal (Accessed discreetly via top-right cog on Predictor HUD, Password: abirta009) */}
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onRefreshHistory={() => triggerPrediction(true)}
      />
    </main>
  );
}
