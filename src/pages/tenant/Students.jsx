import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { tenantAPI } from '../../services/api';
import { Card, Button, Modal, Input, Select, Badge, LoadingSpinner } from '../../components/common';

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
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', rollNo: '', classId: '',
    dob: '', gender: 'male', guardian: '', contact: '', address: '', status: 'active'
  });

  useEffect(() => {
    fetchClasses();
  }, []);

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
    if (!formData.firstName || !formData.lastName || !formData.rollNo || !formData.classId) {
      toast.error('Please fill required fields');
      return;
    }

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
      dob: '', gender: 'male', guardian: '', contact: '', address: '', status: 'active'
    });
  };

  const openAddModal = () => {
    setFormData({ ...formData, classId: selectedClass || (classes[0]?._id || '') });
    setShowModal(true);
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
        <Button onClick={openAddModal}>
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
                          <span className="text-slate-600 font-medium text-sm">{student.firstName?.charAt(0)}</span>
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
                        <Button size="sm" variant="ghost" onClick={() => openEditModal(student)}>Edit</Button>
                        <Button size="sm" variant="ghost" onClick={() => openQRModal(student)}>
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
      <Modal isOpen={showModal} onClose={closeModal} title={editingStudent ? 'Edit Student' : 'Add Student'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
            <Input label="Last Name" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Roll Number" value={formData.rollNo} onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })} required />
            <Select label="Class" value={formData.classId} onChange={(e) => setFormData({ ...formData, classId: e.target.value })} options={classOptions} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date of Birth" type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} />
            <Select label="Gender" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Guardian Name" value={formData.guardian} onChange={(e) => setFormData({ ...formData, guardian: e.target.value })} />
            <Input label="Contact" value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} />
          </div>
          {editingStudent && (
            <Select label="Status" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'left', label: 'Left' }]} />
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">{editingStudent ? 'Update' : 'Create'}</Button>
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
    </div>
  );
};

export default Students;
