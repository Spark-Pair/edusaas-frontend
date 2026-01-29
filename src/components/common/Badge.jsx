import React from 'react';

const Badge = ({ children, variant = 'default', size = 'md' }) => {
  const variantClasses = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700'
  };

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs'
  };

  return (
    <span className={`inline-flex items-center font-medium rounded-md ${variantClasses[variant]} ${sizeClasses[size]}`}>
      {children}
    </span>
  );
};

export default Badge;
