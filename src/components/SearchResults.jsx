import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, ShieldOff } from 'lucide-react';
import ResultTag from '@/components/ResultTag';

const SearchResults = ({ results, onBaja, onSuspend, title }) => {
  if (results.length === 0) {
    return null;
  }
  
  const Icon = title === 'TAGS Suspendidos' ? ShieldOff : Eye;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="mt-8"
      >
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-3 text-slate-800">
          <Icon className="w-6 h-6 text-primary" />
          {title}
        </h2>
        <motion.div
          layout
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {results.map((result, index) => (
            <ResultTag 
              key={`${result.IDSAE}-${result.Etiqueta}-${index}`} 
              result={result} 
              onBaja={onBaja}
              onSuspend={onSuspend}
            />
          ))}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SearchResults;