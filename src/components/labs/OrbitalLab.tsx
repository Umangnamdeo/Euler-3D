import React, { useRef, useEffect, useState } from 'react';
import { Sparkles, RotateCcw, Crosshair, Settings2 } from 'lucide-react';
import { SimulationState } from '../../types';
import { ParameterControl } from '../ParameterControl';

interface BodyState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  radius: number;
  color: string;
  history: {x: number, y: number}[];
}

interface OrbitalLabProps {
  simState: SimulationState;
}

export const OrbitalLab: React.FC<OrbitalLabProps> = ({ simState }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  
  const [scenario, setScenario] = useState<'figure8' | 'sunEarthMoon' | 'binary'>('sunEarthMoon');
  const [selectedBody, setSelectedBody] = useState<number>(0);
  const [, setForceRender] = useState({}); // To trigger re-renders for inspector
  
  // Gravitational constant scaled for simulation
  const G = 0.5;
  const historyMaxLength = 300;

  const bodiesRef = useRef<BodyState[]>([]);
  const [telemetry, setTelemetry] = useState({ energy: 0, time: 0 });

  const initScenario = (sc: string) => {
    let b: BodyState[] = [];
    if (sc === 'figure8') {
      // Classic figure-8 orbit for 3 equal masses
      const p1 = 0.97000436;
      const p2 = -0.24308753;
      const m = 1000;
      b = [
        { x: p1*200, y: p2*200, vx: 0.4662*10, vy: 0.4323*10, mass: m, radius: 10, color: '#cccccc', history: [] },
        { x: -p1*200, y: -p2*200, vx: 0.4662*10, vy: 0.4323*10, mass: m, radius: 10, color: '#ffffff', history: [] },
        { x: 0, y: 0, vx: -2*0.4662*10, vy: -2*0.4323*10, mass: m, radius: 10, color: '#888888', history: [] }
      ];
    } else if (sc === 'binary') {
      b = [
        { x: -100, y: 0, vx: 0, vy: 1.5, mass: 1000, radius: 12, color: '#888888', history: [] },
        { x: 100, y: 0, vx: 0, vy: -1.5, mass: 1000, radius: 12, color: '#ffffff', history: [] },
        { x: 0, y: 150, vx: 2.5, vy: 0, mass: 1, radius: 4, color: '#ffffff', history: [] } // small satellite
      ];
    } else {
      // Sun, Earth, Moon
      b = [
        { x: 0, y: 0, vx: 0, vy: 0.05, mass: 5000, radius: 16, color: '#aaaaaa', history: [] }, // Sun
        { x: 250, y: 0, vx: 0, vy: -3.1, mass: 100, radius: 8, color: '#ffffff', history: [] }, // Earth
        { x: 270, y: 0, vx: 0, vy: -4.3, mass: 2, radius: 3, color: '#ffffff', history: [] } // Moon
      ];
    }
    bodiesRef.current = b;
    setSelectedBody(0);
    setTelemetry({ energy: computeEnergy(b), time: 0 });
    setForceRender({});
  };

  const updateBody = (index: number, key: keyof BodyState, value: number) => {
    if (bodiesRef.current[index]) {
      (bodiesRef.current[index] as any)[key] = value;
      setForceRender({});
    }
  };

  const computeEnergy = (b: BodyState[]) => {
    let k = 0;
    let u = 0;
    for (let i=0; i<b.length; i++) {
      k += 0.5 * b[i].mass * (b[i].vx**2 + b[i].vy**2);
      for (let j=i+1; j<b.length; j++) {
        const dx = b[j].x - b[i].x;
        const dy = b[j].y - b[i].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        u -= G * b[i].mass * b[j].mass / dist;
      }
    }
    return k + u;
  };

  useEffect(() => {
    initScenario(scenario);
  }, [scenario]);

  useEffect(() => {
    if (simState.stepTrigger > 0 && !simState.isRunning) {
      updatePhysics(0.016);
      draw();
    }
  }, [simState.stepTrigger]);

  const updatePhysics = (dt: number) => {
    const bodies = bodiesRef.current;
    const steps = 4;
    const subDt = dt / steps;
    
    for (let s=0; s<steps; s++) {
      // Calculate accelerations
      const acc = bodies.map(() => ({x: 0, y: 0}));
      
      for (let i=0; i<bodies.length; i++) {
        for (let j=i+1; j<bodies.length; j++) {
          const dx = bodies[j].x - bodies[i].x;
          const dy = bodies[j].y - bodies[i].y;
          const distSq = dx*dx + dy*dy;
          const dist = Math.sqrt(distSq);
          
          if (dist > 2) {
            const f = G * bodies[i].mass * bodies[j].mass / distSq;
            const fx = f * dx / dist;
            const fy = f * dy / dist;
            
            acc[i].x += fx / bodies[i].mass;
            acc[i].y += fy / bodies[i].mass;
            acc[j].x -= fx / bodies[j].mass;
            acc[j].y -= fy / bodies[j].mass;
          }
        }
      }
      
      // Update velocities and positions (Symplectic Euler)
      for (let i=0; i<bodies.length; i++) {
        bodies[i].vx += acc[i].x * subDt;
        bodies[i].vy += acc[i].y * subDt;
        bodies[i].x += bodies[i].vx * subDt;
        bodies[i].y += bodies[i].vy * subDt;
      }
    }

    // Update history
    setTelemetry(prev => {
      if (prev.time % 10 === 0) {
        bodies.forEach(b => {
          b.history.push({x: b.x, y: b.y});
          if (b.history.length > historyMaxLength) b.history.shift();
        });
      }
      return { energy: computeEnergy(bodies), time: prev.time + 1 };
    });
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle responsive sizing
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid
    ctx.strokeStyle = '#1a1f2e';
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for(let i=0; i<canvas.height; i+=40) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const bodies = bodiesRef.current;

    // Draw history trails
    bodies.forEach(b => {
      if (b.history.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(b.history[0].x + cx, b.history[0].y + cy);
      for(let i=1; i<b.history.length; i++) {
        ctx.lineTo(b.history[i].x + cx, b.history[i].y + cy);
      }
      ctx.strokeStyle = b.color + '40'; // 25% opacity
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw bodies
    bodies.forEach(b => {
      ctx.beginPath();
      ctx.arc(b.x + cx, b.y + cy, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = b.color;
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Velocity vector
      ctx.beginPath();
      ctx.moveTo(b.x + cx, b.y + cy);
      ctx.lineTo(b.x + cx + b.vx * 5, b.y + cy + b.vy * 5);
      ctx.strokeStyle = '#ffffff60';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  };

  useEffect(() => {
    let lastTime = performance.now();
    
    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.032); // cap dt at 32ms
      lastTime = time;

      if (simState.isRunning) {
        updatePhysics(dt * 60 * simState.timeScale); // 60 FPS base
      }
      
      draw();
      requestRef.current = requestAnimationFrame(render);
    };
    
    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [simState.isRunning, simState.timeScale]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Stage */}
      <div className="lg:col-span-8 space-y-4">
        <div className="bg-[#0a0d14] border border-[#1a1f2e] rounded-2xl overflow-hidden shadow-2xl">
          <div className="px-5 py-3 border-b border-[#1a1f2e] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#cccccc] font-semibold text-xs tracking-wider uppercase font-mono">
              <Sparkles className="w-4 h-4" />
              <span>N-Body Orbital Gravity Simulation</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => initScenario(scenario)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#cccccc] hover:bg-[#cccccc]/80 text-[#05070a] font-bold rounded-lg text-xs uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(204,204,204,0.4)]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart Orbit</span>
              </button>
            </div>
          </div>

          <div className="relative w-full h-[460px] bg-[#05070a]">
            <canvas ref={canvasRef} className="w-full h-full block touch-none" />
          </div>

          {/* Telemetry */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 p-3.5 bg-[#080a0f] border-t border-[#1a1f2e]">
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Total System Energy (H)</div>
              <div className="text-sm font-mono font-bold text-white">
                {telemetry.energy.toExponential(3)} <span className="text-[10px] font-normal text-[#a0aec0]/70">J</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#cccccc] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Integration Method</div>
              <div className="text-[10px] font-mono font-bold text-[#cccccc] mt-0.5 px-1.5 py-0.5 rounded border border-[#cccccc30] bg-[#cccccc15] inline-block">
                Symplectic Euler
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Sim Time</div>
              <div className="text-sm font-mono font-bold text-[#ffffff]">
                {(telemetry.time / 60).toFixed(1)} <span className="text-[10px] font-normal text-[#a0aec0]/70">yrs</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Objects (N)</div>
              <div className="text-sm font-mono font-bold text-white">
                {bodiesRef.current.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Deck */}
      <div className="lg:col-span-4 lg:sticky lg:top-16 space-y-3.5 max-h-[calc(100vh-6.5rem)] lg:overflow-y-auto pr-1">
        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1f2e]">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-[#cccccc]" />
              01 // Orbital Scenarios
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {[
              { id: 'sunEarthMoon', title: 'Stellar System', desc: 'Star, Planet & Satellite interaction', color: 'text-[#aaaaaa]' },
              { id: 'binary', title: 'Binary Star', desc: 'Two massive bodies with a circumbinary probe', color: 'text-[#888888]' },
              { id: 'figure8', title: 'Figure-8 (N=3)', desc: 'Stable periodic orbit for 3 equal masses', color: 'text-[#cccccc]' }
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setScenario(s.id as any)}
                className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                  scenario === s.id
                    ? 'bg-[#cccccc15] border-[#cccccc] text-white shadow-[0_0_10px_rgba(204,204,204,0.2)]'
                    : 'bg-[#111622] hover:bg-[#1a1f2e] border-[#1a1f2e] text-[#a0aec0]'
                }`}
              >
                <div className={`text-xs font-semibold ${s.color}`}>{s.title}</div>
                <div className="text-[10px] text-[#a0aec0] mt-0.5">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-4">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1f2e]">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-[#cccccc]" />
              02 // Entity Inspector
            </span>
          </div>
          
          {bodiesRef.current.length > 0 && bodiesRef.current[selectedBody] && (
            <div className="space-y-4">
              <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                {bodiesRef.current.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedBody(i)}
                    className={`px-3 py-1 rounded border text-xs font-mono transition-all ${
                      selectedBody === i
                        ? 'bg-[#ffffff] text-[#05070a] border-[#ffffff] font-bold shadow-[0_0_8px_rgba(255,255,255,0.4)]'
                        : 'bg-[#111622] text-[#a0aec0] border-[#1a1f2e] hover:bg-[#1a1f2e]'
                    }`}
                  >
                    B{i + 1}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <ParameterControl
                  key={`mass-${selectedBody}`}
                  id={`input-orbital-mass-${selectedBody}`}
                  label="Mass"
                  value={bodiesRef.current[selectedBody].mass}
                  min={1}
                  max={10000}
                  step={10}
                  onChange={(val) => updateBody(selectedBody, 'mass', val)}
                  accentColor="#ffffff"
                />

                <ParameterControl
                  key={`radius-${selectedBody}`}
                  id={`input-orbital-radius-${selectedBody}`}
                  label="Radius"
                  value={bodiesRef.current[selectedBody].radius}
                  min={1}
                  max={30}
                  step={1}
                  onChange={(val) => updateBody(selectedBody, 'radius', val)}
                  accentColor="#ffffff"
                />
                
                <ParameterControl
                  key={`vx-${selectedBody}`}
                  id={`input-orbital-vx-${selectedBody}`}
                  label="Initial Velocity X"
                  value={bodiesRef.current[selectedBody].vx}
                  min={-10}
                  max={10}
                  step={0.1}
                  onChange={(val) => updateBody(selectedBody, 'vx', val)}
                  accentColor="#ffffff"
                />

                <ParameterControl
                  key={`vy-${selectedBody}`}
                  id={`input-orbital-vy-${selectedBody}`}
                  label="Initial Velocity Y"
                  value={bodiesRef.current[selectedBody].vy}
                  min={-10}
                  max={10}
                  step={0.1}
                  onChange={(val) => updateBody(selectedBody, 'vy', val)}
                  accentColor="#ffffff"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
