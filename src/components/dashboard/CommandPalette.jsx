/**
 * CommandPalette — Spotlight-style search (⌘K)
 * Allows searching links, categories, and running commands.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, Command, Trash2, Pencil, ExternalLink } from 'lucide-react';
import { useDashboard } from '../../hooks/useLinks';
import { shortUrl } from '../../utils/helpers';

export default function CommandPalette({ isOpen, onClose }) {
  const { links, categories } = useDashboard();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  // Filter results
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const matchedLinks = links
      .filter(l => l.title.toLowerCase().includes(q) || l.url.toLowerCase().includes(q))
      .map(l => ({ ...l, type: 'link' }));

    const matchedCats = categories
      .filter(c => c.name.toLowerCase().includes(q))
      .map(c => ({ ...c, type: 'category' }));

    // Add a web search option
    const webSearch = { id: 'web-search', title: `Search Google for "${query}"`, type: 'search', url: `https://www.google.com/search?q=${encodeURIComponent(query)}` };

    return [...matchedLinks, ...matchedCats, webSearch].slice(0, 10);
  }, [query, links, categories]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) handleSelect(results[selectedIndex]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, results, selectedIndex, onClose]);

  const handleSelect = (item) => {
    if (item.type === 'link' || item.type === 'search') {
      window.open(item.url, '_blank');
    } else if (item.type === 'category') {
      // Maybe scroll to category?
      const el = document.getElementById(`section-${item.id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="nd-modal-backdrop" onClick={onClose} style={{ alignItems: 'flex-start', paddingTop: '10vh' }}>
      <motion.div
        className="command-palette"
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="palette-input-wrap">
          <Search size={20} className="palette-icon" />
          <input
            ref={inputRef}
            className="palette-input"
            placeholder="Search links, sections or type to search web…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="palette-results">
          {results.length > 0 ? (
            results.map((item, idx) => (
              <button
                key={item.id}
                className={`palette-item ${idx === selectedIndex ? 'active' : ''}`}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => handleSelect(item)}
              >
                <div className="item-icon-wrap">
                  {item.type === 'link' && <ExternalLink size={16} />}
                  {item.type === 'category' && <Command size={16} />}
                  {item.type === 'search' && <Globe size={16} />}
                </div>
                <div className="item-info">
                  <div className="item-title">{item.title || item.name}</div>
                  <div className="item-subtitle">
                    {item.type === 'link' ? shortUrl(item.url) : item.type === 'category' ? 'Section' : 'Search Web'}
                  </div>
                </div>
                {idx === selectedIndex && <div className="item-enter">↵ Enter</div>}
              </button>
            ))
          ) : query ? (
            <div className="palette-empty">No local results found. Press Enter to search web.</div>
          ) : (
            <div className="palette-tip">Start typing to search your dashboard…</div>
          )}
        </div>

        <div className="palette-footer">
          <div className="palette-footer-item">
            <kbd>↑↓</kbd> <span>to navigate</span>
          </div>
          <div className="palette-footer-item">
            <kbd>↵</kbd> <span>to select</span>
          </div>
          <div className="palette-footer-item">
            <kbd>esc</kbd> <span>to close</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
