/**
 * GlassCard — Reusable glassmorphism card component
 */
import { motion } from 'framer-motion';

export default function GlassCard({ children, className = '', hover = true, onClick, style }) {
  return (
    <motion.div
      className={`glass-card ${className}`}
      onClick={onClick}
      style={style}
      whileHover={hover ? { y: -2, scale: 1.01 } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {children}
    </motion.div>
  );
}
