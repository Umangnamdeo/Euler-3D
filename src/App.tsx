import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { BottomController } from './components/BottomController';
import { FormulaModal } from './components/FormulaModal';
import { BallisticsLab } from './components/labs/BallisticsLab';
import { OpticsLab } from './components/labs/OpticsLab';
import { AirfoilLab } from './components/labs/AirfoilLab';
import { DzhanibekovLab } from './components/labs/DzhanibekovLab';
import { LorentzLab } from './components/labs/LorentzLab';
import { ChaosPendulumLab } from './components/labs/ChaosPendulumLab';
import { OrbitalLab } from './components/labs/OrbitalLab';
import { LabId, SimulationState } from './types';

export default function App() {
  const [activeLab, setActiveLab] = useState<LabId>('ballistics');
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState<boolean>(false);

  const [simState, setSimState] = useState<SimulationState>({
    isRunning: true,
    timeScale: 1.0,
    stepTrigger: 0,
  });

  const togglePlay = () => {
    setSimState((prev) => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const stepForward = () => {
    setSimState((prev) => ({ ...prev, stepTrigger: prev.stepTrigger + 1 }));
  };

  const resetSimulation = () => {
    setSimState((prev) => ({ ...prev, stepTrigger: prev.stepTrigger + 1 }));
  };

  const changeTimeScale = (scale: number) => {
    setSimState((prev) => ({ ...prev, timeScale: scale }));
  };

  // Global keyboard shortcuts and scroll prevention
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        resetSimulation();
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        stepForward();
      } else if (e.key === '1') {
        setActiveLab('ballistics');
      } else if (e.key === '2') {
        setActiveLab('optics');
      } else if (e.key === '3') {
        setActiveLab('airfoil');
      } else if (e.key === '4') {
        setActiveLab('dzhanibekov');
      } else if (e.key === '5') {
        setActiveLab('lorentz');
      } else if (e.key === '6') {
        setActiveLab('chaos');
      } else if (e.key === '7') {
        setActiveLab('orbital');
      }
    };

    const handleWheel = (e: WheelEvent) => {
      // Prevent page scrolling when zooming inside a canvas
      if (e.target instanceof HTMLCanvasElement) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#05070a] text-[#a0aec0] flex flex-col relative overflow-x-hidden selection:bg-[#ffffff] selection:text-[#05070a]">
      {/* Immersive ambient dot grid background */}
      <div className="fixed inset-0 pointer-events-none immersive-grid opacity-20 z-0" />

      {/* Top Application Header */}
      <div className="relative z-40">
        <Header
          activeLab={activeLab}
          onSelectLab={setActiveLab}
          onOpenFormulas={() => setIsFormulaModalOpen(true)}
        />
      </div>

      {/* Main Simulation Viewport (Side-by-Side Workbench Layout inside each Lab) */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 pb-28 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeLab}
            initial={{ opacity: 0, y: 15, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeLab === 'ballistics' && <BallisticsLab simState={simState} />}
            {activeLab === 'optics' && <OpticsLab simState={simState} />}
            {activeLab === 'airfoil' && <AirfoilLab simState={simState} />}
            {activeLab === 'dzhanibekov' && <DzhanibekovLab simState={simState} />}
            {activeLab === 'lorentz' && <LorentzLab simState={simState} />}
            {activeLab === 'chaos' && <ChaosPendulumLab simState={simState} />}
            {activeLab === 'orbital' && <OrbitalLab simState={simState} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Bottom Controller Bar */}
      <BottomController
        activeLab={activeLab}
        simState={simState}
        onTogglePlay={togglePlay}
        onStepForward={stepForward}
        onReset={resetSimulation}
        onChangeTimeScale={changeTimeScale}
        onOpenFormulas={() => setIsFormulaModalOpen(true)}
      />

      {/* Theoretical Formulations & Equations Modal */}
      <FormulaModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
        activeLab={activeLab}
      />

      {/* Signature */}
      <div className="fixed bottom-4 right-4 z-50 pointer-events-none opacity-50 font-mono text-[10px] tracking-[0.2em] uppercase text-white">
        MADED BY :- UMANG NAMDEO
      </div>
    </div>
  );
}
