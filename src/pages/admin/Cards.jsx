import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { adminAPI } from '../../services/api';
import { Button, Card, Input, LoadingSpinner, Modal, Select } from '../../components/common';

const CARD_SIZE_PRESETS = [
  { label: 'ID Card (360 x 584)', width: 360, height: 584 },
  { label: 'Landscape (584 x 360)', width: 584, height: 360 },
  { label: 'Square (500 x 500)', width: 500, height: 500 },
  { label: 'A4 Portrait (794 x 1123)', width: 794, height: 1123 }
];

const parseSvgDimension = (value) => {
  if (!value) return null;
  const parsed = parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const getSvgDimensionsFromMarkup = (markup) => {
  const fallback = { width: 360, height: 584 };
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

const getPreviewRect = (width, height, maxWidth = 180, maxHeight = 96) => {
  if (!width || !height) return { width: maxWidth, height: maxHeight };
  const scale = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.max(26, Math.round(width * scale)),
    height: Math.max(26, Math.round(height * scale))
  };
};

const Cards = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTenant, setSelectedTenant] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [createMode, setCreateMode] = useState('blank');
  const [sizeMode, setSizeMode] = useState('preset');
  const [selectedPreset, setSelectedPreset] = useState(String(CARD_SIZE_PRESETS[0].width * 10000 + CARD_SIZE_PRESETS[0].height));
  const [width, setWidth] = useState(CARD_SIZE_PRESETS[0].width);
  const [height, setHeight] = useState(CARD_SIZE_PRESETS[0].height);
  const [lockRatio, setLockRatio] = useState(true);
  const [ratio, setRatio] = useState(CARD_SIZE_PRESETS[0].width / CARD_SIZE_PRESETS[0].height);
  const [baseSvgMarkup, setBaseSvgMarkup] = useState('');
  const baseSvgInputRef = useRef(null);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    const tenantFromUrl = searchParams.get('tenantId');
    if (!tenantFromUrl || !tenants.length) return;
    if (!tenants.some((tenant) => tenant._id === tenantFromUrl)) return;
    setSelectedTenant((prev) => prev || tenantFromUrl);
  }, [searchParams, tenants]);

  const initialize = async () => {
    setLoading(true);
    try {
      const [tenantsRes, templatesRes] = await Promise.all([
        adminAPI.getTenants(),
        adminAPI.getCardTemplates()
      ]);
      setTenants(tenantsRes.data.data || []);
      setTemplates(templatesRes.data.data || []);
    } catch (error) {
      toast.error('Failed to load cards data');
    } finally {
      setLoading(false);
    }
  };

  const tenantOptions = useMemo(
    () => tenants.map((tenant) => ({ value: tenant._id, label: tenant.schoolName })),
    [tenants]
  );

  const selectedTenantObj = tenants.find((tenant) => tenant._id === selectedTenant) || null;

  const openEditor = (template) => {
    const params = new URLSearchParams({
      tenantId: selectedTenant || String(template.tenantId?._id || template.tenantId || ''),
      mode: 'edit',
      templateId: String(template._id),
      templateName: template.name
    });
    navigate(`/admin/cards/edit?${params.toString()}`);
  };

  const handleUseTemplate = async (template) => {
    if (!selectedTenant) {
      toast.error('Select a school first');
      return;
    }

    try {
      const { data } = await adminAPI.useCardTemplate(template._id, { tenantId: selectedTenant });
      if (data.duplicated) toast.success('Template duplicated for selected school');
      openEditor(data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to use template');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      await adminAPI.deleteCardTemplate(templateId);
      setTemplates((prev) => prev.filter((item) => item._id !== templateId));
      toast.success('Template deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete template');
    }
  };

  const handleDuplicateTemplate = async (template) => {
    const targetTenantId = selectedTenant || String(template.tenantId?._id || template.tenantId || '');
    if (!targetTenantId) {
      toast.error('Select a school first');
      return;
    }
    try {
      const payload = {
        name: `${template.name} Copy`,
        tenantId: targetTenantId,
        width: template.width,
        height: template.height,
        baseSvgMarkup: template.baseSvgMarkup || '',
        elements: Array.isArray(template.elements) ? template.elements : [],
        groups: template.groups && typeof template.groups === 'object' ? template.groups : {}
      };
      const { data } = await adminAPI.createCardTemplate(payload);
      setTemplates((prev) => [data.data, ...prev]);
      toast.success('Template duplicated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to duplicate template');
    }
  };

  const openCreateModal = () => {
    if (!selectedTenant) {
      toast.error('Select a school first');
      return;
    }
    const school = selectedTenantObj?.schoolName || 'School';
    setTemplateName(`${school} New Template`);
    setCreateMode('blank');
    setSizeMode('preset');
    const defaultPreset = CARD_SIZE_PRESETS[0];
    setSelectedPreset(String(defaultPreset.width * 10000 + defaultPreset.height));
    setWidth(defaultPreset.width);
    setHeight(defaultPreset.height);
    setLockRatio(true);
    setRatio(defaultPreset.width / defaultPreset.height);
    setBaseSvgMarkup('');
    setShowCreateModal(true);
  };

  const onPickPreset = (value) => {
    setSelectedPreset(value);
    const parsed = CARD_SIZE_PRESETS.find((item) => String(item.width * 10000 + item.height) === value);
    if (!parsed) return;
    setWidth(parsed.width);
    setHeight(parsed.height);
    setRatio(parsed.width / parsed.height);
  };

  const onChangeWidth = (nextWidth) => {
    const parsed = Math.max(20, Number(nextWidth) || width);
    if (lockRatio && ratio > 0) {
      setWidth(parsed);
      setHeight(Math.max(20, Math.round(parsed / ratio)));
      return;
    }
    setWidth(parsed);
    if (height > 0) setRatio(parsed / height);
  };

  const onChangeHeight = (nextHeight) => {
    const parsed = Math.max(20, Number(nextHeight) || height);
    if (lockRatio && ratio > 0) {
      setHeight(parsed);
      setWidth(Math.max(20, Math.round(parsed * ratio)));
      return;
    }
    setHeight(parsed);
    if (parsed > 0) setRatio(width / parsed);
  };

  const onImportBaseSvg = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      if (!/<svg[\s\S]*?>/i.test(text)) {
        toast.error('Please upload a valid SVG');
        return;
      }
      const dims = getSvgDimensionsFromMarkup(text);
      setBaseSvgMarkup(text);
      setWidth(Math.max(20, Math.round(dims.width)));
      setHeight(Math.max(20, Math.round(dims.height)));
      setRatio(Math.max(0.01, dims.width / dims.height));
      setLockRatio(true);
      toast.success('Base SVG imported');
    } catch (_) {
      toast.error('Failed to read SVG');
    }
  };

  const handleCreateTemplate = async () => {
    if (!selectedTenant) {
      toast.error('Select a school first');
      return;
    }
    if (!templateName.trim()) {
      toast.error('Template name is required');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        name: templateName.trim(),
        tenantId: selectedTenant,
        width,
        height,
        baseSvgMarkup: createMode === 'import' ? baseSvgMarkup : '',
        elements: [],
        groups: {}
      };
      const { data } = await adminAPI.createCardTemplate(payload);
      setShowCreateModal(false);
      openEditor(data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create template');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading cards..." />;
  }

  return (
    <div className="fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Cards</h1>
        <p className="text-sm text-slate-500 mt-1">Select school, then create or use saved templates</p>
      </div>

      <Card className="mb-6 border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <Select
            label="School"
            value={selectedTenant}
            onChange={(event) => {
              const tenantId = event.target.value;
              setSelectedTenant(tenantId);
              if (tenantId) setSearchParams({ tenantId });
              else setSearchParams({});
            }}
            options={tenantOptions}
            placeholder="Choose a school"
            className="w-full"
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={openCreateModal}
          className="group relative overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white p-5 text-left shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
        >
          <div className="absolute -right-8 -top-10 w-28 h-28 rounded-full bg-white/10 group-hover:scale-110 transition-transform duration-300" />
          <div className="absolute -left-10 -bottom-8 w-24 h-24 rounded-full bg-white/5 group-hover:scale-110 transition-transform duration-300" />
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center mb-3 group-hover:rotate-6 transition-transform">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-base font-semibold">Create Template</p>
            <p className="text-xs text-white/80 mt-1">Blank canvas, preset size, or import base SVG</p>
          </div>
        </button>

        {templates.map((template) => {
          const schoolName = template.tenantId?.schoolName || 'Unknown School';
          const rect = getPreviewRect(template.width, template.height, 170, 94);
          return (
            <Card key={template._id} className="relative border-slate-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
              <div className="flex-1 flex flex-col cursor-pointer" onClick={() => handleUseTemplate(template)}>
                <div className="h-32 rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
                  <div className="rounded-md border border-slate-300 bg-white shadow-sm" style={{ width: `${rect.width}px`, height: `${rect.height}px` }} />
                </div>
                <div className="mt-3">
                  <p className="font-medium text-sm text-slate-800">{template.name}</p>
                  <p className="text-xs text-slate-500 mt-1">School: {schoolName}</p>
                  <p className="text-xs text-slate-500">Dimensions: {template.width} x {template.height}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicateTemplate(template);
                  }}
                  className="w-8 h-8 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 flex items-center justify-center"
                  data-tooltip="Duplicate"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8h11v11H8zM5 5h11v11" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTemplate(template._id);
                  }}
                  className="w-8 h-8 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 flex items-center justify-center"
                  data-tooltip="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12M9 7V5h6v2m-7 4v6m4-6v6m4-6v6M5 7l1 12h12l1-12" />
                  </svg>
                </button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUseTemplate(template);
                  }}
                  disabled={!selectedTenant}
                >
                  Use
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Document"
        size="xl"
      >
        <div className="flex h-[620px] -m-5">
          {/* LEFT COLUMN: Presets & Sources */}
          <div className="w-2/3 border-r border-slate-200 bg-slate-50/50 p-6 overflow-y-auto">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">Start A New Project</h3>
            
            <div className="grid grid-cols-3 gap-3">
              {/* Import Card */}
              <button
                onClick={() => {
                  setCreateMode('import');
                  setSizeMode('custom');
                  setLockRatio(true);
                }}
                className={`flex flex-col items-center justify-center aspect-square rounded-lg border-2 transition-all p-4 ${
                  createMode === 'import' 
                  ? 'border-blue-500 bg-white shadow-md' 
                  : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="w-10 h-10 mb-2 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
                </div>
                <span className="text-xs font-bold text-slate-700">Import SVG</span>
              </button>

              {/* Custom Card */}
              <button
                onClick={() => {
                  setCreateMode('blank');
                  setSizeMode('custom');
                }}
                className={`flex flex-col items-center justify-center aspect-square rounded-lg border-2 transition-all p-4 ${
                  createMode === 'blank' && sizeMode === 'custom'
                  ? 'border-blue-500 bg-white shadow-md' 
                  : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="w-10 h-10 mb-2 rounded bg-slate-100 flex items-center justify-center text-slate-500 text-lg font-mono">+</div>
                <span className="text-xs font-bold text-slate-700">Custom Size</span>
              </button>

              {/* Preset Cards */}
              {CARD_SIZE_PRESETS.map((preset) => {
                const isSelected = sizeMode === 'preset' && selectedPreset === String(preset.width * 10000 + preset.height);
                const preview = getPreviewRect(preset.width, preset.height, 64, 40);
                return (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setCreateMode('blank');
                      setSizeMode('preset');
                      onPickPreset(String(preset.width * 10000 + preset.height));
                    }}
                    className={`flex flex-col items-center justify-center aspect-square rounded-lg border-2 transition-all p-2 text-center ${
                      isSelected ? 'border-blue-500 bg-white shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="w-full h-[70%] mb-1.5 rounded border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                      <div className="rounded border border-slate-300 bg-white/95 shadow-sm" style={{ width: `${preview.width}px`, height: `${preview.height}px` }} />
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mb-1">{preset.width}x{preset.height}</div>
                    <span className="text-[11px] font-bold text-slate-700 leading-tight">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: Preset Details & Actions */}
          <div className="w-1/3 p-6 flex flex-col justify-between bg-white">
            <div className="space-y-6">
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">Preset Details</h3>
                <Input
                  label="Template Name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Untitled-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Width</label>
                  <input
                    type="number"
                    value={width}
                    disabled={sizeMode === 'preset' && createMode !== 'import'}
                    onChange={(e) => onChangeWidth(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-200 rounded disabled:bg-slate-50 disabled:text-slate-400 outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Height</label>
                  <input
                    type="number"
                    value={height}
                    disabled={sizeMode === 'preset' && createMode !== 'import'}
                    onChange={(e) => onChangeHeight(e.target.value)}
                    className="w-full mt-1 px-2 py-1.5 text-sm border border-slate-200 rounded disabled:bg-slate-50 disabled:text-slate-400 outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 bg-slate-50">
                <span className="text-xs text-slate-600">Link aspect ratio</span>
                <button
                  type="button"
                  disabled={createMode === 'import'}
                  onClick={() => setLockRatio((prev) => !prev)}
                  className={`w-10 h-6 rounded-full transition relative ${lockRatio || createMode === 'import' ? 'bg-slate-800' : 'bg-slate-300'} ${createMode === 'import' ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition ${lockRatio || createMode === 'import' ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
              </div>

              {createMode === 'import' && (
                <div className="animate-in fade-in zoom-in-95 duration-200">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">File Source</label>
                  <input
                    ref={baseSvgInputRef}
                    type="file"
                    accept=".svg,image/svg+xml"
                    onChange={(e) => onImportBaseSvg(e.target.files?.[0])}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => baseSvgInputRef.current?.click()}
                    className="w-full mt-1 px-3 py-2.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-sm text-slate-700 text-left"
                  >
                    {baseSvgMarkup ? 'Replace SVG File' : 'Choose SVG File'}
                  </button>
                  {baseSvgMarkup && (
                    <div className="mt-2 border border-slate-200 rounded-lg bg-slate-50 p-2 h-28 flex items-center justify-center overflow-hidden">
                      <div className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:block" dangerouslySetInnerHTML={{ __html: baseSvgMarkup }} />
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button 
              onClick={handleCreateTemplate} 
              loading={creating} 
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3"
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Cards;
