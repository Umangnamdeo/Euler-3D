/**
 * Physics mathematical utilities and numerical integrators
 */

// ==========================================
// 1. BALLISTICS RK4 INTEGRATOR WITH QUADRATIC DRAG
// ==========================================
export interface BallisticsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
}

export interface BallisticsParams {
  g: number; // m/s^2 (downwards)
  rho: number; // air density kg/m^3
  cd: number; // drag coefficient
  area: number; // cross-sectional area m^2
  mass: number; // kg
  windX: number; // m/s
}

export function ballisticsDerivatives(
  state: BallisticsState,
  params: BallisticsParams
): { dx: number; dy: number; dvx: number; dvy: number } {
  const relVx = state.vx - params.windX;
  const relVy = state.vy;
  const speed = Math.sqrt(relVx * relVx + relVy * relVy);

  let dragX = 0;
  let dragY = 0;
  if (speed > 0 && params.rho > 0 && params.mass > 0) {
    const dragMag = 0.5 * params.rho * speed * speed * params.cd * params.area;
    dragX = -(dragMag * (relVx / speed)) / params.mass;
    dragY = -(dragMag * (relVy / speed)) / params.mass;
  }

  const ax = dragX;
  const ay = -params.g + dragY;

  return {
    dx: state.vx,
    dy: state.vy,
    dvx: ax,
    dvy: ay,
  };
}

export function stepBallisticsRK4(
  state: BallisticsState,
  params: BallisticsParams,
  dt: number
): BallisticsState {
  // k1
  const k1 = ballisticsDerivatives(state, params);

  // k2
  const s2: BallisticsState = {
    x: state.x + k1.dx * 0.5 * dt,
    y: state.y + k1.dy * 0.5 * dt,
    vx: state.vx + k1.dvx * 0.5 * dt,
    vy: state.vy + k1.dvy * 0.5 * dt,
    t: state.t + 0.5 * dt,
  };
  const k2 = ballisticsDerivatives(s2, params);

  // k3
  const s3: BallisticsState = {
    x: state.x + k2.dx * 0.5 * dt,
    y: state.y + k2.dy * 0.5 * dt,
    vx: state.vx + k2.dvx * 0.5 * dt,
    vy: state.vy + k2.dvy * 0.5 * dt,
    t: state.t + 0.5 * dt,
  };
  const k3 = ballisticsDerivatives(s3, params);

  // k4
  const s4: BallisticsState = {
    x: state.x + k3.dx * dt,
    y: state.y + k3.dy * dt,
    vx: state.vx + k3.dvx * dt,
    vy: state.vy + k3.dvy * dt,
    t: state.t + dt,
  };
  const k4 = ballisticsDerivatives(s4, params);

  return {
    x: state.x + (dt / 6) * (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx),
    y: state.y + (dt / 6) * (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy),
    vx: state.vx + (dt / 6) * (k1.dvx + 2 * k2.dvx + 2 * k3.dvx + k4.dvx),
    vy: state.vy + (dt / 6) * (k1.dvy + 2 * k2.dvy + 2 * k3.dvy + k4.dvy),
    t: state.t + dt,
  };
}

// Compute full trajectory points for vacuum (theoretical) vs with drag
export function computeTrajectoryPath(
  v0: number,
  angleDeg: number,
  h0: number,
  params: BallisticsParams,
  maxPoints = 600,
  dt = 0.016
): { points: { x: number; y: number; t: number; speed: number }[]; maxH: number; range: number; totalT: number } {
  const rad = (angleDeg * Math.PI) / 180;
  let curr: BallisticsState = {
    x: 0,
    y: h0,
    vx: v0 * Math.cos(rad),
    vy: v0 * Math.sin(rad),
    t: 0,
  };

  const points = [{ x: curr.x, y: curr.y, t: 0, speed: v0 }];
  let maxH = curr.y;

  for (let i = 0; i < maxPoints; i++) {
    const next = stepBallisticsRK4(curr, params, dt);
    if (next.y > maxH) maxH = next.y;

    if (next.y <= 0 && curr.y >= 0 && points.length > 1) {
      // Interpolate ground impact
      const frac = (0 - curr.y) / (next.y - curr.y);
      const finalX = curr.x + (next.x - curr.x) * frac;
      const finalT = curr.t + (next.t - curr.t) * frac;
      const finalSpeed = Math.sqrt(next.vx * next.vx + next.vy * next.vy);
      points.push({ x: finalX, y: 0, t: finalT, speed: finalSpeed });
      break;
    }
    curr = next;
    points.push({
      x: curr.x,
      y: curr.y,
      t: curr.t,
      speed: Math.sqrt(curr.vx * curr.vx + curr.vy * curr.vy),
    });
  }

  const last = points[points.length - 1];
  return {
    points,
    maxH,
    range: last ? last.x : 0,
    totalT: last ? last.t : 0,
  };
}

