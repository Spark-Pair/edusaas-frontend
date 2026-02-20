import React, { useEffect, useMemo, useState } from 'react';
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
        <h1 className="text-xl font-semibold text-slate-800">Cards</h1>
        <p className="text-sm text-slate-500 mt-1">Select school, then create or use saved templates</p>
      </div>

      <Card className="mb-6">
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
            className="max-w-md"
          />
          <Button onClick={openCreateModal}>Create New Template</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {templates.map((template) => {
          const schoolName = template.tenantId?.schoolName || 'Unknown School';
          return (
            <Card key={template._id} className="flex flex-col">
              <div className="h-32 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500 text-xs px-3 text-center">
                {template.width} x {template.height}
              </div>
              <div className="mt-3">
                <p className="font-medium text-slate-800 text-sm">{template.name}</p>
                <p className="text-xs text-slate-500 mt-1">School: {schoolName}</p>
                <p className="text-xs text-slate-500">Updated: {new Date(template.updatedAt).toLocaleString()}</p>
              </div>
              <Button className="mt-4" onClick={() => handleUseTemplate(template)} disabled={!selectedTenant}>
                Use Template
              </Button>
            </Card>
          );
        })}
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Template"
        size="lg"
      >
        <div className="space-y-3">
          <Input
            label="Template Name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Enter template name"
          />

          <div>
            <label className="text-xs text-slate-500">Start With</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCreateMode('blank')}
                className={`px-3 py-2 rounded border text-sm ${createMode === 'blank' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-700'}`}
              >
                Blank Canvas
              </button>
              <button
                type="button"
                onClick={() => setCreateMode('import')}
                className={`px-3 py-2 rounded border text-sm ${createMode === 'import' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-700'}`}
              >
                Import Base SVG
              </button>
            </div>
          </div>

          {createMode === 'import' && (
            <div>
              <label className="text-xs text-slate-500">Base SVG</label>
              <input
                type="file"
                accept=".svg,image/svg+xml"
                onChange={(event) => onImportBaseSvg(event.target.files?.[0])}
                className="w-full mt-1 px-2 py-2 text-sm border border-slate-300 rounded-md bg-white"
              />
              {!baseSvgMarkup && (
                <p className="text-xs text-slate-500 mt-1">Upload an SVG to set canvas and background.</p>
              )}
            </div>
          )}

          <div>
            <label className="text-xs text-slate-500">Canvas Size</label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSizeMode('preset')}
                className={`px-3 py-2 rounded border text-sm ${sizeMode === 'preset' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-700'}`}
              >
                Preset
              </button>
              <button
                type="button"
                onClick={() => setSizeMode('custom')}
                className={`px-3 py-2 rounded border text-sm ${sizeMode === 'custom' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-300 text-slate-700'}`}
              >
                Custom
              </button>
            </div>
          </div>

          {sizeMode === 'preset' && (
            <Select
              value={selectedPreset}
              onChange={(e) => onPickPreset(e.target.value)}
              options={CARD_SIZE_PRESETS.map((item) => ({
                value: String(item.width * 10000 + item.height),
                label: item.label
              }))}
            />
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500">Width</label>
              <input
                type="number"
                min="20"
                value={width}
                onChange={(e) => onChangeWidth(e.target.value)}
                className="w-full mt-1 px-2 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500">Height</label>
              <input
                type="number"
                min="20"
                value={height}
                onChange={(e) => onChangeHeight(e.target.value)}
                className="w-full mt-1 px-2 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={lockRatio}
              onChange={(e) => setLockRatio(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300"
            />
            Maintain aspect ratio
          </label>

          <Button onClick={handleCreateTemplate} loading={creating} className="w-full">
            Create Template
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Cards;
