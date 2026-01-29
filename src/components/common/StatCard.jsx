import React from 'react';

const StatCard = ({ title, value, icon, subtitle }) => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 card-hover">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>
        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-600">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
