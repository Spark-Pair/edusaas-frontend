import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { tenantAPI } from '../../services/api';
import { StatCard, Card, Badge, LoadingSpinner } from '../../components/common';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data } = await tenantAPI.getStats();
      setStats(data.data || {});
    } catch (error) {
      toast.error('Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading dashboard..." />;
  }

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">School overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Students"
          value={stats.totalStudents || 0}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
        />
        <StatCard
          title="Total Classes"
          value={stats.totalClasses || 0}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
        />
        <StatCard
          title="Today's Attendance"
          value={`${stats.attendancePercent || 0}%`}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Total Exams"
          value={stats.totalExams || 0}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-medium text-slate-800 mb-4">Recent Students</h3>
          <div className="space-y-3">
            {stats.recentStudents?.slice(0, 5).map((student) => (
              <div key={student._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center">
                    <span className="text-slate-600 font-medium text-sm">{student.firstName?.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{student.firstName} {student.lastName}</p>
                    <p className="text-xs text-slate-500">{student.classId?.name || 'N/A'}</p>
                  </div>
                </div>
                <Badge variant={student.status === 'active' ? 'success' : 'danger'} size="sm">
                  {student.status}
                </Badge>
              </div>
            ))}
            {(!stats.recentStudents || stats.recentStudents.length === 0) && (
              <p className="text-slate-500 text-center py-4 text-sm">No students yet</p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="font-medium text-slate-800 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/dashboard/students" className="p-4 bg-slate-50 hover:bg-slate-100 rounded-lg text-center transition">
              <svg className="w-6 h-6 mx-auto mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              <span className="text-sm font-medium text-slate-700">Add Student</span>
            </Link>
            <Link to="/dashboard/attendance" className="p-4 bg-slate-50 hover:bg-slate-100 rounded-lg text-center transition">
              <svg className="w-6 h-6 mx-auto mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              <span className="text-sm font-medium text-slate-700">Attendance</span>
            </Link>
            <Link to="/dashboard/exams" className="p-4 bg-slate-50 hover:bg-slate-100 rounded-lg text-center transition">
              <svg className="w-6 h-6 mx-auto mb-2 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <span className="text-sm font-medium text-slate-700">Create Exam</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