// ==========================================
// 2. RAY OPTICS FORMULAS & RAY TRACING
// ==========================================
export interface LensParams {
  focalLength: number; // positive = convex, negative = concave (cm)
  lensX: number; // position on bench (cm)
  lensHeight: number; // lens physical radius/height (cm)
  refractiveIndex: number; // n (e.g. 1.517 for crown glass)
}

export interface ObjectParams {
  objX: number; // position on bench (cm)
  objHeight: number; // height (cm)
}

export interface ImageResult {
  imgX: number;
  imgHeight: number;
  isReal: boolean;
  magnification: number;
  isValid: boolean;
}

export function computeThinLensImage(lens: LensParams, obj: ObjectParams): ImageResult {
  const f = lens.focalLength;
  const d_o = lens.lensX - obj.objX; // object distance (positive when in front of lens)

  // Avoid division by zero at focal point
  if (Math.abs(d_o - f) < 0.001) {
    return {
      imgX: f > 0 ? 99999 : -99999,
      imgHeight: 99999,
      isReal: true,
      magnification: 99999,
      isValid: false,
    };
  }

  // 1/f = 1/d_o + 1/d_i  =>  1/d_i = 1/f - 1/d_o = (d_o - f) / (f * d_o)
  const d_i = (f * d_o) / (d_o - f);
  const magnification = -d_i / d_o;
  const imgHeight = obj.objHeight * magnification;
  const imgX = lens.lensX + d_i;
  const isReal = d_i > 0;

  return {
    imgX,
    imgHeight,
    isReal,
    magnification,
    isValid: true,
  };
}

// Dispersion formula for chromatic aberration: Cauchy equation
export function getCauchyRefractiveIndex(baseN: number, wavelengthNm: number): number {
  // Cauchy: n(lambda) = A + B / lambda^2
  // For crown glass, A ~ 1.5046, B ~ 4.2e-3 um^2
  const lambdaUm = wavelengthNm / 1000;
  const delta = 0.0042 / (lambdaUm * lambdaUm);
  return baseN + (delta - 0.013);
}

// Lensmaker's equation: 1/f = (n - 1) * (1/R1 - 1/R2)
export function getDispersedFocalLength(baseF: number, baseN: number, lambdaN: number): number {
  return baseF * ((baseN - 1) / (lambdaN - 1));
}

// ==========================================
// 3. AIRFOIL AERODYNAMICS & STALL PHYSICS
// ==========================================
export interface AirfoilState {
  aoaDeg: number; // Angle of attack (-10 to +30 deg)
  airspeed: number; // Free stream speed m/s
  chord: number; // Chord length m
  camber: number; // Camber percentage (e.g. 0.02 for NACA 2412, 0 for 0012)
}

export function computeAeroCoefficients(aoaDeg: number, camber = 0): {
  cl: number;
  cd: number;
  cm: number;
  isStalled: boolean;
  stallRatio: number; // 0 (clean) to 1 (full stall)
} {
  const alphaRad = (aoaDeg * Math.PI) / 180;
  const alpha0 = -camber * 10 * (Math.PI / 180); // zero-lift angle of attack
  const effAlpha = alphaRad - alpha0;

  // Clean lift curve: 2 * pi * effAlpha (thin airfoil theory)
  const cleanCl = 2 * Math.PI * effAlpha;

  // Critical stall angle: around 15 degrees (~0.262 rad)
  const stallAlpha = 15;
  const stallWidth = 3;
  let stallRatio = 0;

  if (Math.abs(aoaDeg) > stallAlpha) {
    stallRatio = Math.min(1, (Math.abs(aoaDeg) - stallAlpha) / stallWidth);
  }

  // Post stall flat plate model
  const sign = aoaDeg >= 0 ? 1 : -1;
  const postStallCl = 1.15 * Math.sin(2 * alphaRad);

  const cl = (1 - stallRatio) * cleanCl + stallRatio * postStallCl;

  // Drag: induced drag + parasite drag + stall pressure drag
  const cd0 = 0.008;
  const cdInduced = (cl * cl) / (Math.PI * 6.0); // Aspect ratio ~6
  const cdStall = stallRatio * 1.4 * Math.sin(Math.abs(alphaRad));
  const cd = cd0 + cdInduced + cdStall;

  // Quarter-chord pitching moment
  const cm0 = -0.05 * (camber > 0 ? 1 : 0);
  const cm = cm0 - (1 - stallRatio) * 0.02 * effAlpha - stallRatio * 0.15 * sign;

  return {
    cl,
    cd,
    cm,
    isStalled: stallRatio > 0.05,
    stallRatio,
  };
}

