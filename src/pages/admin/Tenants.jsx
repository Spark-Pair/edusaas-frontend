import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { Card, Button, Modal, Input, Badge, LoadingSpinner } from '../../components/common';

const Tenants = () => {
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [formData, setFormData] = useState({
    schoolName: '',
    username: '',
    password: '',
    validityDate: ''
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const { data } = await adminAPI.getTenants();
      setTenants(data.data);
    } catch (error) {
      toast.error('Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (editingTenant) {
        const { data } = await adminAPI.updateTenant(editingTenant._id, formData);
        toast.success('Tenant updated!');
        
        // Update local state with the updated tenant
        setTenants(prev => prev.map(tenant => 
          tenant._id === editingTenant._id 
            ? { ...tenant, ...data.data }
            : tenant
        ));
        
        setShowEditModal(false);
      } else {
        const { data } = await adminAPI.createTenant(formData);
        toast.success('Tenant created!');
        
        // Add new tenant to local state
        setTenants(prev => [data.data, ...prev]);
        
        setShowAddModal(false);
      }
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (id) => {
    setTogglingId(id);
    
    try {
      const { data } = await adminAPI.toggleStatus(id);
      
      // Update only the specific tenant in local state
      setTenants(prev => prev.map(tenant => 
        tenant._id === id 
          ? { ...tenant, status: data.data.status }
          : tenant
      ));
      
      toast.success('Status updated!');
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  const openEditModal = (tenant) => {
    setEditingTenant(tenant);
    setFormData({
      schoolName: tenant.schoolName,
      username: tenant.username || '',
      password: '',
      validityDate: tenant.validityDate ? tenant.validityDate.split('T')[0] : ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({ schoolName: '', username: '', password: '', validityDate: '' });
    setEditingTenant(null);
  };

  const getValidityVariant = (date) => {
    const validityDate = new Date(date);
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (validityDate < now) return 'danger';
    if (validityDate < sevenDays) return 'warning';
    return 'success';
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading tenants..." />;
  }

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Tenants</h1>
          <p className="text-sm text-slate-500 mt-1">Manage school accounts</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Tenant
        </Button>
      </div>

      <Card padding="none">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>School</th>
                <th>Username</th>
                <th>Valid Until</th>
                <th>Status</th>
                <th>Stats</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant, index) => (
                <tr key={tenant._id} className="fade-in" style={{ animationDelay: `${index * 30}ms` }}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                        <span className="text-slate-600 font-medium text-sm">{tenant.schoolName.charAt(0)}</span>
                      </div>
                      <span className="font-medium text-slate-800">{tenant.schoolName}</span>
                    </div>
                  </td>
                  <td className="text-slate-500">@{tenant.username}</td>
                  <td>
                    <Badge variant={getValidityVariant(tenant.validityDate)}>
                      {new Date(tenant.validityDate).toLocaleDateString()}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={tenant.status === 'active' ? 'success' : 'danger'}>
                      {tenant.status}
                    </Badge>
                  </td>
                  <td className="text-slate-500">
                    {tenant.classCount || 0} classes, {tenant.studentCount || 0} students
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => openEditModal(tenant)}
                        disabled={togglingId === tenant._id}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={tenant.status === 'active' ? 'danger' : 'success'}
                        onClick={() => handleToggleStatus(tenant._id)}
                        disabled={togglingId === tenant._id}
                      >
                        {togglingId === tenant._id 
                          ? 'Processing...' 
                          : tenant.status === 'active' ? 'Deactivate' : 'Activate'
                        }
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {tenants.length === 0 && (
            <p className="text-center py-8 text-slate-500">No tenants found</p>
          )}
        </div>
      </Card>

      {/* Add Modal */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => { setShowAddModal(false); resetForm(); }} 
        title="Add Tenant"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="School Name"
            value={formData.schoolName}
            onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
            placeholder="Enter school name"
            required
          />
          <Input
            label="Username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="Enter login username"
            required
          />
          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="Enter password"
            required
          />
          <Input
            label="Valid Until"
            type="date"
            value={formData.validityDate}
            onChange={(e) => setFormData({ ...formData, validityDate: e.target.value })}
            required
          />
          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => { setShowAddModal(false); resetForm(); }} 
              className="flex-1"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal 
        isOpen={showEditModal} 
        onClose={() => { setShowEditModal(false); resetForm(); }} 
        title="Edit Tenant"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="School Name"
            value={formData.schoolName}
            onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
            placeholder="Enter school name"
            required
          />
          <Input
            label="Username"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            placeholder="Enter login username"
            required
          />
          <Input
            label="Password (leave blank to keep current)"
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
          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => { setShowEditModal(false); resetForm(); }} 
              className="flex-1"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tenants;