import React from 'react';
import { Building2, ChevronLeft, Download, Eye, Users } from 'lucide-react';
import { Button, Input, Modal } from '../../../../components/common';

const EditorModals = ({
  showUnsavedModal,
  setShowUnsavedModal,
  setPendingBack,
  saving,
  proceedBackWithoutSave,
  saveAndProceedBack,
  hasUnsavedChanges,
  showSchoolModal,
  setShowSchoolModal,
  schoolSearch,
  setSchoolSearch,
  filteredSchools,
  switchSchoolFromEditor,
  switchingSchool,
  switchingSchoolId,
  tenantId,
  showStudentModal,
  setShowStudentModal,
  studentSearch,
  setStudentSearch,
  studentsLoading,
  studentList,
  lastStudent,
  setLastStudent,
  showExportModal,
  setShowExportModal,
  setActiveExportClassId,
  setExportClassSearch,
  exportSelectedStudentIds,
  selectAllExportStudents,
  clearAllExportStudents,
  exportLoading,
  activeExportClassId,
  exportClassSearch,
  filteredExportClasses,
  studentsByClass,
  exportSelectedIdSet,
  selectAllInClass,
  deselectAllInClass,
  activeClassStudents,
  toggleExportStudentSelection,
  setSelectedStudentDetails,
  setShowStudentDetailsModal,
  exportSelectedCardsAsSvg,
  exporting,
  showStudentDetailsModal,
  selectedStudentDetails,
  getClassLabelFromStudent,
}) => (
  <>
    <Modal
      isOpen={showUnsavedModal}
      onClose={() => {
        setShowUnsavedModal(false);
        setPendingBack(false);
      }}
      title="Unsaved Changes"
      size="md"
    >
      <p className="text-sm text-slate-600">You have unsaved changes. Save before leaving?</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            setShowUnsavedModal(false);
            setPendingBack(false);
          }}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button variant="outline" onClick={proceedBackWithoutSave} disabled={saving}>Don't Save</Button>
        <Button onClick={saveAndProceedBack} loading={saving} disabled={!hasUnsavedChanges}>Save & Leave</Button>
      </div>
    </Modal>

    <Modal
      isOpen={showSchoolModal}
      onClose={() => setShowSchoolModal(false)}
      title="Select School"
      size="lg"
    >
      <div className="space-y-3">
        <Input
          label="Search"
          value={schoolSearch}
          onChange={(e) => setSchoolSearch(e.target.value)}
          placeholder="Search school"
        />
        <div className="max-h-80 overflow-auto border border-slate-200 rounded-lg divide-y divide-slate-200">
          {filteredSchools.length === 0 && (
            <p className="text-sm text-slate-500 p-4">No schools found.</p>
          )}
          {filteredSchools.map((school) => (
            <button
              key={school._id}
              type="button"
              onClick={() => switchSchoolFromEditor(school._id)}
              disabled={switchingSchool}
              className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 ${school._id === tenantId ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">{school.schoolName}</p>
                {switchingSchool && switchingSchoolId === school._id && (
                  <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>

    <Modal
      isOpen={showStudentModal}
      onClose={() => setShowStudentModal(false)}
      title="Select Student"
      size="lg"
    >
      <div className="space-y-3">
        <Input
          label="Search"
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
          placeholder="Search by name or roll number"
        />

        <div className="max-h-80 overflow-auto border border-slate-200 rounded-lg">
          {studentsLoading && (
            <p className="text-sm text-slate-500 p-4">Loading students...</p>
          )}

          {!studentsLoading && studentList.length === 0 && (
            <p className="text-sm text-slate-500 p-4">No students found.</p>
          )}

          {!studentsLoading && studentList.length > 0 && (
            <div className="divide-y divide-slate-200">
              {studentList.map((student) => {
                const fullName = `${student.firstName} ${student.lastName}`.trim();
                const classText = student.classId
                  ? `${student.classId.name}${student.classId.section ? ` - ${student.classId.section}` : ''}`
                  : 'N/A';
                const isCurrent = lastStudent?._id === student._id;
                return (
                  <button
                    key={student._id}
                    type="button"
                    onClick={() => {
                      setLastStudent(student);
                      setShowStudentModal(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 hover:bg-slate-50 ${isCurrent ? 'bg-blue-50' : ''}`}
                  >
                    <p className="text-sm font-medium text-slate-800">{fullName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Roll: {student.rollNo || 'N/A'} · Class: {classText}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>

    <Modal
      isOpen={showExportModal}
      onClose={() => {
        setShowExportModal(false);
        setActiveExportClassId(null);
        setExportClassSearch('');
      }}
      title="Export Cards"
      size="xl"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-slate-600 inline-flex items-center gap-2">
            <Users className="w-4 h-4" />
            Total selected students: <span className="font-semibold text-slate-800">{exportSelectedStudentIds.length}</span>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAllExportStudents}>Select All</Button>
            <Button variant="outline" size="sm" onClick={clearAllExportStudents}>Deselect All</Button>
          </div>
        </div>

        {exportLoading ? (
          <p className="text-sm text-slate-500 py-10 text-center">Loading classes and students...</p>
        ) : !activeExportClassId ? (
          <>
            <Input
              label="Search Classes"
              value={exportClassSearch}
              onChange={(e) => setExportClassSearch(e.target.value)}
              placeholder="Search class by name or section"
            />
            <div className="max-h-[58vh] overflow-auto grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredExportClasses.map((cls) => {
                const classStudents = studentsByClass[cls._id] || [];
                const classSelectedCount = classStudents.filter((student) => exportSelectedIdSet.has(student._id)).length;
                return (
                  <button
                    key={cls._id}
                    type="button"
                    onClick={() => setActiveExportClassId(cls._id)}
                    className="text-left p-3 border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800 inline-flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-slate-500" />
                          {cls.name} {cls.section ? `- ${cls.section}` : ''}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Selected: {classSelectedCount} / {classStudents.length}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            selectAllInClass(cls._id);
                          }}
                        >
                          Select
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(event) => {
                            event.stopPropagation();
                            deselectAllInClass(cls._id);
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </button>
                );
              })}
              {filteredExportClasses.length === 0 && (
                <p className="text-sm text-slate-500 p-4">No classes found.</p>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setActiveExportClassId(null)}
                className="text-sm text-slate-700 inline-flex items-center gap-1 hover:text-slate-900"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to classes
              </button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => selectAllInClass(activeExportClassId)}>Select All in Class</Button>
                <Button variant="outline" size="sm" onClick={() => deselectAllInClass(activeExportClassId)}>Deselect All in Class</Button>
              </div>
            </div>

            <div className="max-h-[56vh] overflow-auto grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeClassStudents.map((student) => {
                const selected = exportSelectedIdSet.has(student._id);
                return (
                  <div
                    key={student._id}
                    className={`p-3 rounded-lg border ${selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{student.firstName} {student.lastName}</p>
                        <p className="text-xs text-slate-600 mt-1">Father: {student.guardian || '-'}</p>
                        <p className="text-xs text-slate-600">Roll No: {student.rollNo || '-'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Button
                          size="sm"
                          variant={selected ? 'primary' : 'outline'}
                          onClick={() => toggleExportStudentSelection(student._id)}
                        >
                          {selected ? 'Selected' : 'Select'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedStudentDetails(student);
                            setShowStudentDetailsModal(true);
                          }}
                          className="inline-flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {activeClassStudents.length === 0 && (
                <p className="text-sm text-slate-500 p-4">No students in this class.</p>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
          <Button variant="outline" onClick={() => setShowExportModal(false)}>Close</Button>
          <Button onClick={exportSelectedCardsAsSvg} disabled={exportSelectedStudentIds.length === 0 || exporting}>
            <Download className="w-4 h-4" />
            {exporting ? 'Generating...' : 'Generate SVG'}
          </Button>
        </div>
      </div>
    </Modal>

    <Modal
      isOpen={showStudentDetailsModal}
      onClose={() => setShowStudentDetailsModal(false)}
      title="Student Details"
      size="md"
    >
      {selectedStudentDetails ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center">
              {selectedStudentDetails.studentPhoto ? (
                <img src={selectedStudentDetails.studentPhoto} alt="Student" className="w-full h-full object-cover" />
              ) : (
                <Users className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {selectedStudentDetails.firstName} {selectedStudentDetails.lastName}
              </p>
              <p className="text-xs text-slate-500">Roll No: {selectedStudentDetails.rollNo || '-'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <p className="text-slate-500">Father: <span className="text-slate-800">{selectedStudentDetails.guardian || '-'}</span></p>
            <p className="text-slate-500">Class: <span className="text-slate-800">{getClassLabelFromStudent(selectedStudentDetails)}</span></p>
            <p className="text-slate-500">Gender: <span className="text-slate-800">{selectedStudentDetails.gender || '-'}</span></p>
            <p className="text-slate-500">Contact: <span className="text-slate-800">{selectedStudentDetails.contact || '-'}</span></p>
            <p className="text-slate-500 col-span-2">Address: <span className="text-slate-800">{selectedStudentDetails.address || '-'}</span></p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No student selected.</p>
      )}
    </Modal>
  </>
);

export default EditorModals;