// Generates NACA 4-digit airfoil coordinates (e.g., 0012 or 2412)
export function generateNacaAirfoil(
  m = 0.0, // max camber (0 to 0.09)
  p = 0.4, // position of max camber (0.1 to 0.9)
  t = 0.12, // max thickness (0.01 to 0.3)
  numPoints = 80
): { x: number; y: number }[] {
  const upper: { x: number; y: number }[] = [];
  const lower: { x: number; y: number }[] = [];

  for (let i = 0; i <= numPoints; i++) {
    // Cosine spacing for high resolution near leading edge
    const beta = (i / numPoints) * Math.PI;
    const x = 0.5 * (1 - Math.cos(beta));

    // Thickness distribution
    const yt =
      5 *
      t *
      (0.2969 * Math.sqrt(Math.max(0, x)) -
        0.126 * x -
        0.3516 * x * x +
        0.2843 * x * x * x -
        0.1015 * x * x * x * x);

    // Camber line and gradient
    let yc = 0;
    let dyc_dx = 0;
    if (m > 0) {
      if (x < p) {
        yc = (m / (p * p)) * (2 * p * x - x * x);
        dyc_dx = ((2 * m) / (p * p)) * (p - x);
      } else {
        yc = (m / ((1 - p) * (1 - p))) * ((1 - 2 * p) + 2 * p * x - x * x);
        dyc_dx = ((2 * m) / ((1 - p) * (1 - p))) * (p - x);
      }
    }

    const theta = Math.atan(dyc_dx);
    upper.push({
      x: x - yt * Math.sin(theta),
      y: yc + yt * Math.cos(theta),
    });
    lower.push({
      x: x + yt * Math.sin(theta),
      y: yc - yt * Math.cos(theta),
    });
  }

  // Combine counter-clockwise starting from trailing edge upper to lower
  return [...upper.reverse(), ...lower.slice(1)];
}

// ==========================================
// 4. DZHANIBEKOV EFFECT (EULER EQUATIONS & QUATERNIONS)
// ==========================================
export interface RigidBodyState {
  // Angular velocities in principal axes (body frame)
  w1: number;
  w2: number; // Intermediate axis!
  w3: number;
  // Orientation quaternion [w, x, y, z]
  qw: number;
  qx: number;
  qy: number;
  qz: number;
}

export interface InertiaTensor {
  I1: number; // Smallest or Largest
  I2: number; // Intermediate (I1 > I2 > I3 or I1 < I2 < I3)
  I3: number;
}

export function eulerRotationalDerivatives(
  w1: number,
  w2: number,
  w3: number,
  I: InertiaTensor
): [number, number, number] {
  // Euler's Equations:
  // I1 * dw1/dt = (I2 - I3) * w2 * w3
  // I2 * dw2/dt = (I3 - I1) * w3 * w1
  // I3 * dw3/dt = (I1 - I2) * w1 * w2
  const dw1 = ((I.I2 - I.I3) / I.I1) * w2 * w3;
  const dw2 = ((I.I3 - I.I1) / I.I2) * w3 * w1;
  const dw3 = ((I.I1 - I.I2) / I.I3) * w1 * w2;
  return [dw1, dw2, dw3];
}

