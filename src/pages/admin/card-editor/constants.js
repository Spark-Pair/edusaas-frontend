import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
} from 'lucide-react';

export const DEFAULT_CARD_WIDTH = 360;
export const DEFAULT_CARD_HEIGHT = 584;
export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = 10;

export const BLOCKS = [
  { type: 'school_name', label: 'School Name', kind: 'text', width: 220, height: 34 },
  { type: 'student_name', label: 'Student Name', kind: 'text', width: 220, height: 34 },
  { type: 'father_name', label: 'Father Name', kind: 'text', width: 220, height: 34 },
  { type: 'roll_no', label: 'Roll Number', kind: 'text', width: 180, height: 30 },
  { type: 'class_name', label: 'Class Name', kind: 'text', width: 180, height: 30 },
  { type: 'student_photo', label: 'Student Photo', kind: 'photo', width: 108, height: 108 },
  { type: 'qr_code', label: 'QR Code', kind: 'qr', width: 96, height: 96 },
  { type: 'school_logo', label: 'School Logo', kind: 'logo', width: 72, height: 72 },
  { type: 'text', label: 'Custom Text', kind: 'text', width: 180, height: 30, text: 'Custom Text' },
  { type: 'rectangle', label: 'Rectangle', kind: 'rectangle', width: 240, height: 120 },
  { type: 'import_image', label: 'Import Image', kind: 'image_importer' },
  { type: 'import_svg', label: 'Import SVG', kind: 'importer' },
];

export const SHORTCUTS = [
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
  { key: 'Ctrl/Cmd + Space', action: 'Open block menu' },
  { key: 'Ctrl/Cmd + Wheel', action: 'Zoom canvas' },
  { key: 'Double Click', action: 'Enter group from layer/canvas' },
  { key: 'Esc', action: 'Deselect everything' },
  { key: 'Delete / Backspace', action: 'Delete current selection' }
];

export const ALIGNMENT_ACTIONS = [
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

export const FONT_OPTIONS = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: '"Trebuchet MS", sans-serif', label: 'Trebuchet MS' },
  { value: 'Tahoma, sans-serif', label: 'Tahoma' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Times New Roman", serif', label: 'Times New Roman' },
  { value: '"Courier New", monospace', label: 'Courier New' }
];

export const INTERACTIVE_BUTTON_CLASS = 'transition-all duration-150 hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0';
