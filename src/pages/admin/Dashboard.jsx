import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { StatCard, Card, Badge, LoadingSpinner } from '../../components/common';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, tenantsRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getTenants()
      ]);
      setStats(statsRes.data.data);
      setTenants(tenantsRes.data.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const getValidityStatus = (date) => {
    const validityDate = new Date(date);
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (validityDate < now) return { status: 'Expired', variant: 'danger' };
    if (validityDate < sevenDays) return { status: 'Expiring', variant: 'warning' };
    return { status: 'Valid', variant: 'success' };
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading dashboard..." />;
  }

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">System overview and statistics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Tenants"
          value={stats.totalTenants || 0}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
        />
        <StatCard
          title="Active Tenants"
          value={stats.activeTenants || 0}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents || 0}
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
        />
        <StatCard
          title="Expiring Soon"
          value={stats.expiringSoon || 0}
          subtitle="Within 7 days"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-slate-800">Recent Tenants</h2>
          <Link to="/admin/tenants" className="text-sm text-slate-500 hover:text-slate-700">
            View all →
          </Link>
        </div>
        <div className="space-y-3">
          {tenants.slice(0, 5).map((tenant) => {
            const validity = getValidityStatus(tenant.validityDate);
            return (
              <div key={tenant._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-slate-200 rounded-lg flex items-center justify-center">
                    <span className="text-slate-600 font-medium text-sm">{tenant.schoolName.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{tenant.schoolName}</p>
                    <p className="text-xs text-slate-500">@{tenant.username}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={tenant.status === 'active' ? 'success' : 'danger'}>
                    {tenant.status}
                  </Badge>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(tenant.validityDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
          {tenants.length === 0 && (
            <p className="text-slate-500 text-center py-6 text-sm">No tenants yet</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
