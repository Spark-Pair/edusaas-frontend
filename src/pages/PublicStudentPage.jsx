import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { publicAPI } from '../services/api';
import { LoadingSpinner, Badge } from '../components/common';

const PublicStudentPage = () => {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const { data } = await publicAPI.getStudent(id);
        setStudent(data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Student not found');
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Loading student information..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center max-w-sm w-full fade-in">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Not Found</h2>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden fade-in">
          {/* Header */}
          <div className="bg-slate-800 px-5 py-6 text-white text-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold">{student.firstName} {student.lastName}</h2>
            <p className="text-slate-300 text-sm mt-1">{student.school}</p>
            <div className="mt-3">
              <Badge variant={student.status === 'active' ? 'success' : 'danger'}>
                {student.status?.charAt(0).toUpperCase() + student.status?.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('info')}
              className={`flex-1 py-3 text-sm font-medium transition ${
                activeTab === 'info' 
                  ? 'text-slate-800 border-b-2 border-slate-800' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Basic Info
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex-1 py-3 text-sm font-medium transition ${
                activeTab === 'attendance' 
                  ? 'text-slate-800 border-b-2 border-slate-800' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Attendance
            </button>
            <button
              onClick={() => setActiveTab('exams')}
              className={`flex-1 py-3 text-sm font-medium transition ${
                activeTab === 'exams' 
                  ? 'text-slate-800 border-b-2 border-slate-800' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Exams
            </button>
          </div>

          <div className="p-5">
            {/* Basic Info Tab */}
            {activeTab === 'info' && (
              <div className="space-y-4 fade-in">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Class</span>
                  <span className="text-sm font-medium text-slate-800">
                    {student.class?.name} {student.class?.section || ''}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Roll Number</span>
                  <span className="text-sm font-medium text-slate-800">{student.rollNo}</span>
                </div>
                {student.guardian && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-sm text-slate-500">Guardian</span>
                    <span className="text-sm font-medium text-slate-800">{student.guardian}</span>
                  </div>
                )}
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-500">Enrollment Status</span>
                  <Badge variant={student.status === 'active' ? 'success' : 'danger'}>
                    {student.status?.charAt(0).toUpperCase() + student.status?.slice(1)}
                  </Badge>
                </div>
              </div>
            )}

            {/* Attendance Tab */}
            {activeTab === 'attendance' && (
              <div className="fade-in">
                {student.attendance && student.attendance.totalDays > 0 ? (
                  <>
                    {/* Attendance Summary Card */}
                    <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-200">
                      <div className="text-center mb-4">
                        <div className={`text-3xl font-bold ${
                          student.attendance.percentage >= 75 ? 'text-emerald-600' : 
                          student.attendance.percentage >= 50 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {student.attendance.percentage}%
                        </div>
                        <p className="text-sm text-slate-500">Attendance Rate</p>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            student.attendance.percentage >= 75 ? 'bg-emerald-500' : 
                            student.attendance.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${student.attendance.percentage}%` }}
                        ></div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <div className="text-xl font-bold text-emerald-600">{student.attendance.presentDays}</div>
                          <div className="text-xs text-slate-500">Present</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <div className="text-xl font-bold text-red-600">{student.attendance.absentDays}</div>
                          <div className="text-xs text-slate-500">Absent</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          <div className="text-xl font-bold text-amber-600">{student.attendance.leaveDays}</div>
                          <div className="text-xs text-slate-500">Leave</div>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 text-center">
                      Total {student.attendance.totalDays} school days recorded
                    </p>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-slate-500 text-sm">No attendance records yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Exams Tab */}
            {activeTab === 'exams' && (
              <div className="fade-in">
                {student.exams && student.exams.length > 0 ? (
                  <div className="space-y-4">
                    {student.exams.map((exam, index) => (
                      <div key={index} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-slate-800">{exam.examName}</h4>
                            <p className="text-xs text-slate-500">{exam.date}</p>
                          </div>
                          <div className={`text-lg font-bold ${
                            exam.percentage >= 75 ? 'text-emerald-600' : 
                            exam.percentage >= 50 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {exam.percentage}%
                          </div>
                        </div>
                        
                        {/* Subjects */}
                        <div className="space-y-2 mb-3">
                          {exam.subjects.map((subject, sIndex) => (
                            <div key={sIndex} className="flex justify-between items-center text-sm">
                              <span className="text-slate-600">{subject.name}</span>
                              <span className="font-medium text-slate-800">
                                {subject.obtained} / {subject.maxMarks}
                              </span>
                            </div>
                          ))}
                        </div>
                        
                        {/* Total */}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                          <span className="font-medium text-slate-700">Total</span>
                          <span className="font-bold text-slate-800">
                            {exam.total} / {exam.maxTotal}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-slate-500 text-sm">No exam results yet</p>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg text-center border border-slate-200">
              <div className="flex items-center justify-center gap-2 text-emerald-600 mb-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">Verified Student Record</span>
              </div>
              <p className="text-xs text-slate-400">Powered by EduSaaS | SparkPair</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicStudentPage;
