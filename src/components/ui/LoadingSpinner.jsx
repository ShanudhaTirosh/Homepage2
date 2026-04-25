/**
 * LoadingSpinner — Full-screen loading indicator with pulsing logo
 */
import { motion } from 'framer-motion';

export default function LoadingSpinner({ message = 'Loading NovaDash...' }) {
  return (
    <div className="loading-screen">
      <motion.div
        className="loading-logo"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="loading-logo-icon">🌌</span>
      </motion.div>
      <motion.p
        className="loading-text"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {message}
      </motion.p>
    </div>
  );
}
