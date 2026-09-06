import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Play, 
  RotateCcw, 
  Target as TargetIcon, 
  Wind, 
  Globe, 
  Flame, 
  Zap, 
  Gauge, 
  CheckCircle2, 
  Compass 
} from 'lucide-react';
import { SimulationState } from '../../types';
import { ParameterControl } from '../ParameterControl';
import { 
  BallisticsParams, 
  BallisticsState, 
  stepBallisticsRK4, 
  computeTrajectoryPath 
} from '../../utils/physics';

interface BallisticsLabProps {
  simState: SimulationState;
}

const GRAVITY_PRESETS = [
  { name: 'Earth (9.81 m/s²)', value: 9.81 },
  { name: 'Moon (1.62 m/s²)', value: 1.62 },
  { name: 'Mars (3.72 m/s²)', value: 3.72 },
  { name: 'Jupiter (24.79 m/s²)', value: 24.79 },
  { name: 'Zero-G (0.00 m/s²)', value: 0.0 },
];

const SHAPE_PRESETS = [
  { name: 'Sphere (Cd 0.47)', cd: 0.47 },
  { name: 'Bullet (Cd 0.20)', cd: 0.20 },
  { name: 'Cube (Cd 1.05)', cd: 1.05 },
  { name: 'Airfoil (Cd 0.05)', cd: 0.05 },
];

