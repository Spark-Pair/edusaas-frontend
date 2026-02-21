import React, { useRef, useState, useEffect } from 'react';

const DEFAULT_STATUSES = [
  { value: 'active',   label: 'Active',   color: 'bg-emerald-500' },
  { value: 'inactive', label: 'Inactive', color: 'bg-amber-400'   },
  { value: 'left',     label: 'Left',     color: 'bg-red-400'     },
];

const StatusSegmentedControl = ({ value, onChange, statuses = DEFAULT_STATUSES }) => {
  const btnRefs = useRef([]);
  const [thumbStyle, setThumbStyle] = useState({ width: 0, left: 0 });
  const currentIndex = statuses.findIndex(s => s.value === value);

  useEffect(() => {
    const el = btnRefs.current[currentIndex];
    if (el) setThumbStyle({ width: el.offsetWidth, left: el.offsetLeft });
  }, [value]);

  // Measure on mount
  useEffect(() => {
    const el = btnRefs.current[currentIndex];
    if (el) setThumbStyle({ width: el.offsetWidth, left: el.offsetLeft });
  }, []);

  return (
    <div className="relative flex bg-slate-100 rounded-full p-1">
      {/* Sliding thumb */}
      <div
        className={`absolute top-1 bottom-1 rounded-full transition-all duration-300 ease-in-out ${statuses[currentIndex]?.color ?? 'bg-slate-500'}`}
        style={{ width: thumbStyle.width, left: thumbStyle.left }}
      />

      {statuses.map((s, i) => (
        <button
          key={s.value}
          ref={(el) => (btnRefs.current[i] = el)}
          type="button"
          onClick={() => onChange(s.value)}
          className={`relative z-10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full transition-colors duration-300 whitespace-nowrap ${
            value === s.value ? 'text-white' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
};

export default StatusSegmentedControl;