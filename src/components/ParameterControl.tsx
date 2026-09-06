import React, { useState, useEffect } from 'react';

export interface ParameterControlProps {
  id?: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
  accentColor?: string; // e.g. '#ffffff' or '#cccccc'
  formatDisplay?: (val: number) => string;
  subLabel?: React.ReactNode;
  className?: string;
  precision?: number;
}

export const ParameterControl: React.FC<ParameterControlProps> = ({
  id,
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  accentColor = '#ffffff',
  formatDisplay,
  subLabel,
  className = '',
  precision,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [textValue, setTextValue] = useState(String(value));

  // Sync text value when external prop changes and user is not actively typing
  useEffect(() => {
    if (!isFocused) {
      // Determine precision if not explicitly provided
      const defaultPrecision = precision !== undefined 
        ? precision 
        : (step.toString().split('.')[1]?.length || (Number.isInteger(value) ? 0 : 2));
      
      const formatted = Number.isInteger(step) && Number.isInteger(value)
        ? String(value)
        : value.toFixed(defaultPrecision);
      setTextValue(formatted);
    }
  }, [value, isFocused, step, precision]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setTextValue(raw);

    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const commitValue = () => {
    setIsFocused(false);
    let parsed = parseFloat(textValue);
    if (isNaN(parsed)) {
      parsed = value;
    } else {
      // Clamp within min and max
      parsed = Math.min(Math.max(parsed, min), max);
      
      // Round to precision based on step
      const stepDecimals = precision !== undefined 
        ? precision 
        : (step.toString().split('.')[1]?.length || 0);
      if (stepDecimals > 0) {
        parsed = Number(parsed.toFixed(stepDecimals));
      } else {
        parsed = Math.round(parsed);
      }
    }
    setTextValue(String(parsed));
    onChange(parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commitValue();
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs gap-2">
        <label htmlFor={id ? `${id}-number` : undefined} className="text-[#a0aec0] truncate select-none">
          {label}
        </label>
        
        <div className="flex items-center gap-1.5 shrink-0">
          {formatDisplay && (
            <span className="font-mono text-[11px] text-[#a0aec0] font-medium hidden sm:inline">
              {formatDisplay(value)}
            </span>
          )}
          <div className="flex items-center bg-[#07090e] border border-[#1a1f2e] focus-within:border-white/60 focus-within:ring-1 focus-within:ring-white/30 rounded-md px-1.5 py-0.5 transition-all">
            <input
              id={id ? `${id}-number` : undefined}
              type="number"
              min={min}
              max={max}
              step={step}
              value={textValue}
              onFocus={() => setIsFocused(true)}
              onChange={handleTextChange}
              onBlur={commitValue}
              onKeyDown={handleKeyDown}
              className="w-14 sm:w-16 bg-transparent text-right font-mono text-xs font-bold text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              title="Type exact value with keyboard"
            />
            {unit && (
              <span className="font-mono text-[11px] text-[#a0aec0] ml-1 select-none">
                {unit}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Slider Bar */}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-[#1a1f2e] h-1.5 rounded-lg cursor-pointer transition-all"
        style={{ accentColor }}
      />

      {subLabel && (
        <div className="text-[9px] text-[#a0aec0]/60 font-mono mt-0.5">
          {subLabel}
        </div>
      )}
    </div>
  );
};