export function stepDzhanibekovRK4(
  state: RigidBodyState,
  I: InertiaTensor,
  dt: number
): RigidBodyState {
  // RK4 on angular velocities
  const [dw1_k1, dw2_k1, dw3_k1] = eulerRotationalDerivatives(state.w1, state.w2, state.w3, I);

  const [dw1_k2, dw2_k2, dw3_k2] = eulerRotationalDerivatives(
    state.w1 + dw1_k1 * 0.5 * dt,
    state.w2 + dw2_k1 * 0.5 * dt,
    state.w3 + dw3_k1 * 0.5 * dt,
    I
  );

  const [dw1_k3, dw2_k3, dw3_k3] = eulerRotationalDerivatives(
    state.w1 + dw1_k2 * 0.5 * dt,
    state.w2 + dw2_k2 * 0.5 * dt,
    state.w3 + dw3_k2 * 0.5 * dt,
    I
  );

  const [dw1_k4, dw2_k4, dw3_k4] = eulerRotationalDerivatives(
    state.w1 + dw1_k3 * dt,
    state.w2 + dw2_k3 * dt,
    state.w3 + dw3_k3 * dt,
    I
  );

  const newW1 = state.w1 + (dt / 6) * (dw1_k1 + 2 * dw1_k2 + 2 * dw1_k3 + dw1_k4);
  const newW2 = state.w2 + (dt / 6) * (dw2_k1 + 2 * dw2_k2 + 2 * dw2_k3 + dw2_k4);
  const newW3 = state.w3 + (dt / 6) * (dw3_k1 + 2 * dw3_k2 + 2 * dw3_k3 + dw3_k4);

  // Quaternion derivative: dq/dt = 0.5 * q * w
  // w in body coordinates: [0, w1, w2, w3]
  const qw = state.qw;
  const qx = state.qx;
  const qy = state.qy;
  const qz = state.qz;

  const avgW1 = 0.5 * (state.w1 + newW1);
  const avgW2 = 0.5 * (state.w2 + newW2);
  const avgW3 = 0.5 * (state.w3 + newW3);

  const dqw = 0.5 * (-qx * avgW1 - qy * avgW2 - qz * avgW3);
  const dqx = 0.5 * (qw * avgW1 + qy * avgW3 - qz * avgW2);
  const dqy = 0.5 * (qw * avgW2 - qx * avgW3 + qz * avgW1);
  const dqz = 0.5 * (qw * avgW3 + qx * avgW2 - qy * avgW1);

  let nw = qw + dqw * dt;
  let nx = qx + dqx * dt;
  let ny = qy + dqy * dt;
  let nz = qz + dqz * dt;

  // Normalize quaternion
  const len = Math.sqrt(nw * nw + nx * nx + ny * ny + nz * nz);
  if (len > 0) {
    nw /= len;
    nx /= len;
    ny /= len;
    nz /= len;
  }

  return {
    w1: newW1,
    w2: newW2,
    w3: newW3,
    qw: nw,
    qx: nx,
    qy: ny,
    qz: nz,
  };
}

// Convert body angular momentum to lab/world frame using quaternion
export function getAngularMomentumLab(
  state: RigidBodyState,
  I: InertiaTensor
): { L_lab: [number, number, number]; L_mag: number; kineticEnergy: number } {
  // Body angular momentum: L_body = [I1*w1, I2*w2, I3*w3]
  const Lb1 = I.I1 * state.w1;
  const Lb2 = I.I2 * state.w2;
  const Lb3 = I.I3 * state.w3;

  // Kinetic energy T = 0.5 * (I1*w1^2 + I2*w2^2 + I3*w3^2) (strictly conserved in torque-free motion!)
  const E_kin = 0.5 * (I.I1 * state.w1 * state.w1 + I.I2 * state.w2 * state.w2 + I.I3 * state.w3 * state.w3);

  // Rotate body vector L_body into lab frame via quaternion: v' = q * v * q_inv
  const qw = state.qw, qx = state.qx, qy = state.qy, qz = state.qz;

  // Standard rotation matrix from quaternion
  const r00 = 1 - 2 * (qy * qy + qz * qz);
  const r01 = 2 * (qx * qy - qz * qw);
  const r02 = 2 * (qx * qz + qy * qw);

  const r10 = 2 * (qx * qy + qz * qw);
  const r11 = 1 - 2 * (qx * qx + qz * qz);
  const r12 = 2 * (qy * qz - qx * qw);

  const r20 = 2 * (qx * qz - qy * qw);
  const r21 = 2 * (qy * qz + qx * qw);
  const r22 = 1 - 2 * (qx * qx + qy * qy);

  const Lx = r00 * Lb1 + r01 * Lb2 + r02 * Lb3;
  const Ly = r10 * Lb1 + r11 * Lb2 + r12 * Lb3;
  const Lz = r20 * Lb1 + r21 * Lb2 + r22 * Lb3;

  const L_mag = Math.sqrt(Lx * Lx + Ly * Ly + Lz * Lz);

  return {
    L_lab: [Lx, Ly, Lz],
    L_mag,
    kineticEnergy: E_kin,
  };
}

