import React, { useEffect, useRef, useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import './Chat.css';

function ChatArea({ topic }) {
  const { loadMessages, clearMessages, currentTopic } = useChat();
  const { joinTopic, leaveTopic, connected } = useSocket();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (topic && topic._id) {
      const topicId = topic._id;
      
      // Join topic room
      if (connected) {
        joinTopic(topicId);
      }

      // Load messages
      setLoading(true);
      loadMessages(topicId).finally(() => {
        setLoading(false);
      });

      // Cleanup function
      return () => {
        if (connected) {
          leaveTopic(topicId);
        }
      };
    } else {
      clearMessages();
      setLoading(false);
    }
  }, [topic?._id, connected]);

  if (!topic) {
    return (
      <div className="chat-area-empty">
        <div className="empty-state">
          <h3>💬 Select a Topic</h3>
          <p>Choose a topic from the sidebar to start chatting</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="chat-area-loading">
        <div className="loading-spinner"></div>
        <p>Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="chat-area">
      <div className="chat-header">
        <div className="chat-info">
          <h2>{topic.name}</h2>
          {topic.description && (
            <p className="chat-description">{topic.description}</p>
          )}
        </div>
        <div className="chat-meta">
          <span className="member-count">
            {topic.members?.length || 0} member{(topic.members?.length || 0) !== 1 ? 's' : ''}
          </span>
          <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {connected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>

      <div className="chat-content">
        <MessageList />
        <TypingIndicator />
        <MessageInput />
      </div>
    </div>
  );
}

export default ChatArea;
