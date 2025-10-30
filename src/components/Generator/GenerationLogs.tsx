import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Terminal } from 'lucide-react';
import Card from '../UI/Card';

interface GenerationLogsProps {
  logs: string[];
}

const GenerationLogs: React.FC<GenerationLogsProps> = ({ logs }) => {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <Card>
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <Terminal size={20} className="text-gray-600 dark:text-gray-300" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Generation Logs
        </h2>
      </div>

      <div className="bg-gray-900 dark:bg-black rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
        {logs.map((log, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="text-green-400 mb-1"
          >
            {log}
          </motion.div>
        ))}
        <div ref={logsEndRef} />
      </div>
    </Card>
  );
};

export default GenerationLogs;