// ==========================================
// 5. LORENTZ FORCE & BORIS ALGORITHM (MAGNETIC MIRROR)
// ==========================================
export interface BorisParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  q: number; // charge (Coulombs or normalized)
  m: number; // mass (kg or normalized)
}

// Magnetic dipole field or magnetic mirror field
export function getMagneticField(
  pos: [number, number, number],
  mode: 'dipole' | 'mirrorBottle',
  strength = 1.0
): [number, number, number] {
  const [x, y, z] = pos;

  if (mode === 'dipole') {
    // Dipole aligned along Z axis at origin:
    // B = (mu0/(4pi)) * [3(m . r)r / r^5 - m / r^3]
    const r2 = x * x + y * y + z * z + 0.05; // softening parameter to prevent singularity
    const r = Math.sqrt(r2);
    const r5 = r2 * r2 * r;
    const r3 = r2 * r;

    // Dipole moment m = [0, 0, M]
    const mDotR = strength * z;
    const factor = 3 * mDotR / r5;

    const Bx = factor * x;
    const By = factor * y;
    const Bz = factor * z - strength / r3;

    return [Bx, By, Bz];
  } else {
    // Magnetic Mirror Bottle (two magnetic coils at z = -L and z = +L)
    // Field has minimum at z = 0, maximum at z = +/- L (mirror points)
    // B_z(r, z) ~ B0 * (1 + alpha * z^2)
    // By div B = 0, dB_r/dr + B_r/r + dB_z/dz = 0 => B_r = -0.5 * r * dB_z/dz
    const L = 3.0;
    const alpha = 0.4;
    const B0 = strength;

    const Bz = B0 * (1 + alpha * (z * z) / (L * L));
    const dBz_dz = B0 * (2 * alpha * z) / (L * L);

    // Radial coordinate rho = sqrt(x^2 + y^2)
    const rho = Math.sqrt(x * x + y * y) + 1e-6;
    const Br = -0.5 * rho * dBz_dz;

    const Bx = Br * (x / rho);
    const By = Br * (y / rho);

    return [Bx, By, Bz];
  }
}

// Boris Algorithm implementation for exact volume-preserving phase space integration
export function stepBorisParticle(
  p: BorisParticle,
  fieldMode: 'dipole' | 'mirrorBottle',
  fieldStrength: number,
  dt: number,
  E: [number, number, number] = [0, 0, 0]
): BorisParticle {
  const q_over_m = p.q / p.m;

  // 1. Half step velocity with E field
  const v_minus_x = p.vx + q_over_m * E[0] * 0.5 * dt;
  const v_minus_y = p.vy + q_over_m * E[1] * 0.5 * dt;
  const v_minus_z = p.vz + q_over_m * E[2] * 0.5 * dt;

  // 2. Evaluate magnetic field at current position
  const [Bx, By, Bz] = getMagneticField([p.x, p.y, p.z], fieldMode, fieldStrength);

  // Rotation vector t = (q * B / m) * (dt / 2)
  const tx = q_over_m * Bx * 0.5 * dt;
  const ty = q_over_m * By * 0.5 * dt;
  const tz = q_over_m * Bz * 0.5 * dt;

  const t2 = tx * tx + ty * ty + tz * tz;
  const s_factor = 2 / (1 + t2);
  const sx = tx * s_factor;
  const sy = ty * s_factor;
  const sz = tz * s_factor;

  // v_prime = v_minus + v_minus x t
  const v_prime_x = v_minus_x + (v_minus_y * tz - v_minus_z * ty);
  const v_prime_y = v_minus_y + (v_minus_z * tx - v_minus_x * tz);
  const v_prime_z = v_minus_z + (v_minus_x * ty - v_minus_y * tx);

  // v_plus = v_minus + v_prime x s
  const v_plus_x = v_minus_x + (v_prime_y * sz - v_prime_z * sy);
  const v_plus_y = v_minus_y + (v_prime_z * sx - v_prime_x * sz);
  const v_plus_z = v_minus_z + (v_prime_x * sy - v_prime_y * sx);

  // 3. Second half step velocity with E field
  const new_vx = v_plus_x + q_over_m * E[0] * 0.5 * dt;
  const new_vy = v_plus_y + q_over_m * E[1] * 0.5 * dt;
  const new_vz = v_plus_z + q_over_m * E[2] * 0.5 * dt;

  // 4. Update position with new velocity
  const new_x = p.x + new_vx * dt;
  const new_y = p.y + new_vy * dt;
  const new_z = p.z + new_vz * dt;

  return {
    ...p,
    x: new_x,
    y: new_y,
    z: new_z,
    vx: new_vx,
    vy: new_vy,
    vz: new_vz,
  };
}

