import React from 'react';
import { motion } from 'framer-motion';

export const FullScreenPlayer = ({ onClose }: { onClose: () => void }) => {
  return (
    <motion.div
      className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center p-4"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      onDragEnd={(e, info) => {
        if (info.offset.y > 100) onClose();
      }}
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-white p-2">Close</button>
      <div className="w-64 h-64 bg-gray-800 rounded-md mb-8"></div>
      <div className="text-white text-2xl font-bold">Now Playing</div>
    </motion.div>
  );
};
