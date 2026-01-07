
import React, { useRef, useState, useEffect } from 'react';

interface ControlKnobProps {
  label: string;
  value: number;
  color?: string;
  onChange?: (value: number) => void;
  size?: 'small' | 'medium' | 'large';
}

export const ControlKnob: React.FC<ControlKnobProps> = ({ label, value, color = 'gray', onChange, size = 'medium' }) => {
  const rotation = (value / 100) * 270 - 135; // Map 0-100 to -135deg to 135deg
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef<number>(0);
  const startValueRef = useRef<number>(0);

  const getSizeClass = () => {
    switch(size) {
      case 'small': return 'w-8 h-8';
      case 'large': return 'w-20 h-20 border-[3px]';
      default: return 'w-10 h-10';
    }
  };

  const getIndicatorSize = () => {
    switch(size) {
      case 'large': return 'w-2 h-6 top-2';
      default: return 'w-1 h-3 top-1';
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !onChange) return;
      
      const deltaY = startYRef.current - e.clientY;
      // Sensitivity: 100px drag = full range
      const deltaValue = (deltaY / 100) * 100;
      
      const newValue = Math.min(100, Math.max(0, startValueRef.current + deltaValue));
      onChange(Math.round(newValue));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize'; // Change cursor to indicate vertical drag
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!onChange) return;
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div 
        ref={knobRef}
        onMouseDown={handleMouseDown}
        className={`relative ${getSizeClass()} rounded-full bg-gradient-to-b from-[#2a2a2a] to-[#000] shadow-[0_4px_10px_black,inset_0_1px_1px_rgba(255,255,255,0.2)] flex items-center justify-center border border-[#111] cursor-ns-resize group ${isDragging ? 'cursor-none' : ''}`}
      >
        <div 
          className="w-full h-full rounded-full transition-transform duration-75 ease-linear pointer-events-none flex items-center justify-center"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <div className={`absolute ${getIndicatorSize()} bg-white rounded-full shadow-[0_0_2px_rgba(255,255,255,0.5)]`} />
        </div>
      </div>
      <span className="text-[7px] font-bold text-gray-500 uppercase tracking-tighter cursor-default select-none mt-1">{label}</span>
    </div>
  );
};
