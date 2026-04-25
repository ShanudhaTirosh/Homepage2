/**
 * LinkCard — Individual link tile with glassmorphism.
 * Shows icon (lucide or favicon), title, and optional category badge.
 * In edit mode: shows drag handle, edit, and delete buttons.
 */
import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, Pencil, Trash2, ExternalLink } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { getFaviconUrl, shortUrl } from '../../utils/helpers';

const LinkCard = memo(function LinkCard({ link, editMode, onEdit, onDelete, dragListeners, dragAttributes }) {
  const [imgError, setImgError] = useState(false);

  const handleClick = () => {
    if (editMode) return;
    window.open(link.url, link.openInNewTab !== false ? '_blank' : '_self', 'noopener,noreferrer');
  };

  // Resolve the icon
  const renderIcon = () => {
    // If user selected a lucide icon name
    if (link.iconName && link.iconName !== 'auto') {
      const IconComponent = LucideIcons[link.iconName];
      if (IconComponent) {
        return <IconComponent size={24} className="link-icon-svg" />;
      }
    }

    // Default: favicon from URL
    const faviconSrc = getFaviconUrl(link.url);
    if (faviconSrc && !imgError) {
      return (
        <img
          src={faviconSrc}
          alt=""
          width={24}
          height={24}
          loading="lazy"
          onError={() => setImgError(true)}
          className="link-icon-img"
        />
      );
    }

    // Fallback emoji
    return <span className="link-icon-emoji">🔗</span>;
  };

  return (
    <motion.div
      className={`link-card ${editMode ? 'edit-mode' : ''}`}
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      whileHover={editMode ? {} : { y: -4, scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={handleClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label={`${link.title} — ${shortUrl(link.url)}`}
    >
      {/* Drag handle (edit mode only) */}
      {editMode && (
        <div className="link-drag-handle" {...dragListeners} {...dragAttributes}>
          <GripVertical size={16} />
        </div>
      )}

      {/* Icon */}
      <div className="link-icon">
        {renderIcon()}
      </div>

      {/* Title */}
      <div className="link-title">{link.title}</div>

      {/* URL preview */}
      {!editMode && (
        <div className="link-url-preview">{shortUrl(link.url)}</div>
      )}

      {/* Edit mode actions */}
      {editMode && (
        <div className="link-actions">
          <button
            className="link-action-btn edit"
            onClick={(e) => { e.stopPropagation(); onEdit(link); }}
            aria-label={`Edit ${link.title}`}
            title="Edit"
          >
            <Pencil size={13} />
          </button>
          <button
            className="link-action-btn delete"
            onClick={(e) => { e.stopPropagation(); onDelete(link); }}
            aria-label={`Delete ${link.title}`}
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}

      {/* External link indicator */}
      {!editMode && (
        <div className="link-external-badge">
          <ExternalLink size={10} />
        </div>
      )}
    </motion.div>
  );
});

export default LinkCard;
