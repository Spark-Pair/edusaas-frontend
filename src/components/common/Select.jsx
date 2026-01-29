import React from 'react';

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
  className = ''
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none appearance-none bg-no-repeat bg-right pr-8 ${
          error ? 'border-red-300 bg-red-50' : 'border-slate-300'
        } ${disabled ? 'bg-slate-100 cursor-not-allowed text-slate-500' : 'bg-white'}`}
        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em' }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default Select;
