import React, { useState } from 'react';
import { ExternalLink, RefreshCw, ShieldAlert } from 'lucide-react';

interface GameBackgroundProps {
  url: string;
}

export const GameBackground: React.FC<GameBackgroundProps> = ({ url }) => {
  const [iframeError, setIframeError] = useState(false);
  const [key, setKey] = useState(0);

  const reloadIframe = () => {
    setIframeError(false);
    setKey(prev => prev + 1);
  };

  return (
    <div id="game-frame-container" className="fixed inset-0 w-full h-full overflow-hidden bg-black z-0 select-none">
      {/* Background Cyber Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0, 255, 128, 0.1) 0%, transparent 60%), linear-gradient(rgba(0, 255, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 255, 0.05) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 40px 40px, 40px 40px'
        }}
      />

      {/* Main Game Iframe */}
      <iframe
        key={key}
        id="game-frame"
        src={url}
        title="Live Game"
        allow="autoplay; fullscreen; clipboard-write"
        className="w-full h-full border-0 absolute inset-0 z-1"
        onError={() => setIframeError(true)}
      />

      {/* Fallback & Quick Control Bar at top left */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="Open game directly in new tab if frame is restricted"
          className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold text-yellow-400 bg-black/80 border border-yellow-500/40 rounded-full hover:bg-yellow-950/50 transition-all backdrop-blur-sm shadow-md"
        >
          <ExternalLink className="w-3 h-3" />
          <span>OPEN GAME TAB</span>
        </a>
        <button
          onClick={reloadIframe}
          title="Reload Frame"
          className="p-1 text-cyan-400 bg-black/80 border border-cyan-500/40 rounded-full hover:bg-cyan-950/50 transition-all backdrop-blur-sm"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Optional fallback overlay if site refuses framing */}
      {iframeError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-5 text-center p-6">
          <ShieldAlert className="w-12 h-12 text-yellow-400 mb-3 animate-pulse" />
          <h2 className="text-cyan-400 font-mono text-base font-bold tracking-wider mb-2">
            FRAME ACCESS NOTICE
          </h2>
          <p className="text-gray-300 text-xs font-mono max-w-md mb-4 leading-relaxed">
            The target server restricts embedding directly inside third-party iframes via X-Frame-Options. You can play directly in full window or change the target URL in Admin Settings.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-gradient-to-r from-yellow-500 to-green-500 text-black font-bold font-mono text-xs rounded-full shadow-lg hover:brightness-110 uppercase tracking-wider"
          >
            Launch Official Game Server
          </a>
        </div>
      )}
    </div>
  );
};
