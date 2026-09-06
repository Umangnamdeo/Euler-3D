import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  StepForward, 
  BookOpen, 
  Maximize2,
  Sliders,
  Sparkles,
  Flame,
  Zap,
  Clock
} from 'lucide-react';
import { LabId, SimulationState } from '../types';

interface BottomControllerProps {
  activeLab: LabId;
  simState: SimulationState;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onReset: () => void;
  onChangeTimeScale: (scale: number) => void;
  onOpenFormulas: () => void;
}

const LAB_TITLES: Record<LabId, { num: string; name: string; tag: string }> = {
  ballistics: { num: '01', name: 'BALLISTICS & DRAG', tag: 'RK4 SOLVER' },
  optics: { num: '02', name: 'RAY OPTICS & LENSES', tag: 'SNELL-CAUCHY' },
  airfoil: { num: '03', name: 'AIRFOIL & VORTEX SHEDDING', tag: 'POTENTIAL FLOW' },
  dzhanibekov: { num: '04', name: 'DZHANIBEKOV T-HANDLE', tag: '3D EULER RK4' },
  lorentz: { num: '05', name: 'LORENTZ MAGNETIC MIRROR', tag: 'BORIS METHOD' },
  chaos: { num: '06', name: 'DOUBLE PENDULUM CHAOS', tag: 'LYAPUNOV DIVERGENCE' },
  orbital: { num: '07', name: 'ORBITAL GRAVITY', tag: 'N-BODY SYMPLECTIC' },
};

export const BottomController: React.FC<BottomControllerProps> = ({
  activeLab,
  simState,
  onTogglePlay,
  onStepForward,
  onReset,
  onChangeTimeScale,
  onOpenFormulas,
}) => {
  const currentLab = LAB_TITLES[activeLab];

  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl pointer-events-none">
      <div className="pointer-events-auto bg-[#0a0d14]/90 backdrop-blur-xl border border-[#1f2430] rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] p-2 sm:p-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        
        {/* Left: Active Lab ID & Engine Status */}
        <div className="flex items-center gap-3 pl-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ffffff] animate-pulse shadow-[0_0_8px_#ffffff]" />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-white uppercase font-bold">
                <span className="text-[#ffffff]">{currentLab.num}</span>
                <span className="text-[#1f2430]">//</span>
                <span className="hidden sm:inline">{currentLab.name}</span>
                <span className="sm:hidden">{activeLab.toUpperCase()}</span>
              </div>
              <span className="text-[9px] font-mono text-[#a0aec0]/70 uppercase tracking-widest">
                {currentLab.tag} • 60 FPS
              </span>
            </div>
          </div>
        </div>

        {/* Center: Main Playback Transport */}
        <div className="flex items-center gap-2 bg-[#05070a]/90 p-1.5 rounded-xl border border-[#1a1f2e] mx-auto">
          {/* Main Run/Pause Button */}
          <button
            id="bottom-play-pause-btn"
            onClick={onTogglePlay}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wider uppercase transition-all select-none active:scale-95 ${
              simState.isRunning
                ? 'bg-[#dc143c] text-white shadow-[0_0_16px_rgba(220,20,60,0.5)] hover:bg-[#dc143c]/90'
                : 'bg-[#ffffff] text-[#05070a] shadow-[0_0_16px_rgba(255,255,255,0.5)] hover:bg-[#ffffff]/90'
            }`}
            title="Play / Pause simulation (Space)"
          >
            {simState.isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>RUN</span>
              </>
            )}
          </button>

          {/* Step button */}
          <button
            id="bottom-step-btn"
            onClick={onStepForward}
            disabled={simState.isRunning}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-medium text-[#a0aec0] hover:text-white bg-[#111622] hover:bg-[#1a1f2e] border border-[#1a1f2e] disabled:opacity-30 disabled:pointer-events-none transition-all active:scale-95"
            title="Single frame step forward (when paused)"
          >
            <StepForward className="w-3.5 h-3.5 text-[#ffffff]" />
            <span className="hidden sm:inline tracking-wider">STEP</span>
          </button>

          {/* Reset button */}
          <button
            id="bottom-reset-btn"
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-medium text-[#a0aec0] hover:text-[#888888] bg-[#111622] hover:bg-[#1a1f2e] border border-[#1a1f2e] transition-all active:scale-95"
            title="Reset simulation states and trajectory (Key: R)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline tracking-wider">RESET</span>
          </button>

          {/* Divider */}
          <div className="h-5 w-[1px] bg-[#1f2430] mx-0.5 hidden sm:block" />

          {/* Speed Presets */}
          <div className="flex items-center gap-1">
            {[0.25, 0.5, 1.0, 2.0].map((scale) => {
              const isSelected = simState.timeScale === scale;
              return (
                <button
                  key={scale}
                  id={`bottom-speed-${scale}x`}
                  onClick={() => onChangeTimeScale(scale)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-semibold transition-all select-none ${
                    isSelected
                      ? 'bg-[#ffffff] text-[#05070a] shadow-[0_0_10px_rgba(255,255,255,0.4)]'
                      : 'text-[#a0aec0] hover:text-white hover:bg-[#111622]'
                  }`}
                  title={`Run simulation at ${scale}x speed`}
                >
                  {scale}x
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Formulas & Hotkey hints */}
        <div className="flex items-center gap-2 pr-1">
          <button
            id="bottom-formulas-btn"
            onClick={onOpenFormulas}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-medium text-[#ffffff] bg-[#ffffff]/10 hover:bg-[#ffffff]/20 border border-[#ffffff]/40 shadow-[0_0_10px_rgba(255,255,255,0.2)] transition-all active:scale-95"
            title="Inspect Equations, Physics Laws & Derivations"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden md:inline tracking-wider uppercase">THEORY // MATH</span>
          </button>

          {/* Space hotkey pill */}
          <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-mono text-[#a0aec0]/70 px-2 py-1 rounded bg-[#111622] border border-[#1a1f2e]">
            <span className="text-white font-bold">[SPACE]</span>
            <span>TOGGLE</span>
          </div>
        </div>

      </div>
    </div>
  );
};
