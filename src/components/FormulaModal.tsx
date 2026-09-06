import React from 'react';
import { X, BookOpen, Atom, Compass, Wind, RotateCw, Magnet, Waves } from 'lucide-react';
import { LabId } from '../types';

interface FormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeLab: LabId;
}

export const FormulaModal: React.FC<FormulaModalProps> = ({ isOpen, onClose, activeLab }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="formula-modal-content"
        className="bg-[#080a0f] border border-[#1a1f2e] rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1f2e] bg-[#0a0d14]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#ffffff15] border border-[#ffffff30] text-[#ffffff] shadow-[0_0_10px_rgba(255,255,255,0.2)]">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-widest uppercase font-mono">Physics Principles & Formulations</h2>
              <p className="text-[11px] text-[#a0aec0]/70 uppercase tracking-wider font-mono">Theoretical foundations, differential equations & numerical schemes</p>
            </div>
          </div>
          <button
            id="close-formula-modal-btn"
            onClick={onClose}
            className="p-2 text-[#a0aec0] hover:text-white rounded-lg hover:bg-[#111622] border border-transparent hover:border-[#1a1f2e] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-6 text-sm text-[#a0aec0]">
          {/* 1. Ballistics */}
          <section className={`p-5 rounded-xl border ${activeLab === 'ballistics' ? 'bg-[#0a0d14] border-[#ffffff]/40 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-[#0a0d14]/60 border-[#1a1f2e]'}`}>
            <div className="flex items-center gap-2 mb-3 text-[#ffffff] font-semibold text-sm tracking-wider uppercase">
              <Compass className="w-5 h-5" />
              <span>1. Ballistics with Quadratic Air Drag</span>
            </div>
            <p className="text-xs text-[#a0aec0] mb-4 leading-relaxed">
              In realistic ballistics, aerodynamic drag is proportional to the square of velocity (high Reynolds number regime). The net vector equation governing projectile flight is:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-3 bg-[#111622] rounded border-l-2 border-[#ffffff] border-t border-b border-r border-[#1a1f2e]">
                <div className="text-[10px] uppercase tracking-wider text-[#a0aec0]/60 mb-1">Drag Force Equation:</div>
                <div className="text-[#ffffff] font-bold">F_d = 0.5 * rho * v^2 * C_d * A</div>
                <div className="text-[10px] text-[#a0aec0]/70 mt-2">
                  • rho: Air density (kg/m³)<br />
                  • C_d: Drag coefficient (shape-dependent)<br />
                  • A: Projected frontal area (m²)<br />
                  • v: Instantaneous velocity magnitude
                </div>
              </div>
              <div className="p-3 bg-[#111622] rounded border-l-2 border-[#ffffff] border-t border-b border-r border-[#1a1f2e]">
                <div className="text-[10px] uppercase tracking-wider text-[#a0aec0]/60 mb-1">Vector Equations of Motion:</div>
                <div className="text-[#ffffff] font-bold">m * d²r/dt² = -F_d * (v / |v|) + m * g</div>
                <div className="text-[10px] text-[#a0aec0]/70 mt-2">
                  • a_x = -(F_d / m) * (v_x / v)<br />
                  • a_y = -g - (F_d / m) * (v_y / v)<br />
                  • Solved in real time via 4th-Order Runge-Kutta (RK4)
                </div>
              </div>
            </div>
          </section>

          {/* 2. Ray Optics */}
          <section className={`p-5 rounded-xl border ${activeLab === 'optics' ? 'bg-[#0a0d14] border-[#ffffff]/40 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-[#0a0d14]/60 border-[#1a1f2e]'}`}>
            <div className="flex items-center gap-2 mb-3 text-[#ffffff] font-semibold text-sm tracking-wider uppercase">
              <Atom className="w-5 h-5" />
              <span>2. Thin Lens Ray Optics & Chromatic Dispersion</span>
            </div>
            <p className="text-xs text-[#a0aec0] mb-4 leading-relaxed">
              Geometric optics approximates light propagation through refraction at curved spherical boundaries governed by Snell's Law and the Gaussian lens formula.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-3 bg-[#111622] rounded border-l-2 border-[#ffffff] border-t border-b border-r border-[#1a1f2e]">
                <div className="text-[10px] uppercase tracking-wider text-[#a0aec0]/60 mb-1">Gaussian Thin Lens Equation:</div>
                <div className="text-[#ffffff] font-bold">1 / f = 1 / d_o + 1 / d_i</div>
                <div className="text-white mt-1 font-bold">M = h_i / h_o = -d_i / d_o</div>
                <div className="text-[10px] text-[#a0aec0]/70 mt-2">
                  • d_o: Object distance from lens center<br />
                  • d_i: Image distance (positive = real, negative = virtual)<br />
                  • f: Focal length (+ for convex converging, - for concave)
                </div>
              </div>
              <div className="p-3 bg-[#111622] rounded border-l-2 border-[#cccccc] border-t border-b border-r border-[#1a1f2e]">
                <div className="text-[10px] uppercase tracking-wider text-[#a0aec0]/60 mb-1">Cauchy Dispersion (Aberration):</div>
                <div className="text-[#cccccc] font-bold">n(lambda) = A + B / lambda²</div>
                <div className="text-[10px] text-[#a0aec0]/70 mt-2">
                  • Shorter wavelengths (blue ~450nm) experience higher refractive indices and refract more sharply than red (~650nm), causing focal point splitting.
                </div>
              </div>
            </div>
          </section>

          {/* 3. Airfoil Aerodynamics */}
          <section className={`p-5 rounded-xl border ${activeLab === 'airfoil' ? 'bg-[#0a0d14] border-[#ffffff]/40 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-[#0a0d14]/60 border-[#1a1f2e]'}`}>
            <div className="flex items-center gap-2 mb-3 text-[#ffffff] font-semibold text-sm tracking-wider uppercase">
              <Wind className="w-5 h-5" />
              <span>3. Airfoil Aerodynamics, Potential Flow & Stall Separation</span>
            </div>
            <p className="text-xs text-[#a0aec0] mb-4 leading-relaxed">
              In inviscid incompressible flow, circulation Gamma satisfies the Kutta condition to ensure smooth flow off the sharp trailing edge. By Bernoulli's principle, accelerated fluid creates suction pressure.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-3 bg-[#111622] rounded border-l-2 border-[#ffffff] border-t border-b border-r border-[#1a1f2e]">
                <div className="text-[10px] uppercase tracking-wider text-[#a0aec0]/60 mb-1">Kutta-Joukowski Lift Theorem:</div>
                <div className="text-[#ffffff] font-bold">L' = rho * V_inf * Gamma</div>
                <div className="text-white mt-1 font-bold">C_L = 2 * pi * alpha (pre-stall)</div>
                <div className="text-[10px] text-[#a0aec0]/70 mt-2">
                  • Bernoulli: P + 0.5 * rho * v² = constant<br />
                  • Suction on upper camber generates ~80% of lift
                </div>
              </div>
              <div className="p-3 bg-[#111622] rounded border-l-2 border-[#cccccc] border-t border-b border-r border-[#1a1f2e]">
                <div className="text-[10px] uppercase tracking-wider text-[#a0aec0]/60 mb-1">Boundary Layer Stall (alpha &gt; 15 deg):</div>
                <div className="text-[#cccccc] font-bold">dp/dx &gt; 0 (Adverse Gradient)</div>
                <div className="text-[10px] text-[#a0aec0]/70 mt-2">
                  • Boundary layer decelerates, flow separates from suction surface.<br />
                  • Lift drops abruptly while pressure drag spikes, shedding turbulent vortices.
                </div>
              </div>
            </div>
          </section>

          {/* 4. Dzhanibekov Effect */}
          <section className={`p-5 rounded-xl border ${activeLab === 'dzhanibekov' ? 'bg-[#0a0d14] border-[#ffffff]/40 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-[#0a0d14]/60 border-[#1a1f2e]'}`}>
            <div className="flex items-center gap-2 mb-3 text-[#cccccc] font-semibold text-sm tracking-wider uppercase">
              <RotateCw className="w-5 h-5" />
              <span>4. Dzhanibekov Effect (Intermediate Axis Theorem)</span>
            </div>
            <p className="text-xs text-[#a0aec0] mb-4 leading-relaxed">
              A rigid body with three unequal principal moments of inertia (I1 &gt; I2 &gt; I3) is stable when spinning around its major (I1) or minor (I3) axis, but intrinsically unstable when spinning around its intermediate axis (I2).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-3 bg-[#111622] rounded border-l-2 border-[#cccccc] border-t border-b border-r border-[#1a1f2e]">
                <div className="text-[10px] uppercase tracking-wider text-[#a0aec0]/60 mb-1">Euler's Rotational Equations:</div>
                <div className="text-[#cccccc] font-bold">I1 * dw1/dt = (I2 - I3) * w2 * w3</div>
                <div className="text-[#cccccc] font-bold">I2 * dw2/dt = (I3 - I1) * w3 * w1</div>
                <div className="text-[#cccccc] font-bold">I3 * dw3/dt = (I1 - I2) * w1 * w2</div>
              </div>
              <div className="p-3 bg-[#111622] rounded border-l-2 border-[#ffffff] border-t border-b border-r border-[#1a1f2e]">
                <div className="text-[10px] uppercase tracking-wider text-[#a0aec0]/60 mb-1">Conservation Laws:</div>
                <div className="text-[#ffffff] font-bold">2E = sum(Ii * wi²) = const</div>
                <div className="text-[#ffffff] font-bold">|L|² = sum(Ii² * wi²) = const</div>
                <div className="text-[10px] text-[#a0aec0]/70 mt-2">
                  • Trajectories on the intersection of energy ellipsoid and angular momentum sphere form a hyperbolic separatrix around the intermediate axis, inducing spontaneous 180° flips.
                </div>
              </div>
            </div>
          </section>

          {/* 5. Lorentz Magnetic Mirror */}
          <section className={`p-5 rounded-xl border ${activeLab === 'lorentz' ? 'bg-[#0a0d14] border-[#ffffff]/40 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-[#0a0d14]/60 border-[#1a1f2e]'}`}>
            <div className="flex items-center gap-2 mb-3 text-[#ffffff] font-semibold text-sm tracking-wider uppercase">
              <Magnet className="w-5 h-5" />
              <span>5. Lorentz Force & Magnetic Mirroring (Boris Algorithm)</span>
            </div>
            <p className="text-xs text-[#a0aec0] mb-4 leading-relaxed">
              Charged particles in a magnetic bottle or planetary dipole field experience the Lorentz force F = q * (v x B). In slowly varying fields, the first adiabatic invariant (magnetic moment mu) is strictly conserved.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="p-3 bg-[#111622] rounded border-l-2 border-[#ffffff] border-t border-b border-r border-[#1a1f2e]">
                <div className="text-[10px] uppercase tracking-wider text-[#a0aec0]/60 mb-1">First Adiabatic Invariant:</div>
                <div className="text-[#ffffff] font-bold">mu = (0.5 * m * v_perp²) / B = const</div>
                <div className="text-[10px] text-[#a0aec0]/70 mt-2">
                  • As particle moves into bottleneck (higher B), v_perp must increase.<br />
                  • Total kinetic energy is conserved =&gt; v_parallel decreases to 0 and mirrors back!
                </div>
              </div>
              <div className="p-3 bg-[#111622] rounded border-l-2 border-[#cccccc] border-t border-b border-r border-[#1a1f2e]">
                <div className="text-[10px] uppercase tracking-wider text-[#a0aec0]/60 mb-1">Boris Numerical Integration Scheme:</div>
                <div className="text-[#cccccc] font-bold">v+ - v- = (q * dt / 2m) * (v+ + v-) x B</div>
                <div className="text-[10px] text-[#a0aec0]/70 mt-2">
                  • Symplectic, phase-space volume preserving algorithm.<br />
                  • Perfectly maintains the gyro-orbit radius without artificial numerical energy drift.
                </div>
              </div>
            </div>
          </section>

          {/* 6. Chaos & Double Pendulum */}
          <section className={`p-5 rounded-xl border ${activeLab === 'chaos' ? 'bg-[#0a0d14] border-[#ffffff]/40 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-[#0a0d14]/60 border-[#1a1f2e]'}`}>
            <div className="flex items-center gap-2 mb-3 text-[#cccccc] font-semibold text-sm tracking-wider uppercase">
              <Waves className="w-5 h-5" />
              <span>6. Nonlinear Dynamics & Lyapunov Chaos</span>
            </div>
            <p className="text-xs text-[#a0aec0] mb-2 leading-relaxed">
              The double pendulum is a classical Hamiltonian system exhibiting deterministic chaos. Trajectories with infinitesimal initial difference (1e-5 rad) diverge exponentially at rate lambda (Lyapunov exponent):
            </p>
            <div className="p-3 bg-[#111622] rounded border-l-2 border-[#cccccc] border-t border-b border-r border-[#1a1f2e] font-mono text-xs text-[#cccccc] font-bold">
              |delta Z(t)| ~ |delta Z(0)| * e^(lambda * t)
            </div>
          </section>

          {/* 7. Orbital Gravity */}
          <section className={`p-5 rounded-xl border ${activeLab === 'orbital' ? 'bg-[#0a0d14] border-[#ffffff]/40 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'bg-[#0a0d14]/60 border-[#1a1f2e]'}`}>
            <div className="flex items-center gap-2 mb-3 text-[#ffffff] font-semibold text-sm tracking-wider uppercase">
              <Atom className="w-5 h-5" />
              <span>7. N-Body Orbital Gravity</span>
            </div>
            <p className="text-xs text-[#a0aec0] mb-2 leading-relaxed">
              Newtonian gravitational interaction between multiple celestial bodies. The force follows an inverse-square law, resulting in Keplerian orbits for 2-body systems and complex chaotic trajectories for N &gt; 2.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs mt-4">
              <div className="p-3 bg-[#111622] rounded border-l-2 border-[#ffffff] border-t border-b border-r border-[#1a1f2e]">
                <div className="text-[10px] uppercase tracking-wider text-[#a0aec0]/60 mb-1">Universal Gravitation:</div>
                <div className="text-[#ffffff] font-bold">F_g = G * (m1 * m2) / r²</div>
                <div className="text-[10px] text-[#a0aec0]/70 mt-2">
                  • G: Gravitational constant<br />
                  • m1, m2: Masses of bodies<br />
                  • r: Distance between centers
                </div>
              </div>
              <div className="p-3 bg-[#111622] rounded border-l-2 border-[#cccccc] border-t border-b border-r border-[#1a1f2e]">
                <div className="text-[10px] uppercase tracking-wider text-[#a0aec0]/60 mb-1">Vector Acceleration:</div>
                <div className="text-[#cccccc] font-bold">a_i = Σ G * m_j * (r_j - r_i) / |r_ij|³</div>
                <div className="text-[10px] text-[#a0aec0]/70 mt-2">
                  • Computed using numerical integration to preserve total system energy and angular momentum.
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#1a1f2e] bg-[#0a0d14] flex justify-end">
          <button
            id="close-modal-footer-btn"
            onClick={onClose}
            className="px-5 py-2 bg-[#ffffff] hover:bg-[#ffffff]/85 text-[#05070a] font-bold tracking-widest uppercase rounded-lg text-xs shadow-[0_0_12px_rgba(255,255,255,0.35)] transition-all"
          >
            Close Theory Manual
          </button>
        </div>
      </div>
    </div>
  );
};
