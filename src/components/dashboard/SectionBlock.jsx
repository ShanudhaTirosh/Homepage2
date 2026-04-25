/**
 * SectionBlock — Category section header with collapsible link grid.
 */
import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const SectionBlock = memo(function SectionBlock({
  category,
  linkCount,
  children,
  editMode,
  onAddLink,
  onEditCategory,
  onDeleteCategory,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Resolve category icon
  const renderCategoryIcon = () => {
    if (category.iconName) {
      const IconComp = LucideIcons[category.iconName];
      if (IconComp) return <IconComp size={16} />;
    }
    return <span>{category.emoji || '📁'}</span>;
  };

  return (
    <motion.div
      className="section-wrapper"
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Section Header */}
      <div className="section-header">
        <div className="section-icon">{renderCategoryIcon()}</div>
        <div className="section-info">
          <div className="section-title">{category.name}</div>
          {category.description && (
            <div className="section-description">{category.description}</div>
          )}
        </div>
        <span className="section-count">{linkCount}</span>

        <div className="section-actions">
          {/* Add link to this category */}
          <button
            className="section-action-btn"
            onClick={() => onAddLink(category.id)}
            title="Add link to this section"
            aria-label="Add link"
          >
            <Plus size={15} />
          </button>

          {/* Collapse toggle */}
          <button
            className="section-action-btn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand' : 'Collapse'}
            aria-label={collapsed ? 'Expand section' : 'Collapse section'}
          >
            <motion.span
              animate={{ rotate: collapsed ? -90 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex' }}
            >
              <ChevronDown size={15} />
            </motion.span>
          </button>

          {/* Edit mode: category menu */}
          {editMode && (
            <div className="section-menu-wrap">
              <button
                className="section-action-btn"
                onClick={() => setShowMenu(!showMenu)}
                title="Section options"
                aria-label="Section options"
              >
                <MoreHorizontal size={15} />
              </button>

              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    className="section-dropdown"
                    initial={{ opacity: 0, scale: 0.9, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -5 }}
                    transition={{ duration: 0.15 }}
                  >
                    <button onClick={() => { setShowMenu(false); onEditCategory(category); }}>
                      <Pencil size={14} />
                      <span>Edit Section</span>
                    </button>
                    <button className="danger" onClick={() => { setShowMenu(false); onDeleteCategory(category); }}>
                      <Trash2 size={14} />
                      <span>Delete Section</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Link Grid */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            className="section-links-grid"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export default SectionBlock;
