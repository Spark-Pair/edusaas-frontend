import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { tenantAPI } from '../../services/api';
import { Card, Button, Modal, Input, Select, Badge, LoadingSpinner, StatusSegmentedControl } from '../../components/common';

const Students = () => {
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [confirmDeleteStudentId, setConfirmDeleteStudentId] = useState(null);
  const [deletingStudentId, setDeletingStudentId] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [confirmSelection, setConfirmSelection] = useState('cancel');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', rollNo: '', classId: '',
    dob: '', gender: 'male', guardian: '', contact: '', address: '', studentPhoto: '', status: 'active'
  });
  const [creating, setCreating] = useState(false);
  const studentPhotoInputRef = useRef(null);
  const firstNameInputRef = useRef(null);
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
      setEditingStudent(null);
      setFormData((prev) => ({ ...prev, classId: selectedClass || (classes[0]?._id || '') }));
      setShowModal(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [classes, selectedClass]);

  useEffect(() => {
    if (!showModal) return;
    const timer = setTimeout(() => firstNameInputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [showModal]);

  useEffect(() => {
    if (!confirmDeleteStudentId) return;
    setConfirmSelection('cancel');
    const timer = setTimeout(() => confirmCancelRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [confirmDeleteStudentId]);

  const readImageAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });

  const handleStudentPhotoUpload = async (file) => {
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
      setFormData((prev) => ({ ...prev, studentPhoto: imageData }));
    } catch (error) {
      toast.error('Failed to process student photo');
    }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    } else {
      setStudents([]);
      setFilteredStudents([]);
    }
  }, [selectedClass]);

  // Filter students when search or status changes
  useEffect(() => {
    let result = [...students];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.firstName?.toLowerCase().includes(query) ||
        s.lastName?.toLowerCase().includes(query) ||
        s.rollNo?.toLowerCase().includes(query) ||
        s.guardian?.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      result = result.filter(s => s.status === statusFilter);
    }

    setFilteredStudents(result);
  }, [students, searchQuery, statusFilter]);

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

  const fetchStudents = async () => {
    setStudentsLoading(true);
    try {
      const { data } = await tenantAPI.getStudents({ classId: selectedClass });
      setStudents(data.data || []);
    } catch (error) {
      toast.error('Failed to fetch students');
    } finally {
      setStudentsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName || !formData.lastName || !formData.rollNo || !formData.classId || !formData.guardian?.trim() || !formData.dob || !formData.gender) {
      toast.error('Please fill required fields (guardian, date of birth, and gender are required)');
      return;
    }

    setCreating(true);

    const submitData = { ...formData };
    if (!submitData.dob) delete submitData.dob;

    try {
      if (editingStudent) {
        await tenantAPI.updateStudent(editingStudent._id, submitData);
        toast.success('Student updated!');
      } else {
        await tenantAPI.createStudent(submitData);
        toast.success('Student created!');
      }
      closeModal();
      if (selectedClass) fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setCreating(false);
    }
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      rollNo: student.rollNo || '',
      classId: student.classId?._id || student.classId || '',
      dob: student.dob ? student.dob.split('T')[0] : '',
      gender: student.gender || 'male',
      guardian: student.guardian || '',
      contact: student.contact || '',
      address: student.address || '',
      studentPhoto: student.studentPhoto || '',
      status: student.status || 'active'
    });
    setShowModal(true);
  };

  const openQRModal = (student) => {
    setSelectedStudent(student);
    setShowQRModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStudent(null);
    setFormData({
      firstName: '', lastName: '', rollNo: '', classId: selectedClass || '',
      dob: '', gender: 'male', guardian: '', contact: '', address: '', studentPhoto: '', status: 'active'
    });
  };

  const openAddModal = () => {
    setFormData({ ...formData, classId: selectedClass || (classes[0]?._id || '') });
    setShowModal(true);
  };

  const handleStatusChange = async (student, status) => {
    setUpdatingStatusId(student._id);
    try {
      await tenantAPI.updateStudent(student._id, { status, guardian: student.guardian || '-' });
      setStudents((prev) => prev.map((item) => (item._id === student._id ? { ...item, status } : item)));
      toast.success('Student status updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    setDeletingStudentId(studentId);
    try {
      await tenantAPI.deleteStudent(studentId);
      setStudents((prev) => prev.filter((item) => item._id !== studentId));
      toast.success('Student deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete student');
    } finally {
      setDeletingStudentId(null);
    }
  };

  const classOptions = classes.map(c => ({ value: c._id, label: `${c.name} ${c.section || ''}`.trim() }));

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Students</h1>
          <p className="text-sm text-slate-500 mt-1">Manage students by class</p>
        </div>
        <Button onClick={openAddModal} title="Add student (Shift + N)">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Student
        </Button>
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Select Class"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            options={classOptions}
            placeholder="Choose a class to view students"
            className="w-56"
          />
          <Input
            label="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, roll no..."
            className="w-56"
            disabled={!selectedClass || studentsLoading}
          />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'left', label: 'Left' }
            ]}
            placeholder="All Status"
            className="w-40"
            disabled={!selectedClass || studentsLoading}
          />
          {selectedClass && (
            <p className="text-sm text-slate-500 mb-2">{filteredStudents.length} of {students.length} students</p>
          )}
        </div>
      </Card>

      {!selectedClass ? (
        <Card>
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-slate-500">Select a class to view students</p>
          </div>
        </Card>
      ) : studentsLoading ? (
        <LoadingSpinner size="lg" text="Loading students..." />
      ) : (
        <Card padding="none">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll No</th>
                  <th>Guardian</th>
                  <th>Contact</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student._id} className="fade-in">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                          {student.studentPhoto ? (
                            <img
                              src={student.studentPhoto}
                              alt={`${student.firstName} ${student.lastName}`}
                              className="w-full h-full rounded-lg object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <span className="text-slate-600 font-medium text-sm">{student.firstName?.charAt(0)}</span>
                          )}
                        </div>
                        <span className="font-medium text-slate-800">{student.firstName} {student.lastName}</span>
                      </div>
                    </td>
                    <td>{student.rollNo}</td>
                    <td className="text-slate-500">{student.guardian || '-'}</td>
                    <td className="text-slate-500">{student.contact || '-'}</td>
                    <td>
                      <Badge variant={student.status === 'active' ? 'success' : student.status === 'left' ? 'danger' : 'warning'}>
                        {student.status}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEditModal(student)} title={`Edit ${student.firstName} ${student.lastName}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
                          </svg>
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setConfirmDeleteStudentId(student._id)}
                          disabled={!student.canDelete || deletingStudentId === student._id}
                          title={student.canDelete ? 'Delete student' : "Can't delete, has exam/attendance records"}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openQRModal(student)} title={`Show QR for ${student.firstName} ${student.lastName}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredStudents.length === 0 && (
              <p className="text-center py-8 text-slate-500">
                {students.length === 0 ? 'No students in this class' : 'No students match your search'}
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Add/Edit Student Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editingStudent ? 'Edit Student' : 'New Student'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="flex max-h-[560px] -m-5">

          {/* LEFT SIDE: Identity Canvas */}
          <div className="w-2/5 p-8 flex flex-col justify-center bg-slate-50/30">
            <div className="max-w-xs mx-auto w-full space-y-8">

              {/* Photo Workspace */}
              <div className="flex flex-col items-center group">
                <div className="relative">
                  <div className={`w-28 h-36 rounded-lg border-2 border-dashed transition-all flex items-center justify-center overflow-hidden bg-white shadow-sm ${formData.studentPhoto ? 'border-blue-400' : 'border-slate-200 group-hover:border-slate-300'
                    }`}>
                    {formData.studentPhoto ? (
                      <img src={formData.studentPhoto} alt="Preview" className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="text-center p-4">
                        <svg className="w-8 h-8 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A9 9 0 1118.88 17.8M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Photo</span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => studentPhotoInputRef.current?.click()}
                    className="absolute -bottom-2 -right-2 bg-white shadow-md border border-slate-200 p-2 rounded-full text-blue-600 hover:text-blue-700 transition-transform hover:scale-110"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {formData.studentPhoto && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, studentPhoto: '' }))}
                    className="mt-4 text-[10px] font-bold text-red-400 uppercase tracking-widest hover:text-red-600 transition-colors"
                  >
                    Remove Photo
                  </button>
                )}

                <input
                  ref={studentPhotoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleStudentPhotoUpload(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>

              {/* Name Display */}
              <div className="space-y-1 text-center">
                <p className="text-lg font-bold text-slate-800 min-h-[28px]">
                  {[formData.firstName, formData.lastName].filter(Boolean).join(' ') || (
                    <span className="text-slate-300">Full Name</span>
                  )}
                </p>
                <div className="h-[1px] w-12 bg-blue-500 mx-auto" />
                {formData.classId && (
                  <p className="text-[10px] text-slate-400 uppercase font-medium tracking-[0.2em] mt-1">
                    {classOptions.find(c => c.value === formData.classId)?.label ?? ''}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 uppercase font-medium tracking-[0.2em] mt-2">Student Identity</p>
              </div>

              {/* Sliding Segmented Status Control */}
              {editingStudent && (
                <div className="flex justify-center">
                  <StatusSegmentedControl
                    value={formData.status}
                    onChange={(val) => setFormData({ ...formData, status: val })}
                  />
                </div>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: Configuration Panel */}
          <div className="w-3/5 border-l border-slate-100 flex flex-col bg-white">
            <div className="p-6 pb-0">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Student Details</h3>
            </div>

            {/* Scrollable fields */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  ref={firstNameInputRef}
                  label="First Name"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="First"
                  required
                />
                <Input
                  label="Last Name"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Last"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Roll Number"
                  value={formData.rollNo}
                  onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                  placeholder="e.g. 2024-001"
                  required
                />
                <Select
                  label="Class"
                  value={formData.classId}
                  onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                  options={classOptions}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Date of Birth"
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  required
                />
                <Select
                  label="Gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' },
                  ]}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Guardian Name"
                  value={formData.guardian}
                  onChange={(e) => setFormData({ ...formData, guardian: e.target.value })}
                  placeholder="Parent / Guardian"
                  required
                />
                <Input
                  label="Contact"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>

            {/* Footer Actions — pinned */}
            <div className="p-6 pt-4 border-t border-slate-100 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={closeModal}
                className="flex-1 text-slate-500 font-bold text-xs uppercase"
                disabled={creating}
              >
                Discard
              </Button>
              <Button
                type="submit"
                disabled={creating}
                className="flex-[2] bg-slate-900 hover:bg-black text-white font-bold text-xs uppercase tracking-widest py-3 shadow-xl"
              >
                {editingStudent
                  ? (creating ? 'Processing...' : 'Save Changes')
                  : (creating ? 'Processing...' : 'Add Student')}
              </Button>
            </div>
          </div>

        </form>
      </Modal>

      {/* QR Code Modal */}
      <Modal isOpen={showQRModal} onClose={() => setShowQRModal(false)} title="Student QR Code" size="sm">
        {selectedStudent && (
          <div className="text-center">
            <div className="bg-white p-4 rounded-lg inline-block mb-4 border border-slate-200">
              <QRCodeSVG
                value={`${window.location.origin}/student/${selectedStudent._id}`}
                size={180}
                level="M"
              />
            </div>
            <h3 className="font-semibold text-slate-800">{selectedStudent.firstName} {selectedStudent.lastName}</h3>
            <p className="text-sm text-slate-500">{selectedStudent.classId?.name} | Roll: {selectedStudent.rollNo}</p>
            <p className="text-xs text-slate-400 mt-2">Scan to verify student</p>
            <Button variant="outline" onClick={() => setShowQRModal(false)} className="mt-4 w-full">Close</Button>
          </div>
        )}
      </Modal>

      <Modal isOpen={Boolean(confirmDeleteStudentId)} onClose={() => setConfirmDeleteStudentId(null)} title="Delete Student" size="md">
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
              if (confirmSelection === 'cancel') setConfirmDeleteStudentId(null);
              else if (confirmDeleteStudentId) {
                const targetId = confirmDeleteStudentId;
                setConfirmDeleteStudentId(null);
                handleDeleteStudent(targetId);
              }
            }
          }}
        >
          <p className="text-sm text-slate-600">Delete this student?</p>
          <div className="flex justify-end gap-2">
            <Button ref={confirmCancelRef} variant="ghost" onClick={() => setConfirmDeleteStudentId(null)} className={confirmSelection === 'cancel' ? 'ring-2 ring-slate-300' : ''}>
              Cancel
            </Button>
            <Button
              ref={confirmDeleteRef}
              variant="danger"
              loading={deletingStudentId === confirmDeleteStudentId}
              onClick={() => {
                if (!confirmDeleteStudentId) return;
                const targetId = confirmDeleteStudentId;
                setConfirmDeleteStudentId(null);
                handleDeleteStudent(targetId);
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

export default Students;