export const BallisticsLab: React.FC<BallisticsLabProps> = ({ simState }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Simulation Parameters
  const [v0, setV0] = useState<number>(45); // m/s
  const [angleDeg, setAngleDeg] = useState<number>(45); // degrees
  const [h0, setH0] = useState<number>(5); // launch altitude m
  const [gravity, setGravity] = useState<number>(9.81);
  const [airDensity, setAirDensity] = useState<number>(1.225); // kg/m3 (Earth sea level)
  const [cd, setCd] = useState<number>(0.47);
  const [mass, setMass] = useState<number>(2.0); // kg
  const [radius, setRadius] = useState<number>(0.12); // m => Area = pi * r^2
  const [windX, setWindX] = useState<number>(0); // m/s
  const [showVacuumComparison, setShowVacuumComparison] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(true);

  // Target Parameters
  const [targetX, setTargetX] = useState<number>(130);
  const [targetY, setTargetY] = useState<number>(8);
  const [targetRadius, setTargetRadius] = useState<number>(5);
  const [hitCount, setHitCount] = useState<number>(0);
  const [lastHitTime, setLastHitTime] = useState<number | null>(null);

  // State of active projectile
  const [currentProjectile, setCurrentProjectile] = useState<BallisticsState>({
    x: 0,
    y: 5,
    vx: 45 * Math.cos((45 * Math.PI) / 180),
    vy: 45 * Math.sin((45 * Math.PI) / 180),
    t: 0,
  });
  const [isLanded, setIsLanded] = useState<boolean>(false);
  const [flightTrail, setFlightTrail] = useState<{ x: number; y: number }[]>([]);

  // Computed theoretical metrics
  const area = Math.PI * radius * radius;
  const currentParams: BallisticsParams = {
    g: gravity,
    rho: airDensity,
    cd,
    area,
    mass,
    windX,
  };

  const vacuumParams: BallisticsParams = {
    g: gravity,
    rho: 0,
    cd: 0,
    area,
    mass,
    windX: 0,
  };

  const currentTrajectory = computeTrajectoryPath(v0, angleDeg, h0, currentParams);
  const vacuumTrajectory = computeTrajectoryPath(v0, angleDeg, h0, vacuumParams);

  // Re-launch projectile
  const fireProjectile = () => {
    const rad = (angleDeg * Math.PI) / 180;
    const initial: BallisticsState = {
      x: 0,
      y: h0,
      vx: v0 * Math.cos(rad),
      vy: v0 * Math.sin(rad),
      t: 0,
    };
    setCurrentProjectile(initial);
    setIsLanded(false);
    setFlightTrail([{ x: 0, y: h0 }]);
    setLastHitTime(null);
  };

  // Reset projectile on parameter change
  useEffect(() => {
    fireProjectile();
  }, [v0, angleDeg, h0, gravity, airDensity, cd, mass, radius, windX]);

  // Handle single step trigger from header
  useEffect(() => {
    if (simState.stepTrigger > 0 && !isLanded) {
      stepForward(0.04);
    }
  }, [simState.stepTrigger]);

  const stepForward = (dt: number) => {
    if (isLanded) return;
    const effectiveDt = dt * simState.timeScale;
    const next = stepBallisticsRK4(currentProjectile, currentParams, effectiveDt);

    // Target collision check
    const distToTarget = Math.hypot(next.x - targetX, next.y - targetY);
    if (distToTarget <= targetRadius && !lastHitTime) {
      setHitCount((c) => c + 1);
      setLastHitTime(Date.now());
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#10b981', '#f59e0b', '#ec4899'],
      });
    }

    if (next.y <= 0) {
      // Landed
      next.y = 0;
      setIsLanded(true);
      setCurrentProjectile(next);
      setFlightTrail((prev) => [...prev, { x: next.x, y: 0 }]);
    } else {
      setCurrentProjectile(next);
      setFlightTrail((prev) => {
        // Append every few steps to avoid unbounded memory
        if (prev.length > 500) return [...prev.slice(1), { x: next.x, y: next.y }];
        return [...prev, { x: next.x, y: next.y }];
      });
    }
  };

  // Animation Loop
  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.05);
      lastTs = now;

      if (simState.isRunning && !isLanded) {
        stepForward(dt);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [simState.isRunning, isLanded, currentProjectile, currentParams, simState.timeScale]);

  // Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 800;
    const height = 480;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    // Compute dynamic world scale based on trajectories and target
    const maxWorldX = Math.max(
      vacuumTrajectory.range * 1.15,
      currentTrajectory.range * 1.15,
      targetX + 25,
      60
    );
    const maxWorldY = Math.max(
      vacuumTrajectory.maxH * 1.3,
      currentTrajectory.maxH * 1.3,
      targetY + 15,
      35
    );

    const paddingLeft = 60;
    const paddingBottom = 50;
    const paddingTop = 40;
    const paddingRight = 40;

    const plotW = width - paddingLeft - paddingRight;
    const plotH = height - paddingTop - paddingBottom;

    const scaleX = plotW / maxWorldX;
    const scaleY = plotH / maxWorldY;
    const scale = Math.min(scaleX, scaleY);

    const toScreenX = (wx: number) => paddingLeft + wx * scale;
    const toScreenY = (wy: number) => height - paddingBottom - wy * scale;

    // Clear background
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, width, height);

    // Grid lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#111622';
    ctx.fillStyle = '#a0aec0';
    ctx.font = '10px JetBrains Mono, monospace';

    // X-axis ticks (e.g. every 20 or 50 meters)
    const stepX = maxWorldX > 200 ? 50 : maxWorldX > 100 ? 25 : 10;
    for (let x = 0; x <= maxWorldX; x += stepX) {
      const sx = toScreenX(x);
      ctx.beginPath();
      ctx.moveTo(sx, paddingTop);
      ctx.lineTo(sx, height - paddingBottom);
      ctx.stroke();
      ctx.fillText(`${x}m`, sx - 10, height - paddingBottom + 18);
    }

    // Y-axis ticks
    const stepY = maxWorldY > 150 ? 50 : maxWorldY > 60 ? 20 : 10;
    for (let y = 0; y <= maxWorldY; y += stepY) {
      const sy = toScreenY(y);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, sy);
      ctx.lineTo(paddingLeft + plotW, sy);
      ctx.stroke();
      ctx.fillText(`${y}m`, paddingLeft - 35, sy + 4);
    }

    // Ground line
    const groundY = toScreenY(0);
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, height);
    groundGrad.addColorStop(0, '#0a0d14');
    groundGrad.addColorStop(1, '#05070a');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, width, height - groundY);

    ctx.strokeStyle = '#1a1f2e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();

    // 1. Draw Ideal Vacuum Parabola (if enabled)
    if (showVacuumComparison && airDensity > 0) {
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(160, 174, 192, 0.35)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      vacuumTrajectory.points.forEach((pt, i) => {
        const sx = toScreenX(pt.x);
        const sy = toScreenY(pt.y);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();

      // Label at vacuum apex
      const vacApexX = toScreenX(vacuumTrajectory.range / 2);
      const vacApexY = toScreenY(vacuumTrajectory.maxH);
      ctx.fillStyle = 'rgba(160, 174, 192, 0.7)';
      ctx.fillText(`Vacuum: ${vacuumTrajectory.range.toFixed(1)}m`, vacApexX - 30, vacApexY - 10);
      ctx.restore();
    }

    // 2. Draw Full Drag Trajectory Curve (projected)
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    currentTrajectory.points.forEach((pt, i) => {
      const sx = toScreenX(pt.x);
      const sy = toScreenY(pt.y);
      if (i === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();

    // Apex marker for current trajectory
    const apexPt = currentTrajectory.points.reduce((max, p) => (p.y > max.y ? p : max), currentTrajectory.points[0]);
    if (apexPt) {
      const apexSx = toScreenX(apexPt.x);
      const apexSy = toScreenY(apexPt.y);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(apexSx, apexSy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`Apex: ${apexPt.y.toFixed(1)}m`, apexSx - 20, apexSy - 12);
    }
    ctx.restore();

    // 3. Draw Target
    const targetSx = toScreenX(targetX);
    const targetSy = toScreenY(targetY);
    const targetSr = targetRadius * scale;

    ctx.save();
    // Bullseye outer ring
    ctx.beginPath();
    ctx.arc(targetSx, targetSy, targetSr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(120, 120, 120, 0.15)';
    ctx.fill();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner ring
    ctx.beginPath();
    ctx.arc(targetSx, targetSy, targetSr * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(targetSx, targetSy, targetSr * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();

    // Target stand
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(targetSx, targetSy + targetSr);
    ctx.lineTo(targetSx, groundY);
    ctx.stroke();
    ctx.restore();

    // 4. Draw Launch Cannon
    const cannonBaseX = toScreenX(0);
    const cannonBaseY = toScreenY(h0);
    const barrelLength = 26;
    const rad = (angleDeg * Math.PI) / 180;
    const muzzleX = cannonBaseX + barrelLength * Math.cos(rad);
    const muzzleY = cannonBaseY - barrelLength * Math.sin(rad);

    // Platform stand if h0 > 0
    if (h0 > 0) {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.fillRect(cannonBaseX - 12, cannonBaseY, 24, groundY - cannonBaseY);
      ctx.strokeRect(cannonBaseX - 12, cannonBaseY, 24, groundY - cannonBaseY);
    }

    // Cannon barrel
    ctx.save();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cannonBaseX, cannonBaseY);
    ctx.lineTo(muzzleX, muzzleY);
    ctx.stroke();

    // Cannon pivot hub
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cannonBaseX, cannonBaseY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 5. Draw Flight History Trail
    if (flightTrail.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#22d3ee';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#06b6d4';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      flightTrail.forEach((pt, i) => {
        const sx = toScreenX(pt.x);
        const sy = toScreenY(pt.y);
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.stroke();
      ctx.restore();
    }

    // 6. Draw Active Projectile & Vectors
    const projSx = toScreenX(currentProjectile.x);
    const projSy = toScreenY(currentProjectile.y);

    ctx.save();
    // Projectile body
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(projSx, projSy, Math.max(5, radius * scale * 1.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Vectors
    if (showVectors && !isLanded) {
      const vMag = Math.hypot(currentProjectile.vx, currentProjectile.vy);
      if (vMag > 0.1) {
        // Velocity vector (Cyan)
        const vecScale = 1.0;
        const vxScreen = currentProjectile.vx * vecScale;
        const vyScreen = -currentProjectile.vy * vecScale;

        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(projSx, projSy);
        ctx.lineTo(projSx + vxScreen, projSy + vyScreen);
        ctx.stroke();

        // Arrowhead
        const vAngle = Math.atan2(vyScreen, vxScreen);
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.moveTo(projSx + vxScreen, projSy + vyScreen);
        ctx.lineTo(
          projSx + vxScreen - 8 * Math.cos(vAngle - Math.PI / 6),
          projSy + vyScreen - 8 * Math.sin(vAngle - Math.PI / 6)
        );
        ctx.lineTo(
          projSx + vxScreen - 8 * Math.cos(vAngle + Math.PI / 6),
          projSy + vyScreen - 8 * Math.sin(vAngle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();

        // Drag Vector (Red)
        if (airDensity > 0) {
          const relVx = currentProjectile.vx - windX;
          const relVy = currentProjectile.vy;
          const relSpeed = Math.hypot(relVx, relVy);
          const dragMag = 0.5 * airDensity * relSpeed * relSpeed * cd * area;
          const dragVecScale = 0.8;
          const dragSx = -(dragMag * (relVx / relSpeed)) * dragVecScale;
          const dragSy = (dragMag * (relVy / relSpeed)) * dragVecScale; // canvas Y inverted

          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(projSx, projSy);
          ctx.lineTo(projSx + dragSx, projSy + dragSy);
          ctx.stroke();

          // Drag arrowhead
          const dAngle = Math.atan2(dragSy, dragSx);
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(projSx + dragSx, projSy + dragSy);
          ctx.lineTo(
            projSx + dragSx - 7 * Math.cos(dAngle - Math.PI / 6),
            projSy + dragSy - 7 * Math.sin(dAngle - Math.PI / 6)
          );
          ctx.lineTo(
            projSx + dragSx - 7 * Math.cos(dAngle + Math.PI / 6),
            projSy + dragSy - 7 * Math.sin(dAngle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fill();
        }
      }
    }
  }, [
    currentProjectile,
    isLanded,
    flightTrail,
    v0,
    angleDeg,
    h0,
    targetX,
    targetY,
    targetRadius,
    airDensity,
    showVacuumComparison,
    showVectors,
    radius,
    cd,
    windX,
    currentTrajectory,
    vacuumTrajectory,
  ]);

  // Current mechanical energies
  const currSpeed = Math.hypot(currentProjectile.vx, currentProjectile.vy);
  const kineticE = 0.5 * mass * currSpeed * currSpeed;
  const potentialE = mass * gravity * Math.max(0, currentProjectile.y);
  const totalE = kineticE + potentialE;
  const initialTotalE = 0.5 * mass * v0 * v0 + mass * gravity * h0;
  const dissipatedE = Math.max(0, initialTotalE - totalE);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Stage: Canvas & Real-time Live HUD (lg:col-span-8) */}
      <div className="lg:col-span-8 space-y-4">
        <div className="bg-[#0a0d14] border border-[#1a1f2e] rounded-2xl overflow-hidden shadow-2xl">
          {/* Top bar with quick stats */}
          <div className="px-5 py-3 border-b border-[#1a1f2e] bg-[#0a0d14] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#ffffff] font-semibold text-xs tracking-wider uppercase font-mono">
              <Compass className="w-4 h-4" />
              <span>Ballistics Flight Dynamics (RK4 Solver with Drag)</span>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-[#a0aec0]">
                <span className="opacity-60 text-[10px] uppercase tracking-wider">Hits:</span>
                <span className="text-[#ffffff] font-bold bg-[#ffffff15] px-2 py-0.5 rounded border border-[#ffffff30]">
                  {hitCount}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[#a0aec0]">
                <span className="opacity-60 text-[10px] uppercase tracking-wider">State:</span>
                <span className={`font-semibold uppercase tracking-wider text-[10px] ${isLanded ? 'text-[#cccccc]' : 'text-[#ffffff]'}`}>
                  {isLanded ? 'Landed' : 'In Flight'}
                </span>
              </div>
              <button
                id="fire-projectile-btn"
                onClick={fireProjectile}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ffffff] hover:bg-[#ffffff]/85 text-[#05070a] font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-[0_0_12px_rgba(255,255,255,0.35)] active:scale-95"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Fire</span>
              </button>
            </div>
          </div>

          {/* 2D Canvas */}
          <div className="relative w-full bg-[#05070a]">
            <canvas ref={canvasRef} className="w-full block cursor-crosshair" />

            {/* Vectors Legend overlay */}
            <div className="absolute top-3 left-3 bg-[#0a0d14]/90 backdrop-blur-md px-3 py-2 rounded-xl border border-[#1a1f2e] text-[10px] font-mono space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[#ffffff] rounded-full shadow-[0_0_6px_#ffffff]" />
                <span className="text-white">Velocity Vector (v)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[#cccccc] rounded-full shadow-[0_0_6px_#cccccc]" />
                <span className="text-white">Air Drag Force (Fd)</span>
              </div>
              {showVacuumComparison && airDensity > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 border-b border-dashed border-[#a0aec0]" />
                  <span className="text-[#a0aec0]">Vacuum Parabola</span>
                </div>
              )}
            </div>
          </div>

          {/* Real-time telemetry gauge cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 p-3.5 bg-[#080a0f] border-t border-[#1a1f2e]">
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Flight Time</div>
              <div className="text-sm font-mono font-bold text-white">
                {currentProjectile.t.toFixed(2)} <span className="text-[10px] font-normal text-[#a0aec0]/70">s</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Range (x)</div>
              <div className="text-sm font-mono font-bold text-[#ffffff]">
                {currentProjectile.x.toFixed(1)} <span className="text-[10px] font-normal text-[#a0aec0]/70">m</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Altitude (y)</div>
              <div className="text-sm font-mono font-bold text-[#ffffff]">
                {currentProjectile.y.toFixed(1)} <span className="text-[10px] font-normal text-[#a0aec0]/70">m</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Speed (|v|)</div>
              <div className="text-sm font-mono font-bold text-white">
                {currSpeed.toFixed(1)} <span className="text-[10px] font-normal text-[#a0aec0]/70">m/s</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#cccccc] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Drag Range</div>
              <div className="text-sm font-mono font-bold text-[#cccccc]">
                {currentTrajectory.range.toFixed(1)} <span className="text-[10px] font-normal text-[#a0aec0]/70">m</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#1a1f2e] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Vacuum Range</div>
              <div className="text-sm font-mono font-bold text-[#a0aec0]">
                {vacuumTrajectory.range.toFixed(1)} <span className="text-[10px] font-normal text-[#a0aec0]/70">m</span>
              </div>
            </div>
          </div>

          {/* Energy breakdown bar */}
          <div className="px-5 py-2.5 bg-[#0a0d14] border-t border-[#1a1f2e]">
            <div className="flex items-center justify-between text-xs text-[#a0aec0] mb-1.5 font-mono text-[10px]">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ffffff] shadow-[0_0_6px_#ffffff]" />
                  <span className="text-white">Kinetic: {kineticE.toFixed(0)} J</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
                  <span className="text-white">Potential: {potentialE.toFixed(0)} J</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#cccccc] shadow-[0_0_6px_#cccccc]" />
                  <span className="text-white">Drag Work Lost: {dissipatedE.toFixed(0)} J</span>
                </span>
              </div>
              <span className="font-mono text-[#a0aec0]/70 text-[10px] uppercase">Total Mech E: {totalE.toFixed(0)} J</span>
            </div>
            <div className="w-full h-1.5 bg-[#05070a] rounded-full overflow-hidden flex border border-[#1a1f2e]">
              <div 
                className="bg-[#ffffff] h-full transition-all duration-75"
                style={{ width: `${Math.min(100, (kineticE / (initialTotalE || 1)) * 100)}%` }}
              />
              <div 
                className="bg-[#38bdf8] h-full transition-all duration-75"
                style={{ width: `${Math.min(100, (potentialE / (initialTotalE || 1)) * 100)}%` }}
              />
              <div 
                className="bg-[#cccccc] h-full transition-all duration-75"
                style={{ width: `${Math.min(100, (dissipatedE / (initialTotalE || 1)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Controls Deck (lg:col-span-4) - Sticky beside canvas */}
      <div className="lg:col-span-4 lg:sticky lg:top-16 space-y-3.5 max-h-[calc(100vh-6.5rem)] lg:overflow-y-auto pr-1">
        {/* Curated Presets Bar */}
        <div className="p-3 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-2">
          <div className="text-[10px] uppercase font-mono tracking-widest text-[#ffffff] font-semibold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#ffffff]" />
            <span>Instant Presets</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => { setV0(90); setAngleDeg(22); setWindX(0); setAirDensity(1.225); setGravity(9.81); }}
              className="px-2.5 py-1.5 rounded-lg bg-[#111622] hover:bg-[#1a1f2e] border border-[#1a1f2e] text-left text-xs text-white font-mono hover:border-[#ffffff]/40 transition-all"
            >
              <div className="font-bold text-[#ffffff]">🎯 Sniper Flat</div>
              <div className="text-[9px] text-[#a0aec0]">v₀: 90 m/s, θ: 22°</div>
            </button>
            <button
              onClick={() => { setV0(65); setAngleDeg(45); setGravity(3.72); setAirDensity(0.02); setWindX(0); }}
              className="px-2.5 py-1.5 rounded-lg bg-[#111622] hover:bg-[#1a1f2e] border border-[#1a1f2e] text-left text-xs text-white font-mono hover:border-[#ffffff]/40 transition-all"
            >
              <div className="font-bold text-[#cccccc]">🚀 Mars Howitzer</div>
              <div className="text-[9px] text-[#a0aec0]">Low G, thin atmosphere</div>
            </button>
            <button
              onClick={() => { setV0(50); setAngleDeg(40); setWindX(-15); setAirDensity(1.225); }}
              className="px-2.5 py-1.5 rounded-lg bg-[#111622] hover:bg-[#1a1f2e] border border-[#1a1f2e] text-left text-xs text-white font-mono hover:border-[#ffffff]/40 transition-all"
            >
              <div className="font-bold text-amber-400">🌪️ Headwind Gale</div>
              <div className="text-[9px] text-[#a0aec0]">wₓ: -15 m/s drag</div>
            </button>
            <button
              onClick={() => { setV0(45); setAngleDeg(45); setAirDensity(0); setShowVacuumComparison(true); }}
              className="px-2.5 py-1.5 rounded-lg bg-[#111622] hover:bg-[#1a1f2e] border border-[#1a1f2e] text-left text-xs text-white font-mono hover:border-[#ffffff]/40 transition-all"
            >
              <div className="font-bold text-emerald-400">🪐 Vacuum Orbit</div>
              <div className="text-[9px] text-[#a0aec0]">ρ: 0, pure parabola</div>
            </button>
          </div>
        </div>

        {/* Card 1: Launch Kinematics */}
        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1f2e]">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#ffffff]" />
              01 // Launch Kinematics
            </span>
          </div>

          {/* Velocity */}
          <ParameterControl
            id="input-velocity"
            label="Launch Velocity (v₀)"
            value={v0}
            min={5}
            max={120}
            step={1}
            unit="m/s"
            onChange={setV0}
            accentColor="#ffffff"
          />

          {/* Angle */}
          <ParameterControl
            id="input-angle"
            label="Launch Angle (θ)"
            value={angleDeg}
            min={0}
            max={90}
            step={1}
            unit="°"
            onChange={setAngleDeg}
            accentColor="#ffffff"
            subLabel={
              <div className="flex justify-between">
                <span>0° (Flat)</span>
                <span>45° (Max vacuum)</span>
                <span>90° (Vertical)</span>
              </div>
            }
          />

          {/* Initial Height */}
          <ParameterControl
            id="input-height"
            label="Launch Height (y₀)"
            value={h0}
            min={0}
            max={40}
            step={1}
            unit="m"
            onChange={setH0}
            accentColor="#ffffff"
          />

          {/* Wind Speed */}
          <ParameterControl
            id="input-wind"
            label="Head/Tail Wind (wₓ)"
            value={windX}
            min={-20}
            max={20}
            step={1}
            unit="m/s"
            onChange={setWindX}
            accentColor="#ffffff"
            formatDisplay={(val) => val > 0 ? `+${val} (Tail)` : val < 0 ? `${val} (Head)` : 'Calm'}
          />
        </div>

        {/* Card 2: Aerodynamics & Atmosphere */}
        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1f2e]">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
              <Wind className="w-3.5 h-3.5 text-[#ffffff]" />
              02 // Aerodynamics & Medium
            </span>
          </div>

          {/* Celestial Gravity Preset */}
          <div>
            <label className="text-xs text-[#a0aec0] block mb-1">Gravity World</label>
            <select
              id="select-gravity"
              value={gravity}
              onChange={(e) => setGravity(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 bg-[#111622] border border-[#1a1f2e] rounded-lg text-xs text-white font-mono focus:outline-none focus:border-[#ffffff]"
            >
              {GRAVITY_PRESETS.map((p) => (
                <option key={p.name} value={p.value} className="bg-[#0a0d14]">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Air Density */}
          <div>
            <ParameterControl
              id="input-density"
              label="Air Density (ρ)"
              value={airDensity}
              min={0}
              max={2.5}
              step={0.05}
              precision={3}
              unit="kg/m³"
              onChange={setAirDensity}
              accentColor="#ffffff"
            />
            <div className="flex gap-2 mt-1.5">
              <button
                id="preset-vacuum-btn"
                onClick={() => setAirDensity(0)}
                className={`px-2 py-0.5 text-[9px] rounded border uppercase font-mono ${airDensity === 0 ? 'bg-[#ffffff20] text-[#ffffff] border-[#ffffff40]' : 'bg-[#111622] text-[#a0aec0] border-[#1a1f2e]'}`}
              >
                Vacuum (0)
              </button>
              <button
                id="preset-earth-btn"
                onClick={() => setAirDensity(1.225)}
                className={`px-2 py-0.5 text-[9px] rounded border uppercase font-mono ${airDensity === 1.225 ? 'bg-[#ffffff20] text-[#ffffff] border-[#ffffff40]' : 'bg-[#111622] text-[#a0aec0] border-[#1a1f2e]'}`}
              >
                Earth (1.225)
              </button>
            </div>
          </div>

          {/* Projectile Mass & Drag Shape */}
          <div className="grid grid-cols-2 gap-2.5">
            <ParameterControl
              id="input-mass"
              label="Mass (m)"
              value={mass}
              min={0.1}
              max={25}
              step={0.1}
              unit="kg"
              onChange={setMass}
              accentColor="#ffffff"
            />
            <ParameterControl
              id="input-cd"
              label="Drag (Cd)"
              value={cd}
              min={0.05}
              max={1.2}
              step={0.01}
              onChange={setCd}
              accentColor="#ffffff"
            />
          </div>

          {/* Display toggles */}
          <div className="pt-2 border-t border-[#1a1f2e] space-y-1.5">
            <label className="flex items-center gap-2 text-xs text-[#a0aec0] hover:text-white cursor-pointer transition-colors">
              <input
                id="toggle-vacuum-curve"
                type="checkbox"
                checked={showVacuumComparison}
                onChange={(e) => setShowVacuumComparison(e.target.checked)}
                className="accent-[#ffffff] rounded"
              />
              <span>Overlay Ideal Vacuum Parabola</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-[#a0aec0] hover:text-white cursor-pointer transition-colors">
              <input
                id="toggle-vectors"
                type="checkbox"
                checked={showVectors}
                onChange={(e) => setShowVectors(e.target.checked)}
                className="accent-[#ffffff] rounded"
              />
              <span>Render Velocity & Drag Vectors</span>
            </label>
          </div>
        </div>

        {/* Card 3: Target Practice & Mission */}
        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1f2e]">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
              <TargetIcon className="w-3.5 h-3.5 text-[#cccccc]" />
              03 // Target Bullseye
            </span>
          </div>

          {/* Target Distance */}
          <ParameterControl
            id="input-target-x"
            label="Target Distance (X)"
            value={targetX}
            min={20}
            max={250}
            step={5}
            unit="m"
            onChange={setTargetX}
            accentColor="#cccccc"
          />

          {/* Target Elevation */}
          <ParameterControl
            id="input-target-y"
            label="Target Elevation (Y)"
            value={targetY}
            min={0}
            max={35}
            step={1}
            unit="m"
            onChange={setTargetY}
            accentColor="#cccccc"
          />

          <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#cccccc] border-y border-r border-[#1a1f2e] text-xs font-mono">
            <div className="text-[9px] uppercase opacity-50 tracking-wider text-[#a0aec0] mb-0.5">Miss / Hit Margin:</div>
            <div className="flex items-center justify-between">
              <span className="text-[#a0aec0]">Distance:</span>
              <span className={`font-bold ${Math.abs(currentTrajectory.range - targetX) < targetRadius ? 'text-[#ffffff]' : 'text-[#cccccc]'}`}>
                {(currentTrajectory.range - targetX).toFixed(1)} m
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
