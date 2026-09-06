import React, { useState, useEffect, useRef } from 'react';
import { 
  Wind, 
  AlertTriangle, 
  Activity, 
  Compass, 
  Layers, 
  Sparkles, 
  ArrowUpRight, 
  Flame,
  Zap
} from 'lucide-react';
import { SimulationState } from '../../types';
import { ParameterControl } from '../ParameterControl';
import { 
  computeAeroCoefficients, 
  generateNacaAirfoil 
} from '../../utils/physics';

interface AirfoilLabProps {
  simState: SimulationState;
}

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  lane: number;
}

interface Vortex {
  x: number;
  y: number;
  gamma: number; // circulation strength
  radius: number;
  age: number;
}

export const AirfoilLab: React.FC<AirfoilLabProps> = ({ simState }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Aerodynamic parameters
  const [aoaDeg, setAoaDeg] = useState<number>(8); // Angle of attack
  const [airspeed, setAirspeed] = useState<number>(35); // m/s
  const [camber, setCamber] = useState<number>(0.02); // 0 = NACA 0012, 0.02 = NACA 2412
  const [renderMode, setRenderMode] = useState<'particles' | 'streamlines' | 'pressure'>('particles');
  const [vortices, setVortices] = useState<Vortex[]>([]);

  // Simulation particles
  const particlesRef = useRef<SmokeParticle[]>([]);
  const lastVortexShedRef = useRef<number>(0);

  // Compute coefficients
  const aero = computeAeroCoefficients(aoaDeg, camber);

  // Generate airfoil geometry
  const chordPx = 220;
  const airfoilCoords = generateNacaAirfoil(camber, 0.4, 0.12, 70);

  // Initialize smoke particles
  useEffect(() => {
    const particles: SmokeParticle[] = [];
    const numLanes = 36;
    for (let i = 0; i < 350; i++) {
      const lane = Math.floor(Math.random() * numLanes);
      particles.push({
        x: Math.random() * 800,
        y: (lane / numLanes) * 440 + 20,
        vx: airspeed,
        vy: 0,
        age: Math.random() * 300,
        maxAge: 300 + Math.random() * 200,
        lane,
      });
    }
    particlesRef.current = particles;
  }, []);

  // Animation and physics update
  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      if (simState.isRunning) {
        const timeScale = simState.timeScale;
        const rad = (aoaDeg * Math.PI) / 180;
        const canvas = canvasRef.current;
        const width = canvas ? canvas.width / (window.devicePixelRatio || 1) : 800;
        const height = canvas ? canvas.height / (window.devicePixelRatio || 1) : 460;
        const centerX = width * 0.42;
        const centerY = height * 0.52;

        // Shed vortex periodically if stalled (alpha > 15 deg)
        if (aero.isStalled) {
          if (now - lastVortexShedRef.current > 120 / (timeScale * (airspeed / 30))) {
            lastVortexShedRef.current = now;
            const sign = Math.random() > 0.5 ? 1 : -1;
            const shedX = centerX + chordPx * 0.5 * Math.cos(rad);
            const shedY = centerY + chordPx * 0.5 * Math.sin(rad) - (sign > 0 ? 15 : 35);
            setVortices((prev) => [
              ...prev.slice(-16),
              {
                x: shedX,
                y: shedY,
                gamma: (sign * airspeed * aero.stallRatio * 40),
                radius: 12,
                age: 0,
              },
            ]);
          }
        }

        // Update active vortices (drift with flow and decay)
        setVortices((prev) =>
          prev
            .map((v) => ({
              ...v,
              x: v.x + airspeed * 1.2 * dt * timeScale,
              y: v.y + Math.sin(v.age * 0.1) * 1.5,
              radius: v.radius + dt * 10 * timeScale,
              age: v.age + 1,
            }))
            .filter((v) => v.x < width + 50 && v.age < 160)
        );

        // Update smoke particles
        const particles = particlesRef.current;
        const numLanes = 36;

        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          p.age += 1;

          if (p.x > width || p.age > p.maxAge || p.y < 0 || p.y > height) {
            // Respawn on left side
            p.lane = Math.floor(Math.random() * numLanes);
            p.x = -10 - Math.random() * 40;
            p.y = (p.lane / numLanes) * (height - 40) + 20;
            p.age = 0;
            p.maxAge = 300 + Math.random() * 200;
          }

          // Compute potential flow perturbation around rotated airfoil
          // Transform particle to airfoil frame (origin at quarter-chord)
          const dx = p.x - centerX;
          const dy = p.y - centerY;

          // Rotate into airfoil axis
          const cosA = Math.cos(rad);
          const sinA = Math.sin(rad);
          const x_airfoil = dx * cosA + dy * sinA;
          const y_airfoil = -dx * sinA + dy * cosA;

          // Influence of airfoil thickness + circulation (Kutta condition)
          const r2 = x_airfoil * x_airfoil + y_airfoil * y_airfoil + 80;
          const circulation = 0.5 * airspeed * chordPx * aero.cl;

          // Streamline deflection velocity
          let u_ind = 0;
          let v_ind = 0;

          // Upwash / downwash circulation field
          const rDist = Math.sqrt(r2);
          u_ind += (circulation / (2 * Math.PI)) * (y_airfoil / r2);
          v_ind -= (circulation / (2 * Math.PI)) * (x_airfoil / r2);

          // Deflection around body
          if (Math.abs(x_airfoil) < chordPx * 0.7 && Math.abs(y_airfoil) < 45) {
            const push = Math.exp(-((x_airfoil * x_airfoil) / (chordPx * 70)));
            v_ind += (y_airfoil > 0 ? 1 : -1) * 35 * push;
          }

          // Vortex shedding turbulence when stalled on upper surface
          if (aero.isStalled && x_airfoil > -chordPx * 0.1 && y_airfoil < 15 && y_airfoil > -65) {
            // Detached turbulent wake
            u_ind -= airspeed * 0.45 * aero.stallRatio;
            v_ind += Math.sin(p.x * 0.08 + now * 0.005) * 28 * aero.stallRatio;
          }

          // Transform induced velocities back to world
          const worldU = airspeed + (u_ind * cosA - v_ind * sinA);
          const worldV = u_ind * sinA + v_ind * cosA;

          p.vx = worldU;
          p.vy = worldV;

          p.x += p.vx * dt * 2.2 * timeScale;
          p.y += p.vy * dt * 2.2 * timeScale;
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [aoaDeg, airspeed, camber, aero, simState.isRunning, simState.timeScale]);

  // Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 800;
    const height = 460;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, width, height);

    // Wind Tunnel grid lines
    ctx.strokeStyle = '#111622';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const centerX = width * 0.42;
    const centerY = height * 0.52;
    const rad = (aoaDeg * Math.PI) / 180;

    // 1. Draw shedding vortices if stalled
    if (aero.isStalled) {
      vortices.forEach((v) => {
        ctx.save();
        ctx.strokeStyle = v.gamma > 0 ? 'rgba(120, 120, 120, 0.4)' : 'rgba(160, 160, 160, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(v.x, v.y, v.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Spiral curl
        ctx.beginPath();
        for (let a = 0; a < Math.PI * 3; a += 0.2) {
          const r = (a / (Math.PI * 3)) * v.radius;
          const px = v.x + r * Math.cos(a + v.age * 0.15);
          const py = v.y + r * Math.sin(a + v.age * 0.15);
          if (a === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      });
    }

    // 2. Draw Smoke Particles / Streamlines
    const particles = particlesRef.current;
    if (renderMode === 'particles') {
      particles.forEach((p) => {
        const speed = Math.hypot(p.vx, p.vy);
        const relSpeed = speed / airspeed; // > 1 is suction acceleration, < 1 is stagnation

        // Bernoulli color scale: accelerated suction flow = cyan/magenta, decelerated = amber/gray
        let color = 'rgba(148, 163, 184, 0.6)';
        if (relSpeed > 1.25) {
          color = 'rgba(220, 220, 220, 0.85)'; // Cyan suction
        } else if (relSpeed > 1.05) {
          color = 'rgba(255, 255, 255, 0.7)';
        } else if (relSpeed < 0.8) {
          color = 'rgba(160, 160, 160, 0.75)'; // High pressure stagnation
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (renderMode === 'streamlines') {
      // Continuous lines connecting grouped lane particles
      ctx.save();
      ctx.lineWidth = 1.5;
      const lanes: SmokeParticle[][] = [];
      particles.forEach((p) => {
        if (!lanes[p.lane]) lanes[p.lane] = [];
        lanes[p.lane].push(p);
      });

      lanes.forEach((lanePts) => {
        if (lanePts && lanePts.length > 2) {
          lanePts.sort((a, b) => a.x - b.x);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.beginPath();
          lanePts.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          ctx.stroke();
        }
      });
      ctx.restore();
    }

    // 3. Draw Airfoil Profile
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rad);

    // Quarter-chord center offset: airfoil ranges from x = 0 (LE) to x = chordPx (TE)
    const offsetX = -chordPx * 0.25;

    ctx.beginPath();
    airfoilCoords.forEach((coord, i) => {
      const px = offsetX + coord.x * chordPx;
      const py = -coord.y * chordPx; // canvas inverted Y
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();

    // Airfoil body fill & shadow
    const grad = ctx.createLinearGradient(offsetX, -30, offsetX + chordPx, 30);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = aero.isStalled ? '#ef4444' : '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Chord line
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(offsetX, 0);
    ctx.lineTo(offsetX + chordPx, 0);
    ctx.stroke();

    // Pressure distribution arrows (Bernoulli) if mode is pressure
    if (renderMode === 'pressure') {
      ctx.setLineDash([]);
      const numPressurePoints = 14;
      for (let i = 1; i < numPressurePoints; i++) {
        const xNorm = i / numPressurePoints;
        const xPos = offsetX + xNorm * chordPx;

        // Upper suction peak
        const suctionMag = (1 - xNorm) * aero.cl * 22;
        if (!aero.isStalled || xNorm < 0.2) {
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(xPos, -12);
          ctx.lineTo(xPos, -12 - suctionMag);
          ctx.stroke();
        }

        // Lower pressure
        const pressMag = (1 - xNorm) * 8;
        ctx.strokeStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(xPos, 12);
        ctx.lineTo(xPos, 12 + pressMag);
        ctx.stroke();
      }
    }

    ctx.restore();

    // 4. Draw Free Stream Inflow Direction Indicator
    ctx.save();
    ctx.fillStyle = '#64748b';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(`V_inf = ${airspeed} m/s`, 20, 30);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 42);
    ctx.lineTo(80, 42);
    ctx.lineTo(72, 38);
    ctx.moveTo(80, 42);
    ctx.lineTo(72, 46);
    ctx.stroke();
    ctx.restore();

    // 5. Draw Lift & Drag Resultant Force Vectors at Quarter-Chord
    const liftMag = aero.cl * 45;
    const dragMag = aero.cd * 120;

    ctx.save();
    // Lift vector (perpendicular to freestream = strictly upward)
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, centerY - liftMag);
    ctx.stroke();

    // Lift arrow head
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - liftMag);
    ctx.lineTo(centerX - 5, centerY - liftMag + 8);
    ctx.lineTo(centerX + 5, centerY - liftMag + 8);
    ctx.closePath();
    ctx.fill();
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText(`L (CL: ${aero.cl.toFixed(2)})`, centerX - 30, centerY - liftMag - 5);

    // Drag vector (parallel to freestream = rightward)
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX + dragMag, centerY);
    ctx.stroke();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(centerX + dragMag, centerY);
    ctx.lineTo(centerX + dragMag - 8, centerY - 4);
    ctx.lineTo(centerX + dragMag - 8, centerY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillText(`D (CD: ${aero.cd.toFixed(3)})`, centerX + dragMag + 8, centerY + 4);
    ctx.restore();
  }, [aoaDeg, airspeed, camber, aero, renderMode, vortices, chordPx, airfoilCoords]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Stage: Wind Tunnel Canvas & Aerodynamic Diagnostics (lg:col-span-8) */}
      <div className="lg:col-span-8 space-y-4">
        <div className="bg-[#0a0d14] border border-[#1a1f2e] rounded-2xl overflow-hidden shadow-2xl">
          {/* Top bar with stall warning */}
          <div className="px-5 py-3 border-b border-[#1a1f2e] bg-[#0a0d14] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#ffffff] font-semibold text-xs tracking-wider uppercase font-mono">
              <Wind className="w-4 h-4" />
              <span>Airfoil Wind Tunnel (Vortex & Boundary Detachment)</span>
            </div>

            <div className="flex items-center gap-2">
              {aero.isStalled ? (
                <div className="flex items-center gap-1 px-2.5 py-0.5 bg-[#888888]/20 text-[#888888] border border-[#888888]/50 rounded-lg text-xs font-mono font-bold animate-pulse shadow-[0_0_10px_rgba(136,136,136,0.3)]">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#888888]" />
                  <span>STALLED (FLOW DETACHED)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 px-2.5 py-0.5 bg-[#ffffff]/15 text-[#ffffff] border border-[#ffffff]/30 rounded-lg text-xs font-mono shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                  <Activity className="w-3.5 h-3.5 text-[#ffffff]" />
                  <span>ATTACHED FLOW</span>
                </div>
              )}
            </div>
          </div>

          {/* 2D Wind Tunnel Canvas */}
          <div className="relative w-full bg-[#05070a]">
            <canvas ref={canvasRef} className="w-full block" />

            {/* Mode Overlay */}
            <div className="absolute top-3 left-3 bg-[#0a0d14]/90 backdrop-blur-md p-1 rounded-xl border border-[#1a1f2e] flex gap-1 text-xs font-mono">
              <button
                id="view-particles-btn"
                onClick={() => setRenderMode('particles')}
                className={`px-2.5 py-1 rounded-lg uppercase tracking-wider text-[10px] font-bold transition-all ${renderMode === 'particles' ? 'bg-[#ffffff] text-[#05070a] shadow-[0_0_10px_rgba(255,255,255,0.4)]' : 'text-[#a0aec0] hover:text-white'}`}
              >
                Smoke Particles
              </button>
              <button
                id="view-streamlines-btn"
                onClick={() => setRenderMode('streamlines')}
                className={`px-2.5 py-1 rounded-lg uppercase tracking-wider text-[10px] font-bold transition-all ${renderMode === 'streamlines' ? 'bg-[#ffffff] text-[#05070a] shadow-[0_0_10px_rgba(255,255,255,0.4)]' : 'text-[#a0aec0] hover:text-white'}`}
              >
                Streamlines
              </button>
              <button
                id="view-pressure-btn"
                onClick={() => setRenderMode('pressure')}
                className={`px-2.5 py-1 rounded-lg uppercase tracking-wider text-[10px] font-bold transition-all ${renderMode === 'pressure' ? 'bg-[#ffffff] text-[#05070a] shadow-[0_0_10px_rgba(255,255,255,0.4)]' : 'text-[#a0aec0] hover:text-white'}`}
              >
                Bernoulli Pressure
              </button>
            </div>
          </div>

          {/* Live Gauges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-[#080a0f] border-t border-[#1a1f2e]">
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Angle of Attack (α)</div>
              <div className={`text-sm font-mono font-bold ${aero.isStalled ? 'text-[#888888]' : 'text-[#ffffff]'}`}>
                {aoaDeg > 0 ? `+${aoaDeg}` : aoaDeg}°
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Lift Coeff (C_L)</div>
              <div className="text-sm font-mono font-bold text-[#ffffff]">
                {aero.cl.toFixed(2)}
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#cccccc] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Drag Coeff (C_D)</div>
              <div className={`text-sm font-mono font-bold ${aero.isStalled ? 'text-[#888888]' : 'text-[#cccccc]'}`}>
                {aero.cd.toFixed(3)}
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Lift-to-Drag (L/D)</div>
              <div className="text-sm font-mono font-bold text-white">
                {(aero.cl / Math.max(0.001, aero.cd)).toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Lift Polar Curve Graph */}
        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1f2e]">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#ffffff]" />
              Real-time C_L vs α Polar Curve (Dynamic Operating Point)
            </span>
            <span className="text-[10px] font-mono text-[#a0aec0]">
              Stall Limit: <span className="text-[#888888] font-bold">15.0°</span>
            </span>
          </div>

          <div className="relative w-full h-32 bg-[#05070a] rounded-xl border border-[#1a1f2e] p-2 flex items-center justify-center">
            <svg viewBox="-12 -0.8 42 2.6" className="w-full h-full overflow-visible">
              <line x1="-10" y1="0" x2="30" y2="0" stroke="#1a1f2e" strokeWidth="0.04" />
              <line x1="0" y1="-0.6" x2="0" y2="1.8" stroke="#1a1f2e" strokeWidth="0.04" />
              <line x1="15" y1="-0.6" x2="15" y2="1.8" stroke="#888888" strokeDasharray="0.3,0.3" strokeWidth="0.03" />
              <text x="15.5" y="-0.4" fill="#888888" fontSize="0.2" fontFamily="monospace">Stall (15°)</text>

              <path
                d={Array.from({ length: 41 }).map((_, i) => {
                  const a = -10 + i;
                  const c = computeAeroCoefficients(a, camber).cl;
                  return `${i === 0 ? 'M' : 'L'} ${a} ${-c}`;
                }).join(' ')}
                fill="none"
                stroke="#ffffff"
                strokeWidth="0.07"
              />

              <circle
                cx={aoaDeg}
                cy={-aero.cl}
                r="0.3"
                fill={aero.isStalled ? '#888888' : '#cccccc'}
                stroke="#ffffff"
                strokeWidth="0.06"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Right Controls Deck (lg:col-span-4) */}
      <div className="lg:col-span-4 lg:sticky lg:top-16 space-y-3.5 max-h-[calc(100vh-6.5rem)] lg:overflow-y-auto pr-1">
        {/* Presets */}
        <div className="p-3 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-2">
          <div className="text-[10px] uppercase font-mono tracking-widest text-[#ffffff] font-semibold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#ffffff]" />
            <span>Flight Presets</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: '0° Cruise', a: 0, desc: 'Optimal efficiency', color: 'text-[#ffffff]' },
              { label: '6° Climb', a: 6, desc: 'High lift ascent', color: 'text-emerald-400' },
              { label: '14° Pre-Stall', a: 14, desc: 'Near boundary separation', color: 'text-amber-400' },
              { label: '22° Deep Stall', a: 22, desc: 'Vortex breakdown', color: 'text-[#888888]' },
            ].map((b) => (
              <button
                key={b.a}
                id={`aoa-preset-${b.a}`}
                onClick={() => setAoaDeg(b.a)}
                className={`p-2 rounded-lg text-left border transition-all ${
                  aoaDeg === b.a
                    ? 'bg-[#ffffff]/15 text-white border-[#ffffff] font-bold shadow-[0_0_8px_rgba(255,255,255,0.2)]'
                    : 'bg-[#111622] hover:bg-[#1a1f2e] text-[#a0aec0] hover:text-white border-[#1a1f2e]'
                }`}
              >
                <div className={`font-mono text-xs font-bold ${b.color}`}>{b.label}</div>
                <div className="text-[9px] text-[#a0aec0] mt-0.5">{b.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Card 1: Angle of Attack & Airspeed */}
        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1f2e]">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-[#ffffff]" />
              01 // Flight Attitude & Speed
            </span>
          </div>

          {/* AoA Slider */}
          <ParameterControl
            id="input-aoa"
            label="Angle of Attack (α)"
            value={aoaDeg}
            min={-10}
            max={28}
            step={1}
            unit="°"
            onChange={setAoaDeg}
            accentColor="#ffffff"
            formatDisplay={(val) => aero.isStalled ? 'STALLED' : `${val}°`}
            subLabel={
              <div className="flex justify-between">
                <span>-10°</span>
                <span>15° (Stall Limit)</span>
                <span>28°</span>
              </div>
            }
          />

          {/* Airspeed */}
          <ParameterControl
            id="input-airspeed"
            label="Wind Tunnel Speed"
            value={airspeed}
            min={10}
            max={60}
            step={1}
            unit="m/s"
            onChange={setAirspeed}
            accentColor="#ffffff"
          />
        </div>

        {/* Card 2: Airfoil Profile Geometry */}
        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1f2e]">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#ffffff]" />
              02 // NACA Foil Profile
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              id="profile-naca2412-btn"
              onClick={() => setCamber(0.02)}
              className={`p-2.5 rounded-xl text-xs font-mono text-left border transition-all ${
                camber > 0
                  ? 'bg-[#ffffff]/15 border-[#ffffff] text-[#ffffff] shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                  : 'bg-[#111622] border-[#1a1f2e] text-[#a0aec0] hover:text-white'
              }`}
            >
              <div className="font-bold">NACA 2412</div>
              <div className="text-[9px] text-[#a0aec0] mt-0.5">2% Camber, 12% Thick</div>
            </button>
            <button
              id="profile-naca0012-btn"
              onClick={() => setCamber(0)}
              className={`p-2.5 rounded-xl text-xs font-mono text-left border transition-all ${
                camber === 0
                  ? 'bg-[#ffffff]/15 border-[#ffffff] text-[#ffffff] shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                  : 'bg-[#111622] border-[#1a1f2e] text-[#a0aec0] hover:text-white'
              }`}
            >
              <div className="font-bold">NACA 0012</div>
              <div className="text-[9px] text-[#a0aec0] mt-0.5">Symmetric, 12% Thick</div>
            </button>
          </div>

          <div className="p-2.5 bg-[#111622] rounded-xl border border-[#1a1f2e] text-xs font-mono space-y-1">
            <div className="text-[#a0aec0] text-[10px] font-semibold uppercase tracking-wider">Aero Diagnostics:</div>
            <div className="flex justify-between text-[#a0aec0]">
              <span>Zero-lift α:</span>
              <span className="text-[#ffffff] font-bold">{camber > 0 ? '-2.1°' : '0.0°'}</span>
            </div>
            <div className="flex justify-between text-[#a0aec0]">
              <span>Flow State:</span>
              <span className={aero.isStalled ? 'text-[#888888] font-bold' : 'text-[#ffffff] font-bold'}>
                {aero.isStalled ? 'Separated Vortex Shedding' : 'Laminar Boundary Attached'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
