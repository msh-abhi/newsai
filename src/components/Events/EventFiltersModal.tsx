import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Settings } from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import { eventService } from '../../services/eventService';
import { useAuthStore } from '../../stores/authStore';

interface EventFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

const EventFiltersModal: React.FC<EventFiltersModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const { currentOrganization } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [filters, setFilters] = useState({
    is_filtering_enabled: true,
    filter_keywords: [
      'sensory-friendly', 'sensory', 'adaptive', 'inclusive',
      'autism-friendly', 'disabilities-accessible', 'autism',
      'special needs', 'accessible', 'disabilities'
    ],
    custom_filters: [] as string[]
  });

  // Load current filters on open
  useEffect(() => {
    if (isOpen && currentOrganization?.id) {
      loadFilters();
    }
  }, [isOpen, currentOrganization?.id]);

  const loadFilters = async () => {
    if (!currentOrganization?.id) return;

    setIsLoading(true);
    try {
      const currentFilters = await eventService.getEventFilters(currentOrganization.id);
      if (currentFilters) {
        setFilters({
          is_filtering_enabled: currentFilters.is_filtering_enabled,
          filter_keywords: currentFilters.filter_keywords,
          custom_filters: currentFilters.custom_filters
        });
      }
    } catch (error) {
      console.error('Error loading filters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentOrganization?.id) return;

    setIsSaving(true);
    try {
      await eventService.createOrUpdateEventFilters(currentOrganization.id, filters);
      onSave?.();
      onClose();
    } catch (error) {
      console.error('Error saving filters:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addCustomFilter = () => {
    setFilters(prev => ({
      ...prev,
      custom_filters: [...prev.custom_filters, '']
    }));
  };

  const updateCustomFilter = (index: number, value: string) => {
    setFilters(prev => ({
      ...prev,
      custom_filters: prev.custom_filters.map((filter, i) =>
        i === index ? value : filter
      )
    }));
  };

  const removeCustomFilter = (index: number) => {
    setFilters(prev => ({
      ...prev,
      custom_filters: prev.custom_filters.filter((_, i) => i !== index)
    }));
  };

  const toggleFiltering = () => {
    setFilters(prev => ({
      ...prev,
      is_filtering_enabled: !prev.is_filtering_enabled
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Event Filters</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading filters...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Enable/Disable Filtering */}
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">Enable Event Filtering</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      When enabled, only events matching your keywords will be shown
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.is_filtering_enabled}
                      onChange={toggleFiltering}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </Card>

              {/* Default Keywords */}
              <Card className="p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Default Keywords</h3>
                <p className="text-sm text-gray-600 mb-4">
                  These accessibility keywords are automatically included:
                </p>
                <div className="flex flex-wrap gap-2">
                  {filters.filter_keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  These cannot be modified as they represent core accessibility terms.
                </p>
              </Card>

              {/* Custom Keywords */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Custom Keywords</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Plus}
                    onClick={addCustomFilter}
                  >
                    Add Keyword
                  </Button>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Add your own keywords to filter events (e.g., specific locations, activities):
                </p>

                {filters.custom_filters.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <p>No custom keywords added yet.</p>
                    <p className="text-sm mt-1">Click "Add Keyword" to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filters.custom_filters.map((filter, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={filter}
                          onChange={(e) => updateCustomFilter(index, e.target.value)}
                          placeholder="Enter keyword..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Trash2}
                          onClick={() => removeCustomFilter(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Filter Statistics */}
              <Card className="p-4 bg-gray-50">
                <h3 className="font-semibold text-gray-900 mb-2">Filter Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className={`ml-2 font-medium ${filters.is_filtering_enabled ? 'text-green-600' : 'text-red-600'}`}>
                      {filters.is_filtering_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Keywords:</span>
                    <span className="ml-2 font-medium">
                      {filters.filter_keywords.length + filters.custom_filters.filter(f => f.trim()).length}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={Save}
            loading={isSaving}
            onClick={handleSave}
          >
            Save Filters
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EventFiltersModal;
