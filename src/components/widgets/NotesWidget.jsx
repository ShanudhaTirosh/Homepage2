import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { StickyNote } from 'lucide-react';
import { saveQuickNotes, subscribeQuickNotes } from '../../firebase/rtdb';

export default function NotesWidget({ uid }) {
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(true);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeQuickNotes(uid, (val) => setContent(val || ''));
    return unsub;
  }, [uid]);

  const handleChange = useCallback((e) => {
    const val = e.target.value;
    setContent(val);
    setSaved(false);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (uid) { await saveQuickNotes(uid, val); setSaved(true); }
    }, 800);
  }, [uid]);

  return (
    <motion.div className="widget widget-notes" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
      <div className="widget-header">
        <StickyNote size={14} />
        <span>Quick Notes</span>
        <span className="notes-save-status">{saved ? '✓ Saved' : '● Saving…'}</span>
      </div>
      <textarea className="notes-textarea" value={content} onChange={handleChange}
        placeholder="Type your notes here… (auto-saved)" rows={5}
        aria-label="Quick notes" id="quick-notes-textarea" />
    </motion.div>
  );
}
