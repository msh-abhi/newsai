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
  Eye,
  FileText,
  ArrowRight,
  Save,
  RotateCcw as Reset,
} from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import GenerationForm from '../components/Generator/GenerationForm';
import GenerationProgress from '../components/Generator/GenerationProgress';
import GenerationLogs from '../components/Generator/GenerationLogs';
import SystemStatus from '../components/Generator/SystemStatus';
import NewsletterWorkflow from '../components/Generator/NewsletterWorkflow';
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
  const [showWorkflow, setShowWorkflow] = useState(true);

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
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`]);
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

  const handleViewNewsletter = () => {
    if (generatedNewsletterId) {
      navigate(`/app/preview/${generatedNewsletterId}`);
    }
  };

  const handleManageNewsletters = () => {
    navigate('/app/newsletters');
  };

  const handleWorkflowComplete = async (workflowData: any) => {
    const request = {
      topic: workflowData.topic,
      mode: workflowData.mode,
      instructions: workflowData.instructions,
      skip_research: workflowData.settings?.skipResearch || false,
      num_sections: workflowData.settings?.numSections || 4,
      section_length: workflowData.settings?.sectionLength || 'medium',
      include_images: workflowData.settings?.includeImages !== false,
      image_source: 'web',
      image_placement: 'header',
      include_events: workflowData.settings?.includeEvents !== false,
      include_knowledge: true,
      tone: workflowData.tone || undefined,
      style: workflowData.style || undefined,
      audience: workflowData.audience || undefined,
      context: workflowData.context || undefined,
      guide: workflowData.guide || undefined,
    };

    await handleGenerate(request);
    setShowWorkflow(false);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                AI Newsletter Generator
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2 text-lg">
                Create professional newsletters with our guided workflow
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {generatedNewsletterId && !isGenerating && (
                <>
                  <Button
                    variant="primary"
                    icon={Eye}
                    onClick={handleViewNewsletter}
                    size="md"
                  >
                    View Newsletter
                  </Button>
                  <Button
                    variant="outline"
                    icon={Edit}
                    onClick={handleEditNewsletter}
                    size="md"
                  >
                    Edit Newsletter
                  </Button>
                  <Button
                    variant="outline"
                    icon={FileText}
                    onClick={handleManageNewsletters}
                    size="md"
                  >
                    Manage Newsletters
                  </Button>
                </>
              )}
              {isGenerating && (
                <Button
                  variant="outline"
                  icon={Pause}
                  onClick={handleCancel}
                  size="md"
                >
                  Cancel Generation
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* System Status Card */}
        <SystemStatus
          researchProviders={researchProviders}
          generationProviders={generationProviders}
          knowledgeItems={knowledgeItems}
          eventSources={eventSources}
          isGenerating={isGenerating}
          progress={progress}
          currentPhase={currentPhase}
        />

        {/* Success Message */}
        {generatedNewsletterId && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                    <CheckCircle size={24} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-900 dark:text-green-200">
                      Newsletter Generated Successfully!
                    </h3>
                    <p className="text-green-700 dark:text-green-300">
                      Your newsletter is ready for review and distribution
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    icon={Eye}
                    onClick={handleViewNewsletter}
                    size="sm"
                  >
                    View Newsletter
                  </Button>
                  <Button
                    variant="outline"
                    icon={Edit}
                    onClick={handleEditNewsletter}
                    size="sm"
                  >
                    Edit & Customize
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Workflow or Generation Progress */}
        {showWorkflow && !isGenerating ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <NewsletterWorkflow
              onComplete={handleWorkflowComplete}
              disabled={generationProviders.length === 0}
            />
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Generation Progress */}
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

            {/* Generation Controls (when not showing workflow) */}
            {!isGenerating && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <Zap size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                          Quick Generation
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Generate newsletter using basic settings
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      icon={Reset}
                      onClick={() => setShowWorkflow(true)}
                      size="sm"
                    >
                      Use Guided Workflow
                    </Button>
                  </div>
                  <GenerationForm
                    onGenerate={handleGenerate}
                    disabled={isGenerating}
                  />
                </Card>
              </motion.div>
            )}
          </div>
        )}

        {/* Compact Generation Logs */}
        {logs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Generation Logs
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {logs.length} entries
                </span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-32 overflow-y-auto">
                <div className="space-y-1">
                  {logs.slice(-5).map((log, index) => (
                    <div key={index} className="text-sm font-mono text-gray-600 dark:text-gray-300">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default NewsletterGenerator;