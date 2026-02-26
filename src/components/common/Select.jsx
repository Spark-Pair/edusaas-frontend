import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const focusNextInFormOrSubmit = (currentElement) => {
  const form = currentElement?.closest?.('form');
  if (!form) return;
  const focusable = Array.from(
    form.querySelectorAll('input, select, textarea, [data-form-field="true"]')
  ).filter((node, index, arr) => {
    if (arr.indexOf(node) !== index) return false;
    if (!node || node.disabled) return false;
    if (node.type === 'hidden') return false;
    return true;
  });
  const currentIndex = focusable.indexOf(currentElement);
  const next = currentIndex >= 0 ? focusable[currentIndex + 1] : null;
  if (next) {
    next.focus();
    if (typeof next.select === 'function') next.select();
    return;
  }
  if (typeof form.requestSubmit === 'function') form.requestSubmit();
};

const Select = React.forwardRef(({
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
  title,
  tooltipDirection = 'top'
}, ref) => {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0, width: 0 });
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

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
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setMenuStyle({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width
    });
  }, [open]);

  useEffect(() => {
    if (!open) {
      setHighlightedIndex(-1);
      return;
    }
    const selectedIndex = filteredOptions.findIndex((option) => String(option.value) === String(value));
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : (filteredOptions.length > 0 ? 0 : -1));
  }, [open, filteredOptions, value]);

  useEffect(() => {
    const onMouseDown = (event) => {
      const insideTrigger = wrapperRef.current?.contains(event.target);
      const insideMenu = menuRef.current?.contains(event.target);
      if (!insideTrigger && !insideMenu) setOpen(false);
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
    const onScroll = () => setOpen(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('wheel', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('wheel', onScroll);
      window.removeEventListener('resize', onScroll);
    };
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
        ref={(node) => {
          triggerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        type="button"
        data-tooltip={title || selected?.label || placeholder}
        data-tooltip-direction={tooltipDirection}
        disabled={disabled}
        onClick={() => setOpen(true)}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) {
              setOpen(true);
              return;
            }
            if (filteredOptions.length === 0) return;
            const delta = event.key === 'ArrowDown' ? 1 : -1;
            const nextIndex = highlightedIndex < 0
              ? 0
              : (highlightedIndex + delta + filteredOptions.length) % filteredOptions.length;
            setHighlightedIndex(nextIndex);
            return;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            if (open && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
              emitChange(filteredOptions[highlightedIndex].value);
              return;
            }
            if (!open) {
              setOpen(true);
              return;
            }
            focusNextInFormOrSubmit(event.currentTarget);
            return;
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
          }
        }}
        data-form-field="true"
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

      {mounted && !disabled && createPortal(
        <div
          ref={menuRef}
          className={`fixed z-[90] rounded-lg border border-slate-200 bg-white shadow-lg origin-top overflow-hidden transition-all duration-180 ${
            open ? 'opacity-100 max-h-72 py-1 pointer-events-auto' : 'opacity-0 max-h-0 py-0 pointer-events-none'
          }`}
          style={{
            top: `${menuStyle.top}px`,
            left: `${menuStyle.left}px`,
            width: `${menuStyle.width}px`
          }}
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
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                      event.preventDefault();
                      if (filteredOptions.length === 0) return;
                      const delta = event.key === 'ArrowDown' ? 1 : -1;
                      const nextIndex = highlightedIndex < 0
                        ? 0
                        : (highlightedIndex + delta + filteredOptions.length) % filteredOptions.length;
                      setHighlightedIndex(nextIndex);
                      return;
                    }
                    if (event.key === 'Enter') {
                      if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
                        event.preventDefault();
                        emitChange(filteredOptions[highlightedIndex].value);
                      }
                    }
                  }}
                />
              </div>
            )}
          <div className="max-h-56 overflow-auto">
            {filteredOptions.map((option, index) => {
              const active = String(option.value) === String(value);
              const highlighted = index === highlightedIndex;
              return (
                <button
                  key={option.value}
                  type="button"
                  data-tooltip={option.label}
                  data-tooltip-direction="right"
                  onClick={() => emitChange(option.value)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${
                    active || highlighted ? 'bg-slate-100 text-slate-900 font-medium' : 'text-slate-700 hover:bg-slate-50'
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
        </div>,
        document.body
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;
