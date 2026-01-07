
import React from 'react';

interface VerticalFaderProps {
  value: number;
  onChange: (val: number) => void;
}

export const VerticalFader: React.FC<VerticalFaderProps> = ({ value, onChange }) => {
  return (
    <div className="relative h-44 flex flex-col items-center justify-between py-2 group">
      {/* Ticks */}
      <div className="absolute left-[-18px] top-0 bottom-0 flex flex-col justify-between py-2 text-[8px] text-gray-600 font-mono select-none">
        {['+6', '0', '-6', '-12', '-24', '-inf'].map((v, i) => (
           <div key={i} className="flex items-center gap-1">
             <span className="w-4 text-right">{v}</span>
             <span className="opacity-40">—</span>
           </div>
        ))}
      </div>
      
      {/* Track Slot */}
      <div className="w-1.5 h-36 bg-black rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_1px_1px_rgba(255,255,255,0.05)] relative overflow-visible">
        {/* Level Indicator (Visual Only) */}
        <div 
          className="absolute bottom-0 left-0 right-0 bg-red-500/20 rounded-full transition-all duration-200"
          style={{ height: `${value}%` }}
        />
        
        {/* Invisible range input for interaction */}
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          style={{ appearance: 'slider-vertical', width: '40px', left: '-18px' } as any}
        />
        
        {/* Custom Visual Thumb */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-12 h-16 bg-gradient-to-b from-[#555] via-[#333] to-[#1a1a1a] rounded-lg shadow-[0_10px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] border border-[#111] pointer-events-none transition-all duration-75 flex flex-col items-center justify-center gap-1"
          style={{ bottom: `calc(${(value / 100) * 85}% - 4px)` }}
        >
          {/* Fader center line */}
          <div className="w-8 h-1 bg-black/60 rounded-full shadow-inner" />
          {/* Grip texture */}
          <div className="flex flex-col gap-0.5">
            <div className="w-4 h-0.5 bg-white/5 rounded-full" />
            <div className="w-4 h-0.5 bg-white/5 rounded-full" />
          </div>
        </div>
      </div>
      
      <div className="mt-2">
         <span className={`text-[8px] font-mono transition-colors ${value > 80 ? 'text-red-500' : 'text-gray-500'}`}>
           {value.toString().padStart(3, '0')}
         </span>
      </div>
    </div>
  );
};
