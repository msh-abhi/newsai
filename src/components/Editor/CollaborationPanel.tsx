import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare,
  Users,
  Clock,
  Send,
  Plus,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';

interface CollaborationPanelProps {
  draftId: string;
}

const CollaborationPanel: React.FC<CollaborationPanelProps> = ({ draftId }) => {
  const [activeTab, setActiveTab] = useState<'comments' | 'activity' | 'team'>('comments');
  const [newComment, setNewComment] = useState('');

  const comments = [
    {
      id: '1',
      user: 'Sarah Johnson',
      avatar: 'SJ',
      content: 'The healthcare section looks great! Maybe we could add more specific examples?',
      section: 'Healthcare Innovation',
      created_at: '2024-01-15T14:30:00Z',
      resolved: false,
    },
    {
      id: '2',
      user: 'Mike Chen',
      avatar: 'MC',
      content: 'Updated the AI statistics with latest data from our research team.',
      section: null,
      created_at: '2024-01-15T13:45:00Z',
      resolved: true,
    },
  ];

  const activity = [
    {
      id: '1',
      user: 'Sarah Johnson',
      action: 'edited the "Healthcare Innovation" section',
      timestamp: '2024-01-15T14:30:00Z',
    },
    {
      id: '2',
      user: 'Mike Chen',
      action: 'added a comment on "Healthcare Innovation"',
      timestamp: '2024-01-15T13:45:00Z',
    },
    {
      id: '3',
      user: 'You',
      action: 'created the newsletter draft',
      timestamp: '2024-01-15T10:00:00Z',
    },
  ];

  const teamMembers = [
    {
      id: '1',
      name: 'Sarah Johnson',
      role: 'Editor',
      status: 'online',
      avatar: 'SJ',
    },
    {
      id: '2',
      name: 'Mike Chen',
      role: 'Reviewer',
      status: 'away',
      avatar: 'MC',
    },
  ];

  const tabs = [
    { id: 'comments', name: 'Comments', icon: MessageSquare, count: 2 },
    { id: 'activity', name: 'Activity', icon: Clock, count: 3 },
    { id: 'team', name: 'Team', icon: Users, count: 2 },
  ];

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    // TODO: Add comment
    setNewComment('');
  };

  return (
    <Card className="h-fit">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Collaboration
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center space-x-1 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon size={14} />
              <span>{tab.name}</span>
              {tab.count > 0 && (
                <span className="bg-gray-200 dark:bg-gray-600 text-xs px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'comments' && (
          <>
            {/* Add Comment */}
            <div className="space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white resize-none text-sm"
              />
              <Button
                variant="primary"
                size="sm"
                icon={Send}
                onClick={handleAddComment}
                className="w-full"
              >
                Add Comment
              </Button>
            </div>

            {/* Comments List */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {comments.map((comment) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {comment.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-white text-sm">
                          {comment.user}
                        </span>
                        {comment.resolved ? (
                          <CheckCircle size={14} className="text-green-600" />
                        ) : (
                          <AlertCircle size={14} className="text-orange-600" />
                        )}
                      </div>
                      {comment.section && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                          On: {comment.section}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {comment.content}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        {new Date(comment.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {activity.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <Clock size={16} className="text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">{item.user}</span> {item.action}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-3">
            {teamMembers.map((member) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                      {member.avatar}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                      member.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {member.name}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {member.role}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  member.status === 'online' 
                    ? 'text-green-700 bg-green-100 dark:text-green-200 dark:bg-green-900'
                    : 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-600'
                }`}>
                  {member.status}
                </span>
              </motion.div>
            ))}

            <Button variant="outline" size="sm" icon={Plus} className="w-full">
              Invite Team Member
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default CollaborationPanel;