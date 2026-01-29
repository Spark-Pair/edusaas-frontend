import React from 'react';

const Card = ({ children, className = '', padding = 'md' }) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6'
  };

  return (
    <div className={`bg-white border border-slate-200 rounded-xl ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
};

export default Card;
