export type LabId = 
  | 'ballistics'
  | 'optics'
  | 'airfoil'
  | 'dzhanibekov'
  | 'lorentz'
  | 'chaos'
  | 'orbital';

export interface LabMeta {
  id: LabId;
  name: string;
  category: 'Foundational' | 'Aerodynamics' | '3D Volumetric' | 'Chaos & Non-linear' | 'Astrophysics';
  badge: string;
  shortDesc: string;
  equations: string[];
}

export interface SimulationState {
  isRunning: boolean;
  timeScale: number; // 0.1x to 2x
  stepTrigger: number;
}
