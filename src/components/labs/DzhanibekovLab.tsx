import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  RotateCw, 
  Flame, 
  RotateCcw, 
  Compass, 
  ShieldCheck, 
  Activity, 
  Eye, 
  Sliders 
} from 'lucide-react';
import { SimulationState } from '../../types';
import { ParameterControl } from '../ParameterControl';
import { 
  InertiaTensor, 
  RigidBodyState, 
  stepDzhanibekovRK4, 
  getAngularMomentumLab 
} from '../../utils/physics';

interface DzhanibekovLabProps {
  simState: SimulationState;
}

export const DzhanibekovLab: React.FC<DzhanibekovLabProps> = ({ simState }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Moments of Inertia: I1 > I2 > I3
  const [inertia, setInertia] = useState<InertiaTensor>({
    I1: 3.2,
    I2: 2.0, // Intermediate axis
    I3: 1.0,
  });

  const [spinAxis, setSpinAxis] = useState<'intermediate' | 'major' | 'minor'>('intermediate');
  const [spinSpeed, setSpinSpeed] = useState<number>(6.0); // rad/s
  const [showInertiaEllipsoid, setShowInertiaEllipsoid] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showTrail, setShowTrail] = useState<boolean>(true);

  // State metrics
  const [telemetry, setTelemetry] = useState({
    w1: 0,
    w2: 6.0,
    w3: 0,
    energy: 36,
    L_mag: 12,
    flipCount: 0,
  });

  // Three.js and simulation references
  const rigidStateRef = useRef<RigidBodyState>({
    w1: 0.02,
    w2: 6.0,
    w3: 0,
    qw: 1,
    qx: 0,
    qy: 0,
    qz: 0,
  });

  const flipCountRef = useRef<number>(0);
  const prevW2SignRef = useRef<number>(1);
  const trailPointsRef = useRef<THREE.Vector3[]>([]);

  // Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const tHandleGroupRef = useRef<THREE.Group | null>(null);
  const ellipsoidMeshRef = useRef<THREE.Mesh | null>(null);
  const lArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const wArrowRef = useRef<THREE.ArrowHelper | null>(null);
  const trailLineRef = useRef<THREE.Line | null>(null);

  // Reset rotation state
  const resetOrientation = (targetAxis: 'intermediate' | 'major' | 'minor' = spinAxis) => {
    let initialW1 = 0;
    let initialW2 = 0;
    let initialW3 = 0;

    if (targetAxis === 'intermediate') {
      // Spinning mainly around I2 with tiny perturbation on I1
      initialW2 = spinSpeed;
      initialW1 = 0.02;
      initialW3 = 0.005;
    } else if (targetAxis === 'major') {
      initialW1 = spinSpeed;
      initialW2 = 0.02;
      initialW3 = 0.01;
    } else {
      initialW3 = spinSpeed;
      initialW1 = 0.02;
      initialW2 = 0.01;
    }

    rigidStateRef.current = {
      w1: initialW1,
      w2: initialW2,
      w3: initialW3,
      qw: 1,
      qx: 0,
      qy: 0,
      qz: 0,
    };
    flipCountRef.current = 0;
    prevW2SignRef.current = Math.sign(initialW2) || 1;
    trailPointsRef.current = [];
  };

  const injectPerturbation = () => {
    rigidStateRef.current.w1 += 0.2;
    rigidStateRef.current.w3 += 0.15;
  };

  // Initialize Three.js scene
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#05070a');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(5.5, 4.5, 6.5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambient = new THREE.AmbientLight('#ffffff', 0.8);
    scene.add(ambient);

    const dirLight1 = new THREE.DirectionalLight('#38bdf8', 2.0);
    dirLight1.position.set(6, 10, 8);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight('#f59e0b', 1.0);
    dirLight2.position.set(-6, -4, -6);
    scene.add(dirLight2);

    // Subtle 3D Grid floor
    const grid = new THREE.GridHelper(10, 20, '#1e293b', '#0f172a');
    grid.position.y = -2.5;
    scene.add(grid);

    // 1. Build T-Handle 3D Model
    const tHandleGroup = new THREE.Group();
    scene.add(tHandleGroup);
    tHandleGroupRef.current = tHandleGroup;

    // Main central threaded shaft (aligned along Z axis)
    const shaftGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.4, 32);
    shaftGeo.rotateX(Math.PI / 2);
    const metalMat = new THREE.MeshStandardMaterial({
      color: '#94a3b8',
      metalness: 0.85,
      roughness: 0.25,
    });
    const shaft = new THREE.Mesh(shaftGeo, metalMat);
    tHandleGroup.add(shaft);

    // Perpendicular crossbar (aligned along Y axis - intermediate axis)
    const crossbarGeo = new THREE.CylinderGeometry(0.2, 0.2, 2.2, 32);
    const crossbarMat = new THREE.MeshStandardMaterial({
      color: '#0284c7',
      metalness: 0.7,
      roughness: 0.3,
    });
    const crossbar = new THREE.Mesh(crossbarGeo, crossbarMat);
    crossbar.position.set(0, 0, 0.9);
    tHandleGroup.add(crossbar);

    // Wing-nut wing lobes (distinguishing sides so 180° flip is obvious)
    const wingGeo = new THREE.BoxGeometry(0.8, 0.3, 0.15);
    const wingCyanMat = new THREE.MeshStandardMaterial({ color: '#06b6d4', roughness: 0.2 });
    const wingCyan = new THREE.Mesh(wingGeo, wingCyanMat);
    wingCyan.position.set(0, 1.0, 0.9);
    tHandleGroup.add(wingCyan);

    const wingRoseMat = new THREE.MeshStandardMaterial({ color: '#f43f5e', roughness: 0.2 });
    const wingRose = new THREE.Mesh(wingGeo, wingRoseMat);
    wingRose.position.set(0, -1.0, 0.9);
    tHandleGroup.add(wingRose);

    // Central hub nut
    const hubGeo = new THREE.SphereGeometry(0.32, 24, 24);
    const hubMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.9 });
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.position.set(0, 0, 0.9);
    tHandleGroup.add(hub);

    // 2. Inertia Ellipsoid (Wireframe)
    const ellipsoidGeo = new THREE.SphereGeometry(1.6, 32, 18);
    const ellipsoidMat = new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      wireframe: true,
      transparent: true,
      opacity: 0.15,
    });
    const ellipsoidMesh = new THREE.Mesh(ellipsoidGeo, ellipsoidMat);
    scene.add(ellipsoidMesh);
    ellipsoidMeshRef.current = ellipsoidMesh;

    // 3. Vector Arrows
    // Conserved Angular Momentum L (Gold Arrow in Lab Frame)
    const lArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      2.5,
      0xfbbf24,
      0.35,
      0.2
    );
    scene.add(lArrow);
    lArrowRef.current = lArrow;

    // Angular Velocity Omega (Cyan Arrow in Body/Lab Frame)
    const wArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      2.0,
      0x06b6d4,
      0.3,
      0.18
    );
    scene.add(wArrow);
    wArrowRef.current = wArrow;

    // 4. Polhode curve trail
    const trailGeo = new THREE.BufferGeometry();
    const trailMat = new THREE.LineBasicMaterial({
      color: '#f43f5e',
      transparent: true,
      opacity: 0.8,
      linewidth: 2,
    });
    const trailLine = new THREE.Line(trailGeo, trailMat);
    scene.add(trailLine);
    trailLineRef.current = trailLine;

    // Simple Mouse Orbiting
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let theta = Math.PI / 4;
    let phi = Math.PI / 6;
    let radius = 8.0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      theta -= deltaX * 0.008;
      phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, phi + deltaY * 0.008));

      camera.position.x = radius * Math.cos(phi) * Math.sin(theta);
      camera.position.y = radius * Math.sin(phi);
      camera.position.z = radius * Math.cos(phi) * Math.cos(theta);
      camera.lookAt(0, 0, 0);
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onWheel = (e: WheelEvent) => {
      radius = Math.max(3.5, Math.min(16, radius + e.deltaY * 0.008));
      camera.position.x = radius * Math.cos(phi) * Math.sin(theta);
      camera.position.y = radius * Math.sin(phi);
      camera.position.z = radius * Math.cos(phi) * Math.cos(theta);
      camera.lookAt(0, 0, 0);
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    domEl.addEventListener('wheel', onWheel);

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };
    window.addEventListener('resize', handleResize);

    resetOrientation();

    return () => {
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Main simulation integration loop
  useEffect(() => {
    let animId: number;
    let lastTs = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTs) / 1000, 0.035);
      lastTs = now;

      if (simState.isRunning) {
        const timeScale = simState.timeScale;
        // Substep RK4 integration for extreme accuracy
        const subSteps = 6;
        const subDt = (dt * timeScale) / subSteps;

        for (let i = 0; i < subSteps; i++) {
          const next = stepDzhanibekovRK4(rigidStateRef.current, inertia, subDt);

          // Detect flip: sign of w2 flips when rotating around intermediate axis!
          const currSign = Math.sign(next.w2);
          if (currSign !== 0 && currSign !== prevW2SignRef.current) {
            flipCountRef.current += 1;
            prevW2SignRef.current = currSign;
          }

          rigidStateRef.current = next;
        }

        const state = rigidStateRef.current;

        // Update 3D Three.js rotation
        if (tHandleGroupRef.current) {
          const q = new THREE.Quaternion(state.qx, state.qy, state.qz, state.qw);
          tHandleGroupRef.current.setRotationFromQuaternion(q);

          // Update vector arrows
          const { L_lab, L_mag, kineticEnergy } = getAngularMomentumLab(state, inertia);

          if (lArrowRef.current) {
            const lDir = new THREE.Vector3(L_lab[0], L_lab[1], L_lab[2]).normalize();
            lArrowRef.current.setDirection(lDir);
            lArrowRef.current.setLength(Math.min(3.2, L_mag * 0.25), 0.35, 0.18);
            lArrowRef.current.visible = showVectors;
          }

          if (wArrowRef.current) {
            // Angular velocity in world frame: rotate [w1, w2, w3]
            const wBody = new THREE.Vector3(state.w1, state.w2, state.w3);
            wBody.applyQuaternion(q);
            const wMag = wBody.length();
            wArrowRef.current.setDirection(wBody.normalize());
            wArrowRef.current.setLength(Math.min(3.0, wMag * 0.3), 0.3, 0.15);
            wArrowRef.current.visible = showVectors;

            // Append trail point
            if (showTrail) {
              const tipPos = wBody.clone().multiplyScalar(Math.min(2.8, wMag * 0.3));
              trailPointsRef.current.push(tipPos);
              if (trailPointsRef.current.length > 250) {
                trailPointsRef.current.shift();
              }
              if (trailLineRef.current) {
                trailLineRef.current.geometry.setFromPoints(trailPointsRef.current);
                trailLineRef.current.visible = true;
              }
            } else if (trailLineRef.current) {
              trailLineRef.current.visible = false;
            }
          }

          // Inertia Ellipsoid scaling
          if (ellipsoidMeshRef.current) {
            ellipsoidMeshRef.current.scale.set(
              Math.sqrt(kineticEnergy / inertia.I1) * 0.5,
              Math.sqrt(kineticEnergy / inertia.I2) * 0.5,
              Math.sqrt(kineticEnergy / inertia.I3) * 0.5
            );
            ellipsoidMeshRef.current.setRotationFromQuaternion(q);
            ellipsoidMeshRef.current.visible = showInertiaEllipsoid;
          }

          // Telemetry
          setTelemetry({
            w1: state.w1,
            w2: state.w2,
            w3: state.w3,
            energy: kineticEnergy,
            L_mag: L_mag,
            flipCount: flipCountRef.current,
          });
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [inertia, simState.isRunning, simState.timeScale, showVectors, showTrail, showInertiaEllipsoid]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Stage: 3D Three.js Viewport & Telemetry HUD (lg:col-span-8) */}
      <div className="lg:col-span-8 space-y-4">
        <div className="bg-[#0a0d14] border border-[#1a1f2e] rounded-2xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="px-5 py-3 border-b border-[#1a1f2e] bg-[#0a0d14] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#cccccc] font-semibold text-xs tracking-wider uppercase font-mono">
              <RotateCw className="w-4 h-4" />
              <span>3D Dzhanibekov Effect & Tennis Racket Theorem</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111622] border border-[#1a1f2e] text-xs font-mono">
                <span className="text-[#a0aec0]">Flips:</span>
                <span className="text-[#cccccc] font-bold">{telemetry.flipCount}</span>
              </div>
              <button
                id="inject-perturbation-btn"
                onClick={injectPerturbation}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#cccccc] hover:bg-[#cccccc]/80 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(204,204,204,0.4)]"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Nudge (δω)</span>
              </button>
              <button
                id="reset-dzhanibekov-btn"
                onClick={() => resetOrientation(spinAxis)}
                className="p-1 bg-[#111622] hover:bg-[#1a1f2e] text-[#a0aec0] hover:text-white rounded-lg border border-[#1a1f2e] transition-colors"
                title="Reset Spin State"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3D Three.js Container */}
          <div className="relative w-full h-[460px] bg-[#05070a]">
            <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

            {/* 3D Legend */}
            <div className="absolute top-3 left-3 bg-[#0a0d14]/90 backdrop-blur-md px-3 py-2 rounded-xl border border-[#1a1f2e] text-[10px] font-mono space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[#ffffff] rounded-full shadow-[0_0_6px_#ffffff]" />
                <span className="text-white">L (Conserved in Lab)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[#cccccc] rounded-full shadow-[0_0_6px_#cccccc]" />
                <span className="text-white">ω (Tumbling Vector)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[#888888] rounded-full shadow-[0_0_6px_#888888]" />
                <span className="text-white">Polhode Trail</span>
              </div>
              <div className="text-[9px] text-[#a0aec0]/60 pt-0.5">
                • Drag to orbit • Scroll to zoom
              </div>
            </div>

            {/* Orientation indicator badge */}
            <div className="absolute bottom-3 left-3 bg-[#0a0d14]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-[#1a1f2e] text-xs font-mono">
              <span className="text-[#a0aec0]">Orientation: </span>
              <span className={telemetry.w2 >= 0 ? 'text-[#ffffff] font-bold' : 'text-[#888888] font-bold'}>
                {telemetry.w2 >= 0 ? 'Cyan Up (+Y)' : 'Pink Up (-Y Flipped)'}
              </span>
            </div>
          </div>

          {/* Real-time telemetry metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 p-3.5 bg-[#080a0f] border-t border-[#1a1f2e]">
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Major Axis (ω₁)</div>
              <div className="text-sm font-mono font-bold text-white">
                {telemetry.w1.toFixed(2)} <span className="text-[10px] font-normal text-[#a0aec0]/70">rad/s</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#cccccc] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Intermediate (ω₂)</div>
              <div className={`text-sm font-mono font-bold ${telemetry.w2 < 0 ? 'text-[#888888]' : 'text-[#cccccc]'}`}>
                {telemetry.w2.toFixed(2)} <span className="text-[10px] font-normal text-[#a0aec0]/70">rad/s</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Minor Axis (ω₃)</div>
              <div className="text-sm font-mono font-bold text-white">
                {telemetry.w3.toFixed(2)} <span className="text-[10px] font-normal text-[#a0aec0]/70">rad/s</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Rotational Energy (E)</div>
              <div className="text-sm font-mono font-bold text-[#ffffff]">
                {telemetry.energy.toFixed(2)} <span className="text-[10px] font-normal text-[#a0aec0]/70">J</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">|L| Magnitude</div>
              <div className="text-sm font-mono font-bold text-white">
                {telemetry.L_mag.toFixed(2)} <span className="text-[10px] font-normal text-[#a0aec0]/70">N·m·s</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#cccccc] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Stability Regime</div>
              <div className={`text-[10px] font-mono font-bold mt-0.5 px-1.5 py-0.5 rounded border inline-block ${
                spinAxis === 'intermediate' 
                  ? 'text-[#888888] border-[#88888830] bg-[#88888815]' 
                  : 'text-[#ffffff] border-[#ffffff30] bg-[#ffffff15]'
              }`}>
                {spinAxis === 'intermediate' ? 'Hyperbolic (Flip)' : 'Elliptic (Stable)'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Controls Deck (lg:col-span-4) */}
      <div className="lg:col-span-4 lg:sticky lg:top-16 space-y-3.5 max-h-[calc(100vh-6.5rem)] lg:overflow-y-auto pr-1">
        {/* Card 1: Spin Axis Regime */}
        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1f2e]">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5 text-[#cccccc]" />
              01 // Spin Axis Regime
            </span>
          </div>

          <div className="space-y-1.5">
            {[
              {
                id: 'intermediate',
                title: 'Intermediate Axis I₂ (Dzhanibekov Flip)',
                desc: 'Unstable separatrix: periodic 180° flip-flops!',
                color: 'text-[#888888]',
              },
              {
                id: 'major',
                title: 'Major Axis I₁ (Stable Spin)',
                desc: 'Maximum moment of inertia: stable precession.',
                color: 'text-[#ffffff]',
              },
              {
                id: 'minor',
                title: 'Minor Axis I₃ (Stable Spin)',
                desc: 'Minimum moment of inertia: stable nutation.',
                color: 'text-[#ffffff]',
              },
            ].map((axis) => (
              <button
                key={axis.id}
                id={`axis-select-${axis.id}`}
                onClick={() => {
                  setSpinAxis(axis.id as any);
                  resetOrientation(axis.id as any);
                }}
                className={`w-full text-left p-2 rounded-xl border transition-all ${
                  spinAxis === axis.id
                    ? 'bg-[#cccccc15] border-[#cccccc] text-white shadow-[0_0_10px_rgba(204,204,204,0.2)]'
                    : 'bg-[#111622] hover:bg-[#1a1f2e] border-[#1a1f2e] text-[#a0aec0]'
                }`}
              >
                <div className={`text-xs font-semibold ${axis.color}`}>{axis.title}</div>
                <div className="text-[10px] text-[#a0aec0] mt-0.5">{axis.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Card 2: Inertia Tensor Configuration */}
        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1f2e]">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#ffffff]" />
              02 // Moments of Inertia
            </span>
          </div>

          {/* I1 */}
          <ParameterControl
            id="input-inertia-i1"
            label="Major Axis (I₁)"
            value={inertia.I1}
            min={2.5}
            max={5.0}
            step={0.1}
            onChange={(val) => setInertia((p) => ({ ...p, I1: val }))}
            accentColor="#ffffff"
          />

          {/* I2 */}
          <ParameterControl
            id="input-inertia-i2"
            label="Intermediate Axis (I₂)"
            value={inertia.I2}
            min={1.3}
            max={2.4}
            step={0.1}
            onChange={(val) => setInertia((p) => ({ ...p, I2: val }))}
            accentColor="#cccccc"
          />

          {/* I3 */}
          <ParameterControl
            id="input-inertia-i3"
            label="Minor Axis (I₃)"
            value={inertia.I3}
            min={0.5}
            max={1.2}
            step={0.1}
            onChange={(val) => setInertia((p) => ({ ...p, I3: val }))}
            accentColor="#ffffff"
          />

          <div className="p-2 bg-[#111622] rounded-lg border border-[#1a1f2e] text-[10px] font-mono text-[#a0aec0]">
            Euler condition: <span className="text-[#ffffff] font-bold">I₁ &gt; I₂ &gt; I₃</span> (tennis racket)
          </div>
        </div>

        {/* Card 3: 3D Visualization Options */}
        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1f2e]">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#ffffff]" />
              03 // Spin & Overlays
            </span>
          </div>

          {/* Spin Speed */}
          <ParameterControl
            id="input-spin-speed"
            label="Base Spin Rate (ω₀)"
            value={spinSpeed}
            min={2}
            max={12}
            step={0.5}
            unit="rad/s"
            onChange={(val) => {
              setSpinSpeed(val);
              rigidStateRef.current.w2 = Math.sign(rigidStateRef.current.w2) * val;
            }}
            accentColor="#ffffff"
          />

          <div className="space-y-1.5 pt-2 border-t border-[#1a1f2e]">
            <label className="flex items-center gap-2 text-xs text-[#a0aec0] hover:text-white cursor-pointer transition-colors">
              <input
                id="toggle-vectors-3d"
                type="checkbox"
                checked={showVectors}
                onChange={(e) => setShowVectors(e.target.checked)}
                className="accent-[#cccccc] rounded"
              />
              <span>Render L & ω 3D Vector Arrows</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-[#a0aec0] hover:text-white cursor-pointer transition-colors">
              <input
                id="toggle-polhode-trail"
                type="checkbox"
                checked={showTrail}
                onChange={(e) => setShowTrail(e.target.checked)}
                className="accent-[#cccccc] rounded"
              />
              <span>Trace Polhode Precession Path</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-[#a0aec0] hover:text-white cursor-pointer transition-colors">
              <input
                id="toggle-ellipsoid"
                type="checkbox"
                checked={showInertiaEllipsoid}
                onChange={(e) => setShowInertiaEllipsoid(e.target.checked)}
                className="accent-[#cccccc] rounded"
              />
              <span>Display Poinsot Inertia Ellipsoid</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
