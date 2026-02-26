import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { tenantAPI } from '../../services/api';
import { Card, Button, Modal, Input, LoadingSpinner } from '../../components/common';

const Classes = () => {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmSelection, setConfirmSelection] = useState('cancel');
  const [formData, setFormData] = useState({ name: '', section: '' });
  const [saving, setSaving] = useState(false);
  const classNameInputRef = useRef(null);
  const confirmCancelRef = useRef(null);
  const confirmDeleteRef = useRef(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key.toLowerCase() !== 'n' || !event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
      const tag = event.target?.tagName?.toLowerCase();
      const isTypingContext = tag === 'input' || tag === 'textarea' || tag === 'select' || event.target?.isContentEditable;
      if (isTypingContext) return;
      event.preventDefault();
      setShowModal(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!showModal) return;
    const timer = setTimeout(() => classNameInputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [showModal]);

  useEffect(() => {
    if (!confirmDeleteId) return;
    setConfirmSelection('cancel');
    const timer = setTimeout(() => confirmCancelRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [confirmDeleteId]);

  const fetchClasses = async () => {
    try {
      const { data } = await tenantAPI.getClasses();
      setClasses(data.data || []);
    } catch (error) {
      toast.error('Failed to fetch classes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Class name is required');
      return;
    }
    setSaving(true);
    try {
      await tenantAPI.createClass(formData);
      toast.success('Class created!');
      setShowModal(false);
      setFormData({ name: '', section: '' });
      fetchClasses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create class');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await tenantAPI.deleteClass(id);
      toast.success('Class deleted!');
      fetchClasses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading classes..." />;
  }

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Classes</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your classes</p>
        </div>
        <Button onClick={() => setShowModal(true)} title="Add class (Shift + N)">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Class
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {classes.map((cls, index) => (
          <Card key={cls._id} className="card-hover fade-in" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <button
                onClick={() => {
                  if ((cls.studentCount || 0) > 0) return;
                  setConfirmDeleteId(cls._id);
                }}
                disabled={(cls.studentCount || 0) > 0}
                className="p-1 text-slate-400 hover:text-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                data-tooltip={(cls.studentCount || 0) > 0 ? "Can't delete, contains student(s)" : 'Delete class'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <h3 className="font-semibold text-slate-800">{cls.name}</h3>
            <p className="text-sm text-slate-500">{cls.section ? `Section ${cls.section}` : 'No section'}</p>
            <p className="text-sm text-slate-600 mt-2">{cls.studentCount || 0} students</p>
          </Card>
        ))}
        {classes.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            No classes yet. Create your first class!
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setFormData({ name: '', section: '' }); }} title="Add Class">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            ref={classNameInputRef}
            label="Class Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. 1st, 5th, 9th"
            required
          />
          <Input
            label="Section (optional)"
            value={formData.section}
            onChange={(e) => setFormData({ ...formData, section: e.target.value })}
            placeholder="e.g. A, B, C"
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={Boolean(confirmDeleteId)} onClose={() => setConfirmDeleteId(null)} title="Delete Class" size="md">
        <div
          className="space-y-4"
          onKeyDown={(event) => {
            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
              event.preventDefault();
              setConfirmSelection('cancel');
              confirmCancelRef.current?.focus();
              return;
            }
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
              event.preventDefault();
              setConfirmSelection('confirm');
              confirmDeleteRef.current?.focus();
              return;
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              if (confirmSelection === 'cancel') setConfirmDeleteId(null);
              else if (confirmDeleteId) {
                const targetId = confirmDeleteId;
                setConfirmDeleteId(null);
                handleDelete(targetId);
              }
            }
          }}
        >
          <p className="text-sm text-slate-600">Delete this class?</p>
          <div className="flex justify-end gap-2">
            <Button ref={confirmCancelRef} variant="ghost" onClick={() => setConfirmDeleteId(null)} className={confirmSelection === 'cancel' ? 'ring-2 ring-slate-300' : ''}>
              Cancel
            </Button>
            <Button
              ref={confirmDeleteRef}
              variant="danger"
              loading={deletingId === confirmDeleteId}
              onClick={() => {
                if (!confirmDeleteId) return;
                const targetId = confirmDeleteId;
                setConfirmDeleteId(null);
                handleDelete(targetId);
              }}
              className={confirmSelection === 'confirm' ? 'ring-2 ring-slate-300' : ''}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Classes;
