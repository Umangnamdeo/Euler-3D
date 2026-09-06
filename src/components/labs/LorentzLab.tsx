import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  Magnet, 
  RotateCcw, 
  Globe, 
  Zap, 
  ShieldAlert, 
  Activity, 
  Layers, 
  Sparkles 
} from 'lucide-react';
import { SimulationState } from '../../types';
import { ParameterControl } from '../ParameterControl';
import { 
  BorisParticle, 
  getMagneticField, 
  stepBorisParticle 
} from '../../utils/physics';

interface LorentzLabProps {
  simState: SimulationState;
}

export const LorentzLab: React.FC<LorentzLabProps> = ({ simState }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Field & Particle Configuration
  const [fieldMode, setFieldMode] = useState<'dipole' | 'mirrorBottle'>('dipole');
  const [fieldStrength, setFieldStrength] = useState<number>(1.2);
  const [particleSpecies, setParticleSpecies] = useState<'electron' | 'proton' | 'swarm'>('electron');
  const [pitchAngleDeg, setPitchAngleDeg] = useState<number>(55); // degrees (outside loss cone)
  const [showFieldLines, setShowFieldLines] = useState<boolean>(true);
  const [showLossCone, setShowLossCone] = useState<boolean>(true);

  // Live telemetry
  const [telemetry, setTelemetry] = useState({
    bounces: 0,
    mu: 0.85,
    bMag: 1.2,
    vPerp: 2.5,
    vParallel: 1.8,
    isEscaped: false,
  });

  // Boris particles reference
  const particlesRef = useRef<BorisParticle[]>([]);
  const bounceCountRef = useRef<number>(0);
  const prevVzSignRef = useRef<number>(1);
  const trailRef = useRef<THREE.Vector3[]>([]);

  // Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const trailLineRef = useRef<THREE.Line | null>(null);
  const particleMeshRef = useRef<THREE.Mesh | null>(null);
  const swarmInstancedRef = useRef<THREE.InstancedMesh | null>(null);
  const fieldLinesGroupRef = useRef<THREE.Group | null>(null);

  // Initialize particles
  const resetParticles = () => {
    bounceCountRef.current = 0;
    trailRef.current = [];

    const rad = (pitchAngleDeg * Math.PI) / 180;
    const vTotal = 3.5;
    const vPerp = vTotal * Math.sin(rad);
    const vPara = vTotal * Math.cos(rad);

    const charge = particleSpecies === 'electron' ? -1.0 : 1.0;
    const mass = particleSpecies === 'electron' ? 1.0 : 4.0;

    if (particleSpecies === 'swarm') {
      const swarm: BorisParticle[] = [];
      const num = 24;
      for (let i = 0; i < num; i++) {
        const phi = (i / num) * Math.PI * 2;
        const r = fieldMode === 'dipole' ? 3.0 : 1.2;
        swarm.push({
          x: r * Math.cos(phi),
          y: r * Math.sin(phi),
          z: (Math.random() - 0.5) * 0.4,
          vx: -vPerp * Math.sin(phi) + (Math.random() - 0.5) * 0.5,
          vy: vPerp * Math.cos(phi) + (Math.random() - 0.5) * 0.5,
          vz: vPara * (Math.random() > 0.5 ? 1 : -1),
          q: charge,
          m: mass,
        });
      }
      particlesRef.current = swarm;
    } else {
      // Single particle
      const r = fieldMode === 'dipole' ? 3.2 : 1.4;
      particlesRef.current = [
        {
          x: r,
          y: 0,
          z: 0,
          vx: 0,
          vy: vPerp,
          vz: vPara,
          q: charge,
          m: mass,
        },
      ];
    }
  };

  // Re-initialize particles on param change
  useEffect(() => {
    resetParticles();
  }, [fieldMode, particleSpecies, pitchAngleDeg, fieldStrength]);

  // Setup Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#05070a');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(7, 5, 8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambient = new THREE.AmbientLight('#ffffff', 0.6);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight('#38bdf8', 2.0);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Center geometry
    if (fieldMode === 'dipole') {
      // Planet Earth sphere at dipole center
      const planetGeo = new THREE.SphereGeometry(1.2, 32, 32);
      const planetMat = new THREE.MeshStandardMaterial({
        color: '#1e3a8a',
        roughness: 0.6,
        metalness: 0.2,
      });
      const planet = new THREE.Mesh(planetGeo, planetMat);
      scene.add(planet);

      // Continents / clouds glow ring
      const atmoGeo = new THREE.SphereGeometry(1.24, 32, 32);
      const atmoMat = new THREE.MeshBasicMaterial({
        color: '#38bdf8',
        transparent: true,
        opacity: 0.25,
        wireframe: true,
      });
      const atmo = new THREE.Mesh(atmoGeo, atmoMat);
      scene.add(atmo);
    } else {
      // Magnetic Mirror Bottle Coils (two golden rings at z = +/- 3.0)
      [-2.8, 2.8].forEach((zPos) => {
        const torusGeo = new THREE.TorusGeometry(1.8, 0.12, 16, 48);
        torusGeo.rotateX(Math.PI / 2);
        const torusMat = new THREE.MeshStandardMaterial({
          color: '#fbbf24',
          metalness: 0.8,
          roughness: 0.2,
        });
        const coil = new THREE.Mesh(torusGeo, torusMat);
        coil.position.set(0, 0, zPos);
        scene.add(coil);
      });
    }

    // 3D Magnetic Field Lines
    const fieldGroup = new THREE.Group();
    scene.add(fieldGroup);
    fieldLinesGroupRef.current = fieldGroup;

    const numLines = 16;
    for (let i = 0; i < numLines; i++) {
      const phi = (i / numLines) * Math.PI * 2;
      const pts: THREE.Vector3[] = [];

      if (fieldMode === 'dipole') {
        const L_shell = 3.6;
        for (let theta = -Math.PI / 2.3; theta <= Math.PI / 2.3; theta += 0.08) {
          const r = L_shell * Math.cos(theta) * Math.cos(theta);
          const x = r * Math.cos(theta) * Math.cos(phi);
          const y = r * Math.cos(theta) * Math.sin(phi);
          const z = r * Math.sin(theta);
          pts.push(new THREE.Vector3(x, y, z));
        }
      } else {
        // Bottle field lines curving into bottlenecks
        for (let z = -3.5; z <= 3.5; z += 0.2) {
          const r = 1.0 + 0.4 * (1 - (z * z) / 12);
          pts.push(new THREE.Vector3(r * Math.cos(phi), r * Math.sin(phi), z));
        }
      }

      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const lineMat = new THREE.LineBasicMaterial({
        color: '#0284c7',
        transparent: true,
        opacity: 0.35,
      });
      fieldGroup.add(new THREE.Line(lineGeo, lineMat));
    }

    // Particle Trajectory Ribbon
    const trailGeo = new THREE.BufferGeometry();
    const trailMat = new THREE.LineBasicMaterial({
      color: '#38bdf8',
      transparent: true,
      opacity: 0.85,
    });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    scene.add(trailLine);
    trailLineRef.current = trailLine;

    // Single particle sphere mesh
    const partGeo = new THREE.SphereGeometry(0.14, 16, 16);
    const partMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const particleMesh = new THREE.Mesh(partGeo, partMat);
    scene.add(particleMesh);
    particleMeshRef.current = particleMesh;

    // Swarm mesh (Instanced)
    const swarmGeo = new THREE.SphereGeometry(0.09, 12, 12);
    const swarmMat = new THREE.MeshBasicMaterial({ color: '#f43f5e' });
    const swarmMesh = new THREE.InstancedMesh(swarmGeo, swarmMat, 30);
    scene.add(swarmMesh);
    swarmInstancedRef.current = swarmMesh;

    // Orbit controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let theta = Math.PI / 4;
    let phi = Math.PI / 6;
    let camRadius = 10.0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      theta -= dx * 0.008;
      phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, phi + dy * 0.008));

      camera.position.x = camRadius * Math.cos(phi) * Math.sin(theta);
      camera.position.y = camRadius * Math.sin(phi);
      camera.position.z = camRadius * Math.cos(phi) * Math.cos(theta);
      camera.lookAt(0, 0, 0);
    };

    const onMouseUp = () => (isDragging = false);
    const onWheel = (e: WheelEvent) => {
      camRadius = Math.max(4.0, Math.min(18, camRadius + e.deltaY * 0.008));
      camera.position.x = camRadius * Math.cos(phi) * Math.sin(theta);
      camera.position.y = camRadius * Math.sin(phi);
      camera.position.z = camRadius * Math.cos(phi) * Math.cos(theta);
      camera.lookAt(0, 0, 0);
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel);

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [fieldMode]);

  // Simulation integration loop
  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.035);
      lastTs = now;

      if (simState.isRunning && particlesRef.current.length > 0) {
        const timeScale = simState.timeScale;
        // Substep Boris scheme
        const subSteps = 8;
        const subDt = (dt * timeScale) / subSteps;

        for (let s = 0; s < subSteps; s++) {
          particlesRef.current = particlesRef.current.map((p) => {
            const next = stepBorisParticle(p, fieldMode, fieldStrength, subDt);

            // Detect bounce (reversal of parallel velocity along Z)
            const currVzSign = Math.sign(next.vz);
            if (currVzSign !== 0 && currVzSign !== prevVzSignRef.current) {
              bounceCountRef.current += 1;
              prevVzSignRef.current = currVzSign;
            }

            return next;
          });
        }

        const primary = particlesRef.current[0];
        if (primary) {
          // In Three.js, Y is up, Z is depth. We map physics Z -> Three Y for dipole alignment!
          const threePos = new THREE.Vector3(primary.x, primary.z, primary.y);

          if (particleMeshRef.current) {
            particleMeshRef.current.position.copy(threePos);
            particleMeshRef.current.visible = particleSpecies !== 'swarm';
          }

          if (particleSpecies !== 'swarm') {
            trailRef.current.push(threePos.clone());
            if (trailRef.current.length > 400) {
              trailRef.current.shift();
            }
            if (trailLineRef.current) {
              trailLineRef.current.geometry.setFromPoints(trailRef.current);
              trailLineRef.current.visible = true;
            }
          } else if (trailLineRef.current) {
            trailLineRef.current.visible = false;
          }

          // Swarm update
          if (swarmInstancedRef.current && particleSpecies === 'swarm') {
            swarmInstancedRef.current.visible = true;
            const dummy = new THREE.Object3D();
            particlesRef.current.forEach((p, idx) => {
              dummy.position.set(p.x, p.z, p.y);
              dummy.updateMatrix();
              swarmInstancedRef.current!.setMatrixAt(idx, dummy.matrix);
            });
            swarmInstancedRef.current.instanceMatrix.needsUpdate = true;
          } else if (swarmInstancedRef.current) {
            swarmInstancedRef.current.visible = false;
          }

          // Compute magnetic field and magnetic moment
          const [bx, by, bz] = getMagneticField([primary.x, primary.y, primary.z], fieldMode, fieldStrength);
          const bMag = Math.hypot(bx, by, bz);

          const vPerp = Math.hypot(primary.vx, primary.vy);
          const vParallel = Math.abs(primary.vz);
          // First adiabatic invariant: mu = m * v_perp^2 / (2 * B)
          const mu = (0.5 * primary.m * vPerp * vPerp) / Math.max(0.001, bMag);

          // Escaped check (if particle enters loss cone and reaches pole)
          const isEscaped = Math.abs(primary.z) > 4.5 || Math.hypot(primary.x, primary.y) > 7.0;

          setTelemetry({
            bounces: bounceCountRef.current,
            mu,
            bMag,
            vPerp,
            vParallel,
            isEscaped,
          });
        }
      }

      if (fieldLinesGroupRef.current) {
        fieldLinesGroupRef.current.visible = showFieldLines;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [simState.isRunning, simState.timeScale, fieldMode, fieldStrength, particleSpecies, showFieldLines]);

  // Loss cone calculation: sin^2(alpha_loss) = B_min / B_max
  const lossConeAngle = (Math.asin(Math.sqrt(0.35 / (fieldStrength * 2.5))) * 180) / Math.PI;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Stage: 3D WebGL Canvas & Real-time Telemetry (lg:col-span-8) */}
      <div className="lg:col-span-8 space-y-4">
        <div className="bg-[#0a0d14] border border-[#1a1f2e] rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="px-5 py-3 border-b border-[#1a1f2e] bg-[#0a0d14] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#ffffff] font-semibold text-xs tracking-wider uppercase font-mono">
              <Magnet className="w-4 h-4" />
              <span>Lorentz Force & Magnetic Mirroring (Boris Integrator)</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111622] border border-[#1a1f2e] text-xs font-mono">
                <span className="text-[#a0aec0]">Reflections:</span>
                <span className="text-[#ffffff] font-bold">{telemetry.bounces}</span>
              </div>
              <button
                id="reset-lorentz-btn"
                onClick={resetParticles}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#ffffff] hover:bg-[#ffffff]/80 text-[#05070a] font-bold rounded-lg text-xs uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(255,255,255,0.3)]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* 3D Viewport */}
          <div className="relative w-full h-[460px] bg-[#05070a]">
            <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* 3D Legend */}
            <div className="absolute top-3 left-3 bg-[#0a0d14]/90 backdrop-blur-md px-3 py-2 rounded-xl border border-[#1a1f2e] text-[10px] font-mono space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[#ffffff] rounded-full shadow-[0_0_6px_#ffffff]" />
                <span className="text-white">Helical Trajectory</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[#cccccc] rounded-full shadow-[0_0_6px_#cccccc]" />
                <span className="text-white">Magnetic Flux (B)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[#888888] rounded-full shadow-[0_0_6px_#888888]" />
                <span className="text-white">Mirror Reflection Nodes</span>
              </div>
              <div className="text-[9px] text-[#a0aec0]/60 pt-0.5">
                • Drag to rotate • Scroll to zoom
              </div>
            </div>

            {/* Escape / Loss Cone Status Badge */}
            <div className="absolute bottom-3 left-3 bg-[#0a0d14]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#1a1f2e] text-xs font-mono">
              <span className="text-[#a0aec0]">Confinement: </span>
              <span className={telemetry.isEscaped ? 'text-[#888888] font-bold' : 'text-[#ffffff] font-bold'}>
                {telemetry.isEscaped ? 'Loss Cone Breach (Escaped)' : 'Trapped in Magnetic Bottle'}
              </span>
            </div>
          </div>

          {/* Real-time telemetry cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 p-3.5 bg-[#080a0f] border-t border-[#1a1f2e]">
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Adiabatic (μ)</div>
              <div className="text-sm font-mono font-bold text-[#ffffff]">
                {telemetry.mu.toFixed(3)} <span className="text-[10px] font-normal text-[#a0aec0]/70">J/T</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Local (|B|)</div>
              <div className="text-sm font-mono font-bold text-white">
                {telemetry.bMag.toFixed(2)} <span className="text-[10px] font-normal text-[#a0aec0]/70">T</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Perp (v_⊥)</div>
              <div className="text-sm font-mono font-bold text-[#ffffff]">
                {telemetry.vPerp.toFixed(2)} <span className="text-[10px] font-normal text-[#a0aec0]/70">m/s</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#cccccc] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Parallel (v_∥)</div>
              <div className="text-sm font-mono font-bold text-[#cccccc]">
                {telemetry.vParallel.toFixed(2)} <span className="text-[10px] font-normal text-[#a0aec0]/70">m/s</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#cccccc] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Loss Cone α</div>
              <div className="text-sm font-mono font-bold text-white">
                {lossConeAngle.toFixed(1)}°
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Method</div>
              <div className="text-[10px] font-mono font-bold text-[#ffffff] mt-0.5 px-1.5 py-0.5 rounded border border-[#ffffff30] bg-[#ffffff15] inline-block">
                Boris (Symplectic)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Controls Deck (lg:col-span-4) */}
      <div className="lg:col-span-4 lg:sticky lg:top-16 space-y-3.5 max-h-[calc(100vh-6.5rem)] lg:overflow-y-auto pr-1">
        {/* Card 1: Magnetic Topology */}
        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1f2e]">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#ffffff]" />
              01 // Field Geometry
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              id="field-dipole-btn"
              onClick={() => setFieldMode('dipole')}
              className={`p-2.5 rounded-xl text-left border transition-all ${
                fieldMode === 'dipole'
                  ? 'bg-[#ffffff15] border-[#ffffff] text-[#ffffff] shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                  : 'bg-[#111622] border-[#1a1f2e] text-[#a0aec0]'
              }`}
            >
              <div className="text-xs font-bold">Planetary Dipole</div>
              <div className="text-[9px] text-[#a0aec0] mt-0.5">Earth Radiation Belts</div>
            </button>
            <button
              id="field-mirror-btn"
              onClick={() => setFieldMode('mirrorBottle')}
              className={`p-2.5 rounded-xl text-left border transition-all ${
                fieldMode === 'mirrorBottle'
                  ? 'bg-[#ffffff15] border-[#ffffff] text-[#ffffff] shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                  : 'bg-[#111622] border-[#1a1f2e] text-[#a0aec0]'
              }`}
            >
              <div className="text-xs font-bold">Mirror Bottle</div>
              <div className="text-[9px] text-[#a0aec0] mt-0.5">Dual Coaxial Coils</div>
            </button>
          </div>

          {/* Magnetic Field Strength */}
          <ParameterControl
            id="input-field-strength"
            label="Field Intensity (B₀)"
            value={fieldStrength}
            min={0.5}
            max={3.0}
            step={0.1}
            unit="T"
            onChange={setFieldStrength}
            accentColor="#ffffff"
          />

          <div className="pt-1.5 border-t border-[#1a1f2e]">
            <label className="flex items-center gap-2 text-xs text-[#a0aec0] hover:text-white cursor-pointer transition-colors">
              <input
                id="toggle-field-lines"
                type="checkbox"
                checked={showFieldLines}
                onChange={(e) => setShowFieldLines(e.target.checked)}
                className="accent-[#ffffff] rounded"
              />
              <span>Render 3D Magnetic Flux Lines</span>
            </label>
          </div>
        </div>

        {/* Card 2: Particle Species & Energy */}
        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1f2e]">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#cccccc]" />
              02 // Particle Source & Angle
            </span>
          </div>

          {/* Particle Type */}
          <div>
            <label className="text-xs text-[#a0aec0] block mb-1">Particle Species</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'electron', label: 'Electron (e⁻)' },
                { id: 'proton', label: 'Proton (p⁺)' },
                { id: 'swarm', label: 'Plasma Swarm' },
              ].map((p) => (
                <button
                  key={p.id}
                  id={`particle-type-${p.id}`}
                  onClick={() => setParticleSpecies(p.id as any)}
                  className={`p-2 rounded-lg text-xs font-mono border transition-all ${
                    particleSpecies === p.id
                      ? 'bg-[#cccccc20] text-[#cccccc] border-[#cccccc] font-bold shadow-[0_0_8px_rgba(204,204,204,0.3)]'
                      : 'bg-[#111622] text-[#a0aec0] border-[#1a1f2e]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pitch Angle */}
          <ParameterControl
            id="input-pitch-angle"
            label="Equatorial Pitch Angle (α)"
            value={pitchAngleDeg}
            min={15}
            max={80}
            step={1}
            unit="°"
            onChange={setPitchAngleDeg}
            accentColor="#ffffff"
            subLabel={
              <div className="flex justify-between">
                <span>&lt; {lossConeAngle.toFixed(0)}° (Loss Cone)</span>
                <span>&gt; {lossConeAngle.toFixed(0)}° (Trapped)</span>
              </div>
            }
          />
        </div>

        {/* Card 3: Plasma Physics Insights */}
        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1f2e]">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#ffffff]" />
              03 // Mirror Principles
            </span>
          </div>

          <div className="p-2.5 bg-[#111622] rounded-xl border border-[#1a1f2e] text-xs font-mono space-y-1.5">
            <div>
              <div className="text-[#a0aec0] text-[9px] uppercase tracking-wider">Mirror Ratio (R_m):</div>
              <div className="text-white font-bold">B_max / B_min ≈ 3.42</div>
            </div>
            <div>
              <div className="text-[#a0aec0] text-[9px] uppercase tracking-wider">First Adiabatic Invariant:</div>
              <div className="text-[#ffffff] font-bold">μ = E_⊥ / B = constant</div>
            </div>
            <p className="text-[10px] text-[#a0aec0] font-sans leading-relaxed pt-1">
              As particle approaches converging flux lines (higher B), energy conservation forces $v_\parallel \to v_\perp$ until $v_\parallel = 0$, triggering reflection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
