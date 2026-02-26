import React, { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sidebar, Modal, Button } from '../../components/common';

const TenantLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [confirmSelection, setConfirmSelection] = useState('cancel');
  const cancelBtnRef = useRef(null);
  const proceedBtnRef = useRef(null);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const proceedLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    navigate('/login');
  };

  useEffect(() => {
    if (!showLogoutConfirm) return;
    setConfirmSelection('cancel');
    const timer = setTimeout(() => cancelBtnRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [showLogoutConfirm]);

  const sidebarItems = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      end: true,
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
    },
    {
      path: '/dashboard/classes',
      label: 'Classes',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
    },
    {
      path: '/dashboard/students',
      label: 'Students',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
    },
    {
      path: '/dashboard/attendance',
      label: 'Attendance',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
    },
    {
      path: '/dashboard/exams',
      label: 'Examinations',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
    }
  ];

  return (
    <>
      <div className="min-h-screen bg-slate-50 flex">
        <Sidebar
          items={sidebarItems}
          title={user?.schoolName || 'School'}
          subtitle="School Admin"
          onLogout={handleLogout}
        />
        <div className="ml-60 flex-1 p-6">
          <Outlet />
        </div>
      </div>
      <Modal isOpen={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} title="Logout" size="md">
        <div
          className="space-y-4"
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
              event.preventDefault();
              setConfirmSelection('cancel');
              cancelBtnRef.current?.focus();
              return;
            }
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
              event.preventDefault();
              setConfirmSelection('confirm');
              proceedBtnRef.current?.focus();
              return;
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              if (confirmSelection === 'cancel') setShowLogoutConfirm(false);
              else proceedLogout();
            }
          }}
        >
          <p className="text-sm text-slate-600">Are you sure you want to logout?</p>
          <div className="flex justify-end gap-2">
            <Button ref={cancelBtnRef} variant="ghost" onClick={() => setShowLogoutConfirm(false)} className={confirmSelection === 'cancel' ? 'ring-2 ring-slate-300' : ''}>
              Cancel
            </Button>
            <Button ref={proceedBtnRef} variant="danger" onClick={proceedLogout} className={confirmSelection === 'confirm' ? 'ring-2 ring-slate-300' : ''}>
              Logout
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default TenantLayout;
