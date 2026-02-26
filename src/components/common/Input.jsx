import React from 'react';

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

const Input = React.forwardRef(({
  label,
  type = 'text',
  name,
  value,
  onChange,
  onKeyDown,
  placeholder = '',
  required = false,
  disabled = false,
  error = '',
  className = '',
  title,
  tooltipDirection = 'top',
  ...rest
}, ref) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        ref={ref}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={(event) => {
          if (typeof onKeyDown === 'function') onKeyDown(event);
          if (event.defaultPrevented) return;
          if (event.key !== 'Enter') return;
          if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
          event.preventDefault();
          focusNextInFormOrSubmit(event.currentTarget);
        }}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        data-tooltip={title || undefined}
        data-tooltip-direction={title ? tooltipDirection : undefined}
        data-form-field="true"
        className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none ${
          error ? 'border-red-300 bg-red-50' : 'border-slate-300'
        } ${disabled ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-white'}`}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
