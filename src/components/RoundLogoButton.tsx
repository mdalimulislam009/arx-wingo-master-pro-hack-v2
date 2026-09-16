import React from 'react';

interface RoundLogoButtonProps {
  onClick: () => void;
  logoUrl: string;
}

export const RoundLogoButton: React.FC<RoundLogoButtonProps> = ({ onClick, logoUrl }) => {
  return (
    <button
      id="show-btn-round"
      onClick={onClick}
      title="Open ARX Dragon AI HUD"
      className="fixed bottom-6 right-6 z-50 group flex items-center justify-center focus:outline-none transition-all duration-300 hover:scale-110 active:scale-95"
      style={{
        width: '56px',
        height: '56px',
        borderRadius: '50%',
        padding: '0',
        background: 'radial-gradient(circle, rgba(10, 25, 18, 0.95) 0%, rgba(0, 5, 2, 0.98) 100%)',
        border: '2px solid #ffd700',
        boxShadow: '0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(0, 255, 255, 0.4), inset 0 0 10px rgba(255, 215, 0, 0.4)'
      }}
    >
      {/* Animated rotating outer glow ring */}
      <div 
        className="absolute -inset-1 rounded-full border border-dashed border-cyan-400 opacity-70 animate-spin pointer-events-none"
        style={{ animationDuration: '8s' }}
      />
      
      {/* Outer Pulse Wave */}
      <div 
        className="absolute -inset-2 rounded-full border border-yellow-400/40 animate-ping pointer-events-none opacity-30" 
        style={{ animationDuration: '3s' }}
      />

      {/* Round Logo Image */}
      <img
        src={logoUrl}
        alt="ARX Logo"
        className="w-11 h-11 rounded-full object-cover shadow-inner pointer-events-none border border-yellow-300/60"
      />
    </button>
  );
};
