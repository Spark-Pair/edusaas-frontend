import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  ArrowLeft,
  Building2,
  ChevronsDown,
  ChevronsUp,
  ChevronLeft,
  Circle,
  ClipboardPaste,
  Copy,
  Download,
  Eye,
  GripHorizontal,
  History,
  Info,
  Layers,
  Lock,
  LockOpen,
  Pencil,
  Pipette,
  Redo2,
  Save,
  SlidersHorizontal,
  Square,
  Trash2,
  Undo2,
  Users
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import { Button, Card, Input, LoadingSpinner, Modal, Select } from '../../components/common';

const DEFAULT_CARD_WIDTH = 360;
const DEFAULT_CARD_HEIGHT = 584;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 5;

const BLOCKS = [
  { type: 'school_name', label: 'School Name', kind: 'text', width: 220, height: 34 },
  { type: 'student_name', label: 'Student Name', kind: 'text', width: 220, height: 34 },
  { type: 'roll_no', label: 'Roll Number', kind: 'text', width: 180, height: 30 },
  { type: 'class_name', label: 'Class Name', kind: 'text', width: 180, height: 30 },
  { type: 'student_photo', label: 'Student Photo', kind: 'photo', width: 108, height: 108 },
  { type: 'school_logo', label: 'School Logo', kind: 'logo', width: 72, height: 72 },
  { type: 'text', label: 'Custom Text', kind: 'text', width: 180, height: 30, text: 'Custom Text' },
  { type: 'panel', label: 'Panel', kind: 'panel', width: 240, height: 120 },
  { type: 'import_image', label: 'Import Image', kind: 'image_importer' },
  { type: 'import_svg', label: 'Import SVG', kind: 'importer' },
];

const SHORTCUTS = [
  { key: 'Ctrl/Cmd + Click', action: 'Multi-select on canvas/layers' },
  { key: 'Shift + Click', action: 'Multi-select on canvas/layers' },
  { key: 'Ctrl/Cmd + Z', action: 'Undo last change' },
  { key: 'Ctrl/Cmd + Shift + Z', action: 'Redo last undone change' },
  { key: 'Ctrl/Cmd + G', action: 'Group selected' },
  { key: 'Ctrl/Cmd + Shift + G', action: 'Ungroup selected group(s)' },
  { key: 'Ctrl/Cmd + C', action: 'Copy selected' },
  { key: 'Ctrl/Cmd + V', action: 'Paste copied' },
  { key: 'Ctrl/Cmd + D', action: 'Duplicate selected' },
  { key: 'Ctrl/Cmd + E', action: 'Open export modal' },
  { key: 'Ctrl/Cmd + Wheel', action: 'Zoom canvas' },
  { key: 'Double Click', action: 'Enter group from layer/canvas' },
  { key: 'Esc', action: 'Deselect everything' },
  { key: 'Delete / Backspace', action: 'Delete current selection' }
];

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const cloneHistoryState = (value) => {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};
const snapshotsEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const textMeasureCanvas =
  typeof document !== 'undefined' ? document.createElement('canvas') : null;

const measureTextWidth = (text, fontSize, fontWeight, fontFamily = 'sans-serif') => {
  if (!textMeasureCanvas) return Math.max(40, text.length * (fontSize * 0.55));
  const context = textMeasureCanvas.getContext('2d');
  if (!context) return Math.max(40, text.length * (fontSize * 0.55));
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  return Math.ceil(context.measureText(text || '').width);
};

const parseSvgDimension = (value) => {
  if (!value) return null;
  const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getSvgDimensionsFromMarkup = (markup) => {
  const fallback = { width: 160, height: 160 };
  if (!markup || typeof DOMParser === 'undefined') return fallback;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(markup, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return fallback;

    const width = parseSvgDimension(svg.getAttribute('width'));
    const height = parseSvgDimension(svg.getAttribute('height'));
    if (width && height) return { width, height };

    const viewBox = (svg.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    if (viewBox.length === 4 && Number.isFinite(viewBox[2]) && Number.isFinite(viewBox[3]) && viewBox[2] > 0 && viewBox[3] > 0) {
      return { width: viewBox[2], height: viewBox[3] };
    }
  } catch (_) {
    return fallback;
  }

  return fallback;
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

const getImageDimensionsFromDataUrl = (dataUrl) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 160, height: img.naturalHeight || 160 });
    img.onerror = () => reject(new Error('Failed to parse image'));
    img.src = dataUrl;
  });

const fitDimensions = (width, height, maxWidth, maxHeight) => {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const ratio = safeWidth / safeHeight;
  const scale = Math.min(maxWidth / safeWidth, maxHeight / safeHeight, 1);
  const fittedWidth = Math.max(20, Math.round(safeWidth * scale));
  const fittedHeight = Math.max(20, Math.round(fittedWidth / ratio));
  return { width: fittedWidth, height: fittedHeight, ratio };
};

const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const ALIGNMENT_ACTIONS = [
  {
    key: 'left',
    label: 'Align Left',
    icon: AlignStartVertical
  },
  {
    key: 'centerX',
    label: 'Align Center X',
    icon: AlignCenterVertical
  },
  {
    key: 'right',
    label: 'Align Right',
    icon: AlignEndVertical
  },
  {
    key: 'top',
    label: 'Align Top',
    icon: AlignStartHorizontal
  },
  {
    key: 'centerY',
    label: 'Align Center Y',
    icon: AlignCenterHorizontal
  },
  {
    key: 'bottom',
    label: 'Align Bottom',
    icon: AlignEndHorizontal
  }
];

const FONT_OPTIONS = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: '"Trebuchet MS", sans-serif', label: 'Trebuchet MS' },
  { value: 'Tahoma, sans-serif', label: 'Tahoma' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Times New Roman", serif', label: 'Times New Roman' },
  { value: '"Courier New", monospace', label: 'Courier New' }
];

const INTERACTIVE_BUTTON_CLASS = 'transition-all duration-150 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0';
const isPaddingLayout = (layout) => layout !== 'fixed';

