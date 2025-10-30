import React from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle } from 'lucide-react';
import Card from '../UI/Card';

interface GenerationProgressProps {
  progress: number;
  currentPhase: string;
  isGenerating: boolean;
}

const GenerationProgress: React.FC<GenerationProgressProps> = ({
  progress,
  currentPhase,
  isGenerating,
}) => {
  return (
    <Card>
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
          {isGenerating ? (
            <Clock size={20} className="text-blue-600" />
          ) : (
            <CheckCircle size={20} className="text-green-600" />
          )}
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Generation Progress
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {isGenerating ? 'Processing your newsletter...' : 'Generation completed'}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-300">Progress</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <motion.div
            className="h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Current Phase */}
      {currentPhase && (
        <div className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          {isGenerating && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
            />
          )}
          <p className="text-blue-700 dark:text-blue-200 font-medium">
            {currentPhase}
          </p>
        </div>
      )}

      {/* Estimated Time */}
      {isGenerating && (
        <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Estimated time remaining: {Math.max(1, Math.round((100 - progress) / 12))} minutes
          </p>
        </div>
      )}
    </Card>
  );
};

export default GenerationProgress;