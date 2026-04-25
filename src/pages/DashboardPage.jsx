import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';
import CapsuleNavbar from '../components/layout/CapsuleNavbar';
import LinkGrid from '../components/dashboard/LinkGrid';
import AddEditLinkModal from '../components/modals/AddEditLinkModal';
import GlassModal from '../components/ui/GlassModal';
import ClockWidget from '../components/widgets/ClockWidget';
import WeatherWidget from '../components/widgets/WeatherWidget';
import SearchWidget from '../components/widgets/SearchWidget';
import NotesWidget from '../components/widgets/NotesWidget';
import CommandPalette from '../components/dashboard/CommandPalette';
import { useAuth } from '../hooks/useAuth';
import { useDashboard } from '../hooks/useLinks';
import { useEditMode } from '../hooks/useEditMode';
import { DashboardProvider } from '../context/DashboardContext';
import { EditModeProvider } from '../context/EditModeContext';

function DashboardContent() {
  const { user } = useAuth();
  const { categories, addLink, updateLink, deleteLink, addCategory, deleteCategory } = useDashboard();
  const { enableEditMode } = useEditMode();

  const [linkModal, setLinkModal] = useState({ open: false, link: null, categoryId: null });
  const [catModal, setCatModal] = useState({ open: false, category: null });
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null, type: null });
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catEmoji, setCatEmoji] = useState('📁');

  // Keyboard shortcut for Command Palette
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const openAddLink = useCallback((categoryId) => {
    enableEditMode();
    setLinkModal({ open: true, link: null, categoryId });
  }, [enableEditMode]);

  const openEditLink = useCallback((link) => {
    setLinkModal({ open: true, link, categoryId: link.categoryId });
  }, []);

  const handleSaveLink = useCallback(async (data) => {
    if (data.id) {
      await updateLink(data.id, data);
      toast.success('Link updated ✓');
    } else {
      await addLink(data);
      toast.success('Link added ✓');
    }
  }, [addLink, updateLink]);

  const openDeleteLink = useCallback((link) => {
    setDeleteModal({ open: true, item: link, type: 'link' });
  }, []);

  const openAddCategory = useCallback(() => {
    setCatName('');
    setCatEmoji('📁');
    setCatModal({ open: true, category: null });
  }, []);

  const openEditCategory = useCallback((cat) => {
    setCatName(cat.name);
    setCatEmoji(cat.emoji || '📁');
    setCatModal({ open: true, category: cat });
  }, []);

  const openDeleteCategory = useCallback((cat) => {
    setDeleteModal({ open: true, item: cat, type: 'category' });
  }, []);

  const handleSaveCategory = useCallback(async () => {
    if (!catName.trim()) { toast.error('Name required'); return; }
    if (catModal.category) {
      const { updateCategory } = await import('../firebase/firestore');
      await updateCategory(user.uid, catModal.category.id, { name: catName.trim(), emoji: catEmoji });
      toast.success('Section updated ✓');
    } else {
      await addCategory({ name: catName.trim(), emoji: catEmoji, order: categories.length });
      toast.success('Section created ✓');
    }
    setCatModal({ open: false, category: null });
  }, [catName, catEmoji, catModal.category, addCategory, categories.length, user?.uid]);

  const handleDelete = useCallback(async () => {
    if (deleteModal.type === 'link') {
      await deleteLink(deleteModal.item.id);
      toast.success('Link deleted');
    } else {
      await deleteCategory(deleteModal.item.id);
      toast.success('Section deleted');
    }
    setDeleteModal({ open: false, item: null, type: null });
  }, [deleteModal, deleteLink, deleteCategory]);

  return (
    <div className="dashboard-page" data-theme="midnight">
      <div className="bg-orbs"><div className="orb orb-1" /><div className="orb orb-2" /></div>

      <CapsuleNavbar onSearchClick={() => setIsPaletteOpen(true)} />

      <div className="widget-zone">
        <ClockWidget />
        <WeatherWidget />
        <SearchWidget />
        <NotesWidget uid={user?.uid} />
      </div>

      <main className="dash-content" id="dashboard-main">
        <LinkGrid
          onAddLink={openAddLink}
          onEditLink={openEditLink}
          onDeleteLink={openDeleteLink}
          onAddCategory={openAddCategory}
          onEditCategory={openEditCategory}
          onDeleteCategory={openDeleteCategory}
        />
      </main>

      <AnimatePresence>
        {isPaletteOpen && (
          <CommandPalette
            isOpen={isPaletteOpen}
            onClose={() => setIsPaletteOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Add/Edit Link Modal */}
      <AddEditLinkModal
        isOpen={linkModal.open}
        onClose={() => setLinkModal({ open: false, link: null, categoryId: null })}
        onSave={handleSaveLink}
        link={linkModal.link ? { ...linkModal.link, categoryId: linkModal.categoryId } : null}
        categories={categories}
        onCreateCategory={addCategory}
      />

      {/* Add/Edit Category Modal */}
      <GlassModal
        isOpen={catModal.open}
        onClose={() => setCatModal({ open: false, category: null })}
        title={catModal.category ? '✏️ Edit Section' : '📂 New Section'}
        footer={<>
          <button className="btn-nd btn-nd-secondary" onClick={() => setCatModal({ open: false, category: null })}>Cancel</button>
          <button className="btn-nd btn-nd-primary" onClick={handleSaveCategory}>
            {catModal.category ? 'Save' : 'Create'}
          </button>
        </>}
      >
        <div className="nd-form-group">
          <label className="nd-label">Name</label>
          <input className="nd-input" value={catName} onChange={e => setCatName(e.target.value)}
            placeholder="e.g. Work, Gaming…" maxLength={50} id="category-name-input" />
        </div>
        <div className="nd-form-group">
          <label className="nd-label">Emoji</label>
          <input className="nd-input" value={catEmoji} onChange={e => setCatEmoji(e.target.value)}
            placeholder="📁" maxLength={2} style={{ fontSize: '1.5rem', width: '4rem' }} id="category-emoji-input" />
        </div>
      </GlassModal>

      {/* Delete Confirm Modal */}
      <GlassModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, item: null, type: null })}
        title="⚠️ Confirm Delete"
        footer={<>
          <button className="btn-nd btn-nd-secondary" onClick={() => setDeleteModal({ open: false, item: null, type: null })}>Cancel</button>
          <button className="btn-nd btn-nd-danger" onClick={handleDelete}>Delete</button>
        </>}
      >
        <p style={{ color: 'var(--text-secondary)' }}>
          {deleteModal.type === 'link'
            ? `Delete "${deleteModal.item?.title}"? This cannot be undone.`
            : `Delete section "${deleteModal.item?.name}" and all its links? This cannot be undone.`}
        </p>
      </GlassModal>

      <Toaster position="bottom-right" toastOptions={{
        style: { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', borderRadius: 'var(--radius-md)' }
      }} />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <DashboardProvider uid={user?.uid}>
      <EditModeProvider>
        <DashboardContent />
      </EditModeProvider>
    </DashboardProvider>
  );
}
