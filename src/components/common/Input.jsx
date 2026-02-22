import React from 'react';

const Input = ({
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
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        data-tooltip={title || undefined}
        data-tooltip-direction={title ? tooltipDirection : undefined}
        className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none ${
          error ? 'border-red-300 bg-red-50' : 'border-slate-300'
        } ${disabled ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-white'}`}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default Input;
