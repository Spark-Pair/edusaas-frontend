import React, { useEffect, useMemo, useRef, useState } from 'react';

const Select = ({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  required = false,
  disabled = false,
  error = '',
  className = '',
  searchable = true,
  title
}) => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef(null);

  const selected = useMemo(
    () => options.find((option) => String(option.value) === String(value)) || null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((item) => String(item.label || '').toLowerCase().includes(q));
  }, [options, query, searchable]);

  useEffect(() => {
    if (open) setMounted(true);
    else if (mounted) {
      const timer = setTimeout(() => setMounted(false), 140);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, mounted]);

  useEffect(() => {
    const onMouseDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const emitChange = (nextValue) => {
    if (typeof onChange === 'function') {
      onChange({ target: { name, value: nextValue } });
    }
    setOpen(false);
    setQuery('');
  };

  return (
    <div className={className} ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input type="hidden" name={name} value={value || ''} required={required} />

      <button
        type="button"
        data-tooltip={title || selected?.label || placeholder}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-colors text-left flex items-center justify-between gap-2 ${
          error ? 'border-red-300 bg-red-50' : 'border-slate-300'
        } ${disabled ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-white hover:border-slate-400'}`}
      >
        <span className={`truncate ${selected ? 'text-slate-800' : 'text-slate-400'}`}>
          {selected?.label || placeholder}
        </span>
        <svg className={`w-4 h-4 text-slate-500 transition ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {mounted && !disabled && (
        <div className="relative">
          <div
            className={`absolute z-40 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg origin-top overflow-hidden transition-all duration-180 ${
              open ? 'opacity-100 max-h-72 py-1 pointer-events-auto' : 'opacity-0 max-h-0 py-0 pointer-events-none'
            }`}
          >
            {searchable && (
              <div className="px-2 pb-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full px-2.5 py-1.5 text-sm border border-slate-300 rounded-md outline-none focus:border-slate-500"
                  autoFocus
                />
              </div>
            )}
            <div className="max-h-56 overflow-auto">
              {filteredOptions.map((option) => {
                const active = String(option.value) === String(value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    data-tooltip={option.label}
                    onClick={() => emitChange(option.value)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${
                      active ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {active && (
                      <svg className="w-4 h-4 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
              {filteredOptions.length === 0 && (
                <p className="px-3 py-2 text-xs text-slate-500">No options found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default Select;
