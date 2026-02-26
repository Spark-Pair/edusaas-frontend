import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { tenantAPI } from '../../services/api';
import { Card, Button, Modal, Input, Select, Badge, LoadingSpinner } from '../../components/common';

const Exams = () => {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [exams, setExams] = useState([]);
  const [showExamModal, setShowExamModal] = useState(false);
  const [showMarksModal, setShowMarksModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [marksRecords, setMarksRecords] = useState([]);
  const [formData, setFormData] = useState({
    name: '', classId: '', date: '', subjects: [{ name: '', maxMarks: 100 }]
  });
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmSelection, setConfirmSelection] = useState('cancel');
  const examNameInputRef = useRef(null);
  const confirmCancelRef = useRef(null);
  const confirmDeleteRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key.toLowerCase() !== 'n' || !event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
      const tag = event.target?.tagName?.toLowerCase();
      const isTypingContext = tag === 'input' || tag === 'textarea' || tag === 'select' || event.target?.isContentEditable;
      if (isTypingContext) return;
      event.preventDefault();
      setShowExamModal(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!showExamModal) return;
    const timer = setTimeout(() => examNameInputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [showExamModal]);

  useEffect(() => {
    if (!confirmDeleteId) return;
    setConfirmSelection('cancel');
    const timer = setTimeout(() => confirmCancelRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, [confirmDeleteId]);

  const fetchData = async () => {
    try {
      const [classesRes, examsRes] = await Promise.all([
        tenantAPI.getClasses(),
        tenantAPI.getExams()
      ]);
      setClasses(classesRes.data.data || []);
      setExams(examsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    const validSubjects = formData.subjects.filter(s => s.name?.trim() && s.maxMarks > 0);
    if (!formData.name || !formData.classId || !formData.date || validSubjects.length === 0) {
      toast.error('Please fill all fields');
      return;
    }

    setCreating(true);

    try {
      await tenantAPI.createExam({
        ...formData,
        subjects: validSubjects.map(s => ({ name: s.name.trim(), maxMarks: parseInt(s.maxMarks) }))
      });
      toast.success('Exam created!');
      setShowExamModal(false);
      setFormData({ name: '', classId: '', date: '', subjects: [{ name: '', maxMarks: 100 }] });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create exam');
    } finally{
      setCreating(false);
    }
  };

  const handleDeleteExam = async (id) => {
    setDeletingId(id);
    try {
      await tenantAPI.deleteExam(id);
      toast.success('Exam deleted!');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete exam');
    } finally {
      setDeletingId(null);
    }
  };

  const openMarksModal = async (exam) => {
    setSelectedExam(exam);
    try {
      const { data } = await tenantAPI.getMarks(exam._id);
      setMarksRecords(data.data.marks || []);
      setShowMarksModal(true);
    } catch (error) {
      toast.error('Failed to load marks');
    }
  };

  const handleSaveMarks = async () => {
    setSaving(true);
    try {
      await tenantAPI.saveMarks({
        examId: selectedExam._id,
        records: marksRecords.map(r => ({ studentId: r.studentId, marks: r.marks }))
      });
      toast.success('Marks saved!');
      setShowMarksModal(false);
    } catch (error) {
      toast.error('Failed to save marks');
    } finally {
      setSaving(false);
    }
  };

  const updateMark = (studentId, subjectIndex, value) => {
    setMarksRecords(marksRecords.map(r => {
      if (r.studentId === studentId) {
        const newMarks = [...r.marks];
        newMarks[subjectIndex] = parseInt(value) || 0;
        return { ...r, marks: newMarks };
      }
      return r;
    }));
  };

  const addSubject = () => {
    setFormData({ ...formData, subjects: [...formData.subjects, { name: '', maxMarks: 100 }] });
  };

  const removeSubject = (index) => {
    if (formData.subjects.length > 1) {
      setFormData({ ...formData, subjects: formData.subjects.filter((_, i) => i !== index) });
    }
  };

  const updateSubject = (index, field, value) => {
    const subjects = [...formData.subjects];
    subjects[index][field] = value;
    setFormData({ ...formData, subjects });
  };

  const classOptions = classes.map(c => ({ value: c._id, label: `${c.name} ${c.section || ''}`.trim() }));

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading..." />;
  }

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Examinations</h1>
          <p className="text-sm text-slate-500 mt-1">Manage exams and marks</p>
        </div>
        <Button onClick={() => setShowExamModal(true)} title="Create exam (Shift + N)">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Exam
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exams.map((exam) => (
          <Card key={exam._id} className="card-hover">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <button onClick={() => setConfirmDeleteId(exam._id)} className="p-1 text-slate-400 hover:text-red-500 transition" data-tooltip="Delete exam">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <h3 className="font-semibold text-slate-800">{exam.name}</h3>
            <p className="text-sm text-slate-500">{exam.classId?.name} {exam.classId?.section || ''}</p>
            <div className="flex items-center justify-between mt-3">
              <Badge variant="default">{exam.date}</Badge>
              <span className="text-xs text-slate-500">{exam.subjects?.length || 0} subjects</span>
            </div>
            <Button size="sm" className="w-full mt-4" onClick={() => openMarksModal(exam)}>
              Enter Marks
            </Button>
          </Card>
        ))}
        {exams.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            No exams yet. Create your first exam!
          </div>
        )}
      </div>

      {/* Create Exam Modal */}
      <Modal isOpen={showExamModal} onClose={() => setShowExamModal(false)} title="Create Exam" size="lg">
        <form onSubmit={handleCreateExam} className="space-y-4">
          <Input ref={examNameInputRef} label="Exam Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Class" value={formData.classId} onChange={(e) => setFormData({ ...formData, classId: e.target.value })} options={classOptions} required />
            <Input label="Date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Subjects</label>
            <div className="space-y-2">
              {formData.subjects.map((subject, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Subject Name"
                    value={subject.name}
                    onChange={(e) => updateSubject(index, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={subject.maxMarks}
                    onChange={(e) => updateSubject(index, 'maxMarks', e.target.value)}
                    className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                  {formData.subjects.length > 1 && (
                    <button type="button" onClick={() => removeSubject(index)} className="px-2 text-red-500">×</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addSubject} className="mt-2 text-sm text-slate-600 hover:text-slate-800">+ Add Subject</button>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowExamModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={creating}>{creating ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={Boolean(confirmDeleteId)} onClose={() => setConfirmDeleteId(null)} title="Delete Exam" size="md">
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
                handleDeleteExam(targetId);
              }
            }
          }}
        >
          <p className="text-sm text-slate-600">Delete this exam?</p>
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
                handleDeleteExam(targetId);
              }}
              className={confirmSelection === 'confirm' ? 'ring-2 ring-slate-300' : ''}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {/* Enter Marks Modal */}
      <Modal isOpen={showMarksModal} onClose={() => setShowMarksModal(false)} title={`Marks - ${selectedExam?.name}`} size="xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-600">Student</th>
                {selectedExam?.subjects?.map((s, i) => (
                  <th key={i} className="px-3 py-2 text-center font-semibold text-slate-600">{s.name} ({s.maxMarks})</th>
                ))}
                <th className="px-3 py-2 text-center font-semibold text-slate-600">Total</th>
                <th className="px-3 py-2 text-center font-semibold text-slate-600">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {marksRecords.map((record) => {
                const total = record.marks.reduce((sum, m) => sum + (m || 0), 0);
                const maxTotal = selectedExam?.subjects?.reduce((sum, s) => sum + s.maxMarks, 0) || 0;
                const percentage = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0;
                return (
                  <tr key={record.studentId}>
                    <td className="px-3 py-2 font-medium text-slate-800">{record.firstName} {record.lastName}</td>
                    {record.marks.map((mark, mIndex) => (
                      <td key={mIndex} className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max={selectedExam?.subjects?.[mIndex]?.maxMarks}
                          value={mark}
                          onChange={(e) => updateMark(record.studentId, mIndex, e.target.value)}
                          className="w-16 px-2 py-1 border border-slate-300 rounded text-center text-sm"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-medium">{total}</td>
                    <td className="px-3 py-2 text-center font-medium">{percentage}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {marksRecords.length === 0 && (
            <p className="text-center py-8 text-slate-500">No students in this class</p>
          )}
        </div>
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={() => setShowMarksModal(false)} className="flex-1">Cancel</Button>
          <Button onClick={handleSaveMarks} className="flex-1" disabled={saving}>{saving ? 'Saving...' : 'Save Marks'}</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Exams;
