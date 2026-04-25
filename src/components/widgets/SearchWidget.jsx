import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search as SearchIcon } from 'lucide-react';

export default function SearchWidget() {
  const [query, setQuery] = useState('');
  const [engine, setEngine] = useState('google');

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    const urls = {
      google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
    };
    window.open(urls[engine], '_blank', 'noopener');
    setQuery('');
  };

  return (
    <motion.div className="widget widget-search" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
      <form onSubmit={handleSearch} className="search-widget-form">
        <div className="search-widget-input-wrap">
          <SearchIcon size={16} className="search-widget-icon" />
          <input type="text" value={query} onChange={e=>setQuery(e.target.value)}
            placeholder="Search the web…" className="search-widget-input"
            aria-label="Search the web" id="web-search-input" />
        </div>
        <div className="search-engine-toggle">
          <button type="button" className={`engine-btn ${engine==='google'?'active':''}`}
            onClick={()=>setEngine('google')}>Google</button>
          <button type="button" className={`engine-btn ${engine==='duckduckgo'?'active':''}`}
            onClick={()=>setEngine('duckduckgo')}>DuckDuckGo</button>
        </div>
      </form>
    </motion.div>
  );
}