const CardEditor = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenantId') || '';
  const templateId = searchParams.get('templateId') || '';
  const templateNameFromQuery = searchParams.get('templateName') || 'Untitled Template';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState(null);
  const [allTenants, setAllTenants] = useState([]);
  const [lastStudent, setLastStudent] = useState(null);
  const [templateName, setTemplateName] = useState(templateNameFromQuery);
  const [canvasWidth, setCanvasWidth] = useState(DEFAULT_CARD_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(DEFAULT_CARD_HEIGHT);
  const [canvasRadius, setCanvasRadius] = useState(12);
  const [canvasBorderWidth, setCanvasBorderWidth] = useState(2);
  const [canvasBorderColor, setCanvasBorderColor] = useState('#94a3b8');
  const [svgMarkup, setSvgMarkup] = useState('');
  const [elements, setElements] = useState([]);
  const [groups, setGroups] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showStudentDetailsModal, setShowStudentDetailsModal] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [studentList, setStudentList] = useState([]);
  const [exportClassSearch, setExportClassSearch] = useState('');
  const [exportClasses, setExportClasses] = useState([]);
  const [exportStudents, setExportStudents] = useState([]);
  const [exportSelectedStudentIds, setExportSelectedStudentIds] = useState([]);
  const [activeExportClassId, setActiveExportClassId] = useState(null);
  const [selectedStudentDetails, setSelectedStudentDetails] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [switchingSchool, setSwitchingSchool] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingBack, setPendingBack] = useState(false);
  const [showCanvasHistory, setShowCanvasHistory] = useState(false);
  const [baselineSignature, setBaselineSignature] = useState('');
  const [clipboard, setClipboard] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [cursorInfo, setCursorInfo] = useState({ inside: false, x: 0, y: 0 });
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);
  const cardRef = useRef(null);
  const svgFileInputRef = useRef(null);
  const imageFileInputRef = useRef(null);
  const historySnapshotRef = useRef(null);
  const lastCommittedSnapshotRef = useRef(null);
  const historyDebounceTimerRef = useRef(null);
  const isHistoryApplyingRef = useRef(false);

  const makeSignature = (state = {}) =>
    JSON.stringify({
      name: state.templateName ?? templateName,
      width: state.canvasWidth ?? canvasWidth,
      height: state.canvasHeight ?? canvasHeight,
      radius: state.canvasRadius ?? canvasRadius,
      borderWidth: state.canvasBorderWidth ?? canvasBorderWidth,
      borderColor: state.canvasBorderColor ?? canvasBorderColor,
      svg: state.svgMarkup ?? svgMarkup,
      elements: state.elements ?? elements,
      groups: state.groups ?? groups
    });

  const makeHistorySnapshot = (override = {}) => ({
    canvasWidth: override.canvasWidth ?? canvasWidth,
    canvasHeight: override.canvasHeight ?? canvasHeight,
    canvasRadius: override.canvasRadius ?? canvasRadius,
    canvasBorderWidth: override.canvasBorderWidth ?? canvasBorderWidth,
    canvasBorderColor: override.canvasBorderColor ?? canvasBorderColor,
    svgMarkup: override.svgMarkup ?? svgMarkup,
    elements: cloneHistoryState(override.elements ?? elements),
    groups: cloneHistoryState(override.groups ?? groups)
  });

  const applyHistorySnapshot = (snapshot) => {
    if (!snapshot) return;
    isHistoryApplyingRef.current = true;
    setCanvasWidth(snapshot.canvasWidth);
    setCanvasHeight(snapshot.canvasHeight);
    setCanvasRadius(snapshot.canvasRadius);
    setCanvasBorderWidth(snapshot.canvasBorderWidth);
    setCanvasBorderColor(snapshot.canvasBorderColor);
    setSvgMarkup(snapshot.svgMarkup || '');
    setElements(cloneHistoryState(snapshot.elements || []));
    setGroups(cloneHistoryState(snapshot.groups || {}));
    setSelectedIds([]);
    setSelectedGroupIds([]);
    setExpandedGroupId(null);
    setTimeout(() => {
      isHistoryApplyingRef.current = false;
    }, 0);
  };

  useEffect(() => {
    const handleWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;

      event.preventDefault();

      const delta = event.deltaY > 0 ? -0.08 : 0.08;

      setZoom((prev) => clamp(prev + delta, MIN_ZOOM, MAX_ZOOM));
    };

    window.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWheel);
    };
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    initialize();
  }, [tenantId, templateId]);

  const initialize = async () => {
    setLoading(true);
    try {
      const requests = [
        adminAPI.getTenants(),
        adminAPI.getTenantLastStudent(tenantId)
      ];
      if (templateId) requests.push(adminAPI.getCardTemplate(templateId));
      else {
        requests.push(
          fetch('/card-front.svg')
            .then((res) => res.text())
            .then((text) => ({ data: { data: { baseSvgMarkup: text } } }))
            .catch(() => ({ data: { data: { baseSvgMarkup: '' } } }))
        );
      }
      const [tenantsRes, studentRes, templateRes] = await Promise.all(requests);

      const tenantList = tenantsRes.data.data || [];
      const tenantFound = tenantList.find((item) => item._id === tenantId) || null;

      setAllTenants(tenantList);
      setTenant(tenantFound);
      setLastStudent(studentRes.data.data || null);
      const templateData = templateRes?.data?.data || null;
      if (templateData) {
        const nextName = templateData.name || templateNameFromQuery;
        const nextWidth = Number(templateData.width) || DEFAULT_CARD_WIDTH;
        const nextHeight = Number(templateData.height) || DEFAULT_CARD_HEIGHT;
        const nextRadius = Number(templateData.borderRadius) || 12;
        const nextBorderWidth = Number.isFinite(Number(templateData.borderWidth))
          ? Math.max(0, Number(templateData.borderWidth))
          : 2;
        const nextBorderColor = templateData.borderColor || '#94a3b8';
        const nextSvg = templateData.baseSvgMarkup || '';
        const nextElements = Array.isArray(templateData.elements)
          ? templateData.elements.map((item) => ({
            ...item,
            textLayout: item.kind === 'text' ? (item.textLayout === 'fixed' ? 'fixed' : 'dynamic') : item.textLayout,
            locked: Boolean(item.locked)
          }))
          : [];
        const nextGroups = templateData.groups && typeof templateData.groups === 'object' ? templateData.groups : {};

        setTemplateName(nextName);
        setCanvasWidth(nextWidth);
        setCanvasHeight(nextHeight);
        setCanvasRadius(nextRadius);
        setCanvasBorderWidth(nextBorderWidth);
        setCanvasBorderColor(nextBorderColor);
        setSvgMarkup(nextSvg);
        setElements(nextElements);
        setGroups(nextGroups);
        const nextHistorySnapshot = {
          canvasWidth: nextWidth,
          canvasHeight: nextHeight,
          canvasRadius: nextRadius,
          canvasBorderWidth: nextBorderWidth,
          canvasBorderColor: nextBorderColor,
          svgMarkup: nextSvg,
          elements: cloneHistoryState(nextElements),
          groups: cloneHistoryState(nextGroups)
        };
        historySnapshotRef.current = nextHistorySnapshot;
        lastCommittedSnapshotRef.current = cloneHistoryState(nextHistorySnapshot);
        if (historyDebounceTimerRef.current) {
          clearTimeout(historyDebounceTimerRef.current);
          historyDebounceTimerRef.current = null;
        }
        setHistoryPast([]);
        setHistoryFuture([]);
        setBaselineSignature(
          JSON.stringify({
            name: nextName,
            width: nextWidth,
            height: nextHeight,
            radius: nextRadius,
            borderWidth: nextBorderWidth,
            borderColor: nextBorderColor,
            svg: nextSvg,
            elements: nextElements,
            groups: nextGroups
          })
        );
      }
    } catch (error) {
      toast.error('Failed to load editor data');
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!templateId) {
      toast.error('Template id is missing');
      return;
    }
    if (!hasUnsavedChanges) return;
    if (!templateName.trim()) {
      toast.error('Template name cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const { data } = await adminAPI.updateCardTemplate(templateId, {
        name: templateName.trim(),
        width: canvasWidth,
        height: canvasHeight,
        borderRadius: canvasRadius,
        borderWidth: canvasBorderWidth,
        borderColor: canvasBorderColor,
        baseSvgMarkup: svgMarkup || '',
        elements,
        groups
      });
      setTemplateName(data.data?.name || templateName.trim());
      setBaselineSignature(makeSignature({ templateName: data.data?.name || templateName.trim() }));
      toast.success('Template saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!showStudentModal || !tenantId) return;
    const timer = setTimeout(() => {
      fetchStudents(studentSearch);
    }, 250);
    return () => clearTimeout(timer);
  }, [showStudentModal, tenantId, studentSearch]);

  const fetchStudents = async (searchText = '') => {
    setStudentsLoading(true);
    try {
      const { data } = await adminAPI.getTenantStudents(tenantId, {
        search: searchText,
        limit: 100
      });
      setStudentList(data.data || []);
    } catch (error) {
      toast.error('Failed to fetch students');
      setStudentList([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadExportData = async () => {
    if (!tenantId) return;
    setExportLoading(true);
    try {
      const [classesRes, studentsRes] = await Promise.all([
        adminAPI.getTenantClasses(tenantId),
        adminAPI.getTenantStudents(tenantId, { limit: 5000 })
      ]);
      setExportClasses(classesRes.data.data || []);
      setExportStudents(studentsRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load export data');
      setExportClasses([]);
      setExportStudents([]);
    } finally {
      setExportLoading(false);
    }
  };

  const filteredSchools = useMemo(() => {
    const query = schoolSearch.trim().toLowerCase();
    if (!query) return allTenants;
    return allTenants.filter((item) => item.schoolName?.toLowerCase().includes(query));
  }, [allTenants, schoolSearch]);

  const switchSchoolFromEditor = async (nextTenantId) => {
    if (!nextTenantId || nextTenantId === tenantId) {
      setShowSchoolModal(false);
      return;
    }
    setSwitchingSchool(true);
    try {
      if (!templateId) {
        navigate(`/admin/cards?tenantId=${nextTenantId}`);
        return;
      }
      const { data } = await adminAPI.createCardTemplate({
        name: templateName,
        tenantId: nextTenantId,
        width: canvasWidth,
        height: canvasHeight,
        borderRadius: canvasRadius,
        borderWidth: canvasBorderWidth,
        borderColor: canvasBorderColor,
        baseSvgMarkup: svgMarkup || '',
        elements,
        groups
      });
      const nextTemplate = data.data;
      const params = new URLSearchParams({
        tenantId: nextTenantId,
        templateId: String(nextTemplate._id),
        templateName: nextTemplate.name
      });
      setShowSchoolModal(false);
      navigate(`/admin/cards/edit?${params.toString()}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to switch school');
    } finally {
      setSwitchingSchool(false);
    }
  };

  const selectedElement = selectedIds.length === 1
    ? elements.find((item) => item.id === selectedIds[0]) || null
    : null;
  const selectedGroupFromSingle = selectedElement?.groupId ? groups[selectedElement.groupId] : null;
  const hasUnsavedChanges = useMemo(
    () => makeSignature() !== baselineSignature,
    [templateName, canvasWidth, canvasHeight, canvasRadius, canvasBorderWidth, canvasBorderColor, svgMarkup, elements, groups, baselineSignature]
  );
  const editorHistorySignature = useMemo(
    () =>
      JSON.stringify({
        canvasWidth,
        canvasHeight,
        canvasRadius,
        canvasBorderWidth,
        canvasBorderColor,
        svgMarkup,
        elements,
        groups
      }),
    [canvasWidth, canvasHeight, canvasRadius, canvasBorderWidth, canvasBorderColor, svgMarkup, elements, groups]
  );

  useEffect(() => {
    const currentSnapshot = makeHistorySnapshot();
    const previousSnapshot = historySnapshotRef.current;

    if (!previousSnapshot) {
      historySnapshotRef.current = currentSnapshot;
      lastCommittedSnapshotRef.current = cloneHistoryState(currentSnapshot);
      return;
    }

    if (snapshotsEqual(previousSnapshot, currentSnapshot)) return;

    historySnapshotRef.current = currentSnapshot;

    if (isHistoryApplyingRef.current) {
      lastCommittedSnapshotRef.current = cloneHistoryState(currentSnapshot);
      return;
    }

    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = null;
    }

    historyDebounceTimerRef.current = setTimeout(() => {
      const latest = historySnapshotRef.current;
      const lastCommitted = lastCommittedSnapshotRef.current;
      if (!latest || !lastCommitted) return;
      if (snapshotsEqual(latest, lastCommitted)) return;

      setHistoryPast((prev) => {
        const next = [...prev, cloneHistoryState(lastCommitted)];
        if (next.length > 120) return next.slice(next.length - 120);
        return next;
      });
      setHistoryFuture([]);
      lastCommittedSnapshotRef.current = cloneHistoryState(latest);
      historyDebounceTimerRef.current = null;
    }, 320);
  }, [editorHistorySignature]);

  useEffect(
    () => () => {
      if (historyDebounceTimerRef.current) {
        clearTimeout(historyDebounceTimerRef.current);
        historyDebounceTimerRef.current = null;
      }
    },
    []
  );

  const hasPendingHistoryCommit = useMemo(() => {
    if (!lastCommittedSnapshotRef.current) return false;
    return !snapshotsEqual(lastCommittedSnapshotRef.current, makeHistorySnapshot());
  }, [editorHistorySignature]);

  const undoHistory = () => {
    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = null;
    }

    const current = makeHistorySnapshot();
    const committed = lastCommittedSnapshotRef.current;
    if (committed && !snapshotsEqual(current, committed)) {
      historySnapshotRef.current = cloneHistoryState(committed);
      applyHistorySnapshot(committed);
      return;
    }

    if (historyPast.length === 0) return;
    const previous = historyPast[historyPast.length - 1];
    setHistoryPast((prev) => prev.slice(0, -1));
    setHistoryFuture((prev) => [...prev, current]);
    historySnapshotRef.current = cloneHistoryState(previous);
    applyHistorySnapshot(previous);
  };

  const redoHistory = () => {
    if (historyDebounceTimerRef.current) {
      clearTimeout(historyDebounceTimerRef.current);
      historyDebounceTimerRef.current = null;
    }
    if (historyFuture.length === 0) return;
    const next = historyFuture[historyFuture.length - 1];
    const current = makeHistorySnapshot();
    setHistoryFuture((prev) => prev.slice(0, -1));
    setHistoryPast((prev) => [...prev, current]);
    historySnapshotRef.current = cloneHistoryState(next);
    applyHistorySnapshot(next);
  };

  const handleBack = () => {
    if (!hasUnsavedChanges) {
      navigate(`/admin/cards?tenantId=${tenantId}`);
      return;
    }
    setPendingBack(true);
    setShowUnsavedModal(true);
  };

  const proceedBackWithoutSave = () => {
    setShowUnsavedModal(false);
    setPendingBack(false);
    navigate(`/admin/cards?tenantId=${tenantId}`);
  };

  const saveAndProceedBack = async () => {
    await saveTemplate();
    setShowUnsavedModal(false);
    setPendingBack(false);
    navigate(`/admin/cards?tenantId=${tenantId}`);
  };

  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges]);

  const studentName = lastStudent ? `${lastStudent.firstName} ${lastStudent.lastName}`.trim() : 'No Student';
  const studentInitials = studentName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'ST';
  const classLabel = lastStudent?.classId
    ? `${lastStudent.classId.name}${lastStudent.classId.section ? ` - ${lastStudent.classId.section}` : ''}`
    : 'N/A';

  const defaultValues = {
    school_name: tenant?.schoolName || 'School Name',
    student_name: studentName,
    roll_no: lastStudent?.rollNo || 'N/A',
    class_name: classLabel
  };

  const syncSourceText = (element) => {
    if (element.type === 'text') return element.text;
    return defaultValues[element.type] || element.text;
  };

  const getDimensions = (element) => {
    if (element.kind !== 'text' || !isPaddingLayout(element.textLayout)) {
      return { width: element.width, height: element.height };
    }
    const content = syncSourceText(element);
    const measured = measureTextWidth(content, element.fontSize, element.fontWeight, element.fontFamily);
    const width = Math.max(20, measured + (element.paddingX || 0) * 2);
    const height = Math.max(20, Math.ceil(element.fontSize * 1.4) + (element.paddingY || 0) * 2);
    return { width, height };
  };

  const renderModel = useMemo(() => {
    const byId = {};
    const groupItems = {};

    elements.forEach((element) => {
      const dims = getDimensions(element);
      const baseLeft = element.centerX ? canvasWidth / 2 - dims.width / 2 : element.x;
      const entry = { element, ...dims, top: element.y, baseLeft, left: baseLeft, groupDelta: 0 };
      byId[element.id] = entry;

      if (element.groupId && groups[element.groupId]) {
        const group = groups[element.groupId];
        entry.top = entry.top + (group.y || 0);
        entry.left = entry.left + (group.x || 0);
        if (!groupItems[element.groupId]) groupItems[element.groupId] = [];
        groupItems[element.groupId].push(entry);
      }
    });

    Object.entries(groupItems).forEach(([groupId, items]) => {
      const groupConfig = groups[groupId];
      if (!groupConfig?.centerX || items.length === 0) return;
      const minX = Math.min(...items.map((item) => item.left));
      const maxX = Math.max(...items.map((item) => item.left + item.width));
      const groupCenter = minX + (maxX - minX) / 2;
      const delta = canvasWidth / 2 - groupCenter;
      items.forEach((item) => {
        item.groupDelta = delta;
        item.left = item.left + delta;
      });
    });

    return { byId };
  }, [elements, groups, tenant, lastStudent, canvasWidth]);

  const collectMemberIdsFromGroups = (groupIds = [], sourceGroups = groups, visited = new Set()) => {
    const result = [];
    groupIds.forEach((groupId) => {
      if (!sourceGroups[groupId] || visited.has(groupId)) return;
      visited.add(groupId);
      const group = sourceGroups[groupId];
      result.push(...(group.memberIds || []));
      if (group.childGroupIds?.length) {
        result.push(...collectMemberIdsFromGroups(group.childGroupIds, sourceGroups, visited));
      }
    });
    return [...new Set(result)];
  };

  const isGroupDescendantOf = (groupId, ancestorId) => {
    let current = groups[groupId];
    while (current) {
      if (current.id === ancestorId) return true;
      if (!current.parentGroupId) break;
      current = groups[current.parentGroupId];
    }
    return false;
  };

  const getGroupForCanvasContext = (groupId) => {
    if (!groupId || !groups[groupId]) return null;
    if (!expandedGroupId) {
      let cursor = groups[groupId];
      while (cursor?.parentGroupId && groups[cursor.parentGroupId]) {
        cursor = groups[cursor.parentGroupId];
      }
      return cursor?.id || groupId;
    }

    if (groupId === expandedGroupId) return expandedGroupId;

    let cursor = groups[groupId];
    while (
      cursor?.parentGroupId &&
      cursor.parentGroupId !== expandedGroupId &&
      groups[cursor.parentGroupId]
    ) {
      cursor = groups[cursor.parentGroupId];
    }

    // If this chain does not belong to the currently opened group context, treat it as out of scope.
    if (cursor?.parentGroupId !== expandedGroupId) return null;

    return cursor?.id || null;
  };

  const selectedMemberIds = useMemo(
    () => collectMemberIdsFromGroups(selectedGroupIds),
    [selectedGroupIds, groups]
  );
  const selectedCount = selectedIds.length + selectedGroupIds.length;
  const selectedLabels = useMemo(() => {
    const groupNames = selectedGroupIds.map((id) => groups[id]?.name || 'Group');
    const layerNames = selectedIds
      .map((id) => elements.find((el) => el.id === id)?.layerName)
      .filter(Boolean);
    return [...groupNames, ...layerNames];
  }, [selectedGroupIds, selectedIds, groups, elements]);
  const canUndo = historyPast.length > 0 || hasPendingHistoryCommit;
  const canRedo = historyFuture.length > 0;
  const historyEntries = useMemo(() => {
    const total = historyPast.length + historyFuture.length + 1;
    return Array.from({ length: total }, (_, index) => ({
      id: index + 1,
      label: `Step ${index + 1}`,
      current: index === historyPast.length
    }));
  }, [historyPast.length, historyFuture.length]);

  const handleCanvasMouseMove = (event) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) {
      setCursorInfo((prev) => (prev.inside ? { inside: false, x: 0, y: 0 } : prev));
      return;
    }
    const x = Math.round((event.clientX - rect.left) / zoom);
    const y = Math.round((event.clientY - rect.top) / zoom);
    setCursorInfo({ inside: true, x, y });
  };

  useEffect(() => {
    if (!dragState) return;

    const onMouseMove = (event) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const currentX = (event.clientX - rect.left) / zoom;
      const currentY = (event.clientY - rect.top) / zoom;
      const dx = currentX - dragState.startX;
      const dy = currentY - dragState.startY;

      setElements((prev) =>
        prev.map((element) => {
          if (!dragState.movingIds.includes(element.id)) return element;
          const origin = dragState.origins[element.id];
          if (!origin) return element;

          const maxX = canvasWidth - Math.max(20, origin.width);
          const maxY = canvasHeight - Math.max(20, origin.height);
          const nextX = clamp(origin.x + dx, 0, maxX);
          const nextY = clamp(origin.y + dy, 0, maxY);
          return { ...element, x: nextX, y: nextY };
        })
      );
    };

    const onMouseUp = () => setDragState(null);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragState, zoom, canvasWidth, canvasHeight]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (showStudentModal || showSchoolModal || showUnsavedModal || showExportModal || showStudentDetailsModal) return;
      const tag = event.target?.tagName?.toLowerCase();
      const isTypingContext = tag === 'input' || tag === 'textarea' || tag === 'select' || event.target?.isContentEditable;
      if (isTypingContext) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        if (event.shiftKey) {
          ungroupSelectedElement();
        } else {
          groupSelectedLayers();
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redoHistory();
        } else {
          undoHistory();
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveTemplate();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        copySelection();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        pasteClipboard();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicateSelection();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        setShowExportModal(true);
        setExportClassSearch('');
        setActiveExportClassId(null);
        if (exportClasses.length === 0 || exportStudents.length === 0) {
          loadExportData();
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        clearSelection();
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteCurrentSelection();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedIds, selectedGroupIds, groups, expandedGroupId, selectedElement, saveTemplate, showStudentModal, showSchoolModal, showUnsavedModal, showExportModal, showStudentDetailsModal, clipboard, elements, selectedMemberIds, exportClasses.length, exportStudents.length, historyPast.length, historyFuture.length]);

  const createElement = (block, overrides = {}) => {
    const scale = Math.min(canvasWidth / DEFAULT_CARD_WIDTH, canvasHeight / DEFAULT_CARD_HEIGHT);
    const blockWidth = Math.max(20, Math.round((block.width || 80) * scale));
    const blockHeight = Math.max(20, Math.round((block.height || 40) * scale));
    const id = `${block.type}-${Date.now()}`;
    const y = Math.min(20 + elements.length * Math.max(18, Math.round(24 * scale)), canvasHeight - blockHeight);
    return {
      id,
      type: block.type,
      kind: block.kind,
      label: block.label,
      layerName: `${block.label} ${elements.length + 1}`,
      x: 20,
      y,
      width: blockWidth,
      height: blockHeight,
      rotation: 0,
      centerX: false,
      groupId: null,
      textLayout: block.kind === 'text' ? 'dynamic' : 'fixed',
      paddingX: 10,
      paddingY: 6,
      text: block.text || defaultValues[block.type] || block.label,
      color: '#0f172a',
      fontSize: 14,
      fontWeight: 600,
      fontFamily: 'Inter, sans-serif',
      showFill: false,
      fillColor: '#ffffff',
      showBorder: false,
      borderColor: '#0f172a',
      borderWidth: 1,
      borderRadius: 8,
      locked: false,
      aspectRatio:
        ['photo', 'logo', 'image'].includes(block.kind) && blockHeight > 0
          ? blockWidth / blockHeight
          : undefined,
      ...overrides
    };
  };

  const addBlock = (block) => {
    if (block.kind === 'importer') {
      svgFileInputRef.current?.click();
      return;
    }
    if (block.kind === 'image_importer') {
      imageFileInputRef.current?.click();
      return;
    }
    const element = createElement(block);
    setElements((prev) => [...prev, element]);
    setSelectedIds([element.id]);
    setSelectedGroupIds([]);
  };

  const importSvgFile = async (file) => {
    if (!file) return;

    try {
      const text = await file.text();
      if (!/<svg[\s\S]*?>/i.test(text)) {
        toast.error('Please select a valid SVG file');
        return;
      }

      const dims = getSvgDimensionsFromMarkup(text);
      const width = Math.max(20, Math.min(canvasWidth, Math.round(dims.width)));
      const height = Math.max(20, Math.min(canvasHeight, Math.round(dims.height)));
      const name = file.name?.replace(/\.svg$/i, '') || 'Imported SVG';
      const block = { type: 'imported_svg', label: 'Imported SVG', kind: 'svg', width, height };
      const element = createElement(block, {
        layerName: name,
        svgMarkup: text,
        showFill: false,
        showBorder: false,
        borderRadius: 0
      });

      setElements((prev) => [...prev, element]);
      setSelectedIds([element.id]);
      setSelectedGroupIds([]);
    } catch (error) {
      toast.error('Failed to import SVG');
    }
  };

  const importImageFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const dims = await getImageDimensionsFromDataUrl(dataUrl);
      const fitted = fitDimensions(dims.width, dims.height, canvasWidth, canvasHeight);
      const name = file.name || 'Imported Image';
      const block = { type: 'imported_image', label: 'Imported Image', kind: 'image', width: fitted.width, height: fitted.height };
      const element = createElement(block, {
        layerName: name,
        imageSrc: dataUrl,
        aspectRatio: fitted.ratio,
        showFill: false,
        showBorder: false,
        borderRadius: 0
      });
      setElements((prev) => [...prev, element]);
      setSelectedIds([element.id]);
      setSelectedGroupIds([]);
    } catch (error) {
      toast.error('Failed to import image');
    }
  };

  const startDrag = (event, element) => {
    event.preventDefault();
    if (!cardRef.current) return;
    if (!expandedGroupId && !element.groupId && element.locked) return;
    if (expandedGroupId && (!element.groupId || !isGroupDescendantOf(element.groupId, expandedGroupId))) {
      clearSelection();
      return;
    }
    const rect = cardRef.current.getBoundingClientRect();
    const pointerX = (event.clientX - rect.left) / zoom;
    const pointerY = (event.clientY - rect.top) / zoom;
    const contextGroupId = getGroupForCanvasContext(element.groupId);
    const inGroupSelectedIds = expandedGroupId
      ? selectedIds.filter((id) => {
        const item = elements.find((entry) => entry.id === id);
        return item?.groupId && isGroupDescendantOf(item.groupId, expandedGroupId);
      })
      : selectedIds;

    const shouldMoveSelection =
      expandedGroupId
        ? inGroupSelectedIds.includes(element.id) && inGroupSelectedIds.length > 1
        : selectedIds.includes(element.id) && (selectedIds.length > 1 || selectedGroupIds.length > 0);
    const movingIds = expandedGroupId
      ? (shouldMoveSelection ? [...new Set(inGroupSelectedIds)] : [element.id])
      : shouldMoveSelection
        ? [...new Set([...selectedIds, ...selectedMemberIds])]
        : contextGroupId && groups[contextGroupId]
          ? collectMemberIdsFromGroups([contextGroupId], groups)
          : [element.id];

    const origins = {};
    movingIds.forEach((id) => {
      const item = elements.find((entry) => entry.id === id);
      if (!item) return;
      const dims = getDimensions(item);
      origins[id] = { x: item.x, y: item.y, width: dims.width, height: dims.height };
    });

    setDragState({
      startX: pointerX,
      startY: pointerY,
      movingIds,
      origins
    });
  };

  const toggleSelection = (id, multi) => {
    if (!multi) {
      setSelectedGroupIds([]);
    }
    setSelectedIds((prev) => {
      if (!multi) return [id];
      if (prev.includes(id)) return prev.filter((entry) => entry !== id);
      return [...prev, id];
    });
  };

  const toggleLayerLock = (id) => {
    setElements((prev) =>
      prev.map((item) => {
        if (item.id !== id || item.groupId) return item;
        return { ...item, locked: !item.locked };
      })
    );
    setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    setSelectedGroupIds([]);
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectedGroupIds([]);
  };

  const setZoomClamped = (next) => {
    setZoom(clamp(next, MIN_ZOOM, MAX_ZOOM));
  };

  const copySelection = () => {
    const ids = [...new Set([...selectedIds, ...selectedMemberIds])];
    if (ids.length === 0) return;
    const copied = elements.filter((el) => ids.includes(el.id)).map((el) => ({ ...el }));
    setClipboard({ elements: copied });
    toast.success('Copied');
  };

  const pasteClipboard = () => {
    if (!clipboard?.elements?.length) return;
    const created = clipboard.elements.map((item, index) => ({
      ...item,
      id: `${item.type}-${Date.now()}-${index}`,
      x: clamp((item.x || 0) + 20, 0, Math.max(0, canvasWidth - Math.max(20, item.width || 20))),
      y: clamp((item.y || 0) + 20, 0, Math.max(0, canvasHeight - Math.max(20, item.height || 20))),
      groupId: null
    }));
    setElements((prev) => [...prev, ...created]);
    setSelectedIds(created.map((item) => item.id));
    setSelectedGroupIds([]);
  };

  const duplicateSelection = () => {
    const ids = [...new Set([...selectedIds, ...selectedMemberIds])];
    if (ids.length === 0) return;
    const created = elements
      .filter((el) => ids.includes(el.id))
      .map((item, index) => ({
        ...item,
        id: `${item.type}-${Date.now()}-${index}`,
        x: clamp((item.x || 0) + 20, 0, Math.max(0, canvasWidth - Math.max(20, item.width || 20))),
        y: clamp((item.y || 0) + 20, 0, Math.max(0, canvasHeight - Math.max(20, item.height || 20))),
        groupId: null
      }));
    setElements((prev) => [...prev, ...created]);
    setSelectedIds(created.map((item) => item.id));
    setSelectedGroupIds([]);
  };

  const updateSelected = (patch) => {
    if (!selectedElement) return;
    const isAspectLockedKind = ['photo', 'logo', 'image'].includes(selectedElement.kind);
    const nextPatch = { ...patch };

    if (isAspectLockedKind) {
      const ratio =
        Number(selectedElement.aspectRatio) > 0
          ? Number(selectedElement.aspectRatio)
          : Math.max(1, selectedElement.width) / Math.max(1, selectedElement.height);
      nextPatch.aspectRatio = ratio;

      const hasWidth = Object.prototype.hasOwnProperty.call(nextPatch, 'width');
      const hasHeight = Object.prototype.hasOwnProperty.call(nextPatch, 'height');

      if (hasWidth && !hasHeight) {
        nextPatch.height = Math.max(20, Math.round(nextPatch.width / ratio));
      } else if (hasHeight && !hasWidth) {
        nextPatch.width = Math.max(20, Math.round(nextPatch.height * ratio));
      }
    }

    setElements((prev) =>
      prev.map((item) => (item.id === selectedElement.id ? { ...item, ...nextPatch } : item))
    );
  };

  const updateSelectedBulk = (patch, predicate = null) => {
    const idSet = new Set(selectedVisualElementIds);
    if (idSet.size === 0) return;
    setElements((prev) =>
      prev.map((item) => {
        if (!idSet.has(item.id)) return item;
        if (typeof predicate === 'function' && !predicate(item)) return item;
        return { ...item, ...patch };
      })
    );
  };

  const alignSelection = (mode, target = 'artboard') => {
    const ids = [...new Set([...selectedIds, ...selectedMemberIds])];
    if (ids.length === 0) return;

    const boxes = ids
      .map((id) => {
        const item = elements.find((entry) => entry.id === id);
        const meta = renderModel.byId[id];
        if (!item || !meta) return null;
        return { id, item, meta };
      })
      .filter(Boolean);
    if (boxes.length === 0) return;

    const ref = target === 'selection'
      ? {
        left: Math.min(...boxes.map((box) => box.meta.left)),
        top: Math.min(...boxes.map((box) => box.meta.top)),
        right: Math.max(...boxes.map((box) => box.meta.left + box.meta.width)),
        bottom: Math.max(...boxes.map((box) => box.meta.top + box.meta.height))
      }
      : {
        left: 0,
        top: 0,
        right: canvasWidth,
        bottom: canvasHeight
      };

    const byId = boxes.reduce((acc, box) => {
      acc[box.id] = box;
      return acc;
    }, {});

    setElements((prev) =>
      prev.map((item) => {
        const current = byId[item.id];
        if (!current) return item;
        const { meta } = current;

        let targetLeft = meta.left;
        let targetTop = meta.top;

        if (mode === 'left') targetLeft = ref.left;
        if (mode === 'right') targetLeft = ref.right - meta.width;
        if (mode === 'centerX') targetLeft = ref.left + (ref.right - ref.left) / 2 - meta.width / 2;
        if (mode === 'top') targetTop = ref.top;
        if (mode === 'bottom') targetTop = ref.bottom - meta.height;
        if (mode === 'centerY') targetTop = ref.top + (ref.bottom - ref.top) / 2 - meta.height / 2;

        const horizontal = mode === 'left' || mode === 'right' || mode === 'centerX';
        const vertical = mode === 'top' || mode === 'bottom' || mode === 'centerY';

        const offsetLeft = meta.left - (item.centerX ? canvasWidth / 2 - meta.width / 2 : item.x);
        const offsetTop = meta.top - item.y;

        const next = { ...item };

        if (horizontal) {
          next.centerX = false;
          next.x = targetLeft - offsetLeft;
        }
        if (vertical) {
          next.y = targetTop - offsetTop;
        }

        return next;
      })
    );
  };

  const renderAlignmentIcon = (Icon) => <Icon className="w-3.5 h-3.5" />;

  const groupSelectedLayers = () => {
    const selectedElementIds = [...new Set(selectedIds)].filter((id) => {
      const item = elements.find((element) => element.id === id);
      if (!item) return false;
      if (!item.groupId && item.locked) return false;
      return true;
    });
    const selectedDirectGroupIds = [...new Set(selectedGroupIds)].filter((id) => groups[id]);
    const totalSelected = selectedElementIds.length + selectedDirectGroupIds.length;
    if (totalSelected < 2) {
      toast.error('Select at least two layers to group');
      return;
    }

    const groupId = `group-${Date.now()}`;
    const groupName = `Group ${Object.keys(groups).length + 1}`;
    const parentGroupId = expandedGroupId || null;

    setGroups((prev) => {
      const next = { ...prev };

      // Remove selected children from all current parents before re-parenting
      Object.keys(next).forEach((gid) => {
        next[gid] = {
          ...next[gid],
          memberIds: (next[gid].memberIds || []).filter((id) => !selectedElementIds.includes(id)),
          childGroupIds: (next[gid].childGroupIds || []).filter((id) => !selectedDirectGroupIds.includes(id))
        };
      });

      // Create new group containing selected groups + selected elements
      next[groupId] = {
        id: groupId,
        name: groupName,
        centerX: false,
        x: 0,
        y: 0,
        rotation: 0,
        parentGroupId,
        childGroupIds: selectedDirectGroupIds,
        memberIds: selectedElementIds
      };

      // Re-parent selected groups under the new group
      selectedDirectGroupIds.forEach((childGroupId) => {
        if (next[childGroupId]) {
          next[childGroupId] = { ...next[childGroupId], parentGroupId: groupId };
        }
      });

      // Attach new group to current container context
      if (parentGroupId && next[parentGroupId]) {
        next[parentGroupId] = {
          ...next[parentGroupId],
          childGroupIds: [...new Set([...(next[parentGroupId].childGroupIds || []), groupId])]
        };
      }

      return next;
    });
    setElements((prev) =>
      prev.map((item) =>
        selectedElementIds.includes(item.id) ? { ...item, groupId, centerX: false } : item
      )
    );
    setSelectedIds([]);
    setSelectedGroupIds([groupId]);
  };

  const ungroupSelectedElement = () => {
    const groupIds = selectedGroupIds.length > 0
      ? selectedGroupIds
      : selectedElement?.groupId
        ? [selectedElement.groupId]
        : [];
    if (groupIds.length === 0) return;
    setElements((prev) =>
      prev.map((item) => (groupIds.includes(item.groupId) ? { ...item, groupId: null } : item))
    );
    setGroups((prev) => {
      const copy = { ...prev };
      groupIds.forEach((groupId) => {
        const group = copy[groupId];
        if (!group) return;

        if (group.parentGroupId && copy[group.parentGroupId]) {
          copy[group.parentGroupId] = {
            ...copy[group.parentGroupId],
            childGroupIds: (copy[group.parentGroupId].childGroupIds || []).filter((id) => id !== groupId),
            memberIds: [...new Set([...(copy[group.parentGroupId].memberIds || []), ...(group.memberIds || [])])]
          };
        }

        if (group.childGroupIds?.length) {
          group.childGroupIds.forEach((childId) => {
            if (copy[childId]) {
              copy[childId] = { ...copy[childId], parentGroupId: group.parentGroupId || null };
            }
          });
        }

        delete copy[groupId];
      });
      return copy;
    });
    setSelectedIds([]);
    setSelectedGroupIds([]);
    if (expandedGroupId && groupIds.includes(expandedGroupId)) {
      setExpandedGroupId(null);
    }
  };

  const updateGroup = (groupId, patch) => {
    setGroups((prev) => ({
      ...prev,
      [groupId]: { ...prev[groupId], ...patch }
    }));
  };

  const removeElementsByIds = (idsToRemove = [], extraGroupIdsToDelete = []) => {
    if (idsToRemove.length === 0 && extraGroupIdsToDelete.length === 0) return;
    const removeSet = new Set(idsToRemove);
    const deleteGroupSet = new Set(extraGroupIdsToDelete);
    const idsToUngroup = [];
    const nextGroups = {};
    Object.entries(groups).forEach(([id, group]) => {
      if (deleteGroupSet.has(id)) return;
      const members = group.memberIds.filter((memberId) => !removeSet.has(memberId));
      if (members.length >= 2) {
        nextGroups[id] = { ...group, memberIds: members, childGroupIds: (group.childGroupIds || []).filter((childId) => !deleteGroupSet.has(childId)) };
      } else if (members.length === 1) {
        idsToUngroup.push(members[0]);
        nextGroups[id] = { ...group, memberIds: members, childGroupIds: (group.childGroupIds || []).filter((childId) => !deleteGroupSet.has(childId)) };
      }
    });

    setGroups(nextGroups);

    setElements((prev) =>
      prev
        .filter((item) => !removeSet.has(item.id))
        .map((item) => (idsToUngroup.includes(item.id) ? { ...item, groupId: null } : item))
    );

    setSelectedIds((prev) => prev.filter((id) => !removeSet.has(id)));
    setSelectedGroupIds((prev) => prev.filter((id) => nextGroups[id] && !deleteGroupSet.has(id)));
    if (expandedGroupId && (!nextGroups[expandedGroupId] || deleteGroupSet.has(expandedGroupId))) {
      setExpandedGroupId(null);
    }
  };

  const deleteCurrentSelection = () => {
    if (selectedGroupIds.length > 0 && selectedIds.length === 0) {
      const ids = collectMemberIdsFromGroups(selectedGroupIds);
      removeElementsByIds(ids, selectedGroupIds);
      return;
    }
    if (selectedIds.length > 0) {
      removeElementsByIds(selectedIds);
    }
  };

  const selectGroup = (groupId, multi = false) => {
    if (!multi) {
      setSelectedIds([]);
    }
    setSelectedGroupIds((prev) => {
      if (!multi) return [groupId];
      if (prev.includes(groupId)) return prev.filter((id) => id !== groupId);
      return [...prev, groupId];
    });
  };

  const handleCanvasElementClick = (event, element) => {
    if (!expandedGroupId && !element.groupId && element.locked) return;
    const isMulti = event.ctrlKey || event.metaKey || event.shiftKey;
    const contextGroupId = getGroupForCanvasContext(element.groupId);

    if (expandedGroupId) {
      if (!element.groupId || !isGroupDescendantOf(element.groupId, expandedGroupId)) {
        clearSelection();
        return;
      }
      // In group mode, only direct children are editable as elements.
      // Descendants from nested groups resolve to that immediate child group.
      if (contextGroupId && contextGroupId !== expandedGroupId) {
        selectGroup(contextGroupId, isMulti);
      } else {
        toggleSelection(element.id, isMulti);
      }
      return;
    }

    if (contextGroupId) {
      selectGroup(contextGroupId, isMulti);
      return;
    }

    toggleSelection(element.id, isMulti);
  };

  const handleCanvasElementDoubleClick = (element) => {
    if (expandedGroupId) return;
    const contextGroupId = getGroupForCanvasContext(element.groupId);
    if (!contextGroupId || !groups[contextGroupId]) return;
    setExpandedGroupId(contextGroupId);
    clearSelection();
  };

  const renderOverlayElement = (element, meta) => {
    const borderWidth = element.showBorder ? Math.max(1, element.borderWidth || 1) : 0;
    const borderShadow = borderWidth > 0 ? `0 0 0 ${borderWidth}px ${element.borderColor}` : 'none';

    const baseStyle = {
      width: `${meta.width}px`,
      height: `${meta.height}px`,
      borderRadius: `${element.borderRadius || 0}px`,
      background: element.showFill ? element.fillColor : 'transparent',
      border: 'none',
      boxShadow: borderShadow,
      boxSizing: 'border-box'
    };

    if (element.kind === 'panel') {
      return (
        <div style={baseStyle} className="flex items-center justify-center text-[11px] font-semibold text-blue-700">
          Panel
        </div>
      );
    }

    if (element.kind === 'photo') {
      if (lastStudent?.studentPhoto) {
        return (
          <div style={baseStyle} className="overflow-hidden">
            <img src={lastStudent.studentPhoto} alt={studentName} className="w-full h-full object-contain" />
          </div>
        );
      }
      return (
        <div style={baseStyle} className="flex items-center justify-center text-xl font-semibold text-slate-700">
          {studentInitials}
        </div>
      );
    }

    if (element.kind === 'logo') {
      if (tenant?.schoolLogo) {
        return (
          <div style={baseStyle} className="overflow-hidden">
            <img src={tenant.schoolLogo} alt={tenant.schoolName || 'School logo'} className="w-full h-full object-contain" />
          </div>
        );
      }
      return (
        <div style={baseStyle} className="flex items-center justify-center text-xs font-bold text-slate-700 px-2 text-center">
          {tenant?.schoolName || 'Logo'}
        </div>
      );
    }

    if (element.kind === 'image') {
      return (
        <div style={baseStyle} className="overflow-hidden">
          <img src={element.imageSrc || ''} alt={element.layerName || 'Imported image'} className="w-full h-full object-contain" />
        </div>
      );
    }

    if (element.kind === 'svg') {
      return (
        <div style={baseStyle} className="overflow-hidden">
          <div
            className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
            dangerouslySetInnerHTML={{ __html: element.svgMarkup || '' }}
          />
        </div>
      );
    }

    return (
      <div
        style={{
          ...baseStyle,
          color: element.color,
          fontSize: `${element.fontSize}px`,
          fontWeight: element.fontWeight,
          fontFamily: element.fontFamily || 'Inter, sans-serif',
          textAlign: element.centerX || groups[element.groupId]?.centerX ? 'center' : 'left',
          padding: `${element.paddingY || 0}px ${element.paddingX || 0}px`
        }}
        className="truncate"
      >
        {syncSourceText(element)}
      </div>
    );
  };

  const selectedGroup = expandedGroupId
    ? null
    : selectedGroupIds.length === 1
      ? groups[selectedGroupIds[0]] || null
      : selectedGroupFromSingle;
  const selectedVisualElementIds = useMemo(
    () => [...new Set([...selectedIds, ...selectedMemberIds])],
    [selectedIds, selectedMemberIds]
  );
  const selectedVisualElements = useMemo(
    () => selectedVisualElementIds.map((id) => elements.find((item) => item.id === id)).filter(Boolean),
    [selectedVisualElementIds, elements]
  );
  const getCommonValue = (key) => {
    if (selectedVisualElements.length === 0) return null;
    const first = selectedVisualElements[0]?.[key];
    return selectedVisualElements.every((item) => item?.[key] === first) ? first : null;
  };
  const commonShowFill = getCommonValue('showFill');
  const commonShowBorder = getCommonValue('showBorder');
  const commonBorderWidth = getCommonValue('borderWidth');
  const commonBorderRadius = getCommonValue('borderRadius');
  const commonTextColor = getCommonValue('color');
  const commonFontSize = getCommonValue('fontSize');
  const commonFontFamily = getCommonValue('fontFamily');
  const allSelectedAreText = selectedVisualElements.length > 1 && selectedVisualElements.every((item) => item.kind === 'text');
  const multiSelectionBounds = useMemo(() => {
    if (selectedVisualElementIds.length < 2) return null;
    const boxes = selectedVisualElementIds
      .map((id) => renderModel.byId[id])
      .filter(Boolean);
    if (boxes.length < 2) return null;
    const minX = Math.min(...boxes.map((b) => b.left));
    const minY = Math.min(...boxes.map((b) => b.top));
    const maxX = Math.max(...boxes.map((b) => b.left + b.width));
    const maxY = Math.max(...boxes.map((b) => b.top + b.height));
    return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
  }, [selectedVisualElementIds, renderModel]);
  const ungroupedOrTopLevel = useMemo(() => {
    const baseLayer = svgMarkup
      ? [{ id: 'base-svg', name: 'Base SVG', type: 'base', locked: true }]
      : [];
    const groupRows = Object.values(groups)
      .filter((group) => !group.parentGroupId)
      .map((group) => ({
        id: group.id,
        name: group.name,
        type: 'group',
        memberCount: group.memberIds.length
      }));
    const singles = elements
      .filter((item) => !item.groupId || !groups[item.groupId])
      .map((item) => ({ ...item, type: 'layer' }));
    return [...baseLayer, ...[...groupRows, ...singles].reverse()];
  }, [elements, groups, svgMarkup]);

  const nestedLayers = useMemo(() => {
    if (!expandedGroupId || !groups[expandedGroupId]) return [];
    const childGroups = (groups[expandedGroupId].childGroupIds || [])
      .map((groupId) => groups[groupId])
      .filter(Boolean)
      .map((group) => ({ ...group, type: 'group' }));
    const childLayers = elements
      .filter((item) => item.groupId === expandedGroupId)
      .map((item) => ({ ...item, type: 'layer' }));
    return [...childGroups, ...childLayers].reverse();
  }, [expandedGroupId, groups, elements]);

  const studentsByClass = useMemo(() => {
    const byClass = {};
    exportStudents.forEach((student) => {
      const classId = student.classId?._id || student.classId;
      if (!classId) return;
      if (!byClass[classId]) byClass[classId] = [];
      byClass[classId].push(student);
    });
    return byClass;
  }, [exportStudents]);

  const filteredExportClasses = useMemo(() => {
    const query = exportClassSearch.trim().toLowerCase();
    if (!query) return exportClasses;
    return exportClasses.filter((item) => {
      const name = `${item.name || ''} ${item.section || ''}`.trim().toLowerCase();
      return name.includes(query);
    });
  }, [exportClasses, exportClassSearch]);

  const selectedExportStudents = useMemo(
    () => exportStudents.filter((student) => exportSelectedStudentIds.includes(student._id)),
    [exportStudents, exportSelectedStudentIds]
  );
  const exportSelectedIdSet = useMemo(() => new Set(exportSelectedStudentIds), [exportSelectedStudentIds]);

  const activeClassStudents = useMemo(
    () => (activeExportClassId ? (studentsByClass[activeExportClassId] || []) : []),
    [activeExportClassId, studentsByClass]
  );

  const openExportModal = async () => {
    setShowExportModal(true);
    setExportClassSearch('');
    setActiveExportClassId(null);
    if (exportClasses.length === 0 || exportStudents.length === 0) {
      await loadExportData();
    }
  };

  const getClassLabelFromStudent = (student) => {
    if (!student?.classId) return 'N/A';
    if (typeof student.classId === 'string') return 'N/A';
    return `${student.classId.name || ''}${student.classId.section ? ` - ${student.classId.section}` : ''}`.trim() || 'N/A';
  };

  const toggleExportStudentSelection = (studentId) => {
    setExportSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const selectAllInClass = (classId) => {
    const ids = (studentsByClass[classId] || []).map((student) => student._id);
    setExportSelectedStudentIds((prev) => [...new Set([...prev, ...ids])]);
  };

  const deselectAllInClass = (classId) => {
    const ids = new Set((studentsByClass[classId] || []).map((student) => student._id));
    setExportSelectedStudentIds((prev) => prev.filter((id) => !ids.has(id)));
  };

  const selectAllExportStudents = () => {
    setExportSelectedStudentIds(exportStudents.map((student) => student._id));
  };

  const clearAllExportStudents = () => {
    setExportSelectedStudentIds([]);
  };

  const buildCardDefaultValues = (student) => ({
    school_name: tenant?.schoolName || 'School Name',
    student_name: `${student?.firstName || ''} ${student?.lastName || ''}`.trim() || 'Student Name',
    roll_no: student?.rollNo || 'N/A',
    class_name: getClassLabelFromStudent(student)
  });

  const getTextForExport = (element, values) => {
    if (element.type === 'text') return element.text || '';
    return values[element.type] || element.text || '';
  };

  const getExportDimensions = (element, values) => {
    if (element.kind !== 'text' || !isPaddingLayout(element.textLayout)) {
      return { width: element.width, height: element.height };
    }
    const content = getTextForExport(element, values);
    const measured = measureTextWidth(content, element.fontSize, element.fontWeight, element.fontFamily);
    const width = Math.max(20, measured + (element.paddingX || 0) * 2);
    const height = Math.max(20, Math.ceil(element.fontSize * 1.4) + (element.paddingY || 0) * 2);
    return { width, height };
  };

  const buildExportRenderModel = (student) => {
    const values = buildCardDefaultValues(student);
    const byId = {};
    const groupItems = {};

    elements.forEach((element) => {
      const dims = getExportDimensions(element, values);
      const baseLeft = element.centerX ? canvasWidth / 2 - dims.width / 2 : element.x;
      const entry = { element, ...dims, top: element.y, baseLeft, left: baseLeft };
      byId[element.id] = entry;

      if (element.groupId && groups[element.groupId]) {
        const group = groups[element.groupId];
        entry.top = entry.top + (group.y || 0);
        entry.left = entry.left + (group.x || 0);
        if (!groupItems[element.groupId]) groupItems[element.groupId] = [];
        groupItems[element.groupId].push(entry);
      }
    });

    Object.entries(groupItems).forEach(([groupId, items]) => {
      const groupConfig = groups[groupId];
      if (!groupConfig?.centerX || items.length === 0) return;
      const minX = Math.min(...items.map((item) => item.left));
      const maxX = Math.max(...items.map((item) => item.left + item.width));
      const center = minX + (maxX - minX) / 2;
      const delta = canvasWidth / 2 - center;
      items.forEach((item) => {
        item.left = item.left + delta;
      });
    });

    return { byId, values };
  };

  const renderElementSvg = (element, meta, student, values) => {
    const width = meta.width;
    const height = meta.height;
    const borderWidth = element.showBorder ? Math.max(1, element.borderWidth || 1) : 0;
    const rectX = borderWidth ? -borderWidth / 2 : 0;
    const rectY = borderWidth ? -borderWidth / 2 : 0;
    const rectW = borderWidth ? width + borderWidth : width;
    const rectH = borderWidth ? height + borderWidth : height;
    const fill = element.showFill ? (element.fillColor || '#ffffff') : 'none';
    const stroke = borderWidth ? (element.borderColor || '#0f172a') : 'none';
    const radius = Math.max(0, element.borderRadius || 0);

    const rectMarkup = `<rect x="${rectX}" y="${rectY}" width="${rectW}" height="${rectH}" rx="${radius}" ry="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${borderWidth}" />`;

    if (element.kind === 'panel') {
      return `${rectMarkup}<text x="${width / 2}" y="${height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="11" font-weight="600" fill="#1d4ed8">Panel</text>`;
    }

    if (element.kind === 'photo' || element.kind === 'logo' || element.kind === 'image') {
      const href = element.kind === 'photo'
        ? student?.studentPhoto
        : element.kind === 'logo'
          ? tenant?.schoolLogo
          : element.imageSrc;
      if (href) {
        return `${rectMarkup}<image href="${escapeXml(href)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" />`;
      }
      const fallback = element.kind === 'photo'
        ? `${(student?.firstName || 'S').charAt(0)}${(student?.lastName || 'T').charAt(0)}`
        : element.kind === 'logo'
          ? (tenant?.schoolName || 'Logo')
          : 'Image';
      return `${rectMarkup}<text x="${width / 2}" y="${height / 2}" text-anchor="middle" dominant-baseline="middle" font-size="12" font-weight="600" fill="#334155">${escapeXml(fallback)}</text>`;
    }

    if (element.kind === 'svg') {
      const svgData = encodeURIComponent(element.svgMarkup || '');
      return `${rectMarkup}<image href="data:image/svg+xml;utf8,${svgData}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" />`;
    }

    const text = escapeXml(getTextForExport(element, values));
    const isCentered = element.centerX || groups[element.groupId]?.centerX;
    const textAnchor = isCentered ? 'middle' : 'start';
    const textX = isCentered ? width / 2 : (element.paddingX || 0);
    const textY = (element.paddingY || 0) + (element.fontSize || 14);

    return `${rectMarkup}<text x="${textX}" y="${textY}" text-anchor="${textAnchor}" font-size="${element.fontSize || 14}" font-weight="${element.fontWeight || 600}" font-family="${escapeXml(element.fontFamily || 'Inter, sans-serif')}" fill="${element.color || '#0f172a'}">${text}</text>`;
  };

  const exportSelectedCardsAsSvg = async () => {
    if (selectedExportStudents.length === 0) {
      toast.error('Select at least one student to export');
      return;
    }
    setExporting(true);
    try {
      const gap = 24;
      const totalWidth = selectedExportStudents.length * canvasWidth + (selectedExportStudents.length - 1) * gap;
      const totalHeight = canvasHeight;
      const encodedBaseSvg = svgMarkup ? encodeURIComponent(svgMarkup) : '';
      const cardsMarkup = selectedExportStudents.map((student, index) => {
        const model = buildExportRenderModel(student);
        const overlay = elements
          .map((element) => {
            const meta = model.byId[element.id];
            if (!meta) return '';
            const rotation = (element.rotation || 0) + (groups[element.groupId]?.rotation || 0);
            const translate = `translate(${meta.left} ${meta.top})`;
            const rotate = rotation ? ` rotate(${rotation})` : '';
            return `<g transform="${translate}${rotate}">${renderElementSvg(element, meta, student, model.values)}</g>`;
          })
          .join('');
        const x = index * (canvasWidth + gap);
        const clipId = `card-clip-${index}`;
        const baseLayer = encodedBaseSvg
          ? `<image href="data:image/svg+xml;utf8,${encodedBaseSvg}" x="0" y="0" width="${canvasWidth}" height="${canvasHeight}" preserveAspectRatio="none" />`
          : '';
        return `<g transform="translate(${x} 0)">
          <defs>
            <clipPath id="${clipId}">
              <rect x="0" y="0" width="${canvasWidth}" height="${canvasHeight}" rx="${canvasRadius}" ry="${canvasRadius}" />
            </clipPath>
          </defs>
          <rect x="0" y="0" width="${canvasWidth}" height="${canvasHeight}" rx="${canvasRadius}" ry="${canvasRadius}" fill="#ffffff" />
          <g clip-path="url(#${clipId})">
            ${baseLayer}
            ${overlay}
          </g>
          ${canvasBorderWidth > 0
            ? `<rect x="${canvasBorderWidth / 2}" y="${canvasBorderWidth / 2}" width="${Math.max(0, canvasWidth - canvasBorderWidth)}" height="${Math.max(0, canvasHeight - canvasBorderWidth)}" rx="${Math.max(0, canvasRadius - canvasBorderWidth / 2)}" ry="${Math.max(0, canvasRadius - canvasBorderWidth / 2)}" fill="none" stroke="${canvasBorderColor}" stroke-width="${canvasBorderWidth}" />`
            : ''}
        </g>`;
      }).join('');

      const output = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">${cardsMarkup}</svg>`;
      const blob = new Blob([output], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(templateName || 'cards').replace(/\s+/g, '-').toLowerCase()}-export.svg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${selectedExportStudents.length} card(s)`);
      setShowExportModal(false);
      setActiveExportClassId(null);
      setExportClassSearch('');
    } finally {
      setExporting(false);
    }
  };

  if (!tenantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-lg">
          <p className="text-sm text-slate-600">Missing school selection. Go back to Cards and pick a school first.</p>
          <Button className="mt-4" onClick={() => navigate('/admin/cards')}>Back to Cards</Button>
        </Card>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading editor..." />;
  }

  return (
    <div className="relative h-screen overflow-hidden bg-slate-100 grid grid-rows-[3.5rem_1fr_2.5rem] select-none">
      <div className="h-14 w-full grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 border-b border-slate-200 bg-white">
        <Button variant="outline" onClick={handleBack} title="Back" tooltipDirection="bottom">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="flex justify-center">
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="h-10 w-full max-w-xl px-4 text-sm border border-slate-300 rounded-lg bg-white"
            placeholder="Template name"
            data-tooltip="Template name"
            data-tooltip-direction="bottom"
          />
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600" data-tooltip="Unsaved changes" data-tooltip-direction="bottom">
              <Circle className="w-3 h-3 fill-current" />
              Unsaved
            </span>
          )}
          <Button onClick={saveTemplate} loading={saving} disabled={!hasUnsavedChanges} className="inline-flex items-center gap-1.5 h-10 px-4" title={hasUnsavedChanges ? 'Save changes (Ctrl/Cmd+S)' : 'No unsaved changes'} tooltipDirection="bottom">
            <Save className="w-4 h-4" />
            Save
          </Button>
          <Button variant="outline" onClick={openExportModal} title="Export (Ctrl/Cmd + E)" tooltipDirection="bottom">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="min-h-0 grid grid-cols-1 xl:grid-cols-[240px_1fr_340px] gap-3 overflow-hidden p-3">
        <div className="min-h-0 grid grid-rows-2 gap-3 overflow-hidden">
          <Card className="min-h-0 grid grid-rows-[auto_1fr] overflow-hidden">
            <p className="text-xs font-medium text-slate-500 pb-2">BLOCKS</p>
            <div className="min-h-0 flex flex-col gap-2 overflow-auto pr-1">
              {BLOCKS.map((block) => (
                <button
                  key={block.type}
                  type="button"
                  onClick={() => addBlock(block)}
                  data-tooltip={`Add ${block.label}`}
                  className="w-full text-left px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 group"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span>{block.label}</span>
                    <span className="w-5 h-5 rounded-md border border-slate-300 text-slate-600 group-hover:border-blue-400 group-hover:text-blue-700 inline-flex items-center justify-center">
                      +
                    </span>
                  </span>
                </button>
              ))}
              <input
                ref={svgFileInputRef}
                type="file"
                accept=".svg,image/svg+xml"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  importSvgFile(file);
                  event.target.value = '';
                }}
              />
              <input
                ref={imageFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  importImageFile(file);
                  event.target.value = '';
                }}
              />
            </div>
          </Card>

          <Card className="min-h-0 grid grid-rows-[auto_1fr] overflow-hidden">
            <div className="flex items-center justify-between pb-2">
              <p className="text-xs font-medium text-slate-500 inline-flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                LAYERS
              </p>
              <div className="flex gap-2">
                {selectedIds.length > 1 && (
                  <button
                    type="button"
                    onClick={groupSelectedLayers}
                    data-tooltip="Group selected layers (Ctrl/Cmd + G)"
                    className={`text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 ${INTERACTIVE_BUTTON_CLASS}`}
                  >
                    Group
                  </button>
                )}
                {!expandedGroupId && (selectedGroupIds.length > 0 || (selectedIds.length === 1 && selectedElement?.groupId)) && (
                  <button
                    type="button"
                    onClick={ungroupSelectedElement}
                    data-tooltip="Ungroup selected (Ctrl/Cmd + Shift + G)"
                    className={`text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 ${INTERACTIVE_BUTTON_CLASS}`}
                  >
                    Ungroup
                  </button>
                )}
              </div>
            </div>
            <div className="min-h-0 space-y-1">
              {expandedGroupId && groups[expandedGroupId] && (
                <div className="mb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedGroupId(null);
                      clearSelection();
                    }}
                    data-tooltip="Back to root layers"
                    className={`w-full text-left text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 ${INTERACTIVE_BUTTON_CLASS}`}
                  >
                    ← Back to all layers
                  </button>
                  <p className="text-[11px] text-slate-600 mt-1 px-1">
                    Inside: <span className="font-medium text-slate-800">{groups[expandedGroupId].name}</span>
                  </p>
                </div>
              )}

              {!expandedGroupId && ungroupedOrTopLevel.map((row) => (
                row.type === 'group' ? (
                  <div
                    key={row.id}
                    className={`p-2 rounded border text-sm ${selectedGroupIds.includes(row.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
                  >
                    <button
                      type="button"
                      onClick={(e) => selectGroup(row.id, e.ctrlKey || e.metaKey || e.shiftKey)}
                      onDoubleClick={() => {
                        setExpandedGroupId(row.id);
                        clearSelection();
                      }}
                      data-tooltip={`${row.name} (${row.memberCount} layers)`}
                      className={`w-full text-left ${INTERACTIVE_BUTTON_CLASS}`}
                    >
                      <p className={`font-medium truncate ${selectedGroupIds.includes(row.id) ? 'text-blue-700' : 'text-slate-800'}`}>{row.name}</p>
                      <p className="text-[11px] text-slate-500">{row.memberCount} layers</p>
                    </button>
                  </div>
                ) : row.type === 'base' ? (
                  <div
                    key={row.id}
                    className="p-2 rounded border text-sm border-slate-200 bg-slate-50"
                  >
                    <div className="w-full text-left truncate flex items-center justify-between gap-2">
                      <span className="text-slate-700">{row.name}</span>
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                  </div>
                ) : (
                  <div
                    key={row.id}
                    className={`p-2 rounded border text-sm ${selectedIds.includes(row.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          if (row.locked) return;
                          toggleSelection(row.id, e.ctrlKey || e.metaKey || e.shiftKey);
                        }}
                        data-tooltip={row.layerName || row.label}
                        className={`w-full text-left truncate ${row.locked ? 'text-slate-400 cursor-not-allowed' : ''}`}
                      >
                        {row.layerName || row.label}
                      </button>
                      {!row.groupId && (
                        <button
                          type="button"
                          onClick={() => toggleLayerLock(row.id)}
                          data-tooltip={row.locked ? 'Unlock layer' : 'Lock layer'}
                          className={`shrink-0 w-6 h-6 rounded border border-slate-300 hover:bg-slate-100 inline-flex items-center justify-center ${INTERACTIVE_BUTTON_CLASS}`}
                        >
                          {row.locked ? (
                            <Lock className="w-3.5 h-3.5 text-slate-700" />
                          ) : (
                            <LockOpen className="w-3.5 h-3.5 text-slate-700" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )
              ))}

              {expandedGroupId && groups[expandedGroupId] && nestedLayers.map((layer) => (
                layer.type === 'group' ? (
                  <div
                    key={layer.id}
                    className={`p-2 rounded border text-sm ${selectedGroupIds.includes(layer.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
                  >
                    <button
                      type="button"
                      onClick={(e) => selectGroup(layer.id, e.ctrlKey || e.metaKey || e.shiftKey)}
                      onDoubleClick={() => {
                        setExpandedGroupId(layer.id);
                        clearSelection();
                      }}
                      data-tooltip={`${layer.name} (${layer.memberIds?.length || 0} layers)`}
                      className={`w-full text-left ${INTERACTIVE_BUTTON_CLASS}`}
                    >
                      <p className={`font-medium truncate ${selectedGroupIds.includes(layer.id) ? 'text-blue-700' : 'text-slate-800'}`}>{layer.name}</p>
                      <p className="text-[11px] text-slate-500">{layer.memberIds?.length || 0} layers</p>
                    </button>
                  </div>
                ) : (
                  <div
                    key={layer.id}
                    className={`p-2 rounded border text-sm ${selectedIds.includes(layer.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
                  >
                    <button
                      type="button"
                      onClick={(e) => toggleSelection(layer.id, e.ctrlKey || e.metaKey || e.shiftKey)}
                      data-tooltip={layer.layerName || layer.label}
                      className={`w-full text-left truncate ${INTERACTIVE_BUTTON_CLASS}`}
                    >
                      {layer.layerName || layer.label}
                    </button>
                  </div>
                )
              ))}

              {!expandedGroupId && ungroupedOrTopLevel.length === 0 && (
                <p className="text-xs text-slate-500">No layers yet.</p>
              )}
              {expandedGroupId && nestedLayers.length === 0 && (
                <p className="text-xs text-slate-500">Group has no layers.</p>
              )}
            </div>
            <div className="pt-2 mt-2 border-t border-slate-200 grid grid-cols-4 gap-1">
              <button type="button" onClick={copySelection} className={`h-8 rounded border border-slate-300 hover:bg-slate-100 flex items-center justify-center ${INTERACTIVE_BUTTON_CLASS}`} data-tooltip="Copy (Ctrl/Cmd + C)">
                <Copy className="w-4 h-4 text-slate-700" />
              </button>
              <button type="button" onClick={pasteClipboard} className={`h-8 rounded border border-slate-300 hover:bg-slate-100 flex items-center justify-center ${INTERACTIVE_BUTTON_CLASS}`} data-tooltip="Paste (Ctrl/Cmd + V)">
                <ClipboardPaste className="w-4 h-4 text-slate-700" />
              </button>
              <button type="button" onClick={duplicateSelection} className={`h-8 rounded border border-slate-300 hover:bg-slate-100 flex items-center justify-center ${INTERACTIVE_BUTTON_CLASS}`} data-tooltip="Duplicate (Ctrl/Cmd + D)">
                <Copy className="w-4 h-4 text-slate-700" />
              </button>
              <button type="button" onClick={deleteCurrentSelection} className={`h-8 rounded border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center ${INTERACTIVE_BUTTON_CLASS}`} data-tooltip="Delete (Delete)">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </Card>
        </div>

        <Card className="min-h-0 overflow-hidden relative">
          <div className="absolute top-3 left-3 z-20 flex flex-col items-start gap-2">
            <div className="bg-white/90 border border-slate-200 rounded-lg shadow-sm px-2 py-1.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={undoHistory}
                  disabled={!canUndo}
                  data-tooltip="Undo (Ctrl/Cmd + Z)"
                  className={`w-7 h-7 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed ${INTERACTIVE_BUTTON_CLASS}`}
                >
                  <Undo2 className="w-3.5 h-3.5 mx-auto" />
                </button>
                <button
                  type="button"
                  onClick={redoHistory}
                  disabled={!canRedo}
                  data-tooltip="Redo (Ctrl/Cmd + Shift + Z)"
                  className={`w-7 h-7 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed ${INTERACTIVE_BUTTON_CLASS}`}
                >
                  <Redo2 className="w-3.5 h-3.5 mx-auto" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowCanvasHistory((prev) => !prev)}
                  data-tooltip={showCanvasHistory ? 'Hide history' : 'Show history'}
                  className={`w-7 h-7 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center ${INTERACTIVE_BUTTON_CLASS}`}
                >
                  <History className="w-4 h-4" />
                </button>
              </div>
            </div>

            {showCanvasHistory && (
              <div className="w-52 max-h-56 overflow-auto bg-white/95 border border-slate-200 rounded-lg shadow-sm p-2">
                <p className="text-[11px] font-semibold text-slate-700 mb-1">History</p>
                <div className="space-y-1">
                  {historyEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`text-xs px-2 py-1 rounded ${entry.current ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-slate-50 text-slate-600 border border-slate-200'}`}
                    >
                      {entry.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSchoolSearch('');
                setShowSchoolModal(true);
              }}
              data-tooltip="Change school"
              className={`bg-white/90 backdrop-blur border border-slate-200 rounded-full shadow-sm px-3 py-1.5 max-w-56 flex items-center gap-2 cursor-pointer ${INTERACTIVE_BUTTON_CLASS}`}
            >
              <p className="text-xs font-medium text-slate-700 truncate">{tenant?.schoolName || 'School'}</p>
              <span className="w-4 h-4 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 flex items-center justify-center">
                <Pencil className="w-3 h-3" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStudentSearch('');
                setShowStudentModal(true);
              }}
              data-tooltip="Change student"
              className={`bg-white/90 backdrop-blur border border-slate-200 rounded-full shadow-sm px-3 py-1.5 max-w-56 flex items-center gap-2 cursor-pointer ${INTERACTIVE_BUTTON_CLASS}`}
            >
              <p className="text-xs font-medium text-slate-700 truncate">{studentName || 'No Student'}</p>
              <span className="w-4 h-4 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 flex items-center justify-center">
                <Pencil className="w-3 h-3" />
              </span>
            </button>
          </div>

          <div
            className="h-full flex items-center justify-center overflow-auto relative"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.14) 1px, transparent 0)',
              backgroundSize: `${14 * zoom}px ${14 * zoom}px`
            }}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={() => setCursorInfo({ inside: false, x: 0, y: 0 })}
          >
            <div
              className="relative"
              style={{
                width: `${canvasWidth * zoom}px`,
                height: `${canvasHeight * zoom}px`
              }}
            >
              <div
                ref={cardRef}
                className="relative overflow-hidden shadow-sm select-none"
                style={{
                  width: `${canvasWidth}px`,
                  height: `${canvasHeight}px`,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                  borderRadius: `${canvasRadius}px`,
                  borderStyle: canvasBorderWidth > 0 ? 'solid' : 'none',
                  borderWidth: `${canvasBorderWidth}px`,
                  borderColor: canvasBorderColor
                }}
                onClick={(event) => {
                  if (event.target.closest('[data-element-layer="true"]')) return;
                  clearSelection();
                }}
              >
                <div
                  className="absolute inset-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:block"
                  dangerouslySetInnerHTML={{ __html: svgMarkup }}
                />
                {elements.map((element) => {
                  const meta = renderModel.byId[element.id];
                  if (!meta) return null;
                  return (
                    <div
                      key={element.id}
                      data-element-layer="true"
                      role="button"
                      tabIndex={0}
                      onMouseDown={(event) => startDrag(event, element)}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCanvasElementClick(event, element);
                      }}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        handleCanvasElementDoubleClick(element);
                      }}
                      className={`absolute ${(!expandedGroupId && !element.groupId && element.locked) ? 'cursor-not-allowed' : 'cursor-move'}`}
                      style={{
                        top: `${meta.top}px`,
                        left: `${meta.left}px`,
                        width: `${meta.width}px`,
                        height: `${meta.height}px`,
                        transform: `rotate(${(element.rotation || 0) + (groups[element.groupId]?.rotation || 0)}deg)`,
                        zIndex: selectedVisualElementIds.includes(element.id) ? 20 : 10
                      }}
                    >
                      {renderOverlayElement(element, meta)}
                      {selectedVisualElementIds.includes(element.id) && (
                        <div className="absolute -inset-1 pointer-events-none border-2 border-blue-500 rounded-md" />
                      )}
                    </div>
                  );
                })}

                {selectedGroupIds.map((groupId) => {
                  const memberBoxes = (groups[groupId]?.memberIds || [])
                    .map((id) => renderModel.byId[id])
                    .filter(Boolean);
                  if (memberBoxes.length === 0) return null;
                  const minX = Math.min(...memberBoxes.map((b) => b.left));
                  const minY = Math.min(...memberBoxes.map((b) => b.top));
                  const maxX = Math.max(...memberBoxes.map((b) => b.left + b.width));
                  const maxY = Math.max(...memberBoxes.map((b) => b.top + b.height));
                  return (
                    <div
                      key={`group-focus-${groupId}`}
                      className="absolute pointer-events-none border-2 border-blue-500 rounded-md z-30"
                      style={{
                        left: `${minX - 2}px`,
                        top: `${minY - 2}px`,
                        width: `${maxX - minX + 4}px`,
                        height: `${maxY - minY + 4}px`
                      }}
                    />
                  );
                })}

                {multiSelectionBounds && (
                  <div
                    className="absolute pointer-events-none border-2 border-dashed border-indigo-500 rounded-md z-30"
                    style={{
                      left: `${multiSelectionBounds.left - 4}px`,
                      top: `${multiSelectionBounds.top - 4}px`,
                      width: `${multiSelectionBounds.width + 8}px`,
                      height: `${multiSelectionBounds.height + 8}px`
                    }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="absolute bottom-3 left-3 z-10 bg-white/90 border border-slate-200 rounded-lg shadow-sm px-2 py-1.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoomClamped(zoom - 0.1)}
                data-tooltip="Zoom out"
                className={`w-6 h-6 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 ${INTERACTIVE_BUTTON_CLASS}`}
              >
                -
              </button>
              <span className="text-xs font-medium text-slate-700 min-w-14 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomClamped(zoom + 0.1)}
                data-tooltip="Zoom in"
                className={`w-6 h-6 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 ${INTERACTIVE_BUTTON_CLASS}`}
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                data-tooltip="Reset zoom"
                className={`text-xs px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 ${INTERACTIVE_BUTTON_CLASS}`}
              >
                Reset
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Tip: Ctrl/Cmd + wheel to zoom</p>
          </div>

          <div
            className="absolute bottom-3 right-3 z-10 bg-white/90 border border-slate-200 rounded-lg shadow-sm px-2 py-1.5"
            data-tooltip="Canvas size"
          >
            <p className="text-xs font-medium text-slate-700">Size: {canvasWidth} x {canvasHeight}</p>
          </div>
        </Card>

        <Card className="min-h-0 grid grid-rows-[auto_1fr] overflow-hidden">
          <p className="text-xs font-medium text-slate-500 pb-2 inline-flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            PROPERTIES
          </p>
          <div className="min-h-0 space-y-3 overflow-auto pr-1">
            {selectedIds.length > 1 && (
              <button
                type="button"
                onClick={groupSelectedLayers}
                data-tooltip="Group selected layers (Ctrl/Cmd + G)"
                className={`w-full px-3 py-2 rounded-lg text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition ${INTERACTIVE_BUTTON_CLASS}`}
              >
                Group Selected ({selectedIds.length})
              </button>
            )}
            {selectedVisualElementIds.length > 0 && (
              <div className="space-y-2 p-2.5 rounded-lg border border-slate-200 bg-white">
                <p className="text-[11px] font-medium text-slate-500">Align to Artboard</p>
                <div className="grid grid-cols-6 gap-1">
                  {ALIGNMENT_ACTIONS.map((action) => (
                    <button
                      key={`artboard-${action.key}`}
                      type="button"
                      onClick={() => alignSelection(action.key, 'artboard')}
                      data-tooltip={action.label}
                      className={`h-8 rounded border border-slate-300 hover:bg-slate-100 text-slate-700 flex items-center justify-center ${INTERACTIVE_BUTTON_CLASS}`}
                    >
                      {renderAlignmentIcon(action.icon)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selectedVisualElementIds.length > 1 && (
              <div className="space-y-2 p-2.5 rounded-lg border border-slate-200 bg-white">
                <p className="text-[11px] font-medium text-slate-500">Align to Selection</p>
                <div className="grid grid-cols-6 gap-1">
                  {ALIGNMENT_ACTIONS.map((action) => (
                    <button
                      key={`selection-${action.key}`}
                      type="button"
                      onClick={() => alignSelection(action.key, 'selection')}
                      data-tooltip={action.label}
                      className={`h-8 rounded border border-slate-300 hover:bg-slate-100 text-slate-700 flex items-center justify-center ${INTERACTIVE_BUTTON_CLASS}`}
                    >
                      {renderAlignmentIcon(action.icon)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selectedVisualElementIds.length > 1 && (
              <div className="space-y-2 p-3 rounded border border-slate-200 bg-white">
                <p className="text-[11px] font-medium text-slate-500">Common Properties ({selectedVisualElementIds.length})</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateSelectedBulk({ showFill: commonShowFill === true ? false : true })}
                    data-tooltip="Toggle fill on all selected layers"
                    className={`px-2 py-1.5 rounded-md text-xs border ${commonShowFill ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'} ${INTERACTIVE_BUTTON_CLASS}`}
                  >
                    Fill
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedBulk({ showBorder: commonShowBorder === true ? false : true })}
                    data-tooltip="Toggle border on all selected layers"
                    className={`px-2 py-1.5 rounded-md text-xs border ${commonShowBorder ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'} ${INTERACTIVE_BUTTON_CLASS}`}
                  >
                    Border
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500">Border Width</label>
                    <input
                      type="number"
                      min="0"
                      value={commonBorderWidth ?? ''}
                      onChange={(e) => updateSelectedBulk({ borderWidth: Math.max(0, asNumber(e.target.value, commonBorderWidth || 1)) })}
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Border Radius</label>
                    <input
                      type="number"
                      min="0"
                      value={commonBorderRadius ?? ''}
                      onChange={(e) => updateSelectedBulk({ borderRadius: Math.max(0, asNumber(e.target.value, commonBorderRadius || 0)) })}
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
                {allSelectedAreText && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500">Text Color</label>
                        <div className="relative mt-1">
                          <input
                            type="text"
                            value={commonTextColor ?? ''}
                            onChange={(e) => updateSelectedBulk({ color: e.target.value }, (item) => item.kind === 'text')}
                            className="w-full pr-10 px-2 py-1.5 text-sm border border-slate-300 rounded-md uppercase"
                          />
                          <label className="absolute top-1/2 right-2 -translate-y-1/2 w-6 h-6 rounded border border-slate-300 cursor-pointer flex items-center justify-center bg-white">
                            <Pipette className="w-3.5 h-3.5 text-slate-600" />
                            <input
                              type="color"
                              value={commonTextColor || '#0f172a'}
                              onChange={(e) => updateSelectedBulk({ color: e.target.value }, (item) => item.kind === 'text')}
                              className="sr-only"
                            />
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Font Size</label>
                        <input
                          type="number"
                          min="8"
                          max="72"
                          value={commonFontSize ?? ''}
                          onChange={(e) => updateSelectedBulk({ fontSize: Math.max(8, asNumber(e.target.value, commonFontSize || 14)) }, (item) => item.kind === 'text')}
                          className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                        />
                      </div>
                    </div>
                    <Select
                      label="Font Family"
                      value={commonFontFamily || ''}
                      onChange={(e) => updateSelectedBulk({ fontFamily: e.target.value }, (item) => item.kind === 'text')}
                      options={FONT_OPTIONS}
                      placeholder={commonFontFamily ? 'Select font' : 'Mixed font'}
                      searchable={false}
                      tooltipDirection="left"
                    />
                  </>
                )}
              </div>
            )}
            {selectedGroup && selectedGroupIds.length === 1 && selectedIds.length === 0 && (
              <div className="space-y-3 p-3 rounded border border-slate-200 bg-white">
                <div>
                  <label className="text-xs text-slate-500">Group Layer Name</label>
                  <input
                    type="text"
                    value={selectedGroup.name}
                    onChange={(e) => updateGroup(selectedGroup.id, { name: e.target.value })}
                    className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Group Transform</label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <input
                      type="number"
                      value={selectedGroup.x || 0}
                      onChange={(e) => updateGroup(selectedGroup.id, { x: asNumber(e.target.value, selectedGroup.x || 0) })}
                      className="px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                    <input
                      type="number"
                      value={selectedGroup.y || 0}
                      onChange={(e) => updateGroup(selectedGroup.id, { y: asNumber(e.target.value, selectedGroup.y || 0) })}
                      className="px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                    <input
                      type="number"
                      value={selectedGroup.rotation || 0}
                      onChange={(e) => updateGroup(selectedGroup.id, { rotation: asNumber(e.target.value, selectedGroup.rotation || 0) })}
                      className="px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => updateGroup(selectedGroup.id, { centerX: !selectedGroup.centerX })}
                    className={`mt-2 w-full px-2 py-1.5 rounded-md text-xs border ${selectedGroup.centerX ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
                  >
                    Center Group Horizontally
                  </button>
                </div>
              </div>
            )}

            {selectedIds.length === 0 && selectedGroupIds.length === 0 && (
              <div className="space-y-3 p-3 rounded border border-slate-200 bg-white">
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">Canvas</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500">Width</label>
                    <p className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-slate-50 text-slate-700">{canvasWidth}px</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Height</label>
                    <p className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-slate-50 text-slate-700">{canvasHeight}px</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Border Radius</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="range"
                      min="0"
                      max="80"
                      value={canvasRadius}
                      onChange={(e) => setCanvasRadius(asNumber(e.target.value, canvasRadius))}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={canvasRadius}
                      onChange={(e) => setCanvasRadius(Math.max(0, asNumber(e.target.value, canvasRadius)))}
                      className="w-16 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500">Border Width</label>
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={canvasBorderWidth}
                      onChange={(e) => setCanvasBorderWidth(Math.max(0, asNumber(e.target.value, canvasBorderWidth)))}
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Border Color</label>
                    <div className="relative mt-1">
                      <input
                        type="text"
                        value={canvasBorderColor}
                        onChange={(e) => setCanvasBorderColor(e.target.value)}
                        className="w-full pr-10 px-2 py-1.5 text-sm border border-slate-300 rounded-md uppercase"
                      />
                      <label className="absolute top-1/2 right-2 -translate-y-1/2 w-6 h-6 rounded border border-slate-300 cursor-pointer flex items-center justify-center bg-white">
                        <Pipette className="w-3.5 h-3.5 text-slate-600" />
                        <input
                          type="color"
                          value={canvasBorderColor}
                          onChange={(e) => setCanvasBorderColor(e.target.value)}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {selectedElement && selectedIds.length === 1 && (
              <>
                <div>
                  <label className="text-xs text-slate-500">Layer Name</label>
                  <input
                    type="text"
                    value={selectedElement.layerName}
                    onChange={(e) => updateSelected({ layerName: e.target.value })}
                    className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500">Transform</label>
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">X</span>
                      <input
                        type="number"
                        value={selectedElement.x}
                        onChange={(e) => updateSelected({ x: asNumber(e.target.value, selectedElement.x) })}
                        disabled={selectedElement.centerX}
                        className="w-full pl-6 pr-2 py-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">Y</span>
                      <input
                        type="number"
                        value={selectedElement.y}
                        onChange={(e) => updateSelected({ y: asNumber(e.target.value, selectedElement.y) })}
                        className="w-full pl-6 pr-2 py-1.5 text-sm border border-slate-300 rounded-md"
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">R</span>
                      <input
                        type="number"
                        value={selectedElement.rotation}
                        onChange={(e) => updateSelected({ rotation: asNumber(e.target.value, selectedElement.rotation) })}
                        className="w-full pl-6 pr-2 py-1.5 text-sm border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSelected({ centerX: !selectedElement.centerX })}
                    className={`mt-2 w-full px-2 py-1.5 rounded-md text-xs border ${selectedElement.centerX ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
                  >
                    Center Horizontally
                  </button>
                </div>

                {selectedGroup && (
                  <div>
                    <label className="text-xs text-slate-500">Group</label>
                    <input
                      type="text"
                      value={selectedGroup.name}
                      onChange={(e) => updateGroup(selectedGroup.id, { name: e.target.value })}
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-500 inline-flex items-center gap-1">
                      <Square className="w-3.5 h-3.5" />
                      Size
                    </label>
                    {selectedElement.kind === 'text' && (
                      <button
                        type="button"
                        onClick={() => updateSelected({ textLayout: isPaddingLayout(selectedElement.textLayout) ? 'fixed' : 'dynamic' })}
                        className="w-5 h-5 rounded-md border border-slate-300 hover:bg-slate-50 flex items-center justify-center"
                        data-tooltip={isPaddingLayout(selectedElement.textLayout) ? 'Padding layout' : 'Fixed layout'}
                      >
                        {isPaddingLayout(selectedElement.textLayout) ? (
                          <GripHorizontal className="w-3 h-3 text-slate-700" />
                        ) : (
                          <Square className="w-3 h-3 text-slate-700" />
                        )}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">W</span>
                      <input
                        type="number"
                        min="20"
                        value={selectedElement.width}
                        onChange={(e) => updateSelected({ width: Math.max(20, asNumber(e.target.value, selectedElement.width)) })}
                        className="w-full pl-6 pr-2 py-1.5 text-sm border border-slate-300 rounded-md"
                        disabled={selectedElement.kind === 'text' && isPaddingLayout(selectedElement.textLayout)}
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">H</span>
                      <input
                        type="number"
                        min="20"
                        value={selectedElement.height}
                        onChange={(e) => updateSelected({ height: Math.max(20, asNumber(e.target.value, selectedElement.height)) })}
                        className="w-full pl-6 pr-2 py-1.5 text-sm border border-slate-300 rounded-md"
                        disabled={selectedElement.kind === 'text' && isPaddingLayout(selectedElement.textLayout)}
                      />
                    </div>
                  </div>
                </div>

                {isPaddingLayout(selectedElement.textLayout) && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500">Padding X</label>
                      <input
                        type="number"
                        min="0"
                        value={selectedElement.paddingX}
                        onChange={(e) => updateSelected({ paddingX: Math.max(0, asNumber(e.target.value, selectedElement.paddingX)) })}
                        className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Padding Y</label>
                      <input
                        type="number"
                        min="0"
                        value={selectedElement.paddingY}
                        onChange={(e) => updateSelected({ paddingY: Math.max(0, asNumber(e.target.value, selectedElement.paddingY)) })}
                        className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>
                )}

                {selectedElement.kind === 'text' && (
                  <>
                    {selectedElement.type === 'text' && (
                      <div>
                        <label className="text-xs text-slate-500">Text</label>
                        <input
                          type="text"
                          value={selectedElement.text}
                          onChange={(e) => updateSelected({ text: e.target.value })}
                          className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-slate-500">Text Color</label>
                        <div className="relative mt-1">
                          <input
                            type="text"
                            value={selectedElement.color}
                            onChange={(e) => updateSelected({ color: e.target.value })}
                            className="w-full pr-10 px-2 py-1.5 text-sm border border-slate-300 rounded-md uppercase"
                          />
                          <label className="absolute top-1/2 right-2 -translate-y-1/2 w-6 h-6 rounded border border-slate-300 cursor-pointer flex items-center justify-center bg-white">
                            <Pipette className="w-3.5 h-3.5 text-slate-600" />
                            <input type="color" value={selectedElement.color} onChange={(e) => updateSelected({ color: e.target.value })} className="sr-only" />
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Font Size</label>
                        <input
                          type="number"
                          min="8"
                          max="72"
                          value={selectedElement.fontSize}
                          onChange={(e) => updateSelected({ fontSize: Math.max(8, asNumber(e.target.value, selectedElement.fontSize)) })}
                          className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                        />
                      </div>
                    </div>
                    <Select
                      label="Font Family"
                      value={selectedElement.fontFamily || 'Inter, sans-serif'}
                      onChange={(e) => updateSelected({ fontFamily: e.target.value })}
                      options={FONT_OPTIONS}
                      searchable={false}
                      tooltipDirection="left"
                    />
                  </>
                )}

                <div>
                  <label className="text-xs text-slate-500">Appearance</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => updateSelected({ showFill: !selectedElement.showFill })}
                      className={`px-2 py-1.5 rounded-md text-xs border ${selectedElement.showFill ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
                    >
                      Fill
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelected({ showBorder: !selectedElement.showBorder })}
                      className={`px-2 py-1.5 rounded-md text-xs border ${selectedElement.showBorder ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
                    >
                      Border
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="text-xs text-slate-500">Fill Color</label>
                      <div className="relative mt-1">
                        <input
                          type="text"
                          value={selectedElement.fillColor}
                          onChange={(e) => updateSelected({ fillColor: e.target.value })}
                          className="w-full pr-10 px-2 py-1.5 text-sm border border-slate-300 rounded-md uppercase"
                          disabled={!selectedElement.showFill}
                        />
                        <label className="absolute top-1/2 right-2 -translate-y-1/2 w-6 h-6 rounded border border-slate-300 cursor-pointer flex items-center justify-center bg-white">
                          <Pipette className="w-3.5 h-3.5 text-slate-600" />
                          <input type="color" value={selectedElement.fillColor} onChange={(e) => updateSelected({ fillColor: e.target.value })} className="sr-only" disabled={!selectedElement.showFill} />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Border Color</label>
                      <div className="relative mt-1">
                        <input
                          type="text"
                          value={selectedElement.borderColor}
                          onChange={(e) => updateSelected({ borderColor: e.target.value })}
                          className="w-full pr-10 px-2 py-1.5 text-sm border border-slate-300 rounded-md uppercase"
                          disabled={!selectedElement.showBorder}
                        />
                        <label className="absolute top-1/2 right-2 -translate-y-1/2 w-6 h-6 rounded border border-slate-300 cursor-pointer flex items-center justify-center bg-white">
                          <Pipette className="w-3.5 h-3.5 text-slate-600" />
                          <input type="color" value={selectedElement.borderColor} onChange={(e) => updateSelected({ borderColor: e.target.value })} className="sr-only" disabled={!selectedElement.showBorder} />
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="text-xs text-slate-500">Border Width</label>
                      <input
                        type="number"
                        min="1"
                        value={selectedElement.borderWidth}
                        onChange={(e) => updateSelected({ borderWidth: Math.max(1, asNumber(e.target.value, selectedElement.borderWidth)) })}
                        className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                        disabled={!selectedElement.showBorder}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Border Radius</label>
                      <input
                        type="number"
                        min="0"
                        value={selectedElement.borderRadius}
                        onChange={(e) => updateSelected({ borderRadius: Math.max(0, asNumber(e.target.value, selectedElement.borderRadius)) })}
                        className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {(selectedIds.length > 0 || selectedGroupIds.length > 0) && (
              <button
                type="button"
                onClick={deleteCurrentSelection}
                className="w-full px-3 py-2 rounded-lg text-sm bg-red-50 text-red-600 hover:bg-red-100 transition inline-flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Remove Selected
              </button>
            )}
          </div>
        </Card>
      </div>

      <div className="h-10 border-t border-slate-200 bg-white px-3 text-xs text-slate-600 grid grid-cols-[1fr_2fr_1fr] items-center gap-2">
        <div className="inline-flex items-center justify-start gap-1">
          <Pencil className="w-3.5 h-3.5 text-slate-500" />
          Cursor: {cursorInfo.inside ? `${cursorInfo.x}, ${cursorInfo.y}` : 'outside'}
        </div>
        <div className="inline-flex items-center justify-center gap-2 min-w-0">
          <GripHorizontal className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span className="truncate">{selectedCount > 0 ? `${selectedCount} selected: ${selectedLabels.join(', ')}` : 'No selection'}</span>
        </div>
      </div>

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
          >
            Cancel
          </Button>
          <Button variant="outline" onClick={proceedBackWithoutSave}>Don't Save</Button>
          <Button onClick={saveAndProceedBack} disabled={!hasUnsavedChanges}>Save & Leave</Button>
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
                <p className="text-sm font-medium text-slate-800">{school.schoolName}</p>
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

      <div className="absolute bottom-14 right-3 z-20">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowShortcuts((prev) => !prev)}
            className="w-10 h-10 rounded-full bg-slate-800 text-white shadow-md hover:bg-slate-700 flex items-center justify-center"
            data-tooltip="Shortcuts"
          >
            <Info className="w-5 h-5" />
          </button>

          {showShortcuts && (
            <div className="absolute bottom-12 right-0 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-3">
              <p className="text-xs font-semibold text-slate-700 mb-2">Keyboard Shortcuts</p>
              <div className="space-y-1.5 max-h-64 overflow-auto pr-2">
                {SHORTCUTS.map((shortcut) => (
                  <div key={shortcut.key} className="flex items-start justify-between gap-3 text-xs">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 whitespace-nowrap">{shortcut.key}</span>
                    <span className="text-slate-600 text-right">{shortcut.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardEditor;
