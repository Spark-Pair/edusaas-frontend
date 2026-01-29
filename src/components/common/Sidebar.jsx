import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const Sidebar = ({ items, title, subtitle, onLogout }) => {
  const navigate = useNavigate();

  return (
    <div className="w-60 bg-white border-r border-slate-200 fixed h-full flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-slate-800 text-sm truncate">{title}</h2>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `sidebar-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                isActive ? 'active text-slate-800' : 'text-slate-600 hover:text-slate-800'
              }`
            }
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-200">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
