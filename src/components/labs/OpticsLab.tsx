import React, { useState, useRef, useEffect } from 'react';
import { 
  Atom, 
  RotateCcw, 
  Sliders, 
  Eye, 
  Layers, 
  Sun, 
  Sparkles, 
  Check, 
  Flame,
  Zap
} from 'lucide-react';
import { SimulationState } from '../../types';
import { ParameterControl } from '../ParameterControl';
import { 
  LensParams, 
  ObjectParams, 
  computeThinLensImage, 
  getCauchyRefractiveIndex, 
  getDispersedFocalLength 
} from '../../utils/physics';

interface OpticsLabProps {
  simState: SimulationState;
}

const GLASS_PRESETS = [
  { name: 'Crown Glass (n = 1.517)', n: 1.517 },
  { name: 'Flint Glass (n = 1.620)', n: 1.620 },
  { name: 'Water Lens (n = 1.333)', n: 1.333 },
  { name: 'Diamond / High-Index (n = 2.417)', n: 2.417 },
];

export const OpticsLab: React.FC<OpticsLabProps> = ({ simState }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Optical bench configuration
  const [focalLength, setFocalLength] = useState<number>(20); // cm (+ for convex, - for concave)
  const [objectDist, setObjectDist] = useState<number>(35); // cm in front of lens
  const [objectHeight, setObjectHeight] = useState<number>(12); // cm
  const [refractiveIndex, setRefractiveIndex] = useState<number>(1.517);
  const [rayMode, setRayMode] = useState<'principal' | 'bundle' | 'parallel'>('principal');
  const [showVirtualExtensions, setShowVirtualExtensions] = useState<boolean>(true);
  const [enableDispersion, setEnableDispersion] = useState<boolean>(false);
  const [isDraggingObj, setIsDraggingObj] = useState<boolean>(false);

  // Derived optical positions (centered on lens at x = 0 cm)
  const lens: LensParams = {
    focalLength,
    lensX: 0,
    lensHeight: 25,
    refractiveIndex,
  };

  const obj: ObjectParams = {
    objX: -objectDist,
    objHeight: objectHeight,
  };

  const imageResult = computeThinLensImage(lens, obj);

  // Wavelengths for chromatic dispersion (Red, Green, Blue)
  const colors = [
    { name: 'Red', lambda: 650, color: '#ef4444' },
    { name: 'Green', lambda: 532, color: '#10b981' },
    { name: 'Blue', lambda: 450, color: '#3b82f6' },
  ];

  // Render optical bench on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 800;
    const height = 480;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Bench coordinate mapping
    // Center of lens is at width / 2, height / 2
    const originX = width / 2;
    const originY = height / 2;
    // Scale: pixels per cm
    const cmScale = Math.min(width / 140, 6.5);

    const toScreenX = (cmX: number) => originX + cmX * cmScale;
    const toScreenY = (cmY: number) => originY - cmY * cmScale; // Y goes up

    // Clear background
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, width, height);

    // 1. Draw Optical Axis (Principal Axis)
    ctx.strokeStyle = '#1a1f2e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.stroke();

    // Bench ruler markings (ticks every 10 cm, subticks every 5 cm)
    ctx.fillStyle = '#a0aec0';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';

    const maxCm = Math.ceil(width / (2 * cmScale));
    for (let cm = -maxCm; cm <= maxCm; cm += 5) {
      const sx = toScreenX(cm);
      const isMajor = cm % 10 === 0;
      ctx.strokeStyle = isMajor ? '#1a1f2e' : '#111622';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx, originY - (isMajor ? 8 : 4));
      ctx.lineTo(sx, originY + (isMajor ? 8 : 4));
      ctx.stroke();

      if (isMajor && cm !== 0 && Math.abs(cm) <= 60) {
        ctx.fillText(`${cm > 0 ? `+${cm}` : cm}cm`, sx, originY + 20);
      }
    }

    // 2. Draw Focal Points (F1 and F2, plus 2F1 and 2F2)
    const f = lens.focalLength;
    const focalPoints = [
      { cm: -f, label: f > 0 ? 'F₁' : "F₂'", color: '#ffffff' },
      { cm: f, label: f > 0 ? 'F₂' : "F₁'", color: '#ffffff' },
      { cm: -2 * f, label: '2F₁', color: '#a0aec0' },
      { cm: 2 * f, label: '2F₂', color: '#a0aec0' },
    ];

    focalPoints.forEach((fp) => {
      const sx = toScreenX(fp.cm);
      ctx.fillStyle = fp.color;
      ctx.beginPath();
      ctx.arc(sx, originY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(fp.label, sx, originY - 12);
    });

    // 3. Draw Lens Geometry at x = 0
    const lensTopY = toScreenY(lens.lensHeight);
    const lensBottomY = toScreenY(-lens.lensHeight);
    const lensXScreen = toScreenX(0);

    ctx.save();
    if (f > 0) {
      // Convex (Biconvex) Lens
      const bulge = Math.min(22, Math.abs(f) * 0.8);
      ctx.fillStyle = 'rgba(220, 220, 220, 0.12)';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lensXScreen, lensTopY);
      ctx.quadraticCurveTo(lensXScreen + bulge, originY, lensXScreen, lensBottomY);
      ctx.quadraticCurveTo(lensXScreen - bulge, originY, lensXScreen, lensTopY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Top/bottom optical arrowheads representing convex
      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.moveTo(lensXScreen, lensTopY - 6);
      ctx.lineTo(lensXScreen - 5, lensTopY);
      ctx.lineTo(lensXScreen + 5, lensTopY);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(lensXScreen, lensBottomY + 6);
      ctx.lineTo(lensXScreen - 5, lensBottomY);
      ctx.lineTo(lensXScreen + 5, lensBottomY);
      ctx.closePath();
      ctx.fill();
    } else {
      // Concave (Biconcave) Lens
      const inward = Math.min(18, Math.abs(f) * 0.6);
      ctx.fillStyle = 'rgba(130, 130, 130, 0.12)';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lensXScreen - 12, lensTopY);
      ctx.quadraticCurveTo(lensXScreen - 12 + inward, originY, lensXScreen - 12, lensBottomY);
      ctx.lineTo(lensXScreen + 12, lensBottomY);
      ctx.quadraticCurveTo(lensXScreen + 12 - inward, originY, lensXScreen + 12, lensTopY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Concave inverted arrow markers
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.moveTo(lensXScreen, lensTopY);
      ctx.lineTo(lensXScreen - 6, lensTopY - 6);
      ctx.lineTo(lensXScreen + 6, lensTopY - 6);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(lensXScreen, lensBottomY);
      ctx.lineTo(lensXScreen - 6, lensBottomY + 6);
      ctx.lineTo(lensXScreen + 6, lensBottomY + 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 4. Draw Object (Arrow / Candle)
    const objSx = toScreenX(obj.objX);
    const objSy = toScreenY(obj.objHeight);
    const objBaseSy = toScreenY(0);

    ctx.save();
    // Object body
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(objSx, objBaseSy);
    ctx.lineTo(objSx, objSy);
    ctx.stroke();

    // Object arrowhead
    const arrowDir = obj.objHeight >= 0 ? -1 : 1;
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(objSx, objSy);
    ctx.lineTo(objSx - 6, objSy - arrowDir * 10);
    ctx.lineTo(objSx + 6, objSy - arrowDir * 10);
    ctx.closePath();
    ctx.fill();

    // Object glow tip
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(objSx, objSy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#7dd3fc';
    ctx.fillText('Object', objSx, objBaseSy + 16);

    // 5. Draw Image (Real or Virtual)
    if (imageResult.isValid && Math.abs(imageResult.imgX) < 200) {
      const imgSx = toScreenX(imageResult.imgX);
      const imgSy = toScreenY(imageResult.imgHeight);
      const imgBaseSy = toScreenY(0);

      ctx.save();
      if (imageResult.isReal) {
        // Real image: Solid green
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(imgSx, imgBaseSy);
        ctx.lineTo(imgSx, imgSy);
        ctx.stroke();

        const imgArrowDir = imageResult.imgHeight >= 0 ? -1 : 1;
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.moveTo(imgSx, imgSy);
        ctx.lineTo(imgSx - 6, imgSy - imgArrowDir * 10);
        ctx.lineTo(imgSx + 6, imgSy - imgArrowDir * 10);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#6ee7b7';
        ctx.fillText('Real Image', imgSx, imgBaseSy + 16);
      } else {
        // Virtual image: Dashed magenta
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(imgSx, imgBaseSy);
        ctx.lineTo(imgSx, imgSy);
        ctx.stroke();

        const imgArrowDir = imageResult.imgHeight >= 0 ? -1 : 1;
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.moveTo(imgSx, imgSy);
        ctx.lineTo(imgSx - 6, imgSy - imgArrowDir * 10);
        ctx.lineTo(imgSx + 6, imgSy - imgArrowDir * 10);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#f472b6';
        ctx.fillText('Virtual Image', imgSx, imgBaseSy + 16);
      }
      ctx.restore();
    }

    // 6. Ray Tracing
    const tipX = obj.objX;
    const tipY = obj.objHeight;

    if (enableDispersion) {
      // Chromatic dispersion: trace parallel rays with dispersed wavelengths
      colors.forEach((c) => {
        const nLambda = getCauchyRefractiveIndex(refractiveIndex, c.lambda);
        const fLambda = getDispersedFocalLength(focalLength, refractiveIndex, nLambda);

        const sTipX = toScreenX(tipX);
        const sTipY = toScreenY(tipY);
        const sLensX = toScreenX(0);
        const sLensY = toScreenY(tipY);
        const sFocusX = toScreenX(fLambda);
        const sFocusY = toScreenY(0);

        // Ray to lens
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(sTipX, sTipY);
        ctx.lineTo(sLensX, sLensY);
        ctx.stroke();

        // Refracted ray passing through dispersed focus
        const slope = (sFocusY - sLensY) / (sFocusX - sLensX);
        const rightEdgeX = width;
        const rightEdgeY = sLensY + slope * (rightEdgeX - sLensX);

        ctx.beginPath();
        ctx.moveTo(sLensX, sLensY);
        ctx.lineTo(rightEdgeX, rightEdgeY);
        ctx.stroke();

        // Dispersed focal marker
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.arc(sFocusX, sFocusY, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (rayMode === 'principal') {
      // 3 Canonical Principal Rays
      const sTipX = toScreenX(tipX);
      const sTipY = toScreenY(tipY);
      const sLensX = toScreenX(0);

      // --- Ray 1: Parallel to Optical Axis ---
      ctx.save();
      ctx.strokeStyle = '#f59e0b'; // Amber
      ctx.lineWidth = 2;
      ctx.beginPath();
      // From tip to lens parallel to axis
      ctx.moveTo(sTipX, sTipY);
      ctx.lineTo(sLensX, sTipY);
      ctx.stroke();

      if (f > 0) {
        // Convex: Refracts through rear focus F2 (+f)
        const sF2X = toScreenX(f);
        const sF2Y = toScreenY(0);
        const slope = (sF2Y - sTipY) / (sF2X - sLensX);
        const targetX = width;
        const targetY = sTipY + slope * (targetX - sLensX);

        ctx.beginPath();
        ctx.moveTo(sLensX, sTipY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();

        // If virtual, backtrace dashed line
        if (showVirtualExtensions && !imageResult.isReal && imageResult.isValid) {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = 'rgba(160, 160, 160, 0.6)';
          const backX = 0;
          const backY = sTipY + slope * (backX - sLensX);
          ctx.beginPath();
          ctx.moveTo(sLensX, sTipY);
          ctx.lineTo(backX, backY);
          ctx.stroke();
        }
      } else {
        // Concave: Appears to diverge from front focus F1 (-|f|)
        const sF1X = toScreenX(f);
        const sF1Y = toScreenY(0);
        const slope = (sTipY - sF1Y) / (sLensX - sF1X);
        const targetX = width;
        const targetY = sTipY + slope * (targetX - sLensX);

        ctx.beginPath();
        ctx.moveTo(sLensX, sTipY);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();

        if (showVirtualExtensions) {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = 'rgba(160, 160, 160, 0.6)';
          ctx.beginPath();
          ctx.moveTo(sLensX, sTipY);
          ctx.lineTo(sF1X, sF1Y);
          ctx.stroke();
        }
      }
      ctx.restore();

      // --- Ray 2: Chief Ray through Optical Center (0, 0) ---
      ctx.save();
      ctx.strokeStyle = '#06b6d4'; // Cyan
      ctx.lineWidth = 2;
      const sCenterY = toScreenY(0);
      const slope2 = (sCenterY - sTipY) / (sLensX - sTipX);
      const endX2 = width;
      const endY2 = sTipY + slope2 * (endX2 - sTipX);

      ctx.beginPath();
      ctx.moveTo(sTipX, sTipY);
      ctx.lineTo(endX2, endY2);
      ctx.stroke();

      if (showVirtualExtensions && !imageResult.isReal && imageResult.isValid) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = 'rgba(220, 220, 220, 0.6)';
        const backX2 = 0;
        const backY2 = sTipY + slope2 * (backX2 - sTipX);
        ctx.beginPath();
        ctx.moveTo(sTipX, sTipY);
        ctx.lineTo(backX2, backY2);
        ctx.stroke();
      }
      ctx.restore();

      // --- Ray 3: Focal Ray ---
      ctx.save();
      ctx.strokeStyle = '#a855f7'; // Purple
      ctx.lineWidth = 2;

      if (f > 0) {
        // Passes through front focus F1 (-f) to lens, emerges parallel
        const sF1X = toScreenX(-f);
        const sF1Y = toScreenY(0);
        const slope3 = (sF1Y - sTipY) / (sF1X - sTipX);
        const lensIntersectY = sTipY + slope3 * (sLensX - sTipX);

        ctx.beginPath();
        ctx.moveTo(sTipX, sTipY);
        ctx.lineTo(sLensX, lensIntersectY);
        ctx.stroke();

        // Emerges parallel to axis
        ctx.beginPath();
        ctx.moveTo(sLensX, lensIntersectY);
        ctx.lineTo(width, lensIntersectY);
        ctx.stroke();

        if (showVirtualExtensions && !imageResult.isReal && imageResult.isValid) {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = 'rgba(200, 200, 200, 0.6)';
          ctx.beginPath();
          ctx.moveTo(sLensX, lensIntersectY);
          ctx.lineTo(0, lensIntersectY);
          ctx.stroke();
        }
      } else {
        // Directed toward rear focus F2 (+|f|), emerges parallel
        const sF2X = toScreenX(-f); // f < 0, so -f > 0
        const sF2Y = toScreenY(0);
        const slope3 = (sF2Y - sTipY) / (sF2X - sTipX);
        const lensIntersectY = sTipY + slope3 * (sLensX - sTipX);

        ctx.beginPath();
        ctx.moveTo(sTipX, sTipY);
        ctx.lineTo(sLensX, lensIntersectY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(sLensX, lensIntersectY);
        ctx.lineTo(width, lensIntersectY);
        ctx.stroke();

        if (showVirtualExtensions) {
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = 'rgba(200, 200, 200, 0.6)';
          ctx.beginPath();
          ctx.moveTo(sLensX, lensIntersectY);
          ctx.lineTo(0, lensIntersectY);
          ctx.stroke();
        }
      }
      ctx.restore();
    } else if (rayMode === 'bundle') {
      // Ray fan / bundle from object tip across full lens aperture
      const sTipX = toScreenX(tipX);
      const sTipY = toScreenY(tipY);
      const sLensX = toScreenX(0);

      const numRays = 9;
      for (let i = 0; i < numRays; i++) {
        const lensFrac = (i / (numRays - 1)) * 2 - 1; // -1 to +1
        const lensYCm = lensFrac * (lens.lensHeight * 0.75);
        const sLensY = toScreenY(lensYCm);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sTipX, sTipY);
        ctx.lineTo(sLensX, sLensY);
        ctx.stroke();

        // Refracted toward image point if valid
        if (imageResult.isValid) {
          const sImgX = toScreenX(imageResult.imgX);
          const sImgY = toScreenY(imageResult.imgHeight);

          if (imageResult.isReal) {
            ctx.beginPath();
            ctx.moveTo(sLensX, sLensY);
            ctx.lineTo(sImgX, sImgY);
            ctx.stroke();
          } else {
            // Diverges away from virtual image
            const slope = (sLensY - sImgY) / (sLensX - sImgX);
            const targetX = width;
            const targetY = sLensY + slope * (targetX - sLensX);
            ctx.beginPath();
            ctx.moveTo(sLensX, sLensY);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();

            if (showVirtualExtensions) {
              ctx.save();
              ctx.setLineDash([3, 3]);
              ctx.strokeStyle = 'rgba(180, 180, 180, 0.35)';
              ctx.beginPath();
              ctx.moveTo(sLensX, sLensY);
              ctx.lineTo(sImgX, sImgY);
              ctx.stroke();
              ctx.restore();
            }
          }
        }
      }
    } else if (rayMode === 'parallel') {
      // Collimated parallel laser beam entering from left
      const sLensX = toScreenX(0);
      const beamYOffsets = [-15, -10, -5, 5, 10, 15];

      beamYOffsets.forEach((yOff) => {
        const sY = toScreenY(yOff);
        ctx.strokeStyle = '#22c55e'; // Green laser
        ctx.lineWidth = 1.8;

        // Inbound parallel beam
        ctx.beginPath();
        ctx.moveTo(0, sY);
        ctx.lineTo(sLensX, sY);
        ctx.stroke();

        // Refracted through focus F
        if (f > 0) {
          const sFocusX = toScreenX(f);
          const sFocusY = toScreenY(0);
          const slope = (sFocusY - sY) / (sFocusX - sLensX);
          const endX = width;
          const endY = sY + slope * (endX - sLensX);

          ctx.beginPath();
          ctx.moveTo(sLensX, sY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        } else {
          // Diverges from front focus
          const sFocusX = toScreenX(f);
          const sFocusY = toScreenY(0);
          const slope = (sY - sFocusY) / (sLensX - sFocusX);
          const endX = width;
          const endY = sY + slope * (endX - sLensX);

          ctx.beginPath();
          ctx.moveTo(sLensX, sY);
          ctx.lineTo(endX, endY);
          ctx.stroke();

          if (showVirtualExtensions) {
            ctx.save();
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = 'rgba(140, 140, 140, 0.4)';
            ctx.beginPath();
            ctx.moveTo(sLensX, sY);
            ctx.lineTo(sFocusX, sFocusY);
            ctx.stroke();
            ctx.restore();
          }
        }
      });
    }
  }, [
    focalLength,
    objectDist,
    objectHeight,
    refractiveIndex,
    rayMode,
    showVirtualExtensions,
    enableDispersion,
    imageResult,
  ]);

  // Diopter optical power (P = 1 / f in meters)
  const powerDiopters = (100 / focalLength).toFixed(2);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* Left Stage: Bench Canvas & Real-time Optical HUD (lg:col-span-8) */}
      <div className="lg:col-span-8 space-y-4">
        <div className="bg-[#0a0d14] border border-[#1a1f2e] rounded-2xl overflow-hidden shadow-2xl">
          {/* Top title bar */}
          <div className="px-5 py-3 border-b border-[#1a1f2e] bg-[#0a0d14] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#ffffff] font-semibold text-xs tracking-wider uppercase font-mono">
              <Atom className="w-4 h-4" />
              <span>Ray Optics Bench (Snell's Law & Thin Lens)</span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="flex rounded-lg bg-[#111622] p-0.5 border border-[#1a1f2e]">
                <button
                  id="lens-type-convex-btn"
                  onClick={() => setFocalLength(Math.abs(focalLength) || 20)}
                  className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider transition-all ${
                    focalLength > 0
                      ? 'bg-[#ffffff] text-[#05070a] shadow-[0_0_10px_rgba(255,255,255,0.4)]'
                      : 'text-[#a0aec0] hover:text-white'
                  }`}
                >
                  Convex
                </button>
                <button
                  id="lens-type-concave-btn"
                  onClick={() => setFocalLength(-Math.abs(focalLength) || -20)}
                  className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider transition-all ${
                    focalLength < 0
                      ? 'bg-[#cccccc] text-white shadow-[0_0_10px_rgba(204,204,204,0.4)]'
                      : 'text-[#a0aec0] hover:text-white'
                  }`}
                >
                  Concave
                </button>
              </div>
            </div>
          </div>

          {/* Optical Bench Canvas */}
          <div className="relative w-full bg-[#05070a]">
            <canvas ref={canvasRef} className="w-full block cursor-ew-resize" />

            {/* Ray Legend */}
            <div className="absolute top-3 left-3 bg-[#0a0d14]/90 backdrop-blur-md px-3 py-2 rounded-xl border border-[#1a1f2e] text-[10px] font-mono space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[#ffffff] rounded-full shadow-[0_0_6px_#ffffff]" />
                <span className="text-white">Parallel Ray → Focus</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-white rounded-full shadow-[0_0_6px_#ffffff]" />
                <span className="text-white">Chief Ray (Undeviated)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-[#cccccc] rounded-full shadow-[0_0_6px_#cccccc]" />
                <span className="text-white">Focal Ray → Parallel</span>
              </div>
              {showVirtualExtensions && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-0.5 border-b border-dashed border-[#cccccc]" />
                  <span className="text-[#cccccc]">Virtual Backtrace</span>
                </div>
              )}
            </div>
          </div>

          {/* Telemetry HUD metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 p-3.5 bg-[#080a0f] border-t border-[#1a1f2e]">
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Object Dist (dₒ)</div>
              <div className="text-sm font-mono font-bold text-[#ffffff]">
                {objectDist.toFixed(1)} <span className="text-[10px] font-normal text-[#a0aec0]/70">cm</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Image Dist (dᵢ)</div>
              <div className="text-sm font-mono font-bold text-white">
                {imageResult.isValid ? (
                  <span>
                    {imageResult.imgX.toFixed(1)}{' '}
                    <span className="text-[10px] font-normal text-[#a0aec0]/70">cm</span>
                  </span>
                ) : (
                  <span className="text-[#cccccc]">± Infinity</span>
                )}
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Focal Length (f)</div>
              <div className="text-sm font-mono font-bold text-[#ffffff]">
                {focalLength > 0 ? `+${focalLength}` : focalLength}{' '}
                <span className="text-[10px] font-normal text-[#a0aec0]/70">cm</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#cccccc] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Magnification (M)</div>
              <div className="text-sm font-mono font-bold text-[#cccccc]">
                {imageResult.isValid ? `${imageResult.magnification.toFixed(2)}x` : 'N/A'}
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#ffffff] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Optical Power</div>
              <div className="text-sm font-mono font-bold text-white">
                {powerDiopters} <span className="text-[10px] font-normal text-[#a0aec0]/70">D</span>
              </div>
            </div>
            <div className="p-2.5 bg-[#111622] rounded border-l-2 border-[#cccccc] border-y border-r border-[#1a1f2e]">
              <div className="block text-[9px] uppercase opacity-50 tracking-widest font-mono mb-0.5">Image Nature</div>
              <div className={`text-[10px] font-mono font-bold mt-0.5 px-1.5 py-0.5 rounded border inline-block ${
                !imageResult.isValid 
                  ? 'text-[#a0aec0] border-[#1a1f2e] bg-[#111622]' 
                  : imageResult.isReal 
                  ? 'text-[#ffffff] border-[#ffffff30] bg-[#ffffff15]' 
                  : 'text-[#cccccc] border-[#cccccc30] bg-[#cccccc15]'
              }`}>
                {!imageResult.isValid ? 'At Infinity' : imageResult.isReal ? 'Real / Inverted' : 'Virtual / Upright'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Controls Deck (lg:col-span-4) */}
      <div className="lg:col-span-4 lg:sticky lg:top-16 space-y-3.5 max-h-[calc(100vh-6.5rem)] lg:overflow-y-auto pr-1">
        {/* Instant Presets */}
        <div className="p-3 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-2">
          <div className="text-[10px] uppercase font-mono tracking-widest text-[#ffffff] font-semibold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#ffffff]" />
            <span>Optics Setup Presets</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => { setFocalLength(20); setObjectDist(12); setShowVirtualExtensions(true); }}
              className="px-2.5 py-1.5 rounded-lg bg-[#111622] hover:bg-[#1a1f2e] border border-[#1a1f2e] text-left text-xs text-white font-mono hover:border-[#ffffff]/40 transition-all"
            >
              <div className="font-bold text-[#ffffff]">🔍 Magnifier</div>
              <div className="text-[9px] text-[#a0aec0]">dₒ &lt; F (Virtual)</div>
            </button>
            <button
              onClick={() => { setFocalLength(20); setObjectDist(40); }}
              className="px-2.5 py-1.5 rounded-lg bg-[#111622] hover:bg-[#1a1f2e] border border-[#1a1f2e] text-left text-xs text-white font-mono hover:border-[#ffffff]/40 transition-all"
            >
              <div className="font-bold text-[#cccccc]">⚖️ 1:1 Inverted</div>
              <div className="text-[9px] text-[#a0aec0]">dₒ = 2F (Unit M)</div>
            </button>
            <button
              onClick={() => { setFocalLength(20); setObjectDist(60); }}
              className="px-2.5 py-1.5 rounded-lg bg-[#111622] hover:bg-[#1a1f2e] border border-[#1a1f2e] text-left text-xs text-white font-mono hover:border-[#ffffff]/40 transition-all"
            >
              <div className="font-bold text-amber-400">📷 Camera Zoom</div>
              <div className="text-[9px] text-[#a0aec0]">dₒ &gt; 2F (Miniaturized)</div>
            </button>
            <button
              onClick={() => { setFocalLength(-20); setObjectDist(25); setShowVirtualExtensions(true); }}
              className="px-2.5 py-1.5 rounded-lg bg-[#111622] hover:bg-[#1a1f2e] border border-[#1a1f2e] text-left text-xs text-white font-mono hover:border-[#ffffff]/40 transition-all"
            >
              <div className="font-bold text-emerald-400">✨ Diverging Peep</div>
              <div className="text-[9px] text-[#a0aec0]">Concave -20cm</div>
            </button>
          </div>
        </div>

        {/* Card 1: Object Position & Height */}
        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1f2e]">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
              <Sun className="w-3.5 h-3.5 text-[#ffffff]" />
              01 // Object Source
            </span>
          </div>

          {/* Object Distance */}
          <ParameterControl
            id="input-object-dist"
            label="Object Distance (dₒ)"
            value={objectDist}
            min={5}
            max={70}
            step={1}
            unit="cm"
            onChange={setObjectDist}
            accentColor="#ffffff"
            subLabel={
              <div className="flex justify-between">
                <span>&lt; F (Virtual)</span>
                <span>2F (Unit Mag)</span>
                <span>&gt; 2F (Real)</span>
              </div>
            }
          />

          {/* Object Height */}
          <ParameterControl
            id="input-object-height"
            label="Object Height (hₒ)"
            value={objectHeight}
            min={2}
            max={22}
            step={1}
            unit="cm"
            onChange={setObjectHeight}
            accentColor="#ffffff"
          />
        </div>

        {/* Card 2: Lens Geometry & Medium */}
        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-3">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1f2e]">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
              <Atom className="w-3.5 h-3.5 text-[#ffffff]" />
              02 // Lens & Medium
            </span>
          </div>

          {/* Focal Length Magnitude */}
          <ParameterControl
            id="input-focal-mag"
            label="Focal Length (|f|)"
            value={Math.abs(focalLength)}
            min={10}
            max={45}
            step={1}
            unit="cm"
            onChange={(val) => {
              setFocalLength(focalLength >= 0 ? val : -val);
            }}
            accentColor="#ffffff"
          />

          {/* Optical Medium Material */}
          <div>
            <label className="text-xs text-[#a0aec0] block mb-1">Refractive Material</label>
            <select
              id="select-glass-preset"
              value={refractiveIndex}
              onChange={(e) => setRefractiveIndex(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 bg-[#111622] border border-[#1a1f2e] rounded-lg text-xs text-white font-mono focus:outline-none focus:border-[#ffffff]"
            >
              {GLASS_PRESETS.map((g) => (
                <option key={g.name} value={g.n} className="bg-[#0a0d14]">
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Toggles */}
          <div className="pt-2 border-t border-[#1a1f2e] space-y-1.5">
            <label className="flex items-center gap-2 text-xs text-[#a0aec0] hover:text-white cursor-pointer transition-colors">
              <input
                id="toggle-dispersion"
                type="checkbox"
                checked={enableDispersion}
                onChange={(e) => setEnableDispersion(e.target.checked)}
                className="accent-[#ffffff] rounded"
              />
              <span>Cauchy Chromatic Dispersion</span>
            </label>
            <label className="flex items-center gap-2 text-xs text-[#a0aec0] hover:text-white cursor-pointer transition-colors">
              <input
                id="toggle-virtual-extensions"
                type="checkbox"
                checked={showVirtualExtensions}
                onChange={(e) => setShowVirtualExtensions(e.target.checked)}
                className="accent-[#ffffff] rounded"
              />
              <span>Show Virtual Backtracing</span>
            </label>
          </div>
        </div>

        {/* Card 3: Ray Tracing Mode */}
        <div className="p-4 rounded-xl bg-[#080a0f] border border-[#1a1f2e] space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-[#1a1f2e]">
            <span className="text-xs font-bold text-white uppercase tracking-[0.2em] opacity-80 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#cccccc]" />
              03 // Ray Tracing Modes
            </span>
          </div>

          <div className="space-y-1.5">
            {[
              { id: 'principal', title: '3 Principal Canonical Rays', desc: 'Parallel, Chief (center), and Focal rays' },
              { id: 'bundle', title: 'Aperture Ray Fan (Bundle)', desc: '9 rays filling the aperture demonstrating convergence' },
              { id: 'parallel', title: 'Collimated Laser Beam', desc: 'Parallel ray bank focusing at F' },
            ].map((m) => (
              <button
                key={m.id}
                id={`ray-mode-${m.id}`}
                onClick={() => setRayMode(m.id as any)}
                className={`w-full text-left p-2 rounded-xl border transition-all ${
                  rayMode === m.id
                    ? 'bg-[#cccccc15] border-[#cccccc] text-white shadow-[0_0_10px_rgba(204,204,204,0.2)]'
                    : 'bg-[#111622] hover:bg-[#1a1f2e] border-[#1a1f2e] text-[#a0aec0]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{m.title}</span>
                  {rayMode === m.id && <Check className="w-3 h-3 text-[#cccccc]" />}
                </div>
                <p className="text-[10px] text-[#a0aec0] mt-0.5">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
