export const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const cloneHistoryState = (value) => {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

export const snapshotsEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const textMeasureCanvas =
  typeof document !== 'undefined' ? document.createElement('canvas') : null;

export const measureTextWidth = (text, fontSize, fontWeight, fontFamily = 'sans-serif') => {
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

export const getSvgDimensionsFromMarkup = (markup) => {
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

export const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

export const getImageDimensionsFromDataUrl = (dataUrl) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 160, height: img.naturalHeight || 160 });
    img.onerror = () => reject(new Error('Failed to parse image'));
    img.src = dataUrl;
  });

export const getImageAspectRatioFromUrl = (url) =>
  new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || 0;
      const height = img.naturalHeight || 0;
      if (width > 0 && height > 0) resolve(width / height);
      else resolve(null);
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

export const fitDimensions = (width, height, maxWidth, maxHeight) => {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const ratio = safeWidth / safeHeight;
  const scale = Math.min(maxWidth / safeWidth, maxHeight / safeHeight, 1);
  const fittedWidth = Math.max(20, Math.round(safeWidth * scale));
  const fittedHeight = Math.max(20, Math.round(fittedWidth / ratio));
  return { width: fittedWidth, height: fittedHeight, ratio };
};

const colorParserCanvas =
  typeof document !== 'undefined' ? document.createElement('canvas') : null;

export const toSafeHexColor = (value, fallback = '#000000') => {
  const safeFallback = /^#[0-9a-f]{6}$/i.test(String(fallback || '')) ? fallback.toLowerCase() : '#000000';
  if (!value) return safeFallback;
  const raw = String(value).trim();
  const hexMatch = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    if (hexMatch[1].length === 3) {
      return `#${hexMatch[1].split('').map((ch) => ch + ch).join('')}`.toLowerCase();
    }
    return `#${hexMatch[1].toLowerCase()}`;
  }
  const rgbaInputMatch = raw.match(
    /^rgba?\(\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)(\s*,\s*(-?\d+(\.\d+)?))?\s*\)$/i
  );
  if (rgbaInputMatch) {
    const r = clamp(Math.round(Number(rgbaInputMatch[1])), 0, 255);
    const g = clamp(Math.round(Number(rgbaInputMatch[3])), 0, 255);
    const b = clamp(Math.round(Number(rgbaInputMatch[5])), 0, 255);
    if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
      const toHex = (n) => n.toString(16).padStart(2, '0');
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
    }
    return safeFallback;
  }

  const context = colorParserCanvas?.getContext?.('2d');
  if (!context) return safeFallback;
  context.fillStyle = '#000000';
  context.fillStyle = raw;
  const normalized = String(context.fillStyle || '').trim();
  const normalizedHex = normalized.match(/^#([0-9a-f]{6})$/i);
  if (normalizedHex) return `#${normalizedHex[1].toLowerCase()}`;
  const rgbMatch = normalized.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgbMatch) {
    const toHex = (n) => Number(n).toString(16).padStart(2, '0');
    return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`.toLowerCase();
  }
  const rgbaMatch = normalized.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([01]|0?\.\d+)\s*\)$/i);
  if (rgbaMatch) {
    const toHex = (n) => Number(n).toString(16).padStart(2, '0');
    return `#${toHex(rgbaMatch[1])}${toHex(rgbaMatch[2])}${toHex(rgbaMatch[3])}`.toLowerCase();
  }
  return safeFallback;
};

export const escapeXml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const isPaddingLayout = (layout) => layout !== 'fixed';
