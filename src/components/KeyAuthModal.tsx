import React, { useState } from 'react';
import { Bot, Key, ShieldCheck, AlertCircle, ExternalLink, Lock, Settings } from 'lucide-react';
import { validateKey } from '../services/firebase';
import { sounds } from '../services/soundEffects';

interface KeyAuthModalProps {
  isOpen: boolean;
  onUnlocked: (keyLabel: string) => void;
  telegramUrl: string;
  onOpenAdmin: () => void;
  logoUrl: string;
}

export const KeyAuthModal: React.FC<KeyAuthModalProps> = ({
  isOpen,
  onUnlocked,
  telegramUrl,
  onOpenAdmin,
  logoUrl
}) => {
  const [inputKey, setInputKey] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputKey.trim()) {
      setError(true);
      setStatusMsg('ENTER VIP KEY TO PROCEED');
      sounds.playError();
      return;
    }

    setLoading(true);
    setStatusMsg('VERIFYING WITH QUANTUM DATABASE...');
    sounds.playScan();

    try {
      const res = await validateKey(inputKey);
      if (res.valid) {
        setError(false);
        setStatusMsg('AUTHENTICATION GRANTED. UNLOCKING HUD...');
        sounds.playSuccess();
        setTimeout(() => {
          onUnlocked(res.keyInfo?.label || 'VIP Member');
        }, 600);
      } else {
        setError(true);
        setStatusMsg(res.message);
        sounds.playError();
      }
    } catch {
      setError(true);
      setStatusMsg('VERIFICATION NETWORK TIMEOUT');
      sounds.playError();
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputKey(text.trim());
      }
    } catch {
      // clipboard access denied
    }
  };

  return (
    <div id="key-auth-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div 
        className="relative w-full max-w-[340px] rounded-2xl p-5 border border-cyan-400/60 shadow-[0_0_50px_rgba(0,255,255,0.25)] text-center overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(8, 20, 16, 0.98), rgba(2, 8, 5, 0.99))',
          boxShadow: '0 0 35px rgba(0, 255, 255, 0.3), inset 0 0 25px rgba(0, 255, 255, 0.1)'
        }}
      >
        {/* Top Gold Accent Rim */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-cyan-400 to-green-400" />

        {/* AI Assistant Avatar Header */}
        <div className="flex flex-col items-center mb-3">
          <div className="relative mb-2">
            <div className="w-16 h-16 rounded-full border-2 border-yellow-400 p-0.5 shadow-[0_0_20px_#ffd700] bg-black">
              <img
                src={logoUrl}
                alt="ARX AI Assistant"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border border-black shadow">
              <Bot className="w-3.5 h-3.5 text-black" />
            </div>
          </div>

          <h2 className="text-yellow-400 font-black text-xs tracking-widest uppercase font-mono shadow-sm">
            ARX DRAGON AI ASSISTANT
          </h2>
          <div className="flex items-center gap-1 mt-1 text-[8px] text-cyan-300 font-mono tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
            <span>NEURAL ENCRYPTION: ACTIVE</span>
          </div>
        </div>

        {/* AI Message Bubble */}
        <div className="bg-black/60 border border-cyan-500/30 rounded-xl p-3 mb-4 text-left font-mono">
          <p className="text-gray-300 text-[10px] leading-relaxed">
            <span className="text-green-400 font-bold">AI PROTOCOL:</span> Welcome to ARX Dragon Quantum HUD. Access is protected by VIP token encryption. Enter your authorized VIP Key below to decrypt 2-3 level precision signals.
          </p>
        </div>

        {/* Key Input Form */}
        <form onSubmit={handleVerify} className="space-y-3">
          <div className="relative">
            <input
              id="vip-key-input"
              type="text"
              value={inputKey}
              onChange={(e) => {
                setInputKey(e.target.value.toUpperCase());
                setError(false);
                setStatusMsg('');
              }}
              placeholder="ENTER VIP ACCESS KEY..."
              className="w-full bg-black/90 border border-cyan-400 rounded-xl px-9 py-2.5 text-xs text-yellow-300 font-mono tracking-wider placeholder-gray-500 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all text-center shadow-inner"
              autoFocus
            />
            <Key className="w-4 h-4 text-cyan-400 absolute left-3 top-3 pointer-events-none" />
            <button
              type="button"
              onClick={handleQuickPaste}
              title="Paste from clipboard"
              className="absolute right-2.5 top-2.5 text-[9px] font-mono text-cyan-400 hover:text-yellow-400 px-1.5 py-0.5 bg-gray-900 border border-cyan-500/40 rounded transition"
            >
              PASTE
            </button>
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div className={`flex items-center justify-center gap-1 text-[10px] font-mono font-bold ${error ? 'text-red-400' : 'text-green-400'} animate-pulse`}>
              {error ? <AlertCircle className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Unlock Button */}
          <button
            id="auth-unlock-btn"
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl font-mono text-xs font-black tracking-wider uppercase transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer bg-gradient-to-r from-yellow-400 via-green-400 to-cyan-400 text-black hover:brightness-110 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <span className="animate-pulse">DECRYPTING KEY...</span>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>UNLOCK VIP PREDICTOR</span>
              </>
            )}
          </button>
        </form>

        {/* Telegram Link */}
        <div className="mt-3 pt-3 border-t border-cyan-900/40 flex flex-col items-center gap-2">
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[9px] font-mono font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 transition-colors"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            <span>NEED A KEY? GET KEY ON TELEGRAM</span>
          </a>

          {/* Admin access trigger */}
          <button
            type="button"
            onClick={onOpenAdmin}
            className="text-[8px] font-mono text-gray-500 hover:text-cyan-400 flex items-center gap-1 mt-1 transition-colors"
          >
            <Settings className="w-2.5 h-2.5" />
            <span>ADMINISTRATOR PORTAL (SECURE)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
