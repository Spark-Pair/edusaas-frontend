import React from 'react';

const LoadingSpinner = ({ size = 'md', text = '' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-[3px]'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 fade-in">
      <div className={`${sizeClasses[size]} border-slate-200 border-t-slate-600 rounded-full animate-spin`}></div>
      {text && <p className="mt-3 text-sm text-slate-500 animate-pulse">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
