import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Link2, Type, Globe, Tag, FolderPlus } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import GlassModal from '../ui/GlassModal';
import IconPicker from './IconPicker';
import { isValidUrl } from '../../utils/helpers';

export default function AddEditLinkModal({ isOpen, onClose, onSave, link, categories, onCreateCategory }) {
  const isEdit = !!link;
  const [title, setTitle] = useState(link?.title || '');
  const [url, setUrl] = useState(link?.url || '');
  const [description, setDescription] = useState(link?.description || '');
  const [categoryId, setCategoryId] = useState(link?.categoryId || categories[0]?.id || '');
  const [iconName, setIconName] = useState(link?.iconName || 'auto');
  const [openInNewTab, setOpenInNewTab] = useState(link?.openInNewTab !== false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    if (!url.trim() || !isValidUrl(url.trim())) { setError('A valid URL is required'); return; }
    setError('');
    setSaving(true);
    try {
      let finalCatId = categoryId;
      if (showNewCat && newCatName.trim()) {
        const ref = await onCreateCategory({ name: newCatName.trim(), order: categories.length });
        finalCatId = ref.id;
      }
      await onSave({
        ...(link || {}),
        title: title.trim(),
        url: url.trim(),
        description: description.trim(),
        categoryId: finalCatId,
        iconName: iconName === 'auto' ? '' : iconName,
        openInNewTab,
        order: link?.order ?? 999,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleUrlBlur = () => {
    if (url && !title) {
      try {
        const domain = new URL(url).hostname.replace('www.','');
        setTitle(domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1));
      } catch {}
    }
  };

  const footer = (
    <>
      <button className="btn-nd btn-nd-secondary" type="button" onClick={onClose}>Cancel</button>
      <button className="btn-nd btn-nd-primary" onClick={handleSubmit} disabled={saving}>
        {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Link'}
      </button>
    </>
  );

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title={isEdit ? '✏️ Edit Link' : '🔗 Add Link'} footer={footer}>
      <form onSubmit={handleSubmit}>
        {error && <div className="auth-error"><span>{error}</span></div>}

        <div className="nd-form-group">
          <label className="nd-label">Title</label>
          <div className="nd-input-wrap">
            <Type size={16} className="nd-input-icon" />
            <input className="nd-input nd-input-icon-pad" value={title} onChange={e=>setTitle(e.target.value)}
              placeholder="e.g. GitHub" maxLength={100} required id="link-title-input" />
          </div>
        </div>

        <div className="nd-form-group">
          <label className="nd-label">URL</label>
          <div className="nd-input-wrap">
            <Globe size={16} className="nd-input-icon" />
            <input className="nd-input nd-input-icon-pad" type="url" value={url}
              onChange={e=>setUrl(e.target.value)} onBlur={handleUrlBlur}
              placeholder="https://..." maxLength={2048} required id="link-url-input" />
          </div>
        </div>

        <div className="nd-form-row">
          <div className="nd-form-group" style={{flex:1}}>
            <label className="nd-label">Section</label>
            {showNewCat ? (
              <div className="nd-input-wrap">
                <FolderPlus size={16} className="nd-input-icon" />
                <input className="nd-input nd-input-icon-pad" value={newCatName}
                  onChange={e=>setNewCatName(e.target.value)} placeholder="New section name"
                  maxLength={50} id="new-category-input" />
              </div>
            ) : (
              <select className="nd-select" value={categoryId} onChange={e=>{
                if (e.target.value==='__new__') { setShowNewCat(true); }
                else setCategoryId(e.target.value);
              }} id="link-category-select">
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="__new__">+ Create New Section</option>
              </select>
            )}
          </div>

          <div className="nd-form-group" style={{flex:0}}>
            <label className="nd-label">Icon</label>
            <button type="button" className="icon-preview-btn" onClick={()=>setShowIconPicker(!showIconPicker)}
              title="Choose icon" id="icon-picker-trigger">
              {iconName==='auto'||!iconName ? '🔗' : (() => {
                const IC = LucideIcons[iconName];
                return IC ? <IC size={20}/> : '🔗';
              })()}
            </button>
          </div>
        </div>

        <AnimatePresence>{showIconPicker && (
          <IconPicker currentIcon={iconName} onSelect={n=>{setIconName(n);setShowIconPicker(false);}}
            onClose={()=>setShowIconPicker(false)} />
        )}</AnimatePresence>

        <div className="nd-form-group">
          <label className="nd-label">Description (optional)</label>
          <input className="nd-input" value={description} onChange={e=>setDescription(e.target.value)}
            placeholder="Short note about this link" maxLength={200} id="link-desc-input" />
        </div>

        <label className="nd-checkbox-label">
          <input type="checkbox" checked={openInNewTab} onChange={e=>setOpenInNewTab(e.target.checked)} />
          Open in new tab
        </label>
      </form>
    </GlassModal>
  );
}
