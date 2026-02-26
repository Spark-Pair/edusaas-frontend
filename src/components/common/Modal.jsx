import React, { useEffect, useState } from 'react';

const Modal = ({ isOpen, onClose, title, children, size = 'md', headerExtra = null }) => {
  const [mounted, setMounted] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setMounted(true);
    else if (mounted) {
      const timer = setTimeout(() => setMounted(false), 180);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, mounted]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div
      className={`fixed inset-0 z-50 p-4 flex items-center justify-center transition-opacity duration-180 ${
        isOpen ? 'bg-slate-900/50 opacity-100' : 'bg-slate-900/0 opacity-0 pointer-events-none'
      }`}
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-xl w-full ${sizeClasses[size]} shadow-xl max-h-[90vh] overflow-hidden flex flex-col transition-all duration-200 ${
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <div className="flex items-center gap-2">
            {headerExtra}
            <button
              type="button"
              data-tooltip="Close"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition p-1.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-5 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
