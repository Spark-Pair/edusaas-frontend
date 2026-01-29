import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { tenantAPI } from '../../services/api';
import { Card, Button, Select, Input, Badge, LoadingSpinner } from '../../components/common';

const Attendance = () => {
  const [loading, setLoading] = useState(true);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState([]);
  const [isDayOff, setIsDayOff] = useState(false);
  const [dayOffReason, setDayOffReason] = useState('');
  const [existingAttendance, setExistingAttendance] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedDate) {
      fetchAttendance();
    } else {
      setRecords([]);
      setIsDayOff(false);
      setDayOffReason('');
      setExistingAttendance(false);
    }
  }, [selectedClass, selectedDate]);

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

  const fetchAttendance = async () => {
    setAttendanceLoading(true);
    try {
      const { data } = await tenantAPI.getClassAttendance(selectedClass, selectedDate);
      setRecords(data.data.records || []);
      setIsDayOff(data.data.isDayOff || false);
      setDayOffReason(data.data.dayOffReason || '');
      setExistingAttendance(data.data.exists || false);
    } catch (error) {
      toast.error('Failed to fetch attendance');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedClass || !selectedDate) {
      toast.error('Please select class and date');
      return;
    }

    setSaving(true);
    try {
      await tenantAPI.saveAttendance({
        classId: selectedClass,
        date: selectedDate,
        records: records.map(r => ({ studentId: r.studentId, status: r.status })),
        isDayOff,
        dayOffReason
      });
      toast.success(existingAttendance ? 'Attendance updated!' : 'Attendance saved!');
      setExistingAttendance(true);
    } catch (error) {
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = (studentId, status) => {
    setRecords(records.map(r => r.studentId === studentId ? { ...r, status } : r));
  };

  const markAll = (status) => {
    setRecords(records.map(r => ({ ...r, status })));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-emerald-500';
      case 'absent': return 'bg-red-500';
      case 'leave': return 'bg-amber-500';
      default: return 'bg-slate-300';
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
          <h1 className="text-xl font-semibold text-slate-800">Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">Mark daily attendance</p>
        </div>
        {existingAttendance && (
          <Badge variant="info">Attendance exists for this date</Badge>
        )}
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <Select
            label="Select Class"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            options={classOptions}
            placeholder="Choose a class"
            className="w-56"
          />
          <Input
            label="Date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-44"
          />
          <Button onClick={handleSave} disabled={!selectedClass || saving}>
            {saving ? 'Saving...' : existingAttendance ? 'Update Attendance' : 'Save Attendance'}
          </Button>
        </div>
      </Card>

      {selectedClass && (
        <>
          {/* Day Off Toggle */}
          <Card className="mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDayOff}
                    onChange={(e) => setIsDayOff(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700">Mark as Day Off</span>
                </label>
                {isDayOff && (
                  <Input
                    placeholder="Reason (optional)"
                    value={dayOffReason}
                    onChange={(e) => setDayOffReason(e.target.value)}
                    className="w-64"
                  />
                )}
              </div>
            </div>
          </Card>

          {!isDayOff && (
            <>
              {/* Action Bar */}
              <Card className="mb-4 fade-in">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-600">Quick Actions:</span>
                  <Button size="sm" variant="success" onClick={() => markAll('present')}>
                    Mark All Present
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => markAll('absent')}>
                    Mark All Absent
                  </Button>
                  <div className="ml-auto flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                      Present: {records.filter(r => r.status === 'present').length}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                      Absent: {records.filter(r => r.status === 'absent').length}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      Leave: {records.filter(r => r.status === 'leave').length}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Attendance Table */}
              {attendanceLoading ? (
                <LoadingSpinner size="lg" text="Loading attendance..." />
              ) : (
                <Card padding="none" className="fade-in">
                  <div className="table-container">
                    <table>
                      <thead>
                        <tr>
                          <th>Roll No</th>
                          <th>Student</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((record) => (
                          <tr key={record.studentId} className="fade-in">
                            <td className="font-mono text-slate-600">{record.rollNo}</td>
                            <td>
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${getStatusColor(record.status)}`}></div>
                                <span className="font-medium text-slate-800">{record.firstName} {record.lastName}</span>
                              </div>
                            </td>
                            <td>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => updateStatus(record.studentId, 'present')}
                                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                                    record.status === 'present' 
                                      ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300' 
                                      : 'bg-slate-50 text-slate-600 hover:bg-emerald-50'
                                  }`}
                                >
                                  Present
                                </button>
                                <button
                                  onClick={() => updateStatus(record.studentId, 'absent')}
                                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                                    record.status === 'absent' 
                                      ? 'bg-red-100 text-red-700 ring-1 ring-red-300' 
                                      : 'bg-slate-50 text-slate-600 hover:bg-red-50'
                                  }`}
                                >
                                  Absent
                                </button>
                                <button
                                  onClick={() => updateStatus(record.studentId, 'leave')}
                                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                                    record.status === 'leave' 
                                      ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300' 
                                      : 'bg-slate-50 text-slate-600 hover:bg-amber-50'
                                  }`}
                                >
                                  Leave
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {records.length === 0 && (
                      <p className="text-center py-8 text-slate-500">No active students in this class</p>
                    )}
                  </div>
                </Card>
              )}
            </>
          )}

          {isDayOff && (
            <Card>
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-amber-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-slate-600 font-medium">Day Off</p>
                <p className="text-sm text-slate-500 mt-1">
                  {dayOffReason || 'No attendance will be recorded for this day'}
                </p>
              </div>
            </Card>
          )}
        </>
      )}

      {!selectedClass && (
        <Card>
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className="text-slate-500">Select a class to mark attendance</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Attendance;
