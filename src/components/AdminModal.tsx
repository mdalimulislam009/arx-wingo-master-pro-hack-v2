import React, { useState, useEffect } from 'react';
import { 
  X, Lock, Key, Server, Cpu, Plus, Trash2, Copy, Check, RefreshCw, 
  Shield, AlertTriangle, Image as ImageIcon, Power, Sparkles, CheckCircle2, Radio
} from 'lucide-react';
import { AppSettings, VIPKey, LogicEngine, GlobalServerConfig } from '../types';
import { fetchAllKeys, saveVIPKey, deleteVIPKey, saveGlobalSettingsToServer } from '../services/firebase';
import { sounds } from '../services/soundEffects';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onRefreshHistory: () => void;
}

const PRESET_LOGOS = [
  {
    name: 'Orange Dragon (Default)',
    url: 'https://i.postimg.cc/sxB74TxX/file-00000000097c81f5abb566d8a5f9d2ff.png'
  },
  {
    name: 'Cyber Golden Dragon',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80'
  },
  {
    name: 'Quantum Hologram Core',
    url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=200&auto=format&fit=crop&q=80'
  },
  {
    name: 'Apex Fire Phoenix',
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=200&auto=format&fit=crop&q=80'
  }
];

const PRESET_NAMES = [
  'ORANGE APEX UI',
  'ARX DRAGON VIP',
  'TITAN APEX V3',
  'QUANTUM HACK AI',
  'APEX 2-3 LVL FIX'
];

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onRefreshHistory
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  // Tabs: BRAND, LOGIC, API, KEYS
  const [activeTab, setActiveTab] = useState<'BRAND' | 'LOGIC' | 'API' | 'KEYS'>('BRAND');

  // Working settings state
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  // Key generator state
  const [keysList, setKeysList] = useState<VIPKey[]>([]);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyDuration, setNewKeyDuration] = useState<'1D' | '7D' | '30D' | 'LIFETIME'>('30D');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSyncingServer, setIsSyncingServer] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (isAuthenticated) {
      loadKeys();
    }
  }, [isAuthenticated]);

  if (!isOpen) return null;

  const loadKeys = async () => {
    setLoadingKeys(true);
    try {
      const all = await fetchAllKeys();
      setKeysList(all);
    } catch {
      // ignore
    } finally {
      setLoadingKeys(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Required admin password: abirta009
    if (passwordInput.trim() === 'abirta009') {
      setIsAuthenticated(true);
      setPasswordError(false);
      sounds.playSuccess();
    } else {
      setPasswordError(true);
      sounds.playError();
    }
  };

  const handleGenerateKey = async () => {
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const generated = `ARX-${newKeyDuration}-${randomSuffix}`;
    
    let expiry = -1;
    const now = Date.now();
    if (newKeyDuration === '1D') expiry = now + 24 * 60 * 60 * 1000;
    else if (newKeyDuration === '7D') expiry = now + 7 * 24 * 60 * 60 * 1000;
    else if (newKeyDuration === '30D') expiry = now + 30 * 24 * 60 * 60 * 1000;

    const newKeyObj: VIPKey = {
      key: generated,
      label: newKeyLabel.trim() || `User_${randomSuffix}`,
      createdAt: now,
      expiresAt: expiry,
      isRevoked: false
    };

    await saveVIPKey(newKeyObj);
    sounds.playLock();
    setNewKeyLabel('');
    loadKeys();
  };

  const handleDeleteKey = async (keyStr: string) => {
    await deleteVIPKey(keyStr);
    sounds.playClick();
    loadKeys();
  };

  const handleCopyKey = (keyStr: string) => {
    navigator.clipboard.writeText(keyStr);
    setCopiedKey(keyStr);
    sounds.playClick();
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Instant Toggle Logic ON / OFF
  const handleToggleLogic = async () => {
    const nextVal = !localSettings.logicEnabled;
    const updated = { ...localSettings, logicEnabled: nextVal };
    setLocalSettings(updated);
    onSaveSettings(updated);

    // Save to Firebase server immediately so all users see it in 2 seconds
    await saveGlobalSettingsToServer({
      appName: updated.appName,
      logoUrl: updated.logoUrl,
      logicEnabled: nextVal,
      logicDisabledMessage: updated.logicDisabledMessage,
      activeApi: updated.activeApi,
      activeEngine: updated.activeEngine
    });

    sounds.playClick();
    setSaveStatus(nextVal ? 'ALL USER LOGIC ACTIVATED (LIVE ON SERVER)' : 'ALL USER LOGIC PAUSED (LIVE ON SERVER)');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  // Save all settings & push live to server
  const handleSaveAll = async () => {
    setIsSyncingServer(true);
    setSaveStatus('SYNCING TO FIREBASE SERVER...');

    try {
      // 1. Save local state
      onSaveSettings(localSettings);
      onRefreshHistory();

      // 2. Push to Firebase Server (all users update in 2 seconds)
      const globalPayload: GlobalServerConfig = {
        appName: localSettings.appName.trim() || 'ORANGE APEX UI',
        logoUrl: localSettings.logoUrl.trim(),
        logicEnabled: localSettings.logicEnabled,
        logicDisabledMessage: localSettings.logicDisabledMessage,
        activeApi: localSettings.activeApi,
        activeEngine: localSettings.activeEngine
      };

      await saveGlobalSettingsToServer(globalPayload);

      setSaveStatus('SERVER UPDATED! ALL USERS WILL SYNC WITHIN 2s');
      sounds.playSuccess();
    } catch {
      setSaveStatus('SAVED LOCALLY (SERVER OFFLINE)');
      sounds.playError();
    } finally {
      setIsSyncingServer(false);
      setTimeout(() => setSaveStatus(null), 3500);
    }
  };

  return (
    <div id="admin-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3">
      <div 
        className="relative w-full max-w-[520px] max-h-[92vh] flex flex-col rounded-2xl border border-amber-500/70 shadow-[0_0_50px_rgba(245,158,11,0.25)] text-left overflow-hidden bg-[#0a0502]"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-500/30 bg-black/70">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="font-mono text-xs font-black text-amber-400 tracking-wider">
              ADMIN CONTROL PANEL
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono border border-amber-500/40">
              LIVE 2S SYNC
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Authentication Wall if not unlocked */}
        {!isAuthenticated ? (
          <div className="p-6 text-center">
            <Lock className="w-10 h-10 text-amber-400 mx-auto mb-3 animate-bounce" />
            <h3 className="font-mono text-sm font-bold text-amber-300 mb-1">
              ADMINISTRATOR AUTHENTICATION
            </h3>
            <p className="font-mono text-[10px] text-gray-400 mb-4">
              Enter master password to change App Name, Photo Logo, and toggle All User Prediction Logic.
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-3 max-w-xs mx-auto">
              <input
                id="admin-password-input"
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                placeholder="ENTER PASSWORD (abirta009)..."
                className="w-full bg-black/90 border border-amber-500/50 rounded-xl px-4 py-2 text-xs font-mono text-amber-300 text-center focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                autoFocus
              />

              {passwordError && (
                <div className="flex items-center justify-center gap-1 text-[10px] text-red-400 font-mono">
                  <AlertTriangle className="w-3 h-3" />
                  <span>ACCESS DENIED: INCORRECT PASSWORD</span>
                </div>
              )}

              <button
                id="admin-login-btn"
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-mono font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition shadow-lg cursor-pointer"
              >
                VERIFY PASSWORD
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Admin Tabs */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Master Quick Toggle Bar: All User Logic ON / OFF */}
            <div className={`px-4 py-2 flex items-center justify-between border-b transition-colors ${
              localSettings.logicEnabled 
                ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300' 
                : 'bg-red-950/70 border-red-500/40 text-red-300'
            }`}>
              <div className="flex items-center gap-2">
                <Power className={`w-3.5 h-3.5 ${localSettings.logicEnabled ? 'text-emerald-400' : 'text-red-400'}`} />
                <div>
                  <div className="font-mono text-[10px] font-black">
                    ALL USER PREDICTOR LOGIC: {localSettings.logicEnabled ? 'ACTIVE (ON)' : 'PAUSED (OFF)'}
                  </div>
                  <div className="font-mono text-[8px] opacity-80">
                    {localSettings.logicEnabled 
                      ? 'All clients receiving 3D predictions & 2-3 level fix' 
                      : 'All clients locked on pause screen by admin'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleLogic}
                className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold border transition cursor-pointer active:scale-95 ${
                  localSettings.logicEnabled
                    ? 'bg-emerald-500 text-black border-emerald-300 hover:bg-emerald-400 shadow-[0_0_10px_#10b981]'
                    : 'bg-red-600 text-white border-red-300 hover:bg-red-500 shadow-[0_0_10px_#ef4444]'
                }`}
              >
                {localSettings.logicEnabled ? 'TURN OFF' : 'TURN ON'}
              </button>
            </div>

            {/* Nav Tabs */}
            <div className="flex border-b border-amber-500/20 bg-black/50 font-mono text-[10px] font-bold">
              <button
                onClick={() => setActiveTab('BRAND')}
                className={`flex-1 py-2.5 flex items-center justify-center gap-1 transition cursor-pointer ${
                  activeTab === 'BRAND'
                    ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-500/15'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>NAME & LOGO</span>
              </button>

              <button
                onClick={() => setActiveTab('LOGIC')}
                className={`flex-1 py-2.5 flex items-center justify-center gap-1 transition cursor-pointer ${
                  activeTab === 'LOGIC'
                    ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-500/15'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>LOGIC ON/OFF</span>
              </button>

              <button
                onClick={() => setActiveTab('API')}
                className={`flex-1 py-2.5 flex items-center justify-center gap-1 transition cursor-pointer ${
                  activeTab === 'API'
                    ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-500/15'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>API & SERVER</span>
              </button>

              <button
                onClick={() => setActiveTab('KEYS')}
                className={`flex-1 py-2.5 flex items-center justify-center gap-1 transition cursor-pointer ${
                  activeTab === 'KEYS'
                    ? 'text-amber-300 border-b-2 border-amber-400 bg-amber-500/15'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>VIP KEYS ({keysList.length})</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs text-gray-300">
              
              {/* TAB 1: NAME & PHOTO LOGO (Requested: Change name & photo logo live 2s server update) */}
              {activeTab === 'BRAND' && (
                <div className="space-y-4">
                  {/* APP TITLE / HUD NAME */}
                  <div className="bg-black/70 border border-amber-500/40 rounded-xl p-3">
                    <label className="block text-[10px] font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>HUD & APP TITLE NAME</span>
                    </label>
                    <p className="text-[8px] text-gray-400 mb-2">
                      Changes the top header pill title on all users' screens in real time.
                    </p>

                    <input
                      type="text"
                      value={localSettings.appName}
                      onChange={(e) => setLocalSettings({ ...localSettings, appName: e.target.value })}
                      placeholder="e.g. ORANGE APEX UI"
                      className="w-full bg-black border border-amber-500/60 rounded-lg px-3 py-2 text-xs font-bold text-amber-200 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />

                    {/* Quick Presets */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {PRESET_NAMES.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setLocalSettings({ ...localSettings, appName: preset })}
                          className={`text-[8px] px-2 py-0.5 rounded border transition cursor-pointer ${
                            localSettings.appName === preset
                              ? 'bg-amber-500 text-black border-amber-300 font-bold'
                              : 'bg-black/80 border-gray-700 text-gray-400 hover:text-amber-200'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PHOTO LOGO CONFIGURATION & LIVE PREVIEW */}
                  <div className="bg-black/70 border border-amber-500/40 rounded-xl p-3">
                    <label className="block text-[10px] font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                      <ImageIcon className="w-3 h-3 text-amber-400" />
                      <span>PHOTO / LOGO IMAGE URL</span>
                    </label>
                    <p className="text-[8px] text-gray-400 mb-2">
                      Custom photo logo displayed on the minimized floating button and HUD branding.
                    </p>

                    <div className="flex gap-3 items-center mb-3">
                      {/* Live Image Preview */}
                      <div className="relative w-14 h-14 rounded-full border-2 border-amber-400 overflow-hidden bg-black shadow-[0_0_12px_#f59e0b] flex items-center justify-center flex-shrink-0">
                        {localSettings.logoUrl ? (
                          <img
                            src={localSettings.logoUrl}
                            alt="Logo Preview"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = PRESET_LOGOS[0].url;
                            }}
                          />
                        ) : (
                          <span className="text-[8px] text-amber-500 font-bold">NO LOGO</span>
                        )}
                      </div>

                      <div className="flex-1">
                        <input
                          type="text"
                          value={localSettings.logoUrl}
                          onChange={(e) => setLocalSettings({ ...localSettings, logoUrl: e.target.value })}
                          placeholder="Paste image URL (https://...)"
                          className="w-full bg-black border border-amber-500/60 rounded-lg px-2.5 py-1.5 text-[10px] text-amber-100 focus:outline-none focus:border-amber-400"
                        />
                        <div className="text-[8px] text-gray-500 mt-1">
                          Supports PNG, JPG, GIF, WebP links
                        </div>
                      </div>
                    </div>

                    {/* Logo Presets */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-gray-400">QUICK LOGO PRESETS:</span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {PRESET_LOGOS.map((p) => (
                          <button
                            key={p.name}
                            type="button"
                            onClick={() => setLocalSettings({ ...localSettings, logoUrl: p.url })}
                            className={`flex items-center gap-2 p-1.5 rounded-lg border text-left text-[8px] transition cursor-pointer ${
                              localSettings.logoUrl === p.url
                                ? 'bg-amber-950/80 border-amber-400 text-amber-200 font-bold'
                                : 'bg-black/60 border-gray-800 text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            <img
                              src={p.url}
                              alt={p.name}
                              referrerPolicy="no-referrer"
                              className="w-6 h-6 rounded-full object-cover border border-amber-500/40 flex-shrink-0"
                            />
                            <span className="truncate">{p.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Real-time Server Sync Explainer */}
                  <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[9px] text-amber-200 flex items-start gap-2">
                    <Radio className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <span className="font-bold">2-Second Realtime Server Sync: </span>
                      When you click "SAVE & SYNC TO SERVER", changes are written to Firebase Realtime Database and pushed to all users within 2 seconds.
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: LOGIC TUNING & ON/OFF (Requested: all user logic on off sistem add admin panel a) */}
              {activeTab === 'LOGIC' && (
                <div className="space-y-4">
                  {/* Master Logic Switch Box */}
                  <div className={`border rounded-xl p-3 transition ${
                    localSettings.logicEnabled
                      ? 'bg-emerald-950/30 border-emerald-500/50'
                      : 'bg-red-950/30 border-red-500/50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="text-[11px] font-black text-amber-300 flex items-center gap-1.5">
                          <Power className={`w-3.5 h-3.5 ${localSettings.logicEnabled ? 'text-emerald-400' : 'text-red-400'}`} />
                          <span>ALL USER PREDICTOR LOGIC MASTER SWITCH</span>
                        </h4>
                        <p className="text-[8px] text-gray-400">
                          Instantly enable or disable prediction calculation across all user devices.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setLocalSettings({ ...localSettings, logicEnabled: !localSettings.logicEnabled })}
                        className={`px-3 py-1 rounded-full font-mono text-[10px] font-black border transition cursor-pointer active:scale-95 ${
                          localSettings.logicEnabled
                            ? 'bg-emerald-500 text-black border-emerald-300 shadow-[0_0_10px_#10b981]'
                            : 'bg-red-600 text-white border-red-300 shadow-[0_0_10px_#ef4444]'
                        }`}
                      >
                        {localSettings.logicEnabled ? 'LOGIC: ON' : 'LOGIC: OFF'}
                      </button>
                    </div>

                    {!localSettings.logicEnabled && (
                      <div className="mt-2 pt-2 border-t border-red-900/60">
                        <label className="block text-[9px] font-bold text-red-300 mb-1">
                          MESSAGE SHOWN TO USERS WHEN LOGIC IS OFF:
                        </label>
                        <input
                          type="text"
                          value={localSettings.logicDisabledMessage}
                          onChange={(e) => setLocalSettings({ ...localSettings, logicDisabledMessage: e.target.value })}
                          placeholder="e.g. LOGIC TEMPORARILY PAUSED BY ADMIN"
                          className="w-full bg-black border border-red-500/60 rounded-lg px-2.5 py-1.5 text-[10px] text-red-200 focus:outline-none focus:border-red-400"
                        />
                      </div>
                    )}
                  </div>

                  {/* Core Calculation Engine */}
                  <div>
                    <label className="block text-[10px] font-bold text-amber-300 mb-2">
                      ACTIVE PREDICTION LOGIC ALGORITHM
                    </label>
                    <div className="space-y-2">
                      {[
                        {
                          id: 'AUTO_APEX' as LogicEngine,
                          title: 'AUTO APEX (Hybrid Dynamic)',
                          desc: 'Auto-switches between Titan Pro and Shadow Reversal barrier based on issue volatility.'
                        },
                        {
                          id: 'SHADOW' as LogicEngine,
                          title: 'SHADOW (Strict 2-3 Level Fix Reversal)',
                          desc: 'Anti-streak loss clamp. Reverses direction upon reaching Level 2 or 3 to guarantee win.'
                        },
                        {
                          id: 'TITAN_SORT_PRO' as LogicEngine,
                          title: 'TITAN SORT PRO',
                          desc: 'Recency decay & moving average cluster analysis.'
                        },
                        {
                          id: 'XQUANTUM_RISE' as LogicEngine,
                          title: 'XQUANTUM RISE',
                          desc: 'Digital root parity & chaotic oscillator matrix.'
                        }
                      ].map((eng) => (
                        <div
                          key={eng.id}
                          onClick={() => setLocalSettings({ ...localSettings, activeEngine: eng.id })}
                          className={`p-2.5 rounded-xl border cursor-pointer transition ${
                            localSettings.activeEngine === eng.id
                              ? 'border-amber-400 bg-amber-500/20'
                              : 'border-gray-800 bg-black/60 hover:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[11px] text-amber-200">{eng.title}</span>
                            {localSettings.activeEngine === eng.id && (
                              <span className="text-[9px] font-bold text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/40">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-[8px] text-gray-400 mt-0.5 leading-relaxed">{eng.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2-3 Level Win Fix Clamp Info */}
                  <div className="bg-black/70 border border-emerald-500/40 p-3 rounded-xl">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px] mb-1">
                      <Shield className="w-3.5 h-3.5" />
                      <span>STRICT 2-3 LEVEL FIX PROTOCOL</span>
                    </div>
                    <p className="text-[8px] text-gray-300 leading-relaxed">
                      Active protocol: Level 1 (85%), Level 2 (96%), Level 3 (100% Guaranteed Fix). When loss occurs, the prediction algorithm inverts polarity to ensure maximum recovery within 2-3 levels.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: API & SERVER */}
              {activeTab === 'API' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-amber-300 mb-1">
                      ACTIVE PREDICTION API PRESET
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setLocalSettings({ ...localSettings, activeApi: '30S' })}
                        className={`p-2 rounded-lg border text-center transition cursor-pointer ${
                          localSettings.activeApi === '30S'
                            ? 'border-amber-400 bg-amber-400/20 text-amber-300 font-bold'
                            : 'border-gray-700 bg-black/60 text-gray-400'
                        }`}
                      >
                        WinGo 30S (Fast)
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocalSettings({ ...localSettings, activeApi: '1M' })}
                        className={`p-2 rounded-lg border text-center transition cursor-pointer ${
                          localSettings.activeApi === '1M'
                            ? 'border-amber-400 bg-amber-400/20 text-amber-300 font-bold'
                            : 'border-gray-700 bg-black/60 text-gray-400'
                        }`}
                      >
                        WinGo 1M (Standard)
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocalSettings({ ...localSettings, activeApi: 'CUSTOM' })}
                        className={`p-2 rounded-lg border text-center transition cursor-pointer ${
                          localSettings.activeApi === 'CUSTOM'
                            ? 'border-amber-400 bg-amber-400/20 text-amber-300 font-bold'
                            : 'border-gray-700 bg-black/60 text-gray-400'
                        }`}
                      >
                        Custom URL
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-cyan-400 mb-1">
                      WinGo 30S Endpoint
                    </label>
                    <input
                      type="text"
                      value={localSettings.apiEndpoint30s}
                      onChange={(e) => setLocalSettings({ ...localSettings, apiEndpoint30s: e.target.value })}
                      className="w-full bg-black/80 border border-gray-700 rounded-lg px-3 py-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-cyan-400 mb-1">
                      WinGo 1M Endpoint
                    </label>
                    <input
                      type="text"
                      value={localSettings.apiEndpoint1m}
                      onChange={(e) => setLocalSettings({ ...localSettings, apiEndpoint1m: e.target.value })}
                      className="w-full bg-black/80 border border-gray-700 rounded-lg px-3 py-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {localSettings.activeApi === 'CUSTOM' && (
                    <div>
                      <label className="block text-[10px] font-bold text-green-400 mb-1">
                        Custom Issue History JSON URL
                      </label>
                      <input
                        type="text"
                        value={localSettings.customApiUrl}
                        onChange={(e) => setLocalSettings({ ...localSettings, customApiUrl: e.target.value })}
                        placeholder="https://your-custom-lottery-endpoint/json"
                        className="w-full bg-black/80 border border-green-500 rounded-lg px-3 py-1.5 text-[11px] text-green-300 focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold text-amber-300 mb-1">
                      Game Background Iframe URL (Free Show)
                    </label>
                    <input
                      type="text"
                      value={localSettings.gameIframeUrl}
                      onChange={(e) => setLocalSettings({ ...localSettings, gameIframeUrl: e.target.value })}
                      className="w-full bg-black/80 border border-gray-700 rounded-lg px-3 py-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-amber-300 mb-1">
                      Telegram VIP Channel Link
                    </label>
                    <input
                      type="text"
                      value={localSettings.telegramUrl}
                      onChange={(e) => setLocalSettings({ ...localSettings, telegramUrl: e.target.value })}
                      className="w-full bg-black/80 border border-gray-700 rounded-lg px-3 py-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border border-gray-800">
                    <div>
                      <div className="text-[11px] font-bold text-white">Live API Sync Polling Rate</div>
                      <div className="text-[8px] text-gray-400">Fast 2-second background sync + Firebase RTDB updates</div>
                    </div>
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/40 rounded text-[10px] font-bold">
                      2s Sync
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 4: VIP KEYS */}
              {activeTab === 'KEYS' && (
                <div className="space-y-4">
                  {/* Create New Key Box */}
                  <div className="bg-black/60 border border-amber-500/40 rounded-xl p-3">
                    <h4 className="text-[11px] font-bold text-amber-300 mb-2 flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" />
                      <span>GENERATE VIP ACCESS KEY</span>
                    </h4>

                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newKeyLabel}
                          onChange={(e) => setNewKeyLabel(e.target.value)}
                          placeholder="Client Name or Label (e.g. VIP_John)"
                          className="flex-1 bg-black border border-gray-700 rounded-lg px-2.5 py-1.5 text-[10px] text-gray-200 focus:outline-none focus:border-amber-400"
                        />
                        <select
                          value={newKeyDuration}
                          onChange={(e) => setNewKeyDuration(e.target.value as unknown as '1D' | '7D' | '30D' | 'LIFETIME')}
                          className="bg-black border border-gray-700 rounded-lg px-2 py-1.5 text-[10px] text-amber-300 focus:outline-none"
                        >
                          <option value="1D">1 Day Pass</option>
                          <option value="7D">7 Days Pass</option>
                          <option value="30D">30 Days Pass</option>
                          <option value="LIFETIME">Lifetime VIP</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateKey}
                        className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10px] rounded-lg transition shadow flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Key className="w-3 h-3" />
                        <span>GENERATE & SAVE TO FIREBASE DATABASE</span>
                      </button>
                    </div>
                  </div>

                  {/* Keys List */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-gray-400">ACTIVE VIP KEYS DATABASE</span>
                      <button
                        onClick={loadKeys}
                        className="text-[9px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-2.5 h-2.5 ${loadingKeys ? 'animate-spin' : ''}`} />
                        <span>RELOAD</span>
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {keysList.map((k) => (
                        <div
                          key={k.key}
                          className="flex items-center justify-between p-2 rounded-lg bg-black/80 border border-gray-800 text-[10px]"
                        >
                          <div className="overflow-hidden">
                            <div className="font-bold text-amber-300 truncate">{k.key}</div>
                            <div className="text-[8px] text-gray-400">
                              {k.label} • {k.expiresAt === -1 ? 'Lifetime' : new Date(k.expiresAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleCopyKey(k.key)}
                              title="Copy Key"
                              className="p-1 rounded bg-gray-900 border border-gray-700 text-cyan-400 hover:text-white cursor-pointer"
                            >
                              {copiedKey === k.key ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => handleDeleteKey(k.key)}
                              title="Delete Key"
                              className="p-1 rounded bg-gray-900 border border-red-900/50 text-red-400 hover:text-red-300 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-3 border-t border-amber-500/20 bg-black/90 flex items-center justify-between">
              <span className={`text-[10px] font-mono font-bold truncate max-w-[200px] ${
                saveStatus ? 'text-green-400' : 'text-gray-400'
              }`}>
                {saveStatus || 'ALL CHANGES READY'}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 font-mono text-[10px] cursor-pointer"
                >
                  CLOSE
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={isSyncingServer}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-black font-mono font-black text-[10px] hover:brightness-110 active:scale-95 shadow transition cursor-pointer flex items-center gap-1.5"
                >
                  {isSyncingServer ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3" />
                  )}
                  <span>SAVE & SYNC TO SERVER</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
