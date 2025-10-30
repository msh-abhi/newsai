import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Clock,
  CheckCircle,
  AlertTriangle,
  Edit,
} from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import GenerationForm from '../components/Generator/GenerationForm';
import GenerationProgress from '../components/Generator/GenerationProgress';
import GenerationLogs from '../components/Generator/GenerationLogs';
import { aiService } from '../services/aiService';
import { useAuthStore } from '../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase'; // Make sure this is imported

const NewsletterGenerator: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrganization } = useAuthStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationRequest, setGenerationRequest] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [generatedNewsletterId, setGeneratedNewsletterId] = useState<string | null>(null);

  // Check system readiness
  const { data: researchProviders = [] } = useQuery({
    queryKey: ['ai-providers', 'research', currentOrganization?.id],
    queryFn: () => currentOrganization ? aiService.getProviders(currentOrganization.id, 'research') : [],
    enabled: !!currentOrganization,
  });

  const { data: generationProviders = [] } = useQuery({
    queryKey: ['ai-providers', 'generation', currentOrganization?.id],
    queryFn: () => currentOrganization ? aiService.getProviders(currentOrganization.id, 'generation') : [],
    enabled: !!currentOrganization,
  });

  const { data: knowledgeItems = [] } = useQuery({
    queryKey: ['knowledge', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      const { data, error } = await supabase.from('knowledge_items').select('id').eq('organization_id', currentOrganization.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization,
  });

  const { data: eventSources = [] } = useQuery({
    queryKey: ['event-sources', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization) return [];
      const { data, error } = await supabase.from('event_sources').select('id').eq('organization_id', currentOrganization.id).eq('is_active', true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentOrganization,
  });

  const handleGenerate = async (request: any) => {
    if (!currentOrganization) {
      toast.error('No organization selected');
      return;
    }

    setIsGenerating(true);
    setGenerationRequest(request);
    setProgress(0);
    setLogs([]);
    setGeneratedNewsletterId(null);

    try {
      const newsletter = await aiService.generateNewsletter(
        currentOrganization.id,
        request,
        (progressValue, phase) => {
          setProgress(progressValue);
          setCurrentPhase(phase);
          setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${phase}`]);
        }
      );

      setGeneratedNewsletterId(newsletter.id);
      setCurrentPhase('Generation completed successfully!');
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Newsletter ready for review`]);
      
      toast.success('Newsletter generated successfully!');
    } catch (error) {
      console.error('Generation error:', error);
      setCurrentPhase('Generation failed');
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error: ${error.message}`]);
      toast.error('Failed to generate newsletter. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    setIsGenerating(false);
    setProgress(0);
    setCurrentPhase('');
    setLogs([]);
    setGeneratedNewsletterId(null);
  };

  const handleEditNewsletter = () => {
    if (generatedNewsletterId) {
      navigate(`/app/editor/${generatedNewsletterId}`);
    }
  };

  if (!currentOrganization) {
    return (
      <div className="space-y-8">
        <Card className="text-center">
          <AlertTriangle size={48} className="mx-auto text-orange-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Organization Selected
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            Please create or select an organization to generate newsletters.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Newsletter Generator
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Create AI-powered newsletters with your content and branding
            </p>
          </div>
          <div className="flex space-x-3">
            {generatedNewsletterId && !isGenerating && (
              <Button
                variant="primary"
                icon={Edit}
                onClick={handleEditNewsletter}
              >
                Edit Newsletter
              </Button>
            )}
            {isGenerating && (
              <Button
                variant="outline"
                icon={Pause}
                onClick={handleCancel}
              >
                Cancel Generation
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Generation Form */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card>
              <div className="flex items-center space-x-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Zap size={20} className="text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Generate Newsletter
                </h2>
              </div>

              <GenerationForm
                onGenerate={handleGenerate}
                disabled={isGenerating}
              />
            </Card>
          </motion.div>
        </div>

        {/* Progress and Logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress */}
          {(isGenerating || progress > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <GenerationProgress
                progress={progress}
                currentPhase={currentPhase}
                isGenerating={isGenerating}
              />
            </motion.div>
          )}

          {/* Generation Logs */}
          {logs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <GenerationLogs logs={logs} />
            </motion.div>
          )}

          {/* Status Cards */}
          {!isGenerating && progress === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="grid md:grid-cols-3 gap-4"
            >
              <Card className="text-center">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 ${
                  generationProviders.length > 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'
                }`}>
                  {generationProviders.length > 0 ? (
                    <CheckCircle size={24} className="text-green-600" />
                  ) : (
                    <AlertTriangle size={24} className="text-red-600" />
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  AI Models Ready
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {generationProviders.length + researchProviders.length} models configured
                </p>
              </Card>

              <Card className="text-center">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-3 ${
                  eventSources.length > 0 ? 'bg-orange-100 dark:bg-orange-900' : 'bg-red-100 dark:bg-red-900'
                }`}>
                  {knowledgeItems.length > 0 ? (
                    <CheckCircle size={24} className="text-blue-600" />
                  ) : (
                    <CheckCircle size={24} className="text-orange-600" />
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Knowledge Base
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {knowledgeItems.length} items indexed
                </p>
              </Card>

              <Card className="text-center">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle size={24} className="text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Event Sources
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {eventSources.length} sources configured
                </p>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsletterGenerator;