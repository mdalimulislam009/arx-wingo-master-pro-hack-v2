import React, { useState, useRef, useEffect } from 'react';
import { Settings, Key, AlertCircle, Copy, ExternalLink, CheckCircle2, Power } from 'lucide-react';
import { PredictionResult, LogicEngine } from '../types';
import { sounds } from '../services/soundEffects';
import { validateKey } from '../services/firebase';

interface PredictorHUDProps {
  prediction: PredictionResult | null;
  countdown: number;
  syncPercent: number;
  isLoading: boolean;
  onExecute: () => void;
  onHide: () => void;
  onOpenAdmin: () => void;
  appName: string;
  logoUrl: string;
  logicEnabled: boolean;
  logicDisabledMessage: string;
  activeEngine: LogicEngine;
  currentLevel: number;
  lastResultStatus?: 'WIN' | 'PENDING' | 'LOSS';
  streakWins?: number;
  levelWinLabel?: string;
  onAdvanceTestLevel?: () => void;
  // Login directly inside predictor box
  isUnlocked: boolean;
  onUnlockSuccess: (label: string) => void;
  telegramUrl: string;
}

export const PredictorHUD: React.FC<PredictorHUDProps> = ({
  prediction,
  countdown,
  syncPercent,
  isLoading,
  onExecute,
  onHide,
  onOpenAdmin,
  appName,
  logoUrl,
  logicEnabled,
  logicDisabledMessage,
  currentLevel,
  lastResultStatus = 'PENDING',
  levelWinLabel,
  onAdvanceTestLevel,
  isUnlocked,
  onUnlockSuccess,
  telegramUrl
}) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0
  });
  const hudRef = useRef<HTMLDivElement>(null);

  // VIP Key Login State (Integrated directly in Predictor box)
  const [inputKey, setInputKey] = useState('');
  const [authStatus, setAuthStatus] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [authError, setAuthError] = useState(false);

  // 3D Animation Shuffling Number during loading
  const [shufflingNum, setShufflingNum] = useState<number>(7);
  const [loadingStepText, setLoadingStepText] = useState<string>('3D SCANNING...');
  const [dynamicSync, setDynamicSync] = useState<number>(syncPercent);

  // Initialize centered on screen
  useEffect(() => {
    if (typeof window !== 'undefined' && position === null) {
      const defaultX = Math.max(10, Math.floor((window.innerWidth - 300) / 2));
      const defaultY = Math.max(25, Math.floor((window.innerHeight - 420) / 2));
      setPosition({ x: defaultX, y: defaultY });
    }
  }, [position]);

  // Premium 3D Loading Animation Shuffling Effect
  useEffect(() => {
    if (!isLoading) {
      setDynamicSync(syncPercent);
      return;
    }

    const steps = ['QUANTUM SCAN', 'NEURAL MATRIX', 'APEX LEVEL FIX', 'LOCKING SIGNAL'];
    let stepIdx = 0;

    // Rapidly shuffle digits 0..9 and update holographic status text
    const interval = setInterval(() => {
      setShufflingNum(Math.floor(Math.random() * 10));
      stepIdx = (stepIdx + 1) % steps.length;
      setLoadingStepText(steps[stepIdx]);
      setDynamicSync(Math.floor(88 + Math.random() * 11));
    }, 110);

    return () => clearInterval(interval);
  }, [isLoading, syncPercent]);

  // Pointer drag handling
  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) {
      return;
    }

    isDraggingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);

    const currentX = position ? position.x : 0;
    const currentY = position ? position.y : 0;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: currentX,
      initialY: currentY
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    const newX = Math.max(0, Math.min(window.innerWidth - 300, dragStartRef.current.initialX + deltaX));
    const newY = Math.max(0, Math.min(window.innerHeight - 450, dragStartRef.current.initialY + deltaY));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      (e.target as Element).releasePointerCapture?.(e.pointerId);
    }
  };

  // Handle VIP key verification right inside predictor box
  const handleVerifyKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = inputKey.trim();
    if (!cleanKey) {
      setAuthError(true);
      setAuthStatus('PLEASE ENTER VIP KEY');
      sounds.playError();
      return;
    }

    setIsVerifying(true);
    setAuthError(false);
    setAuthStatus('VERIFYING VIP KEY...');
    sounds.playScan();

    try {
      const res = await validateKey(cleanKey);
      if (res.valid) {
        setAuthError(false);
        setAuthStatus('VIP KEY VERIFIED! UNLOCKING...');
        sounds.playSuccess();
        setTimeout(() => {
          onUnlockSuccess(res.keyInfo?.label || 'VIP Member');
        }, 500);
      } else {
        setAuthError(true);
        setAuthStatus(res.message || 'INVALID VIP KEY');
        sounds.playError();
      }
    } catch {
      setAuthError(true);
      setAuthStatus('NETWORK TIMEOUT');
      sounds.playError();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleQuickPaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputKey(text.trim());
      }
    } catch {
      // fallback
    }
  };

  const handlePasteMasterKey = () => {
    setInputKey('ARX-VIP-2026-TITAN');
  };

  const num = isLoading ? shufflingNum : (prediction?.number ?? 4);
  const rawPeriod = prediction?.period || '1152';
  const periodDisplay = rawPeriod.length > 4 ? rawPeriod.slice(-4) : rawPeriod;

  // Ball color theme
  const isViolet = num === 0 || num === 5;
  const isGreen = !isViolet && num % 2 !== 0;
  const ballColor = isViolet ? '#a855f7' : isGreen ? '#22c55e' : '#ef4444';

  return (
    <div
      id="overlay-wrapper"
      ref={hudRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'fixed',
        left: position ? `${position.x}px` : '50%',
        top: position ? `${position.y}px` : '50%',
        transform: position ? 'none' : 'translate(-50%, -50%)',
        zIndex: 50,
        width: '300px', // Exact proportionate size matching user photo
        touchAction: 'none',
        userSelect: 'none',
        cursor: 'grab'
      }}
      className="select-none font-sans"
    >
      {/* 1. LEFT FLANKING CLAWS & FIRE PHOENIX WING */}
      <div className="absolute -left-12 top-24 pointer-events-none z-0">
        <div className="absolute right-0 top-0 flex flex-col gap-2 z-10">
          <div className="w-5 h-2 rounded-l-full bg-gradient-to-r from-amber-700 to-[#1c0801] shadow-[0_0_8px_#f97316] -rotate-12 border-l border-amber-400" />
          <div className="w-6 h-2.5 rounded-l-full bg-gradient-to-r from-orange-600 to-[#1c0801] shadow-[0_0_10px_#ea580c] -rotate-6 border-l border-amber-300" />
          <div className="w-5 h-2 rounded-l-full bg-gradient-to-r from-amber-700 to-[#1c0801] shadow-[0_0_8px_#f97316] rotate-12 border-l border-amber-400" />
        </div>

        <svg
          viewBox="0 0 100 120"
          className="w-20 h-28 text-orange-500 opacity-95"
          style={{
            filter: 'drop-shadow(0 0 14px #ff6600) drop-shadow(0 0 24px #ff9900)',
            transform: 'scaleX(-1) rotate(-8deg)'
          }}
        >
          <defs>
            <radialGradient id="wingFire" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff7ed" />
              <stop offset="25%" stopColor="#fde047" />
              <stop offset="55%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#7c2d12" />
            </radialGradient>
          </defs>
          <path
            d="M90,60 Q70,40 40,25 Q55,45 25,35 Q40,55 10,50 Q30,68 0,70 Q25,80 15,90 Q40,88 25,105 Q55,95 45,115 Q70,95 85,80 Z"
            fill="url(#wingFire)"
          />
          <path d="M75,55 Q50,40 30,30" stroke="#fef08a" strokeWidth="1.5" fill="none" />
          <path d="M70,65 Q45,55 20,50" stroke="#fdba74" strokeWidth="1.5" fill="none" />
          <path d="M65,75 Q40,70 15,75" stroke="#f97316" strokeWidth="1.5" fill="none" />
        </svg>
      </div>

      {/* 2. RIGHT FLANKING CLAWS & FIRE PHOENIX WING */}
      <div className="absolute -right-12 top-24 pointer-events-none z-0">
        <div className="absolute left-0 top-0 flex flex-col gap-2 z-10">
          <div className="w-5 h-2 rounded-r-full bg-gradient-to-l from-amber-700 to-[#1c0801] shadow-[0_0_8px_#f97316] rotate-12 border-r border-amber-400" />
          <div className="w-6 h-2.5 rounded-r-full bg-gradient-to-l from-orange-600 to-[#1c0801] shadow-[0_0_10px_#ea580c] rotate-6 border-r border-amber-300" />
          <div className="w-5 h-2 rounded-r-full bg-gradient-to-l from-amber-700 to-[#1c0801] shadow-[0_0_8px_#f97316] -rotate-12 border-r border-amber-400" />
        </div>

        <svg
          viewBox="0 0 100 120"
          className="w-20 h-28 text-orange-500 opacity-95"
          style={{
            filter: 'drop-shadow(0 0 14px #ff6600) drop-shadow(0 0 24px #ff9900)',
            transform: 'rotate(-8deg)'
          }}
        >
          <path
            d="M90,60 Q70,40 40,25 Q55,45 25,35 Q40,55 10,50 Q30,68 0,70 Q25,80 15,90 Q40,88 25,105 Q55,95 45,115 Q70,95 85,80 Z"
            fill="url(#wingFire)"
          />
          <path d="M75,55 Q50,40 30,30" stroke="#fef08a" strokeWidth="1.5" fill="none" />
          <path d="M70,65 Q45,55 20,50" stroke="#fdba74" strokeWidth="1.5" fill="none" />
          <path d="M65,75 Q40,70 15,75" stroke="#f97316" strokeWidth="1.5" fill="none" />
        </svg>
      </div>

      {/* Floating Sparkles & Embers */}
      <div className="absolute -top-3 left-6 w-1.5 h-1.5 rounded-full bg-yellow-300 animate-ping opacity-75 pointer-events-none" />
      <div className="absolute top-10 right-4 w-1 h-1 rounded-full bg-orange-400 animate-pulse opacity-80 pointer-events-none" />
      <div className="absolute -bottom-2 left-10 w-2 h-2 rounded-full bg-amber-400 animate-pulse opacity-70 pointer-events-none" />
      <div className="absolute bottom-16 -right-2 w-1.5 h-1.5 rounded-full bg-yellow-200 animate-ping opacity-60 pointer-events-none" />

      {/* 3. MAIN METALLIC BRONZE/ORANGE HUD CONTAINER */}
      <div
        id="overlay-box"
        className="relative rounded-[26px] p-3.5 border-2 border-[#b45309]/90 overflow-hidden shadow-2xl z-10"
        style={{
          background: 'radial-gradient(ellipse at 50% 10%, #6b2d08 0%, #3a1504 42%, #180701 100%)',
          boxShadow: '0 0 35px rgba(234, 88, 12, 0.45), inset 0 2px 5px rgba(254, 215, 170, 0.35), 0 20px 40px rgba(0,0,0,0.95)'
        }}
      >
        {/* Subtle top edge metallic highlight */}
        <div className="absolute inset-x-4 top-0.5 h-[1px] bg-gradient-to-r from-transparent via-amber-200/50 to-transparent pointer-events-none" />

        {/* 4. TOP TITLE PILL: Admin-Controlled Name & Photo Logo */}
        <div className="flex items-center justify-center mb-2 relative">
          <div
            className="px-4 py-1.5 rounded-full border border-amber-500/60 flex items-center justify-center gap-2 shadow-md relative max-w-[240px]"
            style={{
              background: 'linear-gradient(180deg, #78350f 0%, #451a03 100%)',
              boxShadow: 'inset 0 1px 2px rgba(254, 215, 170, 0.3), 0 2px 8px rgba(0,0,0,0.6)'
            }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                referrerPolicy="no-referrer"
                className="w-4 h-4 rounded-full object-cover border border-amber-400/80 shadow-[0_0_5px_#ea580c] flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shadow-[0_0_6px_#ea580c] animate-pulse flex-shrink-0" />
            )}
            <span
              className="font-mono font-black text-xs tracking-wider text-amber-200 uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] truncate"
              style={{ letterSpacing: '0.12em' }}
            >
              {appName || 'ORANGE APEX UI'}
            </span>
          </div>

          {/* Discreet Admin Settings button on top-right */}
          <button
            onClick={onOpenAdmin}
            title="Admin Portal (abirta009)"
            className="absolute right-0 p-1 text-amber-500/60 hover:text-amber-300 transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 5. SUB-HEADER PILL CHIPS */}
        <div className="flex items-center justify-between gap-1 mb-2 px-1">
          <div
            className="flex-1 py-0.5 px-1.5 rounded-full border border-amber-600/50 text-center font-mono font-bold text-[8px] text-amber-300"
            style={{
              background: 'linear-gradient(180deg, #381604 0%, #1c0801 100%)',
              boxShadow: 'inset 0 1px 1px rgba(254, 215, 170, 0.15)'
            }}
          >
            SYS: <span className="text-amber-100 font-black">{!logicEnabled ? 'PAUSED' : isUnlocked ? 'LOCKED' : 'VIP AUTH'}</span>
          </div>

          <div
            className="flex-1 py-0.5 px-1.5 rounded-full border border-amber-600/50 text-center font-mono font-bold text-[8px] text-amber-300"
            style={{
              background: 'linear-gradient(180deg, #381604 0%, #1c0801 100%)',
              boxShadow: 'inset 0 1px 1px rgba(254, 215, 170, 0.15)'
            }}
          >
            CORE: <span className="text-amber-100 font-black">{!logicEnabled ? 'OFFLINE' : isUnlocked ? 'SYNC' : 'GATEWAY'}</span>
          </div>

          <div
            className="flex-1 py-0.5 px-1.5 rounded-full border border-amber-600/50 text-center font-mono font-bold text-[8px] text-amber-300"
            style={{
              background: 'linear-gradient(180deg, #381604 0%, #1c0801 100%)',
              boxShadow: 'inset 0 1px 1px rgba(254, 215, 170, 0.15)'
            }}
          >
            PING: <span className="text-amber-100 font-black">{!logicEnabled ? '0MS' : '19MS'}</span>
          </div>
        </div>

        {/* ============================================================ */}
        {/* CASE A: USER NOT LOGGED IN -> RENDER LOGIN INSIDE PREDICTOR BOX */}
        {/* ============================================================ */}
        {!isUnlocked ? (
          <div
            className="relative rounded-2xl p-3 mb-2.5 border border-amber-500/80 overflow-hidden"
            style={{
              background: 'radial-gradient(circle at 50% 50%, #200b02 0%, #0d0400 100%)',
              boxShadow: 'inset 0 0 16px rgba(0,0,0,0.9), 0 0 14px rgba(245, 158, 11, 0.2)'
            }}
          >
            {/* Corner Brackets */}
            <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-400 pointer-events-none" />
            <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-400 pointer-events-none" />
            <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-400 pointer-events-none" />
            <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-400 pointer-events-none" />

            <div className="flex flex-col items-center text-center">
              {/* Glowing VIP Badge */}
              <div className="w-10 h-10 rounded-full border-2 border-amber-400 flex items-center justify-center mb-1.5 shadow-[0_0_15px_#f59e0b] bg-amber-950/80">
                <Key className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>

              <h3 className="font-mono font-black text-xs text-amber-300 tracking-wider uppercase mb-0.5">
                VIP ACCESS REQUIRED
              </h3>
              <p className="font-mono text-[9px] text-amber-400/80 mb-2.5">
                Enter your licensed key to activate 3D prediction
              </p>

              {/* VIP Key Input Box */}
              <div className="w-full relative mb-2">
                <input
                  type="text"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="ENTER VIP KEY..."
                  className="w-full py-1.5 pl-3 pr-16 bg-black/90 border border-amber-500/70 rounded-xl font-mono text-[10px] text-amber-200 placeholder-amber-700 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
                />
                <button
                  type="button"
                  onClick={handleQuickPaste}
                  className="absolute right-1.5 top-1.5 px-2 py-0.5 bg-amber-900/60 hover:bg-amber-800 border border-amber-600/60 rounded text-[8px] font-mono font-bold text-amber-300 flex items-center gap-1 cursor-pointer transition"
                >
                  <Copy className="w-2.5 h-2.5" />
                  <span>PASTE</span>
                </button>
              </div>

              {/* Status or Error Notice */}
              {authStatus && (
                <div
                  className={`w-full py-1 px-2 rounded mb-2 font-mono text-[8px] flex items-center justify-center gap-1 border ${
                    authError
                      ? 'bg-red-950/80 border-red-500/80 text-red-300'
                      : 'bg-green-950/80 border-green-500/80 text-green-300'
                  }`}
                >
                  {authError ? <AlertCircle className="w-2.5 h-2.5" /> : <CheckCircle2 className="w-2.5 h-2.5" />}
                  <span className="truncate">{authStatus}</span>
                </div>
              )}

              {/* Quick Master Key Tester Button */}
              <button
                type="button"
                onClick={handlePasteMasterKey}
                className="text-[8px] font-mono text-amber-400/70 hover:text-amber-200 underline mb-2 transition cursor-pointer"
              >
                Use Pre-Seeded Key: ARX-VIP-2026-TITAN
              </button>

              {/* UNLOCK BUTTON (Glossy 3D Orange Embossed) */}
              <button
                id="unlock-btn"
                onClick={() => handleVerifyKey()}
                disabled={isVerifying}
                className="w-full py-2 px-3 rounded-full font-mono font-black text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(180deg, #f97316 0%, #ea580c 45%, #9a3412 100%)',
                  border: '1.5px solid #fef08a',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(234, 88, 12, 0.6), inset 0 2px 3px rgba(255, 255, 255, 0.6)',
                  textShadow: '0 1px 2px rgba(0,0,0,0.6)'
                }}
              >
                {isVerifying ? (
                  <span className="animate-spin">⚡</span>
                ) : (
                  <span>▶</span>
                )}
                <span>{isVerifying ? 'VERIFYING...' : 'UNLOCK VIP PREDICTOR'}</span>
              </button>

              {/* Telegram Key Provider Link */}
              <div className="flex items-center justify-between w-full mt-2 pt-1.5 border-t border-amber-900/60 font-mono text-[8px]">
                <span className="text-amber-400/70">NO KEY?</span>
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-300 hover:text-amber-100 flex items-center gap-1 font-bold underline transition"
                >
                  <span>GET VIP KEY (TELEGRAM)</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* CASE B: USER UNLOCKED -> RENDER 3D PREDICTOR HUD DISPLAY */
          /* ============================================================ */
          <>
            {/* 6. INNER SCREEN FRAME WITH NEON CORNER BRACKETS */}
            <div
              className="relative rounded-2xl p-2.5 mb-2.5 border border-amber-500/80 overflow-hidden"
              style={{
                background: 'radial-gradient(circle at 50% 50%, #200b02 0%, #0d0400 100%)',
                boxShadow: 'inset 0 0 16px rgba(0,0,0,0.9), 0 0 14px rgba(245, 158, 11, 0.2)'
              }}
            >
              {/* Neon Corner Brackets [ ... ] */}
              <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-amber-400 pointer-events-none" />
              <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-amber-400 pointer-events-none" />
              <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-amber-400 pointer-events-none" />
              <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-amber-400 pointer-events-none" />

              {/* Top-Right Label inside frame */}
              <div className="flex items-center justify-end gap-1 mb-1 pr-1 font-mono text-[8px] font-bold text-amber-400">
                <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                  !logicEnabled 
                    ? 'bg-red-500 animate-pulse shadow-[0_0_6px_#ef4444]'
                    : isLoading 
                    ? 'bg-yellow-300 animate-ping' 
                    : 'bg-amber-400 animate-pulse shadow-[0_0_6px_#f59e0b]'
                }`} />
                <span className="tracking-widest">
                  {!logicEnabled ? 'LOGIC PAUSED' : isLoading ? 'CALCULATING 3D...' : 'SIGNAL LOCKED'}
                </span>
              </div>

              {/* CHECK IF ADMIN HAS PAUSED LOGIC FOR ALL USERS */}
              {!logicEnabled ? (
                <div className="py-5 px-2 flex flex-col items-center justify-center text-center">
                  <div className="w-10 h-10 rounded-full border border-red-500 bg-red-950/80 flex items-center justify-center mb-2 shadow-[0_0_15px_#ef4444]">
                    <Power className="w-5 h-5 text-red-400 animate-pulse" />
                  </div>
                  <div className="font-mono text-[10px] font-black text-red-300 uppercase tracking-wider mb-1">
                    {logicDisabledMessage || 'LOGIC PAUSED BY ADMIN'}
                  </div>
                  <p className="font-mono text-[8px] text-amber-400/80 max-w-[210px] leading-relaxed">
                    Live prediction engine temporarily paused by server administrator. Will automatically resume upon reactivation.
                  </p>
                </div>
              ) : (
                /* INNER DISPLAY: LEFT (3D LOTTERY BALL OR 3D LOADING GYROSCOPE) & RIGHT (3D RESULT BADGE) */
                <div className="flex items-center justify-between gap-2 px-1 py-1">
                  {/* LEFT: 3D LOTTERY BALL IN HOLOGRAPHIC 3D GYRO RETICLE */}
                  <div className="relative flex items-center justify-center w-24 h-24 perspective-600">
                    {/* Hexagonal wireframe reticle background */}
                    <div
                      className="absolute inset-0 rounded-full border border-amber-500/40 pointer-events-none"
                      style={{
                        background: 'radial-gradient(circle, rgba(234, 88, 12, 0.15) 0%, transparent 70%)'
                      }}
                    />

                    {/* PREMIUM 3D LOADING GYROSCOPE RINGS */}
                    {isLoading ? (
                      <div className="absolute inset-0 preserve-3d flex items-center justify-center pointer-events-none">
                        {/* Gyro Ring X */}
                        <div className="absolute w-22 h-22 rounded-full border-2 border-amber-400/80 shadow-[0_0_10px_#f59e0b] animate-gyro-x" />
                        {/* Gyro Ring Y */}
                        <div className="absolute w-20 h-20 rounded-full border-2 border-yellow-300/80 shadow-[0_0_12px_#eab308] animate-gyro-y" />
                        {/* Gyro Ring Z */}
                        <div className="absolute w-24 h-24 rounded-full border border-dashed border-orange-500 shadow-[0_0_8px_#f97316] animate-gyro-z" />

                        {/* Laser Scanning Beam sweeping up and down */}
                        <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-yellow-200 to-transparent shadow-[0_0_10px_#fef08a] animate-laser pointer-events-none" />
                      </div>
                    ) : (
                      <>
                        {/* Idle Orbit Ring around ball */}
                        <div
                          className="absolute inset-1 border border-dashed border-amber-400/50 rounded-full pointer-events-none animate-spin"
                          style={{ animationDuration: '24s' }}
                        />
                        <div
                          className="absolute inset-0 border border-amber-400/70 rounded-full pointer-events-none"
                          style={{
                            transform: 'rotateX(65deg) rotateZ(20deg)',
                            boxShadow: '0 0 10px rgba(245, 158, 11, 0.5)'
                          }}
                        />
                      </>
                    )}

                    {/* Real 3D WinGo Lottery Ball (Tumbls in 3D during loading) */}
                    <div
                      className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
                        isLoading ? 'animate-ball-3d shadow-[0_0_25px_#f97316]' : 'hover:scale-105'
                      }`}
                      style={{
                        background: isLoading
                          ? 'radial-gradient(circle at 35% 30%, #ffffff 0%, #fef08a 25%, #f97316 65%, #431407 100%)'
                          : 'radial-gradient(circle at 35% 30%, #ffffff 0%, #fde047 18%, #ea580c 60%, #431407 100%)',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.8), inset 0 2px 6px rgba(255,255,255,0.7), 0 0 16px rgba(234, 88, 12, 0.5)'
                      }}
                    >
                      {/* Central circular number aperture */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-black font-mono text-xl"
                        style={{
                          background: 'radial-gradient(circle at 40% 35%, #ffffff 0%, #fee2e2 40%, #fecaca 100%)',
                          color: ballColor,
                          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(255,255,255,0.8)',
                          textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                        }}
                      >
                        <span>{num}</span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: 3D EMBOSSED "SMALL" / "BIG" PILL & DYNAMIC STATS */}
                  <div className="flex flex-col items-center flex-1 pr-1">
                    {/* 3D Embossed Pill Button */}
                    <div
                      id="result-box"
                      className={`w-full py-1.5 px-2 rounded-xl text-center font-black text-sm tracking-wider uppercase transition-all duration-300 cursor-default ${
                        isLoading ? 'animate-shimmer shadow-[0_0_15px_#f59e0b]' : ''
                      }`}
                      style={{
                        background: isLoading
                          ? 'linear-gradient(90deg, #b45309 0%, #f59e0b 50%, #b45309 100%)'
                          : 'linear-gradient(180deg, #d97706 0%, #b45309 45%, #78350f 100%)',
                        border: '1.5px solid #fef08a',
                        color: '#fffbeb',
                        boxShadow: '0 4px 10px rgba(0,0,0,0.6), inset 0 2px 3px rgba(255, 255, 255, 0.6), inset 0 -2px 3px rgba(0,0,0,0.4)',
                        textShadow: '0 1px 3px rgba(0, 0, 0, 0.8)'
                      }}
                    >
                      {isLoading ? (
                        <span className="text-[10px] tracking-widest text-yellow-100 font-mono animate-pulse">
                          {loadingStepText}
                        </span>
                      ) : (
                        prediction?.bs ?? 'SMALL'
                      )}
                    </div>

                    {/* SYNC —— 99% */}
                    <div className="flex items-center justify-between w-full mt-2 font-mono text-[9px] font-bold text-amber-300">
                      <span className="text-amber-400/90 tracking-wider">SYNC</span>
                      <span className="w-8 h-[2px] bg-amber-500/80 mx-1 rounded-full shadow-[0_0_4px_#f59e0b]" />
                      <span className="text-amber-200">{dynamicSync}%</span>
                    </div>

                    {/* MODE CORE / APEX OK */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 w-full mt-1 font-mono text-[8px] font-bold">
                      <span className="text-amber-400/80">MODE</span>
                      <span className="text-right text-amber-200">{isLoading ? '3D CALC' : 'CORE'}</span>
                      <span className="text-amber-400/80">APEX</span>
                      <span className="text-right text-amber-200">{isLoading ? 'SYNCING' : 'OK'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom centered inside frame: PERIOD: 1152 */}
              <div className="flex items-center justify-between px-1 mt-1 pt-1 border-t border-amber-900/60 font-mono text-[9px] font-black text-amber-300">
                <span className="text-amber-400 tracking-wider">PERIOD:</span>
                <span className="text-amber-100 tracking-widest">{periodDisplay}</span>
                <span className="text-[8px] text-amber-400/80 font-bold">
                  {!logicEnabled ? 'PAUSED' : `DRAW: ${countdown}s`}
                </span>
              </div>
            </div>

            {/* 7. STRICT 2-3 LEVEL FIX WINNING BAR */}
            {logicEnabled && (
              <div
                onClick={onAdvanceTestLevel}
                title="Click to test Level 1 ➔ Level 2 ➔ Level 3 (Guaranteed Win)"
                className={`flex items-center justify-between px-2.5 py-1 mb-2.5 rounded-lg border font-mono text-[8px] cursor-pointer transition-all ${
                  currentLevel === 1
                    ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                    : currentLevel === 2
                    ? 'bg-orange-950/80 border-orange-400 text-orange-200 shadow-[0_0_10px_rgba(249,115,22,0.4)]'
                    : 'bg-red-950/90 border-red-500 text-red-200 shadow-[0_0_14px_rgba(239,68,68,0.6)] animate-pulse'
                }`}
              >
                <div className="flex items-center gap-1 font-black">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      currentLevel === 1 ? 'bg-amber-400' : currentLevel === 2 ? 'bg-orange-400' : 'bg-red-400 animate-ping'
                    }`}
                  />
                  <span>
                    {currentLevel === 1 ? 'LEVEL 1' : currentLevel === 2 ? 'LEVEL 2 (FIX)' : 'LEVEL 3 (100% WIN FIX)'}
                  </span>
                </div>
                <div className="font-bold text-[7px] text-amber-200">
                  {levelWinLabel || (lastResultStatus === 'WIN' ? 'WINNER RECOVERED' : '2-3 LVL GUARANTEE')}
                </div>
              </div>
            )}
          </>
        )}

        {/* 8. BOTTOM ACTION BUTTONS: "▶ NEXT" & "X CLOSE" */}
        <div className="flex items-center justify-between gap-3 font-mono">
          {/* ▶ NEXT BUTTON (Only active when unlocked and logicEnabled is true) */}
          {isUnlocked ? (
            <button
              id="execute-btn"
              onClick={() => {
                if (!logicEnabled) {
                  sounds.playError();
                  return;
                }
                sounds.playClick();
                onExecute();
              }}
              disabled={isLoading || !logicEnabled}
              className={`flex-1 py-2 px-3 rounded-full font-black text-[11px] tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 shadow-lg active:scale-95 ${
                !logicEnabled
                  ? 'bg-red-950/80 border border-red-500/60 text-red-300 cursor-not-allowed opacity-75'
                  : 'cursor-pointer'
              }`}
              style={
                logicEnabled
                  ? {
                      background: 'linear-gradient(180deg, #f97316 0%, #ea580c 45%, #9a3412 100%)',
                      border: '1.5px solid #fef08a',
                      color: '#ffffff',
                      boxShadow: '0 4px 14px rgba(234, 88, 12, 0.6), inset 0 2px 3px rgba(255, 255, 255, 0.6), inset 0 -2px 3px rgba(0,0,0,0.4)',
                      textShadow: '0 1px 2px rgba(0,0,0,0.6)'
                    }
                  : {}
              }
            >
              <span>{!logicEnabled ? '⏸' : isLoading ? '⚡' : '▶'}</span>
              <span>{!logicEnabled ? 'LOGIC PAUSED' : isLoading ? '3D LOADING' : 'NEXT'}</span>
            </button>
          ) : (
            <div className="flex-1 py-1.5 text-center font-mono text-[9px] text-amber-400/80 border border-amber-900/60 rounded-full bg-black/40">
              FREE LIVE GAME VIEW
            </div>
          )}

          {/* X CLOSE BUTTON (Dark Bronze with Amber Border) */}
          <button
            id="hide-btn"
            onClick={() => {
              sounds.playClick();
              onHide();
            }}
            className="flex-1 py-2 px-3 rounded-full font-black text-[11px] tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
            style={{
              background: 'linear-gradient(180deg, #381604 0%, #1c0801 100%)',
              border: '1.5px solid #b45309',
              color: '#ffedd5',
              boxShadow: '0 4px 10px rgba(0,0,0,0.6), inset 0 1px 2px rgba(254, 215, 170, 0.2)'
            }}
          >
            <span>X</span>
            <span>CLOSE</span>
          </button>
        </div>

        {/* Real-time sync footer */}
        <div className="flex items-center justify-between px-2 mt-2 pt-1 border-t border-amber-900/40 font-mono text-[7px] text-amber-400/80">
          <span>
            {!logicEnabled ? 'LOGIC: PAUSED BY ADMIN' : isUnlocked ? `DRAW IN: ${countdown}s` : 'GAME ACTIVE & FREE'}
          </span>
          <span>ARX VIP 2-3 LVL FIX</span>
        </div>
      </div>
    </div>
  );
};
