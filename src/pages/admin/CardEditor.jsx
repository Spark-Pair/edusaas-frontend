import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { Button, Card, Input, LoadingSpinner, Modal } from '../../components/common';

const DEFAULT_CARD_WIDTH = 360;
const DEFAULT_CARD_HEIGHT = 584;

const BLOCKS = [
  { type: 'school_name', label: 'School Name', kind: 'text', width: 220, height: 34 },
  { type: 'student_name', label: 'Student Name', kind: 'text', width: 220, height: 34 },
  { type: 'roll_no', label: 'Roll Number', kind: 'text', width: 180, height: 30 },
  { type: 'class_name', label: 'Class Name', kind: 'text', width: 180, height: 30 },
  { type: 'student_photo', label: 'Student Photo', kind: 'photo', width: 108, height: 108 },
  { type: 'school_logo', label: 'School Logo', kind: 'logo', width: 72, height: 72 },
  { type: 'text', label: 'Custom Text', kind: 'text', width: 180, height: 30, text: 'Custom Text' },
  { type: 'panel', label: 'Panel', kind: 'panel', width: 240, height: 120 },
  { type: 'import_svg', label: 'Import SVG', kind: 'importer' },
];

const SHORTCUTS = [
  { key: 'Ctrl/Cmd + Click', action: 'Multi-select on canvas/layers' },
  { key: 'Shift + Click', action: 'Multi-select on canvas/layers' },
  { key: 'Ctrl/Cmd + G', action: 'Group selected' },
  { key: 'Ctrl/Cmd + Shift + G', action: 'Ungroup selected group(s)' },
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

const textMeasureCanvas =
  typeof document !== 'undefined' ? document.createElement('canvas') : null;

const measureTextWidth = (text, fontSize, fontWeight) => {
  if (!textMeasureCanvas) return Math.max(40, text.length * (fontSize * 0.55));
  const context = textMeasureCanvas.getContext('2d');
  if (!context) return Math.max(40, text.length * (fontSize * 0.55));
  context.font = `${fontWeight} ${fontSize}px sans-serif`;
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

const CardEditor = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenantId') || '';
  const templateId = searchParams.get('templateId') || '';
  const templateNameFromQuery = searchParams.get('templateName') || 'Untitled Template';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState(null);
  const [lastStudent, setLastStudent] = useState(null);
  const [templateName, setTemplateName] = useState(templateNameFromQuery);
  const [canvasWidth, setCanvasWidth] = useState(DEFAULT_CARD_WIDTH);
  const [canvasHeight, setCanvasHeight] = useState(DEFAULT_CARD_HEIGHT);
  const [svgMarkup, setSvgMarkup] = useState('');
  const [elements, setElements] = useState([]);
  const [groups, setGroups] = useState({});
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentList, setStudentList] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [dragState, setDragState] = useState(null);
  const cardRef = useRef(null);
  const svgFileInputRef = useRef(null);

  useEffect(() => {
    const handleWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;

      event.preventDefault();

      const delta = event.deltaY > 0 ? -0.08 : 0.08;

      setZoom((prev) => clamp(prev + delta, 0.4, 2.5));
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

      const tenantFound = (tenantsRes.data.data || []).find((item) => item._id === tenantId) || null;

      setTenant(tenantFound);
      setLastStudent(studentRes.data.data || null);
      const templateData = templateRes?.data?.data || null;
      if (templateData) {
        setTemplateName(templateData.name || templateNameFromQuery);
        setCanvasWidth(Number(templateData.width) || DEFAULT_CARD_WIDTH);
        setCanvasHeight(Number(templateData.height) || DEFAULT_CARD_HEIGHT);
        setSvgMarkup(templateData.baseSvgMarkup || '');
        setElements(Array.isArray(templateData.elements) ? templateData.elements : []);
        setGroups(templateData.groups && typeof templateData.groups === 'object' ? templateData.groups : {});
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

    setSaving(true);
    try {
      const { data } = await adminAPI.updateCardTemplate(templateId, {
        name: templateName,
        width: canvasWidth,
        height: canvasHeight,
        baseSvgMarkup: svgMarkup || '',
        elements,
        groups
      });
      setTemplateName(data.data?.name || templateName);
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

  const selectedElement = selectedIds.length === 1
    ? elements.find((item) => item.id === selectedIds[0]) || null
    : null;
  const selectedGroupFromSingle = selectedElement?.groupId ? groups[selectedElement.groupId] : null;

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
    if (element.kind !== 'text' || element.textLayout !== 'dynamic') {
      return { width: element.width, height: element.height };
    }
    const content = syncSourceText(element);
    const measured = measureTextWidth(content, element.fontSize, element.fontWeight);
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
  }, [selectedIds, selectedGroupIds, groups, expandedGroupId, selectedElement]);

  const createElement = (block, overrides = {}) => {
    const id = `${block.type}-${Date.now()}`;
    const y = Math.min(20 + elements.length * 24, canvasHeight - block.height);
    return {
      id,
      type: block.type,
      kind: block.kind,
      label: block.label,
      layerName: `${block.label} ${elements.length + 1}`,
      x: 20,
      y,
      width: block.width,
      height: block.height,
      rotation: 0,
      centerX: false,
      groupId: null,
      textLayout: 'fixed',
      paddingX: 10,
      paddingY: 6,
      text: block.text || defaultValues[block.type] || block.label,
      color: '#0f172a',
      fontSize: 14,
      fontWeight: 600,
      showFill: false,
      fillColor: '#ffffff',
      showBorder: false,
      borderColor: '#0f172a',
      borderWidth: 1,
      borderRadius: 8,
      ...overrides
    };
  };

  const addBlock = (block) => {
    if (block.kind === 'importer') {
      svgFileInputRef.current?.click();
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

  const startDrag = (event, element) => {
    event.preventDefault();
    if (!cardRef.current) return;
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

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectedGroupIds([]);
  };

  const setZoomClamped = (next) => {
    setZoom(clamp(next, 0.4, 2.5));
  };

  const updateSelected = (patch) => {
    if (!selectedElement) return;
    setElements((prev) =>
      prev.map((item) => (item.id === selectedElement.id ? { ...item, ...patch } : item))
    );
  };

  const groupSelectedLayers = () => {
    const selectedElementIds = [...new Set(selectedIds)].filter((id) => elements.some((item) => item.id === id));
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
    const border = element.showBorder
      ? `${Math.max(1, element.borderWidth || 1)}px solid ${element.borderColor}`
      : 'none';

    const baseStyle = {
      width: `${meta.width}px`,
      height: `${meta.height}px`,
      borderRadius: `${element.borderRadius || 0}px`,
      background: element.showFill ? element.fillColor : 'transparent',
      border,
      boxSizing: 'content-box'
    };

    if (element.kind === 'panel') {
      return (
        <div style={baseStyle} className="flex items-center justify-center text-[11px] font-semibold text-blue-700">
          Panel
        </div>
      );
    }

    if (element.kind === 'photo') {
      return (
        <div style={baseStyle} className="flex items-center justify-center text-xl font-semibold text-slate-700">
          {studentInitials}
        </div>
      );
    }

    if (element.kind === 'logo') {
      return (
        <div style={baseStyle} className="flex items-center justify-center text-xs font-bold text-slate-700 px-2 text-center">
          {tenant?.schoolName || 'Logo'}
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
    return [...groupRows, ...singles].reverse();
  }, [elements, groups]);

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
    <div className="relative h-screen overflow-hidden bg-slate-50 p-2 md:p-3 grid grid-rows-[3rem_1fr] gap-2">
      <div className="h-12 flex items-center gap-2 overflow-x-auto whitespace-nowrap">
        <Button variant="outline" onClick={() => navigate(`/admin/cards?tenantId=${tenantId}`)}>
          Back
        </Button>
        <span className="text-sm px-3 py-1 rounded-full bg-slate-200 text-slate-700">
          School: {tenant?.schoolName || 'Unknown'}
        </span>
        <span className="text-sm px-3 py-1 rounded-full bg-slate-200 text-slate-700">
          Size: {canvasWidth} x {canvasHeight}
        </span>
        <input
          type="text"
          value={templateName}
          onChange={(e) => setTemplateName(e.target.value)}
          className="h-8 min-w-64 px-3 text-sm border border-slate-300 rounded-lg bg-white"
          placeholder="Template name"
        />
        <Button onClick={saveTemplate} loading={saving}>
          Save
        </Button>
      </div>

      <div className="min-h-0 grid grid-cols-1 xl:grid-cols-[240px_1fr_340px] gap-3 overflow-hidden">
        <div className="min-h-0 grid grid-rows-2 gap-3 overflow-hidden">
          <Card className="min-h-0 grid grid-rows-[auto_1fr] overflow-hidden">
            <p className="text-xs font-medium text-slate-500 pb-2">BLOCKS</p>
            <div className="min-h-0 flex flex-col gap-2 overflow-auto">
              {BLOCKS.map((block) => (
                <button
                  key={block.type}
                  type="button"
                  onClick={() => addBlock(block)}
                  className="w-full text-left px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition"
                >
                  {block.label}
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
            </div>
          </Card>

          <Card className="min-h-0 grid grid-rows-[auto_1fr] overflow-hidden">
            <div className="flex items-center justify-between pb-2">
              <p className="text-xs font-medium text-slate-500">LAYERS</p>
              <div className="flex gap-2">
                {selectedIds.length > 1 && (
                  <button
                    type="button"
                    onClick={groupSelectedLayers}
                    className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    Group
                  </button>
                )}
                {!expandedGroupId && (selectedGroupIds.length > 0 || (selectedIds.length === 1 && selectedElement?.groupId)) && (
                  <button
                    type="button"
                    onClick={ungroupSelectedElement}
                    className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    Ungroup
                  </button>
                )}
              </div>
            </div>
            <div className="min-h-0 space-y-1 overflow-auto">
              {expandedGroupId && groups[expandedGroupId] && (
                <div className="mb-1">
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedGroupId(null);
                      clearSelection();
                    }}
                    className="w-full text-left text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
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
                      className="w-full text-left"
                    >
                      <p className={`font-medium truncate ${selectedGroupIds.includes(row.id) ? 'text-blue-700' : 'text-slate-800'}`}>{row.name}</p>
                      <p className="text-[11px] text-slate-500">{row.memberCount} layers</p>
                    </button>
                  </div>
                ) : (
                  <div
                    key={row.id}
                    className={`p-2 rounded border text-sm ${selectedIds.includes(row.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'}`}
                  >
                    <button
                      type="button"
                      onClick={(e) => toggleSelection(row.id, e.ctrlKey || e.metaKey || e.shiftKey)}
                      className="w-full text-left truncate"
                    >
                      {row.layerName || row.label}
                    </button>
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
                      className="w-full text-left"
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
                      className="w-full text-left truncate"
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
          </Card>
        </div>

        <Card className="min-h-0 overflow-hidden relative">
          <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
            <div className="bg-white/90 backdrop-blur border border-white/70 rounded-full shadow-sm px-3 py-1.5 max-w-56">
              <p className="text-xs font-medium text-slate-700 truncate">
                {studentName || 'No Student'}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setStudentSearch('');
                setShowStudentModal(true);
              }}
            >
              Change
            </Button>
          </div>

          <div
            className="h-full flex items-center justify-center overflow-auto relative"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(15,23,42,0.14) 1px, transparent 0)',
              backgroundSize: `${14 * zoom}px ${14 * zoom}px`
            }}
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
              className="relative border border-slate-200 rounded-xl overflow-hidden shadow-sm select-none"
              style={{
                width: `${canvasWidth}px`,
                height: `${canvasHeight}px`,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left'
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
                    className={`absolute cursor-move ${selectedVisualElementIds.includes(element.id) ? 'ring-2 ring-blue-500 rounded-md' : ''}`}
                    style={{
                      top: `${meta.top}px`,
                      left: `${meta.left}px`,
                      width: `${meta.width}px`,
                      height: `${meta.height}px`,
                      transform: `rotate(${(element.rotation || 0) + (groups[element.groupId]?.rotation || 0)}deg)`
                    }}
                  >
                    {renderOverlayElement(element, meta)}
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
                    className="absolute pointer-events-none border-2 border-blue-500 rounded-md"
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
                  className="absolute pointer-events-none border-2 border-dashed border-indigo-500 rounded-md"
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
                className="w-6 h-6 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                -
              </button>
              <span className="text-xs font-medium text-slate-700 min-w-14 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoomClamped(zoom + 0.1)}
                className="w-6 h-6 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Reset
              </button>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Tip: Ctrl/Cmd + wheel to zoom</p>
          </div>
        </Card>

        <Card className="min-h-0 grid grid-rows-[auto_1fr] overflow-hidden">
          <p className="text-xs font-medium text-slate-500 pb-2">PROPERTIES</p>
          <div className="min-h-0 space-y-3 overflow-auto pr-1">
            <div className="p-2 rounded border border-slate-200 bg-white">
              <p className="text-xs font-medium text-slate-500 mb-2">SELECTION</p>
              {selectedIds.length === 0 && selectedGroupIds.length === 0 && <p className="text-xs text-slate-500">No selection</p>}
              {selectedGroupIds.length > 0 && (
                <>
                  <p className="text-xs text-slate-700 mb-2">Group{selectedGroupIds.length > 1 ? 's' : ''} selected</p>
                  <div className="space-y-1 max-h-24 overflow-auto">
                    {selectedGroupIds.map((gid) => (
                      <p key={gid} className="text-xs text-slate-600 truncate">
                        {groups[gid]?.name || gid}
                      </p>
                    ))}
                  </div>
                </>
              )}
              {selectedIds.length > 0 && (
                <>
                  <p className="text-xs text-slate-700 mb-2">{selectedIds.length} selected</p>
                  <div className="space-y-1 max-h-24 overflow-auto">
                    {selectedIds.map((id) => {
                      const item = elements.find((el) => el.id === id);
                      if (!item) return null;
                      return (
                        <p key={id} className="text-xs text-slate-600 truncate">
                          {item.layerName || item.label}
                        </p>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="mt-2 text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>

            {selectedIds.length > 1 && (
              <button
                type="button"
                onClick={groupSelectedLayers}
                className="w-full px-3 py-2 rounded-lg text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
              >
                Group Selected ({selectedIds.length})
              </button>
            )}

            {selectedGroup && selectedGroupIds.length === 1 && selectedIds.length === 0 && (
              <div className="space-y-3 p-2 rounded border border-slate-200 bg-white">
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
                  <label className="flex items-center gap-2 text-sm text-slate-700 mt-2">
                    <input
                      type="checkbox"
                      checked={selectedGroup.centerX}
                      onChange={(e) => updateGroup(selectedGroup.id, { centerX: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    Center Group Horizontally
                  </label>
                </div>
              </div>
            )}

            {selectedIds.length === 0 && <p className="text-sm text-slate-500">Select an element on canvas.</p>}
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
                  <input
                    type="number"
                    value={selectedElement.x}
                    onChange={(e) => updateSelected({ x: asNumber(e.target.value, selectedElement.x) })}
                    disabled={selectedElement.centerX}
                    className="px-2 py-1.5 text-sm border border-slate-300 rounded-md disabled:bg-slate-100"
                  />
                  <input
                    type="number"
                    value={selectedElement.y}
                    onChange={(e) => updateSelected({ y: asNumber(e.target.value, selectedElement.y) })}
                    className="px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                  />
                  <input
                    type="number"
                    value={selectedElement.rotation}
                    onChange={(e) => updateSelected({ rotation: asNumber(e.target.value, selectedElement.rotation) })}
                    className="px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 mt-2">
                  <input
                    type="checkbox"
                    checked={selectedElement.centerX}
                    onChange={(e) => updateSelected({ centerX: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  Center Horizontally
                </label>
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
                  <label className="flex items-center gap-2 text-sm text-slate-700 mt-2">
                    <input
                      type="checkbox"
                      checked={selectedGroup.centerX}
                      onChange={(e) => updateGroup(selectedGroup.id, { centerX: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    Center Group Horizontally
                  </label>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-500">Size</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <input
                    type="number"
                    min="20"
                    value={selectedElement.width}
                    onChange={(e) => updateSelected({ width: Math.max(20, asNumber(e.target.value, selectedElement.width)) })}
                    className="px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                    disabled={selectedElement.kind === 'text' && selectedElement.textLayout === 'dynamic'}
                  />
                  <input
                    type="number"
                    min="20"
                    value={selectedElement.height}
                    onChange={(e) => updateSelected({ height: Math.max(20, asNumber(e.target.value, selectedElement.height)) })}
                    className="px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                    disabled={selectedElement.kind === 'text' && selectedElement.textLayout === 'dynamic'}
                  />
                </div>
              </div>

              {selectedElement.kind === 'text' && (
                <>
                  <div>
                    <label className="text-xs text-slate-500">Text Layout</label>
                    <select
                      value={selectedElement.textLayout}
                      onChange={(e) => updateSelected({ textLayout: e.target.value })}
                      className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-300 rounded-md bg-white"
                    >
                      <option value="fixed">Fixed Width/Height</option>
                      <option value="dynamic">Padding-Based Dynamic</option>
                    </select>
                  </div>

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
                      <label className="text-xs text-slate-500">Color</label>
                      <input
                        type="color"
                        value={selectedElement.color}
                        onChange={(e) => updateSelected({ color: e.target.value })}
                        className="w-full mt-1 h-9 border border-slate-300 rounded-md"
                      />
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

                  {selectedElement.textLayout === 'dynamic' && (
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
                </>
              )}

              <div>
                <label className="text-xs text-slate-500">Appearance</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedElement.showFill}
                      onChange={(e) => updateSelected({ showFill: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    Fill
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedElement.showBorder}
                      onChange={(e) => updateSelected({ showBorder: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    Border
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="text-xs text-slate-500">Fill Color</label>
                    <input
                      type="color"
                      value={selectedElement.fillColor}
                      onChange={(e) => updateSelected({ fillColor: e.target.value })}
                      className="w-full mt-1 h-9 border border-slate-300 rounded-md"
                      disabled={!selectedElement.showFill}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Border Color</label>
                    <input
                      type="color"
                      value={selectedElement.borderColor}
                      onChange={(e) => updateSelected({ borderColor: e.target.value })}
                      className="w-full mt-1 h-9 border border-slate-300 rounded-md"
                      disabled={!selectedElement.showBorder}
                    />
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

              <button
                type="button"
                onClick={deleteCurrentSelection}
                className="w-full px-3 py-2 rounded-lg text-sm bg-red-50 text-red-600 hover:bg-red-100 transition"
              >
                Remove Selected
              </button>
              </>
            )}
          </div>
        </Card>
      </div>

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

      <div className="absolute bottom-3 right-3 z-20">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowShortcuts((prev) => !prev)}
            className="w-10 h-10 rounded-full bg-slate-800 text-white shadow-md hover:bg-slate-700 flex items-center justify-center"
            title="Shortcuts"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {showShortcuts && (
            <div className="absolute bottom-12 right-0 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-3">
              <p className="text-xs font-semibold text-slate-700 mb-2">Keyboard Shortcuts</p>
              <div className="space-y-1.5 max-h-64 overflow-auto">
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
