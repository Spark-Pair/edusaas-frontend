import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import { tenantAPI } from '../../services/api';
import { Sidebar, StatCard, Modal, Button, Input, Select, LoadingSpinner } from '../../components/common';

const TenantDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Data states
  const [stats, setStats] = useState({});
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);

  // Modal states
  const [showModal, setShowModal] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Form states
  const [classForm, setClassForm] = useState({ name: '', section: '' });
  const [studentForm, setStudentForm] = useState({
    firstName: '', lastName: '', rollNo: '', classId: '',
    dob: '', gender: 'male', guardian: '', contact: '', address: '', status: 'active'
  });
  const [examForm, setExamForm] = useState({
    name: '', classId: '', date: '', subjects: [{ name: '', maxMarks: 100 }]
  });
  const [marksRecords, setMarksRecords] = useState([]);
  const [qrStudent, setQrStudent] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({ search: '', classId: '', status: '' });
  const [attendanceClass, setAttendanceClass] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);

  // Fetch functions
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await tenantAPI.getStats();
      setStats(data.data || {});
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    try {
      const { data } = await tenantAPI.getClasses();
      setClasses(data.data || []);
    } catch (error) {
      console.error('Failed to fetch classes:', error);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const params = {};
      if (filters.search) params.search = filters.search;
      if (filters.classId) params.classId = filters.classId;
      if (filters.status) params.status = filters.status;
      
      const { data } = await tenantAPI.getStudents(params);
      setStudents(data.data || []);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  }, [filters]);

  const fetchExams = useCallback(async () => {
    try {
      const { data } = await tenantAPI.getExams();
      setExams(data.data || []);
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    }
  }, []);

  const fetchAttendance = useCallback(async () => {
    if (!attendanceClass || !attendanceDate) return;
    try {
      const { data } = await tenantAPI.getClassAttendance(attendanceClass, attendanceDate);
      setAttendanceRecords(data.data || []);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    }
  }, [attendanceClass, attendanceDate]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchClasses(), fetchStudents(), fetchExams()]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [filters]);

  useEffect(() => {
    if (activeSection === 'attendance' && attendanceClass) {
      fetchAttendance();
    }
  }, [attendanceClass, attendanceDate, activeSection]);

  // Handlers
  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!classForm.name.trim()) {
      toast.error('Class name is required');
      return;
    }
    try {
      await tenantAPI.createClass({
        name: classForm.name.trim(),
        section: classForm.section.trim()
      });
      toast.success('Class added!');
      setShowModal(null);
      setClassForm({ name: '', section: '' });
      fetchClasses();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add class');
    }
  };

  const handleDeleteClass = async (id) => {
    if (!confirm('Are you sure you want to delete this class?')) return;
    try {
      await tenantAPI.deleteClass(id);
      toast.success('Class deleted!');
      fetchClasses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete class');
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!studentForm.firstName.trim() || !studentForm.lastName.trim() || !studentForm.rollNo.trim() || !studentForm.classId) {
      toast.error('Please fill all required fields');
      return;
    }

    // Prepare data - only send non-empty values
    const studentData = {
      firstName: studentForm.firstName.trim(),
      lastName: studentForm.lastName.trim(),
      rollNo: studentForm.rollNo.trim(),
      classId: studentForm.classId,
      gender: studentForm.gender || 'male',
      guardian: studentForm.guardian?.trim() || '',
      contact: studentForm.contact?.trim() || '',
      address: studentForm.address?.trim() || ''
    };

    // Only add dob if it has a value
    if (studentForm.dob && studentForm.dob.trim() !== '') {
      studentData.dob = studentForm.dob;
    }

    try {
      await tenantAPI.createStudent(studentData);
      toast.success('Student added!');
      setShowModal(null);
      resetStudentForm();
      fetchStudents();
      fetchStats();
    } catch (error) {
      console.error('Create student error:', error);
      toast.error(error.response?.data?.message || 'Failed to add student');
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    
    const studentData = {
      firstName: studentForm.firstName.trim(),
      lastName: studentForm.lastName.trim(),
      rollNo: studentForm.rollNo.trim(),
      classId: studentForm.classId,
      gender: studentForm.gender,
      guardian: studentForm.guardian?.trim() || '',
      contact: studentForm.contact?.trim() || '',
      address: studentForm.address?.trim() || '',
      status: studentForm.status
    };

    if (studentForm.dob && studentForm.dob.trim() !== '') {
      studentData.dob = studentForm.dob;
    }

    try {
      await tenantAPI.updateStudent(selectedItem._id, studentData);
      toast.success('Student updated!');
      setShowModal(null);
      setSelectedItem(null);
      resetStudentForm();
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update student');
    }
  };

  const handleSaveAttendance = async () => {
    if (!attendanceClass || !attendanceDate) {
      toast.error('Please select class and date');
      return;
    }
    if (attendanceRecords.length === 0) {
      toast.error('No students to mark attendance');
      return;
    }
    try {
      await tenantAPI.saveAttendance({
        classId: attendanceClass,
        date: attendanceDate,
        records: attendanceRecords.map(r => ({ studentId: r.studentId, status: r.status }))
      });
      toast.success('Attendance saved!');
    } catch (error) {
      toast.error('Failed to save attendance');
    }
  };

  const handleAddExam = async (e) => {
    e.preventDefault();
    
    if (!examForm.name.trim() || !examForm.classId || !examForm.date) {
      toast.error('Please fill all required fields');
      return;
    }

    const validSubjects = examForm.subjects.filter(s => s.name?.trim() && s.maxMarks > 0);
    if (validSubjects.length === 0) {
      toast.error('Please add at least one subject with name and marks');
      return;
    }

    try {
      await tenantAPI.createExam({
        name: examForm.name.trim(),
        classId: examForm.classId,
        date: examForm.date,
        subjects: validSubjects.map(s => ({ name: s.name.trim(), maxMarks: parseInt(s.maxMarks) }))
      });
      toast.success('Exam created!');
      setShowModal(null);
      setExamForm({ name: '', classId: '', date: '', subjects: [{ name: '', maxMarks: 100 }] });
      fetchExams();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create exam');
    }
  };

  const handleDeleteExam = async (id) => {
    if (!confirm('Are you sure you want to delete this exam?')) return;
    try {
      await tenantAPI.deleteExam(id);
      toast.success('Exam deleted!');
      fetchExams();
    } catch (error) {
      toast.error('Failed to delete exam');
    }
  };

  const openEnterMarks = async (exam) => {
    setSelectedItem(exam);
    try {
      const { data } = await tenantAPI.getMarks(exam._id);
      setMarksRecords(data.data.marks || []);
      setShowModal('marks');
    } catch (error) {
      toast.error('Failed to load marks');
    }
  };

  const handleSaveMarks = async () => {
    if (!selectedItem || marksRecords.length === 0) {
      toast.error('No marks to save');
      return;
    }
    try {
      await tenantAPI.saveMarks({
        examId: selectedItem._id,
        records: marksRecords.map(r => ({ studentId: r.studentId, marks: r.marks }))
      });
      toast.success('Marks saved!');
      setShowModal(null);
    } catch (error) {
      toast.error('Failed to save marks');
    }
  };

  const openEditStudent = (student) => {
    setSelectedItem(student);
    setStudentForm({
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
    setShowModal('editStudent');
  };

  const openQRCode = (student) => {
    setQrStudent(student);
    setShowModal('qr');
  };

  const resetStudentForm = () => {
    setStudentForm({
      firstName: '', lastName: '', rollNo: '', classId: '',
      dob: '', gender: 'male', guardian: '', contact: '', address: '', status: 'active'
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
    { key: 'classes', label: 'Classes', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
    { key: 'students', label: 'Students', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
    { key: 'attendance', label: 'Attendance', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
    { key: 'exams', label: 'Examinations', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    { key: 'qrcodes', label: 'QR Codes', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg> }
  ];

  const classOptions = classes.map(c => ({ value: c._id, label: `${c.name} ${c.section || ''}`.trim() }));

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
        title={user?.schoolName || 'School'}
        subtitle="School Admin"
        onLogout={handleLogout}
      />

      <div className="ml-64 flex-1 p-8">
        {/* Dashboard Section */}
        {activeSection === 'dashboard' && (
          <div className="fade-in">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">School Dashboard</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <StatCard title="Total Students" value={stats.totalStudents || 0} color="text-blue-600" bgColor="bg-blue-100" icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} />
              <StatCard title="Total Classes" value={stats.totalClasses || 0} color="text-purple-600" bgColor="bg-purple-100" icon={<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>} />
              <StatCard title="Today's Attendance" value={`${stats.attendancePercent || 0}%`} color="text-green-600" bgColor="bg-green-100" icon={<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
              <StatCard title="Total Exams" value={stats.totalExams || 0} color="text-indigo-600" bgColor="bg-indigo-100" icon={<svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold mb-4">Recent Students</h3>
                <div className="space-y-3">
                  {stats.recentStudents?.slice(0, 5).map((student) => (
                    <div key={student._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-medium">{student.firstName?.charAt(0) || '?'}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{student.firstName} {student.lastName}</p>
                          <p className="text-sm text-gray-500">{student.classId?.name || 'N/A'}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${student.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {student.status}
                      </span>
                    </div>
                  ))}
                  {(!stats.recentStudents || stats.recentStudents.length === 0) && (
                    <p className="text-gray-500 text-center py-4">No students yet</p>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { setActiveSection('students'); setTimeout(() => setShowModal('addStudent'), 100); }} className="bg-blue-50 hover:bg-blue-100 text-blue-700 p-4 rounded-lg text-sm font-medium transition">Add Student</button>
                  <button onClick={() => setActiveSection('attendance')} className="bg-green-50 hover:bg-green-100 text-green-700 p-4 rounded-lg text-sm font-medium transition">Mark Attendance</button>
                  <button onClick={() => { setActiveSection('exams'); setTimeout(() => setShowModal('addExam'), 100); }} className="bg-purple-50 hover:bg-purple-100 text-purple-700 p-4 rounded-lg text-sm font-medium transition">Create Exam</button>
                  <button onClick={() => setActiveSection('qrcodes')} className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-4 rounded-lg text-sm font-medium transition">View QR Codes</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Classes Section */}
        {activeSection === 'classes' && (
          <div className="fade-in">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Classes Management</h1>
              <Button onClick={() => setShowModal('addClass')} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
                Add Class
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {classes.map((cls) => (
                <div key={cls._id} className="bg-white rounded-xl shadow-sm p-6 card-hover transition">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                    </div>
                    <button onClick={() => handleDeleteClass(cls._id)} className="text-red-500 hover:text-red-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">{cls.name}</h3>
                  <p className="text-gray-500 text-sm">{cls.section ? `Section ${cls.section}` : 'No Section'}</p>
                  <p className="text-purple-600 mt-2">{cls.studentCount || 0} Students</p>
                </div>
              ))}
              {classes.length === 0 && <div className="col-span-3 text-center py-12 text-gray-500">No classes yet. Add your first class!</div>}
            </div>
          </div>
        )}

        {/* Students Section */}
        {activeSection === 'students' && (
          <div className="fade-in">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Students Management</h1>
              <Button onClick={() => setShowModal('addStudent')} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
                Add Student
              </Button>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
              <div className="flex gap-4 flex-wrap">
                <input
                  type="text"
                  placeholder="Search students..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="flex-1 min-w-[200px] px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <select
                  value={filters.classId}
                  onChange={(e) => setFilters({ ...filters, classId: e.target.value })}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="">All Classes</option>
                  {classes.map(c => <option key={c._id} value={c._id}>{c.name} {c.section || ''}</option>)}
                </select>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="left">Left</option>
                </select>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student._id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium">{student.firstName?.charAt(0) || '?'}</span>
                          </div>
                          <div>
                            <p className="font-medium">{student.firstName} {student.lastName}</p>
                            <p className="text-sm text-gray-500">{student.guardian || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{student.rollNo}</td>
                      <td className="px-6 py-4 text-gray-600">{student.classId?.name} {student.classId?.section || ''}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${student.status === 'active' ? 'bg-green-100 text-green-700' : student.status === 'inactive' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => openEditStudent(student)}>Edit</Button>
                          <Button size="sm" variant="outline" onClick={() => openQRCode(student)}>QR</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {students.length === 0 && <p className="text-center py-8 text-gray-500">No students found</p>}
            </div>
          </div>
        )}

        {/* Attendance Section */}
        {activeSection === 'attendance' && (
          <div className="fade-in">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Attendance Management</h1>
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  label="Select Class"
                  value={attendanceClass}
                  onChange={(e) => setAttendanceClass(e.target.value)}
                  options={classOptions}
                  placeholder="Select Class"
                />
                <Input
                  label="Select Date"
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                />
                <div className="flex items-end">
                  <Button onClick={handleSaveAttendance} className="w-full">Save Attendance</Button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendanceRecords.map((record, index) => (
                    <tr key={record.studentId}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium">{record.firstName?.charAt(0) || '?'}</span>
                          </div>
                          <span className="font-medium">{record.firstName} {record.lastName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{record.rollNo}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`att_${record.studentId}`}
                              checked={record.status === 'present'}
                              onChange={() => {
                                const newRecords = [...attendanceRecords];
                                newRecords[index].status = 'present';
                                setAttendanceRecords(newRecords);
                              }}
                              className="w-4 h-4 text-green-600"
                            />
                            <span className="text-green-600">Present</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`att_${record.studentId}`}
                              checked={record.status === 'absent'}
                              onChange={() => {
                                const newRecords = [...attendanceRecords];
                                newRecords[index].status = 'absent';
                                setAttendanceRecords(newRecords);
                              }}
                              className="w-4 h-4 text-red-600"
                            />
                            <span className="text-red-600">Absent</span>
                          </label>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {attendanceRecords.length === 0 && <p className="text-center py-8 text-gray-500">Select a class to mark attendance</p>}
            </div>
          </div>
        )}

        {/* Exams Section */}
        {activeSection === 'exams' && (
          <div className="fade-in">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-800">Examination Management</h1>
              <Button onClick={() => setShowModal('addExam')} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}>
                Create Exam
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {exams.map((exam) => (
                <div key={exam._id} className="bg-white rounded-xl shadow-sm p-6 card-hover transition">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">{exam.date}</span>
                      <button onClick={() => handleDeleteExam(exam._id)} className="text-red-500 hover:text-red-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">{exam.name}</h3>
                  <p className="text-gray-500 text-sm">{exam.classId?.name} {exam.classId?.section || ''}</p>
                  <p className="text-sm text-purple-600 mt-2">{exam.subjects?.length || 0} Subjects</p>
                  <Button onClick={() => openEnterMarks(exam)} className="mt-4 w-full">Enter Marks</Button>
                </div>
              ))}
              {exams.length === 0 && <div className="col-span-2 text-center py-12 text-gray-500">No exams yet. Create your first exam!</div>}
            </div>
          </div>
        )}

        {/* QR Codes Section */}
        {activeSection === 'qrcodes' && (
          <div className="fade-in">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Student QR Codes</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {students.filter(s => s.status === 'active').map((student) => (
                <div key={student._id} className="bg-white rounded-xl shadow-sm p-4 text-center card-hover transition">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-600 text-xl font-bold">{student.firstName?.charAt(0) || '?'}</span>
                  </div>
                  <h3 className="font-medium text-gray-800">{student.firstName} {student.lastName}</h3>
                  <p className="text-sm text-gray-500">{student.classId?.name} | {student.rollNo}</p>
                  <Button onClick={() => openQRCode(student)} className="mt-3 w-full" size="sm">View QR Code</Button>
                </div>
              ))}
              {students.filter(s => s.status === 'active').length === 0 && <div className="col-span-4 text-center py-12 text-gray-500">No active students found</div>}
            </div>
          </div>
        )}
      </div>

      {/* Add Class Modal */}
      <Modal isOpen={showModal === 'addClass'} onClose={() => { setShowModal(null); setClassForm({ name: '', section: '' }); }} title="Add New Class">
        <form onSubmit={handleAddClass} className="space-y-4">
          <Input label="Class Name" value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} placeholder="e.g. Class 1, Grade 5" required />
          <Input label="Section (Optional)" value={classForm.section} onChange={(e) => setClassForm({ ...classForm, section: e.target.value })} placeholder="e.g. A, B, C" />
          <div className="flex gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => { setShowModal(null); setClassForm({ name: '', section: '' }); }} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Add Class</Button>
          </div>
        </form>
      </Modal>

      {/* Add Student Modal */}
      <Modal isOpen={showModal === 'addStudent'} onClose={() => { setShowModal(null); resetStudentForm(); }} title="Add New Student">
        <form onSubmit={handleAddStudent} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={studentForm.firstName} onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })} required />
            <Input label="Last Name" value={studentForm.lastName} onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Roll Number" value={studentForm.rollNo} onChange={(e) => setStudentForm({ ...studentForm, rollNo: e.target.value })} required />
            <Select label="Class" value={studentForm.classId} onChange={(e) => setStudentForm({ ...studentForm, classId: e.target.value })} options={classOptions} placeholder="Select Class" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date of Birth (Optional)" type="date" value={studentForm.dob} onChange={(e) => setStudentForm({ ...studentForm, dob: e.target.value })} />
            <Select label="Gender" value={studentForm.gender} onChange={(e) => setStudentForm({ ...studentForm, gender: e.target.value })} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]} />
          </div>
          <Input label="Guardian Name" value={studentForm.guardian} onChange={(e) => setStudentForm({ ...studentForm, guardian: e.target.value })} />
          <Input label="Contact Number" value={studentForm.contact} onChange={(e) => setStudentForm({ ...studentForm, contact: e.target.value })} />
          <div className="flex gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => { setShowModal(null); resetStudentForm(); }} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Add Student</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Student Modal */}
      <Modal isOpen={showModal === 'editStudent'} onClose={() => { setShowModal(null); setSelectedItem(null); resetStudentForm(); }} title="Edit Student">
        <form onSubmit={handleUpdateStudent} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={studentForm.firstName} onChange={(e) => setStudentForm({ ...studentForm, firstName: e.target.value })} required />
            <Input label="Last Name" value={studentForm.lastName} onChange={(e) => setStudentForm({ ...studentForm, lastName: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Roll Number" value={studentForm.rollNo} onChange={(e) => setStudentForm({ ...studentForm, rollNo: e.target.value })} required />
            <Select label="Status" value={studentForm.status} onChange={(e) => setStudentForm({ ...studentForm, status: e.target.value })} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'left', label: 'Left' }]} />
          </div>
          <Select label="Class" value={studentForm.classId} onChange={(e) => setStudentForm({ ...studentForm, classId: e.target.value })} options={classOptions} placeholder="Select Class" required />
          <Input label="Guardian Name" value={studentForm.guardian} onChange={(e) => setStudentForm({ ...studentForm, guardian: e.target.value })} />
          <Input label="Contact Number" value={studentForm.contact} onChange={(e) => setStudentForm({ ...studentForm, contact: e.target.value })} />
          <div className="flex gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => { setShowModal(null); setSelectedItem(null); resetStudentForm(); }} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Update Student</Button>
          </div>
        </form>
      </Modal>

      {/* Add Exam Modal */}
      <Modal isOpen={showModal === 'addExam'} onClose={() => { setShowModal(null); setExamForm({ name: '', classId: '', date: '', subjects: [{ name: '', maxMarks: 100 }] }); }} title="Create New Exam">
        <form onSubmit={handleAddExam} className="space-y-4">
          <Input label="Exam Name" value={examForm.name} onChange={(e) => setExamForm({ ...examForm, name: e.target.value })} placeholder="e.g. Mid Term Exam" required />
          <Select label="Class" value={examForm.classId} onChange={(e) => setExamForm({ ...examForm, classId: e.target.value })} options={classOptions} placeholder="Select Class" required />
          <Input label="Date" type="date" value={examForm.date} onChange={(e) => setExamForm({ ...examForm, date: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Subjects</label>
            <div className="space-y-2">
              {examForm.subjects.map((subject, index) => (
                <div key={index} className="flex gap-2">
                  <input type="text" placeholder="Subject Name" value={subject.name} onChange={(e) => { const subjects = [...examForm.subjects]; subjects[index].name = e.target.value; setExamForm({ ...examForm, subjects }); }} className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                  <input type="number" placeholder="Max Marks" value={subject.maxMarks} onChange={(e) => { const subjects = [...examForm.subjects]; subjects[index].maxMarks = parseInt(e.target.value) || 0; setExamForm({ ...examForm, subjects }); }} className="w-24 px-3 py-2 border rounded-lg text-sm" />
                  {examForm.subjects.length > 1 && <button type="button" onClick={() => { const subjects = examForm.subjects.filter((_, i) => i !== index); setExamForm({ ...examForm, subjects }); }} className="text-red-500 px-2">×</button>}
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setExamForm({ ...examForm, subjects: [...examForm.subjects, { name: '', maxMarks: 100 }] })} className="mt-2 text-sm text-purple-600 hover:text-purple-800">+ Add Subject</button>
          </div>
          <div className="flex gap-3 mt-6">
            <Button type="button" variant="outline" onClick={() => { setShowModal(null); setExamForm({ name: '', classId: '', date: '', subjects: [{ name: '', maxMarks: 100 }] }); }} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Create Exam</Button>
          </div>
        </form>
      </Modal>

      {/* Enter Marks Modal */}
      <Modal isOpen={showModal === 'marks'} onClose={() => { setShowModal(null); setSelectedItem(null); setMarksRecords([]); }} title={`Enter Marks - ${selectedItem?.name || ''}`} size="xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                {selectedItem?.subjects?.map((s, i) => (
                  <th key={i} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{s.name} ({s.maxMarks})</th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {marksRecords.map((record, rIndex) => {
                const total = record.marks.reduce((sum, m) => sum + (m || 0), 0);
                const maxTotal = selectedItem?.subjects?.reduce((sum, s) => sum + s.maxMarks, 0) || 0;
                const percentage = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
                return (
                  <tr key={record.studentId}>
                    <td className="px-4 py-3 font-medium">{record.firstName} {record.lastName}</td>
                    {record.marks.map((mark, mIndex) => (
                      <td key={mIndex} className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={selectedItem?.subjects?.[mIndex]?.maxMarks}
                          value={mark}
                          onChange={(e) => {
                            const newRecords = [...marksRecords];
                            newRecords[rIndex].marks[mIndex] = parseInt(e.target.value) || 0;
                            setMarksRecords(newRecords);
                          }}
                          className="w-16 px-2 py-1 border rounded text-center"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center font-medium">{total}</td>
                    <td className="px-4 py-3 text-center font-medium">{percentage}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {marksRecords.length === 0 && <p className="text-center py-8 text-gray-500">No students in this class</p>}
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={() => { setShowModal(null); setSelectedItem(null); setMarksRecords([]); }} className="flex-1">Cancel</Button>
          <Button onClick={handleSaveMarks} className="flex-1">Save Marks</Button>
        </div>
      </Modal>

      {/* QR Code Modal */}
      <Modal isOpen={showModal === 'qr'} onClose={() => { setShowModal(null); setQrStudent(null); }} title="Student QR Code" size="sm">
        {qrStudent && (
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <QRCodeSVG value={`${window.location.origin}/student/${qrStudent._id}`} size={200} />
            </div>
            <p className="font-medium text-gray-800">{qrStudent.firstName} {qrStudent.lastName}</p>
            <p className="text-sm text-gray-500">{qrStudent.classId?.name} | Roll No: {qrStudent.rollNo}</p>
            <Button variant="outline" onClick={() => { setShowModal(null); setQrStudent(null); }} className="mt-4 w-full">Close</Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TenantDashboard;
