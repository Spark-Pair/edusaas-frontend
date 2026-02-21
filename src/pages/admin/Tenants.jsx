import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { Card, Button, Modal, Input, Badge, LoadingSpinner } from '../../components/common';

const Tenants = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const addSchoolLogoInputRef = useRef(null);
  const editSchoolLogoInputRef = useRef(null);
  const [formData, setFormData] = useState({
    schoolName: '',
    schoolLogo: '',
    username: '',
    password: '',
    validityDate: ''
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const readImageAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });

  const handleSchoolLogoUpload = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be 2MB or smaller');
      return;
    }
    try {
      const imageData = await readImageAsDataUrl(file);
      setFormData((prev) => ({ ...prev, schoolLogo: imageData }));
    } catch (error) {
      toast.error('Failed to process school logo');
    }
  };

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
      schoolLogo: tenant.schoolLogo || '',
      username: tenant.username || '',
      password: '',
      validityDate: tenant.validityDate ? tenant.validityDate.split('T')[0] : ''
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({ schoolName: '', schoolLogo: '', username: '', password: '', validityDate: '' });
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
        <Button onClick={() => setShowAddModal(true)} title="Create a new tenant">
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
                        {tenant.schoolLogo ? (
                          <img
                            src={tenant.schoolLogo}
                            alt={tenant.schoolName}
                            className="w-full h-full rounded-lg object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span className="text-slate-600 font-medium text-sm">{tenant.schoolName.charAt(0)}</span>
                        )}
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
                        variant="outline"
                        onClick={() => navigate(`/admin/cards?tenantId=${tenant._id}`)}
                        disabled={togglingId === tenant._id}
                        title={`Open cards for ${tenant.schoolName}`}
                      >
                        Cards
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditModal(tenant)}
                        disabled={togglingId === tenant._id}
                        title={`Edit ${tenant.schoolName}`}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant={tenant.status === 'active' ? 'danger' : 'success'}
                        onClick={() => handleToggleStatus(tenant._id)}
                        disabled={togglingId === tenant._id}
                        title={tenant.status === 'active' ? `Deactivate ${tenant.schoolName}` : `Activate ${tenant.schoolName}`}
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
        title="New Tenant Workspace"
        size="xl" // Using the wider grid layout
      >
        <form onSubmit={handleSubmit} className="flex h-[520px] -m-5">

          {/* LEFT SIDE: Branding & Identity (Main Canvas) */}
          <div className="w-3/5 p-8 flex flex-col justify-center bg-slate-50/30">
            <div className="max-w-sm mx-auto w-full space-y-8">

              {/* Logo Workspace */}
              <div className="flex flex-col items-center group">
                <div className="relative">
                  <div className={`w-32 h-32 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center overflow-hidden bg-white shadow-sm ${formData.schoolLogo ? 'border-blue-400' : 'border-slate-200 group-hover:border-slate-300'
                    }`}>
                    {formData.schoolLogo ? (
                      <img src={formData.schoolLogo} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <svg className="w-8 h-8 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.5-4.5a2 2 0 012.8 0L16 16m-2-2l1.5-1.5a2 2 0 012.8 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Branding</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => addSchoolLogoInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 bg-white shadow-md border border-slate-200 p-2 rounded-full text-blue-600 hover:text-blue-700 transition-transform hover:scale-110"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {formData.schoolLogo && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, schoolLogo: '' }))}
                    className="mt-3 text-[10px] font-bold text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors"
                  >
                    Remove Logo
                  </button>
                )}
                <input ref={addSchoolLogoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleSchoolLogoUpload(e.target.files?.[0])} />
              </div>

              {/* Primary Name Field */}
              <div className="space-y-1 text-center">
                <input
                  className="w-full bg-transparent text-2xl font-bold text-slate-800 text-center placeholder:text-slate-300 focus:outline-none"
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  placeholder="School Name"
                  required
                />
                <div className="h-[1px] w-12 bg-blue-500 mx-auto" />
                <p className="text-[10px] text-slate-400 uppercase font-medium tracking-[0.2em] mt-2">Primary Entity Identity</p>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Technical Configuration (The Inspector) */}
          <div className="w-2/5 border-l border-slate-100 p-6 flex flex-col justify-between bg-white">
            <div className="space-y-6">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-4">Access Configuration</h3>

              <div className="space-y-4">
                <Input
                  label="Administrative Username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="admin_username"
                  required
                />

                <Input
                  label="Initial Password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />

                <div className="pt-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Subscription End</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    value={formData.validityDate}
                    onChange={(e) => setFormData({ ...formData, validityDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex gap-3">
                  <div className="text-blue-500 mt-0.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" /></svg>
                  </div>
                  <p className="text-[11px] text-blue-700 leading-relaxed font-medium">
                    Creating this tenant will initialize a dedicated database schema and administrative portal.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setShowAddModal(false); resetForm(); }}
                className="flex-1 text-slate-500 font-bold text-xs uppercase"
              >
                Discard
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="flex-[2] bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-widest py-3 shadow-xl"
              >
                {saving ? 'Processing...' : 'Provision Tenant'}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); resetForm(); }}
        title="Edit Tenant Workspace"
        size="xl"
      >
        <form onSubmit={handleSubmit} className="flex h-[520px] -m-5">

          {/* LEFT SIDE: Branding & Identity */}
          <div className="w-3/5 p-8 flex flex-col justify-center bg-slate-50/30">
            <div className="max-w-sm mx-auto w-full space-y-8">

              {/* Logo Workspace */}
              <div className="flex flex-col items-center group">
                <div className="relative">
                  <div className={`w-32 h-32 rounded-2xl border-2 border-dashed transition-all flex items-center justify-center overflow-hidden bg-white shadow-sm ${formData.schoolLogo ? 'border-blue-400' : 'border-slate-200 group-hover:border-slate-300'
                    }`}>
                    {formData.schoolLogo ? (
                      <img src={formData.schoolLogo} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-center p-4">
                        <svg className="w-8 h-8 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.5-4.5a2 2 0 012.8 0L16 16m-2-2l1.5-1.5a2 2 0 012.8 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Branding</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => editSchoolLogoInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 bg-white shadow-md border border-slate-200 p-2 rounded-full text-blue-600 hover:text-blue-700 transition-transform hover:scale-110"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {formData.schoolLogo && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, schoolLogo: '' }))}
                    className="mt-3 text-[10px] font-bold text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors"
                  >
                    Remove Logo
                  </button>
                )}

                <input
                  ref={editSchoolLogoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleSchoolLogoUpload(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>

              {/* Primary Name Field */}
              <div className="space-y-1 text-center">
                <input
                  className="w-full bg-transparent text-2xl font-bold text-slate-800 text-center placeholder:text-slate-300 focus:outline-none"
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  placeholder="School Name"
                  required
                />
                <div className="h-[1px] w-12 bg-blue-500 mx-auto" />
                <p className="text-[10px] text-slate-400 uppercase font-medium tracking-[0.2em] mt-2">Primary Entity Identity</p>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Technical Configuration */}
          <div className="w-2/5 border-l border-slate-100 p-6 flex flex-col justify-between bg-white">
            <div className="space-y-6">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-4">Access Configuration</h3>

              <div className="space-y-4">
                <Input
                  label="Administrative Username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="admin_username"
                  required
                />

                <Input
                  label="New Password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Leave blank to keep current"
                />

                <div className="pt-2">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Subscription End</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                    value={formData.validityDate}
                    onChange={(e) => setFormData({ ...formData, validityDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <div className="flex gap-3">
                  <div className="text-amber-500 mt-0.5">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-[11px] text-amber-700 leading-relaxed font-medium">
                    Changes to credentials will take effect on the tenant's next login session.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setShowEditModal(false); resetForm(); }}
                className="flex-1 text-slate-500 font-bold text-xs uppercase"
                disabled={saving}
              >
                Discard
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="flex-[2] bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-widest py-3 shadow-xl"
              >
                {saving ? 'Processing...' : 'Save Changes'}
              </Button>
            </div>
          </div>

        </form>
      </Modal>
    </div>
  );
};

export default Tenants;
