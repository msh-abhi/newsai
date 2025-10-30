import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import Button from '../UI/Button';
import { useEvents } from '../../hooks/useEvents';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';

interface AddEventSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AddEventSourceModal: React.FC<AddEventSourceModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [keywords, setKeywords] = useState(['autism', 'sensory', 'inclusive']);
  const [newKeyword, setNewKeyword] = useState('');
  const [city, setCity] = useState('Miami');
  const [state, setState] = useState('FL');
  const [radius, setRadius] = useState(25);
  const [saving, setSaving] = useState(false);
  
  const { currentOrganization } = useAuthStore();
  const { createEventSource } = useEvents();

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim().toLowerCase())) {
      setKeywords([...keywords, newKeyword.trim().toLowerCase()]);
      setNewKeyword('');
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setKeywords(keywords.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!currentOrganization) {
      toast.error('No organization selected');
      return;
    }

    if (!name.trim() || !url.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (keywords.length === 0) {
      toast.error('Please add at least one filter keyword');
      return;
    }

    try {
      new URL(url.trim());
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setSaving(true);
    try {
      await createEventSource.mutateAsync({
        organization_id: currentOrganization.id,
        name: name.trim(),
        url: url.trim(),
        keywords,
        location: {
          city: city.trim(),
          state: state.trim(),
          radius,
        },
        scraping_config: {
          selector: '.event, .calendar-event, [class*="event"]',
          title_selector: 'h2, h3, .title, .event-title',
          date_selector: '.date, .when, [class*="date"], .event-date',
          location_selector: '.location, .where, [class*="location"], .event-location',
          link_selector: 'a',
        },
        performance_metrics: {},
        is_active: true,
      });

      // Reset form
      setName('');
      setUrl('');
      setKeywords(['autism', 'sensory', 'inclusive']);
      setNewKeyword('');
      setCity('Miami');
      setState('FL');
      setRadius(25);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Event source save error:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                    Add Event Source
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                  {/* Basic Info */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Source Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Miami Children's Museum"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Website URL
                    </label>
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://example.com/events"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  {/* Keywords */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Filter Keywords
                    </label>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded-full"
                          >
                            {keyword}
                            <button
                              type="button"
                              onClick={() => handleRemoveKeyword(index)}
                              className="ml-2 text-blue-600 hover:text-blue-800"
                            >
                              <Trash2 size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                          placeholder="Add keyword..."
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          icon={Plus}
                          onClick={handleAddKeyword}
                          disabled={!newKeyword.trim()}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Events will be filtered to include only those matching these keywords
                    </p>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Location Filter
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                      />
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="State"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                      />
                      <input
                        type="number"
                        value={radius}
                        onChange={(e) => setRadius(parseInt(e.target.value) || 25)}
                        placeholder="Radius"
                        min="1"
                        max="100"
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Geographic area to focus event collection (radius in miles)
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      className="flex-1"
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      icon={Save}
                      loading={saving}
                      className="flex-1"
                    >
                      Create Source
                    </Button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default AddEventSourceModal;