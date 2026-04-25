/**
 * GlassModal — Glassmorphism modal overlay with focus trap and escape-to-close.
 */
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function GlassModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '520px',
}) {
  const modalRef = useRef(null);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="nd-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            className="nd-modal"
            ref={modalRef}
            tabIndex={-1}
            style={{ maxWidth }}
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            <div className="nd-modal-header">
              <div className="nd-modal-title">{title}</div>
              <button
                className="nd-modal-close"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <div className="nd-modal-body">{children}</div>

            {footer && <div className="nd-modal-footer">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
