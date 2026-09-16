import React, { useState, useEffect } from 'react';
import { X, Lock, Key, Server, Cpu, Plus, Trash2, Copy, Check, RefreshCw, Shield, AlertTriangle } from 'lucide-react';
import { AppSettings, VIPKey, LogicEngine } from '../types';
import { fetchAllKeys, saveVIPKey, deleteVIPKey } from '../services/firebase';
import { sounds } from '../services/soundEffects';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: AppSettings) => void;
  onRefreshHistory: () => void;
}

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

  // Tabs
  const [activeTab, setActiveTab] = useState<'API' | 'KEYS' | 'LOGIC'>('API');

  // Working settings state
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);

  // Key generator state
  const [keysList, setKeysList] = useState<VIPKey[]>([]);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyDuration, setNewKeyDuration] = useState<'1D' | '7D' | '30D' | 'LIFETIME'>('30D');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [saveStatus, setSaveStatus] = useState(false);

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
    // Required password: abirta009
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

  const handleSaveAll = () => {
    onSaveSettings(localSettings);
    onRefreshHistory();
    setSaveStatus(true);
    sounds.playSuccess();
    setTimeout(() => setSaveStatus(false), 2000);
  };

  return (
    <div id="admin-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-3">
      <div 
        className="relative w-full max-w-[480px] max-h-[90vh] flex flex-col rounded-2xl border border-yellow-500/70 shadow-[0_0_50px_rgba(255,215,0,0.25)] text-left overflow-hidden bg-[#07120c]"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-yellow-500/30 bg-black/60">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-yellow-400" />
            <span className="font-mono text-xs font-black text-yellow-400 tracking-wider">
              ADMIN CONTROL PANEL
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Authentication Wall if not unlocked */}
        {!isAuthenticated ? (
          <div className="p-6 text-center">
            <Lock className="w-10 h-10 text-yellow-400 mx-auto mb-3 animate-bounce" />
            <h3 className="font-mono text-sm font-bold text-yellow-300 mb-1">
              AUTHORIZED PERSONNEL ONLY
            </h3>
            <p className="font-mono text-[10px] text-gray-400 mb-4">
              Enter Administrator Master Password to modify APIs, logic engines, and VIP keys.
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
                placeholder="ENTER MASTER PASSWORD..."
                className="w-full bg-black/90 border border-yellow-500/50 rounded-xl px-4 py-2 text-xs font-mono text-yellow-300 text-center focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
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
                className="w-full py-2 bg-gradient-to-r from-yellow-500 to-green-500 text-black font-mono font-bold text-xs rounded-xl hover:brightness-110 active:scale-95 transition shadow-lg cursor-pointer"
              >
                VERIFY PASSWORD
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Admin Tabs */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Nav Tabs */}
            <div className="flex border-b border-yellow-500/20 bg-black/40 font-mono text-[11px] font-bold">
              <button
                onClick={() => setActiveTab('API')}
                className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'API'
                    ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-500/10'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>API & SERVER</span>
              </button>

              <button
                onClick={() => setActiveTab('KEYS')}
                className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'KEYS'
                    ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-500/10'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>VIP KEYS ({keysList.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('LOGIC')}
                className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition ${
                  activeTab === 'LOGIC'
                    ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-500/10'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>LOGIC TUNING</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-xs text-gray-300">
              {/* TAB 1: API & SERVER */}
              {activeTab === 'API' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-[10px] font-bold text-yellow-400 mb-1">
                      ACTIVE PREDICTION API PRESET
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setLocalSettings({ ...localSettings, activeApi: '30S' })}
                        className={`p-2 rounded-lg border text-center transition ${
                          localSettings.activeApi === '30S'
                            ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300 font-bold'
                            : 'border-gray-700 bg-black/60 text-gray-400'
                        }`}
                      >
                        WinGo 30S (Fast)
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocalSettings({ ...localSettings, activeApi: '1M' })}
                        className={`p-2 rounded-lg border text-center transition ${
                          localSettings.activeApi === '1M'
                            ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300 font-bold'
                            : 'border-gray-700 bg-black/60 text-gray-400'
                        }`}
                      >
                        WinGo 1M (Standard)
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocalSettings({ ...localSettings, activeApi: 'CUSTOM' })}
                        className={`p-2 rounded-lg border text-center transition ${
                          localSettings.activeApi === 'CUSTOM'
                            ? 'border-yellow-400 bg-yellow-400/20 text-yellow-300 font-bold'
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
                    <label className="block text-[10px] font-bold text-yellow-400 mb-1">
                      Game Background Iframe URL
                    </label>
                    <input
                      type="text"
                      value={localSettings.gameIframeUrl}
                      onChange={(e) => setLocalSettings({ ...localSettings, gameIframeUrl: e.target.value })}
                      className="w-full bg-black/80 border border-gray-700 rounded-lg px-3 py-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-yellow-400 mb-1">
                      Telegram VIP Channel Link
                    </label>
                    <input
                      type="text"
                      value={localSettings.telegramUrl}
                      onChange={(e) => setLocalSettings({ ...localSettings, telegramUrl: e.target.value })}
                      className="w-full bg-black/80 border border-gray-700 rounded-lg px-3 py-1.5 text-[11px] text-gray-200 focus:outline-none focus:border-yellow-400"
                    />
                  </div>

                  <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-lg border border-gray-800">
                    <div>
                      <div className="text-[11px] font-bold text-white">Live API Sync Polling Rate</div>
                      <div className="text-[9px] text-gray-400">Fast 2-second background synchronization</div>
                    </div>
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/40 rounded text-[10px] font-bold">
                      2s Sync
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: VIP KEYS MANAGEMENT */}
              {activeTab === 'KEYS' && (
                <div className="space-y-4">
                  {/* Create New Key Box */}
                  <div className="bg-black/60 border border-yellow-500/40 rounded-xl p-3">
                    <h4 className="text-[11px] font-bold text-yellow-400 mb-2 flex items-center gap-1.5">
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
                          className="flex-1 bg-black border border-gray-700 rounded-lg px-2.5 py-1.5 text-[10px] text-gray-200 focus:outline-none focus:border-yellow-400"
                        />
                        <select
                          value={newKeyDuration}
                          onChange={(e) => setNewKeyDuration(e.target.value as unknown as '1D' | '7D' | '30D' | 'LIFETIME')}
                          className="bg-black border border-gray-700 rounded-lg px-2 py-1.5 text-[10px] text-yellow-400 focus:outline-none"
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
                        className="w-full py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-[10px] rounded-lg transition shadow flex items-center justify-center gap-1 cursor-pointer"
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
                        className="text-[9px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
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
                            <div className="font-bold text-yellow-300 truncate">{k.key}</div>
                            <div className="text-[8px] text-gray-400">
                              {k.label} • {k.expiresAt === -1 ? 'Lifetime' : new Date(k.expiresAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleCopyKey(k.key)}
                              title="Copy Key"
                              className="p-1 rounded bg-gray-900 border border-gray-700 text-cyan-400 hover:text-white"
                            >
                              {copiedKey === k.key ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => handleDeleteKey(k.key)}
                              title="Delete Key"
                              className="p-1 rounded bg-gray-900 border border-red-900/50 text-red-400 hover:text-red-300"
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

              {/* TAB 3: LOGIC TUNING */}
              {activeTab === 'LOGIC' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-yellow-400 mb-2">
                      CORE CALCULATION ENGINE
                    </label>
                    <div className="space-y-2">
                      {[
                        {
                          id: 'TITAN_SORT_PRO' as LogicEngine,
                          title: 'TITAN SORT PRO',
                          desc: 'Exponential recency decay & moving average cluster balance.'
                        },
                        {
                          id: 'SHADOW' as LogicEngine,
                          title: 'SHADOW (Under 2-3 Level Reversal Fix)',
                          desc: 'Anti-streak exhaustion detection. Clamps losing sequences to max 2-3 levels.'
                        },
                        {
                          id: 'XQUANTUM_RISE' as LogicEngine,
                          title: 'XQUANTUM RISE',
                          desc: 'Neural digital root parity & chaotic oscillator harmonic matrix.'
                        },
                        {
                          id: 'AUTO_APEX' as LogicEngine,
                          title: 'AUTO APEX (Hybrid Dynamic)',
                          desc: 'Auto-adapts between Titan Pro and Shadow Reversal barrier.'
                        }
                      ].map((eng) => (
                        <div
                          key={eng.id}
                          onClick={() => setLocalSettings({ ...localSettings, activeEngine: eng.id })}
                          className={`p-2.5 rounded-xl border cursor-pointer transition ${
                            localSettings.activeEngine === eng.id
                              ? 'border-green-400 bg-green-500/15'
                              : 'border-gray-800 bg-black/60 hover:border-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[11px] text-yellow-300">{eng.title}</span>
                            {localSettings.activeEngine === eng.id && (
                              <span className="text-[9px] font-bold text-green-400 bg-green-950/60 px-1.5 py-0.5 rounded border border-green-500/40">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">{eng.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Level 2-3 Clamp info */}
                  <div className="bg-black/60 border border-green-500/40 p-3 rounded-xl">
                    <div className="flex items-center gap-1.5 text-green-400 font-bold text-[10px] mb-1">
                      <Shield className="w-3.5 h-3.5" />
                      <span>2-3 LEVEL WINNING FIX PROTECTOR</span>
                    </div>
                    <p className="text-[9px] text-gray-300 leading-relaxed">
                      Enabled by default. The Shadow reversal engine actively monitors consecutive loss intervals and forces polarity inversion upon reaching Level 2 or 3 to ensure predictions resolve within 2-3 levels.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-3 border-t border-yellow-500/20 bg-black/80 flex items-center justify-between">
              <span className={`text-[10px] font-mono ${saveStatus ? 'text-green-400' : 'text-gray-500'}`}>
                {saveStatus ? 'CHANGES SAVED & SYNCED' : 'SETTINGS READY'}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 font-mono text-[10px]"
                >
                  CLOSE
                </button>
                <button
                  onClick={handleSaveAll}
                  className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-yellow-500 to-green-500 text-black font-mono font-bold text-[10px] hover:brightness-110 shadow transition"
                >
                  SAVE & APPLY
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
