import { useState, useMemo, useCallback } from 'react';
import { FixedSizeGrid } from 'react-window';
import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const EXCLUDED = new Set(['createLucideIcon','icons','default','createElement','toKebabCase','mergeClasses']);
const ALL_ICON_NAMES = Object.keys(LucideIcons).filter(
  (n) => !EXCLUDED.has(n) && typeof LucideIcons[n]==='function' && /^[A-Z]/.test(n)
);
const COLS = 8;
const CELL = 48;

export default function IconPicker({ onSelect, onClose, currentIcon }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_ICON_NAMES;
    const q = search.toLowerCase();
    return ALL_ICON_NAMES.filter((n) => n.toLowerCase().includes(q));
  }, [search]);
  const rows = Math.ceil(filtered.length / COLS);

  const Cell = useCallback(({ columnIndex, rowIndex, style }) => {
    const idx = rowIndex * COLS + columnIndex;
    if (idx >= filtered.length) return null;
    const name = filtered[idx];
    const IC = LucideIcons[name];
    return (
      <div style={style}>
        <button className={`icon-picker-item ${currentIcon===name?'selected':''}`}
          onClick={() => onSelect(name)} title={name} aria-label={name}>
          <IC size={20} />
        </button>
      </div>
    );
  }, [filtered, currentIcon, onSelect]);

  return (
    <motion.div className="icon-picker" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}}>
      <div className="icon-picker-header">
        <div className="icon-picker-search">
          <Search size={14} className="nd-input-icon" />
          <input type="text" placeholder="Search icons…" value={search}
            onChange={(e)=>setSearch(e.target.value)} className="nd-input nd-input-icon-pad nd-input-sm" autoFocus />
        </div>
        <button className="icon-picker-close" onClick={onClose} aria-label="Close"><X size={16}/></button>
      </div>
      <div className="icon-picker-count">{filtered.length} icons</div>
      <FixedSizeGrid columnCount={COLS} columnWidth={CELL} height={Math.min(rows*CELL,240)}
        rowCount={rows} rowHeight={CELL} width={COLS*CELL} className="icon-picker-grid">{Cell}</FixedSizeGrid>
      <button className="icon-picker-auto" onClick={()=>onSelect('auto')}>Use auto favicon</button>
    </motion.div>
  );
}
