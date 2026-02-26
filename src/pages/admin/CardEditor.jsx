import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpLeft,
  ArrowUpRight,
  Circle,
  ClipboardPaste,
  Copy,
  Download,
  FileCode2,
  GripHorizontal,
  History,
  Image as ImageIcon,
  ImagePlus,
  Info,
  Layers,
  Lock,
  LockOpen,
  Menu,
  Pencil,
  Pipette,
  Plus,
  Redo2,
  Save,
  Search,
  SlidersHorizontal,
  Square,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import { Button, Card, LoadingSpinner, Modal, Select } from '../../components/common';
import {
  ALIGNMENT_ACTIONS,
  BLOCKS,
  DEFAULT_CARD_HEIGHT,
  DEFAULT_CARD_WIDTH,
  FONT_OPTIONS,
  INTERACTIVE_BUTTON_CLASS,
  MAX_ZOOM,
  MIN_ZOOM,
  SHORTCUTS,
} from './card-editor/constants';
import {
  asNumber,
  clamp,
  cloneHistoryState,
  escapeXml,
  fitDimensions,
  getImageAspectRatioFromUrl,
  getImageDimensionsFromDataUrl,
  getSvgDimensionsFromMarkup,
  isPaddingLayout,
  measureTextWidth,
  readFileAsDataUrl,
  snapshotsEqual,
  toSafeHexColor,
} from './card-editor/utils';
import EditorModals from './card-editor/components/EditorModals';

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
  const [canvasColor, setCanvasColor] = useState('#ffffff');
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
  const [switchingSchoolId, setSwitchingSchoolId] = useState(null);
  const [studentPhotoRatio, setStudentPhotoRatio] = useState(1);
  const [schoolLogoRatio, setSchoolLogoRatio] = useState(1);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingBack, setPendingBack] = useState(false);
  const [showCanvasHistory, setShowCanvasHistory] = useState(false);
  const [sizeDraft, setSizeDraft] = useState({ width: '', height: '' });
  const [sizeEditingAxis, setSizeEditingAxis] = useState(null);
  const [baselineSignature, setBaselineSignature] = useState('');
  const [clipboard, setClipboard] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [cursorInfo, setCursorInfo] = useState({ inside: false, x: 0, y: 0 });
  const [historyPast, setHistoryPast] = useState([]);
  const [historyFuture, setHistoryFuture] = useState([]);
  const [dragOverLayerId, setDragOverLayerId] = useState(null);
  const [inlineTextEditingId, setInlineTextEditingId] = useState(null);
  const [inlineTextDraft, setInlineTextDraft] = useState('');
  const [selectionBox, setSelectionBox] = useState(null);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddMode, setQuickAddMode] = useState('add');
  const [quickAddSearch, setQuickAddSearch] = useState('');
  const [quickAddReplaceTargetId, setQuickAddReplaceTargetId] = useState(null);
  const [quickAddBodyHeight, setQuickAddBodyHeight] = useState(null);
  const [pendingImageReplaceTargetId, setPendingImageReplaceTargetId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [showCornerRadiusPopover, setShowCornerRadiusPopover] = useState(false);
  const [spacingDraft, setSpacingDraft] = useState({ horizontal: '', vertical: '' });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isCanvasPointerInside, setIsCanvasPointerInside] = useState(false);
  const [isPanningCanvas, setIsPanningCanvas] = useState(false);
  const cardRef = useRef(null);
  const canvasViewportRef = useRef(null);
  const svgFileInputRef = useRef(null);
  const imageFileInputRef = useRef(null);
  const historySnapshotRef = useRef(null);
  const lastCommittedSnapshotRef = useRef(null);
  const historyDebounceTimerRef = useRef(null);
  const isHistoryApplyingRef = useRef(false);
  const layerDragRef = useRef(null);
  const layerNameInputRef = useRef(null);
  const groupNameInputRef = useRef(null);
  const inlineTextInputRef = useRef(null);
  const quickAddSearchInputRef = useRef(null);
  const quickAddBodyInnerRef = useRef(null);
  const suppressCanvasClickRef = useRef(false);
  const isSpacePressedRef = useRef(false);
  const isCanvasPointerInsideRef = useRef(false);
  const panStateRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const cornerRadiusPopoverRef = useRef(null);
  const shortcutsPopoverRef = useRef(null);
  const canvasHistoryPopoverRef = useRef(null);

  const makeSignature = (state = {}) =>
    JSON.stringify({
      name: state.templateName ?? templateName,
      width: state.canvasWidth ?? canvasWidth,
      height: state.canvasHeight ?? canvasHeight,
      radius: state.canvasRadius ?? canvasRadius,
      borderWidth: state.canvasBorderWidth ?? canvasBorderWidth,
      borderColor: state.canvasBorderColor ?? canvasBorderColor,
      color: state.canvasColor ?? canvasColor,
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
    canvasColor: override.canvasColor ?? canvasColor,
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
    setCanvasColor(snapshot.canvasColor || '#ffffff');
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
      if (isSpacePressedRef.current && isCanvasPointerInsideRef.current) {
        event.preventDefault();
        return;
      }

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
    const onKeyDown = (event) => {
      if (event.code !== 'Space') return;
      if (event.ctrlKey || event.metaKey) return;
      if (event.repeat) {
        event.preventDefault();
        return;
      }
      isSpacePressedRef.current = true;
      setIsSpacePressed(true);
      if (isCanvasPointerInsideRef.current) event.preventDefault();
    };
    const onKeyUp = (event) => {
      if (event.code !== 'Space') return;
      isSpacePressedRef.current = false;
      setIsSpacePressed(false);
      setIsPanningCanvas(false);
      panStateRef.current = null;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!isPanningCanvas) return;
    const onMouseMove = (event) => {
      const viewport = canvasViewportRef.current;
      const pan = panStateRef.current;
      if (!viewport || !pan) return;
      const dx = event.clientX - pan.startClientX;
      const dy = event.clientY - pan.startClientY;
      viewport.scrollLeft = pan.startScrollLeft - dx;
      viewport.scrollTop = pan.startScrollTop - dy;
    };
    const onMouseUp = () => {
      setIsPanningCanvas(false);
      panStateRef.current = null;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isPanningCanvas]);

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
        const nextColor = templateData.canvasColor || '#ffffff';
        const nextSvg = templateData.baseSvgMarkup || '';
        const nextElements = Array.isArray(templateData.elements)
          ? templateData.elements.map((item) => ({
            ...item,
            textLayout: item.kind === 'text' ? (item.textLayout === 'fixed' ? 'fixed' : 'dynamic') : item.textLayout,
            locked: Boolean(item.locked),
            fontStyle: item.fontStyle || 'normal',
            textDecoration: item.textDecoration || 'none',
            prefixColor: item.prefixColor || item.color || '#0f172a',
            prefixFontWeight: item.prefixFontWeight || item.fontWeight || 600,
            prefixFontStyle: item.prefixFontStyle || 'normal',
            prefixTextDecoration: item.prefixTextDecoration || 'none',
            borderRadiusTopLeft: Number.isFinite(Number(item.borderRadiusTopLeft)) ? Math.max(0, Number(item.borderRadiusTopLeft)) : Math.max(0, Number(item.borderRadius) || 0),
            borderRadiusTopRight: Number.isFinite(Number(item.borderRadiusTopRight)) ? Math.max(0, Number(item.borderRadiusTopRight)) : Math.max(0, Number(item.borderRadius) || 0),
            borderRadiusBottomRight: Number.isFinite(Number(item.borderRadiusBottomRight)) ? Math.max(0, Number(item.borderRadiusBottomRight)) : Math.max(0, Number(item.borderRadius) || 0),
            borderRadiusBottomLeft: Number.isFinite(Number(item.borderRadiusBottomLeft)) ? Math.max(0, Number(item.borderRadiusBottomLeft)) : Math.max(0, Number(item.borderRadius) || 0)
          }))
          : [];
        const nextGroups = templateData.groups && typeof templateData.groups === 'object' ? templateData.groups : {};

        setTemplateName(nextName);
        setCanvasWidth(nextWidth);
        setCanvasHeight(nextHeight);
        setCanvasRadius(nextRadius);
        setCanvasBorderWidth(nextBorderWidth);
        setCanvasBorderColor(nextBorderColor);
        setCanvasColor(nextColor);
        setSvgMarkup(nextSvg);
        setElements(nextElements);
        setGroups(nextGroups);
        const nextHistorySnapshot = {
          canvasWidth: nextWidth,
          canvasHeight: nextHeight,
          canvasRadius: nextRadius,
          canvasBorderWidth: nextBorderWidth,
          canvasBorderColor: nextBorderColor,
          canvasColor: nextColor,
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
            color: nextColor,
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

  const saveTemplate = async ({ silent = false } = {}) => {
    if (!templateId) {
      if (!silent) toast.error('Template id is missing');
      return;
    }
    if (!hasUnsavedChanges) return;
    if (!templateName.trim()) {
      if (!silent) toast.error('Template name cannot be empty');
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
        canvasColor,
        baseSvgMarkup: svgMarkup || '',
        elements,
        groups
      });
      setTemplateName(data.data?.name || templateName.trim());
      setBaselineSignature(makeSignature({ templateName: data.data?.name || templateName.trim() }));
      if (!silent) toast.success('Template saved');
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
    setSwitchingSchoolId(nextTenantId);
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
        canvasColor,
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
      setSwitchingSchoolId(null);
    }
  };

  useEffect(() => {
    let active = true;
    const loadRatio = async () => {
      const ratio = await getImageAspectRatioFromUrl(lastStudent?.studentPhoto);
      if (!active) return;
      setStudentPhotoRatio(ratio && Number.isFinite(ratio) && ratio > 0 ? ratio : 1);
    };
    loadRatio();
    return () => {
      active = false;
    };
  }, [lastStudent?.studentPhoto]);

  useEffect(() => {
    let active = true;
    const loadRatio = async () => {
      const ratio = await getImageAspectRatioFromUrl(tenant?.schoolLogo);
      if (!active) return;
      setSchoolLogoRatio(ratio && Number.isFinite(ratio) && ratio > 0 ? ratio : 1);
    };
    loadRatio();
    return () => {
      active = false;
    };
  }, [tenant?.schoolLogo]);

  useEffect(() => {
    const nextPhotoRatio = studentPhotoRatio > 0 ? studentPhotoRatio : 1;
    const nextLogoRatio = schoolLogoRatio > 0 ? schoolLogoRatio : 1;
    setElements((prev) =>
      prev.map((item) => {
        if (item.kind !== 'photo' && item.kind !== 'logo') return item;
        const targetRatio = item.kind === 'photo' ? nextPhotoRatio : nextLogoRatio;
        const currentRatio = Number(item.aspectRatio) > 0 ? Number(item.aspectRatio) : null;
        if (currentRatio && Math.abs(currentRatio - targetRatio) < 0.001) return item;
        return {
          ...item,
          aspectRatio: targetRatio,
          height: Math.max(20, Math.round(Math.max(20, item.width || 20) / targetRatio))
        };
      })
    );
  }, [studentPhotoRatio, schoolLogoRatio]);

  const selectedElement = selectedIds.length === 1
    ? elements.find((item) => item.id === selectedIds[0]) || null
    : null;
  const replaceTargetElement = useMemo(() => {
    if (quickAddMode !== 'replace' || !quickAddReplaceTargetId) return null;
    return elements.find((item) => item.id === quickAddReplaceTargetId) || null;
  }, [quickAddMode, quickAddReplaceTargetId, elements]);
  const quickAddBlocks = useMemo(() => {
    if (quickAddMode === 'replace' && replaceTargetElement) {
      return getReplacementBlocksForElement(replaceTargetElement);
    }
    return BLOCKS;
  }, [quickAddMode, replaceTargetElement]);
  const filteredQuickAddBlocks = useMemo(() => {
    const query = quickAddSearch.trim().toLowerCase();
    if (!query) return quickAddBlocks;
    return quickAddBlocks.filter((block) => {
      const label = String(block.label || '').toLowerCase();
      const type = String(block.type || '').toLowerCase();
      return label.includes(query) || type.includes(query);
    });
  }, [quickAddBlocks, quickAddSearch]);
  const quickAddSections = useMemo(() => {
    const sections = [
      { key: 'school', label: 'School' },
      { key: 'student', label: 'Student' },
      { key: 'custom', label: 'Custom' }
    ];
    return sections
      .map((section) => ({
        ...section,
        blocks: filteredQuickAddBlocks.filter((block) => getQuickBlockCategory(block) === section.key)
      }))
      .filter((section) => section.blocks.length > 0);
  }, [filteredQuickAddBlocks]);
  const selectedGroupFromSingle = selectedElement?.groupId ? groups[selectedElement.groupId] : null;
  const hasUnsavedChanges = useMemo(
    () => makeSignature() !== baselineSignature,
    [templateName, canvasWidth, canvasHeight, canvasRadius, canvasBorderWidth, canvasBorderColor, canvasColor, svgMarkup, elements, groups, baselineSignature]
  );

  useEffect(() => {
    if (!selectedElement) {
      setSizeDraft({ width: '', height: '' });
      setSizeEditingAxis(null);
      return;
    }
    if (sizeEditingAxis) return;
    setSizeDraft({
      width: String(selectedElement.width ?? ''),
      height: String(selectedElement.height ?? '')
    });
  }, [selectedElement?.id, selectedElement?.width, selectedElement?.height, sizeEditingAxis]);
  const editorHistorySignature = useMemo(
    () =>
      JSON.stringify({
        canvasWidth,
        canvasHeight,
        canvasRadius,
        canvasBorderWidth,
        canvasBorderColor,
        canvasColor,
        svgMarkup,
        elements,
        groups
      }),
    [canvasWidth, canvasHeight, canvasRadius, canvasBorderWidth, canvasBorderColor, canvasColor, svgMarkup, elements, groups]
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

  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    if (!templateId || loading || saving || !hasUnsavedChanges) return undefined;
    autosaveTimerRef.current = setTimeout(() => {
      saveTemplate({ silent: true });
      autosaveTimerRef.current = null;
    }, 1200);
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [templateId, loading, saving, hasUnsavedChanges, editorHistorySignature, templateName]);

  const studentName = lastStudent ? `${lastStudent.firstName} ${lastStudent.lastName}`.trim() : 'No Student';
  const studentInitials = studentName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'ST';
  const formatClassValue = (name = '', section = '') => {
    const normalizedName = String(name || '').replace(/^\s*class\s*/i, '').trim();
    const normalizedSection = String(section || '').trim();
    if (normalizedName && normalizedSection) return `${normalizedName}-${normalizedSection}`;
    if (normalizedName) return normalizedName;
    if (normalizedSection) return normalizedSection;
    return 'N/A';
  };
  const classLabel = lastStudent?.classId
    ? formatClassValue(lastStudent.classId.name, lastStudent.classId.section)
    : 'N/A';

  const defaultValues = {
    school_name: tenant?.schoolName || 'School Name',
    student_name: studentName,
    father_name: lastStudent?.guardian || 'N/A',
    roll_no: lastStudent?.rollNo || 'N/A',
    class_name: classLabel
  };

  const getTextParts = (element, valuesMap = defaultValues) => {
    const base = element.type === 'text' ? (element.text || '') : (valuesMap[element.type] || element.text || '');
    const prefix = element.prefix || '';
    return { prefix, base };
  };

  const syncSourceText = (element) => {
    const { prefix, base } = getTextParts(element);
    return `${prefix}${base}`;
  };

  const getDimensions = (element) => {
    if (element.kind !== 'text' || !isPaddingLayout(element.textLayout)) {
      return { width: element.width, height: element.height };
    }
    const { prefix, base } = getTextParts(element);
    const prefixWidth = prefix
      ? measureTextWidth(prefix, element.fontSize, element.prefixFontWeight || element.fontWeight, element.fontFamily)
      : 0;
    const baseWidth = measureTextWidth(base, element.fontSize, element.fontWeight, element.fontFamily);
    const measured = prefixWidth + baseWidth;
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
      const baseTop = element.y;
      const entry = { element, ...dims, top: element.y, baseLeft, left: baseLeft, groupDelta: 0 };
      entry.top = baseTop;
      byId[element.id] = entry;

      let currentGroupId = element.groupId;
      while (currentGroupId && groups[currentGroupId]) {
        const group = groups[currentGroupId];
        const offsetX = group.x || 0;
        const offsetY = group.y || 0;
        entry.top += offsetY;
        entry.left += offsetX;
        if (!groupItems[currentGroupId]) groupItems[currentGroupId] = [];
        groupItems[currentGroupId].push(entry);
        currentGroupId = group.parentGroupId;
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

  const collectGroupTreeIds = (groupIds = [], sourceGroups = groups, visited = new Set()) => {
    const result = [];
    groupIds.forEach((groupId) => {
      if (!sourceGroups[groupId] || visited.has(groupId)) return;
      visited.add(groupId);
      result.push(groupId);
      const group = sourceGroups[groupId];
      if (group.childGroupIds?.length) {
        result.push(...collectGroupTreeIds(group.childGroupIds, sourceGroups, visited));
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
  const isLayersEmptyContext = contextMenu?.kind === 'layers-empty';
  const canContextReplace =
    selectedIds.length === 1 &&
    selectedGroupIds.length === 0 &&
    getReplacementBlocksForElement(selectedElement).length > 0;
  const canContextGroup = selectedCount >= 2;
  const canContextUngroup =
    selectedGroupIds.length > 0 ||
    (selectedIds.length === 1 && selectedElement?.groupId);
  const canContextRename = selectedIds.length === 1 || selectedGroupIds.length === 1;
  const canContextDelete = selectedCount > 0;
  const canContextDuplicate = selectedCount > 0;
  const selectedLabels = useMemo(() => {
    const groupNames = selectedGroupIds.map((id) => groups[id]?.name || 'Group');
    const layerNames = selectedIds
      .map((id) => elements.find((el) => el.id === id)?.layerName)
      .filter(Boolean);
    return [...groupNames, ...layerNames];
  }, [selectedGroupIds, selectedIds, groups, elements]);
  useEffect(() => {
    if (selectedCount < 2) {
      setSpacingDraft({ horizontal: '', vertical: '' });
      return;
    }
    setSpacingDraft({
      horizontal: getSelectionSpacing('horizontal'),
      vertical: getSelectionSpacing('vertical')
    });
  }, [selectedCount, selectedIds, selectedGroupIds, elements, groups, renderModel, canvasWidth]);
  useEffect(() => {
    setShowCornerRadiusPopover(false);
  }, [selectedElement?.id]);
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

      if (dragState.movingGroupIds?.length) {
        setGroups((prev) => {
          const next = { ...prev };
          dragState.movingGroupIds.forEach((groupId) => {
            const origin = dragState.groupOrigins?.[groupId];
            if (!origin || !next[groupId]) return;
            next[groupId] = {
              ...next[groupId],
              x: origin.x + dx,
              y: origin.y + dy
            };
          });
          return next;
        });
      }

      setElements((prev) =>
        prev.map((element) => {
          if (!dragState.movingIds.includes(element.id)) return element;
          const origin = dragState.origins[element.id];
          if (!origin) return element;

          const isShape = element.kind === 'rectangle' || element.kind === 'panel';
          const maxX = canvasWidth - Math.max(20, origin.width);
          const maxY = canvasHeight - Math.max(20, origin.height);
          const nextX = isShape ? origin.x + dx : clamp(origin.x + dx, 0, maxX);
          const nextY = isShape ? origin.y + dy : clamp(origin.y + dy, 0, maxY);
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
    if (!selectionBox?.active) return;

    const onMouseMove = (event) => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const currentX = (event.clientX - rect.left) / zoom;
      const currentY = (event.clientY - rect.top) / zoom;
      setSelectionBox((prev) => (prev ? { ...prev, currentX, currentY } : prev));
    };

    const onMouseUp = () => {
      setSelectionBox((prev) => {
        if (!prev) return null;
        const minX = Math.min(prev.startX, prev.currentX);
        const maxX = Math.max(prev.startX, prev.currentX);
        const minY = Math.min(prev.startY, prev.currentY);
        const maxY = Math.max(prev.startY, prev.currentY);
        const width = maxX - minX;
        const height = maxY - minY;

        const fullyContains = (box) =>
          box &&
          box.left >= minX &&
          box.top >= minY &&
          box.left + box.width <= maxX &&
          box.top + box.height <= maxY;

        const candidateGroupIds = expandedGroupId
          ? Object.values(groups)
            .filter((group) => group.parentGroupId === expandedGroupId)
            .map((group) => group.id)
          : Object.values(groups)
            .filter((group) => !group.parentGroupId)
            .map((group) => group.id);

        const nextGroupIds = candidateGroupIds.filter((groupId) => {
          const memberIds = collectMemberIdsFromGroups([groupId], groups);
          const memberBoxes = memberIds.map((id) => renderModel.byId[id]).filter(Boolean);
          if (memberBoxes.length === 0) return false;
          const left = Math.min(...memberBoxes.map((b) => b.left));
          const top = Math.min(...memberBoxes.map((b) => b.top));
          const right = Math.max(...memberBoxes.map((b) => b.left + b.width));
          const bottom = Math.max(...memberBoxes.map((b) => b.top + b.height));
          return fullyContains({ left, top, width: right - left, height: bottom - top });
        });

        const candidateElements = expandedGroupId
          ? elements.filter((item) => item.groupId === expandedGroupId)
          : elements.filter((item) => !item.groupId || !groups[item.groupId]);

        const nextElementIds = candidateElements
          .filter((item) => fullyContains(renderModel.byId[item.id]))
          .map((item) => item.id);

        if (width < 2 && height < 2) {
          if (!prev.additive) clearSelection();
          suppressCanvasClickRef.current = true;
          return null;
        }

        if (prev.additive) {
          setSelectedIds((current) => [...new Set([...current, ...nextElementIds])]);
          setSelectedGroupIds((current) => [...new Set([...current, ...nextGroupIds])]);
        } else {
          setSelectedIds(nextElementIds);
          setSelectedGroupIds(nextGroupIds);
        }
        suppressCanvasClickRef.current = true;
        return null;
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [selectionBox?.active, zoom, elements, groups, expandedGroupId, renderModel, selectedIds, selectedGroupIds]);

  useEffect(() => {
    if (!showQuickAddModal) return;
    const timer = setTimeout(() => {
      quickAddSearchInputRef.current?.focus();
      quickAddSearchInputRef.current?.select?.();
    }, 0);
    return () => clearTimeout(timer);
  }, [showQuickAddModal]);

  useEffect(() => {
    if (!showQuickAddModal || !quickAddBodyInnerRef.current) return;
    const target = quickAddBodyInnerRef.current;
    const measure = () => setQuickAddBodyHeight(Math.ceil(target.scrollHeight));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(target);
    return () => observer.disconnect();
  }, [showQuickAddModal, quickAddMode, quickAddSearch, quickAddSections.length, replaceTargetElement?.id]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const isMod = event.ctrlKey || event.metaKey;
      if (isMod && event.code === 'Space') {
        if (showStudentModal || showSchoolModal || showUnsavedModal || showExportModal || showStudentDetailsModal) return;
        event.preventDefault();
        if (showQuickAddModal) {
          setShowQuickAddModal(false);
          setQuickAddMode('add');
          setQuickAddSearch('');
          setQuickAddReplaceTargetId(null);
          setQuickAddBodyHeight(null);
        } else {
          setQuickAddMode('add');
          setQuickAddReplaceTargetId(null);
          setQuickAddSearch('');
          setShowQuickAddModal(true);
        }
        return;
      }
      if (showStudentModal || showSchoolModal || showUnsavedModal || showExportModal || showStudentDetailsModal || showQuickAddModal) return;
      if (isSpacePressedRef.current && isCanvasPointerInsideRef.current) {
        event.preventDefault();
        return;
      }
      const key = event.key.toLowerCase();
      const tag = event.target?.tagName?.toLowerCase();
      const isTypingContext = tag === 'input' || tag === 'textarea' || tag === 'select' || event.target?.isContentEditable;

      if (event.key === 'F2') {
        event.preventDefault();
        if (selectedIds.length === 1) {
          layerNameInputRef.current?.focus();
          layerNameInputRef.current?.select?.();
          return;
        }
        if (selectedGroupIds.length === 1 && selectedIds.length === 0) {
          groupNameInputRef.current?.focus();
          groupNameInputRef.current?.select?.();
        }
        return;
      }

      if (isMod && key === 'g') {
        event.preventDefault();
        if (event.shiftKey) {
          ungroupSelectedElement();
        } else {
          groupSelectedLayers();
        }
        return;
      }

      if (isMod && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redoHistory();
        } else {
          undoHistory();
        }
        return;
      }

      if (isMod && key === 's') {
        event.preventDefault();
        saveTemplate();
        return;
      }

      if (!isTypingContext && isMod && key === 'c') {
        event.preventDefault();
        copySelection();
        return;
      }

      if (!isTypingContext && isMod && key === 'v') {
        event.preventDefault();
        pasteClipboard();
        return;
      }

      if (isMod && key === 'd') {
        event.preventDefault();
        duplicateSelection();
        return;
      }

      if (isMod && key === 'e') {
        event.preventDefault();
        setShowExportModal(true);
        setExportClassSearch('');
        setActiveExportClassId(null);
        if (exportClasses.length === 0 || exportStudents.length === 0) {
          loadExportData();
        }
        return;
      }

      if (isTypingContext) return;

      if (event.key.startsWith('Arrow')) {
        event.preventDefault();
        const step = event.shiftKey ? 10 : 1;
        if (event.key === 'ArrowUp') nudgeSelection(0, -step);
        if (event.key === 'ArrowDown') nudgeSelection(0, step);
        if (event.key === 'ArrowLeft') nudgeSelection(-step, 0);
        if (event.key === 'ArrowRight') nudgeSelection(step, 0);
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
  }, [selectedIds, selectedGroupIds, groups, expandedGroupId, selectedElement, saveTemplate, showStudentModal, showSchoolModal, showUnsavedModal, showExportModal, showStudentDetailsModal, showQuickAddModal, clipboard, elements, selectedMemberIds, exportClasses.length, exportStudents.length, historyPast.length, historyFuture.length, canvasWidth, canvasHeight]);

  useEffect(() => {
    if (!contextMenu) return undefined;
    const closeMenu = () => setContextMenu(null);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeMenu();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [contextMenu]);

  useEffect(() => {
    if (!showCornerRadiusPopover) return undefined;
    const onMouseDown = (event) => {
      if (cornerRadiusPopoverRef.current?.contains(event.target)) return;
      setShowCornerRadiusPopover(false);
    };
    const onScroll = () => setShowCornerRadiusPopover(false);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [showCornerRadiusPopover]);

  useEffect(() => {
    if (!showShortcuts && !showCanvasHistory) return undefined;
    const onMouseDown = (event) => {
      if (showShortcuts && shortcutsPopoverRef.current && !shortcutsPopoverRef.current.contains(event.target)) {
        setShowShortcuts(false);
      }
      if (showCanvasHistory && canvasHistoryPopoverRef.current && !canvasHistoryPopoverRef.current.contains(event.target)) {
        setShowCanvasHistory(false);
      }
    };
    const onScroll = () => {
      if (showShortcuts) setShowShortcuts(false);
      if (showCanvasHistory) setShowCanvasHistory(false);
    };
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [showShortcuts, showCanvasHistory]);

  useEffect(() => {
    setShowShortcuts(false);
    setShowCanvasHistory(false);
    setContextMenu(null);
    setShowCornerRadiusPopover(false);
  }, [zoom]);

  const createElement = (block, overrides = {}) => {
    const scale = Math.min(canvasWidth / DEFAULT_CARD_WIDTH, canvasHeight / DEFAULT_CARD_HEIGHT);
    const blockWidth = Math.max(20, Math.round((block.width || 80) * scale));
    let blockHeight = Math.max(20, Math.round((block.height || 40) * scale));
    const effectiveAspectRatio =
      overrides.aspectRatio && Number(overrides.aspectRatio) > 0
        ? Number(overrides.aspectRatio)
        : block.kind === 'photo'
          ? studentPhotoRatio
          : block.kind === 'logo'
            ? schoolLogoRatio
            : undefined;
    if (effectiveAspectRatio && ['photo', 'logo', 'image'].includes(block.kind)) {
      blockHeight = Math.max(20, Math.round(blockWidth / effectiveAspectRatio));
    }
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
      prefix: '',
      color: '#0f172a',
      prefixColor: '#0f172a',
      fontSize: 14,
      fontWeight: 600,
      fontStyle: 'normal',
      textDecoration: 'none',
      prefixFontWeight: 600,
      prefixFontStyle: 'normal',
      prefixTextDecoration: 'none',
      fontFamily: 'Inter, sans-serif',
      showFill: false,
      fillColor: '#ffffff',
      showBorder: false,
      borderColor: '#0f172a',
      borderWidth: 1,
      borderRadiusTopLeft: 8,
      borderRadiusTopRight: 8,
      borderRadiusBottomRight: 8,
      borderRadiusBottomLeft: 8,
      locked: false,
      aspectRatio:
        ['photo', 'logo', 'image'].includes(block.kind) && blockHeight > 0
          ? effectiveAspectRatio || (blockWidth / blockHeight)
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

    const element = createElement(
      block,
      block.kind === 'rectangle'
        ? {
          showBorder: true,
          borderColor: '#000000',
          borderWidth: 1
        }
        : {}
    );
    setElements((prev) => [...prev, element]);
    setSelectedIds([element.id]);
    setSelectedGroupIds([]);
  };

  const replaceElementWithBlock = (targetElementId, block) => {
    const target = elements.find((item) => item.id === targetElementId);
    if (!target) return;
    const targetKind = getReplacementKind(target);
    const nextKind = block.kind === 'text' ? 'text' : (['photo', 'logo', 'image_importer'].includes(block.kind) ? 'image' : null);
    if (!targetKind || targetKind !== nextKind) return;

    if (block.kind === 'image_importer') {
      setPendingImageReplaceTargetId(targetElementId);
      imageFileInputRef.current?.click();
      return;
    }

    // Keep all existing styling/transform/content properties, only swap source identity.
    setElements((prev) =>
      prev.map((item) =>
        item.id === target.id
          ? {
            ...item,
            type: block.type,
            kind: block.kind,
            label: block.label
          }
          : item
      )
    );
    setSelectedIds([target.id]);
    setSelectedGroupIds([]);
  };

  const addBlockByType = (type) => {
    const block = BLOCKS.find((item) => item.type === type);
    if (!block) return;
    addBlock(block);
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
        borderRadiusTopLeft: 0,
        borderRadiusTopRight: 0,
        borderRadiusBottomRight: 0,
        borderRadiusBottomLeft: 0
      });

      setElements((prev) => [...prev, element]);
      setSelectedIds([element.id]);
      setSelectedGroupIds([]);
    } catch (error) {
      toast.error('Failed to import SVG');
    }
  };

  const importImageFile = async (file, replacementTargetId = null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const dims = await getImageDimensionsFromDataUrl(dataUrl);
      if (replacementTargetId) {
        setElements((prev) =>
          prev.map((item) => {
            if (item.id !== replacementTargetId) return item;
            const ratio = dims.width > 0 && dims.height > 0 ? dims.width / dims.height : (item.aspectRatio || 1);
            return {
              ...item,
              type: 'imported_image',
              kind: 'image',
              label: 'Imported Image',
              imageSrc: dataUrl,
              aspectRatio: ratio || 1
            };
          })
        );
        setSelectedIds([replacementTargetId]);
        setSelectedGroupIds([]);
      } else {
        const fitted = fitDimensions(dims.width, dims.height, canvasWidth, canvasHeight);
        const name = file.name || 'Imported Image';
        const block = { type: 'imported_image', label: 'Imported Image', kind: 'image', width: fitted.width, height: fitted.height };
      const element = createElement(block, {
        layerName: name,
        imageSrc: dataUrl,
        aspectRatio: fitted.ratio,
        showFill: false,
        showBorder: false,
        borderRadiusTopLeft: 0,
        borderRadiusTopRight: 0,
        borderRadiusBottomRight: 0,
        borderRadiusBottomLeft: 0
      });
        setElements((prev) => [...prev, element]);
        setSelectedIds([element.id]);
        setSelectedGroupIds([]);
      }
    } catch (error) {
      toast.error('Failed to import image');
    }
  };

  const startDrag = (event, element) => {
    event.preventDefault();
    if (!cardRef.current) return;
    if (!element.groupId && element.locked) return;
    if (expandedGroupId && (!element.groupId || !isGroupDescendantOf(element.groupId, expandedGroupId))) {
      clearSelection();
      return;
    }
    const rect = cardRef.current.getBoundingClientRect();
    const pointerX = (event.clientX - rect.left) / zoom;
    const pointerY = (event.clientY - rect.top) / zoom;
    const contextGroupId = getGroupForCanvasContext(element.groupId);
    if (!expandedGroupId && contextGroupId && groups[contextGroupId]?.locked) return;

    const isMulti = event.ctrlKey || event.metaKey || event.shiftKey;
    let activeSelectedIds = selectedIds;
    let activeSelectedGroupIds = selectedGroupIds;

    if (expandedGroupId) {
      if (contextGroupId && contextGroupId !== expandedGroupId) {
        if (!isMulti && !selectedGroupIds.includes(contextGroupId)) {
          activeSelectedIds = [];
          activeSelectedGroupIds = [contextGroupId];
          setSelectedIds([]);
          setSelectedGroupIds([contextGroupId]);
        }
      } else if (!isMulti && !selectedIds.includes(element.id)) {
        activeSelectedIds = [element.id];
        activeSelectedGroupIds = [];
        setSelectedIds([element.id]);
        setSelectedGroupIds([]);
      }
    } else if (contextGroupId && groups[contextGroupId]) {
      if (!isMulti && !selectedGroupIds.includes(contextGroupId)) {
        activeSelectedIds = [];
        activeSelectedGroupIds = [contextGroupId];
        setSelectedIds([]);
        setSelectedGroupIds([contextGroupId]);
      }
    } else if (!isMulti && (!selectedIds.includes(element.id) || selectedGroupIds.length > 0)) {
      activeSelectedIds = [element.id];
      activeSelectedGroupIds = [];
      setSelectedIds([element.id]);
      setSelectedGroupIds([]);
    }

    const inGroupSelectedIds = expandedGroupId
      ? activeSelectedIds.filter((id) => {
        const item = elements.find((entry) => entry.id === id);
        return item?.groupId && isGroupDescendantOf(item.groupId, expandedGroupId);
      })
      : activeSelectedIds;

    const shouldMoveSelection =
      expandedGroupId
        ? inGroupSelectedIds.includes(element.id) && inGroupSelectedIds.length > 1
        : activeSelectedIds.includes(element.id) && (activeSelectedIds.length > 1 || activeSelectedGroupIds.length > 0);
    let movingGroupIds = [];
    let movingIds = [];

    if (expandedGroupId) {
      if (contextGroupId && contextGroupId !== expandedGroupId && groups[contextGroupId]) {
        movingGroupIds = activeSelectedGroupIds.includes(contextGroupId)
          ? [...new Set(activeSelectedGroupIds.filter((id) => id === contextGroupId || isGroupDescendantOf(id, expandedGroupId)))]
          : [contextGroupId];
        movingIds = shouldMoveSelection ? [...new Set(inGroupSelectedIds)] : [];
      } else {
        movingIds = shouldMoveSelection ? [...new Set(inGroupSelectedIds)] : [element.id];
      }
    } else {
      if (contextGroupId && groups[contextGroupId]) {
        if (activeSelectedGroupIds.includes(contextGroupId)) {
          movingGroupIds = [...new Set(activeSelectedGroupIds)];
          movingIds = [...new Set(activeSelectedIds)];
        } else if (shouldMoveSelection) {
          movingGroupIds = [...new Set(activeSelectedGroupIds)];
          movingIds = [...new Set(activeSelectedIds)];
        } else {
          movingGroupIds = [contextGroupId];
          movingIds = [];
        }
      } else {
        movingGroupIds = [...new Set(activeSelectedGroupIds)];
        movingIds = shouldMoveSelection ? [...new Set(activeSelectedIds)] : [element.id];
      }
    }

    // Prevent children from moving directly when parent groups are moved.
    const movingGroupSet = new Set(movingGroupIds);
    movingIds = movingIds.filter((id) => {
      const item = elements.find((entry) => entry.id === id);
      if (!item?.groupId) return true;
      for (const groupId of movingGroupSet) {
        if (item.groupId === groupId || isGroupDescendantOf(item.groupId, groupId)) return false;
      }
      return true;
    });

    const origins = {};
    movingIds.forEach((id) => {
      const item = elements.find((entry) => entry.id === id);
      if (!item) return;
      const dims = getDimensions(item);
      origins[id] = { x: item.x, y: item.y, width: dims.width, height: dims.height };
    });
    const groupOrigins = {};
    movingGroupIds.forEach((groupId) => {
      const group = groups[groupId];
      if (!group) return;
      groupOrigins[groupId] = { x: group.x || 0, y: group.y || 0 };
    });

    setDragState({
      startX: pointerX,
      startY: pointerY,
      movingIds,
      origins,
      movingGroupIds,
      groupOrigins
    });
  };

  const startSelectionPane = (event) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;
    setDragState(null);
    setSelectionBox({
      active: true,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
      additive: event.shiftKey || event.ctrlKey || event.metaKey
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

  const toggleGroupLock = (groupId) => {
    setGroups((prev) => {
      if (!prev[groupId] || prev[groupId].parentGroupId) return prev;
      return {
        ...prev,
        [groupId]: { ...prev[groupId], locked: !prev[groupId].locked }
      };
    });
    setSelectedIds([]);
    setSelectedGroupIds((prev) => prev.filter((id) => id !== groupId));
  };

  const reorderLayerZ = (draggedEntry, targetEntry, contextGroupId = null) => {
    if (!draggedEntry?.id || !targetEntry?.id) return;
    if (draggedEntry.id === targetEntry.id && draggedEntry.type === targetEntry.type) return;

    const scopedEntries = contextGroupId
      ? [
        ...((groups[contextGroupId]?.childGroupIds || [])
          .filter((id) => groups[id])
          .map((id) => ({ id, type: 'group' }))),
        ...elements
          .filter((item) => item.groupId === contextGroupId)
          .map((item) => ({ id: item.id, type: 'layer' }))
      ]
      : [
        ...Object.values(groups)
          .filter((group) => !group.parentGroupId)
          .map((group) => ({ id: group.id, type: 'group' })),
        ...elements
          .filter((item) => !item.groupId || !groups[item.groupId])
          .map((item) => ({ id: item.id, type: 'layer' }))
      ];

    const getEntryMemberIds = (entry) => {
      if (entry.type === 'layer') return [entry.id];
      return collectMemberIdsFromGroups([entry.id], groups);
    };

    const byElementIndex = Object.fromEntries(elements.map((item, index) => [item.id, index]));
    const orderedEntries = [...scopedEntries].sort((a, b) => {
      const aMax = Math.max(...getEntryMemberIds(a).map((id) => byElementIndex[id] ?? -1));
      const bMax = Math.max(...getEntryMemberIds(b).map((id) => byElementIndex[id] ?? -1));
      return aMax - bMax;
    });
    const uiOrder = [...orderedEntries].reverse();

    const from = uiOrder.findIndex((entry) => entry.id === draggedEntry.id && entry.type === draggedEntry.type);
    const to = uiOrder.findIndex((entry) => entry.id === targetEntry.id && entry.type === targetEntry.type);
    if (from === -1 || to === -1) return;

    const nextUiOrder = [...uiOrder];
    const [moved] = nextUiOrder.splice(from, 1);
    nextUiOrder.splice(to, 0, moved);
    const nextScopedEntries = [...nextUiOrder].reverse();
    const nextScopedOrder = nextScopedEntries.flatMap((entry) => getEntryMemberIds(entry));
    const orderSet = new Set(nextScopedOrder);

    setElements((prev) => {
      const byId = Object.fromEntries(prev.map((item) => [item.id, item]));
      const queue = nextScopedOrder.map((id) => byId[id]).filter(Boolean);
      return prev.map((item) => (orderSet.has(item.id) ? queue.shift() || item : item));
    });

    if (contextGroupId && groups[contextGroupId]) {
      const nextMemberIds = nextScopedEntries
        .filter((entry) => entry.type === 'layer')
        .map((entry) => entry.id);
      const nextChildGroupIds = nextScopedEntries
        .filter((entry) => entry.type === 'group')
        .map((entry) => entry.id);
      setGroups((prev) => ({
        ...prev,
        [contextGroupId]: {
          ...prev[contextGroupId],
          memberIds: nextMemberIds,
          childGroupIds: nextChildGroupIds
        }
      }));
    }
  };

  const onLayerDragStart = (entry, contextGroupId = null) => {
    layerDragRef.current = { ...entry, contextGroupId };
  };

  const onLayerDragOver = (event, targetEntry, contextGroupId = null) => {
    const payload = layerDragRef.current;
    if (!payload || payload.contextGroupId !== contextGroupId) return;
    if (payload.id === targetEntry.id && payload.type === targetEntry.type) return;
    event.preventDefault();
    setDragOverLayerId(targetEntry.id);
  };

  const onLayerDrop = (event, targetEntry, contextGroupId = null) => {
    event.preventDefault();
    const payload = layerDragRef.current;
    if (!payload || payload.contextGroupId !== contextGroupId) return;
    reorderLayerZ({ id: payload.id, type: payload.type }, targetEntry, contextGroupId);
    setDragOverLayerId(null);
    layerDragRef.current = null;
  };

  const onLayerDragEnd = () => {
    setDragOverLayerId(null);
    layerDragRef.current = null;
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectedGroupIds([]);
  };

  const openContextMenuAt = (event, kind = 'selection') => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, kind });
  };

  const openElementContextMenu = (event, elementId) => {
    if (!selectedIds.includes(elementId) || selectedIds.length !== 1 || selectedGroupIds.length > 0) {
      setSelectedIds([elementId]);
      setSelectedGroupIds([]);
    }
    openContextMenuAt(event);
  };

  const openGroupContextMenu = (event, groupId) => {
    if (!selectedGroupIds.includes(groupId) || selectedGroupIds.length !== 1 || selectedIds.length > 0) {
      setSelectedIds([]);
      setSelectedGroupIds([groupId]);
    }
    openContextMenuAt(event);
  };

  const openLayerPanelEmptyContextMenu = (event) => {
    openContextMenuAt(event, 'layers-empty');
  };

  const renameSelectionFromContextMenu = () => {
    setContextMenu(null);
    setTimeout(() => {
      if (selectedIds.length === 1) {
        layerNameInputRef.current?.focus();
        layerNameInputRef.current?.select?.();
        return;
      }
      if (selectedGroupIds.length === 1) {
        groupNameInputRef.current?.focus();
        groupNameInputRef.current?.select?.();
      }
    }, 0);
  };

  const openReplaceModalFromContextMenu = () => {
    const targetId = selectedIds.length === 1 && selectedGroupIds.length === 0 ? selectedIds[0] : null;
    if (!targetId) return;
    setQuickAddMode('replace');
    setQuickAddReplaceTargetId(targetId);
    setQuickAddSearch('');
    setShowQuickAddModal(true);
    setContextMenu(null);
  };

  const setZoomClamped = (next) => {
    setZoom(clamp(next, MIN_ZOOM, MAX_ZOOM));
  };

  const buildSelectionClipboardPayload = () => {
    const selectedGroupSet = new Set(selectedGroupIds.filter((id) => groups[id]));
    const rootGroupIds = [...selectedGroupSet].filter((groupId) => {
      let cursor = groups[groupId];
      while (cursor?.parentGroupId) {
        if (selectedGroupSet.has(cursor.parentGroupId)) return false;
        cursor = groups[cursor.parentGroupId];
      }
      return true;
    });

    const groupTreeIds = collectGroupTreeIds(rootGroupIds, groups);
    const groupedElementIds = collectMemberIdsFromGroups(rootGroupIds, groups);
    const groupedElementSet = new Set(groupedElementIds);
    const looseElementIds = selectedIds.filter((id) => !groupedElementSet.has(id));
    const allElementIds = [...new Set([...groupedElementIds, ...looseElementIds])];

    const payloadGroups = {};
    groupTreeIds.forEach((groupId) => {
      if (!groups[groupId]) return;
      payloadGroups[groupId] = { ...groups[groupId] };
    });

    const payloadElements = elements
      .filter((el) => allElementIds.includes(el.id))
      .map((el) => ({ ...el }));

    if (payloadElements.length === 0 && groupTreeIds.length === 0) return null;

    return {
      groups: payloadGroups,
      elements: payloadElements,
      rootGroupIds,
      looseElementIds
    };
  };

  const instantiateClipboardPayload = (payload, offset = 20) => {
    if (!payload) return null;
    const payloadGroups = payload.groups || {};
    const payloadElements = payload.elements || [];
    if (Object.keys(payloadGroups).length === 0 && payloadElements.length === 0) return null;

    const groupIdMap = {};
    Object.keys(payloadGroups).forEach((oldId, index) => {
      groupIdMap[oldId] = `group-${Date.now()}-${index}`;
    });

    const elementIdMap = {};
    payloadElements.forEach((item, index) => {
      elementIdMap[item.id] = `${item.type}-${Date.now()}-${index}`;
    });

    const createdGroups = {};
    Object.entries(payloadGroups).forEach(([oldId, group]) => {
      const parentMapped = group.parentGroupId && groupIdMap[group.parentGroupId]
        ? groupIdMap[group.parentGroupId]
        : null;
      const topLevelInPastedTree = !parentMapped;
      createdGroups[groupIdMap[oldId]] = {
        ...group,
        id: groupIdMap[oldId],
        parentGroupId: parentMapped,
        x: (group.x || 0) + (topLevelInPastedTree ? offset : 0),
        y: (group.y || 0) + (topLevelInPastedTree ? offset : 0),
        childGroupIds: (group.childGroupIds || [])
          .filter((childId) => groupIdMap[childId])
          .map((childId) => groupIdMap[childId]),
        memberIds: (group.memberIds || [])
          .filter((memberId) => elementIdMap[memberId])
          .map((memberId) => elementIdMap[memberId])
      };
    });

    const createdElements = payloadElements.map((item) => {
      const mappedGroupId = item.groupId && groupIdMap[item.groupId] ? groupIdMap[item.groupId] : null;
      const shouldOffset = !mappedGroupId;
      return {
        ...item,
        id: elementIdMap[item.id],
        x: shouldOffset
          ? clamp((item.x || 0) + offset, 0, Math.max(0, canvasWidth - Math.max(20, item.width || 20)))
          : item.x,
        y: shouldOffset
          ? clamp((item.y || 0) + offset, 0, Math.max(0, canvasHeight - Math.max(20, item.height || 20)))
          : item.y,
        groupId: mappedGroupId
      };
    });

    const selectedGroupIdsNext = (payload.rootGroupIds || [])
      .map((oldId) => groupIdMap[oldId])
      .filter(Boolean);
    const selectedElementIdsNext = (payload.looseElementIds || [])
      .map((oldId) => elementIdMap[oldId])
      .filter(Boolean);

    return {
      createdGroups,
      createdElements,
      selectedGroupIdsNext,
      selectedElementIdsNext
    };
  };

  const copySelection = () => {
    const payload = buildSelectionClipboardPayload();
    if (!payload) return;
    setClipboard(payload);
    toast.success('Copied');
  };

  const pasteClipboard = () => {
    const instantiated = instantiateClipboardPayload(clipboard, 20);
    if (!instantiated) return;
    if (Object.keys(instantiated.createdGroups).length > 0) {
      setGroups((prev) => ({ ...prev, ...instantiated.createdGroups }));
    }
    if (instantiated.createdElements.length > 0) {
      setElements((prev) => [...prev, ...instantiated.createdElements]);
    }
    setSelectedGroupIds(instantiated.selectedGroupIdsNext);
    setSelectedIds(instantiated.selectedElementIdsNext);
  };

  const duplicateSelection = () => {
    const payload = buildSelectionClipboardPayload();
    const instantiated = instantiateClipboardPayload(payload, 20);
    if (!instantiated) return;
    if (Object.keys(instantiated.createdGroups).length > 0) {
      setGroups((prev) => ({ ...prev, ...instantiated.createdGroups }));
    }
    if (instantiated.createdElements.length > 0) {
      setElements((prev) => [...prev, ...instantiated.createdElements]);
    }
    setSelectedGroupIds(instantiated.selectedGroupIdsNext);
    setSelectedIds(instantiated.selectedElementIdsNext);
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
        nextPatch.height = Math.max(20, Number((nextPatch.width / ratio).toFixed(3)));
      } else if (hasHeight && !hasWidth) {
        nextPatch.width = Math.max(20, Number((nextPatch.height * ratio).toFixed(3)));
      }
    }

    setElements((prev) =>
      prev.map((item) => (item.id === selectedElement.id ? { ...item, ...nextPatch } : item))
    );
  };

  const handleSizeDraftChange = (axis, rawValue) => {
    setSizeDraft((prev) => ({ ...prev, [axis]: rawValue }));
    if (!selectedElement) return;
    if (rawValue === '' || rawValue === '-' || rawValue === '.' || rawValue === '-.') return;
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return;
    const minSize = (selectedElement.kind === 'rectangle' || selectedElement.kind === 'panel') ? 1 : 20;
    const next = Math.max(minSize, parsed);
    updateSelected(axis === 'width' ? { width: next } : { height: next });
  };

  const nudgeSelection = (dx, dy) => {
    if (selectedIds.length === 0 && selectedGroupIds.length === 0) return;

    const movingGroupIds = new Set(selectedGroupIds);
    if (movingGroupIds.size > 0) {
      setGroups((prev) => {
        const next = { ...prev };
        movingGroupIds.forEach((groupId) => {
          if (!next[groupId]) return;
          next[groupId] = {
            ...next[groupId],
            x: (next[groupId].x || 0) + dx,
            y: (next[groupId].y || 0) + dy
          };
        });
        return next;
      });
    }

    setElements((prev) =>
      prev.map((item) => {
        if (!selectedIds.includes(item.id)) return item;

        if (item.groupId) {
          for (const movingGroupId of movingGroupIds) {
            if (item.groupId === movingGroupId || isGroupDescendantOf(item.groupId, movingGroupId)) {
              return item;
            }
          }
        }

        const isShape = item.kind === 'rectangle' || item.kind === 'panel';
        if (isShape) {
          return {
            ...item,
            x: (item.x || 0) + dx,
            y: (item.y || 0) + dy
          };
        }

        const dims = getDimensions(item);
        const maxX = canvasWidth - Math.max(20, dims.width || 20);
        const maxY = canvasHeight - Math.max(20, dims.height || 20);
        return {
          ...item,
          x: clamp((item.x || 0) + dx, 0, maxX),
          y: clamp((item.y || 0) + dy, 0, maxY)
        };
      })
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

  const getSelectedLayoutUnits = () => {
    const selectedGroupSet = new Set(selectedGroupIds.filter((id) => groups[id]));
    const rootSelectedGroupIds = [...selectedGroupSet].filter((groupId) => {
      let cursor = groups[groupId];
      while (cursor?.parentGroupId) {
        if (selectedGroupSet.has(cursor.parentGroupId)) return false;
        cursor = groups[cursor.parentGroupId];
      }
      return true;
    });

    const rootSelectedGroupSet = new Set(rootSelectedGroupIds);
    const movableElementIds = selectedIds.filter((elementId) => {
      const element = elements.find((entry) => entry.id === elementId);
      if (!element?.groupId) return true;
      for (const groupId of rootSelectedGroupSet) {
        if (element.groupId === groupId || isGroupDescendantOf(element.groupId, groupId)) {
          return false;
        }
      }
      return true;
    });

    const units = [];

    rootSelectedGroupIds.forEach((groupId) => {
      const memberIds = collectMemberIdsFromGroups([groupId], groups);
      const memberBoxes = memberIds
        .map((id) => renderModel.byId[id])
        .filter(Boolean);
      if (memberBoxes.length === 0) return;
      const left = Math.min(...memberBoxes.map((box) => box.left));
      const top = Math.min(...memberBoxes.map((box) => box.top));
      const right = Math.max(...memberBoxes.map((box) => box.left + box.width));
      const bottom = Math.max(...memberBoxes.map((box) => box.top + box.height));
      units.push({
        kind: 'group',
        id: groupId,
        left,
        top,
        width: right - left,
        height: bottom - top
      });
    });

    movableElementIds.forEach((id) => {
      const item = elements.find((entry) => entry.id === id);
      const meta = renderModel.byId[id];
      if (!item || !meta) return;
      units.push({
        kind: 'element',
        id,
        item,
        left: meta.left,
        top: meta.top,
        width: meta.width,
        height: meta.height
      });
    });

    return units;
  };

  const alignSelection = (mode, target = 'artboard') => {
    const units = getSelectedLayoutUnits();

    if (units.length === 0) return;

    const ref = target === 'selection'
      ? {
        left: Math.min(...units.map((unit) => unit.left)),
        top: Math.min(...units.map((unit) => unit.top)),
        right: Math.max(...units.map((unit) => unit.left + unit.width)),
        bottom: Math.max(...units.map((unit) => unit.top + unit.height))
      }
      : {
        left: 0,
        top: 0,
        right: canvasWidth,
        bottom: canvasHeight
      };

    const horizontal = mode === 'left' || mode === 'right' || mode === 'centerX';
    const vertical = mode === 'top' || mode === 'bottom' || mode === 'centerY';

    const groupPatches = {};
    const elementPatches = {};

    units.forEach((unit) => {
      let targetLeft = unit.left;
      let targetTop = unit.top;

      if (mode === 'left') targetLeft = ref.left;
      if (mode === 'right') targetLeft = ref.right - unit.width;
      if (mode === 'centerX') targetLeft = ref.left + (ref.right - ref.left) / 2 - unit.width / 2;
      if (mode === 'top') targetTop = ref.top;
      if (mode === 'bottom') targetTop = ref.bottom - unit.height;
      if (mode === 'centerY') targetTop = ref.top + (ref.bottom - ref.top) / 2 - unit.height / 2;

      const dx = targetLeft - unit.left;
      const dy = targetTop - unit.top;

      if (unit.kind === 'group') {
        const current = groups[unit.id];
        if (!current) return;
        groupPatches[unit.id] = {
          ...current,
          centerX: horizontal ? false : current.centerX,
          x: (current.x || 0) + (horizontal ? dx : 0),
          y: (current.y || 0) + (vertical ? dy : 0)
        };
        return;
      }

      const item = unit.item;
      const offsetLeft = unit.left - (item.centerX ? canvasWidth / 2 - unit.width / 2 : item.x);
      const offsetTop = unit.top - item.y;
      const patch = {};
      if (horizontal) {
        patch.centerX = false;
        patch.x = targetLeft - offsetLeft;
      }
      if (vertical) {
        patch.y = targetTop - offsetTop;
      }
      elementPatches[unit.id] = patch;
    });

    if (Object.keys(groupPatches).length > 0) {
      setGroups((prev) => {
        const next = { ...prev };
        Object.entries(groupPatches).forEach(([groupId, patch]) => {
          if (!next[groupId]) return;
          next[groupId] = patch;
        });
        return next;
      });
    }

    if (Object.keys(elementPatches).length > 0) {
      setElements((prev) =>
        prev.map((item) => (elementPatches[item.id] ? { ...item, ...elementPatches[item.id] } : item))
      );
    }
  };

  function setSelectionSpacing(axis = 'horizontal', rawGap = 0) {
    const units = getSelectedLayoutUnits();
    if (units.length < 2) return;
    const nextGap = Math.max(0, Number(rawGap) || 0);

    const isHorizontal = axis === 'horizontal';
    const sizeKey = isHorizontal ? 'width' : 'height';
    const posKey = isHorizontal ? 'left' : 'top';

    const sorted = [...units].sort((a, b) => {
      const diff = a[posKey] - b[posKey];
      if (Math.abs(diff) > 0.001) return diff;
      return (a.id || '').localeCompare(b.id || '');
    });

    const first = sorted[0];
    const spanStart = first[posKey];

    const groupPatches = {};
    const elementPatches = {};

    let cursor = spanStart;
    sorted.forEach((unit) => {
      const targetPos = cursor;
      const delta = targetPos - unit[posKey];
      cursor += unit[sizeKey] + nextGap;

      if (unit.kind === 'group') {
        const current = groups[unit.id];
        if (!current) return;
        groupPatches[unit.id] = {
          ...current,
          centerX: isHorizontal ? false : current.centerX,
          x: (current.x || 0) + (isHorizontal ? delta : 0),
          y: (current.y || 0) + (!isHorizontal ? delta : 0)
        };
        return;
      }

      const item = unit.item;
      const offsetLeft = unit.left - (item.centerX ? canvasWidth / 2 - unit.width / 2 : item.x);
      const offsetTop = unit.top - item.y;
      const patch = {};
      if (isHorizontal) {
        patch.centerX = false;
        patch.x = targetPos - offsetLeft;
      } else {
        patch.y = targetPos - offsetTop;
      }
      elementPatches[unit.id] = patch;
    });

    if (Object.keys(groupPatches).length > 0) {
      setGroups((prev) => {
        const next = { ...prev };
        Object.entries(groupPatches).forEach(([groupId, patch]) => {
          if (!next[groupId]) return;
          next[groupId] = patch;
        });
        return next;
      });
    }

    if (Object.keys(elementPatches).length > 0) {
      setElements((prev) =>
        prev.map((item) => (elementPatches[item.id] ? { ...item, ...elementPatches[item.id] } : item))
      );
    }
  }

  function getSelectionSpacing(axis = 'horizontal') {
    const units = getSelectedLayoutUnits();
    if (units.length < 2) return '';
    const isHorizontal = axis === 'horizontal';
    const sizeKey = isHorizontal ? 'width' : 'height';
    const posKey = isHorizontal ? 'left' : 'top';
    const sorted = [...units].sort((a, b) => a[posKey] - b[posKey]);
    const gaps = [];
    for (let index = 1; index < sorted.length; index += 1) {
      const prev = sorted[index - 1];
      const current = sorted[index];
      gaps.push(current[posKey] - (prev[posKey] + prev[sizeKey]));
    }
    if (gaps.length === 0) return '';
    const firstGap = gaps[0];
    const allEqual = gaps.every((gap) => Math.abs(gap - firstGap) < 0.01);
    if (!allEqual) return '';
    return String(Number(firstGap.toFixed(3)));
  }

  const renderAlignmentIcon = (Icon) => <Icon className="w-3.5 h-3.5" />;
  function getQuickBlockCategory(block) {
    if (block.type === 'school_name' || block.type === 'school_logo') return 'school';
    if (block.type === 'student_name' || block.type === 'father_name' || block.type === 'roll_no' || block.type === 'class_name' || block.type === 'student_photo') return 'student';
    return 'custom';
  }
  const getBlockIcon = (block) => {
    if (block.kind === 'text') return Type;
    if (block.kind === 'photo' || block.kind === 'logo' || block.kind === 'image' || block.type === 'import_image') return ImageIcon;
    if (block.type === 'rectangle') return Square;
    if (block.type === 'import_svg') return FileCode2;
    return Plus;
  };
  function getReplacementKind(element) {
    if (!element) return null;
    if (element.kind === 'text') return 'text';
    if (['photo', 'logo', 'image'].includes(element.kind)) return 'image';
    return null;
  }
  function getReplacementBlocksForElement(element) {
    const kind = getReplacementKind(element);
    if (kind === 'text') return BLOCKS.filter((block) => block.kind === 'text');
    if (kind === 'image') {
      return BLOCKS.filter((block) => ['photo', 'logo', 'image_importer'].includes(block.kind));
    }
    return [];
  }
  const handleEnterBlur = (event) => {
    if (event.key !== 'Enter' || event.isComposing) return;
    const target = event.target;
    if (!target || typeof target.tagName !== 'string') return;
    if (target.tagName.toLowerCase() !== 'input') return;
    if (typeof target.blur === 'function') target.blur();
  };

  const groupSelectedLayers = () => {
    const selectedElementIds = [...new Set(selectedIds)].filter((id) => {
      const item = elements.find((element) => element.id === id);
      if (!item) return false;
      if (!item.groupId && item.locked) return false;
      return true;
    });
    const selectedGroupSet = new Set(selectedGroupIds.filter((id) => groups[id]));
    const selectedDirectGroupIds = [...selectedGroupSet].filter((groupId) => {
      let cursor = groups[groupId];
      while (cursor?.parentGroupId) {
        if (selectedGroupSet.has(cursor.parentGroupId)) return false;
        cursor = groups[cursor.parentGroupId];
      }
      return true;
    });
    const groupedElementIds = collectMemberIdsFromGroups(selectedDirectGroupIds, groups);
    const groupedSet = new Set(groupedElementIds);
    const looseElementIds = selectedElementIds.filter((id) => !groupedSet.has(id));
    const totalSelected = looseElementIds.length + selectedDirectGroupIds.length;
    if (totalSelected < 2) {
      toast.error('Select at least two layers to group');
      return;
    }

    const selectedUnits = [];
    selectedDirectGroupIds.forEach((groupId) => {
      const memberIds = collectMemberIdsFromGroups([groupId], groups);
      const memberBoxes = memberIds
        .map((id) => renderModel.byId[id])
        .filter(Boolean);
      if (memberBoxes.length === 0) return;
      const left = Math.min(...memberBoxes.map((box) => box.left));
      const top = Math.min(...memberBoxes.map((box) => box.top));
      selectedUnits.push({ left, top });
    });
    looseElementIds.forEach((id) => {
      const meta = renderModel.byId[id];
      if (!meta) return;
      selectedUnits.push({ left: meta.left, top: meta.top });
    });
    if (selectedUnits.length === 0) return;
    const anchorX = Math.min(...selectedUnits.map((unit) => unit.left));
    const anchorY = Math.min(...selectedUnits.map((unit) => unit.top));

    const groupId = `group-${Date.now()}`;
    const groupName = `Group ${Object.keys(groups).length + 1}`;
    const parentGroupId = expandedGroupId || null;
    const elementLocalPatches = {};
    looseElementIds.forEach((id) => {
      const meta = renderModel.byId[id];
      if (!meta) return;
      elementLocalPatches[id] = {
        groupId,
        centerX: false,
        x: meta.left - anchorX,
        y: meta.top - anchorY
      };
    });

    setGroups((prev) => {
      const next = { ...prev };

      // Remove selected children from all current parents before re-parenting
      Object.keys(next).forEach((gid) => {
        next[gid] = {
          ...next[gid],
          memberIds: (next[gid].memberIds || []).filter((id) => !looseElementIds.includes(id)),
          childGroupIds: (next[gid].childGroupIds || []).filter((id) => !selectedDirectGroupIds.includes(id))
        };
      });

      // Create new group containing selected groups + selected elements
      next[groupId] = {
        id: groupId,
        name: groupName,
        centerX: false,
        locked: false,
        x: anchorX,
        y: anchorY,
        rotation: 0,
        parentGroupId,
        childGroupIds: selectedDirectGroupIds,
        memberIds: looseElementIds
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
        elementLocalPatches[item.id] ? { ...item, ...elementLocalPatches[item.id] } : item
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
    const selectedChildElementIds = [
      ...new Set(groupIds.flatMap((groupId) => groups[groupId]?.memberIds || []))
    ];
    const selectedChildGroupIds = [
      ...new Set(groupIds.flatMap((groupId) => groups[groupId]?.childGroupIds || []))
    ];
    const ungroupSet = new Set(groupIds);
    const elementPatches = {};
    elements.forEach((item) => {
      if (!item.groupId || !ungroupSet.has(item.groupId)) return;
      const group = groups[item.groupId];
      if (!group) return;
      elementPatches[item.id] = {
        groupId: group.parentGroupId || null,
        x: (item.x || 0) + (group.x || 0),
        y: (item.y || 0) + (group.y || 0),
        centerX: false
      };
    });

    setGroups((prev) => {
      const copy = { ...prev };
      groupIds.forEach((groupId) => {
        const group = copy[groupId];
        if (!group) return;

        if (group.parentGroupId && copy[group.parentGroupId]) {
          const nextParentChildGroupIds = [
            ...(copy[group.parentGroupId].childGroupIds || []).filter((id) => id !== groupId),
            ...((group.childGroupIds || []).filter((id) => id !== groupId))
          ];
          copy[group.parentGroupId] = {
            ...copy[group.parentGroupId],
            memberIds: [...new Set([...(copy[group.parentGroupId].memberIds || []), ...(group.memberIds || [])])],
            childGroupIds: [...new Set(nextParentChildGroupIds)]
          };
        }

        if (group.childGroupIds?.length) {
          group.childGroupIds.forEach((childId) => {
            if (copy[childId]) {
              copy[childId] = {
                ...copy[childId],
                parentGroupId: group.parentGroupId || null,
                x: (copy[childId].x || 0) + (group.x || 0),
                y: (copy[childId].y || 0) + (group.y || 0)
              };
            }
          });
        }

        delete copy[groupId];
      });
      return copy;
    });
    setElements((prev) =>
      prev.map((item) => (elementPatches[item.id] ? { ...item, ...elementPatches[item.id] } : item))
    );
    setSelectedIds(selectedChildElementIds);
    setSelectedGroupIds(selectedChildGroupIds);
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
    if (!expandedGroupId && groups[groupId]?.locked) return;
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
    if (!element.groupId && element.locked) return;
    const isMulti = event.ctrlKey || event.metaKey || event.shiftKey;
    const contextGroupId = getGroupForCanvasContext(element.groupId);
    if (!expandedGroupId && contextGroupId && groups[contextGroupId]?.locked) return;

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
    const contextGroupId = getGroupForCanvasContext(element.groupId);
    // If element resolves to a visible group context, always enter that group first.
    if (contextGroupId && contextGroupId !== expandedGroupId && groups[contextGroupId]) {
      setExpandedGroupId(contextGroupId);
      clearSelection();
      return;
    }

    // Text can be edited inline only when directly visible in current layer context:
    // - top-level text when not inside any group view
    // - direct child text when inside that group view
    const canInlineEditText =
      element.kind === 'text' &&
      element.type === 'text' &&
      (
        (!expandedGroupId && !element.groupId) ||
        (expandedGroupId && element.groupId === expandedGroupId)
      );

    if (canInlineEditText) {
      setSelectedIds([element.id]);
      setSelectedGroupIds([]);
      setInlineTextEditingId(element.id);
      setInlineTextDraft(element.text || '');
    }
  };

  const commitInlineTextEdit = (save = true) => {
    if (!inlineTextEditingId) return;
    const editingId = inlineTextEditingId;
    const nextText = inlineTextDraft;
    setInlineTextEditingId(null);
    if (!save) return;
    setElements((prev) =>
      prev.map((item) =>
        item.id === editingId && item.kind === 'text' && item.type === 'text'
          ? { ...item, text: nextText }
          : item
      )
    );
  };

  useEffect(() => {
    if (!inlineTextEditingId) return;
    const raf = requestAnimationFrame(() => {
      const input = inlineTextInputRef.current;
      if (!input) return;
      input.focus();
      const len = input.value?.length || 0;
      if (typeof input.setSelectionRange === 'function') {
        input.setSelectionRange(len, len);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [inlineTextEditingId]);

  const getElementCornerRadii = (element) => {
    const base = Math.max(0, Number(element?.borderRadius) || 0);
    return {
      topLeft: Number.isFinite(Number(element?.borderRadiusTopLeft)) ? Math.max(0, Number(element.borderRadiusTopLeft)) : base,
      topRight: Number.isFinite(Number(element?.borderRadiusTopRight)) ? Math.max(0, Number(element.borderRadiusTopRight)) : base,
      bottomRight: Number.isFinite(Number(element?.borderRadiusBottomRight)) ? Math.max(0, Number(element.borderRadiusBottomRight)) : base,
      bottomLeft: Number.isFinite(Number(element?.borderRadiusBottomLeft)) ? Math.max(0, Number(element.borderRadiusBottomLeft)) : base
    };
  };

  const getUnifiedCornerRadiusValue = (element) => {
    const radii = getElementCornerRadii(element);
    const values = [radii.topLeft, radii.topRight, radii.bottomRight, radii.bottomLeft];
    const first = values[0];
    const allEqual = values.every((value) => Math.abs(value - first) < 0.001);
    return allEqual ? first : null;
  };

  const renderOverlayElement = (element, meta) => {
    const borderWidth = element.showBorder ? Math.max(1, element.borderWidth || 1) : 0;
    const borderShadow = borderWidth > 0 ? `0 0 0 ${borderWidth}px ${element.borderColor}` : 'none';
    const cornerRadii = getElementCornerRadii(element);

    const baseStyle = {
      width: `${meta.width}px`,
      height: `${meta.height}px`,
      borderRadius: `${cornerRadii.topLeft}px ${cornerRadii.topRight}px ${cornerRadii.bottomRight}px ${cornerRadii.bottomLeft}px`,
      background: element.showFill ? element.fillColor : 'transparent',
      border: 'none',
      boxShadow: borderShadow,
      boxSizing: 'border-box'
    };

    if (element.kind === 'rectangle' || element.kind === 'panel') {
      return <div style={baseStyle} />;
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
          fontSize: `${element.fontSize}px`,
          fontFamily: element.fontFamily || 'Inter, sans-serif',
          textAlign: element.centerX || groups[element.groupId]?.centerX ? 'center' : 'left',
          padding: `${element.paddingY || 0}px ${element.paddingX || 0}px`
        }}
        className="truncate"
      >
        {(() => {
          const { prefix, base } = getTextParts(element);
          return (
            <>
              {prefix && (
                <span
                  style={{
                    color: element.prefixColor || element.color,
                    fontWeight: element.prefixFontWeight || element.fontWeight,
                    fontStyle: element.prefixFontStyle || 'normal',
                    textDecoration: element.prefixTextDecoration || 'none'
                  }}
                >
                  {prefix}
                </span>
              )}
              <span
                style={{
                  color: element.color,
                  fontWeight: element.fontWeight,
                  fontStyle: element.fontStyle || 'normal',
                  textDecoration: element.textDecoration || 'none'
                }}
              >
                {base}
              </span>
            </>
          );
        })()}
      </div>
    );
  };

  const selectedGroup = selectedGroupIds.length === 1
    ? groups[selectedGroupIds[0]] || null
    : expandedGroupId
      ? null
      : selectedGroupFromSingle;
  const selectedVisualElementIds = useMemo(
    () => [...new Set([...selectedIds, ...selectedMemberIds])],
    [selectedIds, selectedMemberIds]
  );
  const directSelectedElementIds = useMemo(
    () => [...new Set(selectedIds)],
    [selectedIds]
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
  const commonBorderRadius = useMemo(() => {
    if (selectedVisualElements.length === 0) return null;
    const values = selectedVisualElements.map((item) => getUnifiedCornerRadiusValue(item));
    if (values.some((value) => value === null)) return null;
    const first = values[0];
    return values.every((value) => Math.abs(value - first) < 0.001) ? first : null;
  }, [selectedVisualElements]);
  const commonWidth = getCommonValue('width');
  const commonHeight = getCommonValue('height');
  const commonTextColor = getCommonValue('color');
  const commonFontSize = getCommonValue('fontSize');
  const commonFontFamily = getCommonValue('fontFamily');
  const commonFontWeight = getCommonValue('fontWeight');
  const commonFontStyle = getCommonValue('fontStyle');
  const commonTextDecoration = getCommonValue('textDecoration');
  const commonPrefixColor = getCommonValue('prefixColor');
  const commonPrefixFontWeight = getCommonValue('prefixFontWeight');
  const commonPrefixFontStyle = getCommonValue('prefixFontStyle');
  const commonPrefixTextDecoration = getCommonValue('prefixTextDecoration');
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
  const selectedGroupOutlineData = useMemo(
    () =>
      selectedGroupIds
        .map((groupId) => {
          const group = groups[groupId];
          if (!group) return null;

          const toBounds = (boxes) => {
            if (!boxes.length) return null;
            const minX = Math.min(...boxes.map((b) => b.left));
            const minY = Math.min(...boxes.map((b) => b.top));
            const maxX = Math.max(...boxes.map((b) => b.left + b.width));
            const maxY = Math.max(...boxes.map((b) => b.top + b.height));
            return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
          };

          const allDescendantBoxes = collectMemberIdsFromGroups([groupId], groups)
            .map((id) => renderModel.byId[id])
            .filter(Boolean);
          const parentBounds = toBounds(allDescendantBoxes);
          if (!parentBounds) return null;

          const childBounds = [];

          // Direct element children outlines
          (group.memberIds || []).forEach((memberId) => {
            const box = renderModel.byId[memberId];
            if (!box) return;
            childBounds.push({ left: box.left, top: box.top, width: box.width, height: box.height });
          });

          // Direct child group outlines only (no deeper nested outlines)
          (group.childGroupIds || []).forEach((childGroupId) => {
            const boxes = collectMemberIdsFromGroups([childGroupId], groups)
              .map((id) => renderModel.byId[id])
              .filter(Boolean);
            const bounds = toBounds(boxes);
            if (!bounds) return;
            childBounds.push(bounds);
          });

          return {
            groupId,
            parentBounds,
            childBounds
          };
        })
        .filter(Boolean),
    [selectedGroupIds, groups, renderModel]
  );
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
        memberCount: group.memberIds.length,
        locked: Boolean(group.locked)
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
    return formatClassValue(student.classId.name, student.classId.section);
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
    father_name: student?.guardian || 'N/A',
    roll_no: student?.rollNo || 'N/A',
    class_name: getClassLabelFromStudent(student)
  });

  const getTextForExport = (element, values) => {
    const { prefix, base } = getTextParts(element, values);
    return `${prefix}${base}`;
  };

  const getExportDimensions = (element, values) => {
    if (element.kind !== 'text' || !isPaddingLayout(element.textLayout)) {
      return { width: element.width, height: element.height };
    }
    const { prefix, base } = getTextParts(element, values);
    const prefixWidth = prefix
      ? measureTextWidth(prefix, element.fontSize, element.prefixFontWeight || element.fontWeight, element.fontFamily)
      : 0;
    const baseWidth = measureTextWidth(base, element.fontSize, element.fontWeight, element.fontFamily);
    const measured = prefixWidth + baseWidth;
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
      const baseTop = element.y;
      const entry = { element, ...dims, top: baseTop, baseLeft, left: baseLeft };
      byId[element.id] = entry;

      let currentGroupId = element.groupId;
      while (currentGroupId && groups[currentGroupId]) {
        const group = groups[currentGroupId];
        const offsetX = group.x || 0;
        const offsetY = group.y || 0;
        entry.top += offsetY;
        entry.left += offsetX;
        if (!groupItems[currentGroupId]) groupItems[currentGroupId] = [];
        groupItems[currentGroupId].push(entry);
        currentGroupId = group.parentGroupId;
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

  const renderElementSvg = (element, meta, student, values, clipKey = '') => {
    const width = meta.width;
    const height = meta.height;
    const borderWidth = element.showBorder ? Math.max(1, element.borderWidth || 1) : 0;
    const rectX = 0;
    const rectY = 0;
    const rectW = width;
    const rectH = height;
    const fill = element.showFill ? (element.fillColor || '#ffffff') : 'none';
    const stroke = borderWidth ? (element.borderColor || '#0f172a') : 'none';
    const cornerRadii = getElementCornerRadii(element);
    const buildRoundedRectPath = (x, y, w, h, r) => {
      const maxRadius = Math.min(w, h) / 2;
      const tl = clamp(r.topLeft, 0, maxRadius);
      const tr = clamp(r.topRight, 0, maxRadius);
      const br = clamp(r.bottomRight, 0, maxRadius);
      const bl = clamp(r.bottomLeft, 0, maxRadius);
      return [
        `M ${x + tl} ${y}`,
        `L ${x + w - tr} ${y}`,
        tr > 0 ? `A ${tr} ${tr} 0 0 1 ${x + w} ${y + tr}` : `L ${x + w} ${y}`,
        `L ${x + w} ${y + h - br}`,
        br > 0 ? `A ${br} ${br} 0 0 1 ${x + w - br} ${y + h}` : `L ${x + w} ${y + h}`,
        `L ${x + bl} ${y + h}`,
        bl > 0 ? `A ${bl} ${bl} 0 0 1 ${x} ${y + h - bl}` : `L ${x} ${y + h}`,
        `L ${x} ${y + tl}`,
        tl > 0 ? `A ${tl} ${tl} 0 0 1 ${x + tl} ${y}` : `L ${x} ${y}`,
        'Z'
      ].join(' ');
    };
    const radiiEqual =
      Math.abs(cornerRadii.topLeft - cornerRadii.topRight) < 0.001 &&
      Math.abs(cornerRadii.topLeft - cornerRadii.bottomRight) < 0.001 &&
      Math.abs(cornerRadii.topLeft - cornerRadii.bottomLeft) < 0.001;
    const rectMarkup = radiiEqual
      ? `<rect x="${rectX}" y="${rectY}" width="${rectW}" height="${rectH}" rx="${cornerRadii.topLeft}" ry="${cornerRadii.topLeft}" fill="${fill}" stroke="${stroke}" stroke-width="${borderWidth}" />`
      : `<path d="${buildRoundedRectPath(rectX, rectY, rectW, rectH, cornerRadii)}" fill="${fill}" stroke="${stroke}" stroke-width="${borderWidth}" />`;
    const clipShapeMarkup = radiiEqual
      ? `<rect x="${rectX}" y="${rectY}" width="${rectW}" height="${rectH}" rx="${cornerRadii.topLeft}" ry="${cornerRadii.topLeft}" />`
      : `<path d="${buildRoundedRectPath(rectX, rectY, rectW, rectH, cornerRadii)}" />`;
    const clipId = clipKey ? `element-clip-${clipKey}` : '';
    const clipDefMarkup = clipId ? `<defs><clipPath id="${clipId}">${clipShapeMarkup}</clipPath></defs>` : '';
    const clipAttr = clipId ? ` clip-path="url(#${clipId})"` : '';

    if (element.kind === 'rectangle' || element.kind === 'panel') {
      return rectMarkup;
    }

    if (element.kind === 'photo' || element.kind === 'logo' || element.kind === 'image') {
      const href = element.kind === 'photo'
        ? student?.studentPhoto
        : element.kind === 'logo'
          ? tenant?.schoolLogo
          : element.imageSrc;
      if (href) {
        return `${rectMarkup}${clipDefMarkup}<image href="${escapeXml(href)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"${clipAttr} />`;
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

    const { prefix, base } = getTextParts(element, values);
    const prefixText = escapeXml(prefix);
    const baseText = escapeXml(base);
    const isCentered = element.centerX || groups[element.groupId]?.centerX;
    const textAnchor = isCentered ? 'middle' : 'start';
    const textX = isCentered ? width / 2 : (element.paddingX || 0);
    const textY = (element.paddingY || 0) + (element.fontSize || 14);
    const prefixSpan = prefix
      ? `<tspan fill="${element.prefixColor || element.color || '#0f172a'}" font-weight="${element.prefixFontWeight || element.fontWeight || 600}" font-style="${element.prefixFontStyle || 'normal'}" text-decoration="${element.prefixTextDecoration || 'none'}">${prefixText}</tspan>`
      : '';
    const baseSpan = `<tspan fill="${element.color || '#0f172a'}" font-weight="${element.fontWeight || 600}" font-style="${element.fontStyle || 'normal'}" text-decoration="${element.textDecoration || 'none'}">${baseText}</tspan>`;
    return `${rectMarkup}<text x="${textX}" y="${textY}" text-anchor="${textAnchor}" font-size="${element.fontSize || 14}" font-family="${escapeXml(element.fontFamily || 'Inter, sans-serif')}">${prefixSpan}${baseSpan}</text>`;
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
          .map((element, elementIndex) => {
            const meta = model.byId[element.id];
            if (!meta) return '';
            const rotation = (element.rotation || 0) + (groups[element.groupId]?.rotation || 0);
            const translate = `translate(${meta.left} ${meta.top})`;
            const rotate = rotation ? ` rotate(${rotation} ${meta.width / 2} ${meta.height / 2})` : '';
            const clipKey = `${index}-${elementIndex}-${element.id}`;
            return `<g transform="${translate}${rotate}">${renderElementSvg(element, meta, student, model.values, clipKey)}</g>`;
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
          <rect x="0" y="0" width="${canvasWidth}" height="${canvasHeight}" rx="${canvasRadius}" ry="${canvasRadius}" fill="${canvasColor || '#ffffff'}" />
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
    <div className="relative h-screen overflow-hidden bg-slate-100 grid grid-rows-[3.5rem_1fr_2.5rem] select-none" onKeyDownCapture={handleEnterBlur}>
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
          <Button variant="outline" onClick={openExportModal} loading={exportLoading} title="Export (Ctrl/Cmd + E)" tooltipDirection="bottom">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="min-h-0 grid grid-cols-1 xl:grid-cols-[240px_1fr_340px] gap-3 overflow-hidden p-3">
        <div className="min-h-0 overflow-hidden">
          <Card className="min-h-0 h-full grid grid-rows-[auto_1fr_auto] overflow-hidden">
            <div className="flex items-center justify-between pb-2">
              <p className="text-xs font-medium text-slate-500 inline-flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                LAYERS
              </p>
            </div>
            <div
              className="min-h-0 space-y-1 overflow-auto"
              onContextMenu={(event) => {
                if (event.target.closest('[data-layer-row="true"]')) return;
                openLayerPanelEmptyContextMenu(event);
              }}
            >
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
                    data-layer-row="true"
                    draggable
                    onDragStart={() => onLayerDragStart({ id: row.id, type: 'group' }, null)}
                    onDragOver={(event) => onLayerDragOver(event, { id: row.id, type: 'group' }, null)}
                    onDrop={(event) => onLayerDrop(event, { id: row.id, type: 'group' }, null)}
                    onDragEnd={onLayerDragEnd}
                    onContextMenu={(event) => openGroupContextMenu(event, row.id)}
                    data-tooltip="Drag to reorder layer (z-index)"
                    className={`p-2 rounded border text-sm ${selectedGroupIds.includes(row.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'} ${dragOverLayerId === row.id ? 'ring-2 ring-indigo-400' : ''} ${INTERACTIVE_BUTTON_CLASS}`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          if (row.locked) return;
                          selectGroup(row.id, e.ctrlKey || e.metaKey || e.shiftKey);
                        }}
                        onDoubleClick={() => {
                          if (row.locked) return;
                          setExpandedGroupId(row.id);
                          clearSelection();
                        }}
                        data-tooltip={`${row.name} (${row.memberCount} layers)`}
                        className={`w-full text-left ${row.locked ? 'text-slate-400 cursor-not-allowed' : ''} ${INTERACTIVE_BUTTON_CLASS}`}
                      >
                        <p className={`font-medium truncate ${selectedGroupIds.includes(row.id) ? 'text-blue-700' : 'text-slate-800'}`}>{row.name}</p>
                        <p className="text-[11px] text-slate-500">{row.memberCount} layers</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleGroupLock(row.id)}
                        data-tooltip={row.locked ? 'Unlock group' : 'Lock group'}
                        className={`shrink-0 w-6 h-6 rounded border border-slate-300 hover:bg-slate-100 inline-flex items-center justify-center ${INTERACTIVE_BUTTON_CLASS}`}
                      >
                        {row.locked ? (
                          <Lock className="w-3.5 h-3.5 text-slate-700" />
                        ) : (
                          <LockOpen className="w-3.5 h-3.5 text-slate-700" />
                        )}
                      </button>
                    </div>
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
                    data-layer-row="true"
                    draggable
                    onDragStart={() => onLayerDragStart({ id: row.id, type: 'layer' }, null)}
                    onDragOver={(event) => onLayerDragOver(event, { id: row.id, type: 'layer' }, null)}
                    onDrop={(event) => onLayerDrop(event, { id: row.id, type: 'layer' }, null)}
                    onDragEnd={onLayerDragEnd}
                    onContextMenu={(event) => openElementContextMenu(event, row.id)}
                    data-tooltip="Drag to reorder layer (z-index)"
                    className={`p-2 rounded border text-sm ${selectedIds.includes(row.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'} ${dragOverLayerId === row.id ? 'ring-2 ring-indigo-400' : ''} ${INTERACTIVE_BUTTON_CLASS}`}
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
                    </div>
                  </div>
                )
              ))}

              {expandedGroupId && groups[expandedGroupId] && nestedLayers.map((layer) => (
                layer.type === 'group' ? (
                  <div
                    key={layer.id}
                    data-layer-row="true"
                    draggable
                    onDragStart={() => onLayerDragStart({ id: layer.id, type: 'group' }, expandedGroupId)}
                    onDragOver={(event) => onLayerDragOver(event, { id: layer.id, type: 'group' }, expandedGroupId)}
                    onDrop={(event) => onLayerDrop(event, { id: layer.id, type: 'group' }, expandedGroupId)}
                    onDragEnd={onLayerDragEnd}
                    onContextMenu={(event) => openGroupContextMenu(event, layer.id)}
                    data-tooltip="Drag to reorder layer (z-index)"
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
                    data-layer-row="true"
                    draggable
                    onDragStart={() => onLayerDragStart({ id: layer.id, type: 'layer' }, expandedGroupId)}
                    onDragOver={(event) => onLayerDragOver(event, { id: layer.id, type: 'layer' }, expandedGroupId)}
                    onDrop={(event) => onLayerDrop(event, { id: layer.id, type: 'layer' }, expandedGroupId)}
                    onDragEnd={onLayerDragEnd}
                    onContextMenu={(event) => openElementContextMenu(event, layer.id)}
                    data-tooltip="Drag to reorder layer (z-index)"
                    className={`p-2 rounded border text-sm ${selectedIds.includes(layer.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'} ${dragOverLayerId === layer.id ? 'ring-2 ring-indigo-400' : ''} ${INTERACTIVE_BUTTON_CLASS}`}
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
          <div ref={canvasHistoryPopoverRef} className="absolute top-3 left-3 z-20 flex flex-col items-start gap-2">
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
              disabled={switchingSchool}
              className={`bg-white/90 backdrop-blur border border-slate-200 rounded-full shadow-sm px-3 py-1.5 max-w-56 flex items-center gap-2 cursor-pointer ${INTERACTIVE_BUTTON_CLASS}`}
            >
              <p className="text-xs font-medium text-slate-700 truncate">{tenant?.schoolName || 'School'}</p>
              {switchingSchool && (
                <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              )}
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
            ref={canvasViewportRef}
            className={`h-full overflow-auto relative ${isSpacePressed && isCanvasPointerInside ? (isPanningCanvas ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.14) 1px, transparent 0)',
              backgroundSize: `${14 * zoom}px ${14 * zoom}px`
            }}
            onMouseEnter={() => {
              isCanvasPointerInsideRef.current = true;
              setIsCanvasPointerInside(true);
            }}
            onMouseLeave={() => {
              isCanvasPointerInsideRef.current = false;
              setIsCanvasPointerInside(false);
              setCursorInfo({ inside: false, x: 0, y: 0 });
            }}
            onMouseDown={(event) => {
              if (event.button !== 0) return;
              if (!(isSpacePressedRef.current && isCanvasPointerInsideRef.current)) return;
              const viewport = canvasViewportRef.current;
              if (!viewport) return;
              event.preventDefault();
              event.stopPropagation();
              suppressCanvasClickRef.current = true;
              setIsPanningCanvas(true);
              panStateRef.current = {
                startClientX: event.clientX,
                startClientY: event.clientY,
                startScrollLeft: viewport.scrollLeft,
                startScrollTop: viewport.scrollTop
              };
            }}
            onMouseMove={handleCanvasMouseMove}
          >
            <div className="min-w-full min-h-full flex items-center justify-center p-4 box-border">
              <div
                className="relative shrink-0"
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
                  backgroundColor: canvasColor || '#ffffff',
                  borderRadius: `${canvasRadius}px`,
                  borderStyle: canvasBorderWidth > 0 ? 'solid' : 'none',
                  borderWidth: `${canvasBorderWidth}px`,
                  borderColor: canvasBorderColor
                }}
                onMouseDownCapture={(event) => {
                  if (isSpacePressedRef.current && isCanvasPointerInsideRef.current) return;
                  if (event.button !== 0) return;
                  const onElement = Boolean(event.target.closest('[data-element-layer="true"]'));
                  const shouldPane = event.altKey || !onElement;
                  if (!shouldPane) return;
                  if (onElement && event.altKey) {
                    event.preventDefault();
                    event.stopPropagation();
                  }
                  startSelectionPane(event);
                }}
                onClick={(event) => {
                  if (isSpacePressedRef.current && isCanvasPointerInsideRef.current) return;
                  if (suppressCanvasClickRef.current) {
                    suppressCanvasClickRef.current = false;
                    return;
                  }
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
                  const contextGroupId = getGroupForCanvasContext(element.groupId);
                  const isTopLevelGroupLocked = !expandedGroupId && contextGroupId && groups[contextGroupId]?.locked;
                  const isInlineEditing =
                    inlineTextEditingId === element.id && element.kind === 'text' && element.type === 'text';
                  const textAlign = element.centerX || groups[element.groupId]?.centerX ? 'center' : 'left';
                  return (
                    <div
                      key={element.id}
                      data-element-layer="true"
                      role="button"
                      tabIndex={0}
                      onMouseDown={(event) => {
                        if (isSpacePressedRef.current && isCanvasPointerInsideRef.current) return;
                        if (event.altKey) return;
                        if (isInlineEditing) return;
                        startDrag(event, element);
                      }}
                      onClick={(event) => {
                        if (isSpacePressedRef.current && isCanvasPointerInsideRef.current) {
                          event.preventDefault();
                          event.stopPropagation();
                          return;
                        }
                        event.stopPropagation();
                        if (suppressCanvasClickRef.current) {
                          suppressCanvasClickRef.current = false;
                          return;
                        }
                        handleCanvasElementClick(event, element);
                      }}
                      onDoubleClick={(event) => {
                        if (isSpacePressedRef.current && isCanvasPointerInsideRef.current) {
                          event.preventDefault();
                          event.stopPropagation();
                          return;
                        }
                        event.stopPropagation();
                        handleCanvasElementDoubleClick(element);
                      }}
                      onContextMenu={(event) => {
                        if (isSpacePressedRef.current && isCanvasPointerInsideRef.current) {
                          event.preventDefault();
                          event.stopPropagation();
                          return;
                        }
                        openElementContextMenu(event, element.id);
                      }}
                      className={`absolute ${isInlineEditing ? 'cursor-text' : (((!expandedGroupId && !element.groupId && element.locked) || isTopLevelGroupLocked) ? 'cursor-not-allowed' : 'cursor-move')}`}
                      style={{
                        top: `${meta.top}px`,
                        left: `${meta.left}px`,
                        width: `${meta.width}px`,
                        height: `${meta.height}px`,
                        transform: `rotate(${(element.rotation || 0) + (groups[element.groupId]?.rotation || 0)}deg)`
                      }}
                    >
                      {isInlineEditing ? (
                        <input
                          ref={inlineTextInputRef}
                          type="text"
                          value={inlineTextDraft}
                          onChange={(e) => setInlineTextDraft(e.target.value)}
                          onBlur={() => commitInlineTextEdit(true)}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          onDoubleClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                              e.preventDefault();
                              commitInlineTextEdit(false);
                              return;
                            }
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.currentTarget.blur();
                            }
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            outline: 'none',
                            background: 'transparent',
                            color: element.color,
                            fontSize: `${element.fontSize}px`,
                            fontWeight: element.fontWeight,
                            fontStyle: element.fontStyle || 'normal',
                            textDecoration: element.textDecoration || 'none',
                            fontFamily: element.fontFamily || 'Inter, sans-serif',
                            textAlign,
                            padding: `${element.paddingY || 0}px ${element.paddingX || 0}px`,
                            boxSizing: 'border-box'
                          }}
                        />
                      ) : (
                        renderOverlayElement(element, meta)
                      )}
                      {directSelectedElementIds.includes(element.id) && (
                        <div className="absolute -inset-1 pointer-events-none border-2 border-blue-500 rounded-md" />
                      )}
                    </div>
                  );
                })}

                {selectionBox?.active && (
                  <div
                    className="absolute pointer-events-none border border-blue-500/80 bg-blue-300/15 z-40"
                    style={{
                      left: `${Math.min(selectionBox.startX, selectionBox.currentX)}px`,
                      top: `${Math.min(selectionBox.startY, selectionBox.currentY)}px`,
                      width: `${Math.abs(selectionBox.currentX - selectionBox.startX)}px`,
                      height: `${Math.abs(selectionBox.currentY - selectionBox.startY)}px`
                    }}
                  />
                )}

                {selectedGroupOutlineData.map((entry) => (
                  <React.Fragment key={`group-focus-${entry.groupId}`}>
                    {entry.childBounds.map((bounds, idx) => (
                      <div
                        key={`group-focus-${entry.groupId}-child-${idx}`}
                        className="absolute pointer-events-none border-2 border-blue-500 rounded-md z-30"
                        style={{
                          left: `${bounds.left - 2}px`,
                          top: `${bounds.top - 2}px`,
                          width: `${bounds.width + 4}px`,
                          height: `${bounds.height + 4}px`
                        }}
                      />
                    ))}
                  </React.Fragment>
                ))}

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

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20">
            <div className="bg-white/95 border border-slate-200 rounded-xl shadow-md px-2 py-1.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => addBlockByType('rectangle')}
                data-tooltip="Add Rectangle"
                className={`w-9 h-9 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center ${INTERACTIVE_BUTTON_CLASS}`}
              >
                <Square className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => addBlockByType('text')}
                data-tooltip="Add Custom Text"
                className={`w-9 h-9 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center ${INTERACTIVE_BUTTON_CLASS}`}
              >
                <Type className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => addBlockByType('import_image')}
                data-tooltip="Import Image"
                className={`w-9 h-9 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center ${INTERACTIVE_BUTTON_CLASS}`}
              >
                <ImagePlus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => addBlockByType('import_svg')}
                data-tooltip="Import SVG"
                className={`w-9 h-9 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center ${INTERACTIVE_BUTTON_CLASS}`}
              >
                <FileCode2 className="w-4 h-4" />
              </button>
              <div className="w-px h-7 bg-slate-300 mx-0.5" />
              <button
                type="button"
                onClick={() => {
                  setQuickAddMode('add');
                  setQuickAddReplaceTargetId(null);
                  setQuickAddSearch('');
                  setShowQuickAddModal(true);
                }}
                data-tooltip="More Blocks (Ctrl/Cmd + Space)"
                className={`w-9 h-9 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 inline-flex items-center justify-center ${INTERACTIVE_BUTTON_CLASS}`}
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>
          </div>

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
              const replacementTargetId = pendingImageReplaceTargetId;
              setPendingImageReplaceTargetId(null);
              importImageFile(file, replacementTargetId);
              event.target.value = '';
            }}
          />
        </Card>

        <Card className="min-h-0 grid grid-rows-[auto_1fr] overflow-hidden">
          <p className="text-xs font-medium text-slate-500 pb-2 inline-flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            PROPERTIES
          </p>
          <div className="min-h-0 space-y-3 overflow-auto pr-1">
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
            {(selectedIds.length + selectedGroupIds.length) > 1 && (
              <div className="space-y-2 p-2.5 rounded-lg border border-slate-200 bg-white">
                <p className="text-[11px] font-medium text-slate-500">Spacing</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500">Horizontal</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={spacingDraft.horizontal}
                      onChange={(e) => {
                        const next = e.target.value;
                        setSpacingDraft((prev) => ({ ...prev, horizontal: next }));
                        if (next === '' || next === '-' || next === '.' || next === '-.') return;
                        const parsed = Number(next);
                        if (!Number.isFinite(parsed)) return;
                        setSelectionSpacing('horizontal', parsed);
                      }}
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Vertical</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={spacingDraft.vertical}
                      onChange={(e) => {
                        const next = e.target.value;
                        setSpacingDraft((prev) => ({ ...prev, vertical: next }));
                        if (next === '' || next === '-' || next === '.' || next === '-.') return;
                        const parsed = Number(next);
                        if (!Number.isFinite(parsed)) return;
                        setSelectionSpacing('vertical', parsed);
                      }}
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
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
                    <label className="text-xs text-slate-500">Width</label>
                    <input
                      type="number"
                      min="1"
                      value={commonWidth ?? ''}
                      onChange={(e) => updateSelectedBulk({ width: Math.max(1, asNumber(e.target.value, commonWidth || 20)) })}
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Height</label>
                    <input
                      type="number"
                      min="1"
                      value={commonHeight ?? ''}
                      onChange={(e) => updateSelectedBulk({ height: Math.max(1, asNumber(e.target.value, commonHeight || 20)) })}
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
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
                      onChange={(e) => {
                        const nextRadius = Math.max(0, asNumber(e.target.value, commonBorderRadius || 0));
                        updateSelectedBulk({
                          borderRadiusTopLeft: nextRadius,
                          borderRadiusTopRight: nextRadius,
                          borderRadiusBottomRight: nextRadius,
                          borderRadiusBottomLeft: nextRadius
                        });
                      }}
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
                            onChange={(e) => updateSelectedBulk({ color: toSafeHexColor(e.target.value, '#0f172a') }, (item) => item.kind === 'text')}
                            className="w-full pr-10 px-2 py-1.5 text-sm border border-slate-300 rounded-md uppercase"
                          />
                          <label className="absolute top-1/2 right-2 -translate-y-1/2 w-6 h-6 rounded border border-slate-300 cursor-pointer flex items-center justify-center bg-white">
                            <Pipette className="w-3.5 h-3.5 text-slate-600" />
                            <input
                              type="color"
                              value={toSafeHexColor(commonTextColor, '#0f172a')}
                              onChange={(e) => updateSelectedBulk({ color: toSafeHexColor(e.target.value, '#0f172a') }, (item) => item.kind === 'text')}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
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
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-500">Text Style</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => updateSelectedBulk({ fontWeight: (commonFontWeight || 0) >= 600 ? 400 : 700 }, (item) => item.kind === 'text')}
                          className={`px-2 py-1.5 rounded-md text-xs border font-semibold ${((commonFontWeight || 0) >= 600) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'} ${INTERACTIVE_BUTTON_CLASS}`}
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedBulk({ fontStyle: commonFontStyle === 'italic' ? 'normal' : 'italic' }, (item) => item.kind === 'text')}
                          className={`px-2 py-1.5 rounded-md text-xs border italic ${commonFontStyle === 'italic' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'} ${INTERACTIVE_BUTTON_CLASS}`}
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedBulk({ textDecoration: commonTextDecoration === 'underline' ? 'none' : 'underline' }, (item) => item.kind === 'text')}
                          className={`px-2 py-1.5 rounded-md text-xs border underline ${commonTextDecoration === 'underline' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'} ${INTERACTIVE_BUTTON_CLASS}`}
                        >
                          U
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-500">Prefix Style</label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={commonPrefixColor ?? ''}
                            onChange={(e) => updateSelectedBulk({ prefixColor: toSafeHexColor(e.target.value, '#0f172a') }, (item) => item.kind === 'text')}
                            className="w-full pr-10 px-2 py-1.5 text-sm border border-slate-300 rounded-md uppercase"
                            placeholder="Color"
                          />
                          <label className="absolute top-1/2 right-2 -translate-y-1/2 w-6 h-6 rounded border border-slate-300 cursor-pointer flex items-center justify-center bg-white">
                            <Pipette className="w-3.5 h-3.5 text-slate-600" />
                            <input
                              type="color"
                              value={toSafeHexColor(commonPrefixColor, '#0f172a')}
                              onChange={(e) => updateSelectedBulk({ prefixColor: toSafeHexColor(e.target.value, '#0f172a') }, (item) => item.kind === 'text')}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </label>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            type="button"
                            onClick={() => updateSelectedBulk({ prefixFontWeight: (commonPrefixFontWeight || 0) >= 600 ? 400 : 700 }, (item) => item.kind === 'text')}
                            className={`px-1.5 py-1.5 rounded-md text-xs border font-semibold ${((commonPrefixFontWeight || 0) >= 600) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'} ${INTERACTIVE_BUTTON_CLASS}`}
                          >
                            B
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSelectedBulk({ prefixFontStyle: commonPrefixFontStyle === 'italic' ? 'normal' : 'italic' }, (item) => item.kind === 'text')}
                            className={`px-1.5 py-1.5 rounded-md text-xs border italic ${commonPrefixFontStyle === 'italic' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'} ${INTERACTIVE_BUTTON_CLASS}`}
                          >
                            I
                          </button>
                          <button
                            type="button"
                            onClick={() => updateSelectedBulk({ prefixTextDecoration: commonPrefixTextDecoration === 'underline' ? 'none' : 'underline' }, (item) => item.kind === 'text')}
                            className={`px-1.5 py-1.5 rounded-md text-xs border underline ${commonPrefixTextDecoration === 'underline' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'} ${INTERACTIVE_BUTTON_CLASS}`}
                          >
                            U
                          </button>
                        </div>
                      </div>
                    </div>
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
                    ref={groupNameInputRef}
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
                        onChange={(e) => setCanvasBorderColor(toSafeHexColor(e.target.value, '#94a3b8'))}
                        className="w-full pr-10 px-2 py-1.5 text-sm border border-slate-300 rounded-md uppercase"
                      />
                      <label className="absolute top-1/2 right-2 -translate-y-1/2 w-6 h-6 rounded border border-slate-300 cursor-pointer flex items-center justify-center bg-white">
                        <Pipette className="w-3.5 h-3.5 text-slate-600" />
                      <input
                        type="color"
                        value={toSafeHexColor(canvasBorderColor, '#94a3b8')}
                        onChange={(e) => setCanvasBorderColor(toSafeHexColor(e.target.value, '#94a3b8'))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      </label>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Canvas Color</label>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      value={canvasColor}
                      onChange={(e) => setCanvasColor(toSafeHexColor(e.target.value, '#ffffff'))}
                      className="w-full pr-10 px-2 py-1.5 text-sm border border-slate-300 rounded-md uppercase"
                    />
                    <label className="absolute top-1/2 right-2 -translate-y-1/2 w-6 h-6 rounded border border-slate-300 cursor-pointer flex items-center justify-center bg-white">
                      <Pipette className="w-3.5 h-3.5 text-slate-600" />
                      <input
                        type="color"
                        value={toSafeHexColor(canvasColor, '#ffffff')}
                        onChange={(e) => setCanvasColor(toSafeHexColor(e.target.value, '#ffffff'))}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </label>
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
                    ref={layerNameInputRef}
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
                        min={(selectedElement.kind === 'rectangle' || selectedElement.kind === 'panel') ? 1 : 20}
                        step="1"
                        value={sizeDraft.width}
                        onChange={(e) => handleSizeDraftChange('width', e.target.value)}
                        onFocus={() => setSizeEditingAxis('width')}
                        onBlur={() => setSizeEditingAxis(null)}
                        className="w-full pl-6 pr-2 py-1.5 text-sm border border-slate-300 rounded-md"
                        disabled={selectedElement.kind === 'text' && isPaddingLayout(selectedElement.textLayout)}
                      />
                    </div>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">H</span>
                      <input
                        type="number"
                        min={(selectedElement.kind === 'rectangle' || selectedElement.kind === 'panel') ? 1 : 20}
                        step="1"
                        value={sizeDraft.height}
                        onChange={(e) => handleSizeDraftChange('height', e.target.value)}
                        onFocus={() => setSizeEditingAxis('height')}
                        onBlur={() => setSizeEditingAxis(null)}
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
                    {selectedElement.type !== 'text' && (
                      <div className="space-y-2">
                        <label className="text-xs text-slate-500">Prefix</label>
                        <input
                          type="text"
                          value={selectedElement.prefix || ''}
                          onChange={(e) => updateSelected({ prefix: e.target.value })}
                          className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                          placeholder="e.g. Name: "
                        />
                        <div>
                          <label className="text-xs text-slate-500">Prefix Color</label>
                          <div className="relative mt-1">
                            <input
                              type="text"
                              value={selectedElement.prefixColor || selectedElement.color}
                              onChange={(e) => updateSelected({ prefixColor: toSafeHexColor(e.target.value, '#0f172a') })}
                              className="w-full pr-10 px-2 py-1.5 text-sm border border-slate-300 rounded-md uppercase"
                            />
                            <label className="absolute top-1/2 right-2 -translate-y-1/2 w-6 h-6 rounded border border-slate-300 cursor-pointer flex items-center justify-center bg-white">
                              <Pipette className="w-3.5 h-3.5 text-slate-600" />
                              <input type="color" value={toSafeHexColor(selectedElement.prefixColor || selectedElement.color, '#0f172a')} onChange={(e) => updateSelected({ prefixColor: toSafeHexColor(e.target.value, '#0f172a') })} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Prefix Style</label>
                          <div className="grid grid-cols-3 gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => updateSelected({ prefixFontWeight: (selectedElement.prefixFontWeight || selectedElement.fontWeight || 0) >= 600 ? 400 : 700 })}
                              className={`px-2 py-1.5 rounded-md text-xs border font-semibold ${((selectedElement.prefixFontWeight || selectedElement.fontWeight || 0) >= 600) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
                            >
                              B
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSelected({ prefixFontStyle: (selectedElement.prefixFontStyle || 'normal') === 'italic' ? 'normal' : 'italic' })}
                              className={`px-2 py-1.5 rounded-md text-xs border italic ${(selectedElement.prefixFontStyle || 'normal') === 'italic' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
                            >
                              I
                            </button>
                            <button
                              type="button"
                              onClick={() => updateSelected({ prefixTextDecoration: (selectedElement.prefixTextDecoration || 'none') === 'underline' ? 'none' : 'underline' })}
                              className={`px-2 py-1.5 rounded-md text-xs border underline ${(selectedElement.prefixTextDecoration || 'none') === 'underline' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
                            >
                              U
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
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
                            onChange={(e) => updateSelected({ color: toSafeHexColor(e.target.value, '#0f172a') })}
                            className="w-full pr-10 px-2 py-1.5 text-sm border border-slate-300 rounded-md uppercase"
                          />
                          <label className="absolute top-1/2 right-2 -translate-y-1/2 w-6 h-6 rounded border border-slate-300 cursor-pointer flex items-center justify-center bg-white">
                            <Pipette className="w-3.5 h-3.5 text-slate-600" />
                            <input type="color" value={toSafeHexColor(selectedElement.color, '#0f172a')} onChange={(e) => updateSelected({ color: toSafeHexColor(e.target.value, '#0f172a') })} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
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
                    <div>
                      <label className="text-xs text-slate-500">Text Style</label>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => updateSelected({ fontWeight: (selectedElement.fontWeight || 0) >= 600 ? 400 : 700 })}
                          className={`px-2 py-1.5 rounded-md text-xs border font-semibold ${(selectedElement.fontWeight || 0) >= 600 ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelected({ fontStyle: (selectedElement.fontStyle || 'normal') === 'italic' ? 'normal' : 'italic' })}
                          className={`px-2 py-1.5 rounded-md text-xs border italic ${(selectedElement.fontStyle || 'normal') === 'italic' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelected({ textDecoration: (selectedElement.textDecoration || 'none') === 'underline' ? 'none' : 'underline' })}
                          className={`px-2 py-1.5 rounded-md text-xs border underline ${(selectedElement.textDecoration || 'none') === 'underline' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'}`}
                        >
                          U
                        </button>
                      </div>
                    </div>
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
                          onChange={(e) => updateSelected({ fillColor: toSafeHexColor(e.target.value, '#ffffff') })}
                          className="w-full pr-10 px-2 py-1.5 text-sm border border-slate-300 rounded-md uppercase"
                          disabled={!selectedElement.showFill}
                        />
                        <label className="absolute top-1/2 right-2 -translate-y-1/2 w-6 h-6 rounded border border-slate-300 cursor-pointer flex items-center justify-center bg-white">
                          <Pipette className="w-3.5 h-3.5 text-slate-600" />
                          <input type="color" value={toSafeHexColor(selectedElement.fillColor, '#ffffff')} onChange={(e) => updateSelected({ fillColor: toSafeHexColor(e.target.value, '#ffffff') })} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={!selectedElement.showFill} />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">Border Color</label>
                      <div className="relative mt-1">
                        <input
                          type="text"
                          value={selectedElement.borderColor}
                          onChange={(e) => updateSelected({ borderColor: toSafeHexColor(e.target.value, '#0f172a') })}
                          className="w-full pr-10 px-2 py-1.5 text-sm border border-slate-300 rounded-md uppercase"
                          disabled={!selectedElement.showBorder}
                        />
                        <label className="absolute top-1/2 right-2 -translate-y-1/2 w-6 h-6 rounded border border-slate-300 cursor-pointer flex items-center justify-center bg-white">
                          <Pipette className="w-3.5 h-3.5 text-slate-600" />
                          <input type="color" value={toSafeHexColor(selectedElement.borderColor, '#0f172a')} onChange={(e) => updateSelected({ borderColor: toSafeHexColor(e.target.value, '#0f172a') })} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={!selectedElement.showBorder} />
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
                      <div className="relative" ref={cornerRadiusPopoverRef}>
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-slate-500">Border Radius</label>
                        <button
                          type="button"
                          onClick={() => setShowCornerRadiusPopover((prev) => !prev)}
                          className="w-6 h-6 rounded border border-slate-300 hover:bg-slate-100 inline-flex items-center justify-center"
                          data-tooltip="Edit corner radius"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-700" />
                        </button>
                      </div>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={getUnifiedCornerRadiusValue(selectedElement) === null ? '-' : String(getUnifiedCornerRadiusValue(selectedElement))}
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          if (!raw) return;
                          const parsed = Number(raw);
                          if (!Number.isFinite(parsed)) return;
                          const nextRadius = Math.max(0, parsed);
                          updateSelected({
                            borderRadiusTopLeft: nextRadius,
                            borderRadiusTopRight: nextRadius,
                            borderRadiusBottomRight: nextRadius,
                            borderRadiusBottomLeft: nextRadius
                          });
                        }}
                        className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                      />
                      {showCornerRadiusPopover && (
                        <div className="absolute z-30 right-0 bottom-full mb-2 w-64 rounded-lg border border-slate-200 bg-white shadow-lg p-2.5 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-slate-500 inline-flex items-center gap-1">
                                <ArrowUpLeft className="w-3.5 h-3.5" />
                                TL
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={getElementCornerRadii(selectedElement).topLeft}
                                onChange={(e) => updateSelected({ borderRadiusTopLeft: Math.max(0, asNumber(e.target.value, getElementCornerRadii(selectedElement).topLeft)) })}
                                className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 inline-flex items-center gap-1">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                TR
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={getElementCornerRadii(selectedElement).topRight}
                                onChange={(e) => updateSelected({ borderRadiusTopRight: Math.max(0, asNumber(e.target.value, getElementCornerRadii(selectedElement).topRight)) })}
                                className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 inline-flex items-center gap-1">
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                                BL
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={getElementCornerRadii(selectedElement).bottomLeft}
                                onChange={(e) => updateSelected({ borderRadiusBottomLeft: Math.max(0, asNumber(e.target.value, getElementCornerRadii(selectedElement).bottomLeft)) })}
                                className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 inline-flex items-center gap-1">
                                <ArrowDownRight className="w-3.5 h-3.5" />
                                BR
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={getElementCornerRadii(selectedElement).bottomRight}
                                onChange={(e) => updateSelected({ borderRadiusBottomRight: Math.max(0, asNumber(e.target.value, getElementCornerRadii(selectedElement).bottomRight)) })}
                                className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                      </div>
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
        isOpen={showQuickAddModal}
        onClose={() => {
          setShowQuickAddModal(false);
          setQuickAddMode('add');
          setQuickAddSearch('');
          setQuickAddReplaceTargetId(null);
          setQuickAddBodyHeight(null);
        }}
        title={quickAddMode === 'replace' ? 'Replace Block' : 'Add Block'}
        size="lg"
        headerExtra={
          <div className="relative w-56 sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={quickAddSearchInputRef}
              type="text"
              value={quickAddSearch}
              onChange={(e) => setQuickAddSearch(e.target.value)}
              placeholder="Search blocks..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>
        }
      >
        <div
          className="overflow-hidden transition-[height] duration-200 ease-out"
          style={{ height: quickAddBodyHeight ? `${quickAddBodyHeight}px` : 'auto' }}
        >
          <div ref={quickAddBodyInnerRef} className="space-y-4">
            {quickAddMode === 'replace' && replaceTargetElement && (
              <p className="text-xs text-slate-600">
                Replacing: <span className="font-semibold text-slate-800">{replaceTargetElement.layerName || replaceTargetElement.label}</span>
              </p>
            )}
            {quickAddSections.map((section) => (
              <div key={section.key} className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{section.label}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {section.blocks.map((block) => {
                    const Icon = getBlockIcon(block);
                    return (
                      <button
                        key={`quick-${block.type}`}
                        type="button"
                        onClick={() => {
                          if (quickAddMode === 'replace' && quickAddReplaceTargetId) {
                            replaceElementWithBlock(quickAddReplaceTargetId, block);
                          } else {
                            addBlock(block);
                          }
                          setShowQuickAddModal(false);
                          setQuickAddMode('add');
                          setQuickAddReplaceTargetId(null);
                        }}
                        data-tooltip={`Add ${block.label}`}
                        className={`group relative text-left px-4 py-3.5 rounded-xl border border-slate-200 text-sm text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 ${INTERACTIVE_BUTTON_CLASS}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-2.5 min-w-0">
                            <span className="w-8 h-8 rounded-lg border border-slate-300 text-slate-700 bg-white inline-flex items-center justify-center group-hover:border-blue-400 group-hover:text-blue-700 transition-colors">
                              <Icon className="w-4 h-4" />
                            </span>
                            <span className="truncate font-medium">{block.label}</span>
                          </span>
                          <span className="w-6 h-6 rounded-md border border-slate-300 text-slate-600 group-hover:border-blue-400 group-hover:text-blue-700 inline-flex items-center justify-center transition-colors">
                            +
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {filteredQuickAddBlocks.length === 0 && (
              <p className="text-sm text-slate-500 py-6 text-center">No valid replacement options for this layer.</p>
            )}
          </div>
        </div>
      </Modal>

      {contextMenu && (
        <div
          className="fixed z-[80] w-56 rounded-xl border border-slate-200 bg-white shadow-xl p-1.5"
          style={{
            left: `min(${contextMenu.x}px, calc(100vw - 230px))`,
            top: `min(${contextMenu.y}px, calc(100vh - 320px))`
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          {isLayersEmptyContext ? (
            <button
              type="button"
              onClick={() => {
                setContextMenu(null);
                setQuickAddMode('add');
                setQuickAddReplaceTargetId(null);
                setQuickAddSearch('');
                setShowQuickAddModal(true);
              }}
              className="w-full px-2.5 py-2 text-sm rounded-lg hover:bg-slate-100 text-slate-700 inline-flex items-center justify-between gap-2"
            >
              <span>Add Block...</span>
              <span className="text-[11px] text-slate-400">Ctrl/Cmd+Space</span>
            </button>
          ) : (
            <>
          {canContextRename && (
            <button
              type="button"
              onClick={renameSelectionFromContextMenu}
              className="w-full px-2.5 py-2 text-sm rounded-lg hover:bg-slate-100 text-slate-700 inline-flex items-center justify-between gap-2"
            >
              <span>Rename</span>
              <span className="text-[11px] text-slate-400">F2</span>
            </button>
          )}
          {canContextReplace && (
            <button
              type="button"
              onClick={openReplaceModalFromContextMenu}
              className="w-full px-2.5 py-2 text-sm rounded-lg hover:bg-slate-100 text-slate-700 inline-flex items-center justify-between gap-2"
            >
              <span>Replace...</span>
            </button>
          )}
          {canContextGroup && (
            <button
              type="button"
              onClick={() => {
                setContextMenu(null);
                groupSelectedLayers();
              }}
              className="w-full px-2.5 py-2 text-sm rounded-lg hover:bg-slate-100 text-slate-700 inline-flex items-center justify-between gap-2"
            >
              <span>Group</span>
              <span className="text-[11px] text-slate-400">Ctrl/Cmd+G</span>
            </button>
          )}
          {canContextUngroup && (
            <button
              type="button"
              onClick={() => {
                setContextMenu(null);
                ungroupSelectedElement();
              }}
              className="w-full px-2.5 py-2 text-sm rounded-lg hover:bg-slate-100 text-slate-700 inline-flex items-center justify-between gap-2"
            >
              <span>Ungroup</span>
              <span className="text-[11px] text-slate-400">Ctrl/Cmd+Shift+G</span>
            </button>
          )}
          {selectedGroupIds.length === 1 && groups[selectedGroupIds[0]] && (
            <button
              type="button"
              onClick={() => {
                const groupId = selectedGroupIds[0];
                setContextMenu(null);
                setExpandedGroupId(groupId);
                clearSelection();
              }}
              className="w-full text-left px-2.5 py-2 text-sm rounded-lg hover:bg-slate-100 text-slate-700"
            >
              Enter Group
            </button>
          )}
          {(canContextDelete || canContextDuplicate) && (
            <div className="my-1 h-px bg-slate-200" />
          )}
          {canContextDuplicate && (
            <button
              type="button"
              onClick={() => {
                setContextMenu(null);
                duplicateSelection();
              }}
              className="w-full px-2.5 py-2 text-sm rounded-lg hover:bg-slate-100 text-slate-700 inline-flex items-center justify-between gap-2"
            >
              <span>Duplicate</span>
              <span className="text-[11px] text-slate-400">Ctrl/Cmd+D</span>
            </button>
          )}
          {canContextDelete && (
            <button
              type="button"
              onClick={() => {
                setContextMenu(null);
                deleteCurrentSelection();
              }}
              className="w-full px-2.5 py-2 text-sm rounded-lg hover:bg-red-50 text-red-600 inline-flex items-center justify-between gap-2"
            >
              <span>Delete</span>
              <span className="text-[11px] text-red-400">Del</span>
            </button>
          )}
          {selectedIds.length === 1 && selectedGroupIds.length === 0 && selectedElement && !selectedElement.groupId && (
            <button
              type="button"
              onClick={() => {
                setContextMenu(null);
                toggleLayerLock(selectedElement.id);
              }}
              className="w-full text-left px-2.5 py-2 text-sm rounded-lg hover:bg-slate-100 text-slate-700"
            >
              {selectedElement.locked ? 'Unlock Layer' : 'Lock Layer'}
            </button>
          )}
          {selectedGroupIds.length === 1 && selectedIds.length === 0 && groups[selectedGroupIds[0]] && !groups[selectedGroupIds[0]].parentGroupId && (
            <button
              type="button"
              onClick={() => {
                setContextMenu(null);
                toggleGroupLock(selectedGroupIds[0]);
              }}
              className="w-full text-left px-2.5 py-2 text-sm rounded-lg hover:bg-slate-100 text-slate-700"
            >
              {groups[selectedGroupIds[0]].locked ? 'Unlock Group' : 'Lock Group'}
            </button>
          )}
            </>
          )}
        </div>
      )}

      <EditorModals
        showUnsavedModal={showUnsavedModal}
        setShowUnsavedModal={setShowUnsavedModal}
        setPendingBack={setPendingBack}
        saving={saving}
        proceedBackWithoutSave={proceedBackWithoutSave}
        saveAndProceedBack={saveAndProceedBack}
        hasUnsavedChanges={hasUnsavedChanges}
        showSchoolModal={showSchoolModal}
        setShowSchoolModal={setShowSchoolModal}
        schoolSearch={schoolSearch}
        setSchoolSearch={setSchoolSearch}
        filteredSchools={filteredSchools}
        switchSchoolFromEditor={switchSchoolFromEditor}
        switchingSchool={switchingSchool}
        switchingSchoolId={switchingSchoolId}
        tenantId={tenantId}
        showStudentModal={showStudentModal}
        setShowStudentModal={setShowStudentModal}
        studentSearch={studentSearch}
        setStudentSearch={setStudentSearch}
        studentsLoading={studentsLoading}
        studentList={studentList}
        lastStudent={lastStudent}
        setLastStudent={setLastStudent}
        showExportModal={showExportModal}
        setShowExportModal={setShowExportModal}
        setActiveExportClassId={setActiveExportClassId}
        setExportClassSearch={setExportClassSearch}
        exportSelectedStudentIds={exportSelectedStudentIds}
        selectAllExportStudents={selectAllExportStudents}
        clearAllExportStudents={clearAllExportStudents}
        exportLoading={exportLoading}
        activeExportClassId={activeExportClassId}
        exportClassSearch={exportClassSearch}
        filteredExportClasses={filteredExportClasses}
        studentsByClass={studentsByClass}
        exportSelectedIdSet={exportSelectedIdSet}
        selectAllInClass={selectAllInClass}
        deselectAllInClass={deselectAllInClass}
        activeClassStudents={activeClassStudents}
        toggleExportStudentSelection={toggleExportStudentSelection}
        setSelectedStudentDetails={setSelectedStudentDetails}
        setShowStudentDetailsModal={setShowStudentDetailsModal}
        exportSelectedCardsAsSvg={exportSelectedCardsAsSvg}
        exporting={exporting}
        showStudentDetailsModal={showStudentDetailsModal}
        selectedStudentDetails={selectedStudentDetails}
        getClassLabelFromStudent={getClassLabelFromStudent}
      />

      <div className="absolute bottom-14 right-3 z-20">
        <div ref={shortcutsPopoverRef} className="relative">
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
