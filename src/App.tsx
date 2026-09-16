import { useState, useEffect, useCallback, useRef } from 'react';
import { GameBackground } from './components/GameBackground';
import { PredictorHUD } from './components/PredictorHUD';
import { RoundLogoButton } from './components/RoundLogoButton';
import { AdminModal } from './components/AdminModal';
import { AppSettings, PredictionResult, GlobalServerConfig } from './types';
import { engineInstance } from './services/predictionEngine';
import { 
  isSessionAuthenticated, 
  subscribeToGlobalSettings, 
  fetchGlobalSettingsFromServer 
} from './services/firebase';
import { sounds } from './services/soundEffects';

const SETTINGS_STORAGE_KEY = 'arx_dragon_settings_v2';

const DEFAULT_SETTINGS: AppSettings = {
  appName: 'ORANGE APEX UI',
  logoUrl: 'https://i.postimg.cc/sxB74TxX/file-00000000097c81f5abb566d8a5f9d2ff.png',
  logicEnabled: true,
  logicDisabledMessage: 'LOGIC TEMPORARILY PAUSED BY ADMIN',
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

  // Persist settings locally
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    } catch {
      // ignore
    }
  };

  // 1. REAL-TIME 2-SECOND SERVER SYNC (All users receive name, photo logo, and logic ON/OFF)
  useEffect(() => {
    // Apply server config to local settings
    const applyServerConfig = (serverConfig: GlobalServerConfig) => {
      setSettings((prev) => {
        let changed = false;
        const next = { ...prev };

        if (serverConfig.appName && serverConfig.appName !== prev.appName) {
          next.appName = serverConfig.appName;
          changed = true;
          document.title = serverConfig.appName;
        }

        if (serverConfig.logoUrl !== undefined && serverConfig.logoUrl !== prev.logoUrl) {
          next.logoUrl = serverConfig.logoUrl;
          changed = true;
        }

        if (serverConfig.logicEnabled !== undefined && serverConfig.logicEnabled !== prev.logicEnabled) {
          next.logicEnabled = serverConfig.logicEnabled;
          changed = true;
        }

        if (serverConfig.logicDisabledMessage !== undefined && serverConfig.logicDisabledMessage !== prev.logicDisabledMessage) {
          next.logicDisabledMessage = serverConfig.logicDisabledMessage;
          changed = true;
        }

        if (serverConfig.activeEngine && serverConfig.activeEngine !== prev.activeEngine) {
          next.activeEngine = serverConfig.activeEngine;
          changed = true;
        }

        if (changed) {
          try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        }
        return prev;
      });
    };

    // Immediate initial fetch from server
    fetchGlobalSettingsFromServer().then((cfg) => {
      if (cfg) applyServerConfig(cfg);
    });

    // Real-time Firebase WebSocket listener (sub-second update)
    const unsubscribe = subscribeToGlobalSettings((cfg) => {
      applyServerConfig(cfg);
    });

    // 2-Second polling heartbeat fallback to guarantee every user syncs within 2 seconds
    const interval2s = setInterval(async () => {
      const cfg = await fetchGlobalSettingsFromServer();
      if (cfg) {
        applyServerConfig(cfg);
      }
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval2s);
    };
  }, []);

  // Active API endpoint helper
  const getActiveApiUrl = useCallback(() => {
    if (settings.activeApi === '1M') return settings.apiEndpoint1m;
    if (settings.activeApi === 'CUSTOM' && settings.customApiUrl) return settings.customApiUrl;
    return settings.apiEndpoint30s;
  }, [settings]);

  // Execute or lock prediction calculation with Premium 3D Loading Animation
  const triggerPrediction = useCallback((forceNew: boolean = false) => {
    if (!settings.logicEnabled) {
      return;
    }

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
  }, [settings.activeEngine, settings.logicEnabled]);

  // Advance level manually for testing 2-3 level fix winning
  const handleAdvanceTestLevel = useCallback(() => {
    if (!settings.logicEnabled) return;
    const newLvl = engineInstance.advanceTestLevel();
    setCurrentLevel(newLvl);
    setLevelWinLabel(engineInstance.getLevelWinLabel());
    setLastResultStatus(engineInstance.getLastResultStatus());
    setStreakWins(engineInstance.getWinStreak());
    triggerPrediction(true);
  }, [triggerPrediction, settings.logicEnabled]);

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
          if (settings.logicEnabled) {
            triggerPrediction(true);
          }
        }
      } catch (e) {
        console.warn("API 2s sync notice:", e);
      }
    };

    // Run initial fetch
    syncApi();

    const intervalId = setInterval(syncApi, intervalTime);
    return () => clearInterval(intervalId);
  }, [getActiveApiUrl, settings.syncIntervalMs, settings.logicEnabled, triggerPrediction]);

  // Real-time second countdown sync
  useEffect(() => {
    const cycleSeconds = settings.activeApi === '1M' ? 60 : 30;

    const timer = setInterval(() => {
      const now = new Date();
      const totalSec = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const remain = cycleSeconds - (totalSec % cycleSeconds);

      setCountdown(remain);

      if (remain === cycleSeconds && settings.logicEnabled) {
        triggerPrediction(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [settings.activeApi, settings.logicEnabled, triggerPrediction]);

  // First time initial prediction
  useEffect(() => {
    if (!prediction && settings.logicEnabled) {
      triggerPrediction(false);
    }
  }, [prediction, settings.logicEnabled, triggerPrediction]);

  // Key unlock success handler inside Predictor Box
  const handleKeyUnlocked = (label: string) => {
    console.log("VIP Access granted for:", label);
    setIsUnlocked(true);
    setIsHudVisible(true);
    if (settings.logicEnabled) {
      triggerPrediction(true);
    }
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
          logoUrl={settings.logoUrl}
        />
      )}

      {/* 3. Predictor HUD Overlay with:
             - Admin-controlled Name and Photo Logo
             - All user logic ON/OFF system
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
          appName={settings.appName}
          logoUrl={settings.logoUrl}
          logicEnabled={settings.logicEnabled}
          logicDisabledMessage={settings.logicDisabledMessage}
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
