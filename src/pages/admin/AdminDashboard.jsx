import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../services/api';
import { Sidebar, StatCard, Modal, Button, Input, LoadingSpinner } from '../../components/common';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalTenants: 0, activeTenants: 0, totalStudents: 0, expiringSoon: 0 });
  const [tenants, setTenants] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [formData, setFormData] = useState({
    schoolName: '',
    email: '',
    password: '',
    validityDate: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
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

  const handleAddTenant = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createTenant(formData);
      toast.success('Tenant created successfully!');
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create tenant');
    }
  };

  const handleUpdateTenant = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.updateTenant(editingTenant._id, formData);
      toast.success('Tenant updated successfully!');
      setShowEditModal(false);
      setEditingTenant(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update tenant');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await adminAPI.toggleStatus(id);
      toast.success('Status updated!');
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const openEditModal = (tenant) => {
    setEditingTenant(tenant);
    setFormData({
      schoolName: tenant.schoolName,
      email: tenant.email,
      password: '',
      validityDate: tenant.validityDate ? tenant.validityDate.split('T')[0] : ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({ schoolName: '', email: '', password: '', validityDate: '' });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarItems = [
    {
      key: 'overview',
      label: 'Dashboard',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
    },
    {
      key: 'tenants',
      label: 'Tenants',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
    }
  ];

  const getValidityStatus = (date) => {
    const validityDate = new Date(date);
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (validityDate < now) return { status: 'expired', color: 'bg-red-100 text-red-700' };
    if (validityDate < sevenDays) return { status: 'expiring', color: 'bg-orange-100 text-orange-700' };
    return { status: 'valid', color: 'bg-green-100 text-green-700' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      <Sidebar
        items={sidebarItems}
        activeItem={activeSection}
        onItemClick={setActiveSection}
        title="EduSaaS"
        subtitle="Super Admin"
        onLogout={handleLogout}
      />

      <div className="ml-64 flex-1 p-8">
        {activeSection === 'overview' && (
          <div className="fade-in">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Overview</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Tenants"
                value={stats.totalTenants}
                color="text-purple-600"
                bgColor="bg-purple-100"
                icon={<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
              />
              <StatCard
                title="Active Tenants"
                value={stats.activeTenants}
                color="text-green-600"
                bgColor="bg-green-100"
                icon={<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
              <StatCard
                title="Total Students"
                value={stats.totalStudents}
                color="text-blue-600"
                bgColor="bg-blue-100"
                icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
              />
              <StatCard
                title="Expiring Soon"
                value={stats.expiringSoon}
                color="text-orange-600"
                bgColor="bg-orange-100"
                icon={<svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Tenants</h2>
              <div className="space-y-3">
                {tenants.slice(0, 5).map((tenant) => {
                  const validity = getValidityStatus(tenant.validityDate);
                  return (
                    <div key={tenant._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-purple-600 font-medium">{tenant.schoolName.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{tenant.schoolName}</p>
                          <p className="text-sm text-gray-500">{tenant.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 text-xs rounded-full ${tenant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {tenant.status}
                        </span>
                        <p className={`text-xs mt-1 ${validity.status === 'expired' ? 'text-red-500' : 'text-gray-500'}`}>
                          {validity.status === 'expired' ? 'Expired' : `Valid till ${new Date(tenant.validityDate).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {tenants.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No tenants yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'tenants' && (
          <div className="fade-in">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Tenants Management</h1>
              <Button onClick={() => setShowAddModal(true)} icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }>
                Add Tenant
              </Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">School</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Until</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stats</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tenants.map((tenant) => {
                    const validity = getValidityStatus(tenant.validityDate);
                    return (
                      <tr key={tenant._id}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-purple-600 font-medium">{tenant.schoolName.charAt(0)}</span>
                            </div>
                            <span className="font-medium">{tenant.schoolName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{tenant.email}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${validity.color}`}>
                            {new Date(tenant.validityDate).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${tenant.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {tenant.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {tenant.classCount || 0} Classes, {tenant.studentCount || 0} Students
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary" onClick={() => openEditModal(tenant)}>
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant={tenant.status === 'active' ? 'danger' : 'success'}
                              onClick={() => handleToggleStatus(tenant._id)}
                            >
                              {tenant.status === 'active' ? 'Deactivate' : 'Activate'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {tenants.length === 0 && (
                <p className="text-center py-8 text-gray-500">No tenants found</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Tenant Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); resetForm(); }} title="Add New Tenant">
        <form onSubmit={handleAddTenant} className="space-y-4">
          <Input
            label="School Name"
            value={formData.schoolName}
            onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />
          <Input
            label="Valid Until"
            type="date"
            value={formData.validityDate}
            onChange={(e) => setFormData({ ...formData, validityDate: e.target.value })}
            required
          />
          <div className="flex gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => { setShowAddModal(false); resetForm(); }} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Add Tenant
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Tenant Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setEditingTenant(null); resetForm(); }} title="Edit Tenant">
        <form onSubmit={handleUpdateTenant} className="space-y-4">
          <Input
            label="School Name"
            value={formData.schoolName}
            onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Input
            label="New Password (leave blank to keep current)"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Enter new password"
          />
          <Input
            label="Valid Until"
            type="date"
            value={formData.validityDate}
            onChange={(e) => setFormData({ ...formData, validityDate: e.target.value })}
            required
          />
          <div className="flex gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => { setShowEditModal(false); setEditingTenant(null); resetForm(); }} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Update Tenant
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
