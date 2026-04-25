/**
 * CapsuleNavbar — Floating pill-shaped top navigation bar.
 * Contains: logo, search trigger, edit mode toggle, user menu, logout.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Settings, LogOut, Pencil, PenOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useEditMode } from '../../hooks/useEditMode';

export default function CapsuleNavbar({ onSearchClick }) {
  const { user, logout } = useAuth();
  const { editMode, toggleEditMode } = useEditMode();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
      setLoggingOut(false);
    }
  };

  const initial = user?.email?.charAt(0)?.toUpperCase() || '?';

  return (
    <motion.nav
      className="capsule-navbar"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay: 0.1 }}
    >
      {/* Logo */}
      <div className="navbar-brand">
        <div className="logo-mark">🌌</div>
        <div className="logo-text">
          Nova<span>Dash</span>
        </div>
      </div>

      {/* Search trigger */}
      <button
        className="nav-search-trigger"
        onClick={onSearchClick}
        aria-label="Search links"
        title="Search (Ctrl+K)"
      >
        <Search size={15} />
        <span>Search links…</span>
        <kbd>⌘K</kbd>
      </button>

      {/* Right actions */}
      <div className="navbar-actions">
        {/* Edit mode toggle */}
        <button
          className={`nav-icon-btn ${editMode ? 'active' : ''}`}
          onClick={toggleEditMode}
          title={editMode ? 'Exit edit mode' : 'Enter edit mode'}
          aria-label="Toggle edit mode"
          id="edit-mode-toggle"
        >
          {editMode ? <PenOff size={16} /> : <Pencil size={16} />}
        </button>

        {/* User avatar */}
        <div className="nav-user-pill">
          <div className="user-avatar" title={user?.email || ''}>
            {initial}
          </div>
        </div>

        {/* Logout */}
        <button
          className="nav-icon-btn"
          onClick={handleLogout}
          disabled={loggingOut}
          title="Sign out"
          aria-label="Sign out"
          id="logout-btn"
        >
          <LogOut size={16} />
        </button>
      </div>
    </motion.nav>
  );
}
