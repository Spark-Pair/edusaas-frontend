import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { tenantAPI } from '../../services/api';
import { Card, Button, Modal, Select, LoadingSpinner } from '../../components/common';

const QRCodes = () => {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    } else {
      setStudents([]);
    }
  }, [selectedClass]);

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
    try {
      const { data } = await tenantAPI.getStudents({ classId: selectedClass, status: 'active' });
      setStudents(data.data || []);
    } catch (error) {
      toast.error('Failed to fetch students');
    }
  };

  const openQRModal = (student) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  const classOptions = classes.map(c => ({ value: c._id, label: `${c.name} ${c.section || ''}`.trim() }));

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">QR Codes</h1>
        <p className="text-sm text-slate-500 mt-1">Generate QR codes for student verification</p>
      </div>

      <Card className="mb-6">
        <Select
          label="Select Class"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          options={classOptions}
          placeholder="Choose a class"
          className="w-64"
        />
      </Card>

      {selectedClass ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {students.map((student) => (
            <Card key={student._id} className="text-center card-hover">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-slate-600 font-semibold">{student.firstName?.charAt(0)}</span>
              </div>
              <h3 className="font-medium text-slate-800 text-sm">{student.firstName} {student.lastName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">Roll: {student.rollNo}</p>
              <Button size="sm" className="w-full mt-3" onClick={() => openQRModal(student)}>
                View QR
              </Button>
            </Card>
          ))}
          {students.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500">
              No active students in this class
            </div>
          )}
        </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            <p className="text-slate-500">Select a class to view QR codes</p>
          </div>
        </Card>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Student QR Code" size="sm">
        {selectedStudent && (
          <div className="text-center">
            <div className="bg-white p-4 rounded-lg inline-block mb-4">
              <QRCodeSVG 
                value={`${window.location.origin}/student/${selectedStudent._id}`} 
                size={180}
                level="M"
              />
            </div>
            <h3 className="font-semibold text-slate-800">{selectedStudent.firstName} {selectedStudent.lastName}</h3>
            <p className="text-sm text-slate-500">{selectedStudent.classId?.name} | Roll: {selectedStudent.rollNo}</p>
            <p className="text-xs text-slate-400 mt-2">Scan to verify student</p>
            <Button variant="outline" onClick={() => setShowModal(false)} className="mt-4 w-full">Close</Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QRCodes;
