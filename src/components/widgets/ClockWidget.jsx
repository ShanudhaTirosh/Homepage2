import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function ClockWidget() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <motion.div className="widget widget-clock" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}}>
      <div className="clock-time">
        {time.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
      </div>
      <div className="clock-date">
        {time.toLocaleDateString([], { weekday:'long', month:'long', day:'numeric' })}
      </div>
    </motion.div>
  );
}