// ==========================================
// 6. DOUBLE PENDULUM RK4 FOR CHAOS BENCH
// ==========================================
export interface DoublePendulumState {
  theta1: number;
  theta2: number;
  omega1: number;
  omega2: number;
}

export interface DoublePendulumParams {
  l1: number;
  l2: number;
  m1: number;
  m2: number;
  g: number;
}

export function doublePendulumDerivatives(
  s: DoublePendulumState,
  p: DoublePendulumParams
): [number, number, number, number] {
  const { theta1, theta2, omega1, omega2 } = s;
  const { l1, l2, m1, m2, g } = p;

  const delta = theta1 - theta2;

  // Denominators
  const den1 = l1 * (2 * m1 + m2 - m2 * Math.cos(2 * theta1 - 2 * theta2));
  const den2 = l2 * (2 * m1 + m2 - m2 * Math.cos(2 * theta1 - 2 * theta2));

  // Angular accelerations from Euler-Lagrange equations
  const num1 =
    -g * (2 * m1 + m2) * Math.sin(theta1) -
    m2 * g * Math.sin(theta1 - 2 * theta2) -
    2 * Math.sin(delta) * m2 * (omega2 * omega2 * l2 + omega1 * omega1 * l1 * Math.cos(delta));
  const alpha1 = num1 / den1;

  const num2 =
    2 *
    Math.sin(delta) *
    (omega1 * omega1 * l1 * (m1 + m2) +
      g * (m1 + m2) * Math.cos(theta1) +
      omega2 * omega2 * l2 * m2 * Math.cos(delta));
  const alpha2 = num2 / den2;

  return [omega1, omega2, alpha1, alpha2];
}

export function stepDoublePendulumRK4(
  s: DoublePendulumState,
  p: DoublePendulumParams,
  dt: number
): DoublePendulumState {
  const [dth1_1, dth2_1, dom1_1, dom2_1] = doublePendulumDerivatives(s, p);

  const s2 = {
    theta1: s.theta1 + dth1_1 * 0.5 * dt,
    theta2: s.theta2 + dth2_1 * 0.5 * dt,
    omega1: s.omega1 + dom1_1 * 0.5 * dt,
    omega2: s.omega2 + dom2_1 * 0.5 * dt,
  };
  const [dth1_2, dth2_2, dom1_2, dom2_2] = doublePendulumDerivatives(s2, p);

  const s3 = {
    theta1: s.theta1 + dth1_2 * 0.5 * dt,
    theta2: s.theta2 + dth2_2 * 0.5 * dt,
    omega1: s.omega1 + dom1_2 * 0.5 * dt,
    omega2: s.omega2 + dom2_2 * 0.5 * dt,
  };
  const [dth1_3, dth2_3, dom1_3, dom2_3] = doublePendulumDerivatives(s3, p);

  const s4 = {
    theta1: s.theta1 + dth1_3 * dt,
    theta2: s.theta2 + dth2_3 * dt,
    omega1: s.omega1 + dom1_3 * dt,
    omega2: s.omega2 + dom2_3 * dt,
  };
  const [dth1_4, dth2_4, dom1_4, dom2_4] = doublePendulumDerivatives(s4, p);

  return {
    theta1: s.theta1 + (dt / 6) * (dth1_1 + 2 * dth1_2 + 2 * dth1_3 + dth1_4),
    theta2: s.theta2 + (dt / 6) * (dth2_1 + 2 * dth2_2 + 2 * dth2_3 + dth2_4),
    omega1: s.omega1 + (dt / 6) * (dom1_1 + 2 * dom1_2 + 2 * dom1_3 + dom1_4),
    omega2: s.omega2 + (dt / 6) * (dom2_1 + 2 * dom2_2 + 2 * dom2_3 + dom2_4),
  };
}
