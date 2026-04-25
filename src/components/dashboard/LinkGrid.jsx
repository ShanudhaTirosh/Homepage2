/**
 * LinkGrid — The main dashboard grid that organizes links by category.
 * Supports @dnd-kit drag-and-drop reordering in edit mode.
 */
import { useState, useMemo, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Plus, FolderPlus } from 'lucide-react';
import LinkCard from './LinkCard';
import SectionBlock from './SectionBlock';
import { useDashboard } from '../../hooks/useLinks';
import { useEditMode } from '../../hooks/useEditMode';
import { useAuth } from '../../hooks/useAuth';
import { seedUserDashboard } from '../../utils/seedData';
import { toast } from 'react-hot-toast';
import { Sparkles } from 'lucide-react';

// ═══════════════════════════════════════════
// SORTABLE LINK WRAPPER
// ═══════════════════════════════════════════
function SortableLinkCard({ link, editMode, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <LinkCard
        link={link}
        editMode={editMode}
        onEdit={onEdit}
        onDelete={onDelete}
        dragListeners={listeners}
        dragAttributes={attributes}
      />
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN LINK GRID
// ═══════════════════════════════════════════
export default function LinkGrid({
  onAddLink,
  onEditLink,
  onDeleteLink,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}) {
  const { links, categories, reorderLinks } = useDashboard();
  const { editMode, enableEditMode } = useEditMode();
  const { user } = useAuth();
  const [seeding, setSeeding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleSeed = async () => {
    if (!user?.uid || seeding) return;
    setSeeding(true);
    const tid = toast.loading('Building your universe...');
    try {
      await seedUserDashboard(user.uid);
      toast.success('Developer dashboard ready!', { id: tid });
    } catch (err) {
      console.error('Seed error:', err);
      toast.error('Failed to populate dashboard', { id: tid });
    } finally {
      setSeeding(false);
    }
  };

  // Group links by category
  const groupedLinks = useMemo(() => {
    const map = {};
    categories.forEach((cat) => {
      map[cat.id] = links
        .filter((l) => l.categoryId === cat.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    });
    // Uncategorized links
    const uncategorized = links.filter(
      (l) => !l.categoryId || !categories.find((c) => c.id === l.categoryId)
    );
    if (uncategorized.length > 0) {
      map['__uncategorized__'] = uncategorized;
    }
    return map;
  }, [links, categories]);

  // Handle drag end — reorder within section
  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Find the section containing the active item
      for (const catLinks of Object.values(groupedLinks)) {
        const oldIndex = catLinks.findIndex((l) => l.id === active.id);
        const newIndex = catLinks.findIndex((l) => l.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = [...catLinks];
          const [moved] = reordered.splice(oldIndex, 1);
          reordered.splice(newIndex, 0, moved);
          const orderedItems = reordered.map((l, i) => ({
            id: l.id,
            order: i,
          }));
          reorderLinks(orderedItems);
          break;
        }
      }
    },
    [groupedLinks, reorderLinks]
  );

  // Empty state
  if (categories.length === 0 && links.length === 0) {
    return (
      <motion.div
        className="empty-dashboard"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="empty-icon">🌌</div>
        <h2 className="empty-title">Your universe awaits</h2>
        <p className="empty-desc">
          Start fresh or instantly populate your dashboard with common developer tools and documentation.
        </p>
        <div className="empty-actions">
          <button
            className="btn-nd btn-nd-secondary"
            onClick={() => { enableEditMode(); onAddCategory(); }}
            id="first-category-btn"
          >
            <FolderPlus size={16} />
            <span>Create First Section</span>
          </button>
          
          <button
            className="btn-nd btn-nd-primary"
            onClick={handleSeed}
            disabled={seeding}
            id="seed-dashboard-btn"
          >
            <Sparkles size={16} />
            <span>{seeding ? 'Populating...' : 'Populate Developer Sites'}</span>
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="dashboard-grid">
        {/* Render each category */}
        {categories.map((cat) => {
          const catLinks = groupedLinks[cat.id] || [];
          return (
            <SectionBlock
              key={cat.id}
              category={cat}
              linkCount={catLinks.length}
              editMode={editMode}
              onAddLink={(catId) => { enableEditMode(); onAddLink(catId); }}
              onEditCategory={onEditCategory}
              onDeleteCategory={onDeleteCategory}
            >
              <SortableContext
                items={catLinks.map((l) => l.id)}
                strategy={rectSortingStrategy}
              >
                <div className="links-grid">
                  {catLinks.map((link) => (
                    <SortableLinkCard
                      key={link.id}
                      link={link}
                      editMode={editMode}
                      onEdit={onEditLink}
                      onDelete={onDeleteLink}
                    />
                  ))}

                  {/* Add link card (edit mode) */}
                  {editMode && (
                    <motion.button
                      className="link-card add-card"
                      onClick={() => onAddLink(cat.id)}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.05 }}
                      aria-label="Add new link"
                    >
                      <Plus size={24} />
                      <span>Add Link</span>
                    </motion.button>
                  )}
                </div>
              </SortableContext>
            </SectionBlock>
          );
        })}

        {/* Uncategorized links */}
        {groupedLinks['__uncategorized__']?.length > 0 && (
          <SectionBlock
            category={{ id: '__uncategorized__', name: 'Uncategorized', emoji: '📌' }}
            linkCount={groupedLinks['__uncategorized__'].length}
            editMode={editMode}
            onAddLink={() => onAddLink(null)}
            onEditCategory={() => {}}
            onDeleteCategory={() => {}}
          >
            <div className="links-grid">
              {groupedLinks['__uncategorized__'].map((link) => (
                <LinkCard
                  key={link.id}
                  link={link}
                  editMode={editMode}
                  onEdit={onEditLink}
                  onDelete={onDeleteLink}
                />
              ))}
            </div>
          </SectionBlock>
        )}

        {/* Add section button (edit mode) */}
        {editMode && (
          <motion.button
            className="add-section-btn"
            onClick={onAddCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
          >
            <FolderPlus size={16} />
            <span>Add New Section</span>
          </motion.button>
        )}
      </div>
    </DndContext>
  );
}
