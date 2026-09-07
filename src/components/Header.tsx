import React, { useState, useRef, useEffect } from 'react';
import { 
  Maximize2,
  Compass,
  Atom,
  Wind,
  RotateCw,
  Magnet,
  Waves,
  Sparkles,
  BookOpen,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LabId } from '../types';
import { useAuth } from '../hooks/useSupabase';
import { Database, User } from 'lucide-react';

interface HeaderProps {
  activeLab: LabId;
  onSelectLab: (id: LabId) => void;
  onOpenFormulas: () => void;
  onOpenAuth: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeLab,
  onSelectLab,
  onOpenFormulas,
  onOpenAuth,
}) => {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showGuidePopup, setShowGuidePopup] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  const labs2D: { id: LabId; label: string; num: string; icon: React.ReactNode; tag: string }[] = [
    { id: 'ballistics', num: '01', label: 'Ballistics', icon: <Compass className="w-4 h-4" />, tag: 'RK4' },
    { id: 'optics', num: '02', label: 'Ray Optics', icon: <Atom className="w-4 h-4" />, tag: 'Gauss' },
    { id: 'airfoil', num: '03', label: 'Airfoil Stall', icon: <Wind className="w-4 h-4" />, tag: 'Vortex' },
    { id: 'chaos', num: '06', label: 'Chaos Pendulum', icon: <Waves className="w-4 h-4" />, tag: 'Lyapunov' },
    { id: 'orbital', num: '07', label: 'Orbital Gravity', icon: <Sparkles className="w-4 h-4" />, tag: 'N-Body' },
  ];

  const labs3D: { id: LabId; label: string; num: string; icon: React.ReactNode; tag: string }[] = [
    { id: 'dzhanibekov', num: '04', label: 'Dzhanibekov', icon: <RotateCw className="w-4 h-4" />, tag: '3D Euler' },
    { id: 'lorentz', num: '05', label: 'Lorentz Trap', icon: <Magnet className="w-4 h-4" />, tag: '3D Boris' },
  ];

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderLabItem = (lab: any) => {
    const isActive = activeLab === lab.id;
    return (
      <button
        key={lab.id}
        onClick={() => {
          onSelectLab(lab.id);
          setIsMenuOpen(false);
        }}
        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
          isActive 
            ? 'bg-[#ffffff] text-[#05070a] shadow-[0_0_12px_rgba(255,255,255,0.35)]'
            : 'bg-[#111622] text-[#a0aec0] hover:bg-[#1a1f2e] hover:text-white border border-transparent hover:border-[#ffffff]/20'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className={isActive ? 'text-[#05070a]' : 'text-[#ffffff]'}>{lab.icon}</span>
          <span className={`font-mono text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>
            <span className="opacity-50 mr-2">{lab.num}</span>
            {lab.label}
          </span>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${
          isActive ? 'bg-[#05070a]/20 text-[#05070a]' : 'bg-[#1a1f2e] text-[#a0aec0]'
        }`}>
          {lab.tag}
        </span>
      </button>
    );
  };

  return (
    <header className="border-b border-[#1a1f2e] bg-[#07090e]/95 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-[1720px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        
        {/* Brand & Aesthetic Status Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#ffffff]/10 border border-[#ffffff]/40 flex items-center justify-center shadow-[0_0_12px_rgba(255,255,255,0.25)]">
            <Atom className="w-4 h-4 text-[#ffffff]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-extrabold tracking-widest text-xs uppercase font-mono">
                EULER <span className="text-white">3D</span>
              </span>
              <span className="text-[#ffffff] font-mono text-[9px] px-1.5 py-0.2 rounded bg-[#ffffff]/10 border border-[#ffffff]/30 uppercase tracking-widest hidden sm:inline-block">
                PRO LAB
              </span>
            </div>
          </div>
        </div>

        {/* Center: Current Active Lab Name */}
        {(() => {
          const currentLab = labs2D.find(l => l.id === activeLab) || labs3D.find(l => l.id === activeLab);
          if (!currentLab) return null;
          return (
            <motion.div 
              key={currentLab.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#111622] rounded-xl border border-[#1a1f2e]"
            >
              <span className="text-[#ffffff]">{currentLab.icon}</span>
              <span className="font-mono text-xs font-bold tracking-wider text-white uppercase">
                {currentLab.label}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1a1f2e] text-[#a0aec0] font-mono ml-2">
                {currentLab.tag}
              </span>
            </motion.div>
          );
        })()}

        {/* Right side utilities */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Cloud Auth / Presets button */}
          <button
            id="header-supabase-btn"
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium text-white bg-[#111622] hover:bg-[#1a1f2e] border border-[#1a1f2e] hover:border-emerald-500/40 transition-all group"
            title={user ? `Signed in as ${user.email}` : 'Sign In / Supabase Cloud Auth'}
          >
            {user ? (
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ) : (
              <Database className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            )}
            <span className="text-[11px] tracking-wider uppercase font-semibold">
              {user ? (user.email?.split('@')[0] || 'Cloud') : 'Cloud'}
            </span>
          </button>

          <button
            id="header-open-formulas-btn"
            onClick={onOpenFormulas}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-[#ffffff] bg-[#111622] hover:bg-[#1a1f2e] border border-[#1a1f2e] hover:border-[#ffffff]/40 transition-all"
            title="Open Formula Sheets & Equations"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#ffffff]" />
            <span className="hidden sm:inline text-[11px] tracking-wider uppercase">Theory</span>
          </button>

          <button
            id="toggle-fullscreen-btn"
            onClick={handleFullscreen}
            className="p-1.5 text-[#a0aec0] hover:text-white rounded-lg hover:bg-[#111622] border border-[#1a1f2e] transition-colors"
            title="Toggle fullscreen (F11)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              id="header-menu-btn"
              onClick={() => {
                setIsMenuOpen(!isMenuOpen);
                setShowGuidePopup(false);
              }}
              className="p-1.5 ml-2 text-[#ffffff] hover:text-[#05070a] rounded-lg hover:bg-[#ffffff] border border-[#ffffff]/40 transition-all flex items-center shadow-[0_0_10px_rgba(255,255,255,0.2)] hover:shadow-[0_0_15px_rgba(255,255,255,0.5)] relative"
              title="Toggle Simulations Menu"
            >
              {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              {showGuidePopup && !isMenuOpen && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                </span>
              )}
            </button>

            {/* Basic Guide Popup pointing directly at the menu button */}
            <AnimatePresence>
              {showGuidePopup && !isMenuOpen && (
                <motion.div
                  id="simulation-guide-popup"
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute top-full right-0 mt-3 w-72 sm:w-80 bg-[#0c1017] border border-[#232938] rounded-xl shadow-2xl p-4 z-50 pointer-events-auto"
                >
                  {/* Upward pointing arrow towards the hamburger button */}
                  <div className="absolute -top-1.5 right-3.5 w-3 h-3 bg-[#0c1017] border-t border-l border-[#232938] rotate-45 pointer-events-none" />

                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-[#a0aec0] font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                      <span>Navigator</span>
                    </div>
                    <button
                      id="close-guide-popup-btn"
                      onClick={() => setShowGuidePopup(false)}
                      className="text-[#a0aec0] hover:text-white p-1 rounded-lg hover:bg-[#1a1f2e] transition-colors"
                      title="Dismiss tip"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-start gap-3 my-2.5">
                    <div className="text-2xl select-none animate-bounce pt-0.5">
                      👆
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-white tracking-tight leading-snug">
                        To Change the Simulation click here
                      </p>
                      <p className="text-xs font-mono text-[#a0aec0] font-medium tracking-wide flex items-center gap-1.5">
                        <span>Love by : Umang</span>
                        <span>❤️✨</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 mt-2 border-t border-[#1a1f2e]">
                    <button
                      id="dismiss-guide-btn"
                      onClick={() => setShowGuidePopup(false)}
                      className="text-xs font-mono text-[#a0aec0] hover:text-white transition-colors"
                    >
                      Dismiss
                    </button>
                    <button
                      id="open-menu-guide-btn"
                      onClick={() => {
                        setShowGuidePopup(false);
                        setIsMenuOpen(true);
                      }}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-white hover:bg-neutral-200 text-[#05070a] transition-colors flex items-center gap-1.5 active:scale-95"
                    >
                      <span>Explore Labs</span>
                      <span>🚀</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="absolute top-full right-0 mt-3 w-[320px] bg-[#0a0d14]/95 backdrop-blur-2xl border border-[#1a1f2e] shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden z-50"
                >
                  <div className="p-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <div className="mb-6">
                      <div className="text-[10px] uppercase font-mono tracking-[0.2em] text-[#ffffff] opacity-70 mb-3 px-1">
                        2D Simulations
                      </div>
                      <div className="space-y-1.5">
                        {labs2D.map(renderLabItem)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-[10px] uppercase font-mono tracking-[0.2em] text-[#ffffff] opacity-70 mb-3 px-1">
                        3D Simulations
                      </div>
                      <div className="space-y-1.5">
                        {labs3D.map(renderLabItem)}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </header>
  );
};
