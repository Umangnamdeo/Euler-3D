import React, { useState, useEffect, useRef } from 'react';
import { 
  Waves, 
  RotateCcw, 
  Layers, 
  Activity, 
  Zap, 
  Gauge, 
  Compass, 
  Sparkles 
} from 'lucide-react';
import { SimulationState } from '../../types';
import { ParameterControl } from '../ParameterControl';
import { 
  DoublePendulumParams, 
  DoublePendulumState, 
  stepDoublePendulumRK4 
} from '../../utils/physics';

interface ChaosPendulumLabProps {
  simState: SimulationState;
}

export const ChaosPendulumLab: React.FC<ChaosPendulumLabProps> = ({ simState }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Pendulum physical parameters
  const [l1, setL1] = useState<number>(1.1); // m
  const [l2, setL2] = useState<number>(1.0); // m
  const [m1, setM1] = useState<number>(1.5); // kg
  const [m2, setM2] = useState<number>(1.2); // kg
  const [gravity, setGravity] = useState<number>(9.81);
  const [enableShadow, setEnableShadow] = useState<boolean>(true); // Dual pendulum with delta theta = 0.001 deg
  const [trailLength, setTrailLength] = useState<number>(400);

  // State of primary pendulum
  const state1Ref = useRef<DoublePendulumState>({
    theta1: Math.PI * 0.65,
    theta2: Math.PI * 0.75,
    omega1: 0,
    omega2: 0,
  });

  // State of secondary shadow pendulum (0.001 deg offset to demonstrate Lyapunov divergence!)
  const state2Ref = useRef<DoublePendulumState>({
    theta1: Math.PI * 0.65 + 0.0001,
    theta2: Math.PI * 0.75,
    omega1: 0,
    omega2: 0,
  });

  const trail1Ref = useRef<{ x: number; y: number }[]>([]);
  const trail2Ref = useRef<{ x: number; y: number }[]>([]);
  const phasePointsRef = useRef<{ t1: number; t2: number }[]>([]);

  const params: DoublePendulumParams = { l1, l2, m1, m2, g: gravity };

  // Reset pendulums
  const resetPendulums = (t1 = Math.PI * 0.65, t2 = Math.PI * 0.75) => {
    state1Ref.current = {
      theta1: t1,
      theta2: t2,
      omega1: 0,
      omega2: 0,
    };
    state2Ref.current = {
      theta1: t1 + 0.0001,
      theta2: t2,
      omega1: 0,
      omega2: 0,
    };
    trail1Ref.current = [];
    trail2Ref.current = [];
    phasePointsRef.current = [];
  };

  // Re-initialize on parameter change
  useEffect(() => {
    resetPendulums();
  }, [l1, l2, m1, m2, gravity]);

  // Main integration loop
  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.035);
      lastTs = now;

      if (simState.isRunning) {
        const timeScale = simState.timeScale;
        const subSteps = 10;
        const subDt = (dt * timeScale) / subSteps;

        for (let s = 0; s < subSteps; s++) {
          state1Ref.current = stepDoublePendulumRK4(state1Ref.current, params, subDt);
          if (enableShadow) {
            state2Ref.current = stepDoublePendulumRK4(state2Ref.current, params, subDt);
          }
        }

        // Positions of bob 2
        const s1 = state1Ref.current;
        const x1_bob2 = l1 * Math.sin(s1.theta1) + l2 * Math.sin(s1.theta2);
        const y1_bob2 = l1 * Math.cos(s1.theta1) + l2 * Math.cos(s1.theta2);

        trail1Ref.current.push({ x: x1_bob2, y: y1_bob2 });
        if (trail1Ref.current.length > trailLength) trail1Ref.current.shift();

        if (enableShadow) {
          const s2 = state2Ref.current;
          const x2_bob2 = l1 * Math.sin(s2.theta1) + l2 * Math.sin(s2.theta2);
          const y2_bob2 = l1 * Math.cos(s2.theta1) + l2 * Math.cos(s2.theta2);
          trail2Ref.current.push({ x: x2_bob2, y: y2_bob2 });
          if (trail2Ref.current.length > trailLength) trail2Ref.current.shift();
        }

        // Phase space
        phasePointsRef.current.push({ t1: s1.theta1 % (Math.PI * 2), t2: s1.theta2 % (Math.PI * 2) });
        if (phasePointsRef.current.length > 300) phasePointsRef.current.shift();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [simState.isRunning, simState.timeScale, params, enableShadow, trailLength]);

  // Main Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 700;
    const height = 460;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    const originX = width / 2;
    const originY = height * 0.38;
    const pxPerMeter = Math.min(width, height) / (2.4 * (l1 + l2));

    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, width, height);

    // Subtle grid lines
    ctx.strokeStyle = '#1a1f2e25';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Pivot mount
    ctx.fillStyle = '#111622';
    ctx.strokeStyle = '#ffffff50';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(originX, originY, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 1. Draw Trail 2 (Shadow Pendulum - Purple)
    if (enableShadow && trail2Ref.current.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#cccccc70';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#cccccc';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      trail2Ref.current.forEach((pt, i) => {
        const sx = originX + pt.x * pxPerMeter;
        const sy = originY + pt.y * pxPerMeter;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw Trail 1 (Primary Pendulum - Cyan)
    if (trail1Ref.current.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      trail1Ref.current.forEach((pt, i) => {
        const sx = originX + pt.x * pxPerMeter;
        const sy = originY + pt.y * pxPerMeter;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
      ctx.restore();
    }

    // 3. Draw Shadow Pendulum Arm (if enabled)
    if (enableShadow) {
      const s2 = state2Ref.current;
      const x1 = originX + l1 * Math.sin(s2.theta1) * pxPerMeter;
      const y1 = originY + l1 * Math.cos(s2.theta1) * pxPerMeter;
      const x2 = x1 + l2 * Math.sin(s2.theta2) * pxPerMeter;
      const y2 = y1 + l2 * Math.cos(s2.theta2) * pxPerMeter;

      ctx.strokeStyle = '#cccccc40';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.fillStyle = '#cccccc';
      ctx.beginPath();
      ctx.arc(x2, y2, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Draw Primary Pendulum Arm
    const s1 = state1Ref.current;
    const x1 = originX + l1 * Math.sin(s1.theta1) * pxPerMeter;
    const y1 = originY + l1 * Math.cos(s1.theta1) * pxPerMeter;
    const x2 = x1 + l2 * Math.sin(s1.theta2) * pxPerMeter;
    const y2 = y1 + l2 * Math.cos(s1.theta2) * pxPerMeter;

    // Rod 1
    ctx.strokeStyle = '#a0aec0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.lineTo(x1, y1);
    ctx.stroke();

    // Bob 1
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x1, y1, 8 * Math.sqrt(m1), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Rod 2
    ctx.strokeStyle = '#a0aec0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Bob 2
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(x2, y2, 9 * Math.sqrt(m2), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [l1, l2, m1, m2, enableShadow]);

  // Phase Space Canvas Rendering
  useEffect(() => {
    const canvas = phaseCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, w, h);

    // Axes
    ctx.strokeStyle = '#1a1f2e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Draw phase space trajectory
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1.2;
    ctx.shadowColor = '#cccccc';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    phasePointsRef.current.forEach((pt, i) => {
      const sx = ((pt.t1 + Math.PI) / (Math.PI * 2)) * w;
      const sy = ((pt.t2 + Math.PI) / (Math.PI * 2)) * h;
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();
  });

  // Divergence metric between primary and shadow
  const divergence = Math.hypot(
    state1Ref.current.theta1 - state2Ref.current.theta1,
    state1Ref.current.theta2 - state2Ref.current.theta2
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Stage: Pendulum Canvas, Phase Portrait & Telemetry (lg:col-span-8) */}
      <div className="lg:col-span-8 space-y-4">
        <div className="bg-[#0a0d14] border border-[#1a1f2e] rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="px-5 py-3 border-b border-[#1a1f2e] bg-[#0a0d14] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#ffffff] font-semibold text-xs tracking-wider uppercase font-mono">
              <Waves className="w-4 h-4 text-[#ffffff]" />
              <span>Coupled Double Pendulum & Deterministic Chaos</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="reset-pendulum-btn"
                onClick={() => resetPendulums()}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#cccccc] hover:bg-[#cccccc]/80 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(204,204,204,0.4)]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset & Perturb</span>
              </button>
            </div>
          </div>

          {/* Canvas viewport & Phase Space Portrait */}
          <div className="grid grid-cols-1 md:grid-cols-3 bg-[#05070a]">
            <div className="relative md:col-span-2">
              <canvas ref={canvasRef} className="w-full block" />

              {/* Legend */}
              <div className="absolute top-3 left-3 bg-[#0a0d14]/90 backdrop-blur-md px-3 py-2 rounded-xl border border-[#1a1f2e] text-[10px] font-mono space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-[#ffffff] rounded-full shadow-[0_0_6px_#ffffff]" />
                  <span className="text-white">Primary Bob Trail</span>
                </div>
                {enableShadow && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-[#cccccc] rounded-full shadow-[0_0_6px_#cccccc]" />
                    <span className="text-white">Shadow (Δθ = 10⁻⁴ rad)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Phase Space Portrait (θ1 vs θ2) */}
            <div className="p-3.5 border-t md:border-t-0 md:border-l border-[#1a1f2e] bg-[#080a0f] flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block mb-1 font-mono">
                  Phase Torus (θ₁ vs θ₂)
                </span>
                <p className="text-[10px] text-[#a0aec0] mb-2 leading-tight">
                  Angle-space manifold mapping strange attractor orbits.
                </p>
                <canvas
                  ref={phaseCanvasRef}
                  width={200}
                  height={200}
                  className="w-full rounded-xl border border-[#1a1f2e] bg-[#05070a] block mx-auto shadow-inner"
                />
              </div>

              <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#cccccc] border-y border-r border-[#1a1f2e] text-xs font-mono space-y-1 mt-3">
                <div className="text-[9px] uppercase opacity-50 tracking-widest font-mono">Lyapunov Divergence:</div>
                <div className={`text-sm font-bold ${divergence > 1.0 ? 'text-[#888888]' : 'text-[#ffffff]'}`}>
                  {divergence.toFixed(4)} rad
                </div>
                <div className="text-[9px] text-[#a0aec0]">
                  {divergence > 1.0 ? 'Chaotic phase mixing' : 'Coherent laminar orbit'}
                </div>
              </div>
            </div>
          </div>

          {/* Telemetry metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-[#080a0f] border-t border-[#1a1f2e]">
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Rod 1 Angle (θ₁)</div>
              <div className="text-sm font-mono font-bold text-white">
                {((state1Ref.current.theta1 * 180) / Math.PI).toFixed(1)}°
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Rod 2 Angle (θ₂)</div>
              <div className="text-sm font-mono font-bold text-white">
                {((state1Ref.current.theta2 * 180) / Math.PI).toFixed(1)}°
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#cccccc] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Twin Separation</div>
              <div className="text-sm font-mono font-bold text-[#cccccc]">
                {(divergence * 100).toFixed(1)} cm
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Dynamics Regime</div>
              <div className="text-[10px] font-mono font-bold text-[#ffffff] mt-0.5 px-1.5 py-0.5 rounded border border-[#ffffff30] bg-[#ffffff15] inline-block">
                Hamiltonian Chaos
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Controls Deck (lg:col-span-4) */}
      <div className="lg:col-span-4 lg:sticky lg:top-16 space-y-3.5 max-h-[calc(100vh-6.5rem)] lg:overflow-y-auto pr-1">
        {/* Card 1: Arm Dimensions */}
        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1f2e]">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#ffffff]" />
              01 // Arm Geometry
            </span>
          </div>

          {/* L1 */}
          <ParameterControl
            id="input-length-l1"
            label="Rod Length 1 (L₁)"
            value={l1}
            min={0.5}
            max={2.0}
            step={0.05}
            unit="m"
            onChange={setL1}
            accentColor="#ffffff"
          />

          {/* L2 */}
          <ParameterControl
            id="input-length-l2"
            label="Rod Length 2 (L₂)"
            value={l2}
            min={0.5}
            max={2.0}
            step={0.05}
            unit="m"
            onChange={setL2}
            accentColor="#ffffff"
          />
        </div>

        {/* Card 2: Bob Masses */}
        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1f2e]">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-[#cccccc]" />
              02 // Inertial Masses
            </span>
          </div>

          {/* M1 */}
          <ParameterControl
            id="input-mass-m1"
            label="Mass 1 (m₁)"
            value={m1}
            min={0.5}
            max={5.0}
            step={0.1}
            unit="kg"
            onChange={setM1}
            accentColor="#cccccc"
          />

          {/* M2 */}
          <ParameterControl
            id="input-mass-m2"
            label="Mass 2 (m₂)"
            value={m2}
            min={0.5}
            max={5.0}
            step={0.1}
            unit="kg"
            onChange={setM2}
            accentColor="#cccccc"
          />
        </div>

        {/* Card 3: Shadow Twin & Trail Options */}
        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1f2e]">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#ffffff]" />
              03 // Lyapunov Twin & Trail
            </span>
          </div>

          {/* Trail Length */}
          <ParameterControl
            id="input-trail-len"
            label="Phosphor Trail Length"
            value={trailLength}
            min={100}
            max={1000}
            step={50}
            unit="pts"
            onChange={setTrailLength}
            accentColor="#ffffff"
          />

          <div className="pt-1.5 border-t border-[#1a1f2e]">
            <label className="flex items-center gap-2 text-xs text-[#a0aec0] hover:text-white cursor-pointer transition-colors">
              <input
                id="toggle-shadow-pendulum"
                type="checkbox"
                checked={enableShadow}
                onChange={(e) => setEnableShadow(e.target.checked)}
                className="accent-[#cccccc] rounded"
              />
              <span>Shadow Twin (10⁻⁴ rad perturbation)</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
