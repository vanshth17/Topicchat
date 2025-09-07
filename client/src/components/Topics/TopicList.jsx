import React, { useState } from 'react';
import { useTopic } from '../../contexts/TopicContext';
import { useAuth } from '../../contexts/AuthContext';
import CreateTopicModal from './CreateTopicModal';
import './Topics.css';

function TopicList() {
  const { topics, joinTopic, leaveTopic, deleteTopic, selectTopic, loading, currentTopic } = useTopic();
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  const handleJoinTopic = async (topicId) => {
    setActionLoading(prev => ({ ...prev, [topicId]: 'joining' }));
    const result = await joinTopic(topicId);
    
    if (!result.success) {
      alert(result.message);
    }
    
    setActionLoading(prev => ({ ...prev, [topicId]: null }));
  };

  const handleLeaveTopic = async (topicId) => {
    if (window.confirm('Are you sure you want to leave this topic?')) {
      setActionLoading(prev => ({ ...prev, [topicId]: 'leaving' }));
      const result = await leaveTopic(topicId);
      
      if (!result.success) {
        alert(result.message);
      }
      
      setActionLoading(prev => ({ ...prev, [topicId]: null }));
    }
  };

  const handleDeleteTopic = async (topicId) => {
    if (window.confirm('Are you sure you want to delete this topic? This action cannot be undone.')) {
      setActionLoading(prev => ({ ...prev, [topicId]: 'deleting' }));
      const result = await deleteTopic(topicId);
      
      if (!result.success) {
        alert(result.message);
      }
      
      setActionLoading(prev => ({ ...prev, [topicId]: null }));
    }
  };

  const isUserMember = (topic) => {
    return topic.members.some(member => member._id === user?.id);
  };

  const isUserCreator = (topic) => {
    return topic.creator._id === user?.id;
  };

  if (loading) {
    return (
      <div className="topic-sidebar">
        <div className="sidebar-loading">Loading topics...</div>
      </div>
    );
  }

  return (
    <div className="topic-sidebar">
      <div className="sidebar-header">
        <h3>Topics</h3>
        <button 
          className="create-topic-btn-sidebar"
          onClick={() => setShowCreateModal(true)}
          title="Create new topic"
        >
          +
        </button>
      </div>

      {topics.length === 0 ? (
        <div className="no-topics-sidebar">
          <p>No topics yet. Create your first topic!</p>
        </div>
      ) : (
        <div className="topics-list">
          {topics.map(topic => (
            <div 
              key={topic._id} 
              className={`topic-item ${currentTopic?._id === topic._id ? 'topic-active' : ''}`}
              onClick={() => selectTopic(topic)}
            >
              <div className="topic-item-header">
                <div className="topic-item-name">
                  {topic.name}
                  {topic.isPrivate && <span className="private-indicator">🔒</span>}
                </div>
              </div>
              
              <div className="topic-item-meta">
                <span className="topic-item-members">
                  {topic.members.length} member{topic.members.length !== 1 ? 's' : ''}
                </span>
              </div>

              {isUserMember(topic) ? (
                <div className="topic-item-actions">
                  {!isUserCreator(topic) && (
                    <button 
                      className="leave-topic-btn-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLeaveTopic(topic._id);
                      }}
                      disabled={actionLoading[topic._id] === 'leaving'}
                      title="Leave topic"
                    >
                      {actionLoading[topic._id] === 'leaving' ? '...' : '✕'}
                    </button>
                  )}
                  
                  {isUserCreator(topic) && (
                    <button 
                      className="delete-topic-btn-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTopic(topic._id);
                      }}
                      disabled={actionLoading[topic._id] === 'deleting'}
                      title="Delete topic"
                    >
                      {actionLoading[topic._id] === 'deleting' ? '...' : '🗑️'}
                    </button>
                  )}
                </div>
              ) : (
                !topic.isPrivate && (
                  <div className="topic-item-actions">
                    <button 
                      className="join-topic-btn-small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinTopic(topic._id);
                      }}
                      disabled={actionLoading[topic._id] === 'joining'}
                      title="Join topic"
                    >
                      {actionLoading[topic._id] === 'joining' ? '...' : '+'}
                    </button>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateTopicModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

export default TopicList;